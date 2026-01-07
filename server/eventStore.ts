/**
 * In-Memory Event Store
 * 
 * Stores Nostr events with:
 * - 1-hour TTL (configurable)
 * - Deduplication by event ID
 * - Periodic pruning of expired events
 */

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface StoredEvent {
  event: NostrEvent;
  geohash: string;
  relay: string;
  receivedAt: number;
}

export interface EventStoreStats {
  totalEvents: number;
  eventsPerGeohash: Record<string, number>;
  oldestEventAge: number | null;
  newestEventAge: number | null;
}

const CONFIG = {
  MAX_AGE_MS: 60 * 60 * 1000, // 1 hour
  PRUNE_INTERVAL_MS: 60 * 1000, // Prune every minute
  MAX_EVENTS: 100000, // Safety limit
};

class EventStore {
  private events: Map<string, StoredEvent> = new Map();
  private geohashCounts: Map<string, number> = new Map();
  private pruneInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Start periodic pruning
    this.startPruning();
  }

  /**
   * Add an event to the store
   * Returns true if event was added (new), false if duplicate
   */
  add(event: NostrEvent, geohash: string, relay: string): boolean {
    // Check for duplicate
    if (this.events.has(event.id)) {
      return false;
    }

    // Safety limit check
    if (this.events.size >= CONFIG.MAX_EVENTS) {
      console.warn('[EventStore] Max events reached, pruning oldest...');
      this.pruneOldest(1000);
    }

    const stored: StoredEvent = {
      event,
      geohash,
      relay,
      receivedAt: Date.now(),
    };

    this.events.set(event.id, stored);

    // Update geohash counts
    const currentCount = this.geohashCounts.get(geohash) || 0;
    this.geohashCounts.set(geohash, currentCount + 1);

    return true;
  }

  /**
   * Get recent events, optionally filtered by time
   */
  getRecent(sinceMs?: number): StoredEvent[] {
    const now = Date.now();
    const cutoff = sinceMs || (now - CONFIG.MAX_AGE_MS);
    
    const results: StoredEvent[] = [];
    
    for (const stored of this.events.values()) {
      if (stored.receivedAt >= cutoff) {
        results.push(stored);
      }
    }

    // Sort by created_at descending (newest first)
    results.sort((a, b) => b.event.created_at - a.event.created_at);

    return results;
  }

  /**
   * Get events for a specific geohash prefix
   */
  getByGeohash(geohashPrefix: string): StoredEvent[] {
    const results: StoredEvent[] = [];
    
    for (const stored of this.events.values()) {
      if (stored.geohash.startsWith(geohashPrefix)) {
        results.push(stored);
      }
    }

    results.sort((a, b) => b.event.created_at - a.event.created_at);
    return results;
  }

  /**
   * Get store statistics
   */
  getStats(): EventStoreStats {
    const now = Date.now();
    let oldest: number | null = null;
    let newest: number | null = null;

    for (const stored of this.events.values()) {
      const age = now - stored.receivedAt;
      if (oldest === null || age > oldest) oldest = age;
      if (newest === null || age < newest) newest = age;
    }

    return {
      totalEvents: this.events.size,
      eventsPerGeohash: Object.fromEntries(this.geohashCounts),
      oldestEventAge: oldest,
      newestEventAge: newest,
    };
  }

  /**
   * Prune expired events (older than MAX_AGE_MS)
   */
  prune(): number {
    const now = Date.now();
    const cutoff = now - CONFIG.MAX_AGE_MS;
    let pruned = 0;

    for (const [id, stored] of this.events) {
      if (stored.receivedAt < cutoff) {
        this.events.delete(id);
        
        // Update geohash counts
        const currentCount = this.geohashCounts.get(stored.geohash) || 1;
        if (currentCount <= 1) {
          this.geohashCounts.delete(stored.geohash);
        } else {
          this.geohashCounts.set(stored.geohash, currentCount - 1);
        }
        
        pruned++;
      }
    }

    if (pruned > 0) {
      console.log(`[EventStore] Pruned ${pruned} expired events (${this.events.size} remaining)`);
    }

    return pruned;
  }

  /**
   * Prune oldest N events regardless of age
   */
  private pruneOldest(count: number): void {
    const sorted = Array.from(this.events.entries())
      .sort((a, b) => a[1].receivedAt - b[1].receivedAt);

    for (let i = 0; i < Math.min(count, sorted.length); i++) {
      const [id, stored] = sorted[i];
      this.events.delete(id);
      
      const currentCount = this.geohashCounts.get(stored.geohash) || 1;
      if (currentCount <= 1) {
        this.geohashCounts.delete(stored.geohash);
      } else {
        this.geohashCounts.set(stored.geohash, currentCount - 1);
      }
    }
  }

  /**
   * Start periodic pruning
   */
  private startPruning(): void {
    if (this.pruneInterval) return;
    
    this.pruneInterval = setInterval(() => {
      this.prune();
    }, CONFIG.PRUNE_INTERVAL_MS);
  }

  /**
   * Stop periodic pruning
   */
  stopPruning(): void {
    if (this.pruneInterval) {
      clearInterval(this.pruneInterval);
      this.pruneInterval = null;
    }
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events.clear();
    this.geohashCounts.clear();
  }
}

// Export singleton instance
export const eventStore = new EventStore();
export default EventStore;

