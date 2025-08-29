import React, { useState, useEffect } from 'react';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { GeohashService } from '../services/geohashService';
import { CountryService } from '../services/countryService';
import { RadioService } from '../services/radioService';
import { StationWithDistance } from '../types/radio';

interface HeaderRadioPlayerProps {
  searchText: string;
  theme: "matrix" | "material";
}

const radioService = new RadioService();

export function HeaderRadioPlayer({ searchText, theme }: HeaderRadioPlayerProps) {
  const [currentStation, setCurrentStation] = useState<StationWithDistance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<StationWithDistance[]>([]);
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  
  const audioPlayer = useAudioPlayer();

  // Extract geohash from search text
  const extractGeohash = (searchText: string): string | null => {
    const inMatch = searchText.match(/in:(#?)(\S+)/i);
    if (inMatch) {
      const geohash = inMatch[2].toLowerCase();
      // Remove any + suffix and validate
      const cleanGeohash = geohash.endsWith('+') ? geohash.slice(0, -1) : geohash;
      if (GeohashService.isValidGeohash(cleanGeohash)) {
        return cleanGeohash;
      }
    }
    return null;
  };

  // Auto-detect geohash and fetch stations when search text changes
  useEffect(() => {
    const geohash = extractGeohash(searchText);
    if (geohash && !currentStation) {
      fetchStationsForGeohash(geohash);
    }
  }, [searchText, currentStation]);

  const fetchStationsForGeohash = async (geohash: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Get geohash information
      const geohashInfo = GeohashService.getGeohashInfo(geohash);
      
      // Find countries in geohash region
      const countriesInRegion = await CountryService.getCountriesInGeohash(geohashInfo);
      
      if (countriesInRegion.length === 0) {
        setError('No countries found in this region');
        return;
      }
      
      // Fetch radio stations for those countries
      const allStations = await radioService.getStationsForCountries(
        countriesInRegion,
        geohashInfo.center
      );
      
      // Filter for music-only stations
      const musicStations = allStations.filter(station => station.isMusicStation);
      
      if (musicStations.length === 0) {
        setError('No music stations found in this region');
        return;
      }
      
      setStations(musicStations);
      setCurrentStationIndex(0);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStationPlay = async (station: StationWithDistance) => {
    try {
      // Record click for Radio Browser statistics
      await radioService.recordStationClick(station.stationuuid);
      
      // Play the station
      await audioPlayer.play(station);
      setCurrentStation(station);
      setError(null);
    } catch (err) {
      setError('Failed to play station');
    }
  };

  const handlePlayPause = () => {
    if (currentStation) {
      if (audioPlayer.isPlaying) {
        audioPlayer.stop();
        setCurrentStation(null);
      } else {
        handleStationPlay(currentStation);
      }
    } else if (stations.length > 0) {
      // Start playing the first station
      handleStationPlay(stations[0]);
      setCurrentStationIndex(0);
    }
  };

  const handlePrevious = () => {
    if (stations.length === 0) return;
    
    const newIndex = currentStationIndex > 0 ? currentStationIndex - 1 : stations.length - 1;
    setCurrentStationIndex(newIndex);
    
    if (currentStation) {
      // If currently playing, switch to new station
      handleStationPlay(stations[newIndex]);
    }
  };

  const handleNext = () => {
    if (stations.length === 0) return;
    
    const newIndex = currentStationIndex < stations.length - 1 ? currentStationIndex + 1 : 0;
    setCurrentStationIndex(newIndex);
    
    if (currentStation) {
      // If currently playing, switch to new station
      handleStationPlay(stations[newIndex]);
    }
  };

  const t = theme === "matrix" ? {
    container: "bg-black/90 backdrop-blur border-2 border-[#00ff00] rounded-lg p-3 shadow-lg",
    display: "bg-black border border-[#00ff00] rounded p-2 text-center mb-3",
    channelName: "text-[#00ff00] text-sm font-mono font-bold truncate",
    channelInfo: "text-[#00ff00]/70 text-xs font-mono mt-1",
    button: "p-2 rounded border border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20 transition-colors disabled:opacity-50",
    buttonActive: "p-2 rounded border border-[#00ff00] text-black bg-[#00ff00] hover:bg-[#00ff00]/80 transition-colors",
    controls: "flex items-center justify-center gap-2",
    error: "text-red-400 text-xs text-center mt-2",
    loading: "text-[#00ff00] text-xs text-center mt-2"
  } : {
    container: "bg-white/95 backdrop-blur border-2 border-blue-500 rounded-lg p-3 shadow-lg",
    display: "bg-gray-100 border border-blue-300 rounded p-2 text-center mb-3",
    channelName: "text-blue-700 text-sm font-bold truncate",
    channelInfo: "text-blue-600/70 text-xs mt-1",
    button: "p-2 rounded border border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50",
    buttonActive: "p-2 rounded border border-blue-500 text-white bg-blue-600 hover:bg-blue-700 transition-colors",
    controls: "flex items-center justify-center gap-2",
    error: "text-red-500 text-xs text-center mt-2",
    loading: "text-blue-600 text-xs text-center mt-2"
  };

  // Don't show anything if no geohash in search
  const geohash = extractGeohash(searchText);
  if (!geohash) {
    return null;
  }

  const currentStationData = currentStation || (stations.length > 0 ? stations[currentStationIndex] : null);

  return (
    <div className={`${t.container} max-w-xs mx-auto`}>
      {/* Radio Display */}
      <div className={t.display}>
        <div className={t.channelName} title={currentStationData?.name || 'No Station'}>
          {currentStationData?.name || '--- NO SIGNAL ---'}
        </div>
        <div className={t.channelInfo}>
          {currentStationData ? (
            `${currentStationData.country} • ${currentStationData.distanceKm.toFixed(1)} km`
          ) : (
            `${stations.length} stations available`
          )}
        </div>
      </div>

      {/* Radio Controls */}
      <div className={t.controls}>
        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={stations.length === 0}
          className={t.button}
          title="Previous Station"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h2v16H6zm3.5 8l8.5 6V6z"/>
          </svg>
        </button>

        {/* Play/Pause Button */}
        <button
          onClick={handlePlayPause}
          disabled={stations.length === 0}
          className={audioPlayer.isPlaying ? t.buttonActive : t.button}
          title={audioPlayer.isPlaying ? 'Pause' : 'Play'}
        >
          {audioPlayer.isPlaying ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6zm8 0h4v16h-4z"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={stations.length === 0}
          className={t.button}
          title="Next Station"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M16 4h2v16h-2zm-3.5 8l-8.5 6V6z"/>
          </svg>
        </button>
      </div>

      {/* Status Messages */}
      {isLoading && (
        <div className={t.loading}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="inline mr-1">
            <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.89 2 2 2h16c1.11 0 2-.9 2-2V8c0-1.11-.89-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h4V6h2v2h10v4z"/>
          </svg>
          Tuning to {geohash}...
        </div>
      )}
      
      {error && (
        <div className={t.error}>
          ⚠️ {error}
        </div>
      )}

      {/* Station Counter */}
      {stations.length > 0 && (
        <div className={t.channelInfo + " text-center mt-2"}>
          {currentStationIndex + 1} / {stations.length}
        </div>
      )}
    </div>
  );
}
