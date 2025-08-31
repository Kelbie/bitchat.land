import React from 'react';

interface PowDistributionGraphProps {
  powData: number[]; // Array of POW difficulty values from recent events
  theme: "matrix" | "material";
  width?: number;
  height?: number;
}

export function PowDistributionGraph({ 
  powData, 
  theme, 
  width = 200, 
  height = 50 
}: PowDistributionGraphProps) {
  // Calculate distribution of POW difficulties
  const maxBits = 40; // Maximum POW difficulty
  const distribution = new Array(maxBits + 1).fill(0);
  
  powData.forEach(bits => {
    if (bits >= 0 && bits <= maxBits) {
      distribution[bits]++;
    }
  });
  
  // Find the maximum count for scaling
  const maxCount = Math.max(...distribution);
  
  // Colors based on theme
  const colors = {
    matrix: {
      fill: "rgb(74, 222, 128)", // green-400
      background: "rgb(17, 24, 39)" // gray-900
    },
    material: {
      fill: "rgb(59, 130, 246)", // blue-500
      background: "rgb(255, 255, 255)" // white
    }
  };
  
  const color = colors[theme];
  
  // Show message if no data
  if (powData.length === 0) {
    return (
      <div className="mb-4 w-full">
        <div className="text-xs text-gray-400 mb-2">
          POW difficulty distribution from recent events
        </div>
        <div className="border border-gray-600 rounded p-4 text-center text-gray-400">
          No events with valid POW found
        </div>
      </div>
    );
  }
  
  return (
    <div className="mb-4 w-full">
      <div className="text-xs text-gray-400 mb-2">
        POW difficulty distribution from recent events ({powData.length} events)
      </div>
      <svg 
        width="100%" 
        height={height} 
        className="border border-gray-600 rounded w-full"
        style={{ backgroundColor: color.background }}
        viewBox={`0 0 ${maxBits + 1} ${height}`}
        preserveAspectRatio="none"
      >
        {/* Draw bars for each difficulty level */}
        {distribution.map((count, bits) => {
          if (count === 0) return null;
          
          const barHeight = maxCount > 0 ? (count / maxCount) * height : 0;
          const x = bits; // Direct mapping: bit 0 at x=0, bit 40 at x=40
          const barWidth = 1; // Full width of each bit slot
          
          return (
            <rect
              key={bits}
              x={x}
              y={height - barHeight}
              width={barWidth}
              height={barHeight}
              fill={color.fill}
              opacity={0.8}
            />
          );
        })}
        
        {/* X-axis line */}
        <line
          x1="0"
          y1={height - 1}
          x2={maxBits + 1}
          y2={height - 1}
          stroke={theme === "matrix" ? "rgb(75, 85, 99)" : "rgb(156, 163, 175)"}
          strokeWidth="0.1"
        />
        
        {/* Y-axis line */}
        <line
          x1="0"
          y1={0}
          x2="0"
          y2={height}
          stroke={theme === "matrix" ? "rgb(75, 85, 99)" : "rgb(156, 163, 175)"}
          strokeWidth="0.1"
        />
      </svg>
    </div>
  );
}
