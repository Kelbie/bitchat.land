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
  const [projection] = useState("natural_earth");
  // const [showHeatmap] = useState(true); // Currently unused
  // const [geohashPrecision] = useState(4); // Currently unused
  const [showSingleCharGeohashes] = useState(true);
  const [geohashDisplayPrecision, setGeohashDisplayPrecision] = useState(1);
  const [showGeohashText] = useState(true);

  // Mobile view state
  const [isMobile, setIsMobile] = useState(false);
  const [activeView, setActiveView] = useState<'map' | 'chat' | 'panel'>('map');

  // Search and zoom state
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

  // Determine if we should show localized precision
  const shouldShowLocalizedPrecision =
    searchGeohash &&
    searchGeohash.length >= 1 &&
    /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(searchGeohash);
  const effectivePrecision = shouldShowLocalizedPrecision
    ? searchGeohash.length + 1
    : geohashDisplayPrecision;

  // Generate only localized geohashes when searching, otherwise use global precision
  const currentGeohashes = shouldShowLocalizedPrecision
    ? generateLocalizedGeohashes(searchGeohash.toLowerCase())
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

  // Handle search input
  const handleSearch = (value: string) => {
    setSearchGeohash(value);

    // Reset precision when search is cleared
    if (!value) {
      setGeohashDisplayPrecision(1);
    }

    // Auto-zoom when user types a valid geohash
    if (value && /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(value)) {
      zoomToGeohash(value.toLowerCase());
    } else if (!value) {
      zoomToGeohash(""); // Reset zoom
    }
  };

  // Function to handle clicks on the map background (zoom out one level)
  const handleMapClick = () => {
    if (searchGeohash && searchGeohash.length > 0) {
      // Zoom out one level by removing the last character
      const parentGeohash = searchGeohash.slice(0, -1);
      handleSearch(parentGeohash);
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

  // Calculate data for mobile header
  const eventsToShow = searchGeohash ? allStoredEvents : recentEvents;
  const filteredEvents = eventsToShow.filter((event) => {
    if (!searchGeohash) return true;
    const geoTag = event.tags.find((tag: any) => tag[0] === "g");
    const eventGeohash = geoTag ? geoTag[1] : "";
    return eventGeohash.startsWith(searchGeohash.toLowerCase());
  });
  
  // Debug logging for header updates
  console.log(`Header update: search="${searchGeohash}", filteredCount=${filteredEvents.length}, totalStored=${allStoredEvents.length}, recent=${recentEvents.length}`);

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
          searchGeohash={searchGeohash}
          onSearch={handleSearch}
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
            searchGeohash={searchGeohash}
            onGeohashClick={handleSearch}
          />
        </div>

        {/* Desktop Layout - Show all panels */}
        {!isMobile && (
          <>
            <SearchPanel
              searchGeohash={searchGeohash}
              onSearch={handleSearch}
              zoomedGeohash={zoomedGeohash}
            />

            <EventHierarchy
              searchGeohash={searchGeohash}
              allEventsByGeohash={allEventsByGeohash}
              onSearch={handleSearch}
            />

            <RecentEvents
              nostrEnabled={nostrEnabled}
              searchGeohash={searchGeohash}
              allStoredEvents={allStoredEvents}
              recentEvents={recentEvents}
              onSearch={handleSearch}
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
                  searchGeohash={searchGeohash}
                  allStoredEvents={allStoredEvents}
                  recentEvents={recentEvents}
                  isMobileView={true}
                  onSearch={handleSearch}
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
                  searchGeohash={searchGeohash}
                  allEventsByGeohash={allEventsByGeohash}
                  onSearch={handleSearch}
                  isMobileView={true}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
