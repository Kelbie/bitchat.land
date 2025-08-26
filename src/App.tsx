import React, { useState, useEffect, useRef, useMemo } from "react";
// import { scaleQuantize } from "@visx/scale"; // Currently unused
// import { generateSampleHeatmapData } from "./utils/geohash"; // Currently unused
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
import { CornerOverlay } from "./components/CornerOverlay";
import {
  addGeohashToSearch,
  parseSearchQuery,
  buildSearchQuery,
} from "./utils/searchParser";
import { colorForPeerSeed } from "./utils/userColor";

// Valid geohash characters (base32 without 'a', 'i', 'l', 'o')
const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/;

// Marquee Banner Component
function MarqueeBanner() {
  const marqueeRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(0);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const animate = (currentTime: number) => {
      // Calculate delta time for consistent speed regardless of frame rate
      if (lastTimeRef.current !== 0) {
        const deltaTime = currentTime - lastTimeRef.current;
        const speed = 0.002; // Much slower speed for comfortable reading

        setPosition((prev) => {
          const newPos = prev - speed * deltaTime;
          // Reset position when content moves completely off screen
          // Reset to 100vw to start from right edge again
          return newPos <= -100 ? 100 : newPos;
        });
      }
      lastTimeRef.current = currentTime;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  const handleMarqueeClick = () => {
    window.open("https://sovran.money/esims", "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={handleMarqueeClick}
      style={{
        backgroundColor: "rgba(0, 25, 0",
        border: "1px solid #00aa00",
        borderLeft: "none",
        borderRight: "none",
        height: "30px",
        display: "flex",
        alignItems: "center",
        overflow: "hidden",
        position: "relative",
        zIndex: 1000,
        cursor: "pointer",
        transition: "backgroundColor 0.2s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "#002200";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "#001100";
      }}
    >
      <div
        ref={marqueeRef}
        style={{
          display: "flex",
          alignItems: "center",
          whiteSpace: "nowrap",
          fontSize: "12px",
          fontWeight: "bold",
          color: "#00ff00",
          textShadow: "0 0 5px rgba(0, 255, 0, 0.5)",
          transform: `translateX(${position}vw)`, // Use viewport width for better control
          willChange: "transform", // Optimize for animations
        }}
      >
        {/* Repeat content multiple times for seamless loop */}
        {Array(4)
          .fill(null)
          .map((_, index) => (
            <span
              key={index}
              style={{ paddingRight: "50px", minWidth: "max-content" }}
            >
              🌍 GET GLOBAL eSIMS FOR BITCOIN • PRIVACY • NO KYC • INSTANT
              ACTIVATION •{" "}
              <span
                style={{
                  color: "#ffaa00",
                  fontWeight: "bold",
                  textShadow: "0 0 5px rgba(255, 170, 0, 0.5)",
                }}
              >
                SOVRAN.MONEY/ESIMS
              </span>{" "}
              • STAY CONNECTED WORLDWIDE • PAY WITH BITCOIN ₿ • TRAVEL WITHOUT
              LIMITS • ANONYMOUS CONNECTIVITY •{" "}
            </span>
          ))}
      </div>
    </div>
  );
}

export const background = "#000000";

// Matrix-themed heatmap color scale (currently unused but may be needed for future features)
// const heatmapColor = scaleQuantize({
//   domain: [0, 100],
//   range: [
//     "rgba(0, 20, 0, 0.1)", // Very dark green - low values
//     "rgba(0, 50, 0, 0.3)", // Dark green
//     "rgba(0, 100, 0, 0.4)", // Medium dark green
//     "rgba(0, 150, 0, 0.5)", // Medium green
//     "rgba(0, 200, 0, 0.6)", // Bright green
//     "rgba(0, 255, 0, 0.8)", // Full green - high values
//   ],
// });

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
  const [theme] = useState<"matrix" | "material">("matrix");

  // View state
  const [activeView, setActiveView] = useState<"map" | "chat" | "panel">("map");

  // Profile state using React state with localStorage initialization
  const [savedProfile, setSavedProfile] = useState<any>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

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
  const currentGeohashes = shouldShowLocalizedPrecision
    ? generateLocalizedGeohashes(primarySearchGeohash.toLowerCase())
    : generateGeohashes(geohashDisplayPrecision, null);

  // Initialize Nostr with animation callback
  const {
    recentEvents,
    geohashActivity,
    nostrEnabled,
    allStoredEvents,
    allEventsByGeohash,
  } = useNostr(searchGeohash, currentGeohashes, animateGeohash);

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
  }, []);

  // Handle profile saved - update state immediately
  const handleProfileSaved = (profile: any) => {
    // Directly update the profile state for immediate UI update
    setSavedProfile(profile);
  };

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
    parsedSearch.colors.length > 0;
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

    // Check for invalid geohash and log it
    if (eventGeohash && !VALID_GEOHASH_CHARS.test(eventGeohash)) {
      console.log(
        `Invalid geohash detected in message: "${eventGeohash}" from user ${
          username || "anonymous"
        } (${pubkeyHash})`
      );
      console.log(
        `Message content: "${event.content?.slice(0, 100)}${
          event.content && event.content.length > 100 ? "..." : ""
        }"`
      );
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
        const geohashMatch = parsedSearch.geohashes.some((searchGeohash) =>
          eventGeohash.startsWith(searchGeohash.toLowerCase())
        );
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

    return matches;
  });

  // Debug logging for header updates
  console.log(
    `Header update: search="${searchText}", filteredCount=${filteredEvents.length}, totalStored=${allStoredEvents.length}, recent=${recentEvents.length}`
  );

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
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#000000",
        color: "#00ff00",
        fontFamily: "Courier New, monospace",
        overflow: "hidden",
      }}
    >
      {/* eSIM Marquee Banner */}
      <MarqueeBanner />
      {/* Mobile Header */}
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
      />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          position: "relative",
          width: "100%",
          overflow: "hidden",
        }}
      >
        {/* Map - Always rendered, but might be hidden on mobile */}
        <div
          style={{
            width: "100%",
            height: "100%",
            display: activeView !== "map" ? "none" : "block",
          }}
        >
          <Map
            width={mapWidth}
            height={mapHeight}
            projection={projection}
            currentScale={currentScale}
            centerX={centerX}
            centerY={centerY}
            isDragging={isDragging}
            hasDragged={hasDragged}
            events={!!events}
            onMapClick={handleMapClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMoveWithDrag}
            onMouseUp={handleMouseUp}
            currentGeohashes={currentGeohashes}
            geohashActivity={geohashActivity}
            allEventsByGeohash={allEventsByGeohash}
            animatingGeohashes={animatingGeohashes}
            showSingleCharGeohashes={showSingleCharGeohashes}
            showGeohashText={showGeohashText}
            effectivePrecision={effectivePrecision}
            shouldShowLocalizedPrecision={!!shouldShowLocalizedPrecision}
            searchText={searchText}
            onGeohashClick={handleGeohashClickForSearch}
            theme={theme}
          />
        </div>

        {/* Mobile Layout - Show panels based on activeView */}
        <>
            {/* Chat View */}
            {activeView === "chat" && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#000000",
                  display: "flex",
                  flexDirection: "row",
                  overflow: "hidden",
                }}
              >
                {/* Left rail channels (persistent beside sub header and content) */}
                <div
                  style={{
                    width: "160px",
                    minWidth: "160px",
                    borderRight: "1px solid #003300",
                    background: "rgba(0, 0, 0, 0.9)",
                    color: "#00ff00",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.98)",
                      color: "#00aa00",
                      padding: "12px",
                      borderBottom: "1px solid #003300",
                      position: "sticky",
                      top: 0,
                      zIndex: 2,
                    }}
                  >
                    <div
                      style={{
                        fontSize: "16px",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        textShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
                      }}
                    >
                      CHANNELS
                    </div>
                  </div>
                  <div
                    style={{ overflowY: "auto", padding: "10px 8px", flex: 1 }}
                  >
                    {(() => {
                      const channelSet = new Set<string>();
                      allStoredEvents.forEach((ev) => {
                        const g = ev.tags.find((t: any) => t[0] === "g");
                        const d = ev.tags.find((t: any) => t[0] === "d");
                        const gv =
                          g && typeof g[1] === "string"
                            ? g[1].toLowerCase()
                            : "";
                        const dv =
                          d && typeof d[1] === "string"
                            ? d[1].toLowerCase()
                            : "";
                        if (gv) channelSet.add(`#${gv}`);
                        if (dv) channelSet.add(`#${dv}`);
                      });

                      // Hardcoded pinned channels
                      const pinnedChannels = ["#bitchat.land", "#21m"];
                      const allChannels = Array.from(channelSet).sort();

                      // Separate pinned and unpinned channels
                      // Force show all pinned channels even if they have no messages
                      const pinned = pinnedChannels; // Show all pinned channels regardless
                      const unpinned = allChannels.filter(
                        (ch) => !pinnedChannels.includes(ch)
                      );

                      // Combine: pinned first, then unpinned
                      const channels = [...pinned, ...unpinned];
                      if (channels.length === 0) {
                        return (
                          <div style={{ fontSize: "10px", opacity: 0.7 }}>
                            no channels
                          </div>
                        );
                      }
                      return channels.map((ch) => {
                        const channelValue = ch.slice(1).toLowerCase();
                        const isSelected = parsedSearch.geohashes.some(
                          (gh) => gh.toLowerCase() === channelValue
                        );
                        const latestTs = latestEventTimestampByChannel[ch] || 0;
                        const lastReadTs = channelLastReadMap[ch] || 0;
                        const hasUnread = latestTs > lastReadTs;
                        const showUnreadDot = hasUnread && !isSelected;
                        const isPinned = pinnedChannels.includes(ch);
                        const hasMessages = channelSet.has(ch); // Check if channel actually has messages

                        const handleOpenChannel = () => {
                          // Update search
                          handleTextSearch(`in:${channelValue}`);
                          // Mark channel as read now
                          const nowSec = Math.floor(Date.now() / 1000);
                          setChannelLastReadMap((prev) => {
                            const next = { ...prev, [ch]: nowSec };
                            persistChannelLastRead(next);
                            return next;
                          });
                        };

                        return (
                          <button
                            key={ch}
                            onClick={handleOpenChannel}
                            style={{
                              width: "100%",
                              textAlign: "left",
                              background: isSelected
                                ? "rgba(0, 255, 0, 0.08)"
                                : isPinned
                                ? "rgba(255, 255, 0, 0.05)"
                                : "transparent",
                              color: isSelected
                                ? "#00ff00"
                                : isPinned
                                ? hasMessages
                                  ? "#ffff00"
                                  : "#ffcc66"
                                : "#00ff00",
                              border: `1px solid ${
                                isSelected
                                  ? "#00ff00"
                                  : isPinned
                                  ? "#ffcc00"
                                  : "#003300"
                              }`,
                              boxShadow: isSelected
                                ? "0 0 10px rgba(0,255,0,0.15) inset"
                                : isPinned
                                ? "0 0 8px rgba(255,255,0,0.1) inset"
                                : "none",
                              borderRadius: "4px",
                              padding: "8px 8px",
                              fontSize: "13px",
                              cursor: "pointer",
                              transition: "all 0.2s ease",
                              marginBottom: isPinned ? "12px" : "8px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "rgba(0, 255, 0, 0.10)";
                              e.currentTarget.style.borderColor = "#00ff00";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = isSelected
                                ? "rgba(0, 255, 0, 0.08)"
                                : isPinned
                                ? "rgba(255, 255, 0, 0.05)"
                                : "transparent";
                              e.currentTarget.style.borderColor = isSelected
                                ? "#00ff00"
                                : isPinned
                                ? "#ffcc00"
                                : "#003300";
                            }}
                          >
                            <span
                              style={{
                                fontWeight: isSelected
                                  ? ("bold" as const)
                                  : ("normal" as const),
                              }}
                            >
                              {isPinned && "📌 "}
                              {ch}
                              {isPinned && !hasMessages && " (empty)"}
                            </span>
                            {showUnreadDot && (
                              <span
                                style={{
                                  width: "8px",
                                  height: "8px",
                                  backgroundColor: "#ff0033",
                                  borderRadius: "50%",
                                  boxShadow: "0 0 6px rgba(255,0,51,0.6)",
                                }}
                                title="Unread messages"
                              />
                            )}
                          </button>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Chat column */}
                <div
                  style={{ flex: 1, display: "flex", flexDirection: "column" }}
                >
                  {/* Sub header (chat) to align next to channels */}
                  <div
                    style={{
                      backgroundColor: "rgba(0, 0, 0, 0.98)",
                      color: "#00aa00",
                      padding: "12px 16px",
                      borderBottom: "1px solid #003300",
                    }}
                  >
                    <div
                      style={{
                        fontSize: "16px",
                        textTransform: "uppercase",
                        letterSpacing: "1px",
                        textShadow: "0 0 10px rgba(0, 255, 0, 0.5)",
                      }}
                    >
                      RECENT NOSTR EVENTS{" "}
                      {searchText ? `MATCHING "${searchText}"` : ""}
                    </div>
                  </div>

                  {/* Messages area */}
                  <div style={{ flex: 1, overflow: "hidden" }}>
                    <RecentEvents
                      nostrEnabled={nostrEnabled}
                      searchText={searchText}
                      allStoredEvents={allStoredEvents}
                      recentEvents={recentEvents}
                      onSearch={handleTextSearch}
                      onReply={handleReply}
                    />
                  </div>

                  {/* Chat input */}
                  <ChatInput
                    currentChannel={
                      selectedChannelKey
                        ? selectedChannelKey.slice(1)
                        : "global"
                    } // Use global if no specific channel
                    onMessageSent={handleMessageSent}
                    onOpenProfileModal={() => setShowProfileModal(true)}
                    prefillText={replyPrefillText}
                    savedProfile={savedProfile}
                    theme={theme}
                  />
                </div>
              </div>
            )}

            {/* Panel View */}
            {activeView === "panel" && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#000000",
                  overflow: "hidden",
                }}
              >
                <EventHierarchy
                  searchText={searchText}
                  allEventsByGeohash={allEventsByGeohash}
                  onSearch={handleTextSearch}
                />
              </div>
            )}
          </>
      </div>

      {/* Nostr Watermark */}
      <CornerOverlay position="bottom-right" theme={theme}>
        <a
          href="https://primal.net/p/nprofile1qqsvvullpd0j9rltp2a3qqvgy9udf3vgh389p7zhzu65fd258dz5lqg9ryan5"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 no-underline"
        >
          Follow me on Nostr
        </a>
      </CornerOverlay>

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
      />
    </div>
  );
}
