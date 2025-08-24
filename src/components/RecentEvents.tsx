// import React from "react"; // Not needed for JSX in this file
import { NostrEvent } from "../types";

interface RecentEventsProps {
  nostrEnabled: boolean;
  searchGeohash: string;
  allStoredEvents: NostrEvent[];
  recentEvents: NostrEvent[];
  isMobileView?: boolean;
}

export function RecentEvents({ 
  nostrEnabled, 
  searchGeohash, 
  allStoredEvents, 
  recentEvents,
  isMobileView = false
}: RecentEventsProps) {
  if (!nostrEnabled) return null;

  // Use all stored events when searching, recent events when not searching
  const eventsToShow = searchGeohash ? allStoredEvents : recentEvents;
  const filteredEvents = eventsToShow.filter((event) => {
    if (!searchGeohash) return true; // Show all events when no search
    const geoTag = event.tags.find((tag: any) => tag[0] === "g");
    const eventGeohash = geoTag ? geoTag[1] : "";
    const matches = eventGeohash.startsWith(searchGeohash.toLowerCase());
    
    // Debug logging
    if (searchGeohash) {
      console.log(`Filtering event: ${eventGeohash} with search: ${searchGeohash}, matches: ${matches}`);
    }
    
    return matches;
  });

  if (filteredEvents.length === 0) return null;

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
      <div
        style={{
          position: "sticky",
          top: 0,
          backgroundColor: isMobileView ? "rgba(0, 0, 0, 0.98)" : "rgba(0, 0, 0, 0.95)",
          border: isMobileView ? "none" : "1px solid #003300",
          borderBottom: "2px solid #00ff00",
          padding: isMobileView ? "16px 20px" : "10px",
          margin: isMobileView ? "0 0 0 0" : "-1px -1px 0 -1px",
          color: "#00aa00",
          fontWeight: "bold",
          zIndex: 10,
          backdropFilter: isMobileView ? "blur(10px)" : "none",
        }}
      >
        <div style={{ 
          marginBottom: isMobileView ? "8px" : "5px",
          fontSize: isMobileView ? "18px" : "12px",
          textTransform: "uppercase",
          letterSpacing: "1px",
          textShadow: "0 0 10px rgba(0, 255, 0, 0.5)"
        }}>
          RECENT NOSTR EVENTS
        </div>
        {searchGeohash && (
          <div style={{ 
            fontSize: isMobileView ? "12px" : "10px", 
            color: "#00ff00",
            background: "rgba(0, 255, 0, 0.1)",
            padding: isMobileView ? "4px 8px" : "2px 4px",
            borderRadius: "4px",
            border: "1px solid rgba(0, 255, 0, 0.3)"
          }}>
            FILTER: "{searchGeohash.toUpperCase()}"
          </div>
        )}
        {!searchGeohash && (
          <div style={{ 
            fontSize: isMobileView ? "11px" : "9px", 
            color: "#00aa00",
            fontStyle: "italic",
            opacity: 0.8
          }}>
            Showing latest {filteredEvents.length} events from the network
          </div>
        )}
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: isMobileView ? "8px 20px 20px 20px" : "10px",
          display: "flex",
          flexDirection: "column-reverse",
          gap: isMobileView ? "12px" : "8px",
        }}
      >
      {filteredEvents.slice().reverse().map((event) => {
        const geoTag = event.tags.find((tag: any) => tag[0] === "g");
        const nameTag = event.tags.find((tag: any) => tag[0] === "n");
        const geohash = geoTag ? geoTag[1] : "unknown";
        const username = nameTag ? nameTag[1] : "Anonymous";
        const pubkeyHash = event.pubkey.slice(-4);
        const time = new Date(event.created_at * 1000).toLocaleTimeString();
        const date = new Date(event.created_at * 1000).toLocaleDateString();
        const isToday = new Date().toDateString() === new Date(event.created_at * 1000).toDateString();
        
        // Generate color based on pubkey hash
        const generateUserColors = (hash: string) => {
          let hashValue = 0;
          for (let i = 0; i < hash.length; i++) {
            hashValue = hash.charCodeAt(i) + ((hashValue << 5) - hashValue);
          }
          
          // Generate a hue using full spectrum
          const hue = Math.abs(hashValue % 360); // Full color wheel (0-360)
          const saturation = Math.abs(hashValue % 30) + 70; // 70-100% for vibrant colors
          const lightness = Math.abs(hashValue % 20) + 55; // 55-75% for good readability
          
          return {
            username: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
            message: `hsl(${hue}, ${Math.max(saturation - 20, 40)}%, ${Math.min(lightness + 10, 80)}%)`, // Slightly desaturated and lighter for readability
            background: `hsla(${hue}, ${Math.max(saturation - 40, 20)}%, ${Math.min(lightness - 30, 25)}%, 0.3)`, // Very dark, subtle background
            backgroundHover: `hsla(${hue}, ${Math.max(saturation - 30, 30)}%, ${Math.min(lightness - 20, 35)}%, 0.4)`, // Slightly brighter on hover
            border: `hsl(${hue}, ${Math.max(saturation - 30, 40)}%, ${Math.min(lightness - 10, 45)}%)`, // Border color
            borderHover: `hsl(${hue}, ${saturation}%, ${Math.min(lightness + 5, 60)}%)`, // Brighter border on hover
            leftBorder: `hsl(${hue}, ${saturation}%, ${lightness}%)`, // Left accent border
            glow: `hsla(${hue}, ${saturation}%, ${lightness}%, 0.2)` // Glow effect
          };
        };
        
        const userColors = generateUserColors(event.pubkey);

        return (
          <div
            key={event.id}
            style={{
              padding: isMobileView ? "16px 20px" : "8px 12px",
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
                {/* Username */}
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px"
                }}>
                  <span style={{
                    color: userColors.username,
                    fontSize: isMobileView ? "14px" : "12px",
                    fontFamily: "Courier New, monospace",
                    fontWeight: "bold"
                  }}>
                    &lt;@{username}
                  </span>
                  <span style={{
                    color: userColors.username,
                    fontSize: isMobileView ? "12px" : "10px",
                    fontFamily: "monospace",
                    fontWeight: "normal",
                    opacity: 0.8
                  }}>
                    #{pubkeyHash}&gt;
                  </span>
                </div>
                
                {/* Time and Location */}
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
                  <span style={{ 
                    color: userColors.username,
                    background: userColors.background,
                    border: `1px solid ${userColors.border}`,
                    padding: "2px 6px",
                    borderRadius: "3px",
                    fontFamily: "monospace",
                    fontWeight: "bold"
                  }}>
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
        );
      })}
      </div>
    </div>
  );
}
