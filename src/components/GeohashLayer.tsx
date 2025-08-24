import React from "react";
import { decodeGeohash, createGeohashPath } from "../utils/geohashUtils";
import { GeohashActivity } from "../types";

interface GeohashLayerProps {
  currentGeohashes: string[];
  projection: any;
  geohashActivity: Map<string, GeohashActivity>;
  allEventsByGeohash: Map<string, number>;
  animatingGeohashes: Set<string>;
  isDragging: boolean;
  hasDragged: boolean;
  events: boolean;
  showSingleCharGeohashes: boolean;
  showGeohashText: boolean;
  effectivePrecision: number;
  shouldShowLocalizedPrecision: boolean;
  searchGeohash: string;
  onGeohashClick: (geohash: string) => void;
}

export function GeohashLayer({
  currentGeohashes,
  projection,
  geohashActivity,
  allEventsByGeohash,
  animatingGeohashes,
  isDragging,
  hasDragged,
  events,
  showSingleCharGeohashes,
  showGeohashText,
  effectivePrecision,
  shouldShowLocalizedPrecision,
  searchGeohash,
  onGeohashClick,
}: GeohashLayerProps) {
  if (!showSingleCharGeohashes) return null;

  return (
    <>
      {currentGeohashes.map((geohash) => {
        const bounds = decodeGeohash(geohash);
        const pathData = createGeohashPath(bounds, projection);

        if (!pathData) return null;

        const activity = geohashActivity.get(geohash);

        // Calculate hierarchical event count for this specific geohash cell
        let hierarchicalEventCount = 0;
        for (const [eventGeohash, count] of allEventsByGeohash.entries()) {
          if (eventGeohash.startsWith(geohash)) {
            hierarchicalEventCount += count;
          }
        }

        const isAnimating = animatingGeohashes.has(geohash);
        const timeSinceActivity = activity
          ? Date.now() - activity.lastActivity
          : Infinity;
        const recentActivity = timeSinceActivity < 10000; // 10 seconds

        // Dynamic colors based on activity
        let fillColor = `rgba(0, 255, 0, 0.05)`; // Default subtle fill
        let strokeColor = `rgba(0, 255, 0, 0.3)`; // Default stroke

        // Show visual indication if there are hierarchical events
        if (hierarchicalEventCount > 0 && !isAnimating && !recentActivity) {
          fillColor = `rgba(0, 255, 0, 0.1)`;
          strokeColor = `rgba(0, 255, 0, 0.5)`;
        }

        if (isAnimating) {
          // Bright animation colors
          fillColor = `rgba(0, 255, 0, 0.6)`;
          strokeColor = `rgba(0, 255, 0, 1.0)`;
        } else if (recentActivity) {
          // Recent activity - fade out over time
          const fadeIntensity = Math.max(0.1, 1 - timeSinceActivity / 10000);
          fillColor = `rgba(0, 255, 0, ${0.05 + fadeIntensity * 0.15})`;
          strokeColor = `rgba(0, 255, 0, ${0.3 + fadeIntensity * 0.4})`;
        }

        // Calculate center point for label
        const centerLng = (bounds.minLng + bounds.maxLng) / 2;
        const centerLat = (bounds.minLat + bounds.maxLat) / 2;
        const centerPoint = projection([centerLng, centerLat]);

        // Show labels for higher precision levels when zoomed in
        const showLabel =
          effectivePrecision <= 8 &&
          (!shouldShowLocalizedPrecision ||
            (shouldShowLocalizedPrecision && searchGeohash.length <= 6));

        return (
          <g key={`geohash-${geohash}`}>
            <path
              d={pathData}
              fill={fillColor}
              stroke={strokeColor}
              strokeWidth={isAnimating ? "3" : "1"}
              filter={
                isAnimating ? "url(#activityGlow)" : "url(#matrixGlow)"
              }
              style={{
                cursor: "pointer",
                transition:
                  isAnimating || isDragging ? "none" : "all 0.3s ease",
              }}
              onClick={(e) => {
                if (events && !hasDragged) {
                  e.stopPropagation();
                  onGeohashClick(geohash);
                }
              }}
            />
            {/* Add text label at center */}
            {centerPoint && showLabel && showGeohashText && (
              <text
                x={centerPoint[0]}
                y={centerPoint[1]}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={isAnimating ? "#ffffff" : "#00ff00"}
                fontSize={
                  effectivePrecision === 1
                    ? "16"
                    : effectivePrecision === 2
                    ? "14"
                    : effectivePrecision === 3
                    ? "13"
                    : effectivePrecision === 4
                    ? "12"
                    : effectivePrecision === 5
                    ? "11"
                    : effectivePrecision === 6
                    ? "10"
                    : "9"
                }
                fontWeight="bold"
                fontFamily="Courier New, monospace"
                pointerEvents="none"
                style={{
                  letterSpacing: "1px",
                  filter: isAnimating
                    ? "drop-shadow(0 0 5px #00ff00)"
                    : "none",
                }}
              >
                {geohash}
                {activity && activity.eventCount > 0 && (
                  <tspan
                    x={centerPoint[0]}
                    dy="12"
                    fontSize="8"
                    fill="#00aa00"
                  >
                    {activity.eventCount}
                  </tspan>
                )}
                {!activity && hierarchicalEventCount > 0 && (
                  <tspan
                    x={centerPoint[0]}
                    dy="12"
                    fontSize="8"
                    fill="#00aa00"
                  >
                    ({hierarchicalEventCount})
                  </tspan>
                )}
              </text>
            )}
          </g>
        );
      })}
    </>
  );
}
