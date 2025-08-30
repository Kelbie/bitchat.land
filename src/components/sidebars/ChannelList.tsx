import React, { useState, useEffect, useMemo, useCallback } from "react";
import { getPinnedChannels, addPinnedChannel, removePinnedChannel } from "../../utils/pinnedChannels";
import { EVENT_KINDS } from "../../constants/eventKinds";
import { List, ListItem } from "../common/List";
import { SectionHeader } from "../common/SectionHeader";

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
};

const ChannelItem = React.memo(({
  channelKey,
  category,
  isSelected,
  unread,
  isPinned,
  onOpenChannel,
  onHeartClick,
  theme
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

const styles = {
  matrix: {
    buttonBase:
      "w-full text-left rounded px-2 py-2 text-sm mb-2 flex items-center justify-between gap-2 transition",
    selected:
      "border bg-[#00ff00]/10 border-[#00ff00] text-[#00ff00] font-bold shadow-inner shadow-[#00ff00]/15",
    pinned: "bg-yellow-400/5 border-yellow-400 text-yellow-300",
    geohash: "bg-blue-400/5 border-blue-400 text-blue-300",
    standard: "bg-gray-400/5 border-gray-400 text-gray-300",
    hover: "hover:bg-[#00ff00]/10 hover:border-[#00ff00]",
    unreadContainer: "flex items-center gap-1",
    unreadDot:
      "w-2 h-2 rounded-full bg-red-600 shadow-[0_0_6px_rgba(255,0,51,0.6)]",
    unreadCount: "text-xs text-red-500",
    heartButton: "w-5 h-5 flex items-center justify-center transition-all hover:scale-110",
    heartIcon: "text-red-500",
    heartIconPinned: "text-red-400",
    channelInfo: "flex-1",
    channelName: "break-words",
    eventKind: "text-[10px] opacity-60 font-mono",
  },
  material: {
    buttonBase:
      "w-full text-left border rounded px-2 py-2 text-sm mb-2 flex items-center justify-between gap-2 transition",
    selected: "bg-blue-100 border-blue-500 text-blue-700 font-bold",
    pinned: "bg-yellow-100 border-yellow-400 text-yellow-800",
    geohash: "bg-blue-100 border-blue-400 text-blue-700",
    standard: "bg-gray-100 border-gray-400 text-gray-700",
    hover: "hover:bg-blue-50 hover:border-blue-500",
    unreadContainer: "flex items-center gap-1",
    unreadDot: "w-2 h-2 rounded-full bg-red-600",
    unreadCount: "text-xs text-red-600",
    heartButton: "w-5 h-5 flex items-center justify-center transition-all hover:scale-110",
    heartIcon: "text-red-500",
    heartIconPinned: "text-red-400",
    channelInfo: "flex-1",
    channelName: "break-words",
    eventKind: "text-[10px] opacity-60 font-mono",
  },
} as const;

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

  // Categorize channels based on their actual event kinds
  const categorizeChannelsByEventKind = (allChannels: ChannelMeta[], pinnedChannels: string[]) => {
    const pinned = new Set(pinnedChannels);
    const geohash: string[] = [];
    const standard: string[] = [];

    allChannels.forEach(channel => {
      if (pinned.has(channel.key)) {
        // Pinned channels go in their own section
        return;
      }
      
      // Use the actual event kind from the channel meta
      if (channel.eventKind === EVENT_KINDS.GEO_CHANNEL) {
        geohash.push(channel.key);
      } else {
        standard.push(channel.key);
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
      geohash: sortByLength(geohash),
      standard: sortByLength(standard)
    };
  };

  const categorized = useMemo(() => 
    categorizeChannelsByEventKind(channels, pinnedChannels),
    [channels, pinnedChannels]
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
      addPinnedChannel(channelKey);
      updatePinnedChannels([...pinnedChannels, channelKey]);
    }
  };

  const renderChannelItem = (data: { channelKey: string; category: 'pinned' | 'geohash' | 'standard' }) => (
    <ChannelItem
      channelKey={data.channelKey}
      category={data.category}
      isSelected={selectedChannel === data.channelKey}
      unread={unreadCounts[data.channelKey] || 0}
      isPinned={pinnedChannels.includes(data.channelKey)}
      onOpenChannel={onOpenChannel}
      onHeartClick={handleHeartClick}
      theme={theme}
    />
  );

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

