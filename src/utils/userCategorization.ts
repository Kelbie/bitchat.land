import { EVENT_KINDS } from "@/constants/eventKinds";

export interface UserCategory {
  type: 'pinned' | 'geohash' | 'standard';
  users: string[];
}

export interface CategorizedUsers {
  pinned: string[];
  geohash: string[];
  standard: string[];
}

export function categorizeUsersByEventKind(
  allUsers: any[],
  pinnedUsers: string[]
): CategorizedUsers {
  const pinned = new Set(pinnedUsers);
  const geohash: string[] = [];
  const standard: string[] = [];

  allUsers.forEach(user => {
    if (pinned.has(user.pubkey)) {
      // Pinned users go in their own section
      return;
    }
    
    // Use the actual event kind from the user meta
    if (user.eventKind === EVENT_KINDS.GEO_CHANNEL) {
      geohash.push(user.pubkey);
    } else {
      standard.push(user.pubkey);
    }
  });

  return {
    pinned: pinnedUsers,
    geohash,
    standard
  };
}

export function getEventKindForUser(user: any): number {
  return user.eventKind || EVENT_KINDS.STANDARD_CHANNEL;
}
