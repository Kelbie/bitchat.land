import { useState, useEffect, useRef } from "react";
import { GeohashService } from "@/services/geohashService";
import { CountryService } from "@/services/countryService";
import { RadioService } from "@/services/radioService";
import { StationWithDistance } from "@/types/app";

interface CachedRadioData {
  stations: StationWithDistance[];
  countries: Array<{countryCode: string, countryName: string, distance?: number}>;
  timestamp: number;
}

const radioService = new RadioService();
const radioCache = new Map<string, CachedRadioData>();
const CACHE_EXPIRY_HOURS = 24; // Cache for 24 hours

export function useRadioStations(searchText: string) {
  const [stations, setStations] = useState<StationWithDistance[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geohash, setGeohash] = useState<string | null>(null);
  const currentRequestRef = useRef<AbortController | null>(null);

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

  const fetchStationsForGeohash = async (geohash: string) => {
    // Check cache first
    const cached = radioCache.get(geohash);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY_HOURS * 60 * 60 * 1000) {
      setStations(cached.stations);
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

  // Auto-detect geohash and fetch stations when search text changes
  useEffect(() => {
    const newGeohash = extractGeohash(searchText);
    if (newGeohash && newGeohash !== geohash) {
      setGeohash(newGeohash);
      // Clear any existing errors when starting a new search
      setError(null);
      fetchStationsForGeohash(newGeohash);
    }
  }, [searchText, geohash]);

  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
    };
  }, []);

  return {
    stations,
    isLoading,
    error,
    geohash,
  };
}
