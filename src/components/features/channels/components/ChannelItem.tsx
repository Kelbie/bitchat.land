import React from "react";
import { ChannelItemProps } from "@/types/app";
import { HStack, VStack } from "@/components/ui/layout/Layout";
import { cn } from "@/lib/utils";
import { cva } from "class-variance-authority";
import { EVENT_KINDS } from "@/constants/eventKinds";

const variants = cva("", {
  variants: {
    type: {
      button:
        "flex items-center justify-between w-full p-2 rounded cursor-pointer transition-colors",
      channelInfo: "flex items-start gap-2 flex-1 min-w-0",
      channelName: "font-medium truncate",
      eventKind: "text-xs px-1.5 py-0.5 rounded bg-opacity-20",
      unreadContainer: "flex items-center gap-1",
      unreadDot: "w-2 h-2 rounded-full",
      unreadCount: "text-xs font-medium",
      heartButton: "p-1 rounded transition-colors",
      heartIcon: "",
      heartIconPinned: "",
    },
    theme: {
      matrix: "",
      material: "",
    },
    category: {
      pinned: "",
      geohash: "",
      standard: "",
      country: "",
    },
    isSelected: {
      true: "",
      false: "",
    },
    isPinned: {
      true: "",
      false: "",
    },
  },
  compoundVariants: [
    // Button variants
    {
      type: "button",
      theme: "matrix",
      category: "pinned",
      isSelected: false,
      className: "hover:bg-green-400/10",
    },
    {
      type: "button",
      theme: "material",
      category: "pinned",
      isSelected: false,
      className: "hover:bg-blue-50",
    },
    {
      type: "button",
      theme: "matrix",
      category: "geohash",
      isSelected: false,
      className: "hover:bg-green-400/10",
    },
    {
      type: "button",
      theme: "material",
      category: "geohash",
      isSelected: false,
      className: "hover:bg-blue-50",
    },
    {
      type: "button",
      theme: "matrix",
      category: "country",
      isSelected: false,
      className: "hover:bg-green-400/10",
    },
    {
      type: "button",
      theme: "material",
      category: "country",
      isSelected: false,
      className: "hover:bg-blue-50",
    },
    {
      type: "button",
      theme: "matrix",
      category: "standard",
      isSelected: false,
      className: "hover:bg-green-400/10",
    },
    {
      type: "button",
      theme: "material",
      category: "standard",
      isSelected: false,
      className: "hover:bg-gray-100",
    },

    // Selected states
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

    // Pinned states
    {
      type: "button",
      theme: "matrix",
      category: "pinned",
      isSelected: false,
      className: "bg-green-400/10",
    },
    {
      type: "button",
      theme: "material",
      category: "pinned",
      isSelected: false,
      className: "bg-blue-50",
    },

    // Channel name colors
    { type: "channelName", theme: "matrix", className: "text-green-400" },
    { type: "channelName", theme: "material", className: "text-gray-900" },

    // Event kind labels
    {
      type: "eventKind",
      theme: "matrix",
      className: "bg-gray-900 text-green-400",
    },
    {
      type: "eventKind",
      theme: "material",
      className: "bg-blue-100 text-blue-600",
    },

    // Unread indicators
    { type: "unreadDot", theme: "matrix", className: "bg-red-400" },
    { type: "unreadDot", theme: "material", className: "bg-red-500" },
    { type: "unreadCount", theme: "matrix", className: "text-red-400" },
    { type: "unreadCount", theme: "material", className: "text-red-600" },

    // Heart button
    {
      type: "heartButton",
      theme: "matrix",
      isPinned: false,
      className: "text-green-400/70 hover:text-green-400",
    },
    {
      type: "heartButton",
      theme: "matrix",
      isPinned: true,
      className: "text-green-400",
    },
    {
      type: "heartButton",
      theme: "material",
      isPinned: false,
      className: "text-gray-500 hover:text-gray-700",
    },
    {
      type: "heartButton",
      theme: "material",
      isPinned: true,
      className: "text-blue-600",
    },
  ],
});

export const ChannelItem = React.memo(
  ({
    channelKey,
    category,
    isSelected,
    unread,
    isPinned,
    onOpenChannel,
    onHeartClick,
    theme,
    eventKind,
  }: ChannelItemProps) => {
    const showUnread = unread > 0 && !isSelected;

    // Get event kind label for pinned channels
    const getEventKindLabel = () => {
      if (!eventKind) return null;
      if (eventKind === EVENT_KINDS.GEO_CHANNEL) return "GEO";
      if (eventKind === EVENT_KINDS.STANDARD_CHANNEL) return "STD";
      return null;
    };

    const eventKindLabel = getEventKindLabel();

    return (
      <div
        role="button"
        tabIndex={0}
        onClick={() => onOpenChannel(channelKey)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onOpenChannel(channelKey);
        }}
        className={cn(
          variants({
            type: "button",
            theme,
            category: isPinned ? "pinned" : category,
            isSelected,
          })
        )}
      >
        <VStack className={cn(variants({ type: "channelInfo" }))}>
          <HStack gap="3" align="center">
            <div className={cn(variants({ type: "channelName", theme }))}>
              {channelKey}
            </div>
            {showUnread && (
              <div className={cn(variants({ type: "unreadContainer" }))}>
                <div className={cn(variants({ type: "unreadDot", theme }))} />
                <span className={cn(variants({ type: "unreadCount", theme }))}>
                  {unread}
                </span>
              </div>
            )}
          </HStack>
          {isPinned && eventKindLabel && (
            <div className={cn(variants({ type: "eventKind", theme }))}>
              {eventKindLabel}
            </div>
          )}
        </VStack>

        <HStack gap="2" align="center">
          <button
            type="button"
            onClick={(e) => onHeartClick(e, channelKey)}
            className={cn(
              variants({
                type: "heartButton",
                theme,
                isPinned,
              })
            )}
            title={isPinned ? "Unpin channel" : "Pin channel"}
          >
            {isPinned ? "❤️" : "🤍"}
          </button>
        </HStack>
      </div>
    );
  }
);

ChannelItem.displayName = "ChannelItem";
