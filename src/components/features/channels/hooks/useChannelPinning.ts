import { useState, useEffect, useCallback } from "react";
import { getPinnedChannels, addPinnedChannel, removePinnedChannel } from "@/utils/pinnedChannels";
import { EVENT_KINDS } from "@/constants";
import { ChannelMeta } from "@/types/app";

export function useChannelPinning(
  channels: ChannelMeta[],
  externalPinnedChannels?: string[],
  onPinnedChannelsChange?: (pinnedChannels: string[]) => void
) {
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

  const handleHeartClick = useCallback((e: React.MouseEvent, channelKey: string) => {
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
  }, [channels, pinnedChannels, updatePinnedChannels]);

  return {
    pinnedChannels,
    handleHeartClick,
  };
}
