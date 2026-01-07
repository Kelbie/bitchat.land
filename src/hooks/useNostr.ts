import { useState, useRef, useEffect, useCallback } from "react";
import { RelayPool } from "nostr-relaypool";
import type { Event as NostrEventOriginal } from "nostr-tools";
import { NostrEvent, GeohashActivity } from "@/types";
import { NOSTR_RELAYS } from "@/constants/projections";
import { findMatchingGeohash } from "@/utils/geohashUtils";
import { GeoRelayDirectory } from "@/utils/geoRelayDirectory";
import { prefetchService, PrefetchedEvent } from "@/services/prefetchService";

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
  totalEvents: number;
}

// New interfaces for DM support
interface DirectMessage {
  id: string;
  content: string;
  senderPubkey: string;
  recipientPubkey: string;
  timestamp: number;
  conversationKey: string;
  messageType: 'privateMessage' | 'delivered' | 'readReceipt';
  relayUrl?: string;
}

interface ConversationStats {
  conversationKey: string;
  lastActivity: number;
  messageCount: number;
  unreadCount: number;
  senderPubkey: string; // Full pubkey for the conversation
}

// Mock identity interface - you'll need to implement actual key derivation
interface NostrIdentity {
  publicKeyHex: string;
  privateKeyHex: string;
  // Add methods for encryption/decryption as needed
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
  
  // DM-related state
  private _directMessages: DirectMessage[] = [];
  private _conversationStats: Map<string, ConversationStats> = new Map();
  private _nostrKeyMapping: Map<string, string> = new Map(); // conversation key -> full pubkey
  private processedNostrEvents: Set<string> = new Set();
  private currentGeohashIdentity: NostrIdentity | null = null;

  // Search parameters
  private searchGeohash: string;
  private currentGeohashes: string[];
  private onGeohashAnimate?: (geohash: string) => void;
  private onStateChange?: () => void;
  private currentChannel: string = "";

  constructor(
    searchGeohash: string = "",
    currentGeohashes: string[] = [],
    onGeohashAnimate?: (geohash: string) => void,
    onStateChange?: () => void,
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
  
  // New getters for DM support
  get directMessages(): DirectMessage[] { return [...this._directMessages]; }
  get conversationStats(): Map<string, ConversationStats> { return new Map(this._conversationStats); }

  // BitChat-compatible getter: allEventsByDirectMessage
  get allEventsByDirectMessage(): Map<string, DirectMessage[]> {
    const messagesByConversation = new Map<string, DirectMessage[]>();
    
    // Group messages by conversation key
    this._directMessages.forEach(message => {
      const existing = messagesByConversation.get(message.conversationKey) || [];
      existing.push(message);
      messagesByConversation.set(message.conversationKey, existing);
    });

    // Sort messages in each conversation by timestamp
    messagesByConversation.forEach((messages, key) => {
      messages.sort((a, b) => a.timestamp - b.timestamp);
      messagesByConversation.set(key, messages);
    });

    return messagesByConversation;
  }

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

    const allGeohashes = Array.from(this._geohashStats.keys());
    const prefixesNeeded = new Set<string>();

    allGeohashes.forEach(geohash => {
      for (let i = 1; i <= geohash.length; i++) {
        prefixesNeeded.add(geohash.substring(0, i));
      }
    });

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

    this.onStateChange?.();
  }

  private createRelayPool(): void {
    if (this.relayPool) {
      this.currentSubscriptions.forEach(unsub => unsub());
      this.currentSubscriptions.clear();
    }

    this.relayPool = new RelayPool([], {
      useEventCache: true,
      logSubscriptions: false,
      deleteSignatures: false,
      skipVerification: false,
      autoReconnect: true,
    });

    this.relayPool.onerror((err: string, relayUrl: string) => {
      console.error("RelayPool error from", relayUrl, ":", err);
      this.relays = this.relays.map(relay =>
        relay.url === relayUrl ? { ...relay, status: 'disconnected' } : relay
      );
      this.updateStatus();
    });

    this.relayPool.onnotice((relayUrl: string, notice: string) => {
      // console.log("RelayPool notice from", relayUrl, ":", notice);
    });
  }

  private getInitialRelays(): RelayInfo[] {
    const initialRelays: RelayInfo[] = [];

    for (const url of NOSTR_RELAYS) {
      initialRelays.push({
        url,
        geohash: "",
        status: 'connecting',
        lastPing: Date.now(),
        type: 'initial'
      });
    }

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

    // Close existing subscriptions
    const mainSub = this.currentSubscriptions.get('main');
    if (mainSub) {
      mainSub();
      this.currentSubscriptions.delete('main');
    }

    const dmSub = this.currentSubscriptions.get('dms');
    if (dmSub) {
      dmSub();
      this.currentSubscriptions.delete('dms');
    }

    // Create subscription for geohash and group events
    const unsubscribeMain = this.relayPool.subscribe(
      [{
        kinds: [20000, 23333], 
        since: Math.floor(Date.now() / 1000) - (24 * 60 * 60) // 24 hour lookback
      }],
      relays,
      (event: NostrEventOriginal, isAfterEose: boolean, relayURL?: string) => {
        this.handleEvent(event, isAfterEose, relayURL);
      },
      undefined,
      (relayURL: string) => {
        this.relays = this.relays.map(relay =>
          relay.url === relayURL ? { ...relay, status: 'connected' } : relay
        );
        this.updateStatus();
      },
      {
        allowDuplicateEvents: false,
        allowOlderEvents: true,
        logAllEvents: false,
        unsubscribeOnEose: false,
      }
    );

    this.currentSubscriptions.set('main', unsubscribeMain);

    // Create DM subscription if we have an identity for the current geohash
    if (this.currentGeohashIdentity) {
      this.createDMSubscription(relays);
    }
  }

