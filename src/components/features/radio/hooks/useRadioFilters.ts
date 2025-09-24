import { useState, useMemo } from "react";
import { StationWithDistance, FilterState, FilterActions, FilterData, TagData } from "@/types/app";

export function useRadioFilters(stations: StationWithDistance[]) {
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());

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

  const filteredStations = useMemo(() => {
    return stations.filter((station) => {
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
  }, [stations, selectedTags, selectedCountries]);

  const tagPopularity = useMemo(() => {
    return stations.reduce((acc, station) => {
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
    }, {} as Record<string, TagData>);
  }, [stations]);

  const sortedTags = useMemo(() => {
    return Object.values(tagPopularity)
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
  }, [tagPopularity]);

  const allCountries = useMemo(() => {
    return Array.from(new Set(
      stations
        .filter(station => station.countryCode && station.country)
        .map(station => JSON.stringify({ countryCode: station.countryCode.toUpperCase(), countryName: station.country }))
    )).map(countryStr => JSON.parse(countryStr));
  }, [stations]);

  const filterData: FilterData = {
    allTags: sortedTags,
    tagPopularity,
    allCountries,
    filteredStationsCount: filteredStations.length,
    totalStationsCount: stations.length,
  };

  const filterState: FilterState = {
    selectedTags,
    selectedCountries,
  };

  const filterActions: FilterActions = {
    onTagToggle: handleTagToggle,
    onClearTags: clearTagFilters,
    onCountryToggle: handleCountryToggle,
    onClearCountries: clearCountryFilters,
  };

  return {
    filteredStations,
    filterData,
    filterState,
    filterActions,
  };
}
