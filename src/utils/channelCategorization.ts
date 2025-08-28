import { EVENT_KINDS } from "../constants/eventKinds";

// Regex for valid geohash characters (same as used in the app)
const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/;

export interface ChannelCategory {
  type: 'pinned' | 'geohash' | 'standard';
  channels: string[];
}

export interface CategorizedChannels {
  pinned: string[];
  geohash: string[];
  standard: string[];
}

export function isValidGeohash(channelKey: string): boolean {
  return VALID_GEOHASH_CHARS.test(channelKey);
}

export function categorizeChannels(
  allChannels: string[],
  pinnedChannels: string[]
): CategorizedChannels {
  const pinned = new Set(pinnedChannels);
  const geohash: string[] = [];
  const standard: string[] = [];

  allChannels.forEach(channel => {
    if (pinned.has(channel)) {
      // Pinned channels go in their own section
      return;
    }
    
    if (isValidGeohash(channel)) {
      geohash.push(channel);
    } else {
      standard.push(channel);
    }
  });

  return {
    pinned: pinnedChannels,
    geohash,
    standard
  };
}

export function getEventKindForChannel(channelKey: string): number {
  if (isValidGeohash(channelKey)) {
    return EVENT_KINDS.GEO_CHANNEL; // Geo-based channels
  } else {
    return EVENT_KINDS.STANDARD_CHANNEL; // Standard channels
  }
}
