/**
 * GeoRelayConnectionManager
 * 
 * Unified service for managing georelay connections with priority-based budget allocation.
 * Single source of truth for all georelay connections.
 * 
 * Connection Budget (15 max):
 * - Primary (in:[geohash]): 5 relays
 * - Secondary depth 1: 4 relays  
 * - Secondary depth 2: 3 relays
 * - Tertiary depth 3+: 3 relays
 */

import { RelayPool } from "nostr-relaypool";
import type { Event as NostrEventOriginal } from "nostr-tools";
import { GeoRelayDirectory } from "@/utils/geoRelayDirectory";
import { useEventStore, StoredEvent } from "@/stores";

// Valid geohash characters (base32 without 'a', 'i', 'l', 'o')
const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i;

// Helper to extract tag value from event tags
const getTagValue = (event: NostrEventOriginal, tagName: string): string | null => {
  const tag = event.tags.find((tag: string[]) => tag[0] === tagName);
  return tag ? (tag[1] || null) : null;
};

// ============================================================================
// Types
// ============================================================================

export type Priority = 'primary' | 'secondary' | 'tertiary';

export interface GeohashPriority {
  geohash: string;
  priority: Priority;
  depth: number;
  relayBudget: number;
}

export interface RelayConnection {
  url: string;
  geohashes: string[]; // Which geohashes this relay serves
  status: 'connecting' | 'connected' | 'disconnected';
  lastActivity: number;
}

export interface ConnectionState {
  isConnected: boolean;
  totalConnections: number;
  maxConnections: number;
  primaryGeohash: string | null;
  secondaryGeohashes: string[];
  relays: RelayConnection[];
  eventCount: number;
}

export interface GeoRelayEvent {
  id: string;
  geohash: string;
  content: string;
  pubkey: string;
  createdAt: number;
  kind: number;
  relayUrl?: string;
}

type StateChangeCallback = (state: ConnectionState) => void;
type EventCallback = (event: GeoRelayEvent) => void;

// ============================================================================
// Budget Configuration
// ============================================================================

const BUDGET = {
  TOTAL_MAX: 15,
  PRIMARY: 5,           // in:[geohash] gets 5 relays
  SECONDARY_DEPTH_1: 4, // depth 1 geohashes share 4 relays
  SECONDARY_DEPTH_2: 3, // depth 2 geohashes share 3 relays  
  TERTIARY: 3,          // depth 3+ geohashes share 3 relays
} as const;

// ============================================================================
// GeoRelayConnectionManager Class
// ============================================================================

export class GeoRelayConnectionManager {
  private static instance: GeoRelayConnectionManager | null = null;

  private relayPool: RelayPool | null = null;
  private geoRelayDirectory: GeoRelayDirectory;
  
  // Current state
  private primaryGeohash: string | null = null;
  private secondaryGeohashes: GeohashPriority[] = [];
  private activeRelays: Map<string, RelayConnection> = new Map();
  private subscriptions: Map<string, () => void> = new Map(); // geohash -> unsubscribe
  private processedEventIds: Set<string> = new Set();
  
  // Callbacks
  private onStateChange?: StateChangeCallback;
  private onEvent?: EventCallback;
  private onGeohashAnimate?: (geohash: string) => void;

  // ============================================================================
  // Singleton
  // ============================================================================

  private constructor() {
    this.geoRelayDirectory = GeoRelayDirectory.shared;
  }

  static getInstance(): GeoRelayConnectionManager {
    if (!GeoRelayConnectionManager.instance) {
      GeoRelayConnectionManager.instance = new GeoRelayConnectionManager();
    }
    return GeoRelayConnectionManager.instance;
  }

  static destroy(): void {
    if (GeoRelayConnectionManager.instance) {
      GeoRelayConnectionManager.instance.cleanup();
      GeoRelayConnectionManager.instance = null;
    }
  }

  // ============================================================================
  // Public API
  // ============================================================================

  /**
   * Initialize the manager with callbacks
   */
  initialize(options: {
    onStateChange?: StateChangeCallback;
    onEvent?: EventCallback;
    onGeohashAnimate?: (geohash: string) => void;
  }): void {
    this.onStateChange = options.onStateChange;
    this.onEvent = options.onEvent;
    this.onGeohashAnimate = options.onGeohashAnimate;
    
    // Initialize relay pool
    if (!this.relayPool) {
      this.createRelayPool();
    }
    
    console.log('[GeoRelayConnectionManager] Initialized');
  }

