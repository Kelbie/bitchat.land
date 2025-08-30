import React from 'react';

interface SettingsPageProps {
  theme: "matrix" | "material";
  onThemeChange: (theme: "matrix" | "material") => void;
  powEnabled: boolean;
  onPowToggle: (enabled: boolean) => void;
  powDifficulty: number;
  onPowDifficultyChange: (difficulty: number) => void;
}

export function SettingsPage({
  theme,
  onThemeChange,
  powEnabled,
  onPowToggle,
  powDifficulty,
  onPowDifficultyChange
}: SettingsPageProps) {
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
            
            {/* Difficulty Slider */}
            <div className="relative">
              {/* Slider Track */}
              <div className="relative h-4 bg-gray-800 rounded-full">
                {/* Green filled section */}
                <div 
                  className="h-full bg-green-400 rounded-l-full"
                  style={{ width: `${(powDifficulty / 40) * 100}%` }}
                />
                
                {/* All dots evenly spaced across entire slider */}
                <div className="absolute inset-0 flex justify-between items-center px-2">
                  {Array.from({ length: 20 }, (_, i) => {
                    const dotPosition = (i / 19) * 100; // Position from 0% to 100%
                    const currentPosition = (powDifficulty / 40) * 100;
                    const isInGreenSection = dotPosition <= currentPosition;
                    
                    return (
                      <div 
                        key={i}
                        className={`w-1 h-1 rounded-full ${
                          isInGreenSection ? 'bg-black' : 'bg-green-400'
                        }`}
                      />
                    );
                  })}
                </div>
                
                {/* Vertical Position Indicator Bar */}
                <div 
                  className="absolute -top-2 -bottom-2 w-1 bg-green-400 rounded-full pointer-events-none"
                  style={{ 
                    left: `${(powDifficulty / 40) * 100}%`, 
                    transform: 'translateX(-50%)',
                    boxShadow: '0 0 0 4px rgb(17, 24, 39)'
                  }}
                />
                
                {/* Invisible clickable area for interaction */}
                <div 
                  className="absolute inset-0 cursor-pointer"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    const handleMouseMove = (moveEvent: MouseEvent) => {
                      moveEvent.preventDefault();
                      const rect = e.currentTarget.getBoundingClientRect();
                      if (rect) {
                        const x = moveEvent.clientX - rect.left;
                        const percentage = Math.max(0, Math.min(1, x / rect.width));
                        const newDifficulty = Math.round(percentage * 40);
                        const clampedDifficulty = Math.max(1, Math.min(40, newDifficulty));
                        onPowDifficultyChange(clampedDifficulty);
                      }
                    };
                    
                    const handleMouseUp = () => {
                      document.removeEventListener('mousemove', handleMouseMove);
                      document.removeEventListener('mouseup', handleMouseUp);
                    };
                    
                    document.addEventListener('mousemove', handleMouseMove);
                    document.addEventListener('mouseup', handleMouseUp);
                  }}
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const percentage = Math.max(0, Math.min(1, x / rect.width));
                    const newDifficulty = Math.round(percentage * 40);
                    const clampedDifficulty = Math.max(1, Math.min(40, newDifficulty));
                    onPowDifficultyChange(clampedDifficulty);
                  }}
                />
              </div>
              
              {/* Clickable track for easier interaction */}
              <div 
                className="absolute inset-0 cursor-pointer"
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = Math.max(0, Math.min(1, x / rect.width));
                  const newDifficulty = Math.round(percentage * 40);
                  const clampedDifficulty = Math.max(1, Math.min(40, newDifficulty));
                  onPowDifficultyChange(clampedDifficulty);
                }}
              />
            </div>
            
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