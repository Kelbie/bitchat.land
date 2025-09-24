import { useMemo } from 'react';
import { Slider, PowDistributionGraph } from '@/components/ui/data';
import { Button } from '@/components/ui/base';
import { NostrEvent } from '@/types';
import { getPow } from 'nostr-tools/nip13';

interface SettingsPageProps {
  theme: "matrix" | "material";
  onThemeChange: (theme: "matrix" | "material") => void;
  powEnabled: boolean;
  onPowToggle: (enabled: boolean) => void;
  powDifficulty: number;
  onPowDifficultyChange: (difficulty: number) => void;
  walletVisible: boolean;
  onWalletToggle: (visible: boolean) => void;
  allStoredEvents: NostrEvent[];
}

export function SettingsPage({
  theme,
  onThemeChange,
  powEnabled,
  onPowToggle,
  powDifficulty,
  onPowDifficultyChange,
  walletVisible,
  onWalletToggle,
  allStoredEvents
}: SettingsPageProps) {
  // Calculate POW difficulty distribution from recent events
  const powDistribution = useMemo(() => {
    const eventsToAnalyze = allStoredEvents;

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
  }, [allStoredEvents]);

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
      accent: "text-green-400"
    },
    material: {
      bg: "bg-white",
      text: "text-gray-900",
      accent: "text-blue-600"
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
          <Button
            theme={theme}
            active={theme === "matrix"}
            onClick={() => onThemeChange("matrix")}
            className="px-4 py-2 text-sm rounded"
          >
            matrix
          </Button>
          <Button
            theme={theme}
            active={theme === "material"}
            onClick={() => onThemeChange("material")}
            className="px-4 py-2 text-sm rounded"
          >
            material
          </Button>
        </div>
      </div>

      {/* Proof of Work Section */}
      <div className="space-y-4">
        <h3 className={`text-lg font-normal ${styles.accent}`}>
          proof of work
        </h3>
        
        {/* PoW Toggle */}
        <div className="flex items-center space-x-3">
          <Button
            theme={theme}
            active={!powEnabled}
            onClick={() => onPowToggle(false)}
            className="px-4 py-2 text-sm rounded border"
          >
            pow off
          </Button>
          <Button
            theme={theme}
            active={powEnabled}
            onClick={() => onPowToggle(true)}
            className="px-4 py-2 text-sm rounded border relative"
          >
            pow on
            {powEnabled && (
              <div className={`absolute -right-1 -top-1 w-2 h-2 rounded-full ${styles.accent}`} />
            )}
          </Button>
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
                Analyzed {powDistribution.length} events with valid POW out of {allStoredEvents.length} total events
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

      {/* Wallet Section */}
      <div className="space-y-4">
        <h3 className={`text-lg font-normal ${styles.accent}`}>
          wallet
        </h3>
        
        {/* Wallet Toggle */}
        <div className="flex items-center space-x-3">
          <Button
            theme={theme}
            active={!walletVisible}
            onClick={() => onWalletToggle(false)}
            className="px-4 py-2 text-sm rounded border"
          >
            hidden
          </Button>
          <Button
            theme={theme}
            active={walletVisible}
            onClick={() => onWalletToggle(true)}
            className="px-4 py-2 text-sm rounded border relative"
          >
            visible
            {walletVisible && (
              <div className={`absolute -right-1 -top-1 w-2 h-2 rounded-full ${styles.accent}`} />
            )}
          </Button>
        </div>
        
        <div className={`text-sm ${styles.accent} space-y-2`}>
          <div>experimental lightning wallet integration.</div>
          <div className={`text-xs ${theme === "matrix" ? "text-red-400" : "text-red-600"}`}>
            ⚠️ warning: this feature is experimental and funds may be lost. use at your own risk.
          </div>
        </div>
      </div>
    </div>
  );
}