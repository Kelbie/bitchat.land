import { useMemo } from "react";
import { EVENT_KINDS } from "@/constants";
import { List, ListItem } from "@/components/ui/data";
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

