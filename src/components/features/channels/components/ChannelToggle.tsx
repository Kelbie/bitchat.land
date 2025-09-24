import { ChannelToggleProps } from "@/types/app";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";

const variants = cva("", {
  variants: {
    type: {
      container: "flex rounded-md p-1",
      button: "p-1.5 rounded transition-colors",
    },
    theme: {
      matrix: "",
      material: "",
    },
    isActive: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    { type: "container", theme: "matrix", className: "bg-gray-800 border border-green-400/30" },
    { type: "container", theme: "material", className: "bg-white border border-gray-300" },
    { type: "button", theme: "matrix", isActive: true, className: "bg-green-400 text-gray-900" },
    { type: "button", theme: "matrix", isActive: false, className: "text-green-400/70 hover:text-green-400" },
    { type: "button", theme: "material", isActive: true, className: "bg-blue-600 text-white" },
    { type: "button", theme: "material", isActive: false, className: "text-gray-600 hover:text-gray-900" },
  ],
});

export function ChannelToggle({ viewMode, onViewModeChange, theme }: ChannelToggleProps) {
  return (
    <div className={cn(variants({ type: "container", theme }))}>
      <button
        onClick={() => onViewModeChange('geohash')}
        className={cn(variants({ type: "button", theme, isActive: viewMode === 'geohash' }))}
        title="Geohash view"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M5.41 21L6.12 17H2.12L2.47 15H6.47L7.53 9H3.53L3.88 7H7.88L8.59 3H10.59L9.88 7H15.88L16.59 3H18.59L17.88 7H21.88L21.53 9H17.53L16.47 15H20.47L20.12 17H16.12L15.41 21H13.41L14.12 17H8.12L7.41 21H5.41ZM9.53 9L8.47 15H14.47L15.53 9H9.53Z"/>
        </svg>
      </button>
      <button
        onClick={() => onViewModeChange('country')}
        className={cn(variants({ type: "button", theme, isActive: viewMode === 'country' }))}
        title="Country view"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      </button> 
    </div>
  );
}
