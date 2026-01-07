/**
 * Event Store Selectors
 * 
 * Memoized selectors for derived data from the event store.
 * These compute counts, channel lists, user data, etc.
 */

import { useEventStore, StoredEvent, GeohashStats, EventStore } from './eventStore';
import { useMemo } from 'react';
import { getPow } from 'nostr-tools/nip13';

// Type for the store state (without actions)
type EventStoreState = Pick<EventStore, 'events' | 'geohashStats' | 'isConnected' | 'isLoading' | 'lastUpdate' | 'error' | 'eventCount'>;

/**
 * Get all events as an array, sorted by created_at descending
 */
export function selectAllEvents(state: EventStoreState): StoredEvent[] {
  return Array.from(state.events.values())
    .sort((a, b) => b.event.created_at - a.event.created_at);
}

/**
 * Get event counts by geohash (hierarchical)
 * Returns a Map where key is geohash prefix and value is count of all events under that prefix
 */
export function selectEventsByGeohash(state: EventStoreState): Map<string, number> {
  const eventCounts = new Map<string, number>();
  const allGeohashes = Array.from(state.geohashStats.keys());
  const prefixesNeeded = new Set<string>();

  // Collect all prefixes we need to count
  allGeohashes.forEach(geohash => {
    for (let i = 1; i <= geohash.length; i++) {
      prefixesNeeded.add(geohash.substring(0, i));
    }
  });

  // Calculate hierarchical counts for each prefix
  prefixesNeeded.forEach(prefix => {
    let count = 0;
    state.geohashStats.forEach((stats, eventGeohash) => {
      if (eventGeohash.startsWith(prefix)) {
        count += stats.totalEvents;
      }
    });
    if (count > 0) {
      eventCounts.set(prefix, count);
    }
  });

  return eventCounts;
}

/**
 * Get exact event counts by geohash (non-hierarchical)
 * Returns a Map where key is exact geohash and value is count of events with that exact geohash
 * Unlike selectEventsByGeohash, this does NOT include child geohashes in the count
 */
export function selectExactEventsByGeohash(state: EventStoreState): Map<string, number> {
  const exactCounts = new Map<string, number>();
  
  state.geohashStats.forEach((stats, geohash) => {
    if (stats.totalEvents > 0) {
      exactCounts.set(geohash, stats.totalEvents);
    }
  });
  
  return exactCounts;
}

/**
 * Get event counts by channel (for unread counts)
 * Returns a Record where key is channel (prefixed with # for geohash channels) and value is count
 */
export function selectCountsByChannel(state: EventStoreState): Record<string, number> {
  const counts: Record<string, number> = {};
  
  for (const storedEvent of state.events.values()) {
    const event = storedEvent.event;
    const gTag = event.tags.find((t) => t[0] === 'g');
    const dTag = event.tags.find((t) => t[0] === 'd');
    
    const geohash = gTag && typeof gTag[1] === 'string' ? gTag[1].toLowerCase() : '';
    const channel = dTag && typeof dTag[1] === 'string' ? dTag[1].toLowerCase() : '';
    
    // Determine channel key
    let channelKey = '';
    if (geohash) {
      channelKey = `#${geohash}`;
    } else if (channel) {
      channelKey = channel;
    }
    
    if (channelKey) {
      counts[channelKey] = (counts[channelKey] || 0) + 1;
    }
  }
  
  return counts;
}

/**
 * Get user message counts
 * Returns a Map where key is pubkey and value is message count
 */
export function selectUserMessageCounts(state: EventStoreState): Map<string, number> {
  const userCounts = new Map<string, number>();
  
  for (const storedEvent of state.events.values()) {
    const pubkey = storedEvent.event.pubkey;
    userCounts.set(pubkey, (userCounts.get(pubkey) || 0) + 1);
  }
  
  return userCounts;
}

/**
 * Get channel list with metadata
 */
export interface ChannelMeta {
  key: string;
  isPinned: boolean;
  hasMessages: boolean;
  eventKind: number;
}

export function selectChannelList(state: EventStoreState): ChannelMeta[] {
  const channelMap = new Map<string, { kind: number; hasMessages: boolean }>();
  
  for (const storedEvent of state.events.values()) {
    const event = storedEvent.event;
    const gTag = event.tags.find((t) => t[0] === 'g');
    const dTag = event.tags.find((t) => t[0] === 'd');
    
    const geohash = gTag && typeof gTag[1] === 'string' ? gTag[1].toLowerCase() : '';
    const channel = dTag && typeof dTag[1] === 'string' ? dTag[1].toLowerCase() : '';
    
    if (geohash) {
      const key = `#${geohash}`;
      if (!channelMap.has(key)) {
        channelMap.set(key, { kind: event.kind, hasMessages: true });
      }
    } else if (channel) {
      if (!channelMap.has(channel)) {
        channelMap.set(channel, { kind: event.kind, hasMessages: true });
      }
    }
  }
  
  return Array.from(channelMap.entries()).map(([key, data]) => ({
    key,
    isPinned: false, // This would be determined by localStorage
    hasMessages: data.hasMessages,
    eventKind: data.kind,
  }));
}

/**
 * Get filtered events based on PoW settings
 */
export function selectFilteredEvents(
  state: EventStoreState,
  powEnabled: boolean,
  powDifficulty: number
): StoredEvent[] {
  const allEvents = selectAllEvents(state);
  
  if (!powEnabled) {
    return allEvents;
  }
  
  return allEvents.filter((ev) => getPow(ev.event.id) >= powDifficulty);
}

