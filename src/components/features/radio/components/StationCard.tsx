import { StationWithDistance, Theme } from "@/types/filter";
import { HStack, VStack } from "@/components/ui/Layout";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

interface StationCardProps {
  station: StationWithDistance;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  theme: Theme;
  onClick: (station: StationWithDistance) => void;
}

const variants = cva("", {
  variants: {
    type: {
      card: "flex items-center gap-4 p-3 rounded-md cursor-pointer group transition-colors overflow-hidden",
      statusIndicator: "w-2 h-2 rounded-full flex-shrink-0",
      stationName: "font-medium break-words whitespace-normal",
      stationInfo: "text-sm break-words whitespace-normal",
      distance: "text-sm",
      badge: "text-xs px-2 py-1 rounded",
      languageBadge: "text-xs px-2 py-1 rounded",
      stats: "text-xs flex items-center gap-1",
      trend: "text-xs flex items-center gap-1",
      favicon: "w-12 h-12 flex-shrink-0",
      fallbackIcon: "w-12 h-12 rounded-md flex items-center justify-center",
      trackNumber: "w-8 flex justify-center flex-shrink-0",
      playIcon: "w-4 h-4 hidden group-hover:block",
      stationDetails: "flex-1 min-w-0",
      rightSection: "flex flex-col items-end gap-1 min-w-[80px] flex-shrink-0",
    },
    theme: {
      matrix: "",
      material: "",
    },
    isActive: {
      true: "",
      false: "",
    },
    isOnline: {
      true: "",
      false: "",
    },
    isPositive: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    // Card variants
    { type: "card", theme: "matrix", isActive: false, className: "hover:bg-green-400/10" },
    { type: "card", theme: "material", isActive: false, className: "hover:bg-gray-100" },
    { type: "card", theme: "matrix", isActive: true, className: "bg-green-400/20" },
    { type: "card", theme: "material", isActive: true, className: "bg-blue-50" },
    
    // Status indicator
    { type: "statusIndicator", theme: "matrix", isOnline: true, className: "bg-green-400" },
    { type: "statusIndicator", theme: "material", isOnline: true, className: "bg-green-500" },
    { type: "statusIndicator", isOnline: false, className: "bg-red-500" },
    
    // Station name
    { type: "stationName", theme: "matrix", className: "text-green-400" },
    { type: "stationName", theme: "material", isActive: true, className: "text-green-600" },
    { type: "stationName", theme: "material", isActive: false, className: "text-gray-900" },
    
    // Station info
    { type: "stationInfo", theme: "matrix", className: "text-green-400/70" },
    { type: "stationInfo", theme: "material", className: "text-gray-600" },
    
    // Distance
    { type: "distance", theme: "matrix", className: "text-green-400/70" },
    { type: "distance", theme: "material", className: "text-gray-500" },
    
    // Badges
    { type: "badge", theme: "matrix", className: "bg-green-400/10 text-green-400/80" },
    { type: "badge", theme: "material", className: "bg-blue-50 text-blue-600" },
    { type: "languageBadge", theme: "matrix", className: "bg-green-400/10 text-green-400/80" },
    { type: "languageBadge", theme: "material", className: "bg-gray-100 text-gray-600" },
    
    // Stats
    { type: "stats", theme: "matrix", className: "text-green-400/70" },
    { type: "stats", theme: "material", className: "text-gray-500" },
    
    // Trend
    { type: "trend", theme: "matrix", isPositive: true, className: "text-green-400" },
    { type: "trend", theme: "matrix", isPositive: false, className: "text-red-400" },
    { type: "trend", theme: "material", isPositive: true, className: "text-green-600" },
    { type: "trend", theme: "material", isPositive: false, className: "text-red-600" },
    
    // Fallback icon
    { type: "fallbackIcon", theme: "matrix", className: "bg-green-400/10 text-green-400" },
    { type: "fallbackIcon", theme: "material", className: "bg-gray-100 text-gray-400" },
  ],
});

