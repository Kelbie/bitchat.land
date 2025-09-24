import { Slider } from "@/components/ui/data";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { HStack, VStack } from "@/components/ui/layout/Layout";
import { PlayerBarProps } from "@/types/app";

const variants = cva("", {
  variants: {
    type: {
      container: "z-50 fixed bottom-0 left-0 right-0 p-4 backdrop-blur",
      content: "flex items-center justify-between max-w-screen-xl mx-auto",
      stationInfo: "flex items-center gap-4 flex-1 min-w-0 max-w-[30%]",
      favicon: "w-14 h-14 flex-shrink-0",
      fallbackIcon: "w-14 h-14 rounded-md flex items-center justify-center",
      trackInfo: "min-w-0 flex-1",
      stationName: "font-medium truncate",
      stationSubtitle: "text-sm truncate",
      heartButton: "p-2 transition-colors",
      controls: "flex flex-col items-center gap-2 flex-1 max-w-[40%]",
      controlButtons: "flex items-center gap-4",
      controlButton: "transition-colors",
      playButton: "w-8 h-8 rounded-full flex items-center justify-center transition-colors",
      progressBar: "flex items-center gap-2 w-full max-w-md",
      time: "text-xs w-10 text-right",
      progressTrack: "flex-1 h-1 rounded-full cursor-pointer relative group",
      progressFill: "h-full rounded-full transition-all duration-100",
      progressDot: "absolute top-1/2 transform -translate-y-1/2 w-3 h-3 rounded-full shadow-lg transition-all duration-100",
      volumeControls: "flex items-center gap-3 flex-1 justify-end max-w-[30%]",
      volumeButton: "transition-colors",
    },
    theme: {
      matrix: "",
      material: "",
    },
  },
  compoundVariants: [
    // Container
    { type: "container", theme: "matrix", className: "bg-gray-900/95 border-t border-green-400/30" },
    { type: "container", theme: "material", className: "bg-white border-t border-gray-200" },
    
    // Fallback Icon
    { type: "fallbackIcon", theme: "matrix", className: "bg-green-400/20 border border-green-400/30 text-green-400/50" },
    { type: "fallbackIcon", theme: "material", className: "bg-gray-200 text-gray-400" },
    
    // Text Colors
    { type: "stationName", theme: "matrix", className: "text-green-400" },
    { type: "stationName", theme: "material", className: "text-gray-900" },
    { type: "stationSubtitle", theme: "matrix", className: "text-green-400/70" },
    { type: "stationSubtitle", theme: "material", className: "text-gray-600" },
    
    // Buttons
    { type: "heartButton", theme: "matrix", className: "text-green-400/70 hover:text-green-400" },
    { type: "heartButton", theme: "material", className: "text-gray-500 hover:text-gray-700" },
    { type: "controlButton", theme: "matrix", className: "text-green-400/70 hover:text-green-400" },
    { type: "controlButton", theme: "material", className: "text-gray-500 hover:text-gray-700" },
    { type: "playButton", theme: "matrix", className: "bg-green-400 text-gray-900 hover:bg-green-400/80" },
    { type: "playButton", theme: "material", className: "bg-gray-900 text-white hover:bg-black" },
    
    // Progress
    { type: "time", theme: "matrix", className: "text-green-400/70" },
    { type: "time", theme: "material", className: "text-gray-500" },
    { type: "progressTrack", theme: "matrix", className: "bg-green-400/30" },
    { type: "progressTrack", theme: "material", className: "bg-gray-300" },
    { type: "progressFill", theme: "matrix", className: "bg-green-400" },
    { type: "progressFill", theme: "material", className: "bg-gray-600" },
    { type: "progressDot", theme: "matrix", className: "bg-green-400" },
    { type: "progressDot", theme: "material", className: "bg-gray-600" },
    
    // Volume
    { type: "volumeButton", theme: "matrix", className: "text-green-400/70 hover:text-green-400" },
    { type: "volumeButton", theme: "material", className: "text-gray-500 hover:text-gray-700" },
  ],
});

