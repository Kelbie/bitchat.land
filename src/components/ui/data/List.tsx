import React from "react";
import { LegendList } from "@legendapp/list";
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

  return (
    <div className={`${t.rail} ${className || ""}`}>
      <div className={t.header}>
        <div className={t.headerText}>{headerTitle}</div>
      </div>
      <div className={t.list}>
        {items.length === 0 ? (
          <div className={t.empty}>{emptyMessage}</div>
        ) : (
          <LegendList
            data={items}
            // Provide an estimated size for smoother virtualization
            estimatedItemSize={estimateItemSize}
            overscan={overscan}
            keyExtractor={(item) => item.key}
            renderItem={({ item, index }) => (
              item.isSectionHeader ? (
                <div className="px-2 py-1">
                  {renderSectionHeader(item.sectionTitle!)}
                </div>
              ) : (
                <div className="px-2 py-1">
                  {renderItem(item.data as T, index)}
                </div>
              )
            )}
          />
        )}
      </div>
    </div>
  );
}