/**
 * Get geohash activity map (for animations)
 */
export interface GeohashActivity {
  geohash: string;
  lastActivity: number;
  eventCount: number;
}

export function selectGeohashActivity(state: EventStoreState): Map<string, GeohashActivity> {
  const activity = new Map<string, GeohashActivity>();
  
  state.geohashStats.forEach((stats, geohash) => {
    activity.set(geohash, {
      geohash: stats.geohash,
      lastActivity: stats.lastActivity,
      eventCount: stats.eventCount,
    });
  });
  
  return activity;
}

/**
 * Get the latest event timestamp per channel (for unread tracking)
 */
export function selectLatestEventByChannel(state: EventStoreState): Record<string, number> {
  const latest: Record<string, number> = {};
  
  for (const storedEvent of state.events.values()) {
    const event = storedEvent.event;
    const gTag = event.tags.find((t) => t[0] === 'g');
    const dTag = event.tags.find((t) => t[0] === 'd');
    
    const geohash = gTag && typeof gTag[1] === 'string' ? gTag[1].toLowerCase() : '';
    const channel = dTag && typeof dTag[1] === 'string' ? dTag[1].toLowerCase() : '';
    
    let channelKey = '';
    if (geohash) {
      channelKey = `#${geohash}`;
    } else if (channel) {
      channelKey = channel;
    }
    
    if (channelKey) {
      const timestamp = event.created_at * 1000;
      if (!latest[channelKey] || timestamp > latest[channelKey]) {
        latest[channelKey] = timestamp;
      }
    }
  }
  
  return latest;
}

// ============================================
// React Hooks for accessing selectors
// ============================================

/**
 * Hook to get all events
 * Uses eventCount as a trigger to re-compute, avoiding infinite loops from Map reference changes
 */
export function useAllEvents(): StoredEvent[] {
  const events = useEventStore((state) => state.events);
  const eventCount = useEventStore((state) => state.eventCount);
  
  return useMemo(() => {
    return selectAllEvents({ events } as EventStoreState);
  }, [events, eventCount]);
}

/**
 * Hook to get event counts by geohash
 */
export function useEventsByGeohash(): Map<string, number> {
  const events = useEventStore((state) => state.events);
  const geohashStats = useEventStore((state) => state.geohashStats);
  const eventCount = useEventStore((state) => state.eventCount);
  
  return useMemo(() => {
    return selectEventsByGeohash({ events, geohashStats } as EventStoreState);
  }, [events, geohashStats, eventCount]);
}

/**
 * Hook to get exact event counts by geohash (non-hierarchical)
 * Returns counts only for exact geohash matches, not including children
 */
export function useExactEventsByGeohash(): Map<string, number> {
  const geohashStats = useEventStore((state) => state.geohashStats);
  const eventCount = useEventStore((state) => state.eventCount);
  
  return useMemo(() => {
    return selectExactEventsByGeohash({ geohashStats } as EventStoreState);
  }, [geohashStats, eventCount]);
}

/**
 * Hook to get counts by channel
 */
export function useCountsByChannel(): Record<string, number> {
  const events = useEventStore((state) => state.events);
  const eventCount = useEventStore((state) => state.eventCount);
  
  return useMemo(() => {
    return selectCountsByChannel({ events } as EventStoreState);
  }, [events, eventCount]);
}

/**
 * Hook to get user message counts
 */
export function useUserMessageCounts(): Map<string, number> {
  const events = useEventStore((state) => state.events);
  const eventCount = useEventStore((state) => state.eventCount);
  
  return useMemo(() => {
    return selectUserMessageCounts({ events } as EventStoreState);
  }, [events, eventCount]);
}

/**
 * Hook to get filtered events based on PoW settings
 */
export function useFilteredEvents(powEnabled: boolean, powDifficulty: number): StoredEvent[] {
  const events = useEventStore((state) => state.events);
  const eventCount = useEventStore((state) => state.eventCount);
  
  return useMemo(() => {
    return selectFilteredEvents({ events } as EventStoreState, powEnabled, powDifficulty);
  }, [events, eventCount, powEnabled, powDifficulty]);
}

/**
 * Hook to get geohash activity
 */
export function useGeohashActivity(): Map<string, GeohashActivity> {
  const geohashStats = useEventStore((state) => state.geohashStats);
  const eventCount = useEventStore((state) => state.eventCount);
  
  return useMemo(() => {
    return selectGeohashActivity({ geohashStats } as EventStoreState);
  }, [geohashStats, eventCount]);
}

/**
 * Hook to get store connection state
 */
export function useEventStoreConnection() {
  const isConnected = useEventStore((state) => state.isConnected);
  const isLoading = useEventStore((state) => state.isLoading);
  const error = useEventStore((state) => state.error);
  const eventCount = useEventStore((state) => state.eventCount);
  const lastUpdate = useEventStore((state) => state.lastUpdate);
  
  return { isConnected, isLoading, error, eventCount, lastUpdate };
}

/**
 * Hook to get latest event timestamp by channel
 */
export function useLatestEventByChannel(): Record<string, number> {
  const events = useEventStore((state) => state.events);
  
  return useMemo(() => {
    return selectLatestEventByChannel({ events } as EventStoreState);
  }, [events]);
}