export function PlayerBar({ theme, state, actions }: PlayerBarProps) {
  const { currentStation, isPlaying, currentTime, duration, volume } = state;
  const { onPlayPause, onPrevious, onNext, onSeek, onVolumeChange, formatTime } = actions;

  const handleSeek = (e: React.MouseEvent) => {
    if (duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percentage = clickX / rect.width;
      onSeek(percentage * duration);
    }
  };

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={cn(variants({ type: "container", theme }))}>
      <div className={cn(variants({ type: "content" }))}>
        {/* Station Info */}
        <HStack gap="4" className={cn(variants({ type: "stationInfo" }))}>
          <div className={cn(variants({ type: "favicon" }))}>
            {currentStation?.favicon ? (
              <img
                src={currentStation.favicon}
                alt={`${currentStation.name} logo`}
                className="w-14 h-14 rounded-md object-cover bg-gray-100"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                  e.currentTarget.nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <div className={cn(variants({ type: "fallbackIcon", theme }))}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
            </div>
          </div>

          <VStack className={cn(variants({ type: "trackInfo" }))}>
            {currentStation ? (
              <>
                <div className={cn(variants({ type: "stationName", theme }))}>{currentStation.name}</div>
                <div className={cn(variants({ type: "stationSubtitle", theme }))}>{currentStation.country} • Live Radio</div>
              </>
            ) : (
              <div className={cn(variants({ type: "stationSubtitle", theme }))}>Select a station to play</div>
            )}
          </VStack>

          <button className={cn(variants({ type: "heartButton", theme }))}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        </HStack>

        {/* Controls */}
        <VStack gap="2" className={cn(variants({ type: "controls" }))}>
          <HStack gap="4" className={cn(variants({ type: "controlButtons" }))}>
            <button onClick={onPrevious} className={cn(variants({ type: "controlButton", theme }))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
              </svg>
            </button>
            <button onClick={onPlayPause} className={cn(variants({ type: "playButton", theme }))}>
              {isPlaying ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            <button onClick={onNext} className={cn(variants({ type: "controlButton", theme }))}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 4l8.5 8L6 20V4zm10 0v16h2V4h-2z" />
              </svg>
            </button>
          </HStack>

          <HStack gap="2" className={cn(variants({ type: "progressBar" }))}>
            <span className={cn(variants({ type: "time", theme }))}>{formatTime(currentTime)}</span>
            <div
              className={cn(variants({ type: "progressTrack", theme }))}
              onClick={handleSeek}
              title="Click to seek"
            >
              <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                {formatTime(currentTime)}
              </div>
              <div
                className={cn(variants({ type: "progressFill", theme }))}
                style={{ width: `${progressPercentage}%` }}
              />
              {duration > 0 && (
                <div
                  className={cn(variants({ type: "progressDot", theme }))}
                  style={{ left: `${progressPercentage}%`, transform: "translate(-50%, -50%)" }}
                />
              )}
            </div>
            <span className={cn(variants({ type: "time", theme }))}>{formatTime(duration)}</span>
          </HStack>
        </VStack>

        {/* Volume Controls */}
        <HStack gap="3" justify="end" className={cn(variants({ type: "volumeControls" }))}>
          <button className={cn(variants({ type: "volumeButton", theme }))}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
            </svg>
          </button>
          <Slider
            value={volume * 100}
            min={0}
            max={100}
            onChange={(value) => onVolumeChange(value / 100)}
            theme={theme}
            showDots={false}
            showValue={false}
            className="w-20"
            trackColor={theme === "matrix" ? "bg-green-400/30" : "bg-gray-300"}
            fillColor={theme === "matrix" ? "bg-green-400" : "bg-blue-600"}
            indicatorColor={theme === "matrix" ? "bg-green-400" : "bg-blue-600"}
          />
        </HStack>
      </div>
    </div>
  );
}
