import { useMemo } from "react";
import { UserMeta, StoredEvent } from "@/types/filter";

export function useUserFiltering(users: UserMeta[], searchText: string, filteredEvents: StoredEvent[]) {
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
        if (!filteredEvents || filteredEvents.length === 0) {
          return false;
        }
        
        // Look through all events to see if this user posted in the target channel
        for (const ev of filteredEvents) {
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
  }, [users, searchText, filteredEvents]);

  return {
    filteredUsers,
  };
}
