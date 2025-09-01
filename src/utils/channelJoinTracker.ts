const CHANNEL_JOIN_DATES_KEY = 'channelJoinDates';

export interface ChannelJoinDate {
  channelKey: string;
  lastOpened: string; // ISO date string
}

/**
 * Get the date when a channel was last opened
 */
export function getChannelLastOpened(channelKey: string): string | null {
  try {
    const stored = localStorage.getItem(CHANNEL_JOIN_DATES_KEY);
    
    if (!stored) {
      return null;
    }
    
    const dates: Record<string, string> = JSON.parse(stored);
    
    const result = dates[channelKey] || null;
    
    return result;
  } catch (error) {
    console.error('❌ Failed to get channel join date:', error);
    return null;
  }
}

/**
 * Check if this is the first time opening a channel this hour
 */
export function isFirstTimeOpeningThisHour(channelKey: string): boolean {
  const lastOpened = getChannelLastOpened(channelKey);
  
  if (!lastOpened) {
    return true;
  }
  
  const lastDate = new Date(lastOpened);
  const now = new Date();
  
  // Compare hours (ignoring minutes and seconds)
  // Use Math.floor to ensure we're comparing at hour boundaries
  // This fixes the bug where hour rollovers could cause multiple "first time" triggers
  // The previous approach using Date constructor had edge cases around hour boundaries
  const lastHourTimestamp = Math.floor(lastDate.getTime() / (1000 * 60 * 60)) * (1000 * 60 * 60);
  const currentHourTimestamp = Math.floor(now.getTime() / (1000 * 60 * 60)) * (1000 * 60 * 60);
  
  const isFirstTime = lastHourTimestamp !== currentHourTimestamp;
  
  return isFirstTime;
}

/**
 * Mark a channel as opened this hour
 */
export function markChannelOpenedThisHour(channelKey: string): void {
  try {
    const stored = localStorage.getItem(CHANNEL_JOIN_DATES_KEY);
    const dates: Record<string, string> = stored ? JSON.parse(stored) : {};
    
    const now = new Date().toISOString();
    dates[channelKey] = now;
    
    localStorage.setItem(CHANNEL_JOIN_DATES_KEY, JSON.stringify(dates));
  } catch (error) {
    console.warn('Failed to save channel join date:', error);
  }
}

/**
 * Get all channel join dates
 */
export function getAllChannelJoinDates(): Record<string, string> {
  try {
    const stored = localStorage.getItem(CHANNEL_JOIN_DATES_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.warn('Failed to get channel join dates:', error);
    return {};
  }
}
