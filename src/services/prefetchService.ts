import { RelayPool } from "nostr-relaypool";
import type { Event as NostrEventOriginal } from "nostr-tools";
import { GeoRelayDirectory } from "@/utils/geoRelayDirectory";

// Base32 characters for geohash (excludes a, i, l, o)
const BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export interface PrefetchProgress {
  phase: 'initializing' | 'connecting' | 'fetching' | 'complete' | 'error';
  // Geohash tracking (new)
  totalGeohashes: number;
  completedGeohashes: number;
  currentGeohash: string | null;
  // Relay tracking
  totalRelays: number;
  connectedRelays: number;
  uniqueRelaysQueried: number;
  // Event tracking
  eventsReceived: number;
  eventsPerGeohash: Map<string, number>;
  // Timing
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  // Legacy field for backward compatibility
  currentRelay: string | null;
}

export interface PrefetchedEvent {
  event: NostrEventOriginal;
  relayUrl: string;
  receivedAt: Date;
  geohash?: string; // The geohash this event was fetched for
}

export interface PrefetchOptions {
  /** Maximum geohash depth to query (1 = 32 geohashes, 2 = 1056 geohashes) */
  maxDepth?: number;
  /** Number of closest relays to query per geohash */
  relaysPerGeohash?: number;
  /** Delay between geohash queries in ms (rate limiting) */
  delayBetweenQueriesMs?: number;
  /** Number of concurrent geohash queries (1 = sequential) */
  concurrentQueries?: number;
  /** Timeout for each geohash query in ms */
  timeoutPerQueryMs?: number;
  /** How far back to fetch events (in seconds) */
  sinceDurationSec?: number;
  /** Event limit per geohash query */
  limitPerQuery?: number;
}

type ProgressCallback = (progress: PrefetchProgress) => void;
type CompleteCallback = (events: PrefetchedEvent[]) => void;

/**
 * Helper to delay execution
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate all geohashes to query based on depth
 */
function generateGeohashesToQuery(maxDepth: number): string[] {
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

  // Depth 3 would be 32,768 geohashes - too many for practical prefetch
  // We stop at depth 2 for prefetch

  return geohashes;
}

class PrefetchService {
  private static instance: PrefetchService;
  private relayPool: RelayPool | null = null;
  private events: PrefetchedEvent[] = [];
  private eventIds: Set<string> = new Set();
  private progress: PrefetchProgress = {
    phase: 'initializing',
    totalGeohashes: 0,
    completedGeohashes: 0,
    currentGeohash: null,
    totalRelays: 0,
    connectedRelays: 0,
    uniqueRelaysQueried: 0,
    eventsReceived: 0,
    eventsPerGeohash: new Map(),
    startedAt: null,
    completedAt: null,
    errorMessage: null,
    currentRelay: null,
  };
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private completeCallbacks: Set<CompleteCallback> = new Set();
  private isPrefetching: boolean = false;
  private hasPrefetched: boolean = false;
  private queriedRelays: Set<string> = new Set();

  private constructor() {}

  static get shared(): PrefetchService {
    if (!PrefetchService.instance) {
      PrefetchService.instance = new PrefetchService();
    }
    return PrefetchService.instance;
  }

  /**
   * Subscribe to progress updates
   */
  onProgress(callback: ProgressCallback): () => void {
    this.progressCallbacks.add(callback);
    // Immediately emit current progress
    callback(this.progress);
    return () => this.progressCallbacks.delete(callback);
  }

  /**
   * Subscribe to completion event
   */
  onComplete(callback: CompleteCallback): () => void {
    this.completeCallbacks.add(callback);
    // If already complete, immediately call
    if (this.hasPrefetched) {
      callback(this.events);
    }
    return () => this.completeCallbacks.delete(callback);
  }

  /**
   * Get current progress
   */
  getProgress(): PrefetchProgress {
    return { ...this.progress };
  }

  /**
   * Get all prefetched events
   */
  getEvents(): PrefetchedEvent[] {
    return [...this.events];
  }

  /**
   * Check if prefetch has completed
   */
  isComplete(): boolean {
    return this.hasPrefetched;
  }

  /**
   * Check if prefetch is currently running
   */
  isRunning(): boolean {
    return this.isPrefetching;
  }

  private updateProgress(updates: Partial<PrefetchProgress>): void {
    this.progress = { ...this.progress, ...updates };
    this.progressCallbacks.forEach(cb => cb(this.progress));
  }

  private notifyComplete(): void {
    this.completeCallbacks.forEach(cb => cb(this.events));
  }

