import React from "react";

type ChannelMeta = {
  key: string;
  isPinned: boolean;
  hasMessages: boolean;
};

type Props = {
  channels: ChannelMeta[];
  selectedChannel: string;
  unreadCounts: Record<string, number>;
  onOpenChannel: (ch: string) => void;
  theme?: "matrix" | "material";
};

const styles = {
  matrix: {
    rail:
      "w-40 min-w-[160px] border-r border-[#003300] bg-black/90 text-[#00ff00] flex flex-col overflow-hidden",
    header:
      "bg-black/98 text-[#00aa00] px-3 py-3 border-b border-[#003300] sticky top-0 z-20",
    headerText:
      "text-[16px] uppercase tracking-wider font-mono drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]",
    list: "overflow-y-auto px-2 py-2 flex-1",
    empty: "text-[10px] opacity-70",
    buttonBase:
      "w-full text-left border rounded px-2 py-2 text-sm mb-2 flex items-center justify-between gap-2 transition",
    selected:
      "bg-[#00ff00]/10 border-[#00ff00] text-[#00ff00] font-bold shadow-inner shadow-[#00ff00]/15",
    pinned: "bg-yellow-400/5 border-yellow-400 text-yellow-300",
    hover: "hover:bg-[#00ff00]/10 hover:border-[#00ff00]",
    unreadContainer: "flex items-center gap-1",
    unreadDot:
      "w-2 h-2 rounded-full bg-red-600 shadow-[0_0_6px_rgba(255,0,51,0.6)]",
    unreadCount: "text-xs text-red-500",
  },
  material: {
    rail:
      "w-40 min-w-[160px] border-r border-gray-300 bg-white text-gray-800 flex flex-col overflow-hidden",
    header:
      "bg-gray-100 text-gray-700 px-3 py-3 border-b border-gray-300 sticky top-0 z-20",
    headerText: "text-sm font-medium uppercase tracking-wider",
    list: "overflow-y-auto px-2 py-2 flex-1",
    empty: "text-xs text-gray-500",
    buttonBase:
      "w-full text-left border rounded px-2 py-2 text-sm mb-2 flex items-center justify-between gap-2 transition",
    selected: "bg-blue-100 border-blue-500 text-blue-700 font-bold",
    pinned: "bg-yellow-100 border-yellow-400 text-yellow-800",
    hover: "hover:bg-blue-50 hover:border-blue-500",
    unreadContainer: "flex items-center gap-1",
    unreadDot: "w-2 h-2 rounded-full bg-red-600",
    unreadCount: "text-xs text-red-600",
  },
} as const;

export function ChannelList({
  channels,
  selectedChannel,
  unreadCounts,
  onOpenChannel,
  theme = "matrix",
}: Props) {
  const t = styles[theme];
  return (
    <div className={t.rail}>
      <div className={t.header}>
        <div className={t.headerText}>CHANNELS</div>
      </div>
      <div className={t.list}>
        {channels.length === 0 ? (
          <div className={t.empty}>no channels</div>
        ) : (
          channels.map(({ key: ch, isPinned, hasMessages }) => {
            const isSelected = selectedChannel === ch;
            const unread = unreadCounts[ch] || 0;
            const showUnread = unread > 0 && !isSelected;
            return (
              <button
                key={ch}
                onClick={() => onOpenChannel(ch)}
                className={`${t.buttonBase} ${
                  isSelected ? t.selected : isPinned ? t.pinned : ""
                } ${!isSelected ? t.hover : ""}`}
              >
                <span className={isSelected ? "font-bold" : ""}>
                  {isPinned && "📌 "}
                  {ch}
                  {isPinned && !hasMessages && " (empty)"}
                </span>
                {showUnread && (
                  <span className={t.unreadContainer}>
                    <span className={t.unreadDot} />
                    <span className={t.unreadCount}>{unread}</span>
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

export type { ChannelMeta };