  /**
   * Set the primary geohash (from in:[geohash] search)
   * This takes highest priority and gets 5 relay connections
   */
  async setPrimaryGeohash(geohash: string | null): Promise<void> {
    const normalizedGeohash = geohash?.toLowerCase() || null;
    
    // Validate geohash
    if (normalizedGeohash && !VALID_GEOHASH_CHARS.test(normalizedGeohash)) {
      console.warn(`[GeoRelayConnectionManager] Invalid geohash: ${geohash}`);
      return;
    }
    
    // Skip if unchanged
    if (this.primaryGeohash === normalizedGeohash) {
      return;
    }
    
    console.log(`[GeoRelayConnectionManager] Setting primary geohash: ${normalizedGeohash || 'none'}`);
    this.primaryGeohash = normalizedGeohash;
    
    // Rebuild all connections with new priority
    await this.rebuildConnections();
  }

  /**
   * Set secondary geohashes (from country/region selection)
   * These are allocated budget based on their depth
   */
  async setSecondaryGeohashes(geohashes: string[]): Promise<void> {
    // Convert to priority entries grouped by depth
    const priorities: GeohashPriority[] = geohashes
      .filter(gh => gh && VALID_GEOHASH_CHARS.test(gh))
      .map(gh => ({
        geohash: gh.toLowerCase(),
        priority: 'secondary' as Priority,
        depth: gh.length,
        relayBudget: this.calculateBudgetForDepth(gh.length),
      }));
    
    // Sort by depth (smaller depth = higher priority)
    priorities.sort((a, b) => a.depth - b.depth);
    
    console.log(`[GeoRelayConnectionManager] Setting ${priorities.length} secondary geohashes`);
    this.secondaryGeohashes = priorities;
    
    // Rebuild connections
    await this.rebuildConnections();
  }

  /**
   * Clear all secondary geohashes (e.g., when leaving globe view)
   */
  async clearSecondaryGeohashes(): Promise<void> {
    this.secondaryGeohashes = [];
    await this.rebuildConnections();
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return {
      isConnected: this.activeRelays.size > 0,
      totalConnections: this.activeRelays.size,
      maxConnections: BUDGET.TOTAL_MAX,
      primaryGeohash: this.primaryGeohash,
      secondaryGeohashes: this.secondaryGeohashes.map(p => p.geohash),
      relays: Array.from(this.activeRelays.values()),
      eventCount: useEventStore.getState().eventCount,
    };
  }

