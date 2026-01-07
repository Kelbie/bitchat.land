/**
 * GeohashRelayManager
 * 
 * Manages persistent WebSocket connections to georelays for all geohash regions.
 * - Generates depth-1 and depth-2 geohashes (1056 total)
 * - Connects to closest relays per geohash with #g filter
 * - Handles reconnection with exponential backoff
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

interface GeohashSubscription {
  geohash: string;
  relayUrls: string[];
  connections: Map<string, WebSocket>;
  reconnectAttempts: Map<string, number>;
  isActive: boolean;
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
  private subscriptions: Map<string, GeohashSubscription> = new Map();
  private eventCallback: EventCallback | null = null;
  private isRunning: boolean = false;
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
   * Connect to a relay for a specific geohash
   */
  private connectToRelay(geohash: string, relayUrl: string): void {
    const sub = this.subscriptions.get(geohash);
    if (!sub || !sub.isActive) return;

    // Check if already connected
    const existing = sub.connections.get(relayUrl);
    if (existing && existing.readyState === WebSocket.OPEN) return;

    console.log(`[RelayManager] Connecting to ${relayUrl} for geohash ${geohash}`);

    try {
      const ws = new WebSocket(relayUrl);
      
      ws.onopen = () => {
        console.log(`[RelayManager] Connected to ${relayUrl} for ${geohash}`);
        
        // Reset reconnect attempts
        sub.reconnectAttempts.set(relayUrl, 0);
        
        // Send subscription request with #g filter
        const subscriptionId = `geo_${geohash}_${Date.now()}`;
        const since = Math.floor(Date.now() / 1000) - (60 * 60); // Last hour
        
        const req = JSON.stringify([
          'REQ',
          subscriptionId,
          {
            kinds: [1, 20000, 23333],
            '#g': [geohash],
            since,
            limit: 100,
          }
        ]);
        
        ws.send(req);
      };

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data.toString());
          
          if (data[0] === 'EVENT' && data[2]) {
            const event = data[2] as NostrEvent;
            
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
        console.warn(`[RelayManager] Error on ${relayUrl} for ${geohash}:`, err);
      };

      ws.onclose = () => {
        console.log(`[RelayManager] Disconnected from ${relayUrl} for ${geohash}`);
        sub.connections.delete(relayUrl);
        
        // Schedule reconnection with exponential backoff
        if (sub.isActive) {
          this.scheduleReconnect(geohash, relayUrl);
        }
      };

      sub.connections.set(relayUrl, ws);
    } catch (err) {
      console.error(`[RelayManager] Failed to connect to ${relayUrl}:`, err);
      this.scheduleReconnect(geohash, relayUrl);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(geohash: string, relayUrl: string): void {
    const sub = this.subscriptions.get(geohash);
    if (!sub || !sub.isActive) return;

    const attempts = sub.reconnectAttempts.get(relayUrl) || 0;
    const delay = Math.min(
      CONFIG.RECONNECT_BASE_MS * Math.pow(2, attempts),
      CONFIG.RECONNECT_MAX_MS
    );

    sub.reconnectAttempts.set(relayUrl, attempts + 1);

    setTimeout(() => {
      if (sub.isActive) {
        this.connectToRelay(geohash, relayUrl);
      }
    }, delay);
  }

  /**
   * Start all subscriptions
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[RelayManager] Starting...');

    // Load relay directory
    await this.loadRelayDirectory();

    // Generate geohashes
    const geohashes = generateGeohashes(CONFIG.MAX_DEPTH);
    console.log(`[RelayManager] Will subscribe to ${geohashes.length} geohashes`);

    // Start subscriptions sequentially with delay
    for (let i = 0; i < geohashes.length; i++) {
      const geohash = geohashes[i];
      const relayUrls = this.getClosestRelays(geohash, CONFIG.RELAYS_PER_GEOHASH);

      if (relayUrls.length === 0) continue;

      const sub: GeohashSubscription = {
        geohash,
        relayUrls,
        connections: new Map(),
        reconnectAttempts: new Map(),
        isActive: true,
      };

      this.subscriptions.set(geohash, sub);

      // Connect to each relay
      for (const relayUrl of relayUrls) {
        this.connectToRelay(geohash, relayUrl);
      }

      // Log progress every 100 geohashes
      if ((i + 1) % 100 === 0) {
        console.log(`[RelayManager] Started ${i + 1}/${geohashes.length} subscriptions`);
      }

      // Small delay to avoid overwhelming relays
      if (i < geohashes.length - 1) {
        await new Promise(resolve => setTimeout(resolve, CONFIG.STARTUP_DELAY_MS));
      }
    }

    console.log(`[RelayManager] Started all ${this.subscriptions.size} subscriptions`);
  }

  /**
   * Stop all subscriptions
   */
  stop(): void {
    console.log('[RelayManager] Stopping...');
    this.isRunning = false;

    for (const sub of this.subscriptions.values()) {
      sub.isActive = false;
      for (const ws of sub.connections.values()) {
        try {
          ws.close();
        } catch {
          // Ignore close errors
        }
      }
      sub.connections.clear();
    }

    this.subscriptions.clear();
    console.log('[RelayManager] Stopped');
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

    for (const sub of this.subscriptions.values()) {
      for (const [url, ws] of sub.connections) {
        if (ws.readyState === WebSocket.OPEN) {
          activeConnections++;
          uniqueRelays.add(url);
        }
      }
    }

    return {
      totalSubscriptions: this.subscriptions.size,
      activeConnections,
      geohashesMonitored: this.subscriptions.size,
      uniqueRelays,
    };
  }
}

// Export singleton instance
export const relayManager = new GeohashRelayManager();
export default GeohashRelayManager;

