import React, { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { colorForPeerSeed } from "../../utils/userColor";
import { truncate } from "../map/Connections";

type UserMeta = {
  pubkey: string;
  displayName: string;
  isPinned: boolean;
  hasMessages: boolean;
  eventKind: number;
  lastSeen: number;
  messageCount: number;
};

type Props = {
  users: UserMeta[];
  selectedUser: string | null;
  onSelectUser: (pubkey: string) => void;
  searchText: string; // Add search text for filtering
  allStoredEvents: any[]; // Add events to filter by channel
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
  
  // Get user color based on pubkey
  const userColor = colorForPeerSeed(user.pubkey, isDark);
  
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
          style={{ color: colorForPeerSeed('nostr:'+ user.pubkey, isDark).hex }}
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

const styles = {
  matrix: {
    rail:
      "w-48 min-w-[192px] border-l border-[#003300] bg-black/90 text-[#00ff00] flex flex-col overflow-hidden",
    header:
      "bg-black/98 text-[#00aa00] px-3 py-3 border-b border-[#003300] sticky top-0 z-20",
    headerText:
      "text-[16px] uppercase tracking-wider font-mono drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]",
    sectionHeader:
      "bg-black/95 text-[#00aa00] px-3 py-2 border-b border-[#003300] text-xs uppercase tracking-wider font-mono",
    list: "overflow-y-auto px-2 py-2 flex-1",
    empty: "text-[10px] opacity-70 px-2 py-1",
    buttonBase:
      "w-full text-left rounded px-2 py-2 text-sm mb-2 flex items-center justify-between gap-2 transition",
    selected:
      "border bg-[#00ff00]/10 border-[#00ff00] text-[#00ff00] font-bold shadow-inner shadow-[#00ff00]/15",
    hover: "hover:bg-[#00ff00]/10 hover:border-[#00ff00]",
    userInfo: "flex-1",
    userName: "break-words font-medium",
    userDetails: "text-[10px] opacity-60 font-mono",
    messageCount: "text-xs text-blue-400",
    lastSeen: "text-[10px] opacity-50",
  },
  material: {
    rail:
      "w-48 min-w-[192px] border-l border-gray-300 bg-white text-gray-800 flex flex-col overflow-hidden",
    header:
      "bg-white text-blue-600 px-4 py-3 border-b border-blue-200 sticky top-0 z-20",
    headerText: "text-base uppercase tracking-wider",
    sectionHeader:
      "bg-gray-50 text-gray-600 px-3 py-2 border-b border-gray-200 text-xs uppercase tracking-wider font-medium",
    list: "overflow-y-auto px-2 py-2 flex-1",
    empty: "text-xs text-gray-500 px-2 py-1",
    buttonBase:
      "w-full text-left border rounded px-2 py-2 text-sm mb-2 flex items-center justify-between gap-2 transition",
    selected: "bg-blue-100 border-blue-500 text-blue-700 font-bold",
    hover: "hover:bg-blue-50 hover:border-blue-500",
    userInfo: "flex-1",
    userName: "break-words font-medium",
    userDetails: "text-[10px] opacity-60 font-mono",
    messageCount: "text-xs text-blue-600",
    lastSeen: "text-[10px] opacity-50",
  },
} as const;

export function UserList({
  users,
  selectedUser,
  onSelectUser,
  searchText,
  allStoredEvents,
  theme = "matrix",
}: Props) {
  const t = styles[theme];
  const parentRef = useRef<HTMLDivElement>(null);

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
            const g = ev.tags.find((t: any) => t[0] === "g");
            const d = ev.tags.find((t: any) => t[0] === "d");
            const gv = g && typeof g[1] === "string" ? g[1].toLowerCase() : "";
            const dv = d && typeof d[1] === "string" ? d[1].toLowerCase() : "";
            
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

  // TanStack Virtual setup
  const virtualizer = useVirtualizer({
    count: filteredUsers.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 45, // Estimate height for user buttons (more compact layout)
    overscan: 5,
    getItemKey: (index) => filteredUsers[index]?.pubkey || index,
  });

  const items = virtualizer.getVirtualItems();

  return (
    <div className={t.rail}>
      <div className={t.header}>
        <div className={t.headerText}>USERS</div>
      </div>
      
      {/* CHANGED: the list itself is the only scroll container */}
      <div className={t.list} ref={parentRef}>
        {filteredUsers.length === 0 ? (
          <div className={t.empty}>
            {!searchText ? "select a channel to see users" : "no users found"}
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {items.map((virtualItem) => {
              const user = filteredUsers[virtualItem.index];
              if (!user) return null;

              return (
                <div
                  key={virtualItem.key}
                  data-index={virtualItem.index}
                  ref={virtualizer.measureElement}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <div className="px-2 py-1">
                    <UserItem
                      user={user}
                      isSelected={selectedUser === user.pubkey}
                      onSelectUser={onSelectUser}
                      theme={theme}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export type { UserMeta };
