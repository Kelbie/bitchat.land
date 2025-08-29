import React from 'react';
import { StationWithDistance } from '../types/radio';

interface StationListProps {
  stations: StationWithDistance[];
  onStationPlay: (station: StationWithDistance) => void;
  currentStation: StationWithDistance | null;
  isPlaying: boolean;
}

export const StationList: React.FC<StationListProps> = ({ 
  stations, 
  onStationPlay, 
  currentStation, 
  isPlaying 
}) => {
  if (stations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No music stations found in this region.
      </div>
    );
  }

  return (
    <div className="station-list-container">
      <h2 className="text-xl font-semibold mb-4">
        🎵 Music Stations ({stations.length} found)
      </h2>
      
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {stations.slice(0, 50).map((station) => {
          const isCurrentStation = currentStation?.id === station.id;
          const isCurrentlyPlaying = isCurrentStation && isPlaying;
          
          return (
            <div
              key={station.id}
              className={`station-item p-3 border rounded-lg transition-colors ${
                isCurrentStation 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900 truncate">
                      {station.name}
                    </h3>
                    {isCurrentlyPlaying && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ▶️ Playing
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600 space-y-1">
                    {station.country && (
                      <p>🌍 {station.country}</p>
                    )}
                    {station.tags && station.tags.length > 0 && (
                      <p>🏷️ {station.tags.slice(0, 3).join(', ')}</p>
                    )}
                    <p>📏 {station.distanceKm.toFixed(1)} km away</p>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => onStationPlay(station)}
                    disabled={isCurrentlyPlaying}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      isCurrentlyPlaying
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {isCurrentlyPlaying ? 'Playing' : 'Play'}
                  </button>

                  {station.favicon && (
                    <img
                      src={station.favicon}
                      alt="Station icon"
                      className="w-8 h-8 rounded object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {stations.length > 50 && (
        <div className="mt-4 text-center text-sm text-gray-500">
          Showing first 50 stations. Total: {stations.length}
        </div>
      )}
    </div>
  );
};
