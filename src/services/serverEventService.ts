/**
 * Server Event Service
 * 
 * Client-side service that:
 * - Fetches initial events from server REST API
 * - Maintains WebSocket connection for live updates
 * - Pushes events to the centralized Zustand store
 * 
 * Now uses useEventStore as the single source of truth for events.
 */

import { useEventStore, StoredEvent, ServerEvent } from '@/stores';

// Re-export types for backwards compatibility
export type { ServerEvent, StoredEvent };

export interface ServerEventServiceState {
  isConnected: boolean;
  isLoading: boolean;
  eventCount: number;
  lastUpdate: Date | null;
  error: string | null;
}

type StateCallback = (state: ServerEventServiceState) => void;
type EventCallback = (event: StoredEvent) => void;

class ServerEventService {
  private static instance: ServerEventService;
  
  private ws: WebSocket | null = null;
  private stateCallbacks: Set<StateCallback> = new Set();
  private eventCallbacks: Set<EventCallback> = new Set();
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;

  // Configuration
  private readonly baseUrl: string;
  private readonly wsUrl: string;
  private readonly maxReconnectAttempts = 10;
  private readonly reconnectBaseDelay = 1000;
  private readonly reconnectMaxDelay = 30000;

  private constructor() {
    // Determine URLs based on environment
    if (typeof window !== 'undefined') {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      this.baseUrl = `${window.location.protocol}//${host}`;
      this.wsUrl = `${protocol}//${host}/ws`;
    } else {
      // Fallback for non-browser environments
      this.baseUrl = 'http://localhost:3000';
      this.wsUrl = 'ws://localhost:3000/ws';
    }
    
    // Note: We don't subscribe to store changes here to avoid infinite loops.
    // Components should use the store hooks directly for reactive updates.
  }

  static get shared(): ServerEventService {
    if (!ServerEventService.instance) {
      ServerEventService.instance = new ServerEventService();
    }
    return ServerEventService.instance;
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(callback: StateCallback): () => void {
    this.stateCallbacks.add(callback);
    callback(this.getState());
    return () => this.stateCallbacks.delete(callback);
  }

  /**
   * Subscribe to new events
   */
  onEvent(callback: EventCallback): () => void {
    this.eventCallbacks.add(callback);
    return () => this.eventCallbacks.delete(callback);
  }

  /**
   * Get current state from the store
   */
  getState(): ServerEventServiceState {
    const storeState = useEventStore.getState();
    return {
      isConnected: storeState.isConnected,
      isLoading: storeState.isLoading,
      eventCount: storeState.eventCount,
      lastUpdate: storeState.lastUpdate,
      error: storeState.error,
    };
  }

  /**
   * Get all cached events from the store
   */
  getEvents(): StoredEvent[] {
    const { events } = useEventStore.getState();
    return Array.from(events.values())
      .sort((a, b) => b.event.created_at - a.event.created_at);
  }

  /**
   * Get events filtered by geohash prefix
   */
  getEventsByGeohash(geohashPrefix: string): StoredEvent[] {
    return useEventStore.getState().getEventsByGeohash(geohashPrefix);
  }

  private notifyStateChange(state: ServerEventServiceState): void {
    this.stateCallbacks.forEach(cb => cb(state));
  }

  private notifyEvent(event: StoredEvent): void {
    this.eventCallbacks.forEach(cb => cb(event));
  }

  /**
   * Fetch initial events from server
   */
  async fetchInitialEvents(): Promise<StoredEvent[]> {
    const store = useEventStore.getState();
    store.setLoading(true);
    store.setError(null);

    try {
      const response = await fetch(`${this.baseUrl}/api/events`, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const events: StoredEvent[] = data.events || [];

      // Add all events to the store
      store.addEvents(events);

      store.setLoading(false);

      console.log(`[ServerEventService] Fetched ${events.length} initial events`);
      return events;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('[ServerEventService] Fetch error:', errorMessage);
      
      const store = useEventStore.getState();
      store.setLoading(false);
      store.setError(errorMessage);

      return [];
    }
  }

  /**
   * Connect WebSocket for live updates
   */
  connectWebSocket(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    console.log('[ServerEventService] Connecting WebSocket...');
    
    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.onopen = () => {
        console.log('[ServerEventService] WebSocket connected');
        this.reconnectAttempts = 0;
        const store = useEventStore.getState();
        store.setConnected(true);
        store.setError(null);
      };

      this.ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          
          if (data.type === 'event' && data.data) {
            const storedEvent: StoredEvent = {
              event: data.data.event,
              geohash: data.data.geohash || '',
              relay: data.data.relay || '',
              receivedAt: data.data.receivedAt || Date.now(),
            };

            // Add to store (handles deduplication)
            const store = useEventStore.getState();
            const previousCount = store.eventCount;
            store.addEvent(storedEvent);
            
            // Notify event callbacks if it was a new event
            if (store.eventCount > previousCount) {
              this.notifyEvent(storedEvent);
            }
          }
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onerror = (err) => {
        console.error('[ServerEventService] WebSocket error:', err);
      };

      this.ws.onclose = () => {
        console.log('[ServerEventService] WebSocket disconnected');
        useEventStore.getState().setConnected(false);
        this.scheduleReconnect();
      };

    } catch (err) {
      console.error('[ServerEventService] WebSocket connection failed:', err);
      this.scheduleReconnect();
    }
  }

  /**
   * Schedule WebSocket reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[ServerEventService] Max reconnection attempts reached');
      useEventStore.getState().setError('Connection failed after multiple attempts');
      return;
    }

    const delay = Math.min(
      this.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts),
      this.reconnectMaxDelay
    );

    this.reconnectAttempts++;
    console.log(`[ServerEventService] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connectWebSocket();
    }, delay);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    useEventStore.getState().setConnected(false);
  }

  /**
   * Initialize: fetch initial events and connect WebSocket
   */
  async initialize(): Promise<StoredEvent[]> {
    const events = await this.fetchInitialEvents();
    this.connectWebSocket();
    return events;
  }

  /**
   * Merge events from another source (e.g., live country search)
   */
  mergeEvents(newEvents: StoredEvent[]): void {
    useEventStore.getState().addEvents(newEvents);
  }

  /**
   * Clear all cached events
   */
  clear(): void {
    useEventStore.getState().clear();
  }
}

export const serverEventService = ServerEventService.shared;
export default ServerEventService;
