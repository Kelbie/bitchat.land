import { useState, useRef, useEffect, useCallback } from "react";
import { RelayPool } from "nostr-relaypool";
import type { Event as NostrEventOriginal } from "nostr-tools";
import { NostrEvent, GeohashActivity } from "@/types";
import { NOSTR_RELAYS } from "@/constants/projections";
import { findMatchingGeohash } from "@/utils/geohashUtils";
import { GeoRelayDirectory } from "@/utils/geoRelayDirectory";

// Valid geohash characters (base32 without 'a', 'i', 'l', 'o')
const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/;

// Helper to extract tag value from event tags
export const getTagValue = (event: NostrEventOriginal, tagName: string): string | null => {
  const tag = event.tags.find((tag: string[]) => tag[0] === tagName);
  return tag ? (tag[1] || null) : null;
};

interface RelayInfo {
  url: string;
  geohash: string;
  type: 'initial' | 'local';
  status: 'connecting' | 'connected' | 'disconnected';
  lastPing: number;
}

interface ConnectionState {
  relays: RelayInfo[];
  status: string;
  isConnected: boolean;
  isEnabled: boolean;
}

interface GeohashStats {
  geohash: string;
  lastActivity: number;
  eventCount: number;
  totalEvents: number; // Raw count of all events for this geohash
}

class NostrConnection {
  private relayPool: RelayPool | null = null;
  private relays: RelayInfo[] = [];
  private currentSubscriptions: Map<string, () => void> = new Map();
  private _isEnabled: boolean = false;
  private _isConnected: boolean = false;
  private _status: string = "Disconnected";
  private _events: NostrEvent[] = [];
  private _geohashStats: Map<string, GeohashStats> = new Map();

  // Search parameters
  private searchGeohash: string;
  private currentGeohashes: string[];
  private onGeohashAnimate?: (geohash: string) => void;
  private onStateChange?: () => void; // Add callback for state changes
  private currentChannel: string = "";

  constructor(
    searchGeohash: string = "",
    currentGeohashes: string[] = [],
    onGeohashAnimate?: (geohash: string) => void,
    onStateChange?: () => void, // Add this parameter
  ) {
    this.searchGeohash = searchGeohash;
    this.currentGeohashes = currentGeohashes;
    this.onGeohashAnimate = onGeohashAnimate;
    this.onStateChange = onStateChange;

    // Auto-connect on creation
    this.connect();
  }

  getHierarchicalEventCount(targetGeohash: string): number {
    let totalCount = 0;

    // Count all events that have geohashes starting with the target geohash
    this._geohashStats.forEach((stats, eventGeohash) => {
      if (eventGeohash.startsWith(targetGeohash)) {
        totalCount += stats.totalEvents;
      }
    });

    return totalCount;
  }



  // Public getter for the complete connection state
  get connectionState(): ConnectionState {
    return {
      relays: [...this.relays],
      status: this._status,
      isConnected: this._isConnected,
      isEnabled: this._isEnabled
    };
  }

  // Public getters for data
  get events(): NostrEvent[] { return [...this._events]; }
  get geohashStats(): Map<string, GeohashStats> { return new Map(this._geohashStats); }

  // Backward compatibility getters
  get geohashActivity(): Map<string, GeohashActivity> {
    const activity = new Map<string, GeohashActivity>();
    this._geohashStats.forEach((stats, geohash) => {
      activity.set(geohash, {
        geohash: stats.geohash,
        lastActivity: stats.lastActivity,
        eventCount: stats.eventCount
      });
    });
    return activity;
  }

  get allEventsByGeohash(): Map<string, number> {
    const eventCounts = new Map<string, number>();

    // Get all unique geohash prefixes that we need to calculate counts for
    const allGeohashes = Array.from(this._geohashStats.keys());
    const prefixesNeeded = new Set<string>();

    // For each geohash, add all its prefixes
    allGeohashes.forEach(geohash => {
      for (let i = 1; i <= geohash.length; i++) {
        prefixesNeeded.add(geohash.substring(0, i));
      }
    });

    // Calculate hierarchical counts for each prefix
    prefixesNeeded.forEach(prefix => {
      const hierarchicalCount = this.getHierarchicalEventCount(prefix);
      if (hierarchicalCount > 0) {
        eventCounts.set(prefix, hierarchicalCount);
      }
    });

    return eventCounts;
  }

  // Individual getters (kept for convenience)
  get isEnabled(): boolean { return this._isEnabled; }
  get isConnected(): boolean { return this._isConnected; }
  get status(): string { return this._status; }
  get connectedRelays(): RelayInfo[] { return [...this.relays]; }

  private updateStatus(): void {
    const totalCount = this.relays.length;

    if (totalCount === 0) {
      this._status = "Disconnected";
      this._isConnected = false;
    } else if (!this.relayPool) {
      this._status = "Connection failed";
      this._isConnected = false;
    } else {
      const connectedCount = this.relays.filter(r => r.status === 'connected').length;
      const localCount = this.relays.filter(r => r.type === 'local' && r.status === 'connected').length;
      const initialCount = this.relays.filter(r => r.type === 'initial' && r.status === 'connected').length;

      this._isConnected = connectedCount > 0;

      if (localCount > 0) {
        this._status = `Connected with ${connectedCount} total relays (${localCount} local + ${initialCount} initial)`;
      } else if (initialCount > 0) {
        this._status = `Connected to ${initialCount} initial relays`;
      } else {
        this._status = `Connecting to ${totalCount} relays...`;
      }
    }

    // Trigger React re-render when status changes
    this.onStateChange?.();
  }

  private createRelayPool(): void {
    if (this.relayPool) {
      // Clean up existing pool
      this.currentSubscriptions.forEach(unsub => unsub());
      this.currentSubscriptions.clear();
    }

    // Create RelayPool with advanced features enabled
    this.relayPool = new RelayPool([], {
      useEventCache: true,
      logSubscriptions: false,
      deleteSignatures: false,
      skipVerification: false,
      autoReconnect: true,
    });

    // Set up error and notice handlers
    this.relayPool.onerror((err: string, relayUrl: string) => {
      console.error("RelayPool error from", relayUrl, ":", err);
      // Update specific relay status
      this.relays = this.relays.map(relay =>
        relay.url === relayUrl ? { ...relay, status: 'disconnected' } : relay
      );
      this.updateStatus(); // This will trigger re-render
    });

    this.relayPool.onnotice((relayUrl: string, notice: string) => {
      // console.log("RelayPool notice from", relayUrl, ":", notice);
    });
  }

  private getInitialRelays(): RelayInfo[] {
    const initialRelays: RelayInfo[] = [];

    // Use the predefined NOSTR_RELAYS array for initial connections
    for (const url of NOSTR_RELAYS) {
      initialRelays.push({
        url,
        geohash: "", // Global/default geohash
        status: 'connecting',
        lastPing: Date.now(),
        type: 'initial'
      });
    }

    // Fallback to hardcoded relay if NOSTR_RELAYS is empty
    if (initialRelays.length === 0) {
      initialRelays.push({
        url: "wss://relay.damus.io",
        geohash: "",
        status: 'connecting',
        lastPing: Date.now(),
        type: 'initial'
      });
    }

    return initialRelays;
  }

  private createMainSubscription(relays: string[]): void {
    if (!this.relayPool) return;

    // Close existing main subscription
    const mainSub = this.currentSubscriptions.get('main');
    if (mainSub) {
      mainSub();
      this.currentSubscriptions.delete('main');
    }

    // Create subscription for both kind 20000 (geohash) and 23333 (group) events
    const unsubscribe = this.relayPool.subscribe(
      [{
        kinds: [20000, 23333], 
        since: Math.floor(Date.now() / 1000) - (60 * 60)
      }],
      relays,
      (event: NostrEventOriginal, isAfterEose: boolean, relayURL?: string) => {
        this.handleEvent(event, isAfterEose, relayURL);
      },
      undefined,
      (relayURL: string) => {
        // Update relay status to connected when EOSE is received
        this.relays = this.relays.map(relay =>
          relay.url === relayURL ? { ...relay, status: 'connected' } : relay
        );
        this.updateStatus(); // This will trigger re-render
      },
      {
        allowDuplicateEvents: false,
        allowOlderEvents: true,
        logAllEvents: false,
        unsubscribeOnEose: false,
      }
    );

    this.currentSubscriptions.set('main', unsubscribe);
  }

  private handleEvent(event: NostrEventOriginal, isAfterEose: boolean, relayURL?: string): void {
    // Extract tags using helper function
    const eventGeohash = getTagValue(event, "g");
    const eventGroup = getTagValue(event, "d");
    const eventKind = event.kind as number | undefined;

    // Validate events based on kind rules
    if (eventKind === 20000 && eventGeohash) {
      const gh = eventGeohash.toLowerCase();
      if (!VALID_GEOHASH_CHARS.test(gh)) {
        return;
      }
    }

    const locationIdentifier = eventGeohash || eventGroup;
    if (!locationIdentifier) return;

    // Create enhanced event with relay URL
    const enhancedEvent: NostrEvent = {
      ...event,
      relayUrl: relayURL || undefined
    };

    // Handle geohash events
    if (eventGeohash) {
      const matchingGeohash = findMatchingGeohash(
        eventGeohash,
        this.searchGeohash,
        this.currentGeohashes
      );

      // Update consolidated geohash stats
      const currentStats = this._geohashStats.get(eventGeohash) || {
        geohash: eventGeohash,
        lastActivity: 0,
        eventCount: 0,
        totalEvents: 0
      };

      this._geohashStats.set(eventGeohash, {
        ...currentStats,
        totalEvents: currentStats.totalEvents + 1
      });

      if (matchingGeohash) {
        // Update activity tracking for matching geohash
        const matchingStats = this._geohashStats.get(matchingGeohash) || {
          geohash: matchingGeohash,
          lastActivity: 0,
          eventCount: 0,
          totalEvents: 0
        };

        this._geohashStats.set(matchingGeohash, {
          ...matchingStats,
          lastActivity: Date.now(),
          eventCount: matchingStats.eventCount + 1,
          // Don't double-count if eventGeohash === matchingGeohash
          totalEvents: eventGeohash === matchingGeohash ?
            matchingStats.totalEvents : matchingStats.totalEvents + 1
        });

        this.onGeohashAnimate?.(matchingGeohash);
      }
    } else if (eventGroup) {
      // Update consolidated geohash stats for groups
      const currentStats = this._geohashStats.get(eventGroup) || {
        geohash: eventGroup,
        lastActivity: 0,
        eventCount: 0,
        totalEvents: 0
      };

      this._geohashStats.set(eventGroup, {
        ...currentStats,
        totalEvents: currentStats.totalEvents + 1
      });
    }

    // Add event without duplicates
    if (!this._events.some(existingEvent => existingEvent.id === enhancedEvent.id)) {
      this._events = [enhancedEvent, ...this._events];
    }

    // Trigger React re-render when new events arrive
    this.onStateChange?.();
  }

  // Method to update search parameters
  updateSearchParams(searchGeohash: string, currentGeohashes: string[], onGeohashAnimate?: (geohash: string) => void): void {
    this.searchGeohash = searchGeohash;
    this.currentGeohashes = currentGeohashes;
    this.onGeohashAnimate = onGeohashAnimate;
  }

  // Method to update channel and auto-connect to georelays
  async updateChannel(channel: string): Promise<void> {
    if (this.currentChannel !== channel) {
      this.currentChannel = channel;
      if (this._isEnabled && channel) {
        await this.connectToGeoRelays(channel);
      }
    }
  }

  async connect(): Promise<void> {
    try {
      this._isEnabled = true;
      this.createRelayPool();

      const initialRelays = this.getInitialRelays();
      this.relays = initialRelays;
      this.updateStatus(); // This will trigger re-render

      const relayUrls = initialRelays.map(r => r.url);
      this.createMainSubscription(relayUrls);

    } catch (error) {
      console.error("Failed to connect to Nostr:", error);
      this.relays = [];
      this._isConnected = false;
      this._status = "Connection failed";
      this.onStateChange?.(); // Trigger re-render on error
    }
  }

  disconnect(): void {
    this._isEnabled = false;
    this._isConnected = false;

    // Clean up all subscriptions
    this.currentSubscriptions.forEach(unsub => unsub());
    this.currentSubscriptions.clear();

    if (this.relayPool) {
      this.relayPool = null;
    }

    // Update relay status
    this.relays = this.relays.map(relay => ({
      ...relay,
      status: 'disconnected'
    }));

    this._status = "Disconnected";
    this.onStateChange?.(); // Trigger re-render when disconnecting
  }

  async toggle(): Promise<void> {
    if (this._isEnabled) {
      this.disconnect();
    } else {
      await this.connect();
    }
  }

