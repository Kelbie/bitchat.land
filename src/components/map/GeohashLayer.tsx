// Improved GeohashLayer.tsx with rapid flash animations and minimal state

import React, { useMemo, useCallback } from "react";
import { decodeGeohash, createGeohashPath } from "../../utils/geohashUtils";
import { parseSearchQuery } from "../../utils/searchParser";
import { globalStyles } from "../../styles";
import { getTagValue } from "../../hooks/useNostr";

interface GeohashLayerProps {
  currentGeohashes: string[];
  projection: any;
  filteredEvents: any[];
  isDragging: boolean;
  hasDragged: boolean;
  events: boolean;
  showSingleCharGeohashes: boolean;
  showGeohashText: boolean;
  effectivePrecision: number;
  shouldShowLocalizedPrecision: boolean;
  searchText: string;
  onGeohashClick: (geohash: string) => void;
  theme?: "matrix" | "material";
}

export function GeohashLayer({
  currentGeohashes,
  projection,
  filteredEvents,
  isDragging,
  hasDragged,
  events,
  showSingleCharGeohashes,
  showGeohashText,
  effectivePrecision,
  shouldShowLocalizedPrecision,
  searchText,
  onGeohashClick,
  theme = "matrix",
}: GeohashLayerProps) {
  if (!showSingleCharGeohashes) return null;

  const styles = globalStyles["GeohashLayer"];
  const t = styles[theme];

  // Parse search to get geohash info for display logic
  const parsedSearch = useMemo(() => parseSearchQuery(searchText), [searchText]);
  const primarySearchGeohash = parsedSearch.geohashes.length > 0 ? parsedSearch.geohashes[0] : "";

  // Calculate counts and recent activity for all geohashes
  const geohashData = useMemo(() => {
    const now = Date.now();
    const recentThreshold = 2000; // 2 seconds for "recent" activity
    const flashThreshold = 500;   // 500ms for rapid flash detection
    
    return currentGeohashes.map(geohash => {
      // Get all events for this geohash
      const geohashEvents = filteredEvents.filter(event =>
        getTagValue(event, "g")?.startsWith(geohash)
      );
      
      // Sort by timestamp to get recent activity patterns
      const sortedEvents = geohashEvents
        .filter(event => event.created_at)
        .sort((a, b) => b.created_at - a.created_at);
      
      const eventCount = geohashEvents.length;
      const latestEventTime = sortedEvents.length > 0 ? sortedEvents[0].created_at * 1000 : 0;
      const timeSinceLatest = now - latestEventTime;
      
      // Check for rapid activity (multiple events in quick succession)
      let rapidFlashCount = 0;
      if (sortedEvents.length > 1) {
        for (let i = 0; i < Math.min(sortedEvents.length - 1, 10); i++) {
          const timeDiff = (sortedEvents[i].created_at - sortedEvents[i + 1].created_at) * 1000;
          if (timeDiff < flashThreshold) {
            rapidFlashCount++;
          } else {
            break; // Stop at first gap longer than threshold
          }
        }
      }
      
      // Determine animation state
      const isRecent = timeSinceLatest < recentThreshold;
      const isRapidFlashing = rapidFlashCount > 0 && isRecent;
      const flashIntensity = Math.min(rapidFlashCount / 3, 1); // Cap at 1.0
      
      return {
        geohash,
        eventCount,
        isRecent,
        isRapidFlashing,
        flashIntensity,
        timeSinceLatest,
      };
    });
  }, [currentGeohashes, filteredEvents]);

  // Show labels for higher precision levels when zoomed in
  const showLabel = useMemo(() => 
    effectivePrecision <= 8 &&
    (!shouldShowLocalizedPrecision ||
      (shouldShowLocalizedPrecision && primarySearchGeohash.length <= 6))
  , [effectivePrecision, shouldShowLocalizedPrecision, primarySearchGeohash]);

  const handleGeohashClick = useCallback((geohash: string) => (e: React.MouseEvent) => {
    if (events && !hasDragged) {
      e.stopPropagation();
      onGeohashClick(geohash);
    }
  }, [events, hasDragged, onGeohashClick]);

  return (
    <>
      {geohashData.map(({ 
        geohash, 
        eventCount, 
        isRecent, 
        isRapidFlashing, 
        flashIntensity,
        timeSinceLatest 
      }) => {
        const bounds = decodeGeohash(geohash);
        const pathData = createGeohashPath(bounds, projection);

        if (!pathData) return null;

        // Dynamic colors based on activity state
        let fillColor = `rgba(${t.base}, 0.05)`; // Default subtle fill
        let strokeColor = `rgba(${t.base}, 0.3)`; // Default stroke
        let strokeWidth = "1";
        let animationClass = "";
        let filter = "url(#matrixGlow)";

        if (isRapidFlashing) {
          // Rapid flashing - very intense and fast
          const baseIntensity = 0.7 + flashIntensity * 0.3;
          fillColor = `rgba(${t.base}, ${baseIntensity})`;
          strokeColor = `rgba(${t.base}, 1.0)`;
          strokeWidth = "4";
          filter = "url(#activityGlow)";
          
          // Custom rapid flash animation
          animationClass = `animate-pulse`;
          
        } else if (isRecent && eventCount > 0) {
          // Recent activity - fade out over time
          const fadeIntensity = Math.max(0.1, 1 - timeSinceLatest / 2000);
          fillColor = `rgba(${t.base}, ${0.1 + fadeIntensity * 0.4})`;
          strokeColor = `rgba(${t.base}, ${0.4 + fadeIntensity * 0.6})`;
          strokeWidth = "3";
          filter = "url(#activityGlow)";
          
        } else if (eventCount > 0) {
          // Has events but not recent - steady glow
          const intensity = Math.min(1, Math.log10(eventCount + 1) / 2);
          fillColor = `rgba(${t.base}, ${0.05 + intensity * 0.15})`;
          strokeColor = `rgba(${t.base}, ${0.3 + intensity * 0.4})`;
          strokeWidth = "2";
        }

        // Calculate center point for label
        const centerLng = (bounds.minLng + bounds.maxLng) / 2;
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerPoint = projection([centerLng, centerLat]);

        return (
          <g key={`geohash-${geohash}`}>
            <path
              d={pathData}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              filter={filter}
              className={`cursor-pointer ${animationClass} ${
                isRapidFlashing || isDragging ? "" : "transition-all duration-300"
              }`}
              onClick={handleGeohashClick(geohash)}
              style={isRapidFlashing ? {
                animation: `rapidFlash ${300 - flashIntensity * 100}ms infinite alternate`,
              } : undefined}
            />
            {/* Add text label at center */}
            {centerPoint && showLabel && showGeohashText && (
              <text
                x={centerPoint[0]}
                y={centerPoint[1]}
                textAnchor="middle"
                dominantBaseline="middle"
                className={`${isRapidFlashing ? "fill-white animate-pulse" : t.text} tracking-[1px]`}
                fontSize={
                  effectivePrecision === 1 ? "16" :
                  effectivePrecision === 2 ? "14" :
                  effectivePrecision === 3 ? "13" :
                  effectivePrecision === 4 ? "12" :
                  effectivePrecision === 5 ? "11" :
                  effectivePrecision === 6 ? "10" : "9"
                }
                pointerEvents="none"
                style={{
                  filter: isRapidFlashing
                    ? `drop-shadow(0 0 8px rgb(${t.base})) drop-shadow(0 0 4px rgb(${t.base}))`
                    : "none",
                }}
              >
                {geohash}
                {/* Show the event count if there are events */}
                {eventCount > 0 && (
                  <tspan
                    x={centerPoint[0]}
                    dy="12"
                    fontSize="8"
                    className={`${isRapidFlashing ? "fill-white animate-bounce" : t.count}`}
                    style={isRapidFlashing ? {
                      animation: `countPulse ${200 - flashIntensity * 50}ms infinite alternate`,
                    } : undefined}
                  >
                    {eventCount}
                  </tspan>
                )}
              </text>
            )}
          </g>
        );
      })}
      
      {/* Add custom CSS animations */}
      <defs>
        <style>{`
          @keyframes rapidFlash {
            0% { opacity: 0.8; transform: scale(1); }
            100% { opacity: 1; transform: scale(1.05); }
          }
          
          @keyframes countPulse {
            0% { transform: scale(1); }
            100% { transform: scale(1.3); }
          }
        `}</style>
      </defs>
    </>
  );
}