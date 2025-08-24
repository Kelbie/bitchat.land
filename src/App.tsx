import React, { useState, useEffect } from "react";
// import { scaleQuantize } from "@visx/scale"; // Currently unused
// import { generateSampleHeatmapData } from "./utils/geohash"; // Currently unused
import { 
  generateGeohashes, 
  generateLocalizedGeohashes 
} from "./utils/geohashUtils";
import { PROJECTIONS } from "./constants/projections";
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

  // Custom hooks
  const { isDragging, hasDragged, handleMouseDown, handleMouseMove, handleMouseUp } = useDrag();
  const { zoomedGeohash, zoomScale, zoomTranslate, zoomToGeohash, updateTranslate } = useZoom(width, height, projection);

  // State for header height
  const [headerHeight, setHeaderHeight] = useState(0);

  // Check if mobile on mount and window resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Measure header height after it renders
  useEffect(() => {
    if (isMobile) {
      const header = document.querySelector('header');
      if (header) {
        const resizeObserver = new ResizeObserver(() => {
          setHeaderHeight(header.offsetHeight);
        });
        resizeObserver.observe(header);
        
        // Initial measurement
        setHeaderHeight(header.offsetHeight);
        
        return () => resizeObserver.disconnect();
      }
    } else {
      setHeaderHeight(0);
    }
  }, [isMobile]);

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

  // Calculate initial scale to fit the world map in viewport
  const calculateInitialScale = () => {
    if (width < 10 || height < 10) return 250;

    // Create a temporary projection to calculate world bounds
    const tempProjection = PROJECTIONS[projection as keyof typeof PROJECTIONS]().scale(1).translate([0, 0]);

    // Calculate approximate world bounds in projected coordinates
    // Sample points around the world to get bounds
    const samplePoints = [
      [-180, -85],
      [180, -85], // Bottom corners
      [-180, 85],
      [180, 85], // Top corners
      [-90, 0],
      [90, 0], // Middle points
      [0, -85],
      [0, 85], // Poles
    ];

    const projectedPoints = samplePoints
      .map((point) => tempProjection(point))
      .filter(
        (p) =>
          p !== null &&
          p !== undefined &&
          !isNaN(p[0]) &&
          !isNaN(p[1]) &&
          isFinite(p[0]) &&
          isFinite(p[1])
      );

    if (projectedPoints.length === 0) return 250;

    // Find bounds of projected points
    const minX = Math.min(...projectedPoints.map((p) => p[0]));
    const maxX = Math.max(...projectedPoints.map((p) => p[0]));
    const minY = Math.min(...projectedPoints.map((p) => p[1]));
    const maxY = Math.max(...projectedPoints.map((p) => p[1]));

    const projectedWidth = maxX - minX;
    const projectedHeight = maxY - minY;

    // Add padding (10% on each side)
    const padding = 0.1;
    const availableWidth = width * (1 - 2 * padding);
    const availableHeight = height * (1 - 2 * padding);

    // Calculate scale to fit both dimensions
    const scaleX = projectedWidth > 0 ? availableWidth / projectedWidth : 1;
    const scaleY = projectedHeight > 0 ? availableHeight / projectedHeight : 1;

    // Use the smaller scale and ensure reasonable bounds
    return Math.max(50, Math.min(scaleX, scaleY, 1000));
  };

  // Calculate initial scale based on viewport and projection
  const initialScale = calculateInitialScale();

  const scale = initialScale;
  const centerX = width / 2 + zoomTranslate[0];
  const centerY = height / 2 + zoomTranslate[1];
  const currentScale = zoomedGeohash ? zoomScale : scale;

  // Mouse move handler that includes drag logic
  const handleMouseMoveWithDrag = (e: React.MouseEvent) => {
    handleMouseMove(e, updateTranslate);
  };

  if (width < 10) return null;

  // Adjust dimensions for mobile header
  const adjustedHeight = isMobile ? height - headerHeight : height;
  const adjustedWidth = width;

  return (
    <div
      style={{
        position: "relative",
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
        />
      )}

      {/* Main Content Area */}
      <div
        style={{
          position: "relative",
          width: "100%",
          height: isMobile ? `calc(100vh - ${headerHeight}px)` : "100vh",
          marginTop: isMobile ? `${headerHeight}px` : "0",
          overflow: "hidden",
        }}
      >
        {/* Map - Always rendered, but might be hidden on mobile */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: isMobile && activeView !== 'map' ? 'none' : 'block',
          }}
        >
          <Map
            width={adjustedWidth}
            height={adjustedHeight}
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
                  padding: "10px",
                }}
              >
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <RecentEvents
                    nostrEnabled={nostrEnabled}
                    searchGeohash={searchGeohash}
                    allStoredEvents={allStoredEvents}
                    recentEvents={recentEvents}
                    isMobileView={true}
                  />
                </div>
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
                  padding: "10px",
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
