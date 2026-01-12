/**
 * GeohashRelayManager
 * 
 * Manages persistent WebSocket connections to georelays for all geohash regions.
 * - Generates depth-1 and depth-2 geohashes (1056 total)
 * - Uses one WebSocket per relay (shared across many geohash subscriptions)
 * - Subscribes per-geohash using REQ with #g filter (per relay connection)
 * - Handles reconnection with exponential backoff + jitter
 * - Sequential startup to avoid overwhelming relays
 */

import type { NostrEvent } from './eventStore';

// Base32 characters for geohash (excludes a, i, l, o)
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

const CONFIG = {
  MAX_DEPTH: 2,
  RELAYS_PER_GEOHASH: 3,
  STARTUP_DELAY_MS: 50,
  RECONNECT_BASE_MS: 1000,
  RECONNECT_MAX_MS: 60000,
  SUBSCRIPTION_TIMEOUT_MS: 30000,
  GEORELAY_CSV_URL: 'https://raw.githubusercontent.com/nicnit/georelays/refs/heads/main/nostr_relays.csv',
};

interface RelayInfo {
  url: string;
  lat: number;
  lon: number;
}

type ManagerStatus = 'stopped' | 'starting' | 'running' | 'stopping';

interface RelayConnectionState {
  url: string;
  ws: WebSocket | null;
  reconnectAttempts: number;
}

type EventCallback = (event: NostrEvent, geohash: string, relay: string) => void;

/**
 * Decode geohash to center coordinates
 */
function decodeGeohashCenter(geohash: string): { lat: number; lon: number } {
  const latInterval: [number, number] = [-90.0, 90.0];
  const lonInterval: [number, number] = [-180.0, 180.0];

  let isEven = true;
  for (const ch of geohash.toLowerCase()) {
    const cd = BASE32.indexOf(ch);
    if (cd === -1) continue;
    
    for (const mask of [16, 8, 4, 2, 1]) {
      if (isEven) {
        const mid = (lonInterval[0] + lonInterval[1]) / 2;
        if ((cd & mask) !== 0) {
          lonInterval[0] = mid;
        } else {
          lonInterval[1] = mid;
        }
      } else {
        const mid = (latInterval[0] + latInterval[1]) / 2;
        if ((cd & mask) !== 0) {
          latInterval[0] = mid;
        } else {
          latInterval[1] = mid;
        }
      }
      isEven = !isEven;
    }
  }
  
  return {
    lat: (latInterval[0] + latInterval[1]) / 2,
    lon: (lonInterval[0] + lonInterval[1]) / 2,
  };
}

/**
 * Calculate haversine distance in km
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371.0;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
            Math.cos(lat1 * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Generate all geohashes to monitor
 */
function generateGeohashes(maxDepth: number): string[] {
  const geohashes: string[] = [];

  // Depth 1: 32 single-character geohashes
  for (const c of BASE32) {
    geohashes.push(c);
  }

  // Depth 2: 32 * 32 = 1024 two-character geohashes
  if (maxDepth >= 2) {
    for (const c1 of BASE32) {
      for (const c2 of BASE32) {
        geohashes.push(c1 + c2);
      }
    }
  }

  return geohashes;
}

class GeohashRelayManager {
  private relays: RelayInfo[] = [];
  /**
   * Geohashes we monitor and the relays assigned to each.
   */
  private geohashToRelays: Map<string, string[]> = new Map();
  /**
   * Reverse index: relay -> geohashes assigned to it.
   */
  private relayToGeohashes: Map<string, Set<string>> = new Map();
  /**
   * One WebSocket connection per relay URL.
   */
  private relayConnections: Map<string, RelayConnectionState> = new Map();
  /**
   * subscriptionId -> geohash mapping (per relay connection).
   * We use stable IDs (geo_<geohash>) and keep the mapping to quickly route events.
   */
  private subscriptionIndex: Map<string, { geohash: string; relayUrl: string }> = new Map();
  private eventCallback: EventCallback | null = null;
  private status: ManagerStatus = 'stopped';
  private processedEvents: Set<string> = new Set();

  /**
   * Register callback for new events
   */
  onEvent(callback: EventCallback): void {
    this.eventCallback = callback;
  }

