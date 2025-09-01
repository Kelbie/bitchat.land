import React from 'react';

interface SliderProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  theme: "matrix" | "material";
  className?: string;
  showDots?: boolean;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  trackColor?: string;
  fillColor?: string;
  dotColor?: string;
  indicatorColor?: string;
}

export function Slider({
  value,
  min,
  max,
  onChange,
  theme,
  className = "",
  showDots = false,
  showValue = false,
  valueFormatter,
  trackColor,
  fillColor,
  dotColor,
  indicatorColor
}: SliderProps) {
  // Default colors based on theme
  const defaultColors = {
    matrix: {
      track: trackColor || "bg-gray-800",
      fill: fillColor || "bg-green-400",
      dots: dotColor || "bg-green-400",
      indicator: indicatorColor || "bg-green-400"
    },
    material: {
      track: trackColor || "bg-gray-200",
      fill: fillColor || "bg-blue-600",
      dots: dotColor || "bg-blue-600",
      indicator: indicatorColor || "bg-blue-600"
    }
  };

  const colors = defaultColors[theme];
  const percentage = ((value - min) / (max - min)) * 100;

  const handleSliderChange = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const newValue = Math.round(percentage * (max - min) + min);
    const clampedValue = Math.max(min, Math.min(max, newValue));
    onChange(clampedValue);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      if (rect) {
        const x = moveEvent.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const newValue = Math.round(percentage * (max - min) + min);
        const clampedValue = Math.max(min, Math.min(max, newValue));
        onChange(clampedValue);
      }
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div className={`relative ${className}`}>
      {/* Slider Track */}
      <div className={`relative h-4 ${colors.track} rounded-full`}>
        {/* Filled section */}
        <div 
          className={`h-full ${colors.fill} rounded-l-full`}
          style={{ width: `${percentage}%` }}
        />
        
        {/* Dots container with overflow hidden - only clips the dots */}
        {showDots && (
          <div className="absolute inset-0 overflow-hidden">
            <div className="relative w-full h-full">
              {Array.from({ length: max - min - 1 }, (_, i) => {
                const dotValue = min + i + 1;
                const dotPosition = ((dotValue - min) / (max - min)) * 100;
                const isInFilledSection = dotPosition <= percentage;
                
                return (
                  <div 
                    key={i}
                    className={`w-1 h-1 rounded-full ${
                      isInFilledSection ? 'bg-black' : colors.dots
                    }`}
                    style={{ 
                      position: 'absolute',
                      left: `${dotPosition}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
        
        {/* Position Indicator Bar */}
        <div 
          className={`absolute -top-2 -bottom-2 w-1 ${colors.indicator} rounded-full pointer-events-none`}
          style={{ 
            left: `${percentage}%`, 
            transform: 'translateX(-50%)',
            boxShadow: theme === "matrix" 
              ? '0 0 0 4px rgb(17, 24, 39)' 
              : '0 0 0 4px rgb(255, 255, 255)'
          }}
        />
        
        {/* Invisible clickable area for interaction */}
        <div 
          className="absolute inset-0 cursor-pointer"
          onMouseDown={handleMouseDown}
          onClick={handleSliderChange}
        />
      </div>
      
      {/* Value display (optional) */}
      {showValue && (
        <div className={`text-sm mt-2 ${
          theme === "matrix" ? "text-green-400" : "text-blue-600"
        }`}>
          {valueFormatter ? valueFormatter(value) : value}
        </div>
      )}
    </div>
  );
}
