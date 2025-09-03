import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getPinnedChannels, addPinnedChannel, removePinnedChannel } from "../../utils/pinnedChannels";
import { EVENT_KINDS } from "../../constants/eventKinds";
import { List, ListItem } from "../common/List";
import { SectionHeader } from "../common/SectionHeader";
import { globalStyles } from "../../styles";
import { CountryService } from "../../services/countryService";
import { GeohashService } from "../../services/geohashService";
import { CountryInRegion } from "../../types/radio";

type ChannelMeta = {
  key: string;
  isPinned: boolean;
  hasMessages: boolean;
  eventKind: number;
};

type Props = {
  channels: ChannelMeta[];
  selectedChannel: string;
  unreadCounts: Record<string, number>;
  onOpenChannel: (ch: string) => void;
  theme?: "matrix" | "material";
  pinnedChannels?: string[];
  onPinnedChannelsChange?: (pinnedChannels: string[]) => void;
};

// Separate ChannelItem component
type ChannelItemProps = {
  channelKey: string;
  category: 'pinned' | 'geohash' | 'standard' | 'country';
  isSelected: boolean;
  unread: number;
  isPinned: boolean;
  onOpenChannel: (channelKey: string) => void;
  onHeartClick: (e: React.MouseEvent, channelKey: string) => void;
  theme: "matrix" | "material";
  eventKind?: number; // Add eventKind for pinned channels
};

const ChannelItem = React.memo(({
  channelKey,
  category,
  isSelected,
  unread,
  isPinned,
  onOpenChannel,
  onHeartClick,
  theme,
  eventKind
}: ChannelItemProps) => {
  const t = styles[theme];
  const showUnread = unread > 0 && !isSelected;

  let buttonClass = t.buttonBase;
  if (isSelected) {
    buttonClass += ` ${t.selected}`;
  } else if (category === 'pinned') {
    buttonClass += ` ${t.pinned}`;
  } else if (category === 'geohash' || category === 'country') {
    buttonClass += ` ${t.geohash}`;
  } else {
    buttonClass += ` ${t.standard}`;
  }
  
  if (!isSelected) {
    buttonClass += ` ${t.hover}`;
  }

  // Get event kind label for pinned channels
  const getEventKindLabel = () => {
    if (!eventKind) return null;
    if (eventKind === EVENT_KINDS.GEO_CHANNEL) return 'GEO';
    if (eventKind === EVENT_KINDS.STANDARD_CHANNEL) return 'STD';
    return null;
  };

  const eventKindLabel = getEventKindLabel();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpenChannel(channelKey)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onOpenChannel(channelKey);
      }}
      className={buttonClass}
    >
      <div className={t.channelInfo}>
        <div className={t.channelName}>
          {channelKey}
        </div>
        {isPinned && eventKindLabel && (
          <div className={t.eventKind}>
            {eventKindLabel}
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {showUnread && (
          <span className={t.unreadContainer}>
            <span className={t.unreadDot} />
            <span className={t.unreadCount}>{unread}</span>
          </span>
        )}
        
        <button
          type="button"
          onClick={(e) => onHeartClick(e, channelKey)}
          className={`${t.heartButton} ${
            isPinned ? t.heartIconPinned : t.heartIcon
          } cursor-pointer`}
          title={isPinned ? "Unpin channel" : "Pin channel"}
        >
          {isPinned ? "❤️" : "🤍"}
        </button>
      </div>
    </div>
  );
});

ChannelItem.displayName = 'ChannelItem';

const styles = globalStyles["ChannelList"];

