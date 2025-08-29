import React, { useState, useEffect, useRef } from "react";
import { useAudioPlayer } from "../hooks/useAudioPlayer";
import { GeohashService } from "../services/geohashService";
import { CountryService } from "../services/countryService";
import { RadioService } from "../services/radioService";
import { StationWithDistance } from "../types/radio";

interface RadioPageProps {
  searchText: string;
  theme: "matrix" | "material";
}

// Simple cache for radio stations
interface CachedRadioData {
  stations: StationWithDistance[];
  countries: Array<{countryCode: string, countryName: string, distance?: number}>;
  timestamp: number;
}

const radioService = new RadioService();
const radioCache = new Map<string, CachedRadioData>();
const CACHE_EXPIRY_HOURS = 24; // Cache for 24 hours

export function RadioPage({ searchText, theme }: RadioPageProps) {
  const [currentStation, setCurrentStation] =
    useState<StationWithDistance | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stations, setStations] = useState<StationWithDistance[]>([]);
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const [geohash, setGeohash] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const currentRequestRef = useRef<AbortController | null>(null);

  const audioPlayer = useAudioPlayer();

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
    };
  }, []);

  // Extract geohash from search text
  const extractGeohash = (searchText: string): string | null => {
    const inMatch = searchText.match(/in:(#?)(\S+)/i);
    if (inMatch) {
      const geohash = inMatch[2].toLowerCase();
      // Remove any + suffix and validate
      const cleanGeohash = geohash.endsWith("+")
        ? geohash.slice(0, -1)
        : geohash;
      if (GeohashService.isValidGeohash(cleanGeohash)) {
        return cleanGeohash;
      }
    }
    return null;
  };

  // Auto-detect geohash and fetch stations when search text changes
  useEffect(() => {
    const newGeohash = extractGeohash(searchText);
    if (newGeohash && newGeohash !== geohash) {
      setGeohash(newGeohash);
      // Clear filters when geohash changes since stations/countries will be different
      setSelectedTags(new Set());
      setSelectedCountries(new Set());
      fetchStationsForGeohash(newGeohash);
    }
  }, [searchText, geohash]);

  const fetchStationsForGeohash = async (geohash: string) => {
    // Check cache first
    const cached = radioCache.get(geohash);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_HOURS * 60 * 60 * 1000) {
      setStations(cached.stations);
      setCurrentStationIndex(0); // Reset index to first station in cached data
      return;
    }

    // Cancel any existing request
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    currentRequestRef.current = abortController;
    
    // Clear previous data when starting new search
    setStations([]);
    setCurrentStationIndex(0);
    setIsLoading(true);
    setError(null);

    try {
      // Check for cancellation
      if (abortController.signal.aborted) {
        return;
      }

      // Get geohash information
      const geohashInfo = GeohashService.getGeohashInfo(geohash);

      // Check for cancellation
      if (abortController.signal.aborted) {
        return;
      }

      // Find countries in geohash region
      const countriesInRegion = await CountryService.getCountriesInGeohash(
        geohashInfo
      );

      // Check for cancellation
      if (abortController.signal.aborted) {
        return;
      }

      if (countriesInRegion.length === 0) {
        if (!abortController.signal.aborted) {
          setError("No countries found in this region");
        }
        return;
      }

      // Store the countries for display (no longer needed since we calculate from stations)

      // Check for cancellation
      if (abortController.signal.aborted) {
        return;
      }

      // Fetch radio stations for those countries
      const allStations = await radioService.getStationsForCountries(
        countriesInRegion,
        geohashInfo.center
      );

      // Check for cancellation
      if (abortController.signal.aborted) {
        return;
      }

      // Filter for music-only stations
      const musicStations = allStations.filter(
        (station) => station.isMusicStation
      );

      if (musicStations.length === 0) {
        if (!abortController.signal.aborted) {
          setError("No music stations found in this region");
        }
        return;
      }

      // Only update state if request wasn't cancelled
      if (!abortController.signal.aborted) {
        setStations(musicStations);
        setCurrentStationIndex(0);
      }

      // Cache the results
      radioCache.set(geohash, {
        stations: musicStations,
        countries: countriesInRegion,
        timestamp: Date.now(),
      });

    } catch (err) {
      // Only show error if request wasn't cancelled
      if (!abortController.signal.aborted) {
        setError(err instanceof Error ? err.message : "Failed to fetch stations");
      }
    } finally {
      // Only update loading state if request wasn't cancelled
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  const handleStationPlay = async (station: StationWithDistance) => {
    try {
      // Record click for Radio Browser statistics
      await radioService.recordStationClick(station.id);

      // Play the station
      await audioPlayer.play(station);
      setCurrentStation(station);
      setCurrentStationIndex(
        stations.findIndex((s) => s.id === station.id)
      );
      setError(null);
    } catch {
      setError("Failed to play station");
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

    const newIndex =
      currentStationIndex > 0 ? currentStationIndex - 1 : stations.length - 1;
    setCurrentStationIndex(newIndex);

    if (currentStation) {
      // If currently playing, switch to new station
      handleStationPlay(stations[newIndex]);
    }
  };

  const handleNext = () => {
    if (stations.length === 0) return;

    const newIndex =
      currentStationIndex < stations.length - 1 ? currentStationIndex + 1 : 0;
    setCurrentStationIndex(newIndex);

    if (currentStation) {
      // If currently playing, switch to new station
      handleStationPlay(stations[newIndex]);
    }
  };

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tag)) {
        newSet.delete(tag);
      } else {
        newSet.add(tag);
      }
      return newSet;
    });
  };

  const clearTagFilters = () => {
    setSelectedTags(new Set());
  };

  const handleCountryToggle = (countryCode: string) => {
    setSelectedCountries((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(countryCode)) {
        newSet.delete(countryCode);
      } else {
        newSet.add(countryCode);
      }
      return newSet;
    });
  };

  const clearCountryFilters = () => {
    setSelectedCountries(new Set());
  };

  const filteredStations = stations.filter((station) => {
    // Check if station matches any of the selected tags (case-insensitive)
    const matchesSelectedTags = selectedTags.size === 0 || 
      station.tags?.some(stationTag => 
        Array.from(selectedTags).some(selectedTag => 
          selectedTag.toLowerCase() === stationTag.toLowerCase()
        )
      );
    
    const matchesSelectedCountries = selectedCountries.size === 0 || selectedCountries.has(station.countryCode);
    return matchesSelectedTags && matchesSelectedCountries;
  });

  // Calculate tag popularity based on station votes and order by popularity
  const tagPopularity = stations.reduce((acc, station) => {
    if (station.tags && station.tags.length > 0) {
      station.tags.forEach(tag => {
        if (!acc[tag]) {
          acc[tag] = {
            tag,
            totalVotes: 0,
            stationCount: 0,
            averageVotes: 0
          };
        }
        acc[tag].totalVotes += station.votes || 0;
        acc[tag].stationCount += 1;
      });
    }
    return acc;
  }, {} as Record<string, { tag: string; totalVotes: number; stationCount: number; averageVotes: number }>);

  // Calculate average votes and sort by popularity (total votes first, then average votes)
  const sortedTags = Object.values(tagPopularity)
    .map(tagData => ({
      ...tagData,
      averageVotes: tagData.stationCount > 0 ? tagData.totalVotes / tagData.stationCount : 0
    }))
    .sort((a, b) => {
      // Primary sort: total votes (descending)
      if (b.totalVotes !== a.totalVotes) {
        return b.totalVotes - a.totalVotes;
      }
      // Secondary sort: average votes (descending)
      if (b.averageVotes !== a.averageVotes) {
        return b.averageVotes - a.averageVotes;
      }
      // Tertiary sort: station count (descending)
      return b.stationCount - a.stationCount;
    })
    .map(tagData => tagData.tag);

  const allTags = sortedTags;
  const allCountries = Array.from(new Set(
    stations
      .filter(station => station.countryCode && station.country)
      .map(station => JSON.stringify({ countryCode: station.countryCode.toUpperCase(), countryName: station.country }))
  )).map(countryStr => JSON.parse(countryStr));

  const t =
    theme === "matrix"
      ? {
          container: "min-h-screen bg-black text-[#00ff00] p-4",
          header: "text-2xl font-bold mb-6 text-center",
          searchPrompt: "text-center text-[#00ff00]/70 mb-8",
          stationGrid:
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-24",
          stationCard:
            "bg-black/80 border border-[#00ff00]/30 rounded-lg p-4 hover:border-[#00ff00] transition-colors cursor-pointer",
          stationCardActive:
            "bg-black/80 border-2 border-[#00ff00] rounded-lg p-4",
          stationName: "text-[#00ff00] font-bold text-lg mb-2",
          stationInfo: "text-[#00ff00]/70 text-sm mb-2",
          stationTags: "text-[#00ff00]/50 text-xs",
          playerBar:
            "fixed bottom-0 left-0 right-0 bg-black/95 border-t border-[#00ff00] p-4 backdrop-blur",
          playerContent: "mx-auto flex items-center justify-between",
          playerInfo: "flex-1 min-w-0",
          playerControls: "flex items-center gap-3 flex-1 grow",
          volumeControls: "flex items-center gap-2",
          button:
            "p-3 rounded border border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/20 transition-colors",
          buttonActive:
            "p-3 rounded border border-[#00ff00] text-black bg-[#00ff00] hover:bg-[#00ff00]/80 transition-colors",
          volumeSlider:
            "w-20 h-2 bg-[#00ff00]/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#00ff00] [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#00ff00] [&::-moz-range-thumb]:cursor-pointer",
          error: "text-red-400 text-center p-4",
          loading: "text-[#00ff00] text-center p-8",
        }
      : {
          container: "min-h-screen bg-gray-50 text-gray-800 p-4",
          header: "text-2xl font-bold mb-6 text-center text-blue-600",
          searchPrompt: "text-center text-gray-600 mb-8",
          stationGrid:
            "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-24",
          stationCard:
            "bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer",
          stationCardActive:
            "bg-white border-2 border-blue-500 rounded-lg p-4 shadow-lg",
          stationName: "text-gray-900 font-bold text-lg mb-2",
          stationInfo: "text-gray-600 text-sm mb-2",
          stationTags: "text-gray-500 text-xs",
          playerBar:
            "fixed bottom-0 left-0 right-0 bg-white/95 border-t border-blue-200 p-4 backdrop-blur shadow-lg",
          playerContent: "mx-auto flex items-center justify-between",
          playerInfo: "flex-1 min-w-0",
          playerControls: "flex items-center gap-3",
          volumeControls: "flex items-center gap-2",
          button:
            "p-3 rounded border border-blue-500 text-blue-600 hover:bg-blue-50 transition-colors",
          buttonActive:
            "p-3 rounded border border-blue-500 text-white bg-blue-600 hover:bg-blue-700 transition-colors",
          volumeSlider:
            "w-20 h-2 bg-blue-300 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:cursor-pointer [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-600 [&::-moz-range-thumb]:cursor-pointer",
          error: "text-red-500 text-center p-4",
          loading: "text-blue-600 text-center p-8",
        };

  return (
    <div className={`${t.container} h-full flex flex-col`}>
      {/* Radio Content - Fill available space */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Search Prompt */}
        {!geohash && (
          <div className={t.searchPrompt}>
            <p>Type a search with a geohash to discover radio stations!</p>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className={t.loading}>
            <div className="inline-flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="animate-spin"
              >
                <path d="M3.24 6.15C2.51 6.43 2 7.17 2 8v12c0 1.1.89 2 2 2h16c1.11 0 2-.9 2-2V8c0-1.11-.89-2-2-2H8.3l8.26-3.34L15.88 1 3.24 6.15zM7 20c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm13-8h-2v-2h-2v2H4V8h4V6h2v2h10v4z" />
              </svg>
              Tuning to {geohash}...
            </div>
          </div>
        )}

        {/* Error State */}
        {error && <div className={t.error}>⚠️ {error}</div>}

        {/* Tags Filter UI */}
        {allTags.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className={`text-lg font-semibold ${
                theme === "matrix" ? "text-[#00ff00]" : "text-gray-800"
              }`}>
                Filter by Tags
              </h3>
              {selectedTags.size > 0 && (
                <button
                  onClick={clearTagFilters}
                  className={`text-sm px-3 py-1 rounded-full border ${
                    theme === "matrix"
                      ? "text-[#00ff00]/70 border-[#00ff00]/30 hover:border-[#00ff00] hover:text-[#00ff00]"
                      : "text-gray-600 border-gray-300 hover:border-gray-400 hover:text-gray-800"
                  } transition-colors`}
                >
                  Clear All
                </button>
              )}
            </div>
            
            {/* Tag popularity summary */}
            <div className={`mb-3 text-sm ${
              theme === "matrix" ? "text-[#00ff00]/70" : "text-gray-600"
            }`}>
              <span>Tags ordered by popularity • </span>
              <span>Total votes: {Object.values(tagPopularity).reduce((sum, tag) => sum + tag.totalVotes, 0).toLocaleString()}</span>
              <span> • </span>
              <span>Total stations: {Object.values(tagPopularity).reduce((sum, tag) => sum + tag.stationCount, 0)}</span>
            </div>

            <div className="h-30 overflow-x-auto">
              <div className="flex flex-col gap-2">
                {/* Top row - first half of tags */}
                <div className="flex gap-2">
                                      {allTags.slice(0, Math.ceil(allTags.length / 2)).map(tag => {
                      const isSelected = selectedTags.has(tag);
                      const tagData = tagPopularity[tag];
                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 flex items-center gap-2 ${
                            isSelected
                              ? theme === "matrix"
                                ? "bg-[#00ff00] text-black border border-[#00ff00]"
                                : "bg-blue-600 text-white border border-blue-600"
                              : theme === "matrix"
                              ? "bg-black/50 text-[#00ff00]/70 border border-[#00ff00]/30 hover:border-[#00ff00]/50 hover:text-[#00ff00]"
                              : "bg-gray-100 text-gray-700 border border-gray-300 hover:border-gray-400 hover:text-gray-900"
                          }`}
                          title={`${tagData.totalVotes} total votes • ${tagData.stationCount} stations`}
                        >
                          <span>{tag.charAt(0).toUpperCase() + tag.slice(1)}</span>
                          <div className={`text-xs px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? theme === "matrix"
                                ? "bg-black/20 text-black"
                                : "bg-white/20 text-white"
                              : theme === "matrix"
                              ? "bg-[#00ff00]/20 text-[#00ff00]"
                              : "bg-gray-200 text-gray-600"
                          }`}>
                            {tagData.totalVotes}
                          </div>
                        </button>
                      );
                    })}
                </div>
                {/* Bottom row - second half of tags */}
                <div className="flex gap-2">
                                      {allTags.slice(Math.ceil(allTags.length / 2)).map(tag => {
                      const isSelected = selectedTags.has(tag);
                      const tagData = tagPopularity[tag];
                      return (
                        <button
                          key={tag}
                          onClick={() => handleTagToggle(tag)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 flex items-center gap-2 ${
                            isSelected
                              ? theme === "matrix"
                                ? "bg-[#00ff00] text-black border border-[#00ff00]"
                                : "bg-blue-600 text-white border border-blue-600"
                              : theme === "matrix"
                              ? "bg-black/50 text-[#00ff00]/70 border border-[#00ff00]/30 hover:border-[#00ff00]/50 hover:text-[#00ff00]"
                              : "bg-gray-100 text-gray-700 border border-gray-300 hover:border-gray-400 hover:text-gray-900"
                          }`}
                          title={`${tagData.totalVotes} total votes • ${tagData.stationCount} stations`}
                        >
                          <span>{tag.charAt(0).toUpperCase() + tag.slice(1)}</span>
                          <div className={`text-xs px-1.5 py-0.5 rounded-full ${
                            isSelected
                              ? theme === "matrix"
                                ? "bg-black/20 text-black"
                                : "bg-white/20 text-white"
                              : theme === "matrix"
                              ? "bg-[#00ff00]/20 text-[#00ff00]"
                              : "bg-gray-200 text-gray-600"
                          }`}>
                            {tagData.totalVotes}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            </div>
            
            {/* Filter by Countries */}

            <div className="mb-2 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-lg font-semibold ${
                  theme === "matrix" ? "text-[#00ff00]" : "text-gray-800"
                }`}>
                  Filter by Countries
                </h3>
                {selectedCountries.size > 0 && (
                  <button
                    onClick={clearCountryFilters}
                    className={`text-sm px-3 py-1 rounded-full border ${
                      theme === "matrix"
                        ? "text-[#00ff00]/70 border-[#00ff00]/30 hover:border-[#00ff00] hover:text-[#00ff00]"
                        : "text-gray-600 border-gray-300 hover:border-gray-400 hover:text-gray-800"
                    } transition-colors`}
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>
            <div className="h-30 overflow-x-auto">
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  {allCountries.map(country => {
                    const isSelected = selectedCountries.has(country.countryCode);
                    return (
                      <button
                        key={country.countryCode}
                        onClick={() => handleCountryToggle(country.countryCode)}
                        className={`px-3 py-2 rounded-full text-sm font-medium transition-all flex-shrink-0 ${
                          isSelected
                            ? theme === "matrix"
                              ? "bg-[#00ff00] text-black border border-[#00ff00]"
                              : "bg-blue-600 text-white border border-blue-600"
                            : theme === "matrix"
                            ? "bg-black/50 text-[#00ff00]/70 border border-[#00ff00]/30 hover:border-[#00ff00]/50 hover:text-[#00ff00]"
                            : "bg-gray-100 text-gray-700 border border-gray-300 hover:border-gray-400 hover:text-gray-900"
                        }`}
                      >
                        {country.countryName}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            
            {
              <div className={`mt-3 text-sm ${
                theme === "matrix" ? "text-[#00ff00]/70" : "text-gray-600"
              }`}>
                Showing {filteredStations.length} of {stations.length} stations
              </div>
            }
          </div>
        )}

        

        {/* Stations List - Single Column with proper flex behavior */}
        {filteredStations.length > 0 && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-1 h-full">
              {filteredStations.sort((a, b) => a.distanceKm - b.distanceKm).map((station, index) => (
                <div
                  key={station.id}
                  onClick={() => handleStationPlay(station)}
                  className={`flex items-center gap-4 p-3 rounded-md ${
                    theme === "matrix"
                      ? "hover:bg-[#00ff00]/10"
                      : "hover:bg-gray-100"
                  } cursor-pointer group transition-colors ${
                    currentStation?.id === station.id
                      ? theme === "matrix"
                        ? "bg-[#00ff00]/20"
                        : "bg-blue-50"
                      : ""
                  }`}
                >
                  {/* Track Number / Play Icon */}
                  <div className="w-8 flex justify-center flex-shrink-0">
                    {currentStation?.id === station.id &&
                    audioPlayer.isPlaying ? (
                      <div className="flex items-center gap-1">
                        <div
                          className={`w-1 h-3 ${
                            theme === "matrix"
                              ? "bg-[#00ff00]"
                              : "bg-green-500"
                          } animate-pulse`}
                        ></div>
                        <div
                          className={`w-1 h-4 ${
                            theme === "matrix"
                              ? "bg-[#00ff00]"
                              : "bg-green-500"
                          } animate-pulse`}
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                        <div
                          className={`w-1 h-3 ${
                            theme === "matrix"
                              ? "bg-[#00ff00]"
                              : "bg-green-500"
                          } animate-pulse`}
                          style={{ animationDelay: "0.4s" }}
                        ></div>
                      </div>
                    ) : (
                      <span
                        className={`text-sm ${
                          theme === "matrix"
                            ? "text-[#00ff00]/70"
                            : "text-gray-500"
                        } group-hover:hidden`}
                      >
                        {(index + 1).toString().padStart(2, "0")}
                      </span>
                    )}
                    <svg
                      className={`w-4 h-4 ${
                        theme === "matrix"
                          ? "text-[#00ff00]"
                          : "text-gray-800"
                      } hidden group-hover:block`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>

                  {/* Station Favicon */}
                  <div className="w-12 h-12 flex-shrink-0">
                    {station.favicon ? (
                      <img
                        src={station.favicon}
                        alt={`${station.name} logo`}
                        className="w-12 h-12 rounded-md object-cover bg-gray-100"
                        onError={(e) => {
                          // Fallback to default icon if favicon fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    {/* Fallback icon when no favicon or favicon fails */}
                    <div className={`w-12 h-12 rounded-md flex items-center justify-center ${
                      station.favicon ? 'hidden' : ''
                    } ${
                      theme === "matrix"
                        ? "bg-[#00ff00]/10 text-[#00ff00]"
                        : "bg-gray-100 text-gray-400"
                    }`}>
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                      </svg>
                    </div>
                  </div>

                  {/* Station Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className={`font-medium truncate ${
                          currentStation?.id === station.id
                            ? theme === "matrix"
                              ? "text-[#00ff00]"
                              : "text-green-600"
                            : theme === "matrix"
                            ? "text-[#00ff00]"
                            : "text-gray-900"
                        }`}
                      >
                        {station.name}
                      </div>
                      {/* Online Status Indicator */}
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        station.lastCheckOk
                          ? theme === "matrix"
                            ? "bg-[#00ff00]"
                            : "bg-green-500"
                          : "bg-red-500"
                      }`} 
                      title={station.lastCheckOk ? "Online" : "Offline"}
                      />
                    </div>
                    
                    {/* Location and Tags */}
                    <div
                      className={`text-sm truncate ${
                        theme === "matrix"
                          ? "text-[#00ff00]/70"
                          : "text-gray-600"
                      }`}
                    >
                      {station.country}
                      {station.state && station.state !== station.country && (
                        <span>, {station.state}</span>
                      )}
                      {station.tags && station.tags.length > 0 && (
                        <span> • {station.tags.slice(0, 2).join(", ")}</span>
                      )}
                    </div>

                    {/* Technical Info */}
                    <div className="flex items-center gap-3 mt-1">
                      {/* Codec and Bitrate */}
                      {station.codec && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          theme === "matrix"
                            ? "bg-[#00ff00]/10 text-[#00ff00]/80"
                            : "bg-blue-50 text-blue-600"
                        }`}>
                          {station.codec}
                          {station.bitrate && ` • ${station.bitrate}k`}
                        </span>
                      )}
                      
                      {/* Language */}
                      {station.language && station.language.length > 0 && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          theme === "matrix"
                            ? "bg-[#00ff00]/10 text-[#00ff00]/80"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {station.language[0]}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Distance and Popularity */}
                  <div className="flex flex-col items-end gap-1 min-w-[80px] flex-shrink-0">
                    {/* Distance */}
                    <div
                      className={`text-sm ${
                        theme === "matrix"
                          ? "text-[#00ff00]/70"
                          : "text-gray-500"
                      }`}
                    >
                      {station.distanceKm.toFixed(1)} km
                    </div>
                    
                    {/* Popularity Indicators */}
                    <div className="flex items-center gap-1">
                      {/* Votes */}
                      {station.votes > 0 && (
                        <span className={`text-xs flex items-center gap-1 ${
                          theme === "matrix"
                            ? "text-[#00ff00]/70"
                            : "text-gray-500"
                        }`}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                          </svg>
                          {station.votes}
                        </span>
                      )}
                      
                      {/* Click Count */}
                      {station.clickCount > 0 && (
                        <span className={`text-xs flex items-center gap-1 ${
                          theme === "matrix"
                            ? "text-[#00ff00]/70"
                            : "text-gray-500"
                        }`}>
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                          </svg>
                          {station.clickCount}
                        </span>
                      )}

                      {/* Click Trend */}
                      {station.clickTrend !== 0 && (
                        <span className={`text-xs flex items-center gap-1 ${
                          station.clickTrend > 0
                            ? theme === "matrix"
                              ? "text-[#00ff00]"
                              : "text-green-600"
                            : theme === "matrix"
                              ? "text-red-400"
                              : "text-red-600"
                        }`}>
                          {station.clickTrend > 0 ? (
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M7 14l5-5 5 5z"/>
                            </svg>
                          ) : (
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M7 10l5 5 5-5z"/>
                            </svg>
                          )}
                          {Math.abs(station.clickTrend)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state when no stations - expand to fill space */}
        {!isLoading && !error && stations.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <div className={`text-center ${theme === "matrix" ? "text-[#00ff00]/50" : "text-gray-400"}`}>
              <svg
                width="48"
                height="48"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="mx-auto mb-4 opacity-50"
              >
                <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
              </svg>
              <p>Search for radio stations using a geohash</p>
              <p className="text-sm mt-2">Example: "music in:dr5r"</p>
            </div>
          </div>
        )}
      </div>

      {/* Player Bar (Fixed at bottom) */}
      {stations.length > 0 && (
        <div
          className={`z-50 fixed bottom-0 left-0 right-0 ${
            theme === "matrix"
              ? "bg-black/95 border-t border-[#00ff00]/30"
              : "bg-white border-t border-gray-200"
          } p-4 backdrop-blur`}
        >
          <div className="flex items-center justify-between max-w-screen-xl mx-auto">
            {/* Left: Now Playing Info */}
            <div className="flex items-center gap-4 flex-1 min-w-0 max-w-[30%]">
              {/* Station Favicon */}
              <div className="w-14 h-14 flex-shrink-0">
                {currentStation?.favicon ? (
                  <img
                    src={currentStation.favicon}
                    alt={`${currentStation.name} logo`}
                    className="w-14 h-14 rounded-md object-cover bg-gray-100"
                    onError={(e) => {
                      // Fallback to default icon if favicon fails to load
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                {/* Fallback icon when no favicon or favicon fails */}
                <div className={`w-14 h-14 rounded-md flex items-center justify-center ${
                  currentStation?.favicon ? 'hidden' : ''
                } ${
                  theme === "matrix"
                    ? "bg-[#00ff00]/20 border border-[#00ff00]/30 text-[#00ff00]/50"
                    : "bg-gray-200 text-gray-400"
                }`}>
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                  </svg>
                </div>
              </div>

              {/* Track Info */}
              <div className="min-w-0 flex-1">
                {currentStation ? (
                  <>
                    <div
                      className={`font-medium truncate ${
                        theme === "matrix" ? "text-[#00ff00]" : "text-gray-900"
                      }`}
                    >
                      {currentStation.name}
                    </div>
                    <div
                      className={`text-sm truncate ${
                        theme === "matrix"
                          ? "text-[#00ff00]/70"
                          : "text-gray-600"
                      }`}
                    >
                      {currentStation.country} • Live Radio
                    </div>
                  </>
                ) : (
                  <div
                    className={`text-sm ${
                      theme === "matrix" ? "text-[#00ff00]/70" : "text-gray-600"
                    }`}
                  >
                    Select a station to play
                  </div>
                )}
              </div>

              {/* Heart Icon */}
              <button
                className={`p-2 ${
                  theme === "matrix"
                    ? "text-[#00ff00]/70 hover:text-[#00ff00]"
                    : "text-gray-500 hover:text-gray-700"
                } transition-colors`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>
            </div>

            {/* Center: Player Controls */}
            <div className="flex flex-col items-center gap-2 flex-1 max-w-[40%]">
              {/* Control Buttons */}
              <div className="flex items-center gap-4">
                {/* Shuffle */}
                {/* <button
                  className={`${
                    theme === "matrix"
                      ? "text-[#00ff00]/70 hover:text-[#00ff00]"
                      : "text-gray-500 hover:text-gray-700"
                  } transition-colors`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M10.59 9.17L5.41 4 4 5.41l5.17 5.17 1.42-1.41zM14.5 4l2.04 2.04L4 18.59 5.41 20 17.96 7.46L20 9.5V4h-5.5zm.33 9.41l-1.41 1.41 3.13 3.13L14.5 20H20v-5.5l-2.04 2.04-3.13-3.13z" />
                  </svg>
                </button> */}

                {/* Previous */}
                <button
                  onClick={handlePrevious}
                  className={`${
                    theme === "matrix"
                      ? "text-[#00ff00]/70 hover:text-[#00ff00]"
                      : "text-gray-500 hover:text-gray-700"
                  } transition-colors`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
                  </svg>
                </button>

                {/* Play/Pause */}
                <button
                  onClick={handlePlayPause}
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    theme === "matrix"
                      ? "bg-[#00ff00] text-black hover:bg-[#00ff00]/80"
                      : "bg-gray-900 text-white hover:bg-black"
                  } transition-colors`}
                >
                  {audioPlayer.isPlaying ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                {/* Next */}
                <button
                  onClick={handleNext}
                  className={`${
                    theme === "matrix"
                      ? "text-[#00ff00]/70 hover:text-[#00ff00]"
                      : "text-gray-500 hover:text-gray-700"
                  } transition-colors`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M6 4l8.5 8L6 20V4zm10 0v16h2V4h-2z" />
                  </svg>
                </button>

                {/* Repeat */}
                {/* <button
                  className={`${
                    theme === "matrix"
                      ? "text-[#00ff00]/70 hover:text-[#00ff00]"
                      : "text-gray-500 hover:text-gray-700"
                  } transition-colors`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M7 7h10v3l4-4-4-4v3H5v6h2V7zm10 10H7v-3l-4 4 4 4v-3h12v-6h-2v4z" />
                  </svg>
                </button> */}
              </div>

              {/* Progress Bar */}
              <div className="flex items-center gap-2 w-full max-w-md">
                <span
                  className={`text-xs ${
                    theme === "matrix" ? "text-[#00ff00]/70" : "text-gray-500"
                  } w-10 text-right`}
                >
                  {audioPlayer.formatTime(audioPlayer.currentTime)}
                </span>
                <div
                  className={`flex-1 h-1 ${
                    theme === "matrix" ? "bg-[#00ff00]/30" : "bg-gray-300"
                  } rounded-full cursor-pointer relative group`}
                  onClick={(e) => {
                    if (audioPlayer.duration > 0) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left;
                      const percentage = clickX / rect.width;
                      const newTime = percentage * audioPlayer.duration;
                      
                      // Use the seekTo function from the hook
                      audioPlayer.seekTo(newTime);
                    }
                  }}
                  title="Click to seek"
                >
                  {/* Hover tooltip showing current time */}
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    {audioPlayer.formatTime(audioPlayer.currentTime)}
                  </div>
                  <div
                    className={`h-full ${
                      theme === "matrix" ? "bg-[#00ff00]" : "bg-gray-600"
                    } rounded-full transition-all duration-100`}
                    style={{
                      width: audioPlayer.duration > 0 
                        ? `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%` 
                        : '0%'
                    }}
                  ></div>
                  {/* Live progress indicator dot */}
                  {audioPlayer.duration > 0 && (
                    <div
                      className={`absolute top-1/2 transform -translate-y-1/2 w-3 h-3 ${
                        theme === "matrix" ? "bg-[#00ff00]" : "bg-gray-600"
                      } rounded-full shadow-lg transition-all duration-100`}
                      style={{
                        left: `${(audioPlayer.currentTime / audioPlayer.duration) * 100}%`,
                        transform: 'translate(-50%, -50%)'
                      }}
                    ></div>
                  )}
                </div>
                <span
                  className={`text-xs ${
                    theme === "matrix" ? "text-[#00ff00]/70" : "text-gray-500"
                  } w-10`}
                >
                  {audioPlayer.formatTime(audioPlayer.duration)}
                </span>
              </div>
            </div>

            {/* Right: Volume and Additional Controls */}
            <div className="flex items-center gap-3 flex-1 justify-end max-w-[30%]">
              {/* Playing View */}
              {/* <button
                className={`${
                  theme === "matrix"
                    ? "text-[#00ff00]/70 hover:text-[#00ff00]"
                    : "text-gray-500 hover:text-gray-700"
                } transition-colors`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M7 4V2C7 1.45 7.45 1 8 1s1 .45 1 1v2h6V2c0-.55.45-1 1-1s1 .45 1 1v2h2c1.1 0 2 .9 2 2v14c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2h2z" />
                </svg>
              </button> */}

              {/* Queue */}
              {/* <button
                className={`${
                  theme === "matrix"
                    ? "text-[#00ff00]/70 hover:text-[#00ff00]"
                    : "text-gray-500 hover:text-gray-700"
                } transition-colors`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" />
                </svg>
              </button> */}

              {/* Connect Device */}
              {/* <button
                className={`${
                  theme === "matrix"
                    ? "text-[#00ff00]/70 hover:text-[#00ff00]"
                    : "text-gray-500 hover:text-gray-700"
                } transition-colors`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M6 22h12l-6-6-6 6zM21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v-2H3V5h18v12h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                </svg>
              </button> */}

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  className={`${
                    theme === "matrix"
                      ? "text-[#00ff00]/70 hover:text-[#00ff00]"
                      : "text-gray-500 hover:text-gray-700"
                  } transition-colors`}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                  </svg>
                </button>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={audioPlayer.volume * 100}
                  onChange={(e) =>
                    audioPlayer.setVolume(parseInt(e.target.value) / 100)
                  }
                  className={`w-20 h-1 rounded-lg appearance-none cursor-pointer ${
                    theme === "matrix"
                      ? "bg-[#00ff00]/30 [&::-webkit-slider-thumb]:bg-[#00ff00]"
                      : "bg-gray-300 [&::-webkit-slider-thumb]:bg-gray-600"
                  } [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
