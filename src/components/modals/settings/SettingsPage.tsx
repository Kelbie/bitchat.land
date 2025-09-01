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

  // Theme-specific styles
  const themeStyles = {
    matrix: {
      bg: "bg-gray-900",
      text: "text-white",
      accent: "text-green-400",
      buttonActive: "bg-gray-600 text-white",
      buttonInactive: "bg-transparent text-gray-400 border border-gray-600 hover:text-gray-300",
      powButtonActive: "bg-gray-600 text-white border-gray-600",
      powButtonInactive: "bg-transparent text-gray-400 border-gray-600 hover:text-gray-300"
    },
    material: {
      bg: "bg-white",
      text: "text-gray-900",
      accent: "text-blue-600",
      buttonActive: "bg-blue-600 text-white",
      buttonInactive: "bg-transparent text-blue-600 border border-blue-600 hover:bg-blue-50",
      powButtonActive: "bg-blue-600 text-white border-blue-600",
      powButtonInactive: "bg-transparent text-blue-600 border-blue-600 hover:bg-blue-50"
    }
  };

  const styles = themeStyles[theme];

  return (
    <div className={`space-y-8 ${styles.bg} ${styles.text} p-6 font-mono`}>
      {/* Appearance Section */}
      <div className="space-y-4">
        <h3 className={`text-lg font-normal ${styles.accent}`}>
          appearance
        </h3>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onThemeChange("matrix")}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              theme === "matrix"
                ? styles.buttonActive
                : styles.buttonInactive
            }`}
          >
            matrix
          </button>
          <button
            onClick={() => onThemeChange("material")}
            className={`px-4 py-2 text-sm rounded transition-colors ${
              theme === "material"
                ? styles.buttonActive
                : styles.buttonInactive
            }`}
          >
            material
          </button>
        </div>
      </div>

      {/* Proof of Work Section */}
      <div className="space-y-4">
        <h3 className={`text-lg font-normal ${styles.accent}`}>
          proof of work
        </h3>
        
        {/* PoW Toggle */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => onPowToggle(false)}
            className={`px-4 py-2 text-sm rounded border transition-colors ${
              !powEnabled
                ? styles.powButtonActive
                : styles.powButtonInactive
            }`}
          >
            pow off
          </button>
          <button
            onClick={() => onPowToggle(true)}
            className={`px-4 py-2 text-sm rounded border transition-colors relative ${
              powEnabled
                ? styles.powButtonActive
                : styles.powButtonInactive
            }`}
          >
            pow on
            {powEnabled && (
              <div className={`absolute -right-1 -top-1 w-2 h-2 rounded-full ${styles.accent}`} />
            )}
          </button>
        </div>
        
        <div className={`text-sm ${styles.accent}`}>
          add computational proof of work to geohash messages for spam deterrence.
        </div>

        {/* Difficulty Setting */}
        {powEnabled && (
          <div className="space-y-4">
            <div className={`text-sm ${styles.accent}`}>
              difficulty: {powDifficulty} bits (~{Math.pow(2, powDifficulty - 8) < 1 ? '< 1' : Math.pow(2, powDifficulty - 8)} second{Math.pow(2, powDifficulty - 8) === 1 ? '' : 's'})
            </div>
            
            {/* POW Distribution Graph */}
            <PowDistributionGraph
              powData={powDistribution.length > 0 ? powDistribution : [12, 12, 12, 16, 16, 20, 20, 20, 24, 24, 28, 32, 8, 8, 8, 8, 16, 16, 20, 24, 28, 32, 36, 40]}
              theme={theme}
              height={50}
              threshold={powDifficulty}
            />
            
            {/* POW Analysis Info */}
            {powDistribution.length > 0 && (
              <div className={`text-xs ${theme === "matrix" ? "text-gray-400" : "text-gray-600"}`}>
                Analyzed {powDistribution.length} events with valid POW from {recentEvents.length > 0 ? 'recent' : 'stored'} events
              </div>
            )}
            
            {/* Difficulty Slider */}
            <Slider
              value={powDifficulty}
              min={1}
              max={24}
              onChange={onPowDifficultyChange}
              theme={theme}
              showDots={true}
              showValue={false}
            />
            
            {/* Difficulty Info */}
            <div className={`text-sm ${styles.accent} space-y-1`}>
              <div>difficulty {powDifficulty} requires ~{hashAttempts.toLocaleString()} hash attempts</div>
              <div>{description}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}