  async connectToGeoRelays(channel: string): Promise<string[]> {
    if (!this._isEnabled) return [];

    try {
      await GeoRelayDirectory.shared.waitForReady();
      const geoRelays = this.getGeorelayRelays(channel, 5);

      if (geoRelays.length === 0) {
        return [];
      }

      const initialRelays = this.relays.filter(r => r.type === 'initial');
      const existingLocalRelays = this.relays.filter(r => r.type === 'local');

      const newRelayInfo: RelayInfo[] = geoRelays.map(url => ({
        url,
        geohash: channel,
        status: 'connecting',
        lastPing: Date.now(),
        type: 'local'
      }));

      const maxLocalRelays = 5;
      let finalLocalRelays: RelayInfo[];

      if (existingLocalRelays.length + newRelayInfo.length <= maxLocalRelays) {
        finalLocalRelays = [...existingLocalRelays, ...newRelayInfo];
      } else {
        const availableSlots = maxLocalRelays - existingLocalRelays.length;
        if (availableSlots > 0) {
          finalLocalRelays = [...existingLocalRelays, ...newRelayInfo.slice(0, availableSlots)];
        } else {
          finalLocalRelays = newRelayInfo.slice(0, maxLocalRelays);
        }
      }

      this.relays = [...initialRelays, ...finalLocalRelays];

      if (!this.relayPool) {
        this.createRelayPool();
      }

      const allRelayUrls = this.relays.map(r => r.url);
      this.createMainSubscription(allRelayUrls);

      this.updateStatus(); // This will trigger re-render
      return geoRelays;

    } catch (error) {
      console.error("Failed to connect to georelays:", error);
      return [];
    }
  }

  private getGeorelayRelays(channel: string, count: number = 5): string[] {
    const targetGeohash = channel || "u";
    return GeoRelayDirectory.shared.closestRelays(targetGeohash, count);
  }

  // Utility method to get connection info for UI components
  getConnectionInfo() {
    return {
      relays: this.relays.map(relay => ({
        url: relay.url,
        geohash: relay.geohash,
        type: relay.type,
        isConnected: relay.status === 'connected'
      })),
      status: this._status,
      isEnabled: this._isEnabled,
      isConnected: this._isConnected,
      totalConnected: this.relays.filter(relay => relay.status === 'connected').length,
      totalConfigured: this.relays.length
    };
  }
}

export function useNostr(
  searchGeohash: string,
  currentGeohashes: string[],
  onGeohashAnimate: (geohash: string) => void,
  currentChannel: string = ""
) {
  // Force re-render when data changes
  const [, forceUpdate] = useState({});
  const forceRerender = useCallback(() => forceUpdate({}), []);

  const connectionRef = useRef<NostrConnection | null>(null);

  // Initialize connection once
  useEffect(() => {
    connectionRef.current = new NostrConnection(
      searchGeohash,
      currentGeohashes,
      onGeohashAnimate,
      forceRerender // Pass the forceRerender callback
    );

    // Remove the periodic interval - no longer needed!
    // const interval = setInterval(forceRerender, 1000);

    return () => {
      // clearInterval(interval); // Remove this line too
      if (connectionRef.current) {
        connectionRef.current.disconnect();
      }
    };
  }, []); // Empty dependency array - only run once

  // Update parameters when they change
  useEffect(() => {
    if (connectionRef.current) {
      connectionRef.current.updateSearchParams(searchGeohash, currentGeohashes, onGeohashAnimate);
    }
  }, [searchGeohash, currentGeohashes, onGeohashAnimate]);

  useEffect(() => {
    if (connectionRef.current) {
      connectionRef.current.updateChannel(currentChannel);
    }
  }, [currentChannel]);

  // Simple wrapper functions
  const toggleNostr = async () => {
    if (connectionRef.current) {
      await connectionRef.current.toggle();
      // No need to manually call forceRerender - the class will do it via callback
    }
  };

  // Return everything directly from the class
  if (!connectionRef.current) {
    return {
      events: [],
      allStoredEvents: [],
      geohashActivity: new Map(),
      allEventsByGeohash: new Map(),
      nostrEnabled: false,
      toggleNostr: async () => { },
      connectionInfo: {
        relays: [],
        status: "Initializing...",
        isEnabled: false,
        totalConnected: 0,
        totalConfigured: 0
      }
    };
  }

  const connection = connectionRef.current;
  const events = connection.events;
  const connectionState = connection.connectionState;

  return {
    // All data comes directly from the class
    events,
    allStoredEvents: events, // Alias for backward compatibility

    // Backward compatibility - derived from _geohashStats
    geohashActivity: connection.geohashActivity,
    allEventsByGeohash: connection.allEventsByGeohash,
    geohashStats: connection.geohashStats,

    // Connection state
    nostrEnabled: connectionState.isEnabled,
    toggleNostr,

    // Connection info for UI components
    connectionInfo: {
      relays: connectionState.relays.map(relay => ({
        url: relay.url,
        geohash: relay.geohash,
        type: relay.type,
        isConnected: relay.status === 'connected'
      })),
      status: connectionState.status,
      isEnabled: connectionState.isEnabled,
      totalConnected: connectionState.relays.filter(relay => relay.status === 'connected').length,
      totalConfigured: connectionState.relays.length
    },
  };
}