  private createDMSubscription(relays: string[]): void {
    if (!this.relayPool || !this.currentGeohashIdentity) return;

    // Subscribe to NIP-17 gift-wrapped messages (kind 1059)
    const unsubscribeDM = this.relayPool.subscribe(
      [{
        kinds: [1059], // NIP-17 gift wrap
        "#p": [this.currentGeohashIdentity.publicKeyHex],
        since: Math.floor(Date.now() / 1000) - (24 * 60 * 60) // 24 hour lookback
      }],
      relays,
      (event: NostrEventOriginal, isAfterEose: boolean, relayURL?: string) => {
        this.handleGiftWrap(event, relayURL);
      },
      undefined,
      undefined,
      {
        allowDuplicateEvents: false,
        allowOlderEvents: true,
        logAllEvents: false,
        unsubscribeOnEose: false,
      }
    );

    this.currentSubscriptions.set('dms', unsubscribeDM);
  }

  private handleGiftWrap(giftWrap: NostrEventOriginal, relayURL?: string): void {
    // Check for duplicates
    if (this.processedNostrEvents.has(giftWrap.id)) {
      return;
    }
    this.processedNostrEvents.add(giftWrap.id);

    // TODO: Implement NIP-17 decryption here
    // This is a simplified version - you'll need to implement actual decryption
    try {
      const decryptedResult = this.decryptGiftWrap(giftWrap);
      if (!decryptedResult) return;

      const { content, senderPubkey, timestamp } = decryptedResult;

      // Check if content contains BitChat packet
      if (!content.startsWith("bitchat1:")) {
        return;
      }

      // Extract and decode BitChat packet
      const packetData = content.substring("bitchat1:".length);
      const decodedPacket = this.decodeBitchatPacket(packetData);
      if (!decodedPacket) return;

      // Create conversation key (similar to BitChat iOS implementation)
      const convKey = "nostr_" + senderPubkey.substring(0, 16);
      this._nostrKeyMapping.set(convKey, senderPubkey);

      // Create direct message
      const directMessage: DirectMessage = {
        id: giftWrap.id,
        content: decodedPacket.content,
        senderPubkey,
        recipientPubkey: this.currentGeohashIdentity!.publicKeyHex,
        timestamp,
        conversationKey: convKey,
        messageType: this.getMessageType(decodedPacket.type),
        relayUrl: relayURL
      };

      // Add to messages array (avoid duplicates)
      if (!this._directMessages.some(msg => msg.id === directMessage.id)) {
        this._directMessages = [directMessage, ...this._directMessages];
      }

      // Update conversation stats
      this.updateConversationStats(convKey, senderPubkey, timestamp);

      // Trigger re-render
      this.onStateChange?.();

    } catch (error) {
      console.warn("Failed to process gift wrap:", error);
    }
  }

  private decryptGiftWrap(giftWrap: NostrEventOriginal): { content: string; senderPubkey: string; timestamp: number } | null {
    // TODO: Implement actual NIP-17 decryption
    // This is a placeholder - you need to implement:
    // 1. Unwrap the outer gift wrap layer
    // 2. Decrypt the inner seal layer  
    // 3. Extract the rumor content
    
    // For now, returning null to indicate decryption not implemented
    console.warn("Gift wrap decryption not yet implemented");
    return null;
  }

  private decodeBitchatPacket(packetData: string): { content: string; type: string } | null {
    try {
      // TODO: Implement base64URL decoding and BitChatPacket parsing
      // This should match the iOS implementation's packet format
      
      // Placeholder implementation
      const decoded = atob(packetData.replace(/-/g, '+').replace(/_/g, '/'));
      // Parse the decoded packet according to BitChat format
      
      return null; // Placeholder
    } catch (error) {
      console.warn("Failed to decode BitChat packet:", error);
      return null;
    }
  }

  private getMessageType(packetType: string): 'privateMessage' | 'delivered' | 'readReceipt' {
    // Map BitChat packet types to message types
    switch (packetType) {
      case 'delivered':
        return 'delivered';
      case 'readReceipt':
        return 'readReceipt';
      default:
        return 'privateMessage';
    }
  }