  /**
   * Cleanup and destroy connections
   */
  cleanup(): void {
    console.log('[GeoRelayConnectionManager] Cleaning up...');
    
    // Unsubscribe all
    this.subscriptions.forEach(unsub => {
      try { unsub(); } catch (e) { /* ignore */ }
    });
    this.subscriptions.clear();
    
    // Close relay pool
    if (this.relayPool) {
      this.relayPool.close();
      this.relayPool = null;
    }
    
    // Clear state
    this.activeRelays.clear();
    this.processedEventIds.clear();
    this.primaryGeohash = null;
    this.secondaryGeohashes = [];
    
    this.notifyStateChange();
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  private createRelayPool(): void {
    this.relayPool = new RelayPool([], {
      useEventCache: true,
      logSubscriptions: false,
      deleteSignatures: false,
      skipVerification: false,
      autoReconnect: true,
    });

    this.relayPool.onerror((err: string, relayUrl: string) => {
      console.warn(`[GeoRelayConnectionManager] Relay error from ${relayUrl}:`, err);
      const relay = this.activeRelays.get(relayUrl);
      if (relay) {
        relay.status = 'disconnected';
        this.activeRelays.set(relayUrl, relay);
        this.notifyStateChange();
      }
    });
  }

  /**
   * Calculate relay budget for a given geohash depth
   */
  private calculateBudgetForDepth(depth: number): number {
    if (depth === 1) return 2; // Each depth-1 geohash gets 2 relays (up to 4 total)
    if (depth === 2) return 1; // Each depth-2 geohash gets 1 relay (up to 3 total)
    return 1; // Depth 3+ gets 1 relay each (up to 3 total)
  }

  /**
   * Rebuild all connections based on current priority state
   */
  private async rebuildConnections(): Promise<void> {
    // Wait for geo relay directory to be ready
    await this.geoRelayDirectory.waitForReady();
    
    if (!this.geoRelayDirectory.isReady()) {
      console.error('[GeoRelayConnectionManager] GeoRelayDirectory not ready!');
      return;
    }

    // Cancel existing subscriptions
    this.subscriptions.forEach(unsub => {
      try { unsub(); } catch (e) { /* ignore */ }
    });
    this.subscriptions.clear();
    
    // Build prioritized connection plan
    const plan = this.buildConnectionPlan();
    
    console.log(`[GeoRelayConnectionManager] Connection plan: ${plan.length} geohashes`);
    
    // Clear active relays
    this.activeRelays.clear();
    
    // Create relay pool if needed
    if (!this.relayPool) {
      this.createRelayPool();
    }
    
    // Execute connection plan
    for (const entry of plan) {
      await this.connectToGeohash(entry);
    }
    
    this.notifyStateChange();
  }

  /**
   * Build a connection plan based on priorities and budget
   */
  private buildConnectionPlan(): GeohashPriority[] {
    const plan: GeohashPriority[] = [];
    let remainingBudget = BUDGET.TOTAL_MAX;
    
    // 1. Primary geohash (highest priority)
    if (this.primaryGeohash) {
      const primaryBudget = Math.min(BUDGET.PRIMARY, remainingBudget);
      plan.push({
        geohash: this.primaryGeohash,
        priority: 'primary',
        depth: this.primaryGeohash.length,
        relayBudget: primaryBudget,
      });
      remainingBudget -= primaryBudget;
    }
    
    // 2. Secondary geohashes by depth
    // Group by depth
    const byDepth = new Map<number, GeohashPriority[]>();
    for (const entry of this.secondaryGeohashes) {
      // Skip if this is the same as primary
      if (entry.geohash === this.primaryGeohash) continue;
      
      const existing = byDepth.get(entry.depth) || [];
      existing.push(entry);
      byDepth.set(entry.depth, existing);
    }
    
    // Allocate budget for depth 1
    const depth1 = byDepth.get(1) || [];
    const depth1Budget = Math.min(BUDGET.SECONDARY_DEPTH_1, remainingBudget);
    if (depth1.length > 0 && depth1Budget > 0) {
      const perGeohash = Math.max(1, Math.floor(depth1Budget / depth1.length));
      for (const entry of depth1.slice(0, depth1Budget)) {
        plan.push({ ...entry, relayBudget: perGeohash });
        remainingBudget -= perGeohash;
        if (remainingBudget <= 0) break;
      }
    }
    
    // Allocate budget for depth 2
    const depth2 = byDepth.get(2) || [];
    const depth2Budget = Math.min(BUDGET.SECONDARY_DEPTH_2, remainingBudget);
    if (depth2.length > 0 && depth2Budget > 0) {
      const perGeohash = Math.max(1, Math.floor(depth2Budget / depth2.length));
      for (const entry of depth2.slice(0, depth2Budget)) {
        plan.push({ ...entry, relayBudget: perGeohash });
        remainingBudget -= perGeohash;
        if (remainingBudget <= 0) break;
      }
    }
    
    // Allocate budget for depth 3+
    const depth3Plus = Array.from(byDepth.entries())
      .filter(([d]) => d >= 3)
      .flatMap(([, entries]) => entries);
    const depth3Budget = Math.min(BUDGET.TERTIARY, remainingBudget);
    if (depth3Plus.length > 0 && depth3Budget > 0) {
      for (const entry of depth3Plus.slice(0, depth3Budget)) {
        plan.push({ ...entry, relayBudget: 1 });
        remainingBudget -= 1;
        if (remainingBudget <= 0) break;
      }
    }
    
    return plan;
  }

  /**
   * Connect to relays for a specific geohash
   */
  private async connectToGeohash(entry: GeohashPriority): Promise<void> {
    if (!this.relayPool) return;
    
    // Get closest relays for this geohash
    const relayUrls = this.geoRelayDirectory.closestRelays(entry.geohash, entry.relayBudget);
    
    if (relayUrls.length === 0) {
      console.warn(`[GeoRelayConnectionManager] No relays found for geohash: ${entry.geohash}`);
      return;
    }
    
    console.log(`[GeoRelayConnectionManager] Connecting ${entry.geohash} (${entry.priority}) to ${relayUrls.length} relays`);
    
    // Track active relays
    for (const url of relayUrls) {
      const existing = this.activeRelays.get(url);
      if (existing) {
        existing.geohashes.push(entry.geohash);
      } else {
        this.activeRelays.set(url, {
          url,
          geohashes: [entry.geohash],
          status: 'connecting',
          lastActivity: Date.now(),
        });
      }
    }
    
    // Create subscription with #g filter (matching Android pattern)
    const filter = {
      kinds: [1, 20000, 23333], // text notes + ephemeral events
      "#g": [entry.geohash],
      since: Math.floor(Date.now() / 1000) - (24 * 60 * 60), // 24 hour lookback
      limit: 100,
    };
    
    try {
      const unsubscribe = this.relayPool.subscribe(
        [filter],
        relayUrls,
        (event: NostrEventOriginal, _isAfterEose: boolean, relayURL?: string) => {
          this.handleEvent(event, entry.geohash, relayURL);
        },
        undefined,
        (relayURL: string) => {
          // On relay connect
          const relay = this.activeRelays.get(relayURL);
          if (relay) {
            relay.status = 'connected';
            relay.lastActivity = Date.now();
            this.activeRelays.set(relayURL, relay);
            this.notifyStateChange();
          }
        },
        {
          allowDuplicateEvents: false,
          allowOlderEvents: true,
          logAllEvents: false,
          unsubscribeOnEose: false,
        }
      );
      
      this.subscriptions.set(entry.geohash, unsubscribe);
    } catch (error) {
      console.error(`[GeoRelayConnectionManager] Failed to subscribe to ${entry.geohash}:`, error);
    }
  }

  /**
   * Handle incoming event
   */
  private handleEvent(
    event: NostrEventOriginal,
    subscribedGeohash: string,
    relayURL?: string
  ): void {
    // Deduplicate
    if (this.processedEventIds.has(event.id)) {
      return;
    }
    this.processedEventIds.add(event.id);
    
    // Limit dedup cache size
    if (this.processedEventIds.size > 10000) {
      const arr = Array.from(this.processedEventIds);
      this.processedEventIds = new Set(arr.slice(-5000));
    }
    
    // Extract geohash from event's g tag
    const eventGeohash = getTagValue(event, "g");
    const geohash = eventGeohash?.toLowerCase() || subscribedGeohash;
    
    // Validate geohash
    if (!VALID_GEOHASH_CHARS.test(geohash)) {
      return;
    }
    
    // Update relay activity
    if (relayURL) {
      const relay = this.activeRelays.get(relayURL);
      if (relay) {
        relay.lastActivity = Date.now();
      }
    }
    
    // Push to central store
    const storedEvent: StoredEvent = {
      event: {
        id: event.id,
        pubkey: event.pubkey,
        created_at: event.created_at,
        kind: event.kind,
        tags: event.tags,
        content: event.content,
        sig: event.sig,
      },
      geohash,
      relay: relayURL || '',
      receivedAt: Date.now(),
    };
    useEventStore.getState().addEvent(storedEvent);
    
    // Create normalized event for callback
    const normalizedEvent: GeoRelayEvent = {
      id: event.id,
      geohash,
      content: event.content,
      pubkey: event.pubkey,
      createdAt: event.created_at,
      kind: event.kind,
      relayUrl: relayURL,
    };
    
    // Trigger animation for matching geohash
    if (this.onGeohashAnimate) {
      const matchingGeohash = this.findMatchingGeohash(geohash);
      if (matchingGeohash) {
        this.onGeohashAnimate(matchingGeohash);
      }
    }
    
    // Notify event callback
    this.onEvent?.(normalizedEvent);
    this.notifyStateChange();
  }

  /**
   * Find matching geohash for animation
   */
  private findMatchingGeohash(eventGeohash: string): string | null {
    // Check if event matches primary geohash
    if (this.primaryGeohash && eventGeohash.startsWith(this.primaryGeohash)) {
      return this.primaryGeohash;
    }
    
    // Check secondary geohashes
    for (const entry of this.secondaryGeohashes) {
      if (eventGeohash.startsWith(entry.geohash)) {
        return entry.geohash;
      }
    }
    
    return null;
  }

  /**
   * Notify state change callback
   */
  private notifyStateChange(): void {
    this.onStateChange?.(this.getState());
  }
}

// ============================================================================
// Singleton export
// ============================================================================

export const geoRelayManager = GeoRelayConnectionManager.getInstance();

