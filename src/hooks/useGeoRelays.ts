/**
 * useGeoRelays Hook
 * 
 * React hook wrapper for GeoRelayConnectionManager.
 * Provides a simple interface for components to interact with georelay connections.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  GeoRelayConnectionManager, 
  ConnectionState, 
  GeoRelayEvent,
  geoRelayManager 
} from '@/services/geoRelayConnectionManager';
import { 
  useEventStore, 
  useAllEvents, 
  useEventsByGeohash, 
  useGeohashActivity,
  StoredEvent,
} from '@/stores';
import { NostrEvent, GeohashActivity } from '@/types';
import type { Event as NostrEventOriginal } from "nostr-tools";

// Re-export types from store for backwards compatibility
export type { GeohashStats } from '@/stores';

// Helper to extract tag value from event tags
export const getTagValue = (event: NostrEventOriginal, tagName: string): string | null => {
  const tag = event.tags.find((tag: string[]) => tag[0] === tagName);
  return tag ? (tag[1] || null) : null;
};

export interface UseGeoRelaysOptions {
  /** Primary geohash from search (in:[geohash]) */
  primaryGeohash?: string;
  /** Secondary geohashes for exploration (e.g., country geohashes) */
  secondaryGeohashes?: string[];
  /** Callback when a geohash should animate (new event received) */
  onGeohashAnimate?: (geohash: string) => void;
}

export interface UseGeoRelaysResult {
  // Connection state
  isConnected: boolean;
  connectionState: ConnectionState;
  
  // Events (from central store)
  events: NostrEvent[];
  allStoredEvents: NostrEvent[];
  allEventsByGeohash: Map<string, number>;
  geohashActivity: Map<string, GeohashActivity>;
  geohashStats: Map<string, { geohash: string; lastActivity: number; eventCount: number; totalEvents: number }>;
  
  // Actions
  setPrimaryGeohash: (geohash: string | null) => Promise<void>;
  setSecondaryGeohashes: (geohashes: string[]) => Promise<void>;
  clearSecondaryGeohashes: () => Promise<void>;
  
  // Connection info for UI (backwards compatible)
  connectionInfo: {
    relays: Array<{
      url: string;
      geohash: string;
      type: 'local';
      isConnected: boolean;
    }>;
    status: string;
    isEnabled: boolean;
    isConnected: boolean;
    totalConnected: number;
    totalConfigured: number;
  };
  
  // Legacy compatibility
  nostrEnabled: boolean;
  toggleNostr: () => Promise<void>;
}

export function useGeoRelays(options: UseGeoRelaysOptions = {}): UseGeoRelaysResult {
  const { primaryGeohash, secondaryGeohashes, onGeohashAnimate } = options;
  
  // Connection state
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    totalConnections: 0,
    maxConnections: 15,
    primaryGeohash: null,
    secondaryGeohashes: [],
    relays: [],
    eventCount: 0,
  });
  
  // Track if manager is initialized
  const initializedRef = useRef(false);
  const managerRef = useRef<GeoRelayConnectionManager>(geoRelayManager);
  
  // Subscribe to store changes for re-renders
  const allEvents = useAllEvents();
  const allEventsByGeohash = useEventsByGeohash();
  const geohashActivity = useGeohashActivity();
  
  // State change callback
  const handleStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
  }, []);
  
  // Event callback (for animations)
  const handleEvent = useCallback((event: GeoRelayEvent) => {
    // Events are already handled by the manager and stored in the event store
    // This callback is for additional side effects if needed
  }, []);
  
  // Initialize manager on mount
  useEffect(() => {
    if (!initializedRef.current) {
      managerRef.current.initialize({
        onStateChange: handleStateChange,
        onEvent: handleEvent,
        onGeohashAnimate,
      });
      initializedRef.current = true;
    }
    
    // Update animation callback when it changes
    return () => {
      // Don't cleanup on unmount - manager is a singleton
    };
  }, [handleStateChange, handleEvent, onGeohashAnimate]);
  
  // Update primary geohash when it changes
  useEffect(() => {
    if (initializedRef.current) {
      managerRef.current.setPrimaryGeohash(primaryGeohash || null);
    }
  }, [primaryGeohash]);
  
  // Update secondary geohashes when they change
  useEffect(() => {
    if (initializedRef.current && secondaryGeohashes) {
      managerRef.current.setSecondaryGeohashes(secondaryGeohashes);
    }
  }, [secondaryGeohashes]);
  
  // Action handlers
  const setPrimaryGeohash = useCallback(async (geohash: string | null) => {
    await managerRef.current.setPrimaryGeohash(geohash);
  }, []);
  
  const setSecondaryGeohashes = useCallback(async (geohashes: string[]) => {
    await managerRef.current.setSecondaryGeohashes(geohashes);
  }, []);
  
  const clearSecondaryGeohashes = useCallback(async () => {
    await managerRef.current.clearSecondaryGeohashes();
  }, []);
  
  // Legacy toggle (noop for now - always enabled)
  const toggleNostr = useCallback(async () => {
    // The new manager is always enabled when initialized
    // This is kept for backwards compatibility
  }, []);
  
  // Convert stored events to NostrEvent format for backwards compatibility
  const events: NostrEvent[] = useMemo(() => 
    allEvents.map(se => ({
      ...se.event,
      relayUrl: se.relay,
    } as NostrEvent)), 
  [allEvents]);
  
  // Build connection info for UI (backwards compatible format)
  const connectionInfo = useMemo(() => {
    const connectedCount = connectionState.relays.filter(r => r.status === 'connected').length;
    
    return {
      relays: connectionState.relays.map(relay => ({
        url: relay.url,
        geohash: relay.geohashes[0] || '',
        type: 'local' as const,
        isConnected: relay.status === 'connected',
      })),
      status: connectionState.isConnected 
        ? `Connected to ${connectedCount}/${connectionState.totalConnections} relays`
        : 'Connecting...',
      isEnabled: true,
      isConnected: connectionState.isConnected,
      totalConnected: connectedCount,
      totalConfigured: connectionState.totalConnections,
    };
  }, [connectionState]);
  
  return {
    // Connection state
    isConnected: connectionState.isConnected,
    connectionState,
    
    // Events from store
    events,
    allStoredEvents: events,
    allEventsByGeohash,
    geohashActivity,
    geohashStats: useEventStore.getState().geohashStats,
    
    // Actions
    setPrimaryGeohash,
    setSecondaryGeohashes,
    clearSecondaryGeohashes,
    
    // Connection info
    connectionInfo,
    
    // Legacy compatibility
    nostrEnabled: true,
    toggleNostr,
  };
}

/**
 * Hook for globe/map views that need to manage secondary geohashes
 */
export function useGeoRelaysForExploration() {
  const manager = geoRelayManager;
  
  const setCountryGeohashes = useCallback(async (
    countryCode: string,
    geohashes: string[]
  ) => {
    console.log(`[useGeoRelaysForExploration] Setting ${geohashes.length} geohashes for ${countryCode}`);
    await manager.setSecondaryGeohashes(geohashes);
  }, [manager]);
  
  const clearExploration = useCallback(async () => {
    await manager.clearSecondaryGeohashes();
  }, [manager]);
  
  return {
    setCountryGeohashes,
    clearExploration,
    getState: () => manager.getState(),
  };
}

