import { RelayPool } from "nostr-relaypool";
import type { Event as NostrEventOriginal } from "nostr-tools";
import { GeoRelayDirectory, GeoRelayEntry } from "@/utils/geoRelayDirectory";

export interface PrefetchProgress {
  phase: 'initializing' | 'connecting' | 'fetching' | 'complete' | 'error';
  totalRelays: number;
  connectedRelays: number;
  eventsReceived: number;
  currentRelay: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
}

export interface PrefetchedEvent {
  event: NostrEventOriginal;
  relayUrl: string;
  receivedAt: Date;
}

type ProgressCallback = (progress: PrefetchProgress) => void;
type CompleteCallback = (events: PrefetchedEvent[]) => void;

class PrefetchService {
  private static instance: PrefetchService;
  private relayPool: RelayPool | null = null;
  private events: PrefetchedEvent[] = [];
  private eventIds: Set<string> = new Set();
  private progress: PrefetchProgress = {
    phase: 'initializing',
    totalRelays: 0,
    connectedRelays: 0,
    eventsReceived: 0,
    currentRelay: null,
    startedAt: null,
    completedAt: null,
    errorMessage: null,
  };
  private progressCallbacks: Set<ProgressCallback> = new Set();
  private completeCallbacks: Set<CompleteCallback> = new Set();
  private isPrefetching: boolean = false;
  private hasPrefetched: boolean = false;

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
   * Start prefetching events from all georelays
   */
  async prefetch(options?: {
    maxRelays?: number;
    timeoutMs?: number;
    sinceDurationSec?: number;
  }): Promise<PrefetchedEvent[]> {
    // Don't start if already running
    if (this.isPrefetching) {
      return this.events;
    }

    // Return cached events if already prefetched
    if (this.hasPrefetched) {
      return this.events;
    }

    this.isPrefetching = true;
    this.updateProgress({
      phase: 'initializing',
      startedAt: new Date(),
      errorMessage: null,
    });

    const maxRelays = options?.maxRelays ?? 50; // Limit for performance
    const timeoutMs = options?.timeoutMs ?? 60000; // 60 second timeout (increased)
    const sinceDurationSec = options?.sinceDurationSec ?? 86400; // 24 hours

    try {
      // Wait for GeoRelayDirectory to be ready
      await GeoRelayDirectory.shared.waitForReady();

      // Get all relay entries - we need to access them through the class
      const allRelayUrls = await this.getAllRelayUrls();
      
      // Limit the number of relays for performance
      const relayUrls = allRelayUrls.slice(0, maxRelays);

      this.updateProgress({
        phase: 'connecting',
        totalRelays: relayUrls.length,
      });

      // Create relay pool
      this.relayPool = new RelayPool([], {
        useEventCache: true,
        logSubscriptions: false,
        deleteSignatures: false,
        skipVerification: false,
        autoReconnect: false, // Don't auto-reconnect during prefetch
      });

      const eoseReceivedRelays = new Set<string>();
      const failedRelays = new Set<string>();

      // Track relay errors
      this.relayPool.onerror((err: string, relayUrl: string) => {
        console.warn(`Prefetch relay error from ${relayUrl}:`, err);
        failedRelays.add(relayUrl);
      });

      // Create subscription with timeout
      const sinceTimestamp = Math.floor(Date.now() / 1000) - sinceDurationSec;

      const subscriptionPromise = new Promise<void>((resolve) => {
        let hasResolved = false;
        let unsubscribe: (() => void) | null = null;

        const checkCompletion = () => {
          if (hasResolved) return;
          
          const totalResponded = eoseReceivedRelays.size + failedRelays.size;
          const percentComplete = (totalResponded / relayUrls.length) * 100;
          
          // Complete when:
          // 1. All relays have responded, OR
          // 2. At least 50% of relays have responded, OR
          // 3. We have at least 100 events and 5 relays have responded
          const hasEnoughEvents = this.events.length >= 100 && eoseReceivedRelays.size >= 5;
          const hasEnoughRelays = percentComplete >= 50;
          
          if (totalResponded >= relayUrls.length || hasEnoughRelays || hasEnoughEvents) {
            hasResolved = true;
            console.log(`Prefetch complete: ${eoseReceivedRelays.size} relays responded with EOSE, ${failedRelays.size} failed, ${this.events.length} total events`);
            if (unsubscribe) unsubscribe();
            resolve();
          }
        };

        unsubscribe = this.relayPool!.subscribe(
          [{
            kinds: [20000, 23333], // Geo events and standard channel events
            since: sinceTimestamp,
          }],
          relayUrls,
          (event: NostrEventOriginal, isAfterEose: boolean, relayURL?: string) => {
            // Deduplicate events
            if (!this.eventIds.has(event.id)) {
              this.eventIds.add(event.id);
              this.events.push({
                event,
                relayUrl: relayURL || 'unknown',
                receivedAt: new Date(),
              });
              this.updateProgress({
                eventsReceived: this.events.length,
              });
              // Check if we have enough events to complete early
              checkCompletion();
            }
          },
          undefined,
          (relayURL: string) => {
            // EOSE callback - end of stored events for this relay
            if (!eoseReceivedRelays.has(relayURL)) {
              eoseReceivedRelays.add(relayURL);
              this.updateProgress({
                phase: 'fetching',
                connectedRelays: eoseReceivedRelays.size,
                currentRelay: relayURL,
              });
              console.log(`EOSE from ${relayURL} (${eoseReceivedRelays.size}/${relayUrls.length}), events so far: ${this.events.length}`);
              checkCompletion();
            }
          },
          {
            allowDuplicateEvents: false,
            allowOlderEvents: true,
            logAllEvents: false,
            unsubscribeOnEose: false,
          }
        );

        // Timeout fallback - but give plenty of time
        setTimeout(() => {
          if (!hasResolved) {
            hasResolved = true;
            console.log(`Prefetch timeout: ${eoseReceivedRelays.size} relays responded, ${this.events.length} events`);
            if (unsubscribe) unsubscribe();
            resolve();
          }
        }, timeoutMs);
      });

      await subscriptionPromise;

      // Cleanup
      if (this.relayPool) {
        this.relayPool = null;
      }

      // Sort events by timestamp (newest first)
      this.events.sort((a, b) => b.event.created_at - a.event.created_at);

      this.updateProgress({
        phase: 'complete',
        completedAt: new Date(),
      });

      this.hasPrefetched = true;
      this.isPrefetching = false;
      this.notifyComplete();

      return this.events;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
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
   * Get all relay URLs from the GeoRelayDirectory
   */
  private async getAllRelayUrls(): Promise<string[]> {
    // Use a global geohash to get worldwide coverage
    // Get relays from multiple regions by querying different geohash prefixes
    const geohashPrefixes = [
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      'b', 'c', 'd', 'e', 'f', 'g', 'h', 'j', 'k', 'm',
      'n', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z'
    ];

    const allUrls = new Set<string>();
    
    // Get closest relays to each geohash prefix region
    for (const prefix of geohashPrefixes) {
      const relays = GeoRelayDirectory.shared.closestRelays(prefix, 5);
      relays.forEach(url => allUrls.add(url));
    }

    // Also add some known good relays for redundancy
    const fallbackRelays = [
      'wss://relay.damus.io',
      'wss://nos.lol',
      'wss://relay.primal.net',
      'wss://offchain.pub',
      'wss://relay.nostr.band',
    ];
    
    fallbackRelays.forEach(url => allUrls.add(url));

    return Array.from(allUrls);
  }

  /**
   * Reset the prefetch state (for testing/debugging)
   */
  reset(): void {
    this.events = [];
    this.eventIds.clear();
    this.hasPrefetched = false;
    this.isPrefetching = false;
    this.progress = {
      phase: 'initializing',
      totalRelays: 0,
      connectedRelays: 0,
      eventsReceived: 0,
      currentRelay: null,
      startedAt: null,
      completedAt: null,
      errorMessage: null,
    };
  }
}

export const prefetchService = PrefetchService.shared;
export default PrefetchService;

