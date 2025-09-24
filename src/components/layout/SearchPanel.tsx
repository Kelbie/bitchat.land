import React from "react";
import { globalStyles } from "@/styles";

interface SearchPanelProps {
  searchText: string;
  onSearch: (value: string) => void;
  zoomedGeohash: string | null;
  isMobileView?: boolean;
  theme?: "matrix" | "material";
}

const styles = globalStyles["SearchPanel"];
export function SearchPanel({
  searchText,
  onSearch,
  zoomedGeohash,
  isMobileView = false,
  theme = "matrix",
}: SearchPanelProps) {
  const t = styles[theme];

  return (
    <div className={`${t.container} ${isMobileView ? t.containerMobile : ""}`}>
      <div className={t.header}>
        <div className="mb-1">SEARCH MESSAGES:</div>
        {zoomedGeohash && (
          <div className={t.current}>
            CURRENT: "{zoomedGeohash.toUpperCase()}"
          </div>
        )}
      </div>
      <div className={t.body}>
        <div className={t.inputWrapper}>
          <div className={t.icon}>
            <svg
              width={isMobileView ? 16 : 14}
              height={isMobileView ? 16 : 14}
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme === "matrix" ? "#00aa00" : "#4b5563"}
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
            className={`${t.input} ${isMobileView ? t.inputMobile : ""}`}
          />
        </div>
        <button
          onClick={() => onSearch("")}
          className={`${t.button} ${isMobileView ? t.buttonMobile : ""}`}
        >
          RESET
        </button>
        <button
          onClick={() => {
            window.open(
              "https://primal.net/p/nprofile1qqsvvullpd0j9rltp2a3qqvgy9udf3vgh389p7zhzu65fd258dz5lqg9ryan5",
              "_blank"
            );
          }}
          id="follow-nostr-btn"
          className={`${t.followButton} ${
            isMobileView ? t.followButtonMobile : ""
          }`}
        >
          FOLLOW ME ON NOSTR
        </button>
      </div>
    </div>
  );
}
