import React from 'react';
import { GeohashInfo, StationWithDistance } from '../types/radio';

interface DebugInfoProps {
  geohashInfo: GeohashInfo;
  stations: StationWithDistance[];
  countries: string[];
}

export const DebugInfo: React.FC<DebugInfoProps> = ({ geohashInfo, stations, countries }) => {
  const musicStations = stations.filter(s => s.isMusicStation);
  const totalStations = stations.length;
  
  return (
    <div className="debug-info-container bg-gray-50 p-4 rounded-lg border">
      <h3 className="text-lg font-semibold mb-3">🔍 Debug Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">📍 Geohash Details</h4>
          <div className="space-y-1 text-gray-600">
            <p><strong>Geohash:</strong> <code className="bg-white px-1 rounded">{geohashInfo.geohash}</code></p>
            <p><strong>Precision:</strong> {geohashInfo.precision} characters</p>
            <p><strong>Center:</strong> {geohashInfo.center.latitude.toFixed(6)}, {geohashInfo.center.longitude.toFixed(6)}</p>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700 mb-2">🌐 Bounding Box</h4>
          <div className="space-y-1 text-gray-600">
            <p><strong>Min Lat:</strong> {geohashInfo.boundingBox.minLat.toFixed(6)}</p>
            <p><strong>Max Lat:</strong> {geohashInfo.boundingBox.maxLat.toFixed(6)}</p>
            <p><strong>Min Lon:</strong> {geohashInfo.boundingBox.minLon.toFixed(6)}</p>
            <p><strong>Max Lon:</strong> {geohashInfo.boundingBox.maxLon.toFixed(6)}</p>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700 mb-2">🏳️ Countries Found</h4>
          <div className="space-y-1 text-gray-600">
            <p><strong>Count:</strong> {countries.length}</p>
            <p><strong>Codes:</strong> {countries.join(', ') || 'None'}</p>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700 mb-2">📻 Station Statistics</h4>
          <div className="space-y-1 text-gray-600">
            <p><strong>Total Stations:</strong> {totalStations}</p>
            <p><strong>Music Stations:</strong> {musicStations.length}</p>
            <p><strong>Music Ratio:</strong> {totalStations > 0 ? ((musicStations.length / totalStations) * 100).toFixed(1) : 0}%</p>
          </div>
        </div>
      </div>
      
      {stations.length > 0 && (
        <div className="mt-4">
          <h4 className="font-medium text-gray-700 mb-2">📊 Top 5 Closest Stations</h4>
          <div className="space-y-1 text-xs">
            {stations.slice(0, 5).map((station, index) => (
              <div key={station.id} className="flex justify-between items-center py-1 border-b border-gray-200">
                <span className="truncate flex-1 mr-2">{station.name}</span>
                <span className="text-gray-500">{station.distanceKm.toFixed(1)} km</span>
                <span className={`ml-2 px-1 rounded text-xs ${
                  station.isMusicStation ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}>
                  {station.isMusicStation ? 'Music' : 'Other'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
