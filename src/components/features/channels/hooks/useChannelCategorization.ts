import { useState, useEffect, useCallback, useMemo } from "react";
import { CountryService } from "@/services/countryService";
import { GeohashService } from "@/services/geohashService";
import { EVENT_KINDS } from "@/constants/eventKinds";
import { getPinnedChannels } from "@/utils/pinnedChannels";
import { ChannelMeta, CategorizedChannels, CountryCategorizedChannels, CountryInRegion } from "@/types/filter";

export function useChannelCategorization(channels: ChannelMeta[], pinnedChannels: string[]) {
  const [viewMode, setViewMode] = useState<'geohash' | 'country'>('country');
  const [countryCache, setCountryCache] = useState<Map<string, CountryInRegion[]>>(new Map());
  const [countryCategorized, setCountryCategorized] = useState<CountryCategorizedChannels | null>(null);

  // Function to get countries for a geohash with caching
  const getCountriesForGeohash = useCallback(async (geohash: string): Promise<CountryInRegion[]> => {
    const cleanGeohash = geohash.startsWith('#') ? geohash.slice(1) : geohash;
    
    if (countryCache.has(cleanGeohash)) {
      return countryCache.get(cleanGeohash)!;
    }

    try {
      if (!GeohashService.isValidGeohash(cleanGeohash)) {
        return [];
      }

      const geohashInfo = GeohashService.getGeohashInfo(cleanGeohash);
      const countries = await CountryService.getCountriesInGeohash(geohashInfo);
      
      setCountryCache(prev => new Map(prev.set(cleanGeohash, countries)));
      return countries;
    } catch (error) {
      console.warn(`Failed to get countries for geohash ${cleanGeohash}:`, error);
      return [];
    }
  }, [countryCache]);

  // Generate top-level geohashes
  const generateTopLevelGeohashes = useCallback((existingGeohashChannels: string[]) => {
    const topLevelGeohashes = new Set<string>();
    
    existingGeohashChannels.forEach(channel => {
      if (channel.startsWith('#')) {
        const parts = channel.slice(1).split('');
        if (parts.length >= 1) {
          topLevelGeohashes.add(`#${parts[0]}`);
        }
      }
    });
    
    const geohashAlphabet = '0123456789bcdefghjkmnpqrstuvwxyz';
    geohashAlphabet.split('').forEach(char => {
      topLevelGeohashes.add(`#${char}`);
    });
    
    return Array.from(topLevelGeohashes).sort();
  }, []);

  // Categorize channels by country (async)
  const categorizeChannelsByCountry = useCallback(async (allChannels: ChannelMeta[]) => {
    const countryGroups = new Map<string, Set<string>>();
    const standardSet = new Set<string>();

    // Process geohash channels
    const geohashChannels = allChannels.filter(channel => 
      channel.eventKind === EVENT_KINDS.GEO_CHANNEL
    );

    const pinnedChannelsData = getPinnedChannels();
    const pinnedGeohashChannels = pinnedChannelsData.filter(p => 
      p.eventKind === EVENT_KINDS.GEO_CHANNEL && !geohashChannels.some(ch => ch.key === p.key)
    );

    const allGeohashChannels = [
      ...geohashChannels,
      ...pinnedGeohashChannels.map(p => ({ key: p.key, eventKind: p.eventKind, isPinned: true, hasMessages: false }))
    ];

    // Get countries for all geohash channels
    for (const channel of allGeohashChannels) {
      try {
        const countries = await getCountriesForGeohash(channel.key);
        
        if (countries.length === 0) {
          if (!countryGroups.has('Unknown')) {
            countryGroups.set('Unknown', new Set());
          }
          countryGroups.get('Unknown')!.add(channel.key);
        } else {
          countries.forEach(country => {
            let displayName = country.countryName;
            
            const problematicCodes = ['UN', 'XX', 'ZZ', 'AA'];
            if (problematicCodes.includes(country.countryCode) || country.countryName === country.countryCode) {
              displayName = 'Unknown';
            }
            
            if (!countryGroups.has(displayName)) {
              countryGroups.set(displayName, new Set());
            }
            countryGroups.get(displayName)!.add(channel.key);
          });
        }
      } catch (error) {
        console.warn(`Failed to categorize geohash ${channel.key}:`, error);
        if (!countryGroups.has('Unknown')) {
          countryGroups.set('Unknown', new Set());
        }
        countryGroups.get('Unknown')!.add(channel.key);
      }
    }

    // Add standard channels
    const standardChannels = allChannels.filter(channel => 
      channel.eventKind === EVENT_KINDS.STANDARD_CHANNEL
    );
    
    const pinnedStandardChannels = pinnedChannelsData.filter(p => 
      p.eventKind === EVENT_KINDS.STANDARD_CHANNEL && !standardChannels.some(ch => ch.key === p.key)
    );

    [...standardChannels, ...pinnedStandardChannels].forEach(channel => {
      standardSet.add(channel.key);
    });

    // Clean up Unknown group
    if (countryGroups.has('Unknown')) {
      const unknownChannels = countryGroups.get('Unknown')!;
      const channelsInProperCountries = new Set<string>();
      
      Array.from(countryGroups.entries()).forEach(([countryName, channelSet]) => {
        if (countryName !== 'Unknown') {
          channelSet.forEach(channel => channelsInProperCountries.add(channel));
        }
      });
      
      channelsInProperCountries.forEach(channel => {
        unknownChannels.delete(channel);
      });
      
      if (unknownChannels.size === 0) {
        countryGroups.delete('Unknown');
      }
    }

    // Add common countries
    const commonCountries = [
      'United States', 'Canada', 'United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 
      'Japan', 'Australia', 'Brazil', 'China', 'India', 'Russia', 'Netherlands', 
      'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark'
    ];
    
    commonCountries.forEach(countryName => {
      if (!countryGroups.has(countryName)) {
        countryGroups.set(countryName, new Set());
      }
    });

    // Add top-level geohashes
    const geohashAlphabet = '0123456789bcdefghjkmnpqrstuvwxyz';
    
    for (const char of geohashAlphabet) {
      const topLevelGeohash = `#${char}`;
      
      try {
        const countries = await getCountriesForGeohash(topLevelGeohash);
        
        if (countries.length === 0) {
          if (!countryGroups.has('Unknown')) {
            countryGroups.set('Unknown', new Set());
          }
          countryGroups.get('Unknown')!.add(topLevelGeohash);
        } else {
          let hasValidCountry = false;
          
          countries.forEach(country => {
            const problematicCodes = ['UN', 'XX', 'ZZ', 'AA'];
            const isProblematicCode = problematicCodes.includes(country.countryCode) || country.countryName === country.countryCode;
            
            if (!isProblematicCode) {
              const displayName = country.countryName;
              if (!countryGroups.has(displayName)) {
                countryGroups.set(displayName, new Set());
              }
              countryGroups.get(displayName)!.add(topLevelGeohash);
              hasValidCountry = true;
            }
          });
          
          if (!hasValidCountry) {
            if (!countryGroups.has('Unknown')) {
              countryGroups.set('Unknown', new Set());
            }
            countryGroups.get('Unknown')!.add(topLevelGeohash);
          }
        }
      } catch (error) {
        console.warn(`Failed to categorize top-level geohash ${topLevelGeohash}:`, error);
        if (!countryGroups.has('Unknown')) {
          countryGroups.set('Unknown', new Set());
        }
        countryGroups.get('Unknown')!.add(topLevelGeohash);
      }
    }

    // Convert to result format
    const sortByLength = (channelList: string[]) => {
      return channelList.sort((a, b) => {
        const lengthDiff = a.length - b.length;
        if (lengthDiff !== 0) return lengthDiff;
        return a.localeCompare(b);
      });
    };

    const countryResult: Record<string, string[]> = {};
    Array.from(countryGroups.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([countryName, channelSet]) => {
        countryResult[countryName] = sortByLength(Array.from(channelSet));
      });

    return {
      pinned: [],
      countries: countryResult,
      standard: sortByLength(Array.from(standardSet))
    };
  }, [getCountriesForGeohash]);

  // Categorize channels by event kind
  const categorizeChannelsByEventKind = useCallback((allChannels: ChannelMeta[], pinnedChannels: string[]) => {
    const pinned = new Set(pinnedChannels);
    const geohashSet = new Set<string>();
    const standardSet = new Set<string>();

    allChannels.forEach(channel => {
      if (pinned.has(channel.key)) {
        return;
      }
      
      if (channel.eventKind === EVENT_KINDS.GEO_CHANNEL) {
        geohashSet.add(channel.key);
      } else if (channel.eventKind === EVENT_KINDS.STANDARD_CHANNEL) {
        standardSet.add(channel.key);
      }
    });

    const topLevelGeohashes = generateTopLevelGeohashes(Array.from(geohashSet));
    topLevelGeohashes.forEach(geohash => {
      if (!pinned.has(geohash)) {
        geohashSet.add(geohash);
      }
    });

    const sortByLength = (channelList: string[]) => {
      return channelList.sort((a, b) => {
        const lengthDiff = a.length - b.length;
        if (lengthDiff !== 0) return lengthDiff;
        return a.localeCompare(b);
      });
    };

    return {
      pinned: sortByLength(pinnedChannels),
      geohash: sortByLength(Array.from(geohashSet)),
      standard: sortByLength(Array.from(standardSet))
    };
  }, [generateTopLevelGeohashes]);

  // Effect to update country categorization when needed
  useEffect(() => {
    if (viewMode === 'country') {
      categorizeChannelsByCountry(channels)
        .then(setCountryCategorized)
        .catch(error => {
          console.error('Failed to categorize channels by country:', error);
          setCountryCategorized(null);
        });
    }
  }, [viewMode, channels, pinnedChannels, categorizeChannelsByCountry]);

  const categorized = useMemo(() => 
    categorizeChannelsByEventKind(channels, pinnedChannels),
    [categorizeChannelsByEventKind, channels, pinnedChannels]
  );

  return {
    viewMode,
    setViewMode,
    categorized,
    countryCategorized,
  };
}
