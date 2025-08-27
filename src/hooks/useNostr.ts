import { useState, useRef, useEffect } from "react";
import { SimplePool } from "nostr-tools/pool";
import type { Event as NostrEventOriginal } from "nostr-tools";
import { NostrEvent, GeohashActivity } from "../types";
import { NOSTR_RELAYS, DEFAULT_RELAYS } from "../constants/projections";
import { findMatchingGeohash } from "../utils/geohashUtils";
import { GeoRelayDirectory } from "../utils/geoRelayDirectory";

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
  const statusIntervalRef = useRef<number | null>(null);

  const connectToNostr = () => {
    try {
      setConnectionStatus("Connecting...");

      // Create a new pool
      const pool = new SimplePool();
      poolRef.current = pool;

      // Get georelay-based relays for better performance
      const geoRelays = GeoRelayDirectory.shared.closestRelays("u", 5); // Default to 'u' geohash (roughly global)
      // Combine default relays with georelays for better coverage
      const targetRelays = [...new Set([...DEFAULT_RELAYS, ...geoRelays])];

      // Subscribe to kind 20000 (strict geohash) and 23333 (no strict geohash) events
      const sub = pool.subscribeMany(targetRelays, [{ kinds: [20000, 23333] }], {
        onevent(event: NostrEventOriginal) {
          console.log("Received Nostr event:", event);

          // Extract geohash from 'g' tag and group from 'd' tag
          const geoTag = event.tags.find((tag: any) => tag[0] === "g");
          const groupTag = event.tags.find((tag: any) => tag[0] === "d");
          const eventGeohash = geoTag ? (geoTag[1] || null) : null;
          const eventGroup = groupTag ? (groupTag[1] || null) : null;

          const eventKind = (event as any).kind as number | undefined;

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
            const nameTag = event.tags.find((tag: any) => tag[0] === "n");
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

    // Don't clear connectedRelays - keep them visible but disconnected
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

  // Get georelay-based relays for a specific geohash
  const getGeorelayRelays = (geohash: string, count: number = 5): string[] => {
    return GeoRelayDirectory.shared.closestRelays(geohash, count);
  };

  // Connect to georelays and update connection
  const connectToGeoRelays = async (): Promise<string[]> => {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        attempt++;
        console.log(`Georelay connection attempt ${attempt}/${maxRetries}...`);
        
        // Get current location with retry logic
        const geoPosition = await new Promise<GeolocationPosition>((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error("Location request timed out"));
          }, 15000); // Increased timeout
          
          navigator.geolocation.getCurrentPosition(
            (position) => {
              clearTimeout(timeoutId);
              resolve(position);
            },
            (error) => {
              clearTimeout(timeoutId);
              reject(error);
            },
            {
              enableHighAccuracy: false, // Reduced accuracy for better reliability
              timeout: 15000,
              maximumAge: 300000 // 5 minutes cache
            }
          );
        });
        
        console.log("Location obtained, getting georelay relays...");
        
        // Get georelay relays for current location
        const geoRelays = getGeorelayRelays("u", 5); // Use 'u' geohash for global fallback
        console.log(`Found ${geoRelays.length} georelay relays:`, geoRelays);
        
        if (geoRelays.length > 0) {
          // Update connection to include georelays
          const allRelays = [...new Set([...DEFAULT_RELAYS, ...geoRelays])];
          console.log(`Combined relays: ${allRelays.length} total (${DEFAULT_RELAYS.length} default + ${geoRelays.length} georelay)`);
          
          // Ensure pool exists, create if needed
          if (!poolRef.current) {
            console.log("Creating new pool for georelay connection");
            const pool = new SimplePool();
            poolRef.current = pool;
          }
          
          // Close existing connections and reconnect with new relay list
          if (subRef.current) {
            console.log("Closing existing subscription");
            subRef.current.close();
          }
          
          console.log("Creating new subscription with combined relays...");
          
          // Create new subscription with combined relays
          const sub = poolRef.current.subscribeMany(allRelays, [{ kinds: [20000, 23333] }], {
            onevent(event: NostrEventOriginal) {
              console.log("Received Nostr event:", event);
              
              // Extract geohash from 'g' tag and group from 'd' tag
              const geoTag = event.tags.find((tag: any) => tag[0] === "g");
              const groupTag = event.tags.find((tag: any) => tag[0] === "d");
              const eventGeohash = geoTag ? (geoTag[1] || null) : null;
              const eventGroup = groupTag ? (groupTag[1] || null) : null;

              const eventKind = (event as any).kind as number | undefined;

              // Determine if we should include this event based on kind rules
              let allowEvent = true;
              if (eventKind === 20000) {
                const gh = (eventGeohash || "").toLowerCase();
                if (!gh || !VALID_GEOHASH_CHARS.test(gh)) {
                  console.log("Skipping kind 20000 event without valid geohash:", event.id);
                  allowEvent = false;
                }
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
            },
            oneose() {
              console.log("End of stored events");
              setConnectionStatus(`Connected with GeoRelays (${allRelays.length}/${allRelays.length})`);
              setConnectedRelays(allRelays);
            },
            onclose() {
              console.log("Subscription closed");
            },
          });
          
          subRef.current = sub;
          setConnectedRelays(allRelays);
          setConnectionStatus(`Connected with GeoRelays (${allRelays.length}/${allRelays.length})`);
          setNostrEnabled(true);
          console.log("Georelay connection successful!");
          
          return geoRelays; // Success - exit retry loop
          
        } else {
          console.log("No georelay relays available");
          if (attempt === maxRetries) {
            console.error("Failed to get georelay relays after all attempts");
            return [];
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }
        
      } catch (error) {
        console.error(`Georelay connection attempt ${attempt} failed:`, error);
        
        if (attempt === maxRetries) {
          console.error("All georelay connection attempts failed");
          return [];
        }
        
        // Wait before retry with exponential backoff
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    console.error("Unexpected end of georelay connection function");
    return [];
  };

  // Disconnect from georelays and restore default relays only
  const disconnectFromGeoRelays = async (): Promise<void> => {
    try {
      console.log("Disconnecting from georelays, restoring default relays only...");
      
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
      
      // Create new subscription with default relays only
      console.log("Creating new subscription with default relays only...");
      const sub = poolRef.current.subscribeMany(DEFAULT_RELAYS, [{ kinds: [20000, 23333] }], {
        onevent(event: NostrEventOriginal) {
          console.log("Received Nostr event:", event);
          
          // Extract geohash from 'g' tag and group from 'd' tag
          const geoTag = event.tags.find((tag: any) => tag[0] === "g");
          const groupTag = event.tags.find((tag: any) => tag[0] === "d");
          const eventGeohash = geoTag ? (geoTag[1] || null) : null;
          const eventGroup = groupTag ? (groupTag[1] || null) : null;

          const eventKind = (event as any).kind as number | undefined;

          // Determine if we should include this event based on kind rules
          let allowEvent = true;
          if (eventKind === 20000) {
            const gh = (eventGeohash || "").toLowerCase();
            if (!gh || !VALID_GEOHASH_CHARS.test(gh)) {
              console.log("Skipping kind 20000 event without valid geohash:", event.id);
              allowEvent = false;
            }
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
        },
        oneose() {
          console.log("End of stored events");
          setConnectionStatus(`Connected (${DEFAULT_RELAYS.length}/${DEFAULT_RELAYS.length})`);
          setConnectedRelays(DEFAULT_RELAYS);
        },
        onclose() {
          console.log("Subscription closed");
        },
      });
      
      subRef.current = sub;
      setConnectedRelays(DEFAULT_RELAYS);
      setConnectionStatus(`Connected (${DEFAULT_RELAYS.length}/${DEFAULT_RELAYS.length})`);
      console.log("Georelay disconnection successful, restored default relays");
      
    } catch (error) {
      console.error("Failed to disconnect from georelays:", error);
    }
  };

  // Subscribe to events for a specific geohash using georelay-based relays
  const subscribeToGeohash = (geohash: string, kinds: number[] = [20000, 23333]) => {
    if (!poolRef.current) return null;
    
    const geoRelays = getGeorelayRelays(geohash, 5);
    const targetRelays = geoRelays.length > 0 ? geoRelays : DEFAULT_RELAYS;
    
    const sub = poolRef.current.subscribeMany(targetRelays, [{ kinds }], {
      onevent(event: NostrEventOriginal) {
        console.log(`Geohash ${geohash} event:`, event);
        // Process event similar to main subscription
        // This could be extended to handle specific geohash events
      },
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
