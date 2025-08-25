// import React from "react"; // Not needed for JSX

interface MobileHeaderProps {
  activeView: "map" | "chat" | "panel";
  onViewChange: (view: "map" | "chat" | "panel") => void;
  searchText: string;
  onSearch: (value: string) => void;
  zoomedGeohash: string | null;
  // Content header props
  nostrEnabled?: boolean;
  filteredEventsCount?: number;
  totalEventsCount?: number;
  hierarchicalCounts?: { direct: number; total: number };
}

export function MobileHeader({
  activeView,
  onViewChange,
  searchText,
  onSearch,
  zoomedGeohash,
  nostrEnabled = false,
  filteredEventsCount = 0,
  totalEventsCount = 0,
  hierarchicalCounts = { direct: 0, total: 0 },
}: MobileHeaderProps) {
  return (
    <header
      style={{
        backgroundColor: "rgba(0, 0, 0, 0.95)",
        backdropFilter: "blur(10px)",
        border: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: "Courier New, monospace",
        flexShrink: 0,
        padding: "8px 16px 10px 16px",
      }}
    >
      {/* Brand Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "0px",
        }}
      >
        <img
          src="/favicon.webp"
          alt="bitchat.land"
          style={{ width: "48px", height: "48px", marginLeft: "-12px" }}
        />
        <div
          style={{
            color: "#00ff00",
            fontSize: "18px",
            fontWeight: "bold",
            textTransform: "uppercase",
            letterSpacing: "1px",
            textShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
            marginLeft: "-8px",
          }}
        >
          bitchat.land
        </div>
      </div>

      {/* Navigation Toggles */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          justifyContent: "center",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        {/* Menu Button (Panel) */}
        <button
          onClick={() => onViewChange("panel")}
          style={{
            flex: 1,
            padding: "8px 12px",
            background:
              activeView === "panel" ? "#00ff00" : "rgba(0, 0, 0, 0.7)",
            color: activeView === "panel" ? "#000000" : "#00ff00",
            border: "1px solid #00ff00",
            borderRadius: "0",
            cursor: "pointer",
            fontSize: "14px",
            fontFamily: "Courier New, monospace",
            textTransform: "uppercase",
            fontWeight: "bold",
            transition: "all 0.2s ease",
            textAlign: "center",
            boxShadow:
              activeView === "panel" ? "0 0 10px rgba(0, 255, 0, 0.5)" : "none",
          }}
          onMouseEnter={(e) => {
            if (activeView !== "panel") {
              e.currentTarget.style.background = "rgba(0, 255, 0, 0.1)";
              e.currentTarget.style.boxShadow = "0 0 5px rgba(0, 255, 0, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeView !== "panel") {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
        >
          menu
        </button>

        {/* Map Button */}
        <button
          onClick={() => onViewChange("map")}
          style={{
            flex: 1,
            padding: "8px 12px",
            background: activeView === "map" ? "#00ff00" : "rgba(0, 0, 0, 0.7)",
            color: activeView === "map" ? "#000000" : "#00ff00",
            border: "1px solid #00ff00",
            borderRadius: "0",
            cursor: "pointer",
            fontSize: "14px",
            fontFamily: "Courier New, monospace",
            textTransform: "uppercase",
            fontWeight: "bold",
            transition: "all 0.2s ease",
            textAlign: "center",
            boxShadow:
              activeView === "map" ? "0 0 10px rgba(0, 255, 0, 0.5)" : "none",
          }}
          onMouseEnter={(e) => {
            if (activeView !== "map") {
              e.currentTarget.style.background = "rgba(0, 255, 0, 0.1)";
              e.currentTarget.style.boxShadow = "0 0 5px rgba(0, 255, 0, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeView !== "map") {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
        >
          map
        </button>

        {/* Chat Button */}
        <button
          onClick={() => onViewChange("chat")}
          style={{
            flex: 1,
            padding: "8px 12px",
            background:
              activeView === "chat" ? "#00ff00" : "rgba(0, 0, 0, 0.7)",
            color: activeView === "chat" ? "#000000" : "#00ff00",
            border: "1px solid #00ff00",
            borderRadius: "0",
            cursor: "pointer",
            fontSize: "14px",
            fontFamily: "Courier New, monospace",
            textTransform: "uppercase",
            fontWeight: "bold",
            transition: "all 0.2s ease",
            textAlign: "center",
            boxShadow:
              activeView === "chat" ? "0 0 10px rgba(0, 255, 0, 0.5)" : "none",
          }}
          onMouseEnter={(e) => {
            if (activeView !== "chat") {
              e.currentTarget.style.background = "rgba(0, 255, 0, 0.1)";
              e.currentTarget.style.boxShadow = "0 0 5px rgba(0, 255, 0, 0.3)";
            }
          }}
          onMouseLeave={(e) => {
            if (activeView !== "chat") {
              e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
              e.currentTarget.style.boxShadow = "none";
            }
          }}
        >
          chat
        </button>

        {/* Download Button */}
        <a
          href="https://bitchat.free/"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            padding: "8px 12px",
            background: "rgba(0, 0, 0, 0.7)",
            color: "#00ff00",
            border: "1px solid #00ff00",
            borderRadius: "0",
            cursor: "pointer",
            fontSize: "14px",
            fontFamily: "Courier New, monospace",
            textTransform: "uppercase",
            fontWeight: "bold",
            transition: "all 0.2s ease",
            textAlign: "center",
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0, 255, 0, 0.1)";
            e.currentTarget.style.boxShadow = "0 0 5px rgba(0, 255, 0, 0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0, 0, 0, 0.7)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          download
        </a>
      </div>

      {/* Search Section */}
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          marginTop: "8px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "8px",
            alignItems: "center",
          }}
        >
          <div style={{
            position: "relative",
            flex: 1,
            display: "flex",
            alignItems: "center"
          }}>
            {/* Search Icon */}
            <div style={{
              position: "absolute",
              left: "12px",
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 1,
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#00aa00"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            
            <input
              type="text"
              value={searchText}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="hello in:nyc from:@jack"
              style={{
                flex: 1,
                padding: "8px 12px 8px 36px", // Add left padding for icon
                background: "rgba(0, 0, 0, 0.8)",
                color: "#00ff00",
                border: "1px solid #00ff00",
                borderRadius: "4px",
              fontSize: "14px",
              fontFamily: "Courier New, monospace",
              outline: "none",
              minHeight: "36px",
            }}
            onFocus={(e) => {
              e.target.style.boxShadow = "0 0 5px rgba(0, 255, 0, 0.5)";
            }}
            onBlur={(e) => {
              e.target.style.boxShadow = "none";
            }}
            />
          </div>
          {searchText && (
            <button
              onClick={() => onSearch("")}
              style={{
                padding: "8px 12px",
                background: "rgba(0, 50, 0, 0.8)",
                color: "#00ff00",
                border: "1px solid #00ff00",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "12px",
                fontFamily: "Courier New, monospace",
                textTransform: "uppercase",
                minHeight: "36px",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(0, 100, 0, 0.8)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(0, 50, 0, 0.8)";
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Separator Bar - Only show if there's sub header content */}
      {((activeView === "chat" && nostrEnabled) || activeView === "panel") && (
        <div
          style={{
            width: "100%",
            height: "2px",
            background:
              "linear-gradient(90deg, transparent 0%, #00ff00 20%, #00ff00 80%, transparent 100%)",
            boxShadow: "0 0 4px rgba(0, 255, 0, 0.5)",
          }}
        />
      )}

      {/* Content Headers */}
      {((activeView === "chat" && nostrEnabled) || activeView === "panel") && (
        <div
          style={{
            width: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.98)",
            padding: "12px 20px",
            color: "#00aa00",
            fontWeight: "bold",
            backdropFilter: "blur(10px)",
          }}
        >
          {activeView === "chat" && nostrEnabled && (
            <>
              <div
                style={{
                  marginBottom: "6px",
                  fontSize: "16px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  textShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
                }}
              >
                RECENT NOSTR EVENTS {searchText ? `MATCHING "${searchText}"` : ""}
              </div>
              {searchText && (
                <div
                  style={{
                    fontSize: "11px",
                    color: "#00ff00",
                    background: "rgba(0, 255, 0, 0.1)",
                    padding: "3px 6px",
                    borderRadius: "4px",
                    border: "1px solid rgba(0, 255, 0, 0.3)",
                    display: "inline-block",
                  }}
                >
                  FOUND {filteredEventsCount} EVENTS
                </div>
              )}

            </>
          )}

          {activeView === "panel" && (
            <>
              <div
                style={{
                  marginBottom: "6px",
                  fontSize: "16px",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                  textShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
                }}
              >
                {searchText
                  ? `SEARCH RESULTS FOR "${searchText}"`
                  : "ALL GEOHASH REGIONS"}
              </div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#00ff00",
                  background: "rgba(0, 255, 0, 0.1)",
                  padding: "3px 6px",
                  borderRadius: "4px",
                  border: "1px solid rgba(0, 255, 0, 0.3)",
                  display: "inline-block",
                }}
              >
                {searchText
                  ? `FOUND: ${filteredEventsCount} MATCHING EVENTS`
                  : `TOTAL: ${totalEventsCount} EVENTS`}
              </div>
            </>
          )}
        </div>
      )}

      {/* Bottom Separator Bar - Only show if there's sub header content */}
      {/* {((activeView === 'chat' && nostrEnabled) || activeView === 'panel') && ( */}
      <div
        style={{
          width: "100%",
          height: "2px",
          background:
            "linear-gradient(90deg, transparent 0%, #00ff00 20%, #00ff00 80%, transparent 100%)",
          boxShadow: "0 0 4px rgba(0, 255, 0, 0.5)",
        }}
      />
      {/* )} */}
    </header>
  );
}
