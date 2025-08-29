import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";

import {
  generateGeohashes,
  generateLocalizedGeohashes,
  getHierarchicalCounts,
} from "./utils/geohashUtils";

import { GeoMercatorProps } from "./types";
import { useDrag } from "./hooks/useDrag";
import { useZoom } from "./hooks/useZoom";
import { useNostr } from "./hooks/useNostr";
import { EventHierarchy } from "./components/EventHierarchy";
import { RecentEvents } from "./components/RecentEvents";
import { Map } from "./components/Map";
import { MobileHeader } from "./components/MobileHeader";
import { ProfileGenerationModal } from "./components/ProfileGenerationModal";
import { ChatInput } from "./components/ChatInput";
import { ProjectionSelector } from "./components/ProjectionSelector";
import { MarqueeBanner } from "./components/MarqueeBanner";
import { CornerOverlay } from "./components/CornerOverlay";
import { ChannelList, ChannelMeta } from "./components/ChannelList";
import { UserList, UserMeta } from "./components/UserList";
import { Connections } from "./components/Connections";
import { NostrImageSearch } from "./components/NostrImageSearch";
import { FavoritesModal } from "./components/FavoritesModal";
import {
  addGeohashToSearch,
  parseSearchQuery,
  buildSearchQuery,
} from "./utils/searchParser";

import { hasImageUrl } from "./utils/imageUtils";
import { getFavorites, addToFavorites, removeFromFavorites } from "./utils/favorites";
import { isFirstTimeOpeningThisHour, markChannelOpenedThisHour, debugChannelJoinStorage } from "./utils/channelJoinTracker";
import { sendJoinMessage } from "./utils/systemMessageSender";

// Valid geohash characters (base32 without 'a', 'i', 'l', 'o')
const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/;

export const background = "#000000";

const styles = {
  matrix: {
    appContainer:
      "flex flex-col w-screen h-screen overflow-hidden bg-black text-[#00ff00] font-mono",
    mainArea: "flex-1 relative w-full overflow-hidden",
    chatViewContainer:
      "absolute inset-0 w-full h-full bg-black flex flex-row overflow-hidden",
    chatColumn: "flex-1 flex flex-col",
    subHeader: "bg-black/95 text-[#00aa00] px-4 py-3 border-b border-[#003300]",
    subHeaderTitle:
      "text-base uppercase tracking-wider [text-shadow:0_0_10px_rgba(0,255,0,0.5)]",
  },
  material: {
    appContainer:
      "flex flex-col w-screen h-screen overflow-hidden bg-white text-gray-800 font-sans",
    mainArea: "flex-1 relative w-full overflow-hidden",
    chatViewContainer:
      "absolute inset-0 w-full h-full bg-white flex flex-row overflow-hidden",
    chatColumn: "flex-1 flex flex-col",
    subHeader: "bg-white text-blue-600 px-4 py-3 border-b border-blue-200",
    subHeaderTitle: "text-base uppercase tracking-wider",
  },
} as const;

// Add array prototype extensions
declare global {
  interface Array<T> {
    max(): number;
    min(): number;
  }
}

Array.prototype.max = function () {
  return Math.max.apply(null, this);
};
Array.prototype.min = function () {
  return Math.min.apply(null, this);
};

