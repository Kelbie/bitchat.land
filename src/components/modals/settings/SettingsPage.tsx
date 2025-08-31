import React, { useMemo } from 'react';
import { Slider } from '../../common/Slider';
import { PowDistributionGraph } from '../../common/PowDistributionGraph';
import { NostrEvent } from '../../../types';
import { getPow } from 'nostr-tools/nip13';

interface SettingsPageProps {
  theme: "matrix" | "material";
  onThemeChange: (theme: "matrix" | "material") => void;
  powEnabled: boolean;
  onPowToggle: (enabled: boolean) => void;
  powDifficulty: number;
  onPowDifficultyChange: (difficulty: number) => void;
  recentEvents: NostrEvent[];
  allStoredEvents: NostrEvent[];
}

export function SettingsPage({
  theme,
  onThemeChange,
  powEnabled,
  onPowToggle,
  powDifficulty,
  onPowDifficultyChange,
  recentEvents,
  allStoredEvents
}: SettingsPageProps) {
  // Calculate POW difficulty distribution from recent events
  const powDistribution = useMemo(() => {
    // Use recent events if available, otherwise fall back to all stored events
    const eventsToAnalyze = recentEvents.length > 0 ? recentEvents : allStoredEvents;
    
    if (eventsToAnalyze.length === 0) {
      return []; // Return empty array if no events
    }
    
    // Calculate POW difficulty for each event
    const powValues: number[] = [];
    eventsToAnalyze.forEach(event => {
      try {
        const pow = getPow(event.id);
        if (pow > 0) { // Only include events with valid POW
          powValues.push(pow);
        }
      } catch (error) {
        // Skip events where POW calculation fails
        console.warn('Failed to calculate POW for event:', event.id, error);
      }
    });
    
    return powValues;
  }, [recentEvents, allStoredEvents]);

  const getDifficultyInfo = (difficulty: number) => {
    const hashAttempts = Math.pow(2, difficulty);
    let description = '';
    
    if (difficulty <= 8) description = 'very low - minimal spam protection';
    else if (difficulty <= 16) description = 'low - basic spam protection';
    else if (difficulty <= 24) description = 'medium - moderate spam protection';
    else if (difficulty <= 32) description = 'high - strong spam protection';
    else description = 'very high - maximum spam protection';
    
    return { hashAttempts, description };
  };

  const { hashAttempts, description } = getDifficultyInfo(powDifficulty);

  return (
    <div className="space-y-8 bg-gray-900 text-white p-6 font-mono">
      {/* Appearance Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-normal text-green-400">
          appearance
        </h3>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onThemeChange("matrix")}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              theme === "matrix"
                ? "bg-gray-600 text-white"
                : "bg-transparent text-gray-400 border border-gray-600 hover:text-gray-300"
            }`}
          >
            system
          </button>
          <button
            onClick={() => onThemeChange("material")}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              theme === "material"
                ? "bg-gray-600 text-white"
                : "bg-transparent text-gray-400 border border-gray-600 hover:text-gray-300"
            }`}
          >
            light
          </button>
          <button
            className="px-4 py-2 text-sm rounded bg-gray-600 text-white"
          >
            dark
          </button>
        </div>
      </div>

      {/* Proof of Work Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-normal text-green-400">
          proof of work
        </h3>
        
        {/* PoW Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onPowToggle(false)}
            className={`px-4 py-2 text-sm rounded border transition-colors ${
              !powEnabled
                ? "bg-gray-600 text-white border-gray-600"
                : "bg-transparent text-gray-400 border-gray-600 hover:text-gray-300"
            }`}
          >
            pow off
          </button>
          <button
            onClick={() => onPowToggle(true)}
            className={`px-4 py-2 text-sm rounded border transition-colors relative ${
              powEnabled
                ? "bg-gray-600 text-white border-gray-600"
                : "bg-transparent text-gray-400 border-gray-600 hover:text-gray-300"
            }`}
          >
            pow on
            {powEnabled && (
              <div className="absolute -right-1 -top-1 w-2 h-2 rounded-full bg-green-400" />
            )}
          </button>
        </div>
        
        <div className="text-sm text-green-400">
          add computational proof of work to geohash messages for spam deterrence.
        </div>

        {/* Difficulty Setting */}
        {powEnabled && (
          <div className="space-y-4">
            <div className="text-sm text-green-400">
              difficulty: {powDifficulty} bits (~{Math.pow(2, powDifficulty - 8) < 1 ? '< 1' : Math.pow(2, powDifficulty - 8)} second{Math.pow(2, powDifficulty - 8) === 1 ? '' : 's'})
            </div>
            
            {/* POW Distribution Graph */}
            <PowDistributionGraph
              powData={powDistribution.length > 0 ? powDistribution : [12, 12, 12, 16, 16, 20, 20, 20, 24, 24, 28, 32, 8, 8, 8, 8, 16, 16, 20, 24, 28, 32, 36, 40]}
              theme={theme}
              height={50}
            />
            
            {/* POW Analysis Info */}
            {powDistribution.length > 0 && (
              <div className="text-xs text-gray-400">
                Analyzed {powDistribution.length} events with valid POW from {recentEvents.length > 0 ? 'recent' : 'stored'} events
              </div>
            )}
            
            {/* Difficulty Slider */}
            <Slider
              value={powDifficulty}
              min={1}
              max={40}
              onChange={onPowDifficultyChange}
              theme={theme}
              showDots={true}
              showValue={false}
            />
            
            {/* Difficulty Info */}
            <div className="text-sm text-green-400 space-y-1">
              <div>difficulty {powDifficulty} requires ~{hashAttempts.toLocaleString()} hash attempts</div>
              <div>{description}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}