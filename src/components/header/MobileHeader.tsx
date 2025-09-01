import { globalStyles } from "../../styles";
import type { NostrEvent } from "../../types";
import { ThemedButton } from "../common/ThemedButton";
import { ThemedInput } from "../common/ThemedInput";
import {
  Menu,
  Users,
  Map as MapIcon,
  MessageSquare,
  Radio as RadioIcon,
  Key,
  Download,
  Settings as SettingsIcon,
  X,
  Search,
} from "lucide-react";

interface MobileHeaderProps {
  activeView: "map" | "chat" | "panel" | "radio";
  onViewChange: (view: "map" | "chat" | "panel" | "radio") => void;
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
  onToggleChannels?: () => void;
  onToggleUsers?: () => void;
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
  onToggleChannels,
  onToggleUsers,
}: MobileHeaderProps) {
  // avoid unused warnings for props not yet used
  void zoomedGeohash;
  void allStoredEvents;

  const t = styles[theme];

  return (
    <header className={t.header}>
      <div className="flex items-center justify-between w-full mb-1">
        <ThemedButton
          onClick={onToggleChannels}
          theme={theme}
          className="p-2 md:hidden"
        >
          <Menu className="w-5 h-5" />
        </ThemedButton>
        <img
          src={`/favicon${theme === "matrix" ? ".webp" : `_${theme}.webp`}`}
          alt="bitchat.land"
          className="w-8 h-8"
        />
        <ThemedButton
          onClick={onToggleUsers}
          theme={theme}
          className="p-2 md:hidden"
        >
          <Users className="w-5 h-5" />
        </ThemedButton>
      </div>

      <div className="flex gap-1 justify-center w-full mb-1">
        <ThemedButton
          onClick={() => onViewChange("map")}
          active={activeView === "map"}
          theme={theme}
          className="px-2 py-2"
        >
          <MapIcon className="w-5 h-5" />
        </ThemedButton>
        <ThemedButton
          onClick={() => onViewChange("chat")}
          active={activeView === "chat"}
          theme={theme}
          className="px-2 py-2"
        >
          <MessageSquare className="w-5 h-5" />
        </ThemedButton>
        <ThemedButton
          onClick={() => onViewChange("radio")}
          active={activeView === "radio"}
          theme={theme}
          className="px-2 py-2"
        >
          <RadioIcon className="w-5 h-5" />
        </ThemedButton>
        <ThemedButton
          onClick={onLoginClick}
          theme={theme}
          className="px-2 py-2"
        >
          <Key className="w-5 h-5" />
        </ThemedButton>
        <ThemedButton
          as="a"
          href="https://bitchat.free/"
          target="_blank"
          rel="noopener noreferrer"
          theme={theme}
          className="px-2 py-2"
        >
          <Download className="w-5 h-5" />
        </ThemedButton>
        <ThemedButton
          onClick={onSettingsClick}
          theme={theme}
          className="px-2 py-2"
        >
          <SettingsIcon className="w-5 h-5" />
        </ThemedButton>
      </div>

      <div className="w-full mt-2 mb-2 px-4">
        <div className="flex flex-col gap-2 mx-auto max-w-md">
          {/* Search Input */}
          <div className="flex gap-2 items-center">
            <div className="relative w-full">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Search className={`${t.searchIcon} w-4 h-4`} />
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
                <X className="w-4 h-4" />
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

