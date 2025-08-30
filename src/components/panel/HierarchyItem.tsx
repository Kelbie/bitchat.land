import React from "react";

interface HierarchyItemProps {
  geohash: string;
  count: number;
  location?: string;
  depth?: number;
  onClick: () => void;
  theme?: "matrix" | "material";
}

const styles = {
  matrix: {
    container:
      "mb-3 p-4 cursor-pointer font-mono bg-gradient-to-br from-[#003200]/40 to-[#001400]/20 border border-[#00cc00]/30 border-l-4 border-[#00ff00] rounded hover:from-[#005000]/50 hover:to-[#003000]/30 hover:border-[#00cc00]/60 hover:-translate-y-px transition-all shadow", // using transition
    tag: "text-[#00ff00] font-bold bg-[#00ff00]/10 px-1 rounded text-sm",
    count: "text-[#00aa00] bg-black/50 px-1 rounded text-xs",
    location: "text-[#00dd00] font-sans text-sm",
  },
  material: {
    container:
      "mb-3 p-4 cursor-pointer font-sans bg-white border border-blue-200 border-l-4 border-blue-600 rounded hover:bg-blue-50 hover:border-blue-400 transition-all shadow",
    tag: "text-blue-600 font-bold bg-blue-100 px-1 rounded text-sm",
    count: "text-blue-600 bg-gray-100 px-1 rounded text-xs",
    location: "text-gray-700 font-sans text-sm",
  },
} as const;

export function HierarchyItem({
  geohash,
  count,
  location,
  depth = 0,
  onClick,
  theme = "matrix",
}: HierarchyItemProps) {
  const t = styles[theme];
  return (
    <div
      onClick={onClick}
      className={`${t.container}`}
      style={{ marginLeft: depth * 16 }}
    >
      <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={t.tag}>#{geohash.toUpperCase()}</span>
        </div>
        <span className={t.count}>[{count} events]</span>
      </div>
      {location && <div className={t.location}>{location}</div>}
    </div>
  );
}

