import React, { useMemo } from "react";
import { VirtualizedScroller } from "@/components/features/chat/components/VirtualizedScroller";
import { globalStyles } from "@/styles";

export type ListItem<T> = {
  key: string;
  data: T;
  sectionTitle?: string;
  category?: string;
};

export type SectionInfo = {
  title: string;
  index: number;
};

export type ListProps<T> = {
  items: ListItem<T>[];
  sections?: SectionInfo[];
  renderItem: (item: T, index: number) => React.ReactNode;
  renderSectionHeader: (title: string) => React.ReactNode;
  headerTitle: string | React.ReactNode;
  theme: "matrix" | "material";
  emptyMessage: string;
  estimateItemSize?: number;
  overscan?: number;
  className?: string;
  borderDirection?: "left" | "right";
  resetKey?: string | number;
  debug?: boolean;
};

type VirtualizedItem<T> = 
  | { type: 'section'; title: string; key: string }
  | { type: 'item'; item: ListItem<T>; key: string; originalIndex: number };

export function List<T>({
  items,
  sections = [],
  renderItem,
  renderSectionHeader,
  headerTitle,
  theme,
  emptyMessage,
  estimateItemSize = 50,
  overscan = 5,
  className,
  borderDirection = "right",
  resetKey,
  debug = false,
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

  // Merge items and section headers into a single flat list
  const virtualizedItems = useMemo<VirtualizedItem<T>[]>(() => {
    if (sections.length === 0) {
      return items.map((item, idx) => ({ 
        type: 'item' as const, 
        item, 
        key: item.key,
        originalIndex: idx 
      }));
    }

    const result: VirtualizedItem<T>[] = [];
    let itemIndex = 0;
    let sectionIndex = 0;

    while (itemIndex < items.length || sectionIndex < sections.length) {
      // Check if we need to insert a section header
      if (sectionIndex < sections.length && sections[sectionIndex].index === itemIndex) {
        result.push({
          type: 'section',
          title: sections[sectionIndex].title,
          key: `section-${sectionIndex}-${sections[sectionIndex].title}`
        });
        sectionIndex++;
      } else {
        // Add the next item
        result.push({
          type: 'item',
          item: items[itemIndex],
          key: items[itemIndex].key,
          originalIndex: itemIndex
        });
        itemIndex++;
      }
    }

    return result;
  }, [items, sections]);

  // Log debug info
  if (debug) {
    console.log('=== List Debug Info ===');
    console.log('Total virtualized items:', virtualizedItems.length);
    
    // Check for duplicate keys
    const keySet = new Set<string>();
    const duplicates: string[] = [];
    virtualizedItems.forEach(v => {
      if (keySet.has(v.key)) {
        duplicates.push(v.key);
      }
      keySet.add(v.key);
    });
    if (duplicates.length > 0) {
      console.error('⚠️ DUPLICATE KEYS FOUND:', duplicates);
    }
  }

  return (
    <div className={`${t.rail} ${className || ""}`}>
      <div className={t.header}>
        <div className={t.headerText}>{headerTitle}</div>
      </div>
      <div className={`${t.list} flex-1 min-h-0`}>
        <div className="h-full px-2 py-2">
          {items.length === 0 ? (
            <div className={t.empty}>{emptyMessage}</div>
          ) : (
            <VirtualizedScroller<VirtualizedItem<T>>
              items={virtualizedItems}
              estimatedItemSize={estimateItemSize}
              overscan={overscan}
              className="h-full"
              maintainScrollPosition={false}
              scrollToBottomOnNewItems={false}
              resetKey={resetKey}
              keyExtractor={(item) => item.key}
              getItemType={(item) => item.type}
              getEstimatedItemSize={(_index, _item, type) => {
                // Include the py-1 padding (0.25rem = 4px top + 4px bottom = 8px)
                return type === 'section' ? 38 : (estimateItemSize + 8);
              }}
              enableAverages={true}
              recycleItems={true}
              renderItem={(virtualItem) => {
                if (virtualItem.type === 'section') {
                  return (
                    <>
                      {debug && (
                        <div className="text-xs text-red-500 font-mono mb-1">
                          🔑 {virtualItem.key}
                        </div>
                      )}
                      <div className="py-1">
                        {renderSectionHeader(virtualItem.title)}
                      </div>
                    </>
                  );
                }
                
                return (
                  <>
                    {debug && (
                      <div className="text-xs text-blue-500 font-mono mb-1">
                        🔑 {virtualItem.key} (idx: {virtualItem.originalIndex})
                      </div>
                    )}
                    <div className="py-1">
                      {renderItem(virtualItem.item.data as T, virtualItem.originalIndex)}
                    </div>
                  </>
                );
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}