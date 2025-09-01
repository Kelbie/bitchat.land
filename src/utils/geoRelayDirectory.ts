import { BASE32 } from "../constants/projections";

export interface GeoRelayEntry {
  host: string;
  lat: number;
  lon: number;
}

/**
 * Directory of online Nostr relays with approximate GPS locations, used for geohash routing.
 * Mirrors the Swift implementation structure.
 */
export class GeoRelayDirectory {
  private static instance: GeoRelayDirectory;
  private entries: GeoRelayEntry[] = [];
  private readyPromise: Promise<void>;
  private readonly cacheFileName = "georelays_cache.csv";
  private readonly lastFetchKey = "georelay.lastFetchAt";
  private readonly remoteURL = "https://raw.githubusercontent.com/permissionlesstech/georelays/refs/heads/main/nostr_relays.csv";
  private readonly fetchInterval = 60 * 60 * 24; // 24h

  private constructor() {
    // Initialize ready promise
    this.readyPromise = this.loadLocalEntries().then(entries => {
      this.entries = entries;
    });
    // Fire-and-forget remote refresh if stale
    this.prefetchIfNeeded();
  }

  static get shared(): GeoRelayDirectory {
    if (!GeoRelayDirectory.instance) {
      GeoRelayDirectory.instance = new GeoRelayDirectory();
    }
    return GeoRelayDirectory.instance;
  }

  /**
   * Wait for the directory to be ready (data loaded)
   */
  async waitForReady(): Promise<void> {
    return this.readyPromise;
  }

  /**
   * Check if the directory is ready (has data)
   */
  isReady(): boolean {
    return this.entries.length > 0;
  }

  /**
   * Returns up to `count` relay URLs (wss://) closest to the geohash center.
   */
  closestRelays(toGeohash: string, count: number = 5): string[] {
    const center = this.decodeCenter(toGeohash);
    return this.closestRelaysByCoords(center.lat, center.lon, count);
  }

  /**
   * Returns up to `count` relay URLs (wss://) closest to the given coordinate.
   */
  closestRelaysByCoords(toLat: number, toLon: number, count: number = 5): string[] {
    if (this.entries.length === 0) return [];
    
    const sorted = this.entries
      .sort((a, b) => {
        const distA = this.haversineKm(toLat, toLon, a.lat, a.lon);
        const distB = this.haversineKm(toLat, toLon, b.lat, b.lon);
        return distA - distB;
      })
      .slice(0, count);
    
    return sorted.map(entry => `wss://${entry.host}`);
  }

  // MARK: - Remote Fetch
  prefetchIfNeeded(): void {
    const now = Date.now();
    const last = localStorage.getItem(this.lastFetchKey);
    const lastTime = last ? parseInt(last, 10) : 0;
    
    if (now - lastTime >= this.fetchInterval * 1000) {
      this.fetchRemote();
    }
  }

  private async fetchRemote(): Promise<void> {
    try {
      const response = await fetch(this.remoteURL, {
        cache: 'no-cache',
        signal: AbortSignal.timeout(15000)
      });
      
      if (response.ok) {
        const text = await response.text();
        const parsed = GeoRelayDirectory.parseCSV(text);
        
        if (parsed.length > 0) {
          this.entries = parsed;
          this.persistCache(text);
          localStorage.setItem(this.lastFetchKey, Date.now().toString());
        }
      }
    } catch (error) {
      console.warn("GeoRelayDirectory: remote fetch failed; keeping local entries", error);
    }
  }

  private persistCache(text: string): void {
    try {
      localStorage.setItem(this.cacheFileName, text);
    } catch (error) {
      console.warn("GeoRelayDirectory: failed to write cache:", error);
    }
  }

  // MARK: - Loading
  private async loadLocalEntries(): Promise<GeoRelayEntry[]> {
    // Prefer cached data if present
    const cached = localStorage.getItem(this.cacheFileName);
    if (cached) {
      const arr = GeoRelayDirectory.parseCSV(cached);
      if (arr.length > 0) return arr;
    }

    // Try bundled resource
    try {
      const response = await fetch('/relays/online_relays_gps.csv');
      if (response.ok) {
        const text = await response.text();
        const arr = GeoRelayDirectory.parseCSV(text);
        if (arr.length > 0) {
          return arr;
        }
      }
    } catch {
      console.log("GeoRelayDirectory: bundled CSV not available");
    }

    // Return empty array - will be populated by remote fetch
    return [];
  }

  static parseCSV(text: string): GeoRelayEntry[] {
    const result = new Set<string>();
    const lines = text.split(/\r?\n/);
    
    // Skip header if present
    for (let idx = 0; idx < lines.length; idx++) {
      const raw = lines[idx];
      const line = raw.trim();
      if (line.length === 0) continue;
      if (idx === 0 && line.toLowerCase().includes("relay url")) continue;
      
      const parts = line.split(",").map(part => part.trim());
      if (parts.length < 3) continue;
      
      let host = parts[0];
      host = host.replace(/^https?:\/\//, "").replace(/^wss?:\/\//, "");
      host = host.replace(/\/$/, "");
      
      const lat = parseFloat(parts[1]);
      const lon = parseFloat(parts[2]);
      
      if (isNaN(lat) || isNaN(lon)) continue;
      
      result.add(JSON.stringify({ host, lat, lon }));
    }
    
    return Array.from(result).map(json => JSON.parse(json));
  }

  /**
   * Decodes a geohash into the center latitude/longitude of its bounding box.
   * Mirrors the Swift implementation.
   */
  private decodeCenter(geohash: string): { lat: number; lon: number } {
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
    
    const lat = (latInterval[0] + latInterval[1]) / 2;
    const lon = (lonInterval[0] + lonInterval[1]) / 2;
    return { lat, lon };
  }

  // MARK: - Distance
  private haversineKm(lat: number, lon: number, lat2: number, lon2: number): number {
    const r = 6371.0; // Earth radius in km
    const dLat = (lat2 - lat) * Math.PI / 180;
    const dLon = (lon2 - lon) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + 
              Math.cos(lat * Math.PI/180) * Math.cos(lat2 * Math.PI/180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return r * c;
  }
}
