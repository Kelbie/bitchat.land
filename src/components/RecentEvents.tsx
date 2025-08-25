import { useEffect, useRef, useState, useCallback } from "react";
import { AutoSizer, CellMeasurer, CellMeasurerCache, List } from "react-virtualized";
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

}

export function RecentEvents({ 
  nostrEnabled, 
  searchText, 
  allStoredEvents, 
  recentEvents,
  isMobileView = false,
  onSearch,

}: RecentEventsProps) {
  const listRef = useRef<List>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [userScrolled, setUserScrolled] = useState(false);
  const [previousScrollTop, setPreviousScrollTop] = useState(0);
  const [previousListHeight, setPreviousListHeight] = useState(0);
  
  // CellMeasurer cache for dynamic heights
  const cache = useRef(
    new CellMeasurerCache({
      fixedWidth: true,
      defaultHeight: isMobileView ? 120 : 80,
    })
  );
  
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
    const eventGeohash = (geoTag ? geoTag[1] : "").toLowerCase();
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
    
    // Check geohash filters if specified
    if (parsedSearch.geohashes.length > 0 && matches) {
      const geohashMatch = parsedSearch.geohashes.some(searchGeohash => 
        eventGeohash.startsWith(searchGeohash.toLowerCase())
      );
      if (!geohashMatch) matches = false;
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
    
    // Debug logging
    if (hasSearchTerms) {
      console.log(`Filtering event: "${messageContent.slice(0, 30)}..." user: "${username}" geohash: "${eventGeohash}" - matches: ${matches}`);
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

  // Row renderer for react-virtualized
  const rowRenderer = useCallback(({ index, key, parent, style }: any) => {
    const event = sortedEvents[index];
    if (!event) return null;

    const geoTag = event.tags.find((tag: any) => tag[0] === "g");
    const nameTag = event.tags.find((tag: any) => tag[0] === "n");
    const geohash = geoTag ? geoTag[1] : "unknown";
    const username = nameTag ? nameTag[1] : "Anonymous";
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
      // @ts-expect-error - react-virtualized types issue with React 18
      <CellMeasurer
        cache={cache.current}
        columnIndex={0}
        key={key}
        parent={parent}
        rowIndex={index}
      >
        {({ measure, registerChild }) => (
          <div
            ref={registerChild}
            style={{
              ...style,
              paddingBottom: isMobileView ? "16px" : "12px", // Consistent spacing
            }}
            onLoad={measure}
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
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: isMobileView ? "11px" : "9px"
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
                      onClick={onSearch ? () => onSearch(addGeohashToSearch(searchText, geohash.toLowerCase())) : undefined}
                    >
                      #{geohash.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ 
                color: userColors.message, 
                fontSize: isMobileView ? "15px" : "12px", 
                lineHeight: isMobileView ? "1.6" : "1.5",
                wordWrap: "break-word",
                whiteSpace: "pre-wrap",
                fontFamily: "Courier New, monospace",
                letterSpacing: "0.3px"
              }}>
                {event.content || "[No content]"}
              </div>
            </div>
          </div>
        )}
      </CellMeasurer>
    );
  }, [sortedEvents, isMobileView, onSearch, searchText, generateUserColors]);

  // Handle scroll events with position preservation
  const handleScroll = useCallback(({ scrollTop, clientHeight, scrollHeight }: any) => {
    setPreviousScrollTop(scrollTop);
    
    // Check if user is at bottom
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50; // 50px threshold
    setIsAtBottom(isNearBottom);
    
    // Mark as user scrolled if not programmatically triggered
    if (!isAtBottom) {
      setUserScrolled(true);
    }
  }, [isAtBottom]);
  
  // YouTube-style position preservation when new messages arrive
  useEffect(() => {
    if (listRef.current && sortedEvents.length > 0) {
      const list = listRef.current;
      
      if (isAtBottom && !userScrolled) {
        // Auto-scroll to bottom if user was at bottom
        setTimeout(() => {
          list.scrollToRow(sortedEvents.length - 1);
        }, 0);
      } else if (userScrolled) {
        // Preserve reading position - this is the YouTube magic!
        const currentScrollHeight = (list as any).Grid?.getTotalHeight?.() || 0;
        const heightDifference = currentScrollHeight - previousListHeight;
        
        if (heightDifference > 0) {
          // New content added, adjust scroll position to maintain view
          const newScrollTop = previousScrollTop + heightDifference;
          list.scrollToPosition(newScrollTop);
        }
        
        setPreviousListHeight(currentScrollHeight);
      }
    }
  }, [sortedEvents.length, isAtBottom, userScrolled, previousScrollTop, previousListHeight]);
  
  // Reset user scroll state when search changes
  useEffect(() => {
    setUserScrolled(false);
    setIsAtBottom(true);
    cache.current.clearAll();
  }, [searchText]);

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
      
      {/* Virtual scrolling list with AutoSizer */}
      <div style={{ flex: 1, position: "relative" }}>
        {/* @ts-expect-error - react-virtualized types issue with React 18 */}
        <AutoSizer>
          {({ height, width }) => (
            // @ts-expect-error - react-virtualized types issue with React 18
            <List
              ref={listRef}
              height={height - (isMobileView ? 60 : 40)} // Account for bottom padding
              width={width}
              rowCount={sortedEvents.length}
              rowHeight={cache.current.rowHeight}
              rowRenderer={rowRenderer}
              onScroll={handleScroll}
              scrollToAlignment="end"
              deferredMeasurementCache={cache.current}
              overscanRowCount={5}
            />
          )}
        </AutoSizer>
        
        {/* Scroll to bottom button */}
        {userScrolled && !isAtBottom && (
          <button
            onClick={() => {
              if (listRef.current) {
                listRef.current.scrollToRow(sortedEvents.length - 1);
                setIsAtBottom(true);
                setUserScrolled(false);
              }
            }}
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
