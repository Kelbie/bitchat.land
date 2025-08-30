import { useState, useRef, useEffect } from "react";
import { SimplePool } from "nostr-tools/pool";
import type { Event, Event as NostrEventOriginal, verifiedSymbol } from "nostr-tools";
import { NostrEvent, GeohashActivity } from "../types";
import { NOSTR_RELAYS } from "../constants/projections";
import { findMatchingGeohash } from "../utils/geohashUtils";
import { GeoRelayDirectory } from "../utils/geoRelayDirectory";

// Valid geohash characters (base32 without 'a', 'i', 'l', 'o')
const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/;

export function useNostr(
  searchGeohash: string,
  currentGeohashes: string[],
  onGeohashAnimate: (geohash: string) => void,
  currentChannel: string = "" // Add currentChannel parameter
) {
  const [connectedRelays, setConnectedRelays] = useState<Array<{url: string, geohash: string}>>([]);
  const [recentEvents, setRecentEvents] = useState<NostrEvent[]>([]);
  const [geohashActivity, setGeohashActivity] = useState<Map<string, GeohashActivity>>(
    new Map()
  );
  const [nostrEnabled, setNostrEnabled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Disconnected");
  const [allStoredEvents, setAllStoredEvents] = useState<NostrEvent[]>([]);
  const [allEventsByGeohash, setAllEventsByGeohash] = useState<Map<string, number>>(
    new Map()
  );

  const poolRef = useRef<SimplePool | null>(null);
  const subRef = useRef<ReturnType<SimplePool['subscribeMany']> | null>(null);
  const statusIntervalRef = useRef<number | null>(null);

  // Single event handler function to avoid duplication
  const handleNostrEvent = (event: NostrEventOriginal) => {
    console.log("Received Nostr event:", event);

    // Extract geohash from 'g' tag and group from 'd' tag
    const geoTag = event.tags.find((tag: string[]) => tag[0] === "g");
    const groupTag = event.tags.find((tag: string[]) => tag[0] === "d");
    const eventGeohash = geoTag ? (geoTag[1] || null) : null;
    const eventGroup = groupTag ? (groupTag[1] || null) : null;

    const eventKind = event.kind as number | undefined;

    // Determine if we should include this event based on kind rules
    // kind 20000: require a valid base32 geohash in 'g' tag
    // kind 23333: no strict validation required (include regardless of g tag validity)
    let allowEvent = true;
    if (eventKind === 20000) {
      const gh = (eventGeohash || "").toLowerCase();
      if (!gh || !VALID_GEOHASH_CHARS.test(gh)) {
        // For strict kind, skip events without a valid geohash
        console.log("Skipping kind 20000 event without valid geohash:", event.id);
        allowEvent = false;
      }
    }

    // Check for invalid geohash and log it
    if (eventGeohash && !VALID_GEOHASH_CHARS.test(eventGeohash)) {
      const nameTag = event.tags.find((tag: string[]) => tag[0] === "n");
      const username = nameTag ? nameTag[1] : "anonymous";
      const pubkeyHash = event.pubkey.slice(-4);
      console.log(`Invalid geohash detected in incoming message: "${eventGeohash}" from user ${username} (${pubkeyHash})`);
      console.log(`Message content: "${event.content?.slice(0, 100)}${event.content && event.content.length > 100 ? '...' : ''}"`);
    }

    if (!allowEvent) {
      return;
    }

    // Handle both geohash events (kind 20000) and group events (kind 23333)
    const locationIdentifier = eventGeohash || eventGroup;
    
    if (locationIdentifier) {
      // For geohash events, try to find matching geohash
      if (eventGeohash) {
        const matchingGeohash = findMatchingGeohash(
          eventGeohash,
          searchGeohash,
          currentGeohashes
        );

        // Store the event in our hierarchical tracking using the full geohash
        setAllEventsByGeohash((prev) => {
          const newMap = new Map(prev);
          newMap.set(eventGeohash, (newMap.get(eventGeohash) || 0) + 1);
          return newMap;
        });

        if (matchingGeohash) {
          console.log(
            `Nostr event in geohash ${matchingGeohash}:`,
            event.content
          );

          // Update activity tracking
          setGeohashActivity((prev) => {
            const newActivity = new Map(prev);
            const current = newActivity.get(matchingGeohash) || {
              geohash: matchingGeohash,
              lastActivity: 0,
              eventCount: 0,
            };

            newActivity.set(matchingGeohash, {
              ...current,
              lastActivity: Date.now(),
              eventCount: current.eventCount + 1,
            });

            return newActivity;
          });

          // Trigger animation
          onGeohashAnimate(matchingGeohash);
        }
      } else if (eventGroup) {
        // For group events (kind 23333), log and process them
        console.log(
          `Nostr event in group ${eventGroup}:`,
          event.content
        );
        
        // Store group events in hierarchical tracking as well
        setAllEventsByGeohash((prev) => {
          const newMap = new Map(prev);
          newMap.set(eventGroup, (newMap.get(eventGroup) || 0) + 1);
          return newMap;
        });
      }
    }

    // Add to all stored events (no limit) - we'll filter dynamically
    setAllStoredEvents((prev) => {
      // Check for duplicates using event ID
      if (prev.some(existingEvent => existingEvent.id === event.id)) {
        return prev; // Event already exists, don't add duplicate
      }
      return [event, ...prev];
    });
    
    // Always add to recent events for the live feed (no limit)
    setRecentEvents((prev) => {
      // Check for duplicates using event ID
      if (prev.some(existingEvent => existingEvent.id === event.id)) {
        return prev; // Event already exists, don't add duplicate
      }
      return [event, ...prev];
    });
  };

  const connectToNostr = async () => {
    try {
      setConnectionStatus("Connecting...");

      // Create a new pool
      const pool = new SimplePool();
      poolRef.current = pool;

      // Wait for GeoRelayDirectory to be ready, then get 1 relay from each of the 24 key geohashes
      await GeoRelayDirectory.shared.waitForReady();
      
      const keyGeohashes = ["b", "c", "f", "g", "u", "v", "y", "z", "9", "d", "e", "s", "t", "w", "x", "2", "6", "7", "k", "m", "q", "r", "4", "p"];
      const initialRelays: Array<{url: string, geohash: string}> = [];
      const usedGeohashes = new Set<string>();
      
      // Get exactly 1 relay from each geohash for broad geographic coverage
      for (const geohash of keyGeohashes) {
        if (usedGeohashes.has(geohash)) continue; // Skip if we already have this geohash
        
        const relays = GeoRelayDirectory.shared.closestRelays(geohash, 1);
        if (relays.length > 0) {
          // Only take the first relay and mark this geohash as used
          initialRelays.push({url: relays[0], geohash});
          usedGeohashes.add(geohash);
        }
      }
      
      // If no georelays available, fall back to a single hardcoded relay
      const targetRelays = initialRelays.length > 0 ? initialRelays.map(r => r.url) : ["wss://relay.damus.io"];

      // Subscribe to kind 20000 (strict geohash) and 23333 (no strict geohash) events
      const sub = pool.subscribeMany(targetRelays, [{ kinds: [20000, 23333] }], {
        onevent: handleNostrEvent,
        oneose() {
          console.log("End of stored events");
          setConnectionStatus(
            `Connected (${targetRelays.length}/${targetRelays.length})`
          );
          setConnectedRelays(initialRelays);
        },
        onclose() {
          console.log("Subscription closed");
        },
      });

      subRef.current = sub;

      // Set initial connection status
      setTimeout(() => {
        if (poolRef.current) {
          setConnectionStatus(
            `Connected (${targetRelays.length}/${targetRelays.length})`
          );
          setConnectedRelays(initialRelays);
        }
      }, 2000);
    } catch (error) {
      console.error("Failed to connect to Nostr:", error);
      setConnectionStatus("Connection failed");
    }
  };

  const disconnectFromNostr = () => {
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
      statusIntervalRef.current = null;
    }

    if (subRef.current) {
      try {
        subRef.current.close();
      } catch (e) {
        console.log("Error closing subscription:", e);
      }
      subRef.current = null;
    }

    if (poolRef.current) {
      try {
        poolRef.current.close(NOSTR_RELAYS);
      } catch (e) {
        console.log("Error closing pool:", e);
      }
      poolRef.current = null;
    }

    // Don't clear connectedRelays - keep them visible but disconnected
    setConnectionStatus("Disconnected");
  };

  const toggleNostr = async () => {
    if (nostrEnabled) {
      disconnectFromNostr();
      setNostrEnabled(false);
    } else {
      await connectToNostr();
      setNostrEnabled(true);
    }
  };

  // Auto-connect to Nostr on component mount
  useEffect(() => {
    const initConnection = async () => {
      await connectToNostr();
      setNostrEnabled(true);
    };
    initConnection();
  }, []);

  // Auto-update georelays when channel changes
  useEffect(() => {
    if (nostrEnabled && currentChannel && poolRef.current) {
      console.log("Channel changed, updating georelays for:", currentChannel);
      // Automatically connect to georelays for the new channel
      connectToGeoRelays();
    }
  }, [currentChannel, nostrEnabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromNostr();
    };
  }, []);

  // Get georelay-based relays for a specific channel/geohash
  const getGeorelayRelays = (channel: string, count: number = 5): string[] => {
    // If we have a channel, use it to find appropriate georelays
    // Otherwise fall back to global relays
    const targetGeohash = channel || "u";
    return GeoRelayDirectory.shared.closestRelays(targetGeohash, count);
  };

  // Connect to georelays based on current channel and update connection
  const connectToGeoRelays = async (): Promise<string[]> => {
    try {
      console.log("Connecting to georelays for channel:", currentChannel);
      
      // Get georelay relays for current channel
      const geoRelays = getGeorelayRelays(currentChannel, 5);
      console.log(`Found ${geoRelays.length} georelay relays for channel ${currentChannel}:`, geoRelays);
      
      if (geoRelays.length > 0) {
        // Get current connected relays to preserve initial connections
        const currentRelays = connectedRelays;
        
        // Separate initial relays from local relays
        const initialRelayCount = 24; // We know we have 24 initial relays
        const initialRelays = currentRelays.slice(0, initialRelayCount);
        const existingLocalRelays = currentRelays.slice(initialRelayCount);
        
        // Create relay info with geohash for the current channel
        const newRelayInfo = geoRelays.map(url => ({url, geohash: currentChannel}));
        
        // Limit local relays to maximum of 5 total
        const maxLocalRelays = 5;
        let finalLocalRelays: Array<{url: string, geohash: string}>;
        
        if (existingLocalRelays.length + newRelayInfo.length <= maxLocalRelays) {
          // We can add all new local relays
          finalLocalRelays = [...existingLocalRelays, ...newRelayInfo];
        } else {
          // We need to limit to maxLocalRelays
          // Keep existing local relays and add new ones until we hit the limit
          const availableSlots = maxLocalRelays - existingLocalRelays.length;
          if (availableSlots > 0) {
            finalLocalRelays = [...existingLocalRelays, ...newRelayInfo.slice(0, availableSlots)];
          } else {
            // No available slots, replace existing local relays with new ones
            finalLocalRelays = newRelayInfo.slice(0, maxLocalRelays);
          }
        }
        
        // Combine initial relays with limited local relays
        const combinedRelays = [...initialRelays, ...finalLocalRelays];
        const allRelayUrls = combinedRelays.map(r => r.url);
        
        console.log(`Combining ${initialRelays.length} initial relays with ${finalLocalRelays.length} local relays (max: ${maxLocalRelays}) for channel ${currentChannel}`);
        
        // Ensure pool exists, create if needed
        if (!poolRef.current) {
          console.log("Creating new pool for georelay connection");
          const pool = new SimplePool();
          poolRef.current = pool;
        }
        
        // Close existing subscription
        if (subRef.current) {
          console.log("Closing existing subscription");
          subRef.current.close();
        }
        
        console.log("Creating new subscription with combined relays...");
        
        // Create new subscription with combined relays
        const sub = poolRef.current.subscribeMany(allRelayUrls, [{ kinds: [20000, 23333] }], {
          onevent: handleNostrEvent,
          oneose() {
            console.log("End of stored events");
            setConnectionStatus(`Connected with ${combinedRelays.length} total relays (${finalLocalRelays.length} local + ${initialRelays.length} initial)`);
            setConnectedRelays(combinedRelays);
          },
          onclose() {
            console.log("Subscription closed");
          },
        });
        
        subRef.current = sub;
        setConnectedRelays(combinedRelays);
        setConnectionStatus(`Connected with ${combinedRelays.length} total relays (${finalLocalRelays.length} local + ${initialRelays.length} initial)`);
        setNostrEnabled(true);
        console.log("Georelay connection successful! Total relays:", combinedRelays.length, `(${finalLocalRelays.length} local + ${initialRelays.length} initial)`);
        
        return geoRelays; // Success
        
      } else {
        console.log("No georelay relays available for channel:", currentChannel);
        return [];
      }
      
    } catch (error) {
      console.error("Failed to connect to georelays:", error);
      return [];
    }
  };

  // Disconnect from georelays and restore initial relays only
  const disconnectFromGeoRelays = async (): Promise<void> => {
    try {
      console.log("Disconnecting from local georelays, restoring to initial relays only...");
      
      // Ensure pool exists
      if (!poolRef.current) {
        console.log("No pool to disconnect from");
        return;
      }
      
      // Close existing subscription
      if (subRef.current) {
        console.log("Closing existing subscription");
        subRef.current.close();
      }
      
      // Create new subscription with 1 relay from each of the 24 key geohashes
      console.log("Creating new subscription with 1 relay from each of the 24 key geohashes...");
      const keyGeohashes = ["b", "c", "f", "g", "u", "v", "y", "z", "9", "d", "e", "s", "t", "w", "x", "2", "6", "7", "k", "m", "q", "r", "4", "p"];
      const fallbackRelays: Array<{url: string, geohash: string}> = [];
      const usedGeohashes = new Set<string>();
      
      // Get exactly 1 relay from each geohash for broad geographic coverage
      for (const geohash of keyGeohashes) {
        if (usedGeohashes.has(geohash)) continue; // Skip if we already have this geohash
        
        const relays = GeoRelayDirectory.shared.closestRelays(geohash, 1);
        if (relays.length > 0) {
          // Only take the first relay and mark this geohash as used
          fallbackRelays.push({url: relays[0], geohash});
          usedGeohashes.add(geohash);
        }
      }
      
      const finalRelayUrls = fallbackRelays.length > 0 ? fallbackRelays.map(r => r.url) : ["wss://relay.damus.io"];
      
      const sub = poolRef.current.subscribeMany(finalRelayUrls, [{ kinds: [20000, 23333] }], {
        onevent: handleNostrEvent,
        oneose() {
          console.log("End of stored events");
          setConnectionStatus(`Connected to ${finalRelayUrls.length} initial relays`);
          setConnectedRelays(fallbackRelays);
        },
        onclose() {
          console.log("Subscription closed");
        },
      });
      
      subRef.current = sub;
      setConnectedRelays(fallbackRelays);
      setConnectionStatus(`Connected to ${finalRelayUrls.length} initial relays`);
      console.log("Local georelay disconnection successful, restored to initial relays");
      
    } catch (error) {
      console.error("Failed to disconnect from georelays:", error);
    }
  };

  // Subscribe to events for a specific geohash using georelay-based relays
  const subscribeToGeohash = (geohash: string, kinds: number[] = [20000, 23333]) => {
    if (!poolRef.current) return null;
    
    const geoRelays = getGeorelayRelays(geohash, 5);
    // If no georelays for this specific geohash, use the 24 key geohashes as fallback
    let targetRelays = geoRelays;
    
    if (targetRelays.length === 0) {
      const keyGeohashes = ["b", "c", "f", "g", "u", "v", "y", "z", "9", "d", "e", "s", "t", "w", "x", "2", "6", "7", "k", "m", "q", "r", "4", "p"];
      const usedGeohashes = new Set<string>();
      
      for (const keyGeohash of keyGeohashes) {
        if (usedGeohashes.has(keyGeohash)) continue; // Skip if we already have this geohash
        
        const relays = GeoRelayDirectory.shared.closestRelays(keyGeohash, 1);
        if (relays.length > 0) {
          // Only take the first relay and mark this geohash as used
          targetRelays.push(relays[0]);
          usedGeohashes.add(keyGeohash);
        }
      }
      // If still no relays, use hardcoded fallback
      if (targetRelays.length === 0) {
        targetRelays = ["wss://relay.damus.io"];
      }
    }
    
    const sub = poolRef.current.subscribeMany(targetRelays, [{ kinds }], {
      onevent: handleNostrEvent,
      oneose() {
        console.log(`End of stored events for geohash ${geohash}`);
      },
      onclose() {
        console.log(`Subscription closed for geohash ${geohash}`);
      },
    });
    
    return sub;
  };

  return {
    connectedRelays,
    recentEvents,
    geohashActivity,
    nostrEnabled,
    connectionStatus,
    allStoredEvents,
    allEventsByGeohash,
    toggleNostr,
    connectToNostr,
    disconnectFromNostr,
    getGeorelayRelays,
    subscribeToGeohash,
    connectToGeoRelays,
    disconnectFromGeoRelays,
  };
}