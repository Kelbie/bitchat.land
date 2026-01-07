/**
 * Unified Event Store
 * 
 * Single source of truth for all Nostr events in the application.
 * Consolidates events from:
 * - Server WebSocket (/ws)
 * - Server REST API (/api/events)
 * - Direct relay connections
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

// Event types matching the existing interfaces
export interface ServerEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface StoredEvent {
  event: ServerEvent;
  geohash: string;
  relay: string;
  receivedAt: number;
}

// Geohash stats for tracking activity
export interface GeohashStats {
  geohash: string;
  lastActivity: number;
  eventCount: number;
  totalEvents: number;
}

// Connection state
export interface ConnectionState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

// Store state interface
interface EventStoreState {
  // Core event storage
  events: Map<string, StoredEvent>;
  
  // Geohash statistics (hierarchical counts)
  geohashStats: Map<string, GeohashStats>;
  
  // Connection state
  isConnected: boolean;
  isLoading: boolean;
  lastUpdate: Date | null;
  error: string | null;
  
  // Event count (convenience)
  eventCount: number;
}

// Store actions interface
interface EventStoreActions {
  // Event management
  addEvent: (event: StoredEvent) => void;
  addEvents: (events: StoredEvent[]) => void;
  
  // Connection state
  setConnected: (connected: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Utilities
  clear: () => void;
  getEventsByGeohash: (geohashPrefix: string) => StoredEvent[];
  getHierarchicalEventCount: (targetGeohash: string) => number;
}

type EventStore = EventStoreState & EventStoreActions;

// Valid geohash characters (base32 without 'a', 'i', 'l', 'o')
const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i;

/**
 * Extract geohash from event tags
 */
function getGeohashFromEvent(event: ServerEvent): string | null {
  const gTag = event.tags.find(tag => tag[0] === 'g');
  return gTag ? gTag[1]?.toLowerCase() : null;
}

/**
 * Extract channel/group from event tags
 */
function getChannelFromEvent(event: ServerEvent): string | null {
  const dTag = event.tags.find(tag => tag[0] === 'd');
  return dTag ? dTag[1]?.toLowerCase() : null;
}

/**
 * Update geohash stats when a new event is added
 */
function updateGeohashStats(
  stats: Map<string, GeohashStats>,
  event: ServerEvent,
  storedEvent: StoredEvent
): Map<string, GeohashStats> {
  const newStats = new Map(stats);
  const eventGeohash = getGeohashFromEvent(event);
  const eventGroup = getChannelFromEvent(event);
  
  const locationIdentifier = eventGeohash || eventGroup;
  if (!locationIdentifier) return newStats;
  
  // Validate geohash for kind 20000
  if (event.kind === 20000 && eventGeohash) {
    if (!VALID_GEOHASH_CHARS.test(eventGeohash)) {
      return newStats;
    }
  }
  
  // Update stats for the location identifier
  const current = newStats.get(locationIdentifier) || {
    geohash: locationIdentifier,
    lastActivity: 0,
    eventCount: 0,
    totalEvents: 0,
  };
  
  newStats.set(locationIdentifier, {
    ...current,
    lastActivity: storedEvent.receivedAt,
    eventCount: current.eventCount + 1,
    totalEvents: current.totalEvents + 1,
  });
  
  return newStats;
}

/**
 * Create the Zustand event store
 */
export const useEventStore = create<EventStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    events: new Map(),
    geohashStats: new Map(),
    isConnected: false,
    isLoading: false,
    lastUpdate: null,
    error: null,
    eventCount: 0,

    // Add a single event
    addEvent: (storedEvent: StoredEvent) => {
      const { events, geohashStats } = get();
      
      // Deduplicate
      if (events.has(storedEvent.event.id)) {
        return;
      }
      
      const newEvents = new Map(events);
      newEvents.set(storedEvent.event.id, storedEvent);
      
      const newStats = updateGeohashStats(geohashStats, storedEvent.event, storedEvent);
      
      set({
        events: newEvents,
        geohashStats: newStats,
        eventCount: newEvents.size,
        lastUpdate: new Date(),
      });
    },

    // Add multiple events (batch)
    addEvents: (newStoredEvents: StoredEvent[]) => {
      const { events, geohashStats } = get();
      
      const updatedEvents = new Map(events);
      let updatedStats = new Map(geohashStats);
      let added = 0;
      
      for (const storedEvent of newStoredEvents) {
        if (!updatedEvents.has(storedEvent.event.id)) {
          updatedEvents.set(storedEvent.event.id, storedEvent);
          updatedStats = updateGeohashStats(updatedStats, storedEvent.event, storedEvent);
          added++;
        }
      }
      
      if (added > 0) {
        set({
          events: updatedEvents,
          geohashStats: updatedStats,
          eventCount: updatedEvents.size,
          lastUpdate: new Date(),
        });
      }
    },

    // Connection state setters
    setConnected: (connected: boolean) => set({ isConnected: connected }),
    setLoading: (loading: boolean) => set({ isLoading: loading }),
    setError: (error: string | null) => set({ error }),

    // Clear all events
    clear: () => set({
      events: new Map(),
      geohashStats: new Map(),
      eventCount: 0,
    }),

    // Get events filtered by geohash prefix
    getEventsByGeohash: (geohashPrefix: string): StoredEvent[] => {
      const { events } = get();
      return Array.from(events.values())
        .filter(e => e.geohash.startsWith(geohashPrefix))
        .sort((a, b) => b.event.created_at - a.event.created_at);
    },

    // Get hierarchical event count for a geohash
    getHierarchicalEventCount: (targetGeohash: string): number => {
      const { geohashStats } = get();
      let totalCount = 0;
      
      geohashStats.forEach((stats, eventGeohash) => {
        if (eventGeohash.startsWith(targetGeohash)) {
          totalCount += stats.totalEvents;
        }
      });
      
      return totalCount;
    },
  }))
);

// Export store instance for non-React usage
export const eventStore = useEventStore;

// Export types
export type { EventStore, EventStoreState, EventStoreActions };

