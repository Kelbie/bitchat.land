import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getPinnedChannels, addPinnedChannel, removePinnedChannel } from "../../utils/pinnedChannels";
import { EVENT_KINDS } from "../../constants/eventKinds";
import { List, ListItem } from "../common/List";
import { SectionHeader } from "../common/SectionHeader";
import { globalStyles } from "../../styles";

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
  category: 'pinned' | 'geohash' | 'standard';
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
  } else if (category === 'geohash') {
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

  // Categorize channels based on their actual event kinds
  const categorizeChannelsByEventKind = useCallback((allChannels: ChannelMeta[], pinnedChannels: string[]) => {
    const pinned = new Set(pinnedChannels);
    const geohashSet = new Set<string>();
    const standardSet = new Set<string>();

    allChannels.forEach(channel => {
      if (pinned.has(channel.key)) {
        // Pinned channels go in their own section - don't add to geo/standard
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
    // Only add top-level geohashes that aren't already pinned
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

  const categorized = useMemo(() => 
    categorizeChannelsByEventKind(channels, pinnedChannels),
    [categorizeChannelsByEventKind, channels, pinnedChannels]
  );

  // Create a flat list of all channels with their category info for virtualization
  const virtualizedChannels = useMemo((): ListItem<{ channelKey: string; category: 'pinned' | 'geohash' | 'standard' }>[] => {
    const result: ListItem<{ channelKey: string; category: 'pinned' | 'geohash' | 'standard' }>[] = [];

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
  }, [categorized]);

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
      } else if (channelKey.startsWith('#') && channelKey.length === 2) {
        // Top-level geohash - treat as GEO_CHANNEL for pinning purposes
        eventKind = EVENT_KINDS.GEO_CHANNEL;
      } else {
        // Unknown channel type - can't pin
        console.warn(`Cannot pin unknown channel type: ${channelKey}`);
        return;
      }
      
      addPinnedChannel(channelKey, eventKind);
      updatePinnedChannels([...pinnedChannels, channelKey]);
    }
  };

  const renderChannelItem = (data: { channelKey: string; category: 'pinned' | 'geohash' | 'standard' }) => {
    const channelMeta = channels.find(ch => ch.key === data.channelKey);
    return (
      <ChannelItem
        channelKey={data.channelKey}
        category={data.category}
        isSelected={selectedChannel === data.channelKey}
        unread={unreadCounts[data.channelKey] || 0}
        isPinned={pinnedChannels.includes(data.channelKey)}
        onOpenChannel={onOpenChannel}
        onHeartClick={handleHeartClick}
        theme={theme}
        eventKind={channelMeta?.eventKind}
      />
    );
  };

  const renderChannelSectionHeader = (title: string) => (
    <SectionHeader title={title} theme={theme} />
  );

  return (
    <List
      items={virtualizedChannels}
      renderItem={renderChannelItem}
      renderSectionHeader={renderChannelSectionHeader}
      headerTitle="CHANNELS"
      theme={theme}
      emptyMessage="no channels"
      estimateItemSize={50}
      borderDirection="right"
    />
  );
}

export type { ChannelMeta };

