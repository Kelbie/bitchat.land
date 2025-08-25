// import React from "react"; // Not needed for JSX in this file

interface SearchPanelProps {
  searchText: string;
  onSearch: (value: string) => void;
  zoomedGeohash: string | null;
  isMobileView?: boolean;
}

export function SearchPanel({ searchText, onSearch, zoomedGeohash, isMobileView = false }: SearchPanelProps) {
  const isMobile = isMobileView;
  
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
          SEARCH MESSAGES:
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
      <div style={{
        position: "relative",
        display: "flex",
        alignItems: "center"
      }}>
        {/* Search Icon */}
        <div style={{
          position: "absolute",
          left: isMobile ? "12px" : "8px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 1,
          pointerEvents: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <svg
            width={isMobile ? "16" : "14"}
            height={isMobile ? "16" : "14"}
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
            padding: isMobile ? "12px 16px 12px 40px" : "4px 8px 4px 28px", // Add left padding for icon
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
      </div>
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
          // Open Primal profile
          window.open('https://primal.net/p/nprofile1qqsvvullpd0j9rltp2a3qqvgy9udf3vgh389p7zhzu65fd258dz5lqg9ryan5', '_blank');
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
