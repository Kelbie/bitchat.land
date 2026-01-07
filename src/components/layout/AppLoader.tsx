import React, { useState, useEffect, ReactNode } from 'react';
import { serverEventService, ServerEventServiceState, StoredEvent } from '@/services/serverEventService';
import { LoadingScreen } from './LoadingScreen';
import type { PrefetchProgress } from '@/services/prefetchService';

interface AppLoaderProps {
  children: ReactNode;
  theme?: 'matrix' | 'material';
  /** Minimum time to show loading screen (ms) for UX */
  minLoadingTime?: number;
  /** Skip loading and go directly to app */
  skipLoading?: boolean;
}

/**
 * AppLoader wraps the main application and handles:
 * 1. Fetching initial events from server
 * 2. Connecting WebSocket for live updates
 * 3. Showing a loading animation during initial fetch
 */
const AppLoader: React.FC<AppLoaderProps> = ({
  children,
  theme = 'matrix',
  minLoadingTime = 1500, // Shorter since server fetch is faster
  skipLoading = false,
}) => {
  const [isLoading, setIsLoading] = useState(!skipLoading);
  const [serverState, setServerState] = useState<ServerEventServiceState>({
    isConnected: false,
    isLoading: true,
    eventCount: 0,
    lastUpdate: null,
    error: null,
  });
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);
  const [fetchComplete, setFetchComplete] = useState(false);

  // Convert server state to progress format for LoadingScreen compatibility
  const progress: PrefetchProgress = {
    phase: serverState.error 
      ? 'error' 
      : serverState.isLoading 
        ? 'fetching' 
        : fetchComplete 
          ? 'complete' 
          : 'connecting',
    totalRelays: 0, // Not applicable for server mode
    connectedRelays: serverState.isConnected ? 1 : 0,
    eventsReceived: serverState.eventCount,
    currentRelay: serverState.isConnected ? 'Server WebSocket' : null,
    startedAt: new Date(),
    completedAt: fetchComplete ? new Date() : null,
    errorMessage: serverState.error,
    // New fields for geohash tracking (from updated PrefetchProgress)
    totalGeohashes: 0,
    completedGeohashes: 0,
    currentGeohash: null,
    uniqueRelaysQueried: 0,
    eventsPerGeohash: new Map(),
  };

  // Start the minimum loading time timer
  useEffect(() => {
    if (skipLoading) {
      setMinTimeElapsed(true);
      return;
    }

    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minLoadingTime);

    return () => clearTimeout(timer);
  }, [minLoadingTime, skipLoading]);

  // Subscribe to server state changes
  useEffect(() => {
    if (skipLoading) return;

    const unsubState = serverEventService.onStateChange((state) => {
      setServerState(state);
    });

    return () => {
      unsubState();
    };
  }, [skipLoading]);

  // Initialize server connection on mount
  useEffect(() => {
    if (skipLoading) return;

    // Start fetching and connect WebSocket
    serverEventService.initialize()
      .then((events) => {
        console.log(`[AppLoader] Loaded ${events.length} initial events from server`);
        // Store events in window for access by components (backwards compatibility)
        (window as unknown as { __serverEvents?: StoredEvent[] }).__serverEvents = events;
        setFetchComplete(true);
      })
      .catch((error) => {
        console.error('[AppLoader] Server initialization failed:', error);
        // Still mark as complete so app can load (may work without prefetch)
        setFetchComplete(true);
      });

    // Cleanup on unmount
    return () => {
      // Don't disconnect - keep WebSocket alive for the app
    };
  }, [skipLoading]);

  // Determine when to show the main app
  useEffect(() => {
    if (skipLoading) {
      setIsLoading(false);
      return;
    }

    // Show app when fetch is complete and minimum time has elapsed
    if (fetchComplete && minTimeElapsed) {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [fetchComplete, minTimeElapsed, skipLoading]);

  // Show loading screen
  if (isLoading) {
    return <LoadingScreen progress={progress} theme={theme} />;
  }

  // Render the main app
  return <>{children}</>;
};

/**
 * Hook to access server events from within the app
 */
export function useServerEvents(): StoredEvent[] {
  const [events, setEvents] = useState<StoredEvent[]>(() => {
    // Try to get from window first (for immediate access)
    const windowEvents = (window as unknown as { __serverEvents?: StoredEvent[] }).__serverEvents;
    if (windowEvents) return windowEvents;
    
    // Otherwise get from service
    return serverEventService.getEvents();
  });

  useEffect(() => {
    // Subscribe to new events
    const unsub = serverEventService.onEvent(() => {
      setEvents(serverEventService.getEvents());
    });
    return unsub;
  }, []);

  return events;
}

/**
 * Hook to check server connection status
 */
export function useServerStatus() {
  const [status, setStatus] = useState<ServerEventServiceState>(serverEventService.getState());

  useEffect(() => {
    const unsub = serverEventService.onStateChange(setStatus);
    return unsub;
  }, []);

  return status;
}

// Legacy exports for backwards compatibility
export function usePrefetchedEvents(): StoredEvent[] {
  return useServerEvents();
}

export function usePrefetchStatus() {
  const serverStatus = useServerStatus();
  // Convert to legacy format
  return {
    phase: serverStatus.isLoading ? 'fetching' : 'complete',
    eventsReceived: serverStatus.eventCount,
    isComplete: !serverStatus.isLoading,
  };
}

export default AppLoader;
export { AppLoader };
