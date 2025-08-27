import React from "react";
import { CustomProjection } from "@visx/geo";
import * as topojson from "topojson-client";
import topology from "../data/world-topo.json";
import { FeatureShape } from "../types";
import { GeohashLayer } from "./GeohashLayer";
import { PROJECTIONS } from "../constants/projections";

// @ts-expect-error
const world = topojson.feature(topology, topology.objects.units) as {
  type: "FeatureCollection";
  features: FeatureShape[];
};

world.features = [...world.features];

function filterCountries(countries: FeatureShape[]) {
  return countries;
}

interface MapProps {
  width: number;
  height: number;
  projection: string;
  currentScale: number;
  centerX: number;
  centerY: number;
  isDragging: boolean;
  hasDragged: boolean;
  events: boolean;
  onMapClick: () => void;
  onMouseDown: (e: React.MouseEvent | React.TouchEvent) => void;
  onMouseMove: (e: React.MouseEvent | React.TouchEvent) => void;
  onMouseUp: () => void;
  // Geohash layer props
  currentGeohashes: string[];
  geohashActivity: Map<string, any>;
  allEventsByGeohash: Map<string, number>;
  animatingGeohashes: Set<string>;
  showSingleCharGeohashes: boolean;
  showGeohashText: boolean;
  effectivePrecision: number;
  shouldShowLocalizedPrecision: boolean;
  searchText: string;
  onGeohashClick: (geohash: string) => void;
  theme?: "matrix" | "material";
}

const styles = {
  matrix: {
    svg: "absolute top-0 left-0",
    rectFill: "url(#matrixLines)",
    pathFill: "#001100",
    timezoneStroke: "rgba(0,255,0,0.05)",
    regionStroke: "rgba(0,255,0,0.1)",
  },
  material: {
    svg: "absolute top-0 left-0",
    rectFill: "#f1f5f9",
    pathFill: "#e5e7eb",
    timezoneStroke: "rgba(59,130,246,0.2)",
    regionStroke: "rgba(59,130,246,0.3)",
  },
} as const;

export function Map({
  width,
  height,
  projection,
  currentScale,
  centerX,
  centerY,
  isDragging,
  hasDragged,
  events,
  onMapClick,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  currentGeohashes,
  geohashActivity,
  allEventsByGeohash,
  animatingGeohashes,
  showSingleCharGeohashes,
  showGeohashText,
  effectivePrecision,
  shouldShowLocalizedPrecision,
  searchText,
  onGeohashClick,
  theme = "matrix",
}: MapProps) {
  const t = styles[theme];
  return (
    <section aria-label="Interactive World Map with Geohash Heatmap">
      <svg
        width={width}
        height={height}
        className={`${t.svg} ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
        role="img"
        aria-label="World map with geohash-based chat activity heatmap"
        onClick={(e) => {
          // Only handle click if it's on the svg background (not on any child elements)
          if (e.target === e.currentTarget && !hasDragged) {
          onMapClick();
        }
      }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp} // Stop dragging if mouse leaves the SVG
      onTouchStart={onMouseDown}
      onTouchMove={onMouseMove}
      onTouchEnd={onMouseUp}
      onTouchCancel={onMouseUp}
    >
      <defs>
        <filter id="matrixGlow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="activityGlow">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <pattern
          id="matrixLines"
          x="0"
          y="0"
          width="20"
          height="20"
          patternUnits="userSpaceOnUse"
        >
          <rect width="20" height="20" fill="#000000" />
          <path
            d="M 0 10 L 20 10 M 10 0 L 10 20"
            stroke="#003300"
            strokeWidth="0.5"
            opacity="0.3"
          />
        </pattern>
      </defs>

      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill={t.rectFill}
        rx={0}
        onClick={(e) => {
          if (!hasDragged) {
            e.stopPropagation();
            onMapClick();
          }
        }}
        className={isDragging ? "cursor-grabbing" : "cursor-grab"}
      />
      
      <CustomProjection<FeatureShape>
        projection={PROJECTIONS[projection]}
        data={filterCountries(world.features)}
        scale={currentScale}
        translate={[centerX, centerY]}
      >
        {(mercator) => (
          <g>
            {mercator.features.map(({ feature, path }, i) => {
              return (
                <path
                  id={feature.properties.name}
                  key={`map-feature-${i}`}
                  d={path || ""}
                  fill={t.pathFill}
                  strokeLinecap="butt"
                  strokeLinejoin="round"
                  strokeDasharray="2,2"
                  stroke={
                    (feature.properties as any).featurecla === "Timezone"
                      ? t.timezoneStroke
                      : t.regionStroke
                  }
                  strokeWidth={Number(feature.id) ? "0.25" : "0.75"}
                  filter="url(#matrixGlow)"
                  onClick={(e) => {
                    if (events && !hasDragged) {
                      e.stopPropagation();
                      onMapClick();
                    }
                  }}
                />
              );
            })}

            <GeohashLayer
              currentGeohashes={currentGeohashes}
              projection={mercator.projection}
              geohashActivity={geohashActivity}
              allEventsByGeohash={allEventsByGeohash}
              animatingGeohashes={animatingGeohashes}
              isDragging={isDragging}
              hasDragged={hasDragged}
              events={events}
              showSingleCharGeohashes={showSingleCharGeohashes}
              showGeohashText={showGeohashText}
              effectivePrecision={effectivePrecision}
              shouldShowLocalizedPrecision={shouldShowLocalizedPrecision}
              searchText={searchText}
              onGeohashClick={onGeohashClick}
              theme={theme}
            />
          </g>
        )}
      </CustomProjection>
    </svg>
    </section>
  );
}
