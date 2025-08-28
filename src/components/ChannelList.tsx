import React, { useState, useEffect } from "react";
import { getPinnedChannels, addPinnedChannel, removePinnedChannel, isChannelPinned } from "../utils/pinnedChannels";
import { categorizeChannels, getEventKindForChannel } from "../utils/channelCategorization";
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
};

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
}: Props) {
  const t = styles[theme];
  const [pinnedChannels, setPinnedChannels] = useState<string[]>([]);

  // Load pinned channels from localStorage on mount
  useEffect(() => {
    const pinned = getPinnedChannels();
    setPinnedChannels(pinned.map(p => p.key));
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

    return {
      pinned: pinnedChannels,
      geohash,
      standard
    };
  };

  const categorized = categorizeChannelsByEventKind(
    channels,
    pinnedChannels
  );

  const handleHeartClick = (e: React.MouseEvent, channelKey: string) => {
    e.stopPropagation();
    
    if (pinnedChannels.includes(channelKey)) {
      removePinnedChannel(channelKey);
      setPinnedChannels(prev => prev.filter(k => k !== channelKey));
    } else {
      addPinnedChannel(channelKey);
      setPinnedChannels(prev => [...prev, channelKey]);
    }
  };

  const renderChannelButton = (channelKey: string, category: 'pinned' | 'geohash' | 'standard') => {
    const isSelected = selectedChannel === channelKey;
    const unread = unreadCounts[channelKey] || 0;
    const showUnread = unread > 0 && !isSelected;
    const isPinned = pinnedChannels.includes(channelKey);
    
    // Find the channel meta to get the actual event kind
    const channelMeta = channels.find(c => c.key === channelKey);
    const eventKind = channelMeta?.eventKind || 23333; // Default to standard if unknown

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
      <button
        key={channelKey}
        onClick={() => onOpenChannel(channelKey)}
        className={buttonClass}
      >
        <div className={t.channelInfo}>
          <div className={t.channelName}>
            {channelKey}
          </div>
          {/* <div className={t.eventKind}>
            kind {eventKind}
          </div> */}
        </div>
        
        <div className="flex items-center gap-2">
          {showUnread && (
            <span className={t.unreadContainer}>
              <span className={t.unreadDot} />
              <span className={t.unreadCount}>{unread}</span>
            </span>
          )}
          
          <div
            onClick={(e) => handleHeartClick(e, channelKey)}
            className={`${t.heartButton} ${
              isPinned ? t.heartIconPinned : t.heartIcon
            } cursor-pointer`}
            title={isPinned ? "Unpin channel" : "Pin channel"}
          >
            {isPinned ? "❤️" : "🤍"}
          </div>
        </div>
      </button>
    );
  };

  const renderSection = (title: string, channels: string[], category: 'pinned' | 'geohash' | 'standard') => {
    if (channels.length === 0) return null;
    
    return (
      <div key={title}>
        <div className={t.sectionHeader}>{title}</div>
        <div className="px-2 py-1">
          {channels.map(channelKey => renderChannelButton(channelKey, category))}
        </div>
      </div>
    );
  };

  return (
    <div className={t.rail}>
      <div className={t.header}>
        <div className={t.headerText}>CHANNELS</div>
      </div>
      <div className={t.list}>
        {renderSection("PINNED", categorized.pinned, 'pinned')}
        {renderSection("GEOHASH", categorized.geohash, 'geohash')}
        {renderSection("STANDARD", categorized.standard, 'standard')}
        
        {categorized.pinned.length === 0 && 
         categorized.geohash.length === 0 && 
         categorized.standard.length === 0 && (
          <div className={t.empty}>no channels</div>
        )}
      </div>
    </div>
  );
}

export type { ChannelMeta };

