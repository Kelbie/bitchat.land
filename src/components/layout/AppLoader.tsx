import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { prefetchService, PrefetchProgress, PrefetchedEvent } from '@/services/prefetchService';
import { LoadingScreen } from './LoadingScreen';

interface AppLoaderProps {
  children: ReactNode;
  theme?: 'matrix' | 'material';
  /** Minimum time to show loading screen (ms) for UX */
  minLoadingTime?: number;
  /** Skip prefetch and go directly to app */
  skipPrefetch?: boolean;
}

/**
 * AppLoader wraps the main application and handles:
 * 1. Prefetching events from georelays on initial load
 * 2. Showing a loading animation during prefetch
 * 3. Exposing prefetched events to the app via context or callbacks
 */
const AppLoader: React.FC<AppLoaderProps> = ({
  children,
  theme = 'matrix',
  minLoadingTime = 2000,
  skipPrefetch = false,
}) => {
  const [isLoading, setIsLoading] = useState(!skipPrefetch);
  const [progress, setProgress] = useState<PrefetchProgress>({
    phase: 'initializing',
    totalRelays: 0,
    connectedRelays: 0,
    eventsReceived: 0,
    currentRelay: null,
    startedAt: null,
    completedAt: null,
    errorMessage: null,
  });
  const [prefetchedEvents, setPrefetchedEvents] = useState<PrefetchedEvent[]>([]);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Start the minimum loading time timer
  useEffect(() => {
    if (skipPrefetch) {
      setMinTimeElapsed(true);
      return;
    }

    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minLoadingTime);

    return () => clearTimeout(timer);
  }, [minLoadingTime, skipPrefetch]);

  // Subscribe to prefetch progress
  useEffect(() => {
    if (skipPrefetch) return;

    const unsubProgress = prefetchService.onProgress((p) => {
      setProgress(p);
    });

    const unsubComplete = prefetchService.onComplete((events) => {
      setPrefetchedEvents(events);
      // Store events in window for access by useNostr
      (window as unknown as { __prefetchedEvents?: PrefetchedEvent[] }).__prefetchedEvents = events;
    });

    return () => {
      unsubProgress();
      unsubComplete();
    };
  }, [skipPrefetch]);

  // Start prefetch on mount
  useEffect(() => {
    if (skipPrefetch) return;

    // Check if already prefetched
    if (prefetchService.isComplete()) {
      const events = prefetchService.getEvents();
      setPrefetchedEvents(events);
      (window as unknown as { __prefetchedEvents?: PrefetchedEvent[] }).__prefetchedEvents = events;
      setProgress(prefetchService.getProgress());
      return;
    }

    // Start prefetch - wait for EOSE from all relays
    prefetchService.prefetch({
      maxRelays: 50, // Limit for performance
      timeoutMs: 60000, // 60 second timeout to allow all relays to respond
      sinceDurationSec: 86400, // 24 hours of events
    }).catch((error) => {
      console.error('Prefetch failed:', error);
    });
  }, [skipPrefetch]);

  // Determine when to show the main app
  useEffect(() => {
    if (skipPrefetch) {
      setIsLoading(false);
      return;
    }

    const isComplete = progress.phase === 'complete' || progress.phase === 'error';
    
    if (isComplete && minTimeElapsed) {
      // Small delay for smooth transition
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [progress.phase, minTimeElapsed, skipPrefetch]);

  // Show loading screen
  if (isLoading) {
    return <LoadingScreen progress={progress} theme={theme} />;
  }

  // Render the main app
  return <>{children}</>;
};

/**
 * Hook to access prefetched events from within the app
 */
export function usePrefetchedEvents(): PrefetchedEvent[] {
  const [events, setEvents] = useState<PrefetchedEvent[]>(() => {
    // Try to get from window first (for immediate access)
    const windowEvents = (window as unknown as { __prefetchedEvents?: PrefetchedEvent[] }).__prefetchedEvents;
    if (windowEvents) return windowEvents;
    
    // Otherwise get from service
    return prefetchService.getEvents();
  });

  useEffect(() => {
    // Subscribe to complete event for any late updates
    const unsub = prefetchService.onComplete((newEvents) => {
      setEvents(newEvents);
    });
    return unsub;
  }, []);

  return events;
}

/**
 * Hook to check prefetch status
 */
export function usePrefetchStatus() {
  const [status, setStatus] = useState<PrefetchProgress>(prefetchService.getProgress());

  useEffect(() => {
    const unsub = prefetchService.onProgress(setStatus);
    return unsub;
  }, []);

  return status;
}

export default AppLoader;
export { AppLoader };

