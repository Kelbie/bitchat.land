import React from 'react';
import { RadioPlayerState } from '../types/radio';
import { GeohashInfo } from '../types/radio';

interface RadioHeaderProps {
  player: RadioPlayerState & {
    play: (station: any) => void;
    stop: () => void;
    setVolume: (volume: number) => void;
  };
  geohashInfo: GeohashInfo | null;
  countries: string[];
}

export const RadioHeader: React.FC<RadioHeaderProps> = ({ player, geohashInfo, countries }) => {
  return (
    <header className="app-header bg-white shadow-sm border-b border-gray-200 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Title and Basic Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              🌍 Geohash Radio Finder
            </h1>
            
            {geohashInfo && (
              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <span>📍 <code className="bg-gray-100 px-1 rounded">{geohashInfo.geohash}</code></span>
                <span>🌐 {geohashInfo.center.latitude.toFixed(4)}, {geohashInfo.center.longitude.toFixed(4)}</span>
                {countries.length > 0 && (
                  <span>🏳️ {countries.length} countries</span>
                )}
              </div>
            )}
          </div>
          
          {/* Player Controls */}
          {player.currentStation && (
            <div className="player-controls bg-gray-50 p-3 rounded-lg border min-w-80">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {player.currentStation.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {player.currentStation.country && `${player.currentStation.country} • `}
                    {player.loading && <span className="text-blue-600">Loading...</span>}
                    {player.error && <span className="text-red-600">{player.error}</span>}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={player.isPlaying ? player.stop : undefined}
                    disabled={!player.isPlaying}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      player.isPlaying 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {player.isPlaying ? '⏹️ Stop' : '▶️ Play'}
                  </button>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">🔊</span>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={player.volume}
                      onChange={(e) => player.setVolume(Number(e.target.value))}
                      className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
