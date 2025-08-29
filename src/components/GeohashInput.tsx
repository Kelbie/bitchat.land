import React, { useState } from 'react';
import { GeohashService } from '../services/geohashService';

interface GeohashInputProps {
  onSubmit: (geohash: string) => void;
  loading: boolean;
}

export const GeohashInput: React.FC<GeohashInputProps> = ({ onSubmit, loading }) => {
  const [geohash, setGeohash] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!geohash.trim()) {
      setError('Please enter a geohash');
      return;
    }
    
    if (!GeohashService.isValidGeohash(geohash.trim())) {
      setError('Invalid geohash format');
      return;
    }
    
    onSubmit(geohash.trim());
  };

  const handleGeohashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    // Only allow valid geohash characters
    if (/^[0-9bcdefghjkmnpqrstuvwxyz]*$/.test(value)) {
      setGeohash(value);
      setError(null);
    }
  };

  return (
    <div className="geohash-input-container">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="geohash" className="block text-sm font-medium text-gray-700 mb-2">
            Enter Geohash
          </label>
          <div className="flex gap-2">
            <input
              id="geohash"
              type="text"
              value={geohash}
              onChange={handleGeohashChange}
              placeholder="e.g., dr5r, gbsuv, u000"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !geohash.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Searching...' : 'Find Stations'}
            </button>
          </div>
          {error && (
            <p className="mt-1 text-sm text-red-600">{error}</p>
          )}
        </div>
        
        <div className="text-xs text-gray-500">
          <p>💡 <strong>Example geohashes:</strong></p>
          <ul className="mt-1 space-y-1">
            <li><code className="bg-gray-100 px-1 rounded">9</code> - Large North American region</li>
            <li><code className="bg-gray-100 px-1 rounded">dr5r</code> - New York City area</li>
            <li><code className="bg-gray-100 px-1 rounded">gbsuv</code> - London, UK area</li>
            <li><code className="bg-gray-100 px-1 rounded">u000</code> - France region</li>
            <li><code className="bg-gray-100 px-1 rounded">wecz</code> - San Francisco area</li>
          </ul>
        </div>
      </form>
    </div>
  );
};
