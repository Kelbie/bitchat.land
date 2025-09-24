import { StationWithDistance, Theme } from "@/types/app";
import { StationCard } from "./StationCard";
import { VStack, Center } from "@/components/ui/layout/Layout";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

interface StationListProps {
  theme: Theme;
  stations: StationWithDistance[];
  currentStation: StationWithDistance | null;
  isPlaying: boolean;
  onStationPlay: (station: StationWithDistance) => void;
}

const variants = cva("", {
  variants: {
    type: {
      container: "flex-1 min-h-0 overflow-y-auto",
      list: "space-y-1 h-full",
      emptyState: "flex-1 flex items-center justify-center",
      emptyContent: "text-center",
      emptyIcon: "mx-auto mb-4 opacity-50",
      emptyText: "text-sm mt-2",
    },
    theme: {
      matrix: "",
      material: "",
    },
  },
  compoundVariants: [
    { type: "emptyContent", theme: "matrix", className: "text-green-400/50" },
    { type: "emptyContent", theme: "material", className: "text-gray-400" },
  ],
});

export function StationList({
  theme,
  stations,
  currentStation,
  isPlaying,
  onStationPlay,
}: StationListProps) {
  if (stations.length === 0) {
    return (
      <Center className={cn(variants({ type: "emptyState" }))}>
        <VStack className={cn(variants({ type: "emptyContent", theme }))}>
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="currentColor"
            className={cn(variants({ type: "emptyIcon" }))}
          >
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
          <p>Search for radio stations using a geohash</p>
          <p className={cn(variants({ type: "emptyText" }))}>Example: "in:gc"</p>
        </VStack>
      </Center>
    );
  }

  return (
    <div className={cn(variants({ type: "container" }))}>
      <VStack className={cn(variants({ type: "list" }))}>
        {stations
          .sort((a, b) => a.distanceKm - b.distanceKm)
          .map((station, index) => (
            <StationCard
              key={station.id}
              station={station}
              index={index}
              isActive={currentStation?.id === station.id}
              isPlaying={currentStation?.id === station.id && isPlaying}
              theme={theme}
              onClick={onStationPlay}
            />
          ))}
      </VStack>
    </div>
  );
}