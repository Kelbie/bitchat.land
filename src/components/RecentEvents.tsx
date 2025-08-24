import React from "react";
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
      {filteredEvents.slice().reverse().map((event, i) => {
        const geoTag = event.tags.find((tag: any) => tag[0] === "g");
        const geohash = geoTag ? geoTag[1] : "unknown";
        const time = new Date(event.created_at * 1000).toLocaleTimeString();
        const date = new Date(event.created_at * 1000).toLocaleDateString();
        const isToday = new Date().toDateString() === new Date(event.created_at * 1000).toDateString();

        return (
          <div
            key={event.id}
            style={{
              padding: isMobileView ? "16px 20px" : "8px 12px",
              background: "linear-gradient(135deg, rgba(0, 50, 0, 0.4), rgba(0, 30, 0, 0.2))",
              border: "1px solid rgba(0, 204, 0, 0.3)",
              borderLeft: "4px solid #00ff00",
              borderRadius: isMobileView ? "8px" : "4px",
              opacity: 1,
              transition: "all 0.2s ease",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 80, 0, 0.5), rgba(0, 50, 0, 0.3))";
              e.currentTarget.style.borderColor = "rgba(0, 204, 0, 0.6)";
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 4px 12px rgba(0, 255, 0, 0.2)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 50, 0, 0.4), rgba(0, 30, 0, 0.2))";
              e.currentTarget.style.borderColor = "rgba(0, 204, 0, 0.3)";
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.3)";
            }}
          >
            <div style={{ 
              marginBottom: isMobileView ? "8px" : "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "8px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: isMobileView ? "12px" : "10px"
              }}>
                <span style={{ 
                  color: "#00aa00",
                  background: "rgba(0, 0, 0, 0.5)",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  fontFamily: "monospace"
                }}>
                  [{isToday ? time : `${date} ${time}`}]
                </span>
                <span style={{ 
                  color: "#00ff00",
                  background: "rgba(0, 255, 0, 0.1)",
                  padding: "2px 6px",
                  borderRadius: "3px",
                  fontFamily: "monospace",
                  fontWeight: "bold"
                }}>
                  #{geohash.toUpperCase()}
                </span>
              </div>
            </div>
            <div style={{ 
              color: "#00dd00", 
              fontSize: isMobileView ? "15px" : "12px", 
              lineHeight: isMobileView ? "1.6" : "1.5",
              wordWrap: "break-word",
              whiteSpace: "pre-wrap",
              fontFamily: "system-ui, -apple-system, sans-serif",
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