  /**
   * Load relay directory from CSV
   */
  private async loadRelayDirectory(): Promise<void> {
    console.log('[RelayManager] Loading relay directory...');
    
    try {
      // Try remote first
      const response = await fetch(CONFIG.GEORELAY_CSV_URL, {
        signal: AbortSignal.timeout(10000),
      });
      
      if (response.ok) {
        const text = await response.text();
        this.relays = this.parseCSV(text);
        console.log(`[RelayManager] Loaded ${this.relays.length} relays from remote`);
        return;
      }
    } catch (err) {
      console.warn('[RelayManager] Failed to load remote relay list:', err);
    }

    // Fallback to local file (try multiple paths)
    const localPaths = [
      // When running from project root
      './public/relays/online_relays_gps.csv',
      // When running from server directory
      '../public/relays/online_relays_gps.csv',
      // Absolute path relative to this file
      new URL('../public/relays/online_relays_gps.csv', import.meta.url).pathname,
    ];

    for (const path of localPaths) {
      try {
        const file = Bun.file(path);
        const text = await file.text();
        this.relays = this.parseCSV(text);
        console.log(`[RelayManager] Loaded ${this.relays.length} relays from local file: ${path}`);
        return;
      } catch {
        // Try next path
      }
    }

    // Use hardcoded fallbacks if no file found
    console.warn('[RelayManager] No local relay file found, using fallback relays');
    this.relays = [
      { url: 'relay.damus.io', lat: 37.7749, lon: -122.4194 },
      { url: 'nos.lol', lat: 52.52, lon: 13.405 },
      { url: 'relay.primal.net', lat: 40.7128, lon: -74.006 },
    ];
  }

  /**
   * Parse CSV relay data
   */
  private parseCSV(text: string): RelayInfo[] {
    const result: RelayInfo[] = [];
    const lines = text.split(/\r?\n/);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || (i === 0 && line.toLowerCase().includes('relay url'))) continue;
      
      const parts = line.split(',').map(p => p.trim());
      if (parts.length < 3) continue;
      
