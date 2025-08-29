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
    console.log(`🔍 Getting last opened date for channel: ${channelKey}`);
    console.log(`🔑 Looking for key: ${CHANNEL_JOIN_DATES_KEY}`);
    
    const stored = localStorage.getItem(CHANNEL_JOIN_DATES_KEY);
    console.log(`📦 Raw stored data:`, stored);
    
    if (!stored) {
      console.log(`❌ No stored data found for key: ${CHANNEL_JOIN_DATES_KEY}`);
      return null;
    }
    
    const dates: Record<string, string> = JSON.parse(stored);
    console.log(`📊 Parsed dates object:`, dates);
    console.log(`🔍 Looking for channel key: ${channelKey}`);
    console.log(`📅 Available channel keys:`, Object.keys(dates));
    
    const result = dates[channelKey] || null;
    console.log(`📅 Result for ${channelKey}:`, result);
    
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
  console.log(`🔍 Checking if first time opening ${channelKey} this hour (type: ${typeof channelKey})`);
  const lastOpened = getChannelLastOpened(channelKey);
  console.log(`📅 Last opened: ${lastOpened}`);
  
  if (!lastOpened) {
    console.log(`✅ No previous record found, this is first time`);
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
  console.log(`🕐 Last opened hour timestamp: ${lastHourTimestamp}, Current hour timestamp: ${currentHourTimestamp}`);
  console.log(`🕐 Last opened hour: ${new Date(lastHourTimestamp).toISOString()}, Current hour: ${new Date(currentHourTimestamp).toISOString()}`);
  console.log(`🕐 Is first time this hour: ${isFirstTime}`);
  
  // Additional debugging to help track hour boundary issues
  if (isFirstTime) {
    const timeDiff = now.getTime() - lastDate.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);
    console.log(`🕐 Time difference: ${timeDiff}ms (${hoursDiff.toFixed(2)} hours)`);
  }
  
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
    
    console.log(`💾 Marking channel ${channelKey} as opened at ${now}`);
    console.log(`📊 Current stored dates:`, dates);
    
    localStorage.setItem(CHANNEL_JOIN_DATES_KEY, JSON.stringify(dates));
    console.log(`✅ Successfully saved channel join date for ${channelKey}`);
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

/**
 * Debug function to show current localStorage state
 */
export function debugChannelJoinStorage(): void {
  try {
    console.log(`🔍 === CHANNEL JOIN STORAGE DEBUG ===`);
    console.log(`🔑 Storage key: ${CHANNEL_JOIN_DATES_KEY}`);
    
    const stored = localStorage.getItem(CHANNEL_JOIN_DATES_KEY);
    console.log(`📦 Raw stored data:`, stored);
    
    if (!stored) {
      console.log(`❌ No data stored for key: ${CHANNEL_JOIN_DATES_KEY}`);
      return;
    }
    
    const dates: Record<string, string> = JSON.parse(stored);
    console.log(`📊 Parsed dates object:`, dates);
    console.log(`📅 Total channels stored: ${Object.keys(dates).length}`);
    console.log(`📅 Channel keys:`, Object.keys(dates));
    
    // Show details for each channel
    Object.entries(dates).forEach(([channel, date]) => {
      const dateObj = new Date(date);
      const isToday = dateObj.toDateString() === new Date().toDateString();
      console.log(`  📍 ${channel}: ${date} (today: ${isToday})`);
    });
    
    console.log(`🔍 === END DEBUG ===`);
  } catch (error) {
    console.error('❌ Failed to debug channel join storage:', error);
  }
}