  /**
   * Query a single geohash's relays with proper #g filter
   */
  private async queryGeohash(
    geohash: string,
    relayUrls: string[],
    sinceTimestamp: number,
    timeoutMs: number,
    limitPerQuery: number
  ): Promise<number> {
    if (!this.relayPool || relayUrls.length === 0) {
      return 0;
    }

    // Track which relays we've queried
    relayUrls.forEach(url => this.queriedRelays.add(url));

    return new Promise<number>((resolve) => {
      let eventsForThisGeohash = 0;
      let hasResolved = false;
      let unsubscribe: (() => void) | null = null;

      const finish = () => {
        if (hasResolved) return;
        hasResolved = true;
        if (unsubscribe) {
          try {
            unsubscribe();
          } catch {
            // Ignore unsubscribe errors
          }
        }
        resolve(eventsForThisGeohash);
      };

      // Create filter with #g tag (matching Android pattern)
      const filter: Record<string, unknown> = {
        kinds: [1, 20000, 23333], // text notes + ephemeral geo events
        "#g": [geohash],
        since: sinceTimestamp,
        limit: limitPerQuery,
      };

      let eoseCount = 0;

      try {
        unsubscribe = this.relayPool.subscribe(
          [filter],
          relayUrls,
          (event: NostrEventOriginal, _isAfterEose: boolean, relayURL?: string) => {
            // Deduplicate events globally
            if (!this.eventIds.has(event.id)) {
              this.eventIds.add(event.id);
              eventsForThisGeohash++;
              
              this.events.push({
                event,
                relayUrl: relayURL || 'unknown',
                receivedAt: new Date(),
                geohash,
              });

              // Update events per geohash
              const currentCount = this.progress.eventsPerGeohash.get(geohash) || 0;
              this.progress.eventsPerGeohash.set(geohash, currentCount + 1);

              this.updateProgress({
                eventsReceived: this.events.length,
                eventsPerGeohash: this.progress.eventsPerGeohash,
              });
            }
          },
          undefined,
          (relayURL: string) => {
            // EOSE callback
            eoseCount++;
            this.updateProgress({
              connectedRelays: this.queriedRelays.size,
              currentRelay: relayURL,
            });
            
            // Complete when all relays have sent EOSE
            if (eoseCount >= relayUrls.length) {
              finish();
            }
          },
          {
            allowDuplicateEvents: false,
            allowOlderEvents: true,
            logAllEvents: false,
            unsubscribeOnEose: true, // Unsubscribe per-relay after EOSE
          }
        );
      } catch (err) {
        console.warn(`[Prefetch] Error subscribing to geohash ${geohash}:`, err);
        finish();
        return;
      }

      // Timeout fallback for this specific geohash query
      setTimeout(() => {
        if (!hasResolved) {
          console.log(`[Prefetch] Timeout for geohash ${geohash} after ${eoseCount}/${relayUrls.length} relays responded`);
          finish();
        }
      }, timeoutMs);
    });
  }

  /**
   * Process a batch of geohashes concurrently
   */
  private async processBatch(
    geohashes: string[],
    sinceTimestamp: number,
    relaysPerGeohash: number,
    timeoutPerQueryMs: number,
    limitPerQuery: number
  ): Promise<void> {
    const promises = geohashes.map(async (geohash) => {
      // Get closest relays for this geohash
      const relayUrls = GeoRelayDirectory.shared.closestRelays(geohash, relaysPerGeohash);
      
      if (relayUrls.length === 0) {
        console.warn(`[Prefetch] No relays found for geohash: ${geohash}`);
        return;
      }

      this.updateProgress({
        currentGeohash: geohash,
      });

      const eventsFound = await this.queryGeohash(
        geohash,
        relayUrls,
        sinceTimestamp,
        timeoutPerQueryMs,
        limitPerQuery
      );

      this.updateProgress({
        completedGeohashes: this.progress.completedGeohashes + 1,
        uniqueRelaysQueried: this.queriedRelays.size,
      });

      if (eventsFound > 0) {
        console.log(`[Prefetch] Geohash ${geohash}: ${eventsFound} events from ${relayUrls.length} relays`);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Start prefetching events using proper geohash-based relay querying
   * 
   * This improved version:
   * 1. Generates all depth-1 and depth-2 geohashes
   * 2. For each geohash, finds the closest georelays
   * 3. Subscribes with #g filter to only get relevant events
   * 4. Processes sequentially (or in batches) to avoid rate limiting
   */
  async prefetch(options?: PrefetchOptions): Promise<PrefetchedEvent[]> {
    // Don't start if already running
    if (this.isPrefetching) {
      return this.events;
    }

    // Return cached events if already prefetched
    if (this.hasPrefetched) {
      return this.events;
    }

    this.isPrefetching = true;
    
    // Parse options with defaults
    const maxDepth = options?.maxDepth ?? 2;
    const relaysPerGeohash = options?.relaysPerGeohash ?? 3;
    const delayBetweenQueriesMs = options?.delayBetweenQueriesMs ?? 100;
    const concurrentQueries = options?.concurrentQueries ?? 3; // Process 3 at a time by default
    const timeoutPerQueryMs = options?.timeoutPerQueryMs ?? 5000;
    const sinceDurationSec = options?.sinceDurationSec ?? 86400; // 24 hours
    const limitPerQuery = options?.limitPerQuery ?? 50;

    // Generate all geohashes to query
    const geohashesToQuery = generateGeohashesToQuery(maxDepth);
    
    this.updateProgress({
      phase: 'initializing',
      totalGeohashes: geohashesToQuery.length,
      completedGeohashes: 0,
      currentGeohash: null,
      startedAt: new Date(),
      errorMessage: null,
      eventsPerGeohash: new Map(),
    });

    console.log(`[Prefetch] Starting improved prefetch with ${geohashesToQuery.length} geohashes (depth ${maxDepth})`);

    try {
      // Wait for GeoRelayDirectory to be ready
      await GeoRelayDirectory.shared.waitForReady();

      this.updateProgress({
        phase: 'connecting',
      });

      // Create relay pool
      this.relayPool = new RelayPool([], {
        useEventCache: true,
        logSubscriptions: false,
        deleteSignatures: false,
        skipVerification: false,
        autoReconnect: false,
      });

      // Track relay errors
      this.relayPool.onerror((err: string, relayUrl: string) => {
        console.warn(`[Prefetch] Relay error from ${relayUrl}:`, err);
      });

      this.updateProgress({
        phase: 'fetching',
      });

      const sinceTimestamp = Math.floor(Date.now() / 1000) - sinceDurationSec;

      // Process geohashes in batches with delays
      for (let i = 0; i < geohashesToQuery.length; i += concurrentQueries) {
        const batch = geohashesToQuery.slice(i, i + concurrentQueries);
        
        await this.processBatch(
          batch,
          sinceTimestamp,
          relaysPerGeohash,
          timeoutPerQueryMs,
          limitPerQuery
        );

        // Rate limiting delay between batches
        if (i + concurrentQueries < geohashesToQuery.length) {
          await delay(delayBetweenQueriesMs);
        }

        // Log progress every 100 geohashes
        if ((i + concurrentQueries) % 100 === 0 || i + concurrentQueries >= geohashesToQuery.length) {
          const percentComplete = Math.round(((i + concurrentQueries) / geohashesToQuery.length) * 100);
          console.log(`[Prefetch] Progress: ${percentComplete}% (${this.events.length} events, ${this.queriedRelays.size} unique relays)`);
        }
      }

      // Cleanup
      if (this.relayPool) {
        this.relayPool = null;
      }

      // Sort events by timestamp (newest first)
      this.events.sort((a, b) => b.event.created_at - a.event.created_at);

      const duration = this.progress.startedAt 
        ? Math.round((Date.now() - this.progress.startedAt.getTime()) / 1000)
        : 0;

      console.log(`[Prefetch] Complete: ${this.events.length} events from ${this.queriedRelays.size} unique relays in ${duration}s`);

      this.updateProgress({
        phase: 'complete',
        completedAt: new Date(),
        currentGeohash: null,
      });

      this.hasPrefetched = true;
      this.isPrefetching = false;
      this.notifyComplete();

      return this.events;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Prefetch] Error:', errorMessage);
      this.updateProgress({
        phase: 'error',
        errorMessage,
        completedAt: new Date(),
      });
      this.isPrefetching = false;
      throw error;
    }
  }

  /**
   * Reset the prefetch state (for testing/debugging)
   */
  reset(): void {
    this.events = [];
    this.eventIds.clear();
    this.queriedRelays.clear();
    this.hasPrefetched = false;
    this.isPrefetching = false;
    this.progress = {
      phase: 'initializing',
      totalGeohashes: 0,
      completedGeohashes: 0,
      currentGeohash: null,
      totalRelays: 0,
      connectedRelays: 0,
      uniqueRelaysQueried: 0,
      eventsReceived: 0,
      eventsPerGeohash: new Map(),
      startedAt: null,
      completedAt: null,
      errorMessage: null,
      currentRelay: null,
    };
  }
}

export const prefetchService = PrefetchService.shared;
export default PrefetchService;
