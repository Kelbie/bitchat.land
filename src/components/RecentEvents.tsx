import { useEffect, useRef, useState, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import { NostrEvent } from "../types";
import {
  parseSearchQuery,
  addGeohashToSearch,
  addUserToSearch,
} from "../utils/searchParser";
import { renderTextWithLinks } from "../utils/linkRenderer";
import { colorForPeerSeed } from "../utils/userColor";

// Valid geohash characters (base32 without 'a', 'i', 'l', 'o')
const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/;

interface RecentEventsProps {
  nostrEnabled: boolean;
  searchText: string;
  allStoredEvents: NostrEvent[];
  recentEvents: NostrEvent[];
  onSearch?: (text: string) => void;
  forceScrollToBottom?: boolean;
  onReply?: (username: string, pubkeyHash: string) => void;
  theme: "matrix" | "material";
}

const styles = {
  matrix: {
    container:
      "relative w-full h-full z-[1000] bg-black text-[14px] flex flex-col",
    noEvents:
      "flex items-center justify-center h-full text-green-600 font-mono text-sm text-center p-5",
    noEventsMessage: "mb-2",
    scrollButton:
      "absolute bottom-[70px] right-[30px] bg-green-500 text-black rounded-full w-[50px] h-[50px] cursor-pointer font-bold shadow-[0_4px_12px_rgba(0,255,0,0.3)] transition-all duration-200 z-[1000] hover:bg-green-600 hover:scale-110",
  },
  material: {
    container:
      "relative w-full h-full z-[1000] bg-white text-gray-900 text-[14px] flex flex-col",
    noEvents:
      "flex items-center justify-center h-full text-gray-500 font-mono text-sm text-center p-5",
    noEventsMessage: "mb-2",
    scrollButton:
      "absolute bottom-[70px] right-[30px] bg-blue-500 text-white rounded-full w-[50px] h-[50px] cursor-pointer font-bold shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-200 z-[1000] hover:bg-blue-600 hover:scale-110",
  },
} as const;

export function RecentEvents({
  nostrEnabled,
  searchText,
  allStoredEvents,
  recentEvents,
  onSearch,
  forceScrollToBottom = false,
  onReply,
  theme,
}: RecentEventsProps) {
  const virtuosoRef = useRef<any>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);

  if (!nostrEnabled) return null;

  // Parse the search query
  const parsedSearch = parseSearchQuery(searchText);
  const hasSearchTerms =
    parsedSearch.text ||
    parsedSearch.geohashes.length > 0 ||
    parsedSearch.users.length > 0 ||
    parsedSearch.clients.length > 0 ||
    parsedSearch.colors.length > 0;

  // Use all stored events when searching, recent events when not searching
  const eventsToShow = hasSearchTerms ? allStoredEvents : recentEvents;
  const filteredEvents = eventsToShow.filter((event) => {
    if (!hasSearchTerms) return true;

    // Extract event data
    const messageContent = (event.content || "").toLowerCase();
    const nameTag = event.tags.find((tag: any) => tag[0] === "n");
    const username = (nameTag ? nameTag[1] : "").toLowerCase();
    const geoTag = event.tags.find((tag: any) => tag[0] === "g");
    const groupTag = event.tags.find((tag: any) => tag[0] === "d"); // group tag is kind 23333 only
    const eventGeohash = (geoTag ? geoTag[1] : "").toLowerCase();
    const eventGroup = (groupTag ? groupTag[1] : "").toLowerCase();
    const eventLocationTag = eventGeohash || eventGroup;
    const pubkeyHash = event.pubkey.slice(-4).toLowerCase();
    const clientTag = event.tags.find((tag: any) => tag[0] === "client");
    const eventClient = (clientTag ? clientTag[1] : "").toLowerCase();

    // Check for invalid geohash and log it
    if (eventGeohash && !VALID_GEOHASH_CHARS.test(eventGeohash)) {
      console.log(
        `Invalid geohash detected in message: "${eventGeohash}" from user ${
          username || "anonymous"
        } (${pubkeyHash})`
      );
      console.log(
        `Message content: "${event.content?.slice(0, 100)}${
          event.content && event.content.length > 100 ? "..." : ""
        }"`
      );
    }

    let matches = true;

    // Check text content if specified (only search message content, not usernames)
    if (parsedSearch.text) {
      const textMatch = messageContent.includes(
        parsedSearch.text.toLowerCase()
      );
      if (!textMatch) matches = false;
    }

    // Check geohash filters if specified (support kind 23333 arbitrary hashtag in tag "d")
    if (parsedSearch.geohashes.length > 0 && matches) {
      if (!eventLocationTag) {
        // Neither g nor d tag present → exclude under in: filter
        matches = false;
      } else if (eventGeohash && VALID_GEOHASH_CHARS.test(eventGeohash)) {
        // Strict geohash: must startsWith any search geohash
        const startsMatch = parsedSearch.geohashes.some((searchGeohash) =>
          eventGeohash.startsWith(searchGeohash.toLowerCase())
        );
        if (!startsMatch) matches = false;
      } else {
        // Arbitrary tag (group "d" or invalid geohash) → do string startsWith on whatever tag value exists
        const startsMatch = parsedSearch.geohashes.some((searchGeohash) =>
          eventLocationTag.startsWith(searchGeohash.toLowerCase())
        );
        if (!startsMatch) matches = false;
      }
    }

    // Check user filters if specified
    if (parsedSearch.users.length > 0 && matches) {
      const userMatch = parsedSearch.users.some((searchUser) => {
        // Handle both "username" and "username#hash" formats
        if (searchUser.includes("#")) {
          const [searchUsername, searchHash] = searchUser.split("#");
          return (
            username === searchUsername.toLowerCase() &&
            pubkeyHash === searchHash.toLowerCase()
          );
        } else {
          return username === searchUser.toLowerCase();
        }
      });
      if (!userMatch) matches = false;
    }

    // Check client filters if specified
    if (parsedSearch.clients.length > 0 && matches) {
      if (!eventClient) {
        // No client tag present → exclude under client: filter
        matches = false;
      } else {
        const clientMatch = parsedSearch.clients.some((searchClient) =>
          eventClient.includes(searchClient.toLowerCase())
        );
        if (!clientMatch) matches = false;
      }
    }

    return matches;
  });

  // Sort events chronologically (oldest first for chat-like experience)
  const sortedEvents = filteredEvents.sort(
    (a, b) => a.created_at - b.created_at
  );

  // Handle scroll state changes for Virtuoso
  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
  }, []);

  const handleRangeChanged = useCallback(
    ({ endIndex }: any) => {
      // Clear any pending scroll timeout when user manually scrolls
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }

      // Detect if user is scrolling up (away from bottom)
      if (!isAutoScrolling && endIndex < sortedEvents.length - 1) {
        setUserScrolled(true);
      } else if (endIndex === sortedEvents.length - 1) {
        setUserScrolled(false);
      }
    },
    [sortedEvents.length, isAutoScrolling]
  );

  // Scroll to bottom function with animation
  const scrollToBottom = useCallback(
    (behavior: "auto" | "smooth" = "smooth") => {
      if (virtuosoRef.current) {
        setIsAutoScrolling(true);
        virtuosoRef.current.scrollToIndex({
          index: sortedEvents.length - 1,
          align: "end",
          behavior,
        });

        // Reset auto-scrolling flag after animation
        scrollTimeoutRef.current = setTimeout(() => {
          setIsAutoScrolling(false);
          setUserScrolled(false);
        }, 1000);
      }
    },
    [sortedEvents.length]
  );

  // Event item component for react-virtuoso
  const EventItem = useCallback(
    ({ index }: { index: number }) => {
      const event = sortedEvents[index];
      if (!event) return null;

      const geoTag = event.tags.find((tag: any) => tag[0] === "g");
      const groupTag = event.tags.find((tag: any) => tag[0] === "d"); // group tag is kind 23333 only
      const nameTag = event.tags.find((tag: any) => tag[0] === "n");
      const clientTag = event.tags.find((tag: any) => tag[0] === "client");
      const rawGeohash =
        geoTag && typeof geoTag[1] === "string" ? geoTag[1] : "";
      const groupTagValue =
        groupTag && typeof groupTag[1] === "string" ? groupTag[1] : "";
      const username = nameTag ? nameTag[1] : "Anonymous";
      const clientName = clientTag ? clientTag[1] : null;
      const pubkeyHash = event.pubkey.slice(-4);
      const time = new Date(event.created_at * 1000).toLocaleTimeString();
      const date = new Date(event.created_at * 1000).toLocaleDateString();
      const isToday =
        new Date().toDateString() ===
        new Date(event.created_at * 1000).toDateString();

      // Check for invalid geohash and log it
      const eventGeohash = (geoTag ? geoTag[1] : "").toLowerCase();
      if (eventGeohash && !VALID_GEOHASH_CHARS.test(eventGeohash)) {
        console.log(
          `Invalid geohash detected in message: "${eventGeohash}" from user ${
            username || "anonymous"
          } (${pubkeyHash})`
        );
        console.log(
          `Message content: "${event.content?.slice(0, 100)}${
            event.content && event.content.length > 100 ? "..." : ""
          }"`
        );
      }

      const userColors = colorForPeerSeed('nostr:' + event.pubkey, true);

      // Calculate username width for hanging indent
      const usernameText = `<@${username}#${pubkeyHash}>`;
      const fontSize = "14px";
      const fontFamily = "Courier New, monospace";
      const fontWeight = "bold";

      // Create a temporary canvas to measure text width
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (context) {
        context.font = `${fontWeight} ${fontSize} ${fontFamily}`;
        const usernameWidth = context.measureText(usernameText).width;

        // Add some padding for better spacing
        const hangingIndentWidth = Math.ceil(usernameWidth) + 16;

        return (
          <div
            style={{
              paddingBottom: "16px", // Consistent spacing
            }}
          >
            <div
              style={{
                // margin: "0 20px 0 20px",
                padding: "0px 20px",
                background: "rgba(0, 0, 0, 0.3)",
                borderRadius: "8px",
                opacity: 1,
                transition: "all 0.2s ease",
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
              }}
              // onClick={(e) => {
              //   // Only trigger message click if not clicking on interactive elements
              //   if (!(e.target as HTMLElement).closest('button')) {
              //     // Handle message click for search functionality
              //     if (onSearch) {
              //       onSearch(addUserToSearch(searchText, username, pubkeyHash));
              //     }
              //   }
              // }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0, 0, 0, 0.5)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 4px 12px rgba(0, 0, 0, 0.4)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0, 0, 0, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 2px 8px rgba(0, 0, 0, 0.3)";
              }}
            >

               {/* Bottom row: Hash, Via, Reply */}
               <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  alignItems: "center",
                  height: "16px",
                }}
              >
                {/* Right side: Hash, Via, and Reply button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {/* Hash tag */}
                  <span
                    style={{
                      color: "#666",
                      fontSize: "10px",
                      fontFamily: "monospace",
                      cursor: onSearch ? "pointer" : "default",
                      transition: "all 0.2s ease",
                    }}
                    onClick={
                      onSearch
                        ? () =>
                            onSearch(
                              addGeohashToSearch(
                                searchText,
                                rawGeohash.toLowerCase()
                              )
                            )
                        : undefined
                    }
                  >
                    {eventGeohash
                      ? `#${eventGeohash.toUpperCase()}`
                      : `#${groupTagValue.toUpperCase()}`}
                  </span>

                  {clientName && (
                    <span
                      style={{
                        color: "#666",
                        fontSize: "10px",
                        fontFamily: "monospace",
                      }}
                    >
                      •
                    </span>
                  )}

                  {/* Via info */}
                  {clientName && (
                    <span
                      style={{
                        color: "#666",
                        fontSize: "10px",
                        fontFamily: "monospace",
                      }}
                    >
                      via {clientName}
                    </span>
                  )}

                  {/* Reply button */}
                  {onReply && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Add a small delay to ensure the click event is fully processed
                        setTimeout(() => {
                          onReply(username, pubkeyHash);
                        }, 10);
                      }}
                      style={{
                        background: "transparent",
                        color: "#666",
                        border: "none",
                        borderRadius: "3px",
                        fontSize: "10px",
                        fontFamily: "monospace",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        userSelect: "none",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0, 0, 0, 0.2)";
                        e.currentTarget.style.color = "#888";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#888";
                      }}
                    >
                      ↪ Reply
                    </button>
                  )}
                </div>
              </div>

              {/* Top row: Username + Message with hanging indent */}
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",

                  // marginBottom: "8px"
                }}
              >
                {/* Combined Username + Message content with dynamic hanging indent */}
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    lineHeight: "1.6",
                    wordWrap: "break-word",
                    whiteSpace: "pre-wrap",
                    fontFamily: "Courier New, monospace",
                    letterSpacing: "0.3px",
                  }}
                >
                  {/* Username */}
                  <span
                    style={{
                      color: userColors.hex,
                      fontSize: "14px",
                      fontWeight: "bold",
                      cursor: onSearch ? "pointer" : "default",
                      transition: "all 0.2s ease",
                    }}
                    onClick={
                      onSearch
                        ? () =>
                            onSearch(
                              addUserToSearch(searchText, username, pubkeyHash)
                            )
                        : undefined
                    }
                  >
                    &lt;@{username}#{pubkeyHash}&gt;
                  </span>

                  {/* Message content */}
                  <span
                    style={{
                      color: userColors.hex,
                      fontSize: "15px",
                      paddingLeft: `${8}px`,
                    }}
                  >
                    {event.content ? renderTextWithLinks(event.content) : "[No content]"}
                  </span>

                  {/* Date appended to message */}
                  <span
                    style={{
                      color: "#666",
                      fontSize: "11px",
                      paddingLeft: "8px",
                      fontFamily: "monospace",
                    }}
                  >
                    [{isToday ? time : `${date} ${time}`}]
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Fallback if canvas context is not available
      return null;
    },
    [
      sortedEvents,
      onSearch,
      searchText,
      onReply,
    ]
  );

  // Auto-scroll when new events arrive
  useEffect(() => {
    if (sortedEvents.length === 0) return;

    // Auto-scroll to bottom if user was at bottom and hasn't manually scrolled
    if (isAtBottom && !userScrolled) {
      setTimeout(() => scrollToBottom("smooth"), 100);
    }
  }, [sortedEvents.length, isAtBottom, userScrolled, scrollToBottom]);

  // Reset user scroll state when search changes
  useEffect(() => {
    setUserScrolled(false);
    setIsAtBottom(true);

    // Scroll to bottom after search change
    if (virtuosoRef.current && sortedEvents.length > 0) {
      setTimeout(() => scrollToBottom("auto"), 50);
    }
  }, [searchText, scrollToBottom]);

  // Handle force scroll to bottom prop
  useEffect(() => {
    if (forceScrollToBottom && virtuosoRef.current && sortedEvents.length > 0) {
      scrollToBottom("auto");
    }
  }, [forceScrollToBottom, scrollToBottom, sortedEvents.length]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // Always render the component container, even if no events match
  if (sortedEvents.length === 0) {
    return (
      <div className={styles[theme].noEvents}>
        <div>
          <div className={styles[theme].noEventsMessage}>NO EVENTS FOUND</div>
          {searchText && (
            <div className="text-xs opacity-70">
              No events matching: "{searchText}"
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles[theme].container}>
      {/* Virtual scrolling list with Virtuoso */}
      <div className="flex-1 relative">
        <Virtuoso
          ref={virtuosoRef}
          data={sortedEvents}
          overscan={200}
          increaseViewportBy={{ top: 1000, bottom: 1000 }}
          alignToBottom
          followOutput={(isAtBottom) => {
            // Only follow output if user hasn't manually scrolled up
            if (isAtBottom || !userScrolled) {
              return "smooth";
            }
            return false;
          }}
          atBottomStateChange={handleAtBottomStateChange}
          rangeChanged={handleRangeChanged}
          itemContent={(index) => <EventItem index={index} />}
          style={{
            height: "100%",
          }}
          computeItemKey={(index) => sortedEvents[index]?.id || index}
        />

        {/* Scroll to bottom button */}
        {userScrolled && !isAtBottom && (
          <button
            onClick={() => scrollToBottom("smooth")}
            className={styles[theme].scrollButton}
          >
            ↓
          </button>
        )}
      </div>
    </div>
  );
}
