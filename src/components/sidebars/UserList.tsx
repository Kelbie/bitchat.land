import React, { useMemo } from "react";
import { colorForPeerSeed } from "../../utils/userColor";
import { truncate } from "../map/Connections";
import { List, ListItem } from "../common/List";
import { SectionHeader } from "../common/SectionHeader";
import { globalStyles } from "../../styles";

type UserMeta = {
  pubkey: string;
  displayName: string;
  isPinned: boolean;
  hasMessages: boolean;
  eventKind: number;
  lastSeen: number;
  messageCount: number;
};

type StoredEvent = {
  pubkey: string;
  tags: Array<[string, string]>;
};

type Props = {
  users: UserMeta[];
  selectedUser: string | null;
  onSelectUser: (pubkey: string) => void;
  searchText: string; // Add search text for filtering
  allStoredEvents: StoredEvent[]; // Add events to filter by channel
  theme?: "matrix" | "material";
};

// Separate UserItem component
type UserItemProps = {
  user: UserMeta;
  isSelected: boolean;
  onSelectUser: (pubkey: string) => void;
  theme: "matrix" | "material";
};

const UserItem = React.memo(({
  user,
  isSelected,
  onSelectUser,
  theme
}: UserItemProps) => {
  const t = styles[theme];

  let buttonClass = t.buttonBase;
  if (isSelected) {
    buttonClass += ` ${t.selected}`;
  } else {
    buttonClass += ` ${t.hover}`;
  }

  // Determine if we're in dark mode based on theme
  const isDark = theme === "matrix";
  
  // Format display name: name#0000 (last 4 digits of pubkey)
  const displayName = truncate(user.displayName, { length: 9 });
  const pubkeySuffix = user.pubkey.slice(-4);
  const formattedName = `${displayName}#${pubkeySuffix}`;

  const formatLastSeen = (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  };

  return (
    <button
      key={user.pubkey}
      onClick={() => onSelectUser(user.pubkey)}
      className={buttonClass}
    >
      <div className={t.userInfo}>
        <div 
          className={t.userName}
          style={{ color: colorForPeerSeed('nostr:'+ user.pubkey.toLowerCase(), isDark).hex }}
        >
          {formattedName}
        </div>
        <div className="flex items-center justify-between text-xs opacity-70">
          <span className={t.lastSeen}>
            {formatLastSeen(user.lastSeen)}
          </span>
          <span className={t.messageCount}>
            {user.messageCount} msg
          </span>
        </div>
      </div>
    </button>
  );
});

UserItem.displayName = 'UserItem';

const styles = globalStyles["UserList"];

export function UserList({
  users,
  selectedUser,
  onSelectUser,
  searchText,
  allStoredEvents,
  theme = "matrix",
}: Props) {
  // Filter users based on search text
  const filteredUsers = useMemo(() => {
    if (!searchText || !searchText.trim()) {
      return users;
    }
    
    // Check if search contains "in:" syntax for channel filtering
    const inMatch = searchText.match(/in:([^\s]+)/i);
    if (inMatch) {
      const targetChannel = inMatch[1].toLowerCase();
      
      // Filter users to only show those who have posted in the specified channel
      return users.filter(user => {
        // Check if this user has any events in the target channel
        if (!allStoredEvents || allStoredEvents.length === 0) {
          return false;
        }
        
        // Look through all events to see if this user posted in the target channel
        for (const ev of allStoredEvents) {
          if (ev.pubkey === user.pubkey) {
            // Check if this event is in the target channel
            const g = ev.tags.find((t: [string, string]) => t[0] === "g");
            const d = ev.tags.find((t: [string, string]) => t[0] === "d");
            const gv = g ? g[1].toLowerCase() : "";
            const dv = d ? d[1].toLowerCase() : "";
            
            // Check if this event matches the target channel exactly
            if (gv === targetChannel || dv === targetChannel) {
              return true; // This user has posted in the target channel
            }
          }
        }
        
        return false; // User hasn't posted in the target channel
      });
    }
    
    // If no "in:" syntax, show all users
    return users;
  }, [users, searchText, allStoredEvents]);

  // Create list items for the common List component
  const listItems = useMemo((): ListItem<UserMeta>[] => {
    return filteredUsers.map(user => ({
      key: user.pubkey,
      data: user,
      isSectionHeader: false,
    }));
  }, [filteredUsers]);

  const renderUserItem = (user: UserMeta) => (
    <UserItem
      user={user}
      isSelected={selectedUser === user.pubkey}
      onSelectUser={onSelectUser}
      theme={theme}
    />
  );

  const renderUserSectionHeader = (title: string) => (
    <div className="px-2 py-1">
      <SectionHeader title={title} theme={theme} />
    </div>
  );

  return (
    <List
      items={listItems}
      renderItem={renderUserItem}
      renderSectionHeader={renderUserSectionHeader}
      headerTitle="USERS"
      theme={theme}
      emptyMessage={!searchText ? "select a channel to see users" : "no users found"}
      estimateItemSize={45}
      borderDirection="left"
    />
  );
}

export type { UserMeta };
