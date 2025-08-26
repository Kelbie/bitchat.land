import type { NostrEvent } from "../types";
import { ThemedButton } from "./ThemedButton";
import { ThemedInput } from "./ThemedInput";

interface MobileHeaderProps {
  activeView: "map" | "chat" | "panel";
  onViewChange: (view: "map" | "chat" | "panel") => void;
  searchText: string;
  onSearch: (value: string) => void;
  zoomedGeohash: string | null;
  nostrEnabled?: boolean;
  filteredEventsCount?: number;
  totalEventsCount?: number;
  hierarchicalCounts?: { direct: number; total: number };
  allStoredEvents?: NostrEvent[];
  onLoginClick?: () => void;
  theme?: "matrix" | "material";
  onThemeChange?: (next: "matrix" | "material") => void;
}

const styles = {
  matrix: {
    header:
      "bg-black/95 backdrop-blur flex flex-col items-center font-mono flex-shrink-0 p-2 text-[#00ff00]",
    logoText:
      "text-[#00ff00] text-lg font-bold uppercase tracking-wider drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]",
    searchIcon: "stroke-[#00aa00]",
    clearButton:
      "px-3 py-2 bg-green-900/80 text-[#00ff00] border border-[#00ff00] rounded text-xs font-mono uppercase hover:bg-green-900",
    separator:
      "w-full h-0.5 bg-gradient-to-r from-transparent via-[#00ff00] to-transparent shadow-[0_0_4px_rgba(0,255,0,0.5)]",
    subheader:
      "w-full bg-black/95 px-5 py-3 text-[#00aa00] font-bold backdrop-blur",
    subheaderTitle:
      "mb-1 text-lg uppercase tracking-wider drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]",
    statsBadge:
      "text-xs text-[#00ff00] bg-[#00ff00]/10 px-1.5 py-1 rounded border border-[#00ff00]/30",
  },
  material: {
    header:
      "bg-white text-gray-800 flex flex-col items-center font-sans flex-shrink-0 p-2",
    logoText: "text-blue-600 text-lg font-bold",
    searchIcon: "stroke-blue-600",
    clearButton:
      "px-3 py-2 bg-blue-100 text-blue-600 border border-blue-600 rounded text-xs uppercase hover:bg-blue-200",
    separator: "w-full h-0.5 bg-blue-600",
    subheader: "w-full bg-white px-5 py-3 text-blue-600 font-bold",
    subheaderTitle: "mb-1 text-lg uppercase tracking-wider",
    statsBadge:
      "text-xs text-blue-600 bg-blue-50 px-1.5 py-1 rounded border border-blue-200",
  },
} as const;

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
  allStoredEvents = [],
  onLoginClick,
  theme = "matrix",
  onThemeChange,
}: MobileHeaderProps) {
  // avoid unused warnings for props not yet used
  void zoomedGeohash;
  void hierarchicalCounts;
  void allStoredEvents;

  const t = styles[theme];

  return (
    <header className={t.header}>
      <div className="flex items-center gap-2 mb-0">
        <img src="/favicon.webp" alt="bitchat.land" className="w-12 h-12 -ml-3" />
        <div className={t.logoText}>bitchat.land</div>
      </div>

      <div className="flex gap-1 justify-center w-full max-w-md">
        <ThemedButton
          onClick={() => onViewChange("panel")}
          active={activeView === "panel"}
          theme={theme}
          className="flex-1 px-3 py-2 text-sm text-center"
        >
          menu
        </ThemedButton>
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
          onClick={() =>
            onThemeChange?.(theme === "matrix" ? "material" : "matrix")
          }
          theme={theme}
          className="flex-1 px-3 py-2 text-sm text-center"
        >
          theme
        </ThemedButton>
      </div>

      <div className="w-full mt-2 mb-4 px-4">
        <div className="flex gap-2 items-center mx-auto max-w-md">
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
              placeholder="hello in:nyc from:@jack"
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
    </header>
  );
}