export function StationCard({
  station,
  index,
  isActive,
  isPlaying,
  theme,
  onClick,
}: StationCardProps) {
  return (
    <div
      onClick={() => onClick(station)}
      className={cn(variants({ type: "card", theme, isActive }))}
    >
      {/* Track Number / Play Icon */}
      <div className={cn(variants({ type: "trackNumber" }))}>
        {isActive && isPlaying ? (
          <HStack gap="1">
            <div
              className={`w-1 h-3 ${
                theme === "matrix" ? "bg-green-400" : "bg-green-500"
              } animate-pulse`}
            />
            <div
              className={`w-1 h-4 ${
                theme === "matrix" ? "bg-green-400" : "bg-green-500"
              } animate-pulse`}
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className={`w-1 h-3 ${
                theme === "matrix" ? "bg-green-400" : "bg-green-500"
              } animate-pulse`}
              style={{ animationDelay: "0.4s" }}
            />
          </HStack>
        ) : (
          <span
            className={`text-sm ${
              theme === "matrix" ? "text-green-400/70" : "text-gray-500"
            } group-hover:hidden`}
          >
            {(index + 1).toString().padStart(2, "0")}
          </span>
        )}
        <svg
          className={cn(variants({ type: "playIcon" }), {
            "text-green-400": theme === "matrix",
            "text-gray-800": theme === "material",
          })}
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>

      {/* Station Favicon */}
      <div className={cn(variants({ type: "favicon" }))}>
        {station.favicon ? (
          <img
            src={station.favicon}
            alt={`${station.name} logo`}
            className="w-12 h-12 rounded-md object-cover bg-gray-100"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              e.currentTarget.nextElementSibling?.classList.remove("hidden");
            }}
          />
        ) : null}
        <div
          className={cn(variants({ type: "fallbackIcon", theme }), {
            hidden: station.favicon,
          })}
        >
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
      </div>

      {/* Station Info */}
      <VStack className={cn(variants({ type: "stationDetails" }))}>
        <HStack gap="2" align="center">
          <div className={cn(variants({ type: "stationName", theme, isActive }))}>
            {station.name}
          </div>
          <div
            className={cn(variants({ type: "statusIndicator", theme, isOnline: station.lastCheckOk }))}
            title={station.lastCheckOk ? "Online" : "Offline"}
          />
        </HStack>

        {/* Location and Tags */}
        <div className={cn(variants({ type: "stationInfo", theme }))}>
          {station.country}
          {station.state && station.state !== station.country && (
            <span>, {station.state}</span>
          )}
          {station.tags && station.tags.length > 0 && (
            <span> • {station.tags.slice(0, 2).join(", ")}</span>
          )}
        </div>

        {/* Technical Info */}
        <HStack gap="3" align="center">
          {/* Codec and Bitrate */}
          {station.codec && (
            <span className={cn(variants({ type: "badge", theme }))}>
              {station.codec}
              {station.bitrate && ` • ${station.bitrate}k`}
            </span>
          )}

          {/* Language */}
          {station.language && station.language.length > 0 && (
            <span className={cn(variants({ type: "languageBadge", theme }))}>
              {station.language[0]}
            </span>
          )}
        </HStack>
      </VStack>

      {/* Distance and Popularity */}
      <VStack className={cn(variants({ type: "rightSection" }))}>
        {/* Distance */}
        <div className={cn(variants({ type: "distance", theme }))}>
          {station.distanceKm.toFixed(1)} km
        </div>

        {/* Popularity Indicators */}
        <HStack gap="1" align="center">
          {/* Votes */}
          {station.votes > 0 && (
            <span className={cn(variants({ type: "stats", theme }))}>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
              {station.votes}
            </span>
          )}

          {/* Click Count */}
          {station.clickCount > 0 && (
            <span className={cn(variants({ type: "stats", theme }))}>
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" />
              </svg>
              {station.clickCount}
            </span>
          )}

          {/* Click Trend */}
          {station.clickTrend !== 0 && (
            <span
              className={cn(variants({ type: "trend", theme, isPositive: station.clickTrend > 0 }))}
            >
              {station.clickTrend > 0 ? (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14l5-5 5 5z" />
                </svg>
              ) : (
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 10l5 5 5-5z" />
                </svg>
              )}
              {Math.abs(station.clickTrend)}
            </span>
          )}
        </HStack>
      </VStack>
    </div>
  );
}
