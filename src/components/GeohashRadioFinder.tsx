import React, { useState, useCallback } from 'react';
import { GeohashService } from '../services/geohashService';
import { CountryService } from '../services/countryService';
import { RadioService } from '../services/radioService';
import { GeohashInput } from './GeohashInput';
import { StationList } from './StationList';
import { DebugInfo } from './DebugInfo';
import { RadioHeader } from './RadioHeader';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { GeohashInfo } from '../types/radio';
import { StationWithDistance } from '../types/radio';

const radioService = new RadioService();

export function GeohashRadioFinder() {
  const [geohashInfo, setGeohashInfo] = useState<GeohashInfo | null>(null);
  const [stations, setStations] = useState<StationWithDistance[]>([]);
  const [musicOnlyStations, setMusicOnlyStations] = useState<StationWithDistance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countries, setCountries] = useState<string[]>([]);
  
  const audioPlayer = useAudioPlayer();

  const handleGeohashSubmit = useCallback(async (geohash: string) => {
    if (!GeohashService.isValidGeohash(geohash)) {
      setError('Invalid geohash format');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      // Step 1: Get geohash information
      const geohashData = GeohashService.getGeohashInfo(geohash);
      setGeohashInfo(geohashData);
      
      // Step 2: Find countries in geohash region
      const countriesInRegion = await CountryService.getCountriesInGeohash(geohashData);
      const countryCodes = countriesInRegion.map(c => c.countryCode);
      setCountries(countryCodes);
      
      // Step 3: Fetch radio stations for those countries
      const allStations = await radioService.getStationsForCountries(
        countriesInRegion,
        geohashData.center
      );
      setStations(allStations);
      
      // Step 4: Filter for music-only stations
      const musicStations = allStations.filter(station => station.isMusicStation);
      setMusicOnlyStations(musicStations);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleStationPlay = useCallback(async (station: StationWithDistance) => {
    // Record click for Radio Browser statistics
    await radioService.recordStationClick(station.id);
    
    // Play the station
    await audioPlayer.play(station);
  }, [audioPlayer]);

  return (
    <div className="geohash-radio-finder min-h-screen bg-gray-50">
      <RadioHeader 
        player={audioPlayer}
        geohashInfo={geohashInfo}
        countries={countries}
      />
      
      <main className="max-w-7xl mx-auto p-4">
        <div className="space-y-6">
          <GeohashInput 
            onSubmit={handleGeohashSubmit}
            loading={loading}
          />
          
          {error && (
            <div className="error-message bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              <strong>Error:</strong> {error}
            </div>
          )}
          
          {geohashInfo && (
            <DebugInfo 
              geohashInfo={geohashInfo}
              stations={stations}
              countries={countries}
            />
          )}
          
          {musicOnlyStations.length > 0 && (
            <StationList 
              stations={musicOnlyStations}
              onStationPlay={handleStationPlay}
              currentStation={audioPlayer.currentStation}
              isPlaying={audioPlayer.isPlaying}
            />
          )}
          
          {loading && (
            <div className="text-center py-8">
              <div className="inline-flex items-center gap-2 text-gray-600">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                Searching for radio stations...
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
