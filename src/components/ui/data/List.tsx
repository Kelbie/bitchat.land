import React, { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { globalStyles } from "@/styles";

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
  headerTitle: string | React.ReactNode;
  theme: "matrix" | "material";
  emptyMessage: string;
  estimateItemSize?: number;
  overscan?: number;
  className?: string;
  borderDirection?: "left" | "right";
};

// Styles are now imported from globalStyles

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
  const styles = globalStyles.List[theme];
  const borderStyle = borderDirection === "left" ? styles.borderLeft : styles.borderRight;
  const t = {
    rail: `${styles.base} ${borderStyle}`,
    header: styles.header,
    headerText: styles.headerText,
    list: styles.list,
    empty: styles.empty,
  };
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
