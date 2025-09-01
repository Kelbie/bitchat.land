import React from 'react';

interface PowDistributionGraphProps {
  powData: number[]; // Array of POW difficulty values from recent events
  theme: "matrix" | "material";
  height?: number;
  threshold?: number; // Current POW difficulty threshold
}

export function PowDistributionGraph({
  powData,
  theme,
  height = 50,
  threshold
}: PowDistributionGraphProps) {
  // Use all available events regardless of slider position
  const minDifficulty = 1; // Fixed starting point so early values are never hidden
  const maxDifficulty = Math.max(24, threshold ?? 0, ...powData);

  // Calculate distribution of POW difficulties
  const distribution = new Array(maxDifficulty + 1).fill(0);

  powData.forEach(bits => {
    if (bits >= minDifficulty && bits <= maxDifficulty) {
      distribution[bits]++;
    }
  });

  // Find the maximum count for scaling
  const maxCount = Math.max(...distribution);
  
  // Background color varies by theme, while bar colors are fixed
  const backgrounds = {
    matrix: "rgb(17, 24, 39)", // gray-900
    material: "rgb(255, 255, 255)" // white
  } as const;

  const aboveThresholdColor = "rgb(74, 222, 128)"; // green-400
  const belowThresholdColor = "rgb(239, 68, 68)"; // red-500
  
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
  
  // Calculate the effective range for scaling
  const effectiveRange = maxDifficulty - minDifficulty + 1;
  
  return (
    <div className="mb-4 w-full">
      <div className="text-xs text-gray-400 mb-2">
        POW difficulty distribution from recent events ({powData.length} events)
      </div>
      <svg 
        width="100%" 
        height={height} 
        className="border border-gray-600 rounded w-full"
        style={{ backgroundColor: backgrounds[theme] }}
        viewBox={`0 0 ${effectiveRange} ${height}`}
        preserveAspectRatio="none"
      >
        {/* Draw bars for each difficulty level */}
        {distribution.map((count, bits) => {
          if (count === 0 || bits < minDifficulty || bits > maxDifficulty) return null;
          
          const barHeight = maxCount > 0 ? (count / maxCount) * height : 0;
          // Scale x position to match slider range: map bits to 0-based index within effective range
          const x = bits - minDifficulty;
          const barWidth = 1; // Full width of each bit slot
          
          // Color bars based on threshold: green for at/above threshold, red for below
          const barColor =
            threshold !== undefined && bits < threshold
              ? belowThresholdColor
              : aboveThresholdColor;
          
          return (
            <rect
              key={bits}
              x={x}
              y={height - barHeight}
              width={barWidth}
              height={barHeight}
              fill={barColor}
              opacity={0.8}
            />
          );
        })}
        
        {/* Threshold line (vertical line showing current difficulty setting) */}
        {threshold !== undefined && threshold >= minDifficulty && threshold <= maxDifficulty && (
          <line
            x1={threshold - minDifficulty}
            y1={0}
            x2={threshold - minDifficulty}
            y2={height}
            stroke={belowThresholdColor}
            strokeWidth="0.5"
            strokeDasharray="2,2"
            opacity={0.8}
          />
        )}
        
        {/* X-axis line */}
        <line
          x1="0"
          y1={height - 1}
          x2={effectiveRange}
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
