import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export type ListItem<T> = {
  key: string;
  data: T;
  isSectionHeader: boolean;
  sectionTitle?: string;
  category?: string;
};

export type ListProps<T> = {
  items: ListItem<T>[];
  renderItem: (item: T, index: number) => React.ReactNode;
  renderSectionHeader: (title: string) => React.ReactNode;
  headerTitle: string;
  theme: "matrix" | "material";
  emptyMessage: string;
  estimateItemSize?: number;
  overscan?: number;
  className?: string;
  borderDirection?: "left" | "right";
};

const getRailStyles = (theme: "matrix" | "material", borderDirection: "left" | "right" = "right") => {
  const baseStyles = {
    matrix: {
      base: "w-48 min-w-[192px] bg-black/90 text-[#00ff00] flex flex-col overflow-hidden",
      border: borderDirection === "left" ? "border-l border-[#003300]" : "border-r border-[#003300]",
      header: "bg-black/98 text-[#00aa00] px-3 py-3 border-b border-[#003300] sticky top-0 z-20",
      headerText: "text-[16px] uppercase tracking-wider font-mono drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]",
      list: "overflow-y-auto px-2 py-2 flex-1",
      empty: "text-[10px] opacity-70 px-2 py-1",
    },
    material: {
      base: "w-48 min-w-[192px] bg-white text-gray-800 flex flex-col overflow-hidden",
      border: borderDirection === "left" ? "border-l border-gray-300" : "border-r border-gray-300",
      header: "bg-white text-blue-600 px-4 py-3 border-b border-blue-200 sticky top-0 z-20",
      headerText: "text-base uppercase tracking-wider",
      list: "overflow-y-auto px-2 py-2 flex-1",
      empty: "text-xs text-gray-500 px-2 py-1",
    },
  };
  
  return {
    rail: `${baseStyles[theme].base} ${baseStyles[theme].border}`,
    header: baseStyles[theme].header,
    headerText: baseStyles[theme].headerText,
    list: baseStyles[theme].list,
    empty: baseStyles[theme].empty,
  };
};

export function List<T>({
  items,
  renderItem,
  renderSectionHeader,
  headerTitle,
  theme,
  emptyMessage,
  estimateItemSize = 50,
  overscan = 5,
  className,
  borderDirection = "right",
}: ListProps<T>) {
  const t = getRailStyles(theme, borderDirection);
  const parentRef = useRef<HTMLDivElement>(null);

  // TanStack Virtual setup
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateItemSize,
    overscan,
    getItemKey: (index) => items[index]?.key || index,
  });

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={`${t.rail} ${className || ""}`}>
      <div className={t.header}>
        <div className={t.headerText}>{headerTitle}</div>
      </div>
      
      <div className={t.list} ref={parentRef}>
        {items.length === 0 ? (
          <div className={t.empty}>{emptyMessage}</div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualItems.map((virtualItem) => {
              const item = items[virtualItem.index];
              if (!item) return null;

              if (item.isSectionHeader) {
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
                      {renderSectionHeader(item.sectionTitle!)}
                    </div>
                  </div>
                );
              }

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
                    {renderItem(item.data, virtualItem.index)}
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
