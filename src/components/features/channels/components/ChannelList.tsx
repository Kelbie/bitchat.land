import { useMemo } from "react";
import { EVENT_KINDS } from "@/constants";
import { List, ListItem, SectionInfo } from "@/components/ui/data";
import { SectionHeader } from "@/components/ui/content";
import { ChannelToggle, ChannelItem } from "@/components/features/channels";
import { useChannelCategorization, useChannelPinning } from "@/components/features/channels/hooks";
import { getPinnedChannels } from "@/utils";
import { ChannelListProps } from "@/types/app";

// Remove old type definitions and styles - now using consolidated types

export function ChannelList({
  channels,
  selectedChannel,
  unreadCounts,
  onOpenChannel,
  theme = "matrix",
  pinnedChannels: externalPinnedChannels,
  onPinnedChannelsChange,
}: ChannelListProps) {
  const { pinnedChannels, handleHeartClick } = useChannelPinning(
    channels,
    externalPinnedChannels,
    onPinnedChannelsChange
  );

  const { viewMode, setViewMode, categorized, countryCategorized } = useChannelCategorization(
    channels,
    pinnedChannels
  );

  // Create a flat list of all channels with their category info for virtualization
  const { virtualizedChannels, sections } = useMemo(() => {
    const result: ListItem<{ channelKey: string; category: 'pinned' | 'geohash' | 'standard' | 'country'; countryName?: string }>[] = [];
    const sectionInfo: SectionInfo[] = [];
    let currentIndex = 0;

    if (viewMode === 'country' && countryCategorized) {
      // Country view mode - no separate pinned section since they're integrated into countries

      // Add standard section
      if (countryCategorized.standard.length > 0) {
        sectionInfo.push({ title: 'STANDARD', index: currentIndex });
        countryCategorized.standard.forEach((channelKey: string, index: number) => {
          result.push({ 
            key: `country-std-${channelKey}-${index}`, 
            data: { channelKey, category: 'standard' }
          });
          currentIndex++;
        });
      }

      // Add country sections
      Object.entries(countryCategorized.countries).forEach(([countryName, channelKeys]) => {
        if (Array.isArray(channelKeys) && channelKeys.length > 0) {
          sectionInfo.push({ title: countryName.toUpperCase(), index: currentIndex });
          channelKeys.forEach((channelKey: string, index: number) => {
            result.push({ 
              key: `country-${countryName}-${channelKey}-${index}`, // Unique key with country, channel, and index
              data: { channelKey, category: 'country', countryName }
            });
            currentIndex++;
          });
        }
      });

      return { virtualizedChannels: result, sections: sectionInfo };
    }

    // Default geohash view mode

    // Add pinned section
    if (categorized.pinned.length > 0) {
      sectionInfo.push({ title: 'PINNED', index: currentIndex });
      categorized.pinned.forEach((channelKey, index) => {
        result.push({ 
          key: `pinned-${channelKey}-${index}`, 
          data: { channelKey, category: 'pinned' }
        });
        currentIndex++;
      });
    }

    // Add standard section (before geohash since there are usually fewer)
    if (categorized.standard.length > 0) {
      sectionInfo.push({ title: 'STANDARD', index: currentIndex });
      categorized.standard.forEach((channelKey, index) => {
        result.push({ 
          key: `std-${channelKey}-${index}`, 
          data: { channelKey, category: 'standard' }
        });
        currentIndex++;
      });
    }

    // Add geohash section
    if (categorized.geohash.length > 0) {
      sectionInfo.push({ title: 'GEOHASH', index: currentIndex });
      categorized.geohash.forEach((channelKey, index) => {
        result.push({ 
          key: `geo-${channelKey}-${index}`, 
          data: { channelKey, category: 'geohash' }
        });
        currentIndex++;
      });
    }

    return { virtualizedChannels: result, sections: sectionInfo };
  }, [categorized, viewMode, countryCategorized]);

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
    
    const isSelected = selectedChannel === data.channelKey;
    
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
      <ChannelToggle
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        theme={theme}
      />
    </div>
  );

  return (
    <List
      items={virtualizedChannels}
      sections={sections}
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
      resetKey={`${selectedChannel}-${viewMode}`}
    />
  );
}

