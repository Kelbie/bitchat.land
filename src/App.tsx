import React, { useState, useEffect } from "react";
// import { scaleQuantize } from "@visx/scale"; // Currently unused
// import { generateSampleHeatmapData } from "./utils/geohash"; // Currently unused
import { 
  generateGeohashes, 
  generateLocalizedGeohashes,
  getHierarchicalCounts 
} from "./utils/geohashUtils";

import { GeoMercatorProps } from "./types";
import { useDrag } from "./hooks/useDrag";
import { useZoom } from "./hooks/useZoom";
import { useNostr } from "./hooks/useNostr";
import { SearchPanel } from "./components/SearchPanel";
import { EventHierarchy } from "./components/EventHierarchy";
import { RecentEvents } from "./components/RecentEvents";
import { Map } from "./components/Map";
import { MobileHeader } from "./components/MobileHeader";
import { addGeohashToSearch, parseSearchQuery, buildSearchQuery } from "./utils/searchParser";
import { PROJECTIONS } from "./constants/projections";

// Valid geohash characters (base32 without 'a', 'i', 'l', 'o')
const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/;

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



export default function App({ width, height, events = true }: GeoMercatorProps) {
  const [projection] = useState(Object.keys(PROJECTIONS)[4]);
  // const [showHeatmap] = useState(true); // Currently unused
  // const [geohashPrecision] = useState(4); // Currently unused
  const [showSingleCharGeohashes] = useState(true);
  const [geohashDisplayPrecision, setGeohashDisplayPrecision] = useState(1);
  const [showGeohashText] = useState(true);

  // Mobile view state
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState<'map' | 'chat' | 'panel'>('map');

  // Search and zoom state
  const [searchText, setSearchText] = useState("");
  const [searchGeohash, setSearchGeohash] = useState("");
  const [animatingGeohashes, setAnimatingGeohashes] = useState<Set<string>>(new Set());

  // Header height constant - measured exact value
  const headerHeight = 182.2;

  // Calculate available map dimensions accounting for header
  const availableHeight = isMobile ? height - headerHeight : height;
  
  // Map positioning constants
  const mapWidth = width;
  const mapHeight = availableHeight;

  // Custom hooks
  const { isDragging, hasDragged, handleMouseDown, handleMouseMove, handleMouseUp } = useDrag();
  const { zoomedGeohash, zoomScale, zoomTranslate, zoomToGeohash, updateTranslate } = useZoom(mapWidth, mapHeight, projection);

  // Force mobile view for all screen sizes
  useEffect(() => {
    setIsMobile(true);
  }, []);



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
  
  // Determine the primary geohash for map display (use the first one if multiple)
  const primarySearchGeohash = parsedSearch.geohashes.length > 0 ? parsedSearch.geohashes[0] : "";
  
  // Synchronize searchGeohash state with parsed search and trigger zoom
  useEffect(() => {
    if (primarySearchGeohash !== searchGeohash) {
      setSearchGeohash(primarySearchGeohash);
      // Auto-zoom when geohash is in search
      if (primarySearchGeohash && /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(primarySearchGeohash)) {
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

  // Handle geohash clicks from map - add to text search
  const handleGeohashClickForSearch = (geohash: string) => {
    const newSearch = addGeohashToSearch(searchText, geohash);
    setSearchText(newSearch);
  };

  // Function to handle clicks on the map background (zoom out one level)
  const handleMapClick = () => {
    if (primarySearchGeohash && primarySearchGeohash.length > 0) {
      // Zoom out one level by removing the last character from the primary geohash
      const parentGeohash = primarySearchGeohash.slice(0, -1);
      
      // Update the search by replacing the current geohash with the parent
      const parsed = parseSearchQuery(searchText);
      parsed.geohashes = parsed.geohashes.map(g => 
        g === primarySearchGeohash ? parentGeohash : g
      ).filter(g => g.length > 0); // Remove empty geohashes
      
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
      centerY
    };
  };

  const { scale: currentScale, centerX, centerY } = getMapProjection();

  // Mouse/touch move handler that includes drag logic
  const handleMouseMoveWithDrag = (e: React.MouseEvent | React.TouchEvent) => {
    handleMouseMove(e, updateTranslate);
  };

  if (width < 10) return null;

  // Calculate data for mobile header using parsed search (same logic as RecentEvents)
  const hasSearchTerms = parsedSearch.text || parsedSearch.geohashes.length > 0 || parsedSearch.users.length > 0;
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
      console.log(`Invalid geohash detected in message: "${eventGeohash}" from user ${username || 'anonymous'} (${pubkeyHash})`);
      console.log(`Message content: "${event.content?.slice(0, 100)}${event.content && event.content.length > 100 ? '...' : ''}"`);
    }
    
    let matches = true;
    
    // Check text content if specified (only search message content, not usernames)
    if (parsedSearch.text) {
      const textMatch = messageContent.includes(parsedSearch.text.toLowerCase());
      if (!textMatch) matches = false;
    }
    
    // Check geohash filters if specified
    if (parsedSearch.geohashes.length > 0 && matches) {
      const geohashMatch = parsedSearch.geohashes.some(searchGeohash => 
        eventGeohash.startsWith(searchGeohash.toLowerCase())
      );
      if (!geohashMatch) matches = false;
    }
    
    // Check user filters if specified
    if (parsedSearch.users.length > 0 && matches) {
      const userMatch = parsedSearch.users.some(searchUser => {
        // Handle both "username" and "username#hash" formats
        if (searchUser.includes('#')) {
          const [searchUsername, searchHash] = searchUser.split('#');
          return username === searchUsername.toLowerCase() && 
                 pubkeyHash === searchHash.toLowerCase();
        } else {
          return username === searchUser.toLowerCase();
        }
      });
      if (!userMatch) matches = false;
    }
    
    return matches;
  });
  
  // Debug logging for header updates
  console.log(`Header update: search="${searchText}", filteredCount=${filteredEvents.length}, totalStored=${allStoredEvents.length}, recent=${recentEvents.length}`);

  const topLevelCounts: { [key: string]: number } = {};
  for (const [geohash, count] of allEventsByGeohash.entries()) {
    const firstChar = geohash.charAt(0);
    topLevelCounts[firstChar] = (topLevelCounts[firstChar] || 0) + count;
  }
  const totalEventsCount = Object.values(topLevelCounts).reduce((sum, count) => sum + count, 0);

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
      {/* Mobile Header */}
      {isMobile && (
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
        />
      )}

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
            display: isMobile && activeView !== 'map' ? 'none' : 'block',
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
          />
        </div>

        {/* Desktop Layout - Show all panels */}
        {!isMobile && (
          <>
            <SearchPanel
              searchText={searchText}
              onSearch={handleTextSearch}
              zoomedGeohash={zoomedGeohash}
            />

            <EventHierarchy
              searchText={searchText}
              allEventsByGeohash={allEventsByGeohash}
              onSearch={handleTextSearch}
            />

            <RecentEvents
              nostrEnabled={nostrEnabled}
              searchText={searchText}
              allStoredEvents={allStoredEvents}
              recentEvents={recentEvents}
              onSearch={handleTextSearch}
            />
          </>
        )}

        {/* Mobile Layout - Show panels based on activeView */}
        {isMobile && (
          <>
            {/* Chat View */}
            {activeView === 'chat' && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "#000000",
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <RecentEvents
                  nostrEnabled={nostrEnabled}
                  searchText={searchText}
                  allStoredEvents={allStoredEvents}
                  recentEvents={recentEvents}
                  isMobileView={true}
                  onSearch={handleTextSearch}
                />
              </div>
            )}

            {/* Panel View */}
            {activeView === 'panel' && (
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
                  isMobileView={true}
                />
              </div>
            )}
          </>
        )}
      </div>
      
      {/* Nostr Watermark */}
      <div
        style={{
          position: "fixed",
          bottom: "10px",
          right: "10px",
          zIndex: 9999,
          fontSize: "16px",
          fontFamily: "Courier New, monospace",
          opacity: 0.7,
          transition: "opacity 0.2s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.7";
        }}
      >
        <a
          href="https://primal.net/p/nprofile1qqsvvullpd0j9rltp2a3qqvgy9udf3vgh389p7zhzu65fd258dz5lqg9ryan5"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: "#00aa00",
            textDecoration: "none",
            textShadow: "0 0 3px rgba(0, 255, 0, 0.3)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          Follow me on Nostr
        </a>
      </div>
    </div>
  );
}