      let url = parts[0];
      url = url.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '').replace(/\/$/, '');
      
      const lat = parseFloat(parts[1]);
      const lon = parseFloat(parts[2]);
      
      if (url && !isNaN(lat) && !isNaN(lon)) {
        result.push({ url, lat, lon });
      }
    }
    
    return result;
  }

  /**
   * Get closest relays for a geohash
   */
  private getClosestRelays(geohash: string, count: number): string[] {
    if (this.relays.length === 0) return [];
    
    const center = decodeGeohashCenter(geohash);
    
    return [...this.relays]
      .sort((a, b) => {
        const distA = haversineKm(center.lat, center.lon, a.lat, a.lon);
        const distB = haversineKm(center.lat, center.lon, b.lat, b.lon);
        return distA - distB;
      })
      .slice(0, count)
      .map(r => `wss://${r.url}`);
  }

  /**
   * Ensure relay connection exists and is connected.
   */
  private ensureRelayConnected(relayUrl: string): void {
    if (this.status !== 'starting' && this.status !== 'running') return;

    const state = this.relayConnections.get(relayUrl) ?? {
      url: relayUrl,
      ws: null,
      reconnectAttempts: 0,
    };
    this.relayConnections.set(relayUrl, state);

    const existing = state.ws;
    if (existing && (existing.readyState === WebSocket.OPEN || existing.readyState === WebSocket.CONNECTING)) {
      return;
    }

    console.log(`[RelayManager] Connecting to ${relayUrl}`);

    try {
      const ws = new WebSocket(relayUrl);
      state.ws = ws;

      ws.onopen = () => {
        console.log(`[RelayManager] Connected to ${relayUrl}`);
        state.reconnectAttempts = 0;
        this.subscribeAllGeohashesOnRelay(relayUrl);
      };

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data.toString());

          // Nostr: ["EVENT", <subscriptionId>, <event>]
          if (data[0] === 'EVENT' && data[1] && data[2]) {
            const subscriptionId = String(data[1]);
            const event = data[2] as NostrEvent;

            const mapped = this.subscriptionIndex.get(subscriptionId);
            const geohash = mapped?.geohash;
            if (!geohash) return;

            // Deduplicate
            if (!this.processedEvents.has(event.id)) {
              this.processedEvents.add(event.id);

              // Limit processed events cache size
              if (this.processedEvents.size > 50000) {
                const toDelete = Array.from(this.processedEvents).slice(0, 10000);
                toDelete.forEach(id => this.processedEvents.delete(id));
              }

              this.eventCallback?.(event, geohash, relayUrl);
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      ws.onerror = (err) => {
        console.warn(`[RelayManager] Error on ${relayUrl}:`, err);
      };

      ws.onclose = () => {
        console.log(`[RelayManager] Disconnected from ${relayUrl}`);
        if (state.ws === ws) state.ws = null;
        if (this.status === 'starting' || this.status === 'running') {
          this.scheduleRelayReconnect(relayUrl);
        }
      };
    } catch (err) {
      console.error(`[RelayManager] Failed to connect to ${relayUrl}:`, err);
      this.scheduleRelayReconnect(relayUrl);
    }
  }

  private subscribeAllGeohashesOnRelay(relayUrl: string): void {
    if (this.status !== 'starting' && this.status !== 'running') return;
    const state = this.relayConnections.get(relayUrl);
    if (!state?.ws || state.ws.readyState !== WebSocket.OPEN) return;

    const geohashes = this.relayToGeohashes.get(relayUrl);
    if (!geohashes || geohashes.size === 0) return;

    const since = Math.floor(Date.now() / 1000) - (60 * 60); // Last hour

    for (const geohash of geohashes) {
      const subscriptionId = `geo_${geohash}`;
      this.subscriptionIndex.set(subscriptionId, { geohash, relayUrl });

      const req = JSON.stringify([
        'REQ',
        subscriptionId,
        {
          kinds: [1, 20000, 23333],
          '#g': [geohash],
          since,
          limit: 100,
        },
      ]);

      try {
        state.ws.send(req);
      } catch {
        // If sending fails, we'll reconnect via onclose/onerror paths.
      }
    }
  }

  /**
   * Schedule reconnection with exponential backoff + jitter (per relay).
   */
  private scheduleRelayReconnect(relayUrl: string): void {
    const state = this.relayConnections.get(relayUrl);
    if (!state) return;
    if (this.status !== 'starting' && this.status !== 'running') return;

    const attempts = state.reconnectAttempts;
    const baseDelay = Math.min(
      CONFIG.RECONNECT_BASE_MS * Math.pow(2, attempts),
      CONFIG.RECONNECT_MAX_MS
    );
    const jitter = Math.floor(Math.random() * 250);
    const delay = baseDelay + jitter;

    state.reconnectAttempts = attempts + 1;

    setTimeout(() => {
      if (this.status === 'starting' || this.status === 'running') {
        this.ensureRelayConnected(relayUrl);
      }
    }, delay);
  }

  /**
   * Start all subscriptions
   */
  async start(): Promise<void> {
    if (this.status === 'starting' || this.status === 'running') return;
    this.status = 'starting';

    console.log('[RelayManager] Starting...');

    // Load relay directory
    await this.loadRelayDirectory();

    // Generate geohashes
    const geohashes = generateGeohashes(CONFIG.MAX_DEPTH);
    console.log(`[RelayManager] Will subscribe to ${geohashes.length} geohashes`);

    // Build geohash -> relays mapping and relay -> geohashes reverse mapping
    this.geohashToRelays.clear();
    this.relayToGeohashes.clear();

    for (let i = 0; i < geohashes.length; i++) {
      const geohash = geohashes[i];
      const relayUrls = this.getClosestRelays(geohash, CONFIG.RELAYS_PER_GEOHASH);
      if (relayUrls.length === 0) continue;

      this.geohashToRelays.set(geohash, relayUrls);
      for (const relayUrl of relayUrls) {
        const set = this.relayToGeohashes.get(relayUrl) ?? new Set<string>();
        set.add(geohash);
        this.relayToGeohashes.set(relayUrl, set);
      }

      // Small delay to avoid CPU spikes during startup mapping work
      if (i < geohashes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.STARTUP_DELAY_MS));
      }
    }

    const uniqueRelayCount = this.relayToGeohashes.size;
    console.log(`[RelayManager] Will connect to ${uniqueRelayCount} unique relays (shared across geohashes)`);

    // Connect to each relay sequentially (much smaller than per-geohash connections)
    const relayUrls = Array.from(this.relayToGeohashes.keys());
    for (let i = 0; i < relayUrls.length; i++) {
      this.ensureRelayConnected(relayUrls[i]);
      if (i < relayUrls.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.STARTUP_DELAY_MS));
      }
    }

    this.status = 'running';
    console.log(`[RelayManager] Started (geohashes=${this.geohashToRelays.size}, relays=${uniqueRelayCount})`);
  }

  /**
   * Stop all subscriptions
   */
  stop(): void {
    console.log('[RelayManager] Stopping...');
    if (this.status === 'stopped' || this.status === 'stopping') return;
    this.status = 'stopping';

    for (const state of this.relayConnections.values()) {
      try {
        state.ws?.close();
      } catch {
        // Ignore close errors
      }
      state.ws = null;
    }

    this.relayConnections.clear();
    this.geohashToRelays.clear();
    this.relayToGeohashes.clear();
    this.subscriptionIndex.clear();
    console.log('[RelayManager] Stopped');
    this.status = 'stopped';
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSubscriptions: number;
    activeConnections: number;
    geohashesMonitored: number;
    uniqueRelays: Set<string>;
  } {
    let activeConnections = 0;
    const uniqueRelays = new Set<string>();

    for (const [url, state] of this.relayConnections) {
      if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        activeConnections++;
        uniqueRelays.add(url);
      }
    }

    return {
      totalSubscriptions: this.geohashToRelays.size,
      activeConnections,
      geohashesMonitored: this.geohashToRelays.size,
      uniqueRelays,
    };
  }
}

// Export singleton instance
export const relayManager = new GeohashRelayManager();
export default GeohashRelayManager;