export default function App({
  width,
  height,
  events = true,
}: GeoMercatorProps) {
  const [projection, setProjection] = useState("natural_earth");
  // const [showHeatmap] = useState(true); // Currently unused
  // const [geohashPrecision] = useState(4); // Currently unused
  const [showSingleCharGeohashes] = useState(true);
  const [geohashDisplayPrecision] = useState(1);
  const [showGeohashText] = useState(true);

  // Theme state for simple Tailwind-based theming
  const [theme, setTheme] = useState<"matrix" | "material">("matrix");
  const t = styles[theme];

  // View state
  const [activeView, setActiveView] = useState<"map" | "chat" | "panel">("map");

  // Profile state using React state with localStorage initialization
  const [savedProfile, setSavedProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showFavoritesModal, setShowFavoritesModal] = useState(false);


  // Search and zoom state
  const [searchText, setSearchText] = useState("");
  const [searchGeohash, setSearchGeohash] = useState("");
  const [animatingGeohashes, setAnimatingGeohashes] = useState<Set<string>>(
    new Set()
  );
  const [channelLastReadMap, setChannelLastReadMap] = useState<
    Record<string, number>
  >({});

  // Reply state
  const [replyPrefillText, setReplyPrefillText] = useState("");

  // User state
  const [selectedUser, setSelectedUser] = useState<string | null>(null);

  // Header height constant - measured exact value
  const headerHeight = 182.2;

  // Calculate available map dimensions accounting for header
  const availableHeight = height - headerHeight;

  // Map positioning constants
  const mapWidth = width;
  const mapHeight = availableHeight;

  // Custom hooks
  const {
    isDragging,
    hasDragged,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  } = useDrag();
  const {
    zoomedGeohash,
    zoomScale,
    zoomTranslate,
    zoomToGeohash,
    updateTranslate,
  } = useZoom(mapWidth, mapHeight, projection);

  // Load last-read map from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("channelLastReadMap");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setChannelLastReadMap(parsed as Record<string, number>);
        }
      }
    } catch (e) {
      console.warn("Failed to load channelLastReadMap from localStorage", e);
    }
  }, []);

  const persistChannelLastRead = (next: Record<string, number>) => {
    try {
      localStorage.setItem("channelLastReadMap", JSON.stringify(next));
    } catch (e) {
      console.warn("Failed to persist channelLastReadMap to localStorage", e);
    }
  };

  // Function to trigger geohash animation
  const animateGeohash = (geohash: string) => {
    setAnimatingGeohashes((prev) => new Set([...prev, geohash]));

    // Remove animation after 1 second
    setTimeout(() => {
      setAnimatingGeohashes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(geohash);
        return newSet;
      });
    }, 1000);
  };

  // Parse the search query to get geohash filters
  const parsedSearch = parseSearchQuery(searchText);
  // Derive the currently selected channel key (e.g., "#nyc") from the first in: term
  const selectedChannelKey = useMemo(() => {
    const first = parsedSearch.geohashes[0];
    return first ? `#${first.toLowerCase()}` : "";
  }, [parsedSearch.geohashes]);
  const previousSelectedChannelRef = useRef<string>("");

  // Determine the primary geohash for map display (use the first one if multiple)
  const primarySearchGeohash =
    parsedSearch.geohashes.length > 0 ? parsedSearch.geohashes[0] : "";

  // Synchronize searchGeohash state with parsed search and trigger zoom
  useEffect(() => {
    if (primarySearchGeohash !== searchGeohash) {
      setSearchGeohash(primarySearchGeohash);
      // Auto-zoom when geohash is in search
      if (
        primarySearchGeohash &&
        /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(primarySearchGeohash)
      ) {
        zoomToGeohash(primarySearchGeohash.toLowerCase());
      } else if (!primarySearchGeohash) {
        zoomToGeohash(""); // Reset zoom when no geohash
      }
    }
  }, [primarySearchGeohash, searchGeohash, zoomToGeohash]);

  // Determine if we should show localized precision based on parsed search
  const shouldShowLocalizedPrecision =
    primarySearchGeohash &&
    primarySearchGeohash.length >= 1 &&
    /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(primarySearchGeohash);
  const effectivePrecision = shouldShowLocalizedPrecision
    ? primarySearchGeohash.length + 1
    : geohashDisplayPrecision;

  // Generate only localized geohashes when searching, otherwise use global precision
  const currentGeohashes = shouldShowLocalizedPrecision && primarySearchGeohash
    ? generateLocalizedGeohashes(primarySearchGeohash.toLowerCase())
    : generateGeohashes(geohashDisplayPrecision, null);

  // Initialize Nostr with animation callback
  const {
    connectedRelays,
    recentEvents,
    geohashActivity,
    nostrEnabled,
    connectionStatus,
    allStoredEvents,
    allEventsByGeohash,
    toggleNostr,
    getGeorelayRelays,
    connectToGeoRelays,
    disconnectFromGeoRelays,
  } = useNostr(searchGeohash, currentGeohashes, animateGeohash, selectedChannelKey);

  // Build users list from events - moved here after useNostr hook
  const users = useMemo<UserMeta[]>(() => {
    // Guard against undefined allStoredEvents
    if (!allStoredEvents || allStoredEvents.length === 0) {
      return [];
    }

    interface UserData {
      pubkey: string;
      displayName: string;
      hasMessages: boolean;
      eventKind: number;
      lastSeen: number;
      messageCount: number;
    }
    
    const userMap: Record<string, UserData> = {};

    // Process events to build user information
    for (const ev of allStoredEvents) {
      // Guard against malformed events
      if (!ev || !ev.pubkey || typeof ev.created_at !== 'number' || typeof ev.kind !== 'number') {
        continue;
      }

      // If a channel is selected, only process events from that channel
      if (selectedChannelKey) {
        const g = ev.tags.find((t: any) => t[0] === "g");
        const d = ev.tags.find((t: any) => t[0] === "d");
        const gv = g && typeof g[1] === "string" ? g[1].toLowerCase() : "";
        const dv = d && typeof d[1] === "string" ? d[1].toLowerCase() : "";
        
        const eventChannel = gv ? `#${gv}` : dv ? `#${dv}` : null;
        
        // Skip events that don't match the selected channel
        if (eventChannel !== selectedChannelKey) {
          continue;
        }
      }

      const pubkey = ev.pubkey;
      const existing = userMap[pubkey];
      
      if (existing) {
        // Update existing user
        existing.messageCount += 1;
        existing.lastSeen = Math.max(existing.lastSeen, ev.created_at * 1000);
        // Keep the highest event kind for this user
        if (ev.kind > existing.eventKind) {
          existing.eventKind = ev.kind;
        }
      } else {
        // Create new user
        userMap[pubkey] = {
          pubkey,
          displayName: ev.tags.find((t: any) => t[0] === "n")?.[1] || "", // Could be extracted from profile events in the future
          hasMessages: true,
          eventKind: ev.kind,
          lastSeen: ev.created_at * 1000,
          messageCount: 1,
        };
      }
    }

    // Convert to array and sort by last seen (most recent first)
    return Object.values(userMap)
      .sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))
      .map(user => ({
        ...user,
        isPinned: false, // This is handled by the UserList component
      }));
  }, [allStoredEvents, selectedChannelKey]);

  // Generate heatmap data (currently unused but may be needed for future features)
  // const heatmapData = generateSampleHeatmapData(geohashPrecision);

  // Handle text search input
  const handleTextSearch = (value: string) => {
    setSearchText(value);
  };

  // Handle reply to message
  const handleReply = (username: string, pubkeyHash: string) => {
    const replyText = `@${username}#${pubkeyHash} `;
    setReplyPrefillText(replyText);

    // Switch to chat view with a small delay to ensure state updates
    setTimeout(() => {
      setActiveView("chat");
    }, 50);
  };

  // Handle message sent - clear reply prefill
  const handleMessageSent = () => {
    setReplyPrefillText("");
  };

  // Load profile from localStorage on initial mount
  useEffect(() => {
    try {
      const profileData = localStorage.getItem("nostr_profile");
      if (profileData) {
        const profile = JSON.parse(profileData);
        setSavedProfile(profile);
      }
    } catch (err) {
      console.warn("Failed to load saved profile:", err);
    }
    
    // Debug channel join storage on mount
    debugChannelJoinStorage();
  }, []);

  // Handle profile saved - update state immediately
  const handleProfileSaved = (profile: any) => {
    // Directly update the profile state for immediate UI update
    setSavedProfile(profile);
  };

  // Favorites modal functionality
  const openFavoritesModal = useCallback(() => {
    setShowFavoritesModal(true);
  }, []);



  // Handle inserting images into chat input
  const handleInsertImage = useCallback((imageUrl: string, cursorPosition?: number, currentValue?: string) => {
    // Insert the image URL into the chat input at the specified position
    const imageText = imageUrl;
    
    if (cursorPosition !== undefined && currentValue !== undefined) {
      // Insert at cursor position
      const beforeCursor = currentValue.slice(0, cursorPosition);
      const afterCursor = currentValue.slice(cursorPosition);
      const newValue = beforeCursor + imageText + afterCursor;
      
      // Update the chat input value directly
      if (window.updateChatInputValue) {
        window.updateChatInputValue(newValue, cursorPosition + imageText.length);
      }
    } else {
      // Fallback: append to reply prefill
      setReplyPrefillText(prev => prev + (prev ? ' ' : '') + imageText);
    }
  }, []);

  // Expose openFavoritesModal globally for ChatInput to use
  useEffect(() => {
    (window as any).openFavoritesModal = openFavoritesModal;
    (window as any).addToFavorites = addToFavorites;
    (window as any).removeFromFavorites = removeFromFavorites;
    (window as any).getFavorites = getFavorites;
    (window as any).onInsertImage = handleInsertImage; // Expose the new function
    return () => {
      delete (window as any).openFavoritesModal;
      delete (window as any).addToFavorites;
      delete (window as any).removeFromFavorites;
      delete (window as any).getFavorites;
      delete (window as any).onInsertImage; // Clean up the new function
    };
  }, [openFavoritesModal, addToFavorites, removeFromFavorites, getFavorites, handleInsertImage]);

  // Handle geohash clicks from map - add to text search
  const handleGeohashClickForSearch = (geohash: string) => {
    const newSearch = addGeohashToSearch(searchText, geohash);
    setSearchText(newSearch);
  };

  // Build a map of latest event timestamp for each channel key like "#nyc"
  const latestEventTimestampByChannel = useMemo(() => {
    const latest: Record<string, number> = {};
    for (const ev of allStoredEvents) {
      const g = ev.tags.find((t: any) => t[0] === "g");
      const d = ev.tags.find((t: any) => t[0] === "d");
      const gv = g && typeof g[1] === "string" ? g[1].toLowerCase() : "";
      const dv = d && typeof d[1] === "string" ? d[1].toLowerCase() : "";
      const createdAt = ev.created_at || 0;
      if (gv) {
        const key = `#${gv}`;
        latest[key] = Math.max(latest[key] || 0, createdAt);
      }
      if (dv) {
        const key = `#${dv}`;
        latest[key] = Math.max(latest[key] || 0, createdAt);
      }
    }
    return latest;
  }, [allStoredEvents]);

  const unreadCountByChannel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ev of allStoredEvents) {
      const g = ev.tags.find((t: any) => t[0] === "g");
      const d = ev.tags.find((t: any) => t[0] === "d");
      const gv = g && typeof g[1] === "string" ? g[1].toLowerCase() : "";
      const dv = d && typeof d[1] === "string" ? d[1].toLowerCase() : "";
      const createdAt = ev.created_at || 0;
      if (gv) {
        const key = `#${gv}`;
        if (createdAt > (channelLastReadMap[key] || 0)) {
          counts[key] = (counts[key] || 0) + 1;
        }
      }
      if (dv) {
        const key = `#${dv}`;
        if (createdAt > (channelLastReadMap[key] || 0)) {
          counts[key] = (counts[key] || 0) + 1;
        }
      }
    }
    return counts;
  }, [allStoredEvents, channelLastReadMap]);

  const channelSet = useMemo(() => {
    const set = new Set<string>();
    for (const key of Object.keys(latestEventTimestampByChannel)) {
      set.add(key);
    }
    return set;
  }, [latestEventTimestampByChannel]);

  const channels = useMemo<ChannelMeta[]>(() => {
    const allChannels = Array.from(channelSet).sort();
    
    // Create a map of channel keys to their event kinds for proper categorization
    const channelEventKinds: Record<string, number> = {};
    
    // Go through all events to determine the kind for each channel
    for (const ev of allStoredEvents) {
      const g = ev.tags.find((t: any) => t[0] === "g");
      const d = ev.tags.find((t: any) => t[0] === "d");
      const gv = g && typeof g[1] === "string" ? g[1].toLowerCase() : "";
      const dv = d && typeof d[1] === "string" ? d[1].toLowerCase() : "";
      
      if (gv) {
        const key = `#${gv}`;
        // Use the actual event kind from the event
        channelEventKinds[key] = ev.kind;
      }
      if (dv) {
        const key = `#${dv}`;
        // Use the actual event kind from the event
        channelEventKinds[key] = ev.kind;
      }
    }
    
    return allChannels.map((ch) => ({
      key: ch,
      isPinned: false, // This is now handled by the ChannelList component
      hasMessages: channelSet.has(ch),
      eventKind: channelEventKinds[ch] || 23333, // Default to standard if unknown
    }));
  }, [channelSet, allStoredEvents]);

  const handleOpenChannel = useCallback(
    (ch: string) => {
      const channelValue = ch.slice(1).toLowerCase();
      console.log(`🔍 Opening channel: ${ch}, channelValue: ${channelValue}`);
      console.log(`🔍 Channel type: ${typeof ch}, length: ${ch.length}`);
      console.log(`🔍 Channel starts with #: ${ch.startsWith('#')}`);
      
      handleTextSearch(`in:${channelValue}`);
      
      // Check if this is the first time opening the channel this hour
      console.log(`🔍 About to call isFirstTimeOpeningThisHour with: ${ch}`);
      const isFirstTime = isFirstTimeOpeningThisHour(ch);
      console.log(`🕐 Is first time opening this hour: ${isFirstTime}`);
      
      if (isFirstTime) {
        console.log(`👤 User profile exists: ${!!savedProfile}`);
        // Send join message if user has a profile
        if (savedProfile) {
          const isGeohash = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(channelValue);
          console.log(`🌍 Is geohash channel: ${isGeohash}`);
          console.log(`📤 Sending join message for channel: ${channelValue}`);
          sendJoinMessage({
            channelKey: channelValue,
            username: savedProfile.username,
            privateKey: savedProfile.privateKey,
            isGeohash
          });
        } else {
          console.log(`❌ No saved profile found, cannot send join message`);
        }
      }
      
      // Mark channel as opened this hour
      console.log(`🔍 About to call markChannelOpenedThisHour with: ${ch}`);
      markChannelOpenedThisHour(ch);
      console.log(`✅ Marked channel ${ch} as opened this hour`);
      
      const nowSec = Math.floor(Date.now() / 1000);
      setChannelLastReadMap((prev) => {
        const next = { ...prev, [ch]: nowSec };
        persistChannelLastRead(next);
        return next;
      });
    },
    [handleTextSearch, persistChannelLastRead, savedProfile]
  );

  const handleSelectUser = useCallback(
    (pubkey: string) => {
      setSelectedUser(pubkey);
      // Could add user-specific search functionality here
      console.log("Selected user:", pubkey);
    },
    []
  );

  // When selected channel changes, mark the previous channel as read at switch-away time
  useEffect(() => {
    const prev = previousSelectedChannelRef.current;
    if (prev && prev !== selectedChannelKey) {
      const nowSec = Math.floor(Date.now() / 1000);
      setChannelLastReadMap((prevMap) => {
        const next = { ...prevMap, [prev]: nowSec };
        persistChannelLastRead(next);
        return next;
      });
    }
    previousSelectedChannelRef.current = selectedChannelKey;
  }, [selectedChannelKey]);

  // If leaving chat view, consider the currently open channel as read
  useEffect(() => {
    if (activeView !== "chat") {
      const current = previousSelectedChannelRef.current;
      if (current) {
        const nowSec = Math.floor(Date.now() / 1000);
        setChannelLastReadMap((prevMap) => {
          const next = { ...prevMap, [current]: nowSec };
          persistChannelLastRead(next);
          return next;
        });
      }
    }
  }, [activeView]);

  // Function to handle clicks on the map background (zoom out one level)
  const handleMapClick = () => {
    if (primarySearchGeohash && primarySearchGeohash.length > 0) {
      // Zoom out one level by removing the last character from the primary geohash
      const parentGeohash = primarySearchGeohash.slice(0, -1);

      // Update the search by replacing the current geohash with the parent
      const parsed = parseSearchQuery(searchText);
      parsed.geohashes = parsed.geohashes
        .map((g) => (g === primarySearchGeohash ? parentGeohash : g))
        .filter((g) => g.length > 0); // Remove empty geohashes

      const newSearchText = buildSearchQuery(parsed);
      setSearchText(newSearchText);
    }
  };

  // Simple, proper projection setup without complex calculations
  const getMapProjection = () => {
    // Default scale that fits world nicely in most viewports
    const baseScale = Math.min(mapWidth, mapHeight) / 4;

    // Current effective scale and center
    const effectiveScale = zoomedGeohash ? zoomScale : baseScale;
    const centerX = mapWidth / 2 + zoomTranslate[0];
    const centerY = mapHeight / 2 + zoomTranslate[1];

    return {
      scale: effectiveScale,
      centerX,
      centerY,
    };
  };

  const { scale: currentScale, centerX, centerY } = getMapProjection();

  // Mouse/touch move handler that includes drag logic
  const handleMouseMoveWithDrag = (e: React.MouseEvent | React.TouchEvent) => {
    handleMouseMove(e, updateTranslate);
  };

  if (width < 10) return null;

  // Calculate data for mobile header using parsed search (same logic as RecentEvents)
  const hasSearchTerms =
    parsedSearch.text ||
    parsedSearch.geohashes.length > 0 ||
    parsedSearch.users.length > 0 ||
    parsedSearch.clients.length > 0 ||
    parsedSearch.colors.length > 0 ||
    parsedSearch.has.length > 0;
  const eventsToShow = hasSearchTerms ? allStoredEvents : recentEvents;
  const filteredEvents = eventsToShow.filter((event) => {
    if (!hasSearchTerms) return true;

    // Extract event data
    const messageContent = (event.content || "").toLowerCase();
    const nameTag = event.tags.find((tag: any) => tag[0] === "n");
    const username = (nameTag ? nameTag[1] : "").toLowerCase();
    const geoTag = event.tags.find((tag: any) => tag[0] === "g");
    const eventGeohash = (geoTag ? geoTag[1] : "").toLowerCase();
    const pubkeyHash = event.pubkey.slice(-4).toLowerCase();
    const hasFilters = parsedSearch.has;

    // Check for invalid geohash and log it
    if (eventGeohash && !VALID_GEOHASH_CHARS.test(eventGeohash)) {
      // console.log(
      //   `Invalid geohash detected in message: "${eventGeohash}" from user ${
      //     username || "anonymous"
      //   } (${pubkeyHash})`
      // );
      // console.log(
      //   `Message content: "${event.content?.slice(0, 100)}${
      //     event.content && event.content.length > 100 ? "..." : ""
      //   }"`
      // );
    }

    let matches = true;

    // Check text content if specified (only search message content, not usernames)
    if (parsedSearch.text) {
      const textMatch = messageContent.includes(
        parsedSearch.text.toLowerCase()
      );
      if (!textMatch) matches = false;
    }

    // Check geohash filters if specified
    if (parsedSearch.geohashes.length > 0 && matches) {
      // Include events that have ANY geohash value (even invalid),
      // and only exclude ones with no geohash at all.
      if (!eventGeohash) {
        matches = false;
      } else if (VALID_GEOHASH_CHARS.test(eventGeohash)) {
        const geohashMatch = parsedSearch.geohashes.some((searchGeohash, index) => {
          const includeChildren = parsedSearch.includeChildren[index] ?? false;
          
          if (includeChildren) {
            // With + suffix: allow child regions (starts with)
            return eventGeohash.startsWith(searchGeohash.toLowerCase());
          } else {
            // Without + suffix: exact match only
            return eventGeohash === searchGeohash.toLowerCase();
          }
        });
        if (!geohashMatch) matches = false;
      } else {
        // Invalid geohash present -> include regardless of match
        matches = true;
      }
    }

    // Check user filters if specified
    if (parsedSearch.users.length > 0 && matches) {
      const userMatch = parsedSearch.users.some((searchUser) => {
        // Handle both "username" and "username#hash" formats
        if (searchUser.includes("#")) {
          const [searchUsername, searchHash] = searchUser.split("#");
          return (
            username === searchUsername.toLowerCase() &&
            pubkeyHash === searchHash.toLowerCase()
          );
        } else {
          return username === searchUser.toLowerCase();
        }
      });
      if (!userMatch) matches = false;
    }

    // Check has: filters
    if (hasFilters.length > 0 && matches) {
      for (const filter of hasFilters) {
        if (filter === "image") {
          if (!hasImageUrl(event.content)) {
            matches = false;
            break;
          }
        }
      }
    }

    return matches;
  });

  // Debug logging for header updates
  // console.log(
  //   `Header update: search="${searchText}", filteredCount=${filteredEvents.length}, totalStored=${allStoredEvents.length}, recent=${recentEvents.length}`
  // );

  const topLevelCounts: { [key: string]: number } = {};
  for (const [geohash, count] of allEventsByGeohash.entries()) {
    const firstChar = geohash.charAt(0);
    topLevelCounts[firstChar] = (topLevelCounts[firstChar] || 0) + count;
  }
  const totalEventsCount = Object.values(topLevelCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  // Get hierarchical counts for current search
  const hierarchicalCounts = searchGeohash
    ? getHierarchicalCounts(searchGeohash.toLowerCase(), allEventsByGeohash)
    : { direct: 0, total: 0 };

  return (
    <div className={t.appContainer}>
      {/* eSIM Marquee Banner */}
      <MarqueeBanner theme={theme} />
      
      {/* Mobile Header */}
      <header>
        <MobileHeader
          activeView={activeView}
          onViewChange={setActiveView}
          searchText={searchText}
          onSearch={handleTextSearch}
          zoomedGeohash={zoomedGeohash}
          nostrEnabled={nostrEnabled}
          filteredEventsCount={filteredEvents.length}
          totalEventsCount={totalEventsCount}
          hierarchicalCounts={hierarchicalCounts}
          allStoredEvents={allStoredEvents}
          onLoginClick={() => setShowProfileModal(true)}
          theme={theme}
          onThemeChange={setTheme}
        />
      </header>

      {/* Main Content Area */}
      <main className={t.mainArea}>
              {/* Map - Always rendered, but might be hidden on mobile */}
      <section
        aria-label="Interactive World Map with Geohash Heatmap"
        className={`${
          activeView !== "map" ? "hidden" : "block"
        } w-full h-full`}
      >
          <Map
            width={mapWidth || 800}
            height={mapHeight || 600}
            projection={projection || "natural_earth"}
            currentScale={currentScale || 1}
            centerX={centerX || 0}
            centerY={centerY || 0}
            isDragging={isDragging || false}
            hasDragged={hasDragged || false}
            events={!!events}
            onMapClick={handleMapClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMoveWithDrag}
            onMouseUp={handleMouseUp}
            currentGeohashes={currentGeohashes || []}
            geohashActivity={geohashActivity || {}}
            allEventsByGeohash={allEventsByGeohash || {}}
            animatingGeohashes={animatingGeohashes || []}
            showSingleCharGeohashes={showSingleCharGeohashes || false}
            showGeohashText={showGeohashText || false}
            effectivePrecision={effectivePrecision || 1}
            shouldShowLocalizedPrecision={!!shouldShowLocalizedPrecision}
            searchText={searchText || ""}
            onGeohashClick={handleGeohashClickForSearch}
            theme={theme || "matrix"}
          />
        </section>

        {/* Mobile Layout - Show panels based on activeView */}
        <>
          {/* Chat View */}
          {activeView === "chat" && (
            <div className={t.chatViewContainer}>
              <ChannelList
                channels={channels}
                selectedChannel={selectedChannelKey}
                unreadCounts={unreadCountByChannel}
                onOpenChannel={handleOpenChannel}
                theme={theme}
              />

              {/* Chat column */}
              <div className={t.chatColumn}>
                {/* Sub header (chat) to align next to channels */}
                <div className={t.subHeader}>
                  <div className={t.subHeaderTitle}>
                    RECENT NOSTR EVENTS{" "}
                    {searchText ? `MATCHING "${searchText}"` : ""}
                  </div>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-hidden">
                  <RecentEvents
                    nostrEnabled={nostrEnabled}
                    searchText={searchText}
                    allStoredEvents={allStoredEvents}
                    recentEvents={recentEvents}
                    onSearch={handleTextSearch}
                    onReply={handleReply}
                    theme={theme}
                  />
                </div>

                {/* Chat input */}
                <ChatInput
                  currentChannel={
                    selectedChannelKey ? selectedChannelKey.slice(1) : "global"
                  } // Use global if no specific channel
                  onMessageSent={handleMessageSent}
                  onOpenProfileModal={() => setShowProfileModal(true)}
                  prefillText={replyPrefillText}
                  savedProfile={savedProfile}
                  theme={theme}
                  onInsertImage={handleInsertImage}
                />
              </div>

              {/* User List on the right side */}
              <UserList
                users={users}
                selectedUser={selectedUser}
                onSelectUser={handleSelectUser}
                searchText={searchText}
                allStoredEvents={allStoredEvents}
                theme={theme}
              />
            </div>
          )}

          {/* Panel View */}
          {activeView === "panel" && (
            <div className="absolute inset-0 w-full h-full bg-black overflow-hidden">
              <EventHierarchy
                searchText={searchText}
                allEventsByGeohash={allEventsByGeohash}
                onSearch={handleTextSearch}
                theme={theme}
              />
            </div>
          )}
        </>
      </main>

      {/* Connections Panel - Top left on map view */}
      {activeView === "map" && (
        <CornerOverlay position="bottom-right" theme={theme}>
          <Connections
            theme={theme}
            connectedRelays={connectedRelays}
            connectionStatus={connectionStatus}
            onToggleNostr={toggleNostr}
            nostrEnabled={nostrEnabled}
            getGeorelayRelays={getGeorelayRelays}
            connectToGeoRelays={connectToGeoRelays}
            disconnectFromGeoRelays={disconnectFromGeoRelays}
          />
        </CornerOverlay>
      )}

      {/* Projection Selector - Only show on map view */}
      {activeView === "map" && (
        <ProjectionSelector
          projection={projection}
          onSelect={setProjection}
          theme={theme}
        />
      )}

      {/* Profile Generation Modal */}
      <ProfileGenerationModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        onProfileSaved={handleProfileSaved}
        theme={theme}
      />

      {/* Favorites Modal */}
      <FavoritesModal
        isOpen={showFavoritesModal}
        onClose={() => setShowFavoritesModal(false)}
        theme={theme}
        onImageSelect={(imageUrl) => {
          // Insert the image URL into the chat input
          if (window.onInsertImage) {
            // Get current cursor position and value from ChatInput
            const cursorPos = (window as any).getChatInputCursorPosition?.() || 0;
            const currentValue = (window as any).getChatInputValue?.() || '';
            window.onInsertImage(imageUrl, cursorPos, currentValue);
          }
          setShowFavoritesModal(false);
        }}
      />
    </div>
  );
}
