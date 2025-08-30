import React from "react";
import { globalStyles } from "../../styles";

interface HierarchyItemProps {
  geohash: string;
  count: number;
  location?: string;
  depth?: number;
  onClick: () => void;
  theme?: "matrix" | "material";
}

  const styles = globalStyles["HierarchyItem"];

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

