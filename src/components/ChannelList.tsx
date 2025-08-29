import React, { useState, useEffect, useRef, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getPinnedChannels, addPinnedChannel, removePinnedChannel } from "../utils/pinnedChannels";
import { EVENT_KINDS } from "../constants/eventKinds";

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

// Section header component
type SectionHeaderProps = {
  title: string;
  theme: "matrix" | "material";
};

const SectionHeader = React.memo(({ title, theme }: SectionHeaderProps) => {
  const t = styles[theme];
  return (
    <div className={t.sectionHeader}>
      {title}
    </div>
  );
});

SectionHeader.displayName = 'SectionHeader';

const styles = {
  matrix: {
    rail:
      "w-48 min-w-[192px] border-r border-[#003300] bg-black/90 text-[#00ff00] flex flex-col overflow-hidden",
    header:
      "bg-black/98 text-[#00aa00] px-3 py-3 border-b border-[#003300] sticky top-0 z-20",
    headerText:
      "text-[16px] uppercase tracking-wider font-mono drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]",
    sectionHeader:
      "bg-black/95 text-[#00aa00] px-3 py-2 border-b border-[#003300] text-xs uppercase tracking-wider font-mono",
    list: "overflow-y-auto px-2 py-2 flex-1",
    empty: "text-[10px] opacity-70 px-2 py-1",
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
    rail:
      "w-48 min-w-[192px] border-r border-gray-300 bg-white text-gray-800 flex flex-col overflow-hidden",
    header:
      "bg-gray-100 text-gray-700 px-3 py-3 border-b border-gray-300 sticky top-0 z-20",
    headerText: "text-sm font-medium uppercase tracking-wider",
    sectionHeader:
      "bg-gray-50 text-gray-600 px-3 py-2 border-b border-gray-200 text-xs uppercase tracking-wider font-medium",
    list: "overflow-y-auto px-2 py-2 flex-1",
    empty: "text-xs text-gray-500 px-2 py-1",
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
  const t = styles[theme];
  const [internalPinnedChannels, setInternalPinnedChannels] = useState<string[]>([]);
  const parentRef = useRef<HTMLDivElement>(null);

  // Use external pinnedChannels if provided, otherwise use internal state
  const pinnedChannels = externalPinnedChannels || internalPinnedChannels;
  
  const updatePinnedChannels = (newPinnedChannels: string[]) => {
    if (onPinnedChannelsChange) {
      onPinnedChannelsChange(newPinnedChannels);
    } else {
      setInternalPinnedChannels(newPinnedChannels);
    }
  };

  // Load pinned channels from localStorage on mount
  useEffect(() => {
    const pinned = getPinnedChannels();
    updatePinnedChannels(pinned.map(p => p.key));
  }, []);

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
  const virtualizedChannels = useMemo(() => {
    const result: Array<{
      key: string;
      category: 'pinned' | 'geohash' | 'standard';
      isSectionHeader: boolean;
      sectionTitle?: string;
    }> = [];

    // Add pinned section
    if (categorized.pinned.length > 0) {
      result.push({ key: 'pinned-header', category: 'pinned', isSectionHeader: true, sectionTitle: 'PINNED' });
      categorized.pinned.forEach(channelKey => {
        result.push({ key: channelKey, category: 'pinned', isSectionHeader: false });
      });
    }

    // Add standard section (before geohash since there are usually fewer)
    if (categorized.standard.length > 0) {
      result.push({ key: 'standard-header', category: 'standard', isSectionHeader: true, sectionTitle: 'STANDARD' });
      categorized.standard.forEach(channelKey => {
        result.push({ key: channelKey, category: 'standard', isSectionHeader: false });
      });
    }

    // Add geohash section
    if (categorized.geohash.length > 0) {
      result.push({ key: 'geohash-header', category: 'geohash', isSectionHeader: true, sectionTitle: 'GEOHASH' });
      categorized.geohash.forEach(channelKey => {
        result.push({ key: channelKey, category: 'geohash', isSectionHeader: false });
      });
    }

    return result;
  }, [categorized, selectedChannel]);

  // TanStack Virtual setup
  const virtualizer = useVirtualizer({
    count: virtualizedChannels.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 50, // Estimate height for channel buttons
    overscan: 5,
    getItemKey: (index) => virtualizedChannels[index]?.key || index,
  });

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

  const items = virtualizer.getVirtualItems();

  return (
    <div className={t.rail}>
      <div className={t.header}>
        <div className={t.headerText}>CHANNELS</div>
      </div>
      
      {/* CHANGED: the list itself is the only scroll container */}
      <div className={t.list} ref={parentRef}>
        {virtualizedChannels.length === 0 ? (
          <div className={t.empty}>no channels</div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {items.map((virtualItem) => {
              const item = virtualizedChannels[virtualItem.index];
              if (!item) return null;

              if (item.isSectionHeader) {
                return (
                  <div
                    key={virtualItem.key}
                    data-index={virtualItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <div className="px-2 py-1">
                      <SectionHeader title={item.sectionTitle!} theme={theme} />
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div className="px-2 py-1">
                    <ChannelItem
                      channelKey={item.key}
                      category={item.category}
                      isSelected={selectedChannel === item.key}
                      unread={unreadCounts[item.key] || 0}
                      isPinned={pinnedChannels.includes(item.key)}
                      onOpenChannel={onOpenChannel}
                      onHeartClick={handleHeartClick}
                      theme={theme}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export type { ChannelMeta };

