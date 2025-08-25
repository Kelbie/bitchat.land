import { useEffect, useRef, useState, useCallback } from "react";
import { Virtuoso } from "react-virtuoso";
import { NostrEvent } from "../types";
import { parseSearchQuery, addGeohashToSearch, addUserToSearch } from "../utils/searchParser";

// Valid geohash characters (base32 without 'a', 'i', 'l', 'o')
const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/;

interface RecentEventsProps {
  nostrEnabled: boolean;
  searchText: string;
  allStoredEvents: NostrEvent[];
  recentEvents: NostrEvent[];
  isMobileView?: boolean;
  onSearch?: (text: string) => void;
  forceScrollToBottom?: boolean;
  onReply?: (username: string, pubkeyHash: string) => void;
}

export function RecentEvents({ 
  nostrEnabled, 
  searchText, 
  allStoredEvents, 
  recentEvents,
  isMobileView = false,
  onSearch,
  forceScrollToBottom = false,
  onReply,
}: RecentEventsProps) {
  const virtuosoRef = useRef<any>(null);
  const scrollTimeoutRef = useRef<number | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);
  const [isAutoScrolling, setIsAutoScrolling] = useState(false);
  
  if (!nostrEnabled) return null;

  // Parse the search query
  const parsedSearch = parseSearchQuery(searchText);
  const hasSearchTerms = parsedSearch.text || parsedSearch.geohashes.length > 0 || parsedSearch.users.length > 0;
  
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
    const eventLocationTag = (eventGeohash || eventGroup);
    const pubkeyHash = event.pubkey.slice(-4).toLowerCase();
    
    // Check for invalid geohash and log it
    if (eventGeohash && !VALID_GEOHASH_CHARS.test(eventGeohash)) {
      console.log(`Invalid geohash detected in message: "${eventGeohash}" from user ${username || 'anonymous'} (${pubkeyHash})`);
      console.log(`Message content: "${event.content?.slice(0, 100)}${event.content && event.content.length > 100 ? '...' : ''}"`);
    }
    
    let matches = true;
    
    // Check text content if specified (only search message content, not usernames)
    if (parsedSearch.text) {
      const textMatch = messageContent.includes(parsedSearch.text.toLowerCase());
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
      const userMatch = parsedSearch.users.some(searchUser => {
        // Handle both "username" and "username#hash" formats
        if (searchUser.includes('#')) {
          const [searchUsername, searchHash] = searchUser.split('#');
          return username === searchUsername.toLowerCase() && 
                 pubkeyHash === searchHash.toLowerCase();
        } else {
          return username === searchUser.toLowerCase();
        }
      });
      if (!userMatch) matches = false;
    }
    
    return matches;
  });

  // Sort events chronologically (oldest first for chat-like experience)
  const sortedEvents = filteredEvents.sort((a, b) => a.created_at - b.created_at);
  
  // Generate user colors function
  const generateUserColors = useCallback((hash: string) => {
    let hashValue = 0;
    for (let i = 0; i < hash.length; i++) {
      hashValue = hash.charCodeAt(i) + ((hashValue << 5) - hashValue);
    }
    
    const hue = Math.abs(hashValue % 360);
    const saturation = Math.abs(hashValue % 30) + 70;
    const lightness = Math.abs(hashValue % 20) + 55;
    
    return {
      username: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      message: `hsl(${hue}, ${Math.max(saturation - 20, 40)}%, ${Math.min(lightness + 10, 80)}%)`,
      background: `hsla(${hue}, ${Math.max(saturation - 40, 20)}%, ${Math.min(lightness - 30, 25)}%, 0.3)`,
      backgroundHover: `hsla(${hue}, ${Math.max(saturation - 30, 30)}%, ${Math.min(lightness - 20, 35)}%, 0.4)`,
      border: `hsl(${hue}, ${Math.max(saturation - 30, 40)}%, ${Math.min(lightness - 10, 45)}%)`,
      borderHover: `hsl(${hue}, ${saturation}%, ${Math.min(lightness + 5, 60)}%)`,
      leftBorder: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
      glow: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.2)`
    };
  }, []);

  // Handle scroll state changes for Virtuoso
  const handleAtBottomStateChange = useCallback((atBottom: boolean) => {
    setIsAtBottom(atBottom);
  }, []);

  const handleRangeChanged = useCallback(({ endIndex }: any) => {
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
  }, [sortedEvents.length, isAutoScrolling]);

  // Scroll to bottom function with animation
  const scrollToBottom = useCallback((behavior: 'auto' | 'smooth' = 'smooth') => {
    if (virtuosoRef.current) {
      setIsAutoScrolling(true);
      virtuosoRef.current.scrollToIndex({
        index: sortedEvents.length - 1,
        align: 'end',
        behavior
      });
      
      // Reset auto-scrolling flag after animation
      scrollTimeoutRef.current = setTimeout(() => {
        setIsAutoScrolling(false);
        setUserScrolled(false);
      }, 1000);
    }
  }, [sortedEvents.length]);

  // Event item component for react-virtuoso
  const EventItem = useCallback(({ index }: { index: number }) => {
    const event = sortedEvents[index];
    if (!event) return null;

    const geoTag = event.tags.find((tag: any) => tag[0] === "g");
    const groupTag = event.tags.find((tag: any) => tag[0] === "d"); // group tag is kind 23333 only
    const nameTag = event.tags.find((tag: any) => tag[0] === "n");
    const clientTag = event.tags.find((tag: any) => tag[0] === "client");
    const rawGeohash = geoTag && typeof geoTag[1] === "string" ? geoTag[1] : "";
    const groupTagValue = groupTag && typeof groupTag[1] === "string" ? groupTag[1] : "";
    const username = nameTag ? nameTag[1] : "Anonymous";
    const clientName = clientTag ? clientTag[1] : null;
    const pubkeyHash = event.pubkey.slice(-4);
    const time = new Date(event.created_at * 1000).toLocaleTimeString();
    const date = new Date(event.created_at * 1000).toLocaleDateString();
    const isToday = new Date().toDateString() === new Date(event.created_at * 1000).toDateString();
    
    // Check for invalid geohash and log it
    const eventGeohash = (geoTag ? geoTag[1] : "").toLowerCase();
    if (eventGeohash && !VALID_GEOHASH_CHARS.test(eventGeohash)) {
      console.log(`Invalid geohash detected in message: "${eventGeohash}" from user ${username || 'anonymous'} (${pubkeyHash})`);
      console.log(`Message content: "${event.content?.slice(0, 100)}${event.content && event.content.length > 100 ? '...' : ''}"`);
    }
    
    const userColors = generateUserColors(event.pubkey);

    return (
      <div
        style={{
          paddingBottom: isMobileView ? "16px" : "12px", // Consistent spacing
        }}
      >
        <div
          style={{
            margin: isMobileView ? "0 20px 0 20px" : "0 10px 0 10px",
            padding: isMobileView ? "16px 20px" : "12px 16px",
            background: userColors.background,
            border: `1px solid ${userColors.border}`,
            borderLeft: `4px solid ${userColors.leftBorder}`,
            borderRadius: isMobileView ? "8px" : "4px",
            opacity: 1,
            transition: "all 0.2s ease",
            cursor: "pointer",
            boxShadow: `0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 0 ${userColors.glow}`,
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
            e.currentTarget.style.background = userColors.backgroundHover;
            e.currentTarget.style.borderColor = userColors.borderHover;
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = `0 4px 12px rgba(0, 0, 0, 0.4), 0 0 8px ${userColors.glow}`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = userColors.background;
            e.currentTarget.style.borderColor = userColors.border;
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = `0 2px 8px rgba(0, 0, 0, 0.3), 0 0 0 0 ${userColors.glow}`;
          }}
        >
          {/* <code>
            {JSON.stringify(event)}
          </code> */}
          <div style={{
                display: "flex",
                alignItems: "center",
                gap: "4px"
              }}>
                <span 
                  style={{
                    color: userColors.username,
                    fontSize: isMobileView ? "14px" : "12px",
                    fontFamily: "Courier New, monospace",
                    fontWeight: "bold",
                    cursor: onSearch ? "pointer" : "default",
                    transition: "all 0.2s ease"
                  }}
                  onClick={onSearch ? () => onSearch(addUserToSearch(searchText, username, pubkeyHash)) : undefined}
                >
                  &lt;@{username}
                </span>
                <span 
                  style={{
                    color: userColors.username,
                    fontSize: isMobileView ? "12px" : "10px",
                    fontFamily: "monospace",
                    fontWeight: "normal",
                    opacity: 0.8,
                    cursor: onSearch ? "pointer" : "default",
                    transition: "all 0.2s ease"
                  }}
                  onClick={onSearch ? () => onSearch(addUserToSearch(searchText, username, pubkeyHash)) : undefined}
                >
                  #{pubkeyHash}&gt;
                </span>
              </div>
          <div style={{ 
            color: userColors.message, 
            fontSize: isMobileView ? "15px" : "12px", 
            lineHeight: isMobileView ? "1.6" : "1.5",
            wordWrap: "break-word",
            whiteSpace: "pre-wrap",
            fontFamily: "Courier New, monospace",
            letterSpacing: "0.3px",
            marginBottom: "8px"
          }}>
            {event.content || "[No content]"}
          </div>
          <div style={{ 
            marginBottom: isMobileView ? "8px" : "4px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: "8px"
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              flex: 1
            }}>
              
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: isMobileView ? "11px" : "9px",
                flexWrap: "wrap"
              }}>
                <span style={{ 
                  color: userColors.message,
                  background: "rgba(0, 0, 0, 0.5)",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  fontFamily: "monospace"
                }}>
                  [{isToday ? time : `${date} ${time}`}]
                </span>
                  <span 
                    style={{ 
                      color: userColors.username,
                      background: userColors.background,
                      border: `1px solid ${userColors.border}`,
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontFamily: "monospace",
                      fontWeight: "bold",
                      cursor: onSearch ? "pointer" : "default",
                      transition: "all 0.2s ease"
                    }}
                    onClick={onSearch ? () => onSearch(addGeohashToSearch(searchText, rawGeohash.toLowerCase())) : undefined}
                  >
                    {
                      eventGeohash ? `#${eventGeohash.toUpperCase()}` : `#${groupTagValue.toUpperCase()}`
                    }
                  </span>
                  {clientName && (
                    <span style={{
                      color: "#888",
                      background: "rgba(0, 0, 0, 0.3)",
                      padding: "2px 6px",
                      borderRadius: "3px",
                      fontFamily: "monospace",
                      fontSize: isMobileView ? "10px" : "8px",
                      border: "1px solid #333"
                    }}>
                      via {clientName}
                    </span>
                  )}
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
                        background: "rgba(0, 100, 0, 0.6)",
                        color: "#00ff00",
                        border: "1px solid #00aa00",
                        borderRadius: "3px",
                        padding: "2px 6px",
                        fontSize: isMobileView ? "10px" : "8px",
                        fontFamily: "monospace",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        userSelect: "none"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "rgba(0, 150, 0, 0.8)";
                        e.currentTarget.style.transform = "scale(1.05)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "rgba(0, 100, 0, 0.6)";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                    >
                      ↪ Reply
                    </button>
                  )}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    );
  }, [sortedEvents, isMobileView, onSearch, searchText, generateUserColors, onReply]);

  // Auto-scroll when new events arrive
  useEffect(() => {
    if (sortedEvents.length === 0) return;
    
    // Auto-scroll to bottom if user was at bottom and hasn't manually scrolled
    if (isAtBottom && !userScrolled) {
      setTimeout(() => scrollToBottom('smooth'), 100);
    }
  }, [sortedEvents.length, isAtBottom, userScrolled, scrollToBottom]);
  
  // Reset user scroll state when search changes
  useEffect(() => {
    setUserScrolled(false);
    setIsAtBottom(true);
    
    // Scroll to bottom after search change
    if (virtuosoRef.current && sortedEvents.length > 0) {
      setTimeout(() => scrollToBottom('auto'), 50);
    }
  }, [searchText, scrollToBottom]);

  // Handle force scroll to bottom prop
  useEffect(() => {
    if (forceScrollToBottom && virtuosoRef.current && sortedEvents.length > 0) {
      scrollToBottom('auto');
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: "#00aa00",
          fontFamily: "Courier New, monospace",
          fontSize: "14px",
          textAlign: "center",
          padding: "20px",
        }}
      >
        <div>
          <div style={{ marginBottom: "10px" }}>NO EVENTS FOUND</div>
          {searchText && (
            <div style={{ fontSize: "12px", opacity: 0.7 }}>
              No events matching: "{searchText}"
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        position: isMobileView ? "relative" : "absolute",
        bottom: isMobileView ? "auto" : "10px",
        right: isMobileView ? "auto" : "10px",
        width: isMobileView ? "100%" : "auto",
        height: isMobileView ? "100%" : "auto",
        zIndex: 1000,
        background: isMobileView ? "#000000" : "rgba(0, 0, 0, 0.8)",
        border: isMobileView ? "none" : "1px solid #003300",
        borderRadius: "0px",
        maxWidth: isMobileView ? "100%" : "400px",
        maxHeight: isMobileView ? "100%" : "400px",
        fontSize: isMobileView ? "14px" : "10px",
        display: "flex",
        flexDirection: "column",
        margin: isMobileView ? "0" : "auto",
      }}
    >
      {!isMobileView && (
        <div
          style={{
            position: "sticky",
            top: 0,
            backgroundColor: "rgba(0, 0, 0, 0.95)",
            border: "1px solid #003300",
            borderBottom: "2px solid #00ff00",
            padding: "10px",
            margin: "-1px -1px 0 -1px",
            color: "#00aa00",
            fontWeight: "bold",
            zIndex: 10,
          }}
        >
          <div style={{ 
            marginBottom: "5px",
            fontSize: "12px",
            textTransform: "uppercase",
            letterSpacing: "1px",
            textShadow: "0 0 10px rgba(0, 255, 0, 0.5)"
          }}>
            RECENT NOSTR EVENTS
          </div>
          {searchText && (
            <div style={{ 
              fontSize: "10px", 
              color: "#00ff00",
              background: "rgba(0, 255, 0, 0.1)",
              padding: "2px 4px",
              borderRadius: "4px",
              border: "1px solid rgba(0, 255, 0, 0.3)"
            }}>
              SEARCH: "{searchText}"
            </div>
          )}
          {!searchText && (
            <div style={{ 
              fontSize: "9px", 
              color: "#00aa00",
              fontStyle: "italic",
              opacity: 0.8
            }}>
              Showing latest {sortedEvents.length} events from the network
            </div>
          )}
        </div>
      )}
      
      {/* Virtual scrolling list with Virtuoso */}
      <div style={{ flex: 1, position: "relative" }}>
        <Virtuoso
          ref={virtuosoRef}
          data={sortedEvents}
          overscan={200}
          increaseViewportBy={{ top: 1000, bottom: 1000 }}
          alignToBottom
          followOutput={(isAtBottom) => {
            // Only follow output if user hasn't manually scrolled up
            if (isAtBottom || !userScrolled) {
              return 'smooth';
            }
            return false;
          }}
          atBottomStateChange={handleAtBottomStateChange}
          rangeChanged={handleRangeChanged}
          itemContent={(index) => <EventItem index={index} />}
          style={{
            height: '100%',
          }}
          computeItemKey={(index) => sortedEvents[index]?.id || index}
        />
        
        {/* Scroll to bottom button */}
        {userScrolled && !isAtBottom && (
          <button
            onClick={() => scrollToBottom('smooth')}
            style={{
              position: "absolute",
              bottom: isMobileView ? "70px" : "50px",
              right: isMobileView ? "30px" : "20px",
              backgroundColor: "rgba(0, 255, 0, 0.9)",
              color: "#000000",
              border: "none",
              borderRadius: "50%",
              width: isMobileView ? "50px" : "40px",
              height: isMobileView ? "50px" : "40px",
              cursor: "pointer",
              fontSize: isMobileView ? "20px" : "16px",
              fontWeight: "bold",
              boxShadow: "0 4px 12px rgba(0, 255, 0, 0.3)",
              transition: "all 0.2s ease",
              zIndex: 1000,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(0, 255, 0, 1)";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(0, 255, 0, 0.9)";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            ↓
          </button>
        )}
      </div>
    </div>
  );
}
