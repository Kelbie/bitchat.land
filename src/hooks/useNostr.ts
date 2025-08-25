import { useState, useRef, useEffect } from "react";
import { SimplePool, Event as NostrEventOriginal } from "nostr-tools/pool";
import { NostrEvent, GeohashActivity } from "../types";
import { NOSTR_RELAYS } from "../constants/projections";
import { findMatchingGeohash } from "../utils/geohashUtils";

// Valid geohash characters (base32 without 'a', 'i', 'l', 'o')
const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/;

export function useNostr(
  searchGeohash: string,
  currentGeohashes: string[],
  onGeohashAnimate: (geohash: string) => void
) {
  const [connectedRelays, setConnectedRelays] = useState<string[]>([]);
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
  const subRef = useRef<any>(null);
  const statusIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connectToNostr = () => {
    try {
      setConnectionStatus("Connecting...");

      // Create a new pool
      const pool = new SimplePool();
      poolRef.current = pool;

      // Subscribe to kind 20000 events with geohash tags using subscribeMany
      const sub = pool.subscribeMany(NOSTR_RELAYS, [{ kinds: [20000] }], {
        onevent(event: NostrEventOriginal) {
          console.log("Received Nostr event:", event);

          // Extract geohash from 'g' tag
          const geoTag = event.tags.find((tag) => tag[0] === "g");
          const eventGeohash = geoTag ? geoTag[1] : null;

          // Check for invalid geohash and log it
          if (eventGeohash && !VALID_GEOHASH_CHARS.test(eventGeohash)) {
            const nameTag = event.tags.find((tag) => tag[0] === "n");
            const username = nameTag ? nameTag[1] : "anonymous";
            const pubkeyHash = event.pubkey.slice(-4);
            console.log(`Invalid geohash detected in incoming message: "${eventGeohash}" from user ${username} (${pubkeyHash})`);
            console.log(`Message content: "${event.content?.slice(0, 100)}${event.content && event.content.length > 100 ? '...' : ''}"`);
          }

          if (eventGeohash) {
            // Find which display geohash this event belongs to
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

            // Add to all stored events (no limit) - we'll filter dynamically
            setAllStoredEvents((prev) => [event, ...prev]);
            
            // Always add to recent events for the live feed (no limit)
            setRecentEvents((prev) => [event, ...prev]);
          }
        },
        oneose() {
          console.log("End of stored events");
          setConnectionStatus(
            `Connected (${NOSTR_RELAYS.length}/${NOSTR_RELAYS.length})`
          );
          setConnectedRelays(NOSTR_RELAYS);
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
            `Connected (${NOSTR_RELAYS.length}/${NOSTR_RELAYS.length})`
          );
          setConnectedRelays(NOSTR_RELAYS);
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

    setConnectedRelays([]);
    setConnectionStatus("Disconnected");
  };

  const toggleNostr = () => {
    if (nostrEnabled) {
      disconnectFromNostr();
      setNostrEnabled(false);
    } else {
      connectToNostr();
      setNostrEnabled(true);
    }
  };

  // Auto-connect to Nostr on component mount
  useEffect(() => {
    connectToNostr();
    setNostrEnabled(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnectFromNostr();
    };
  }, []);

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
  };
}
