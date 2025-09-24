import React from "react";
import { UserItemProps } from "@/types/app";
import { HStack, VStack } from "@/components/ui/layout/Layout";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { colorForPeerSeed } from "@/utils/userColor";
import { truncate } from "@/components/features/map/components/Connections";

const variants = cva("", {
  variants: {
    type: {
      button: "w-full p-2 rounded cursor-pointer transition-colors text-left",
      userInfo: "flex flex-col gap-1",
      userName: "font-medium truncate",
      userDetails: "flex items-center justify-between text-xs opacity-70",
      lastSeen: "text-xs",
      messageCount: "text-xs",
    },
    theme: {
      matrix: "",
      material: "",
    },
    isSelected: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    // Button variants
    {
      type: "button",
      theme: "matrix",
      isSelected: false,
      className: "hover:bg-green-400/10",
    },
    {
      type: "button",
      theme: "material",
      isSelected: false,
      className: "hover:bg-gray-100",
    },
    {
      type: "button",
      theme: "matrix",
      isSelected: true,
      className: "bg-green-400/20 text-green-400",
    },
    {
      type: "button",
      theme: "material",
      isSelected: true,
      className: "bg-blue-50 text-blue-600",
    },
    
    // User name colors
    { type: "userName", theme: "matrix", className: "text-green-400" },
    { type: "userName", theme: "material", className: "text-gray-900" },
    
    // Details colors
    { type: "lastSeen", theme: "matrix", className: "text-green-400/70" },
    { type: "lastSeen", theme: "material", className: "text-gray-500" },
    { type: "messageCount", theme: "matrix", className: "text-green-400/70" },
    { type: "messageCount", theme: "material", className: "text-gray-500" },
  ],
});

export const UserItem = React.memo(({
  user,
  isSelected,
  onSelectUser,
  theme,
}: UserItemProps) => {
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
      onClick={() => onSelectUser(user.pubkey)}
      className={cn(variants({ type: "button", theme, isSelected }))}
    >
      <VStack className={cn(variants({ type: "userInfo" }))}>
        <div 
          className={cn(variants({ type: "userName", theme }))}
          style={{ color: colorForPeerSeed('nostr:'+ user.pubkey.toLowerCase(), isDark).hex }}
        >
          {formattedName}
        </div>
        <HStack justify="between" align="center" className={cn(variants({ type: "userDetails" }))}>
          <span className={cn(variants({ type: "lastSeen", theme }))}>
            {formatLastSeen(user.lastSeen)}
          </span>
          <span className={cn(variants({ type: "messageCount", theme }))}>
            {user.messageCount} msg
          </span>
        </HStack>
      </VStack>
    </button>
  );
});

UserItem.displayName = 'UserItem';
