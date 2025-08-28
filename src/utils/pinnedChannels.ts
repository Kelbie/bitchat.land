const PINNED_CHANNELS_KEY = 'pinned_channels';

export interface PinnedChannel {
  key: string;
  pinnedAt: number;
}

export function getPinnedChannels(): PinnedChannel[] {
  try {
    const stored = localStorage.getItem(PINNED_CHANNELS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addPinnedChannel(channelKey: string): void {
  try {
    const pinned = getPinnedChannels();
    const exists = pinned.find(p => p.key === channelKey);
    
    if (!exists) {
      pinned.push({
        key: channelKey,
        pinnedAt: Date.now()
      });
      localStorage.setItem(PINNED_CHANNELS_KEY, JSON.stringify(pinned));
    }
  } catch (error) {
    console.error('Failed to add pinned channel:', error);
  }
}

export function removePinnedChannel(channelKey: string): void {
  try {
    const pinned = getPinnedChannels();
    const filtered = pinned.filter(p => p.key !== channelKey);
    localStorage.setItem(PINNED_CHANNELS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove pinned channel:', error);
  }
}

export function isChannelPinned(channelKey: string): boolean {
  const pinned = getPinnedChannels();
  return pinned.some(p => p.key === channelKey);
}
