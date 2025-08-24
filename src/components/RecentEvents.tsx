import React from "react";
import { NostrEvent } from "../types";

interface RecentEventsProps {
  nostrEnabled: boolean;
  searchGeohash: string;
  allStoredEvents: NostrEvent[];
  recentEvents: NostrEvent[];
}

export function RecentEvents({ 
  nostrEnabled, 
  searchGeohash, 
  allStoredEvents, 
  recentEvents 
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
        position: "absolute",
        bottom: "10px",
        right: "10px",
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.8)",
        border: "1px solid #003300",
        borderRadius: "0px",
        maxWidth: "400px",
        maxHeight: "400px",
        fontSize: "10px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          backgroundColor: "rgba(0, 0, 0, 0.95)",
          border: "1px solid #003300",
          borderBottom: "1px solid #00ff00",
          padding: "10px",
          margin: "-1px -1px 0 -1px", // Offset container border
          color: "#00aa00",
          fontWeight: "bold",
          zIndex: 10,
        }}
      >
        <div style={{ marginBottom: "5px" }}>
          RECENT NOSTR EVENTS:
        </div>
        {searchGeohash && (
          <div style={{ fontSize: "10px", color: "#00ff00" }}>
            FILTER: "{searchGeohash.toUpperCase()}"
          </div>
        )}
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px",
        }}
      >
      {filteredEvents.map((event, i) => {
        const geoTag = event.tags.find((tag: any) => tag[0] === "g");
        const geohash = geoTag ? geoTag[1] : "unknown";
        const time = new Date(event.created_at * 1000).toLocaleTimeString();

        return (
          <div
            key={event.id}
            style={{
              marginBottom: "8px",
              padding: "5px",
              background: "rgba(0, 50, 0, 0.3)",
              border: "1px solid #003300",
              opacity: 1, // Remove gradient - full opacity for readability
            }}
          >
            <div style={{ marginBottom: "2px" }}>
              <span style={{ color: "#00aa00" }}>[{time}]</span>{" "}
              <span style={{ color: "#00ff00" }}>#{geohash}</span>
            </div>
            <div style={{ 
              color: "#00cc00", 
              fontSize: "11px", 
              lineHeight: "1.4",
              wordWrap: "break-word",
              whiteSpace: "pre-wrap"
            }}>
              {event.content}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
}
