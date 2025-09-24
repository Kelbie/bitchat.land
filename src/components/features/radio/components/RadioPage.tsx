import { RadioPageProps } from "@/types/app";
import { StationList } from "./StationList";
import { FilterSection } from "./FilterSection";
import { PlayerBar } from "./PlayerBar";
import { VStack, HStack } from "@/components/ui/layout/Layout";
import { useRadioStations, useRadioFilters, useRadioPlayer } from "@/components/features/radio/hooks";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

// Theme variants
const variants = cva("", {
  variants: {
    type: {
      container: "h-full flex flex-col",
      content: "flex-1 flex flex-col min-h-0",
      searchPrompt: "text-center mb-8",
      loading: "text-center p-8",
      error: "text-center p-4",
    },
    theme: {
      matrix: "",
      material: "",
    },
  },
  compoundVariants: [
    { type: "container", theme: "matrix", className: "bg-gray-900 text-green-400 p-4" },
    { type: "container", theme: "material", className: "bg-gray-50 text-gray-800 p-4" },
    { type: "searchPrompt", theme: "matrix", className: "text-green-400/70" },
    { type: "searchPrompt", theme: "material", className: "text-gray-600" },
    { type: "loading", theme: "matrix", className: "text-green-400" },
    { type: "loading", theme: "material", className: "text-blue-600" },
    { type: "error", theme: "matrix", className: "text-red-400" },
    { type: "error", theme: "material", className: "text-red-500" },
  ],
});

export function RadioPage({ searchText, theme }: RadioPageProps) {
  const { stations, isLoading, error, geohash } = useRadioStations(searchText);
  const { filteredStations, filterData, filterState, filterActions } = useRadioFilters(stations);
  const { playerState, playerActions, handleStationPlay } = useRadioPlayer(stations);

  return (
    <div className={cn(variants({ type: "container", theme }))}>
      <VStack className={cn(variants({ type: "content" }))}>
        {/* Search Prompt */}
        {!geohash && (
          <div className={cn(variants({ type: "searchPrompt", theme }))}>
            <p>Type a search with a geohash to discover radio stations!</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className={cn(variants({ type: "loading", theme }))}>
            <HStack gap="2" align="center">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="animate-spin"
              >
                <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.89 2 2 2h16c1.11 0 2-.9 2-2V8c0-1.11-.89-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h4V6h2v2h10v4z" />
              </svg>
              <span>Tuning to {geohash}...</span>
            </HStack>
          </div>
        )}

        {/* Error State */}
        {error && <div className={cn(variants({ type: "error", theme }))}>⚠️ {error}</div>}

        {/* Filter Section */}
        <FilterSection
          theme={theme}
          data={filterData}
          state={filterState}
          actions={filterActions}
        />

        {/* Station List */}
        <StationList
          theme={theme}
          stations={filteredStations}
          currentStation={playerState.currentStation}
          isPlaying={playerState.isPlaying}
          onStationPlay={handleStationPlay}
        />
      </VStack>

      {/* Player Bar */}
      {stations.length > 0 && (
        <PlayerBar
          theme={theme}
          state={playerState}
          actions={playerActions}
        />
      )}
    </div>
  );
}