export function ChannelList({
  channels,
  selectedChannel,
  unreadCounts,
  onOpenChannel,
  theme = "matrix",
  pinnedChannels: externalPinnedChannels,
  onPinnedChannelsChange,
}: Props) {
  const [internalPinnedChannels, setInternalPinnedChannels] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'geohash' | 'country'>('country');
  const [countryCache, setCountryCache] = useState<Map<string, CountryInRegion[]>>(new Map());

  // Use external pinnedChannels if provided, otherwise use internal state
  const pinnedChannels = externalPinnedChannels || internalPinnedChannels;
  
  const updatePinnedChannels = useCallback((newPinnedChannels: string[]) => {
    if (onPinnedChannelsChange) {
      onPinnedChannelsChange(newPinnedChannels);
    } else {
      setInternalPinnedChannels(newPinnedChannels);
    }
  }, [onPinnedChannelsChange]);

  // Load pinned channels from localStorage on mount
  useEffect(() => {
    const pinned = getPinnedChannels();
    updatePinnedChannels(pinned.map(p => p.key));
  }, [updatePinnedChannels]);

  // Function to get countries for a geohash with caching
  const getCountriesForGeohash = useCallback(async (geohash: string): Promise<CountryInRegion[]> => {
    // Remove # prefix if present
    const cleanGeohash = geohash.startsWith('#') ? geohash.slice(1) : geohash;
    
    // Check cache first
    if (countryCache.has(cleanGeohash)) {
      return countryCache.get(cleanGeohash)!;
    }

    try {
      // Validate geohash
      if (!GeohashService.isValidGeohash(cleanGeohash)) {
        return [];
      }

      // Get geohash info
      const geohashInfo = GeohashService.getGeohashInfo(cleanGeohash);
      
      // Get countries in this geohash
      const countries = await CountryService.getCountriesInGeohash(geohashInfo);
      
      // Cache the result
      setCountryCache(prev => new Map(prev.set(cleanGeohash, countries)));
      
      return countries;
    } catch (error) {
      console.warn(`Failed to get countries for geohash ${cleanGeohash}:`, error);
      return [];
    }
  }, [countryCache]);

  // Generate top-level geohashes based on existing geohash channels
  const generateTopLevelGeohashes = (existingGeohashChannels: string[]) => {
    const topLevelGeohashes = new Set<string>();
    
    // Extract top-level geohashes from existing channels
    existingGeohashChannels.forEach(channel => {
      if (channel.startsWith('#')) {
        const parts = channel.slice(1).split('');
        if (parts.length >= 1) {
          // Add the first character as a top-level geohash
          topLevelGeohashes.add(`#${parts[0]}`);
        }
      }
    });
    
    // Always include all valid geohash alphabet characters for navigation
    // Geohash alphabet: 0123456789bcdefghjkmnpqrstuvwxyz (excludes a, i, l, o)
    const geohashAlphabet = '0123456789bcdefghjkmnpqrstuvwxyz';
    geohashAlphabet.split('').forEach(char => {
      topLevelGeohashes.add(`#${char}`);
    });
    
    return Array.from(topLevelGeohashes).sort();
  };

  // Categorize channels by country (async)
  const categorizeChannelsByCountry = useCallback(async (allChannels: ChannelMeta[]) => {
    const countryGroups = new Map<string, Set<string>>();
    const standardSet = new Set<string>();

    // Process ALL geohash channels (including pinned ones) and group by country
    const geohashChannels = allChannels.filter(channel => 
      channel.eventKind === EVENT_KINDS.GEO_CHANNEL
    );

    // Also process pinned geohash channels from storage that might not be in allChannels
    const pinnedChannelsData = getPinnedChannels();
    const pinnedGeohashChannels = pinnedChannelsData.filter(p => 
      p.eventKind === EVENT_KINDS.GEO_CHANNEL && !geohashChannels.some(ch => ch.key === p.key)
    );

    // Combine all geohash channels
    const allGeohashChannels = [
      ...geohashChannels,
      ...pinnedGeohashChannels.map(p => ({ key: p.key, eventKind: p.eventKind, isPinned: true, hasMessages: false }))
    ];

    // Get countries for all geohash channels (pinned and unpinned)
    for (const channel of allGeohashChannels) {
      try {
        const countries = await getCountriesForGeohash(channel.key);
        
        if (countries.length === 0) {
          // If no countries found, add to a special "Unknown" group
          if (!countryGroups.has('Unknown')) {
            countryGroups.set('Unknown', new Set());
          }
          countryGroups.get('Unknown')!.add(channel.key);
        } else {
          // Add channel to each country it belongs to
          countries.forEach(country => {
            // Handle problematic country codes
            let displayName = country.countryName;
            
            // Map problematic country codes to Unknown
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
        // Add to unknown group on error
        if (!countryGroups.has('Unknown')) {
          countryGroups.set('Unknown', new Set());
        }
        countryGroups.get('Unknown')!.add(channel.key);
      }
    }

    // Add standard channels (both pinned and unpinned)
    const standardChannels = allChannels.filter(channel => 
      channel.eventKind === EVENT_KINDS.STANDARD_CHANNEL
    );
    
    // Also add pinned standard channels from storage
    const pinnedStandardChannels = pinnedChannelsData.filter(p => 
      p.eventKind === EVENT_KINDS.STANDARD_CHANNEL && !standardChannels.some(ch => ch.key === p.key)
    );

    [...standardChannels, ...pinnedStandardChannels].forEach(channel => {
      standardSet.add(channel.key);
    });

    // Remove channels from "Unknown" if they appear in proper countries
    if (countryGroups.has('Unknown')) {
      const unknownChannels = countryGroups.get('Unknown')!;
      const channelsInProperCountries = new Set<string>();
      
      // Collect all channels that appear in proper countries
      Array.from(countryGroups.entries()).forEach(([countryName, channelSet]) => {
        if (countryName !== 'Unknown') {
          channelSet.forEach(channel => channelsInProperCountries.add(channel));
        }
      });
      
      // Remove channels from Unknown if they're already in proper countries
      channelsInProperCountries.forEach(channel => {
        unknownChannels.delete(channel);
      });
      
      // If Unknown is now empty, remove it entirely
      if (unknownChannels.size === 0) {
        countryGroups.delete('Unknown');
      }
    }

    // Convert to the expected format and sort
    const sortByLength = (channelList: string[]) => {
      return channelList.sort((a, b) => {
        const lengthDiff = a.length - b.length;
        if (lengthDiff !== 0) return lengthDiff;
        return a.localeCompare(b);
      });
    };

    // Add common countries even if they don't have channels (like top-level geohashes)
    const commonCountries = [
      'United States', 'Canada', 'United Kingdom', 'France', 'Germany', 'Italy', 'Spain', 
      'Japan', 'Australia', 'Brazil', 'China', 'India', 'Russia', 'Netherlands', 
      'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark'
    ];
    
    // Add common countries to the groups if they don't exist
    commonCountries.forEach(countryName => {
      if (!countryGroups.has(countryName)) {
        countryGroups.set(countryName, new Set());
      }
    });

    // Add top-level geohashes based on their actual geographic location
    const geohashAlphabet = '0123456789bcdefghjkmnpqrstuvwxyz';
    
    for (const char of geohashAlphabet) {
      const topLevelGeohash = `#${char}`;
      
      try {
        const countries = await getCountriesForGeohash(topLevelGeohash);
        
        if (countries.length === 0) {
          // If no countries found, add to Unknown
          if (!countryGroups.has('Unknown')) {
            countryGroups.set('Unknown', new Set());
          }
          countryGroups.get('Unknown')!.add(topLevelGeohash);
        } else {
          // Add to each country it belongs to
          let hasValidCountry = false;
          
          countries.forEach(country => {
            // Handle problematic country codes
            const problematicCodes = ['UN', 'XX', 'ZZ', 'AA'];
            const isProblematicCode = problematicCodes.includes(country.countryCode) || country.countryName === country.countryCode;
            
            if (!isProblematicCode) {
              // Add to proper country
              const displayName = country.countryName;
              if (!countryGroups.has(displayName)) {
                countryGroups.set(displayName, new Set());
              }
              countryGroups.get(displayName)!.add(topLevelGeohash);
              hasValidCountry = true;
            }
          });
          
          // Only add to Unknown if ALL countries were problematic
          if (!hasValidCountry) {
            if (!countryGroups.has('Unknown')) {
              countryGroups.set('Unknown', new Set());
            }
            countryGroups.get('Unknown')!.add(topLevelGeohash);
          }
        }
      } catch (error) {
        console.warn(`Failed to categorize top-level geohash ${topLevelGeohash}:`, error);
        // Add to unknown group on error
        if (!countryGroups.has('Unknown')) {
          countryGroups.set('Unknown', new Set());
        }
        countryGroups.get('Unknown')!.add(topLevelGeohash);
      }
    }

    // Convert country groups to sorted arrays
    const countryResult: Record<string, string[]> = {};
    Array.from(countryGroups.entries())
      .sort(([a], [b]) => a.localeCompare(b)) // Sort countries alphabetically
      .forEach(([countryName, channelSet]) => {
        countryResult[countryName] = sortByLength(Array.from(channelSet));
      });

    return {
      pinned: [], // No separate pinned section in country mode - they're integrated into countries
      countries: countryResult,
      standard: sortByLength(Array.from(standardSet))
    };
  }, [getCountriesForGeohash]);

  // Categorize channels based on their actual event kinds
  const categorizeChannelsByEventKind = useCallback((allChannels: ChannelMeta[], pinnedChannels: string[]) => {
    const pinned = new Set(pinnedChannels);
    const geohashSet = new Set<string>();
    const standardSet = new Set<string>();

    allChannels.forEach(channel => {
      // Skip if channel is pinned - it will only appear in pinned section
      if (pinned.has(channel.key)) {
        return;
      }
      
      // Use the actual event kind from the channel meta
      if (channel.eventKind === EVENT_KINDS.GEO_CHANNEL) {
        geohashSet.add(channel.key);
      } else if (channel.eventKind === EVENT_KINDS.STANDARD_CHANNEL) {
        standardSet.add(channel.key);
      }
    });

    // Generate top-level geohashes and add them to the geohash set (no duplicates)
    // Only add top-level geohashes that aren't pinned
    const topLevelGeohashes = generateTopLevelGeohashes(Array.from(geohashSet));
    topLevelGeohashes.forEach(geohash => {
      if (!pinned.has(geohash)) {
        geohashSet.add(geohash);
      }
    });

    // Sort channels by length (shortest first), then alphabetically for same length
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
  }, []);

  // State for country-based categorization
  const [countryCategorized, setCountryCategorized] = useState<{
    pinned: string[];
    countries: Record<string, string[]>;
    standard: string[];
  } | null>(null);

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

  // Create a flat list of all channels with their category info for virtualization
  const virtualizedChannels = useMemo((): ListItem<{ channelKey: string; category: 'pinned' | 'geohash' | 'standard' | 'country'; countryName?: string }>[] => {
    const result: ListItem<{ channelKey: string; category: 'pinned' | 'geohash' | 'standard' | 'country'; countryName?: string }>[] = [];

    if (viewMode === 'country' && countryCategorized) {
      // Country view mode - no separate pinned section since they're integrated into countries

      // Add standard section
      if (countryCategorized.standard.length > 0) {
        result.push({ 
          key: 'standard-header', 
          data: { channelKey: '', category: 'standard' }, 
          isSectionHeader: true, 
          sectionTitle: 'STANDARD' 
        });
        countryCategorized.standard.forEach(channelKey => {
          result.push({ 
            key: channelKey, 
            data: { channelKey, category: 'standard' }, 
            isSectionHeader: false 
          });
        });
      }

      // Add country sections
      Object.entries(countryCategorized.countries).forEach(([countryName, channelKeys]) => {
        if (channelKeys.length > 0) {
          result.push({ 
            key: `country-header-${countryName}`, 
            data: { channelKey: '', category: 'country', countryName }, 
            isSectionHeader: true, 
            sectionTitle: countryName.toUpperCase()
          });
          channelKeys.forEach(channelKey => {
            result.push({ 
              key: `${countryName}-${channelKey}`, // Unique key for country-channel combination
              data: { channelKey, category: 'country', countryName }, 
              isSectionHeader: false 
            });
          });
        }
      });

      return result;
    }

    // Default geohash view mode

    // Add pinned section
    if (categorized.pinned.length > 0) {
      result.push({ 
        key: 'pinned-header', 
        data: { channelKey: '', category: 'pinned' }, 
        isSectionHeader: true, 
        sectionTitle: 'PINNED' 
      });
      categorized.pinned.forEach(channelKey => {
        result.push({ 
          key: channelKey, 
          data: { channelKey, category: 'pinned' }, 
          isSectionHeader: false 
        });
      });
    }

    // Add standard section (before geohash since there are usually fewer)
    if (categorized.standard.length > 0) {
      result.push({ 
        key: 'standard-header', 
        data: { channelKey: '', category: 'standard' }, 
        isSectionHeader: true, 
        sectionTitle: 'STANDARD' 
      });
      categorized.standard.forEach(channelKey => {
        result.push({ 
          key: channelKey, 
          data: { channelKey, category: 'standard' }, 
          isSectionHeader: false 
        });
      });
    }

    // Add geohash section
    if (categorized.geohash.length > 0) {
      result.push({ 
        key: 'geohash-header', 
        data: { channelKey: '', category: 'geohash' }, 
        isSectionHeader: true, 
        sectionTitle: 'GEOHASH' 
      });
      categorized.geohash.forEach(channelKey => {
        result.push({ 
          key: channelKey, 
          data: { channelKey, category: 'geohash' }, 
          isSectionHeader: false 
        });
      });
    }

    return result;
  }, [categorized, viewMode, countryCategorized]);

  const handleHeartClick = (e: React.MouseEvent, channelKey: string) => {
    e.stopPropagation();
    
    if (pinnedChannels.includes(channelKey)) {
      removePinnedChannel(channelKey);
      updatePinnedChannels(pinnedChannels.filter(k => k !== channelKey));
    } else {
      // Find the channel to get its eventKind
      const channel = channels.find(c => c.key === channelKey);
      let eventKind: number;
      
      if (channel) {
        // Real channel - use its actual eventKind
        eventKind = channel.eventKind;
      } else if (channelKey.startsWith('#')) {
        // Geohash channel - determine if it's a valid geohash and treat as GEO_CHANNEL
        const geohashValue = channelKey.slice(1);
        const isValidGeohash = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(geohashValue);
        
        if (isValidGeohash) {
          eventKind = EVENT_KINDS.GEO_CHANNEL;
        } else {
          // Not a valid geohash - treat as standard channel
          eventKind = EVENT_KINDS.STANDARD_CHANNEL;
        }
      } else {
        // Standard channel (doesn't start with #)
        eventKind = EVENT_KINDS.STANDARD_CHANNEL;
      }
      
      addPinnedChannel(channelKey, eventKind);
      updatePinnedChannels([...pinnedChannels, channelKey]);
    }
  };

  const renderChannelItem = (data: { channelKey: string; category: 'pinned' | 'geohash' | 'standard' | 'country'; countryName?: string }) => {
    const channelMeta = channels.find(ch => ch.key === data.channelKey);
    const isChannelPinned = pinnedChannels.includes(data.channelKey);
    
    // For pinned channels, try to get eventKind from pinned channels storage if not in main channels
    let eventKind = channelMeta?.eventKind;
    if (!eventKind && isChannelPinned) {
      const pinnedChannelsData = getPinnedChannels();
      const pinnedChannel = pinnedChannelsData.find(p => p.key === data.channelKey);
      eventKind = pinnedChannel?.eventKind;
    }
    
    // If still no eventKind, determine it based on the channel key and category
    if (!eventKind) {
      if (data.category === 'geohash' || data.category === 'country' || data.channelKey.startsWith('#')) {
        const geohashValue = data.channelKey.slice(1);
        const isValidGeohash = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(geohashValue);
        eventKind = isValidGeohash ? EVENT_KINDS.GEO_CHANNEL : EVENT_KINDS.STANDARD_CHANNEL;
      } else if (data.category === 'standard') {
        eventKind = EVENT_KINDS.STANDARD_CHANNEL;
      } else {
        // Default fallback for pinned channels
        eventKind = data.channelKey.startsWith('#') ? EVENT_KINDS.GEO_CHANNEL : EVENT_KINDS.STANDARD_CHANNEL;
      }
    }
    
    // Debug logging to help identify the selection issue
    const isSelected = selectedChannel === data.channelKey;
    
    // Log all channel keys and selection state for debugging
    console.log(`Channel: "${data.channelKey}" | Category: ${data.category} | Selected: ${isSelected} | selectedChannel: "${selectedChannel}"`);
    
    if (isSelected) {
      console.log('✅ Channel selected:', data.channelKey, 'selectedChannel:', selectedChannel);
    }
    
    return (
      <ChannelItem
        channelKey={data.channelKey}
        category={isChannelPinned ? 'pinned' : data.category}
        isSelected={isSelected}
        unread={unreadCounts[data.channelKey] || 0}
        isPinned={isChannelPinned}
        onOpenChannel={onOpenChannel}
        onHeartClick={handleHeartClick}
        theme={theme}
        eventKind={eventKind}
      />
    );
  };

  const renderChannelSectionHeader = (title: string) => (
    <SectionHeader title={title} theme={theme} />
  );

  // Create custom header content with toggle
  const headerContent = (
    <div className="flex items-center justify-between w-full">
      <span>CHANNELS</span>
      <div className={`flex rounded-md p-1 ${
        theme === "matrix" 
          ? "bg-gray-800 border border-green-400/30" 
          : "bg-white border border-gray-300"
      }`}>
        <button
          onClick={() => setViewMode('geohash')}
          className={`p-1.5 rounded transition-colors ${
            viewMode === 'geohash'
              ? theme === "matrix"
                ? "bg-green-400 text-gray-900"
                : "bg-blue-600 text-white"
              : theme === "matrix"
                ? "text-green-400/70 hover:text-green-400"
                : "text-gray-600 hover:text-gray-900"
          }`}
          title="Geohash view"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.41 21L6.12 17H2.12L2.47 15H6.47L7.53 9H3.53L3.88 7H7.88L8.59 3H10.59L9.88 7H15.88L16.59 3H18.59L17.88 7H21.88L21.53 9H17.53L16.47 15H20.47L20.12 17H16.12L15.41 21H13.41L14.12 17H8.12L7.41 21H5.41ZM9.53 9L8.47 15H14.47L15.53 9H9.53Z"/>
          </svg>
        </button>
        <button
          onClick={() => setViewMode('country')}
          className={`p-1.5 rounded transition-colors ${
            viewMode === 'country'
              ? theme === "matrix"
                ? "bg-green-400 text-gray-900"
                : "bg-blue-600 text-white"
              : theme === "matrix"
                ? "text-green-400/70 hover:text-green-400"
                : "text-gray-600 hover:text-gray-900"
          }`}
          title="Country view"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <List
      items={virtualizedChannels}
      renderItem={renderChannelItem}
      renderSectionHeader={renderChannelSectionHeader}
      headerTitle={headerContent}
      theme={theme}
      emptyMessage={
        viewMode === 'country' && !countryCategorized 
          ? "Loading country data..." 
          : "no channels"
      }
      estimateItemSize={50}
      borderDirection="right"
    />
  );
}

export type { ChannelMeta };

