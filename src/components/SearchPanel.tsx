import React from "react";

interface SearchPanelProps {
  searchGeohash: string;
  onSearch: (value: string) => void;
  zoomedGeohash: string | null;
  isMobileView?: boolean;
}

export function SearchPanel({ searchGeohash, onSearch, zoomedGeohash, isMobileView = false }: SearchPanelProps) {
  const isMobile = isMobileView || window.innerWidth <= 768;
  
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        maxWidth: isMobile ? "100%" : "300px",
        margin: isMobile ? "0" : "0 0 0 auto",
        top: isMobile ? "0" : "10px",
        right: isMobile ? "0" : "10px",
        zIndex: 1000,
        background: "rgba(0, 0, 0, 0.9)",
        border: "1px solid #003300",
        borderRadius: isMobile ? "6px" : "0px",
        display: "flex",
        flexDirection: "column",
        backdropFilter: isMobile ? "blur(10px)" : "none",
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
          margin: "-1px -1px 0 -1px",
          color: "#00aa00",
          fontWeight: "bold",
          zIndex: 10,
        }}
      >
        <div style={{ marginBottom: "5px" }}>
          SEARCH:
        </div>
        {zoomedGeohash && (
          <div style={{ fontSize: "10px", color: "#00ff00" }}>
            CURRENT: "{zoomedGeohash.toUpperCase()}"
          </div>
        )}
      </div>
      <div
        style={{
          padding: "10px",
        }}
      >
      <input
        type="text"
        value={searchGeohash}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="e.g. 21m"
        style={{
          padding: isMobile ? "12px 16px" : "4px 8px",
          background: "#000000",
          color: "#00ff00",
          border: "1px solid #00ff00",
          borderRadius: isMobile ? "4px" : "0px",
          fontSize: isMobile ? "16px" : "12px",
          fontFamily: "Courier New, monospace",
          width: "100%",
          outline: "none",
          minHeight: isMobile ? "44px" : "auto",
        }}
        onFocus={(e) => {
          e.target.style.border = "1px solid #00ff00";
          e.target.style.boxShadow = "0 0 5px rgba(0, 255, 0, 0.5)";
        }}
        onBlur={(e) => {
          e.target.style.border = "1px solid #00ff00";
          e.target.style.boxShadow = "none";
        }}
      />
      <button
        onClick={() => onSearch("")}
        style={{
          padding: isMobile ? "12px 16px" : "4px 8px",
          background: "#003300",
          color: "#00ff00",
          border: "1px solid #00ff00",
          borderRadius: isMobile ? "4px" : "0px",
          cursor: "pointer",
          fontSize: isMobile ? "14px" : "10px",
          fontFamily: "Courier New, monospace",
          textTransform: "uppercase",
          marginTop: "5px",
          width: "100%",
          minHeight: isMobile ? "44px" : "auto",
        }}
      >
        RESET
      </button>
      <button
        onClick={() => {
          // Copy npub to clipboard and show visual feedback
          const npub = "npub1your_public_key_here"; // Replace with actual npub
          navigator.clipboard.writeText(npub).then(() => {
            // Visual feedback - briefly change button text
            const button = document.getElementById('follow-nostr-btn');
            if (button) {
              const originalText = button.textContent;
              button.textContent = "COPIED!";
              button.style.background = "#004400";
              setTimeout(() => {
                button.textContent = originalText;
                button.style.background = "#330066";
              }, 1000);
            }
          }).catch(() => {
            // Fallback - open nostr client or show instructions
            window.open('https://nostr.com/nprofile1qqsvvullpd0j9rltp2a3qqvgy9udf3vgh389p7zhzu65fd258dz5lqgpqqtlt0d2', '_blank');
          });
        }}
        id="follow-nostr-btn"
        style={{
          padding: isMobile ? "12px 16px" : "4px 8px",
          background: "#330066",
          color: "#bb88ff",
          border: "1px solid #bb88ff",
          borderRadius: isMobile ? "4px" : "0px",
          cursor: "pointer",
          fontSize: isMobile ? "14px" : "10px",
          fontFamily: "Courier New, monospace",
          textTransform: "uppercase",
          marginTop: "5px",
          width: "100%",
          minHeight: isMobile ? "44px" : "auto",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = "#440077";
          e.currentTarget.style.borderColor = "#cc99ff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = "#330066";
          e.currentTarget.style.borderColor = "#bb88ff";
        }}
      >
        FOLLOW ME ON NOSTR
      </button>
      </div>
    </div>
  );
}
