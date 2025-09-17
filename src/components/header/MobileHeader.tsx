import { globalStyles } from "../../styles";
import type { NostrEvent } from "../../types";
import { ThemedButton } from "../common/ThemedButton";
import { ThemedInput } from "../common/ThemedInput";

interface MobileHeaderProps {
  activeView: "map" | "chat" | "panel" | "radio" | "admin";
  onViewChange: (view: "map" | "chat" | "panel" | "radio" | "admin") => void;
  searchText: string;
  onSearch: (value: string) => void;
  zoomedGeohash: string | null;
  nostrEnabled?: boolean;
  filteredEventsCount?: number;
  totalEventsCount?: number;
  hierarchicalCounts?: { direct: number; total: number };
  allStoredEvents?: NostrEvent[];
  onLoginClick?: () => void;
  onSettingsClick?: () => void;
  theme?: "matrix" | "material";
  onThemeChange?: (next: "matrix" | "material") => void;
}

const styles = globalStyles["MobileHeader"];
export function MobileHeader({
  activeView,
  onViewChange,
  searchText,
  onSearch,
  zoomedGeohash,
  nostrEnabled = false,
  filteredEventsCount = 0,
  totalEventsCount = 0,
  allStoredEvents = [],
  onLoginClick,
  onSettingsClick,
  theme = "matrix",
}: MobileHeaderProps) {
  // avoid unused warnings for props not yet used
  void zoomedGeohash;
  void allStoredEvents;

  const t = styles[theme];

  return (
    <header className={t.header}>
      <div className="flex items-center gap-2 mb-0">
        <img src={`/favicon${theme === "matrix" ? ".webp" : `_${theme}.webp`}`} alt="bitchat.land" className="w-12 h-12 -ml-3" />
        <div className={t.logoText}>bitchat.land</div>
      </div>

      <div className="flex gap-1 justify-center w-full max-w-md">
        {/* <ThemedButton
          onClick={() => onViewChange("panel")}
          active={activeView === "panel"}
          theme={theme}
          className="flex-1 px-3 py-2 text-sm text-center"
        >
          menu
        </ThemedButton> */}
        <ThemedButton
          onClick={() => onViewChange("map")}
          active={activeView === "map"}
          theme={theme}
          className="flex-1 px-3 py-2 text-sm text-center"
        >
          map
        </ThemedButton>
        <ThemedButton
          onClick={() => onViewChange("chat")}
          active={activeView === "chat"}
          theme={theme}
          className="flex-1 px-3 py-2 text-sm text-center"
        >
          chat
        </ThemedButton>
        <ThemedButton
          onClick={() => onViewChange("radio")}
          active={activeView === "radio"}
          theme={theme}
          className="flex-1 px-3 py-2 text-sm text-center"
        >
          radio
        </ThemedButton>
        <ThemedButton
          onClick={onLoginClick}
          theme={theme}
          className="flex-1 px-3 py-2 text-sm text-center"
        >
          login
        </ThemedButton>
        <ThemedButton
          as="a"
          href="https://bitchat.free/"
          target="_blank"
          rel="noopener noreferrer"
          theme={theme}
          className="flex-1 px-3 py-2 text-sm text-center"
        >
          download
        </ThemedButton>
        <ThemedButton
          onClick={onSettingsClick}
          theme={theme}
          className="flex-1 px-3 py-2 text-sm text-center"
        >
          settings
        </ThemedButton>
      </div>

      <div className="w-full mt-2 mb-4 px-4">
        <div className="flex flex-col gap-2 mx-auto max-w-md">
          {/* Search Input */}
          <div className="flex gap-2 items-center">
            <div className="relative w-full">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  className={t.searchIcon}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
              </div>
              <ThemedInput
                value={searchText}
                onChange={(e) => onSearch((e.target as HTMLInputElement).value)}
                placeholder="hello in:dr5r from:@jack"
                theme={theme}
                className={`my-2 w-full pl-9 pr-3 py-2 ${
                  theme === "matrix"
                    ? "focus:shadow-[0_0_5px_rgba(0,255,0,0.5)]"
                    : "focus:ring-2 focus:ring-blue-600"
                }`}
              />
            </div>
            {searchText && (
              <button onClick={() => onSearch("")} className={t.clearButton}>
                ✕
              </button>
            )}
          </div>
          
                  </div>

      {((activeView === "chat" && nostrEnabled) || activeView === "panel") && (
        <div className={t.separator} />
      )}

      {activeView === "panel" && (
        <div className={t.subheader}>
          <div className={t.subheaderTitle}>
            {searchText ? `SEARCH RESULTS FOR "${searchText}"` : "ALL GEOHASH REGIONS"}
          </div>
          <div className={t.statsBadge}>
            {searchText
              ? `FOUND: ${filteredEventsCount} MATCHING EVENTS`
              : `TOTAL: ${totalEventsCount} EVENTS`}
          </div>
        </div>
      )}

        <div className={t.separator} />
      </div>
    </header>

  );
}