  private updateConversationStats(convKey: string, senderPubkey: string, timestamp: number): void {
    const existing = this._conversationStats.get(convKey);
    
    if (existing) {
      this._conversationStats.set(convKey, {
        ...existing,
        lastActivity: Math.max(existing.lastActivity, timestamp),
        messageCount: existing.messageCount + 1,
        unreadCount: existing.unreadCount + 1 // Simplified - you may want more sophisticated unread tracking
      });
    } else {
      this._conversationStats.set(convKey, {
        conversationKey: convKey,
        lastActivity: timestamp,
        messageCount: 1,
        unreadCount: 1,
        senderPubkey
      });
    }
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

  // Method to set the identity for DM decryption
  setGeohashIdentity(identity: NostrIdentity | null): void {
    this.currentGeohashIdentity = identity;
    
    // If we're connected and have an identity, create DM subscription
    if (this._isConnected && identity && this.relayPool) {
      const relayUrls = this.relays.map(r => r.url);
      this.createDMSubscription(relayUrls);
    }
  }

  // Method to mark messages as read for a conversation
  markConversationAsRead(conversationKey: string): void {
    const stats = this._conversationStats.get(conversationKey);
    if (stats) {
      this._conversationStats.set(conversationKey, {
        ...stats,
        unreadCount: 0
      });
      this.onStateChange?.();
    }
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

      // Load prefetched events first
      this.loadPrefetchedEvents();

      const initialRelays = this.getInitialRelays();
      this.relays = initialRelays;
      this.updateStatus();

      const relayUrls = initialRelays.map(r => r.url);
      this.createMainSubscription(relayUrls);

    } catch (error) {
      console.error("Failed to connect to Nostr:", error);
      this.relays = [];
      this._isConnected = false;
      this._status = "Connection failed";
      this.onStateChange?.();
    }
  }

  /**
   * Load prefetched events from the prefetch service into the events array
   */
  private loadPrefetchedEvents(): void {
    try {
      // Check if prefetch service has completed
      if (!prefetchService.isComplete()) {
        return;
      }

      const prefetchedEvents = prefetchService.getEvents();
      
      if (prefetchedEvents.length === 0) {
        return;
      }

      console.log(`Loading ${prefetchedEvents.length} prefetched events`);

      // Process each prefetched event
      for (const prefetched of prefetchedEvents) {
        const event = prefetched.event;
        
        // Skip if already processed
        if (this._events.some(e => e.id === event.id)) {
          continue;
        }

        // Process the event to update stats and add to array
        this.processPrefetchedEvent(event, prefetched.relayUrl);
      }

      this.onStateChange?.();
    } catch (error) {
      console.warn("Failed to load prefetched events:", error);
    }
  }

  /**
   * Process a prefetched event (similar to handleEvent but without animation)
   */
  private processPrefetchedEvent(event: NostrEventOriginal, relayURL: string): void {
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

      // Find matching geohash for activity tracking
      const matchingGeohash = findMatchingGeohash(
        eventGeohash,
        this.searchGeohash,
        this.currentGeohashes
      );

      if (matchingGeohash) {
        const matchingStats = this._geohashStats.get(matchingGeohash) || {
          geohash: matchingGeohash,
          lastActivity: 0,
          eventCount: 0,
          totalEvents: 0
        };

        this._geohashStats.set(matchingGeohash, {
          ...matchingStats,
          lastActivity: event.created_at * 1000,
          eventCount: matchingStats.eventCount + 1,
          totalEvents: eventGeohash === matchingGeohash ?
            matchingStats.totalEvents : matchingStats.totalEvents + 1
        });
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
      this._events.push(enhancedEvent);
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
    this.onStateChange?.();
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

      this.updateStatus();
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
  currentChannel: string = "",
  geohashIdentity?: NostrIdentity // Add identity parameter
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
      forceRerender
    );

    return () => {
      if (connectionRef.current) {
        connectionRef.current.disconnect();
      }
    };
  }, []);

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

  // Update identity when it changes
  useEffect(() => {
    if (connectionRef.current) {
      connectionRef.current.setGeohashIdentity(geohashIdentity || null);
    }
  }, [geohashIdentity]);

  // Simple wrapper functions
  const toggleNostr = async () => {
    if (connectionRef.current) {
      await connectionRef.current.toggle();
    }
  };

  const markConversationAsRead = (conversationKey: string) => {
    if (connectionRef.current) {
      connectionRef.current.markConversationAsRead(conversationKey);
    }
  };

  // Return everything directly from the class
  if (!connectionRef.current) {
    return {
      events: [],
      allStoredEvents: [],
      geohashActivity: new Map(),
      allEventsByGeohash: new Map(),
      // New DM-related returns
      directMessages: [],
      allEventsByDirectMessage: new Map(),
      conversationStats: new Map(),
      markConversationAsRead: () => {},
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
    // Existing data
    events,
    allStoredEvents: events,
    geohashActivity: connection.geohashActivity,
    allEventsByGeohash: connection.allEventsByGeohash,
    geohashStats: connection.geohashStats,

    // New DM-related data - BitChat compatible
    directMessages: connection.directMessages,
    allEventsByDirectMessage: connection.allEventsByDirectMessage,
    conversationStats: connection.conversationStats,
    markConversationAsRead,

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