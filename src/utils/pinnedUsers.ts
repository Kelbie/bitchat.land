const PINNED_USERS_KEY = 'pinned_users';

export interface PinnedUser {
  pubkey: string;
  pinnedAt: number;
}

export function getPinnedUsers(): PinnedUser[] {
  try {
    const stored = localStorage.getItem(PINNED_USERS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addPinnedUser(pubkey: string): void {
  try {
    const pinned = getPinnedUsers();
    const exists = pinned.find(p => p.pubkey === pubkey);
    
    if (!exists) {
      pinned.push({
        pubkey,
        pinnedAt: Date.now()
      });
      localStorage.setItem(PINNED_USERS_KEY, JSON.stringify(pinned));
    }
  } catch (error) {
    console.error('Failed to add pinned user:', error);
  }
}

export function removePinnedUser(pubkey: string): void {
  try {
    const pinned = getPinnedUsers();
    const filtered = pinned.filter(p => p.pubkey !== pubkey);
    localStorage.setItem(PINNED_USERS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove pinned user:', error);
  }
}

export function isUserPinned(pubkey: string): boolean {
  const pinned = getPinnedUsers();
  return pinned.some(p => p.pubkey === pubkey);
}
