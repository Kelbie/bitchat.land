/**
 * GeohashExplorer Component
 * 
 * Displays the geohashes that overlap with a selected country.
 * Shows contained vs overlapping geohashes at different precision levels.
 * Displays event counts from connected georelays per geohash.
 */

import React, { useMemo, useState } from 'react';
import type { CountryGeohashResult } from '@/utils/countryGeohashFinder';
import { formatGeohashesForDisplay } from '@/utils/countryGeohashFinder';

interface GeohashExplorerProps {
  result: CountryGeohashResult | null;
  isLoading: boolean;
  theme: 'matrix' | 'material';
  onGeohashClick?: (geohash: string) => void;
  onGeohashHover?: (geohash: string | null) => void;
  /** Event counts per geohash from connected georelays */
  eventCounts?: Map<string, number>;
  /** Total connected relay count */
  connectedRelayCount?: number;
  /** Whether we're loading relay connections */
  isConnectingRelays?: boolean;
}

export const GeohashExplorer: React.FC<GeohashExplorerProps> = ({
  result,
  isLoading,
  theme,
  onGeohashClick,
  onGeohashHover,
  eventCounts,
  connectedRelayCount = 0,
  isConnectingRelays = false,
}) => {
  const [expandedDepths, setExpandedDepths] = useState<Set<number>>(new Set([1, 2]));
  const [showContained, setShowContained] = useState(true);
  const [showOverlapping, setShowOverlapping] = useState(true);

  // Helper to get event count for a specific geohash (exact match only, not children)
  const getEventCount = (geohash: string): number => {
    if (!eventCounts) return 0;
    return eventCounts.get(geohash) ?? 0;
  };

  // Calculate total events across all geohashes
  const totalEvents = useMemo(() => {
    if (!eventCounts) return 0;
    let total = 0;
    eventCounts.forEach(count => {
      total += count;
    });
    return total;
  }, [eventCounts]);

  const formattedData = useMemo(() => {
    if (!result) return [];
    return formatGeohashesForDisplay(result);
  }, [result]);

  const toggleDepth = (depth: number) => {
    setExpandedDepths(prev => {
      const next = new Set(prev);
      if (next.has(depth)) {
        next.delete(depth);
      } else {
        next.add(depth);
      }
      return next;
    });
  };

  // Theme-based styling
  const containerClasses = theme === 'matrix'
    ? 'bg-gray-900/95 border border-green-500/30 text-green-400'
    : 'bg-white/95 border border-gray-200 text-gray-800 shadow-lg';

  const headerClasses = theme === 'matrix'
    ? 'border-b border-green-500/30 text-green-300'
    : 'border-b border-gray-200 text-gray-700';

  const containedTagClasses = theme === 'matrix'
    ? 'bg-green-500/20 text-green-300 border border-green-500/40'
    : 'bg-green-100 text-green-700 border border-green-300';

  const overlappingTagClasses = theme === 'matrix'
    ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
    : 'bg-amber-100 text-amber-700 border border-amber-300';

  const buttonClasses = theme === 'matrix'
    ? 'bg-gray-800 hover:bg-gray-700 text-green-400 border border-green-500/30'
    : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300';

  const activeButtonClasses = theme === 'matrix'
    ? 'bg-green-500/30 text-green-300 border border-green-500'
    : 'bg-blue-100 text-blue-700 border border-blue-400';

  if (isLoading) {
    return (
      <div className={`rounded-lg p-3 ${containerClasses}`}>
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
            theme === 'matrix' ? 'border-green-400' : 'border-blue-500'
          }`} />
          <span className="text-sm">Computing geohashes...</span>
        </div>
      </div>
    );
  }

  if (!result) {
    return null;
  }

  return (
    <div className={`rounded-lg overflow-hidden max-w-sm ${containerClasses}`}>
      {/* Header */}
      <div className={`p-3 ${headerClasses}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">🌍 Geohashes for {result.countryName}</h3>
            <p className="text-xs opacity-70 mt-0.5">
              {result.totalCount} geohashes found in {result.computeTimeMs.toFixed(1)}ms
            </p>
          </div>
        </div>
        
        {/* Relay connection status */}
        <div className={`mt-2 flex items-center gap-2 text-xs ${
          theme === 'matrix' ? 'text-green-400/70' : 'text-gray-500'
        }`}>
          {isConnectingRelays ? (
            <>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                theme === 'matrix' ? 'bg-yellow-400' : 'bg-yellow-500'
              }`} />
              <span>Connecting to georelays...</span>
            </>
          ) : connectedRelayCount > 0 ? (
            <>
              <div className={`w-2 h-2 rounded-full ${
                theme === 'matrix' ? 'bg-green-400' : 'bg-green-500'
              }`} />
              <span>{connectedRelayCount} relays connected</span>
              {totalEvents > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded ${
                  theme === 'matrix' 
                    ? 'bg-green-500/20 text-green-300' 
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {totalEvents} events
                </span>
              )}
            </>
          ) : (
            <>
              <div className={`w-2 h-2 rounded-full ${
                theme === 'matrix' ? 'bg-gray-500' : 'bg-gray-400'
              }`} />
              <span>No relay connections</span>
            </>
          )}
        </div>
        
        {/* Filter toggles */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setShowContained(!showContained)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              showContained ? activeButtonClasses : buttonClasses
            }`}
          >
            ✓ Contained ({result.fullyContained.length})
          </button>
          <button
            onClick={() => setShowOverlapping(!showOverlapping)}
            className={`px-2 py-0.5 rounded text-xs transition-colors ${
              showOverlapping ? activeButtonClasses : buttonClasses
            }`}
          >
            ⟂ Border ({result.overlapping.length})
          </button>
        </div>
      </div>

      {/* Geohash list by depth */}
      <div className="max-h-64 overflow-y-auto p-2 space-y-2">
        {formattedData.map(({ depth, contained, overlapping }) => {
          const isExpanded = expandedDepths.has(depth);
          const displayContained = showContained ? contained : [];
          const displayOverlapping = showOverlapping ? overlapping : [];
          const totalForDepth = displayContained.length + displayOverlapping.length;

          if (totalForDepth === 0) return null;

          return (
            <div key={depth} className={`rounded ${theme === 'matrix' ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
              {/* Depth header */}
              <button
                onClick={() => toggleDepth(depth)}
                className={`w-full px-2 py-1.5 flex items-center justify-between text-left text-xs ${
                  theme === 'matrix' ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'
                } rounded transition-colors`}
              >
                <span className="font-medium">
                  Depth {depth} <span className="opacity-60">({depth} chars)</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className={`px-1.5 py-0.5 rounded text-xs ${containedTagClasses}`}>
                    {displayContained.length}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-xs ${overlappingTagClasses}`}>
                    {displayOverlapping.length}
                  </span>
                  <span className="text-lg leading-none">
                    {isExpanded ? '−' : '+'}
                  </span>
                </span>
              </button>

              {/* Geohash tags */}
              {isExpanded && (
                <div 
                  className="px-2 pb-2 flex flex-wrap gap-1"
                  onMouseLeave={() => onGeohashHover?.(null)}
                >
                  {displayContained.map(gh => {
                    const count = getEventCount(gh);
                    return (
                      <button
                        key={gh}
                        onClick={() => onGeohashClick?.(gh)}
                        onMouseEnter={() => onGeohashHover?.(gh)}
                        className={`px-1.5 py-0.5 rounded text-xs font-mono cursor-pointer transition-all hover:scale-105 flex items-center gap-1 ${containedTagClasses}`}
                        title={`Fully contained: ${gh}${count > 0 ? ` (${count} events)` : ''}`}
                      >
                        {gh}
                        {count > 0 && (
                          <span className={`ml-0.5 px-1 py-0 rounded-full text-[10px] font-semibold ${
                            theme === 'matrix'
                              ? 'bg-green-400/40 text-green-200'
                              : 'bg-green-500/30 text-green-800'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {displayOverlapping.map(gh => {
                    const count = getEventCount(gh);
                    return (
                      <button
                        key={gh}
                        onClick={() => onGeohashClick?.(gh)}
                        onMouseEnter={() => onGeohashHover?.(gh)}
                        className={`px-1.5 py-0.5 rounded text-xs font-mono cursor-pointer transition-all hover:scale-105 flex items-center gap-1 ${overlappingTagClasses}`}
                        title={`Border overlap: ${gh}${count > 0 ? ` (${count} events)` : ''}`}
                      >
                        {gh}
                        {count > 0 && (
                          <span className={`ml-0.5 px-1 py-0 rounded-full text-[10px] font-semibold ${
                            theme === 'matrix'
                              ? 'bg-yellow-400/40 text-yellow-200'
                              : 'bg-amber-500/30 text-amber-800'
                          }`}>
                            {count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className={`px-3 py-2 text-xs border-t ${theme === 'matrix' ? 'border-green-500/20' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded ${theme === 'matrix' ? 'bg-green-400' : 'bg-green-500'}`} />
            Fully inside
          </span>
          <span className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded ${theme === 'matrix' ? 'bg-yellow-400' : 'bg-amber-500'}`} />
            Border overlap
          </span>
        </div>
      </div>
    </div>
  );
};

export default GeohashExplorer;

