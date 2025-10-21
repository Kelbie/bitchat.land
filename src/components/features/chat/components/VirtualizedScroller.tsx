import { useEffect, useRef, useState, useCallback } from "react";
import { LegendList } from "@legendapp/list";

interface VirtualizedScrollerProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  estimatedItemSize?: number;
  overscan?: number;
  className?: string;
  onScroll?: () => void;
  maintainScrollPosition?: boolean;
  scrollToBottomOnNewItems?: boolean;
  keyExtractor?: (item: T, index: number) => string;
  maintainVisibleContentPosition?: boolean;
  getItemType?: (item: T, index: number) => string | undefined;
  getEstimatedItemSize?: (index: number, item: T, type: string | undefined) => number;
  itemsAreEqual?: (prev: T, next: T, index: number, data: readonly T[]) => boolean;
  enableAverages?: boolean;
  recycleItems?: boolean;
  maintainScrollAtEnd?: boolean | { onLayout?: boolean; onItemLayout?: boolean; onDataChange?: boolean };
  resetKey?: string | number;  // Add this to force remount on channel change
  ItemSeparatorComponent?: React.ComponentType<{ leadingItem: T }>;
  alignItemsAtEnd?: boolean;
}

export function VirtualizedScroller<T>({
  items,
  renderItem,
  estimatedItemSize = 180,
  overscan = 5,
  className = "",
  onScroll,
  maintainScrollPosition = false,
  scrollToBottomOnNewItems = true,
  keyExtractor,
  maintainVisibleContentPosition = true,
  getItemType,
  getEstimatedItemSize,
  itemsAreEqual,
  enableAverages = true,
  recycleItems = false,
  maintainScrollAtEnd = false,
  resetKey,  // Add this parameter
  ItemSeparatorComponent,
  alignItemsAtEnd = false,
}: VirtualizedScrollerProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const scrollElRef = useRef<HTMLElement | null>(null);
  const [useInternalScroll, setUseInternalScroll] = useState(false);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [lastItemCount, setLastItemCount] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const isScrollingToBottomRef = useRef(false);
  const lastScrollHeightRef = useRef<number>(0);

  // Check if user is at bottom with proper threshold
  const checkIsAtBottom = useCallback(() => {
    const element = scrollElRef.current;
    if (!element) return true;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const threshold = 50;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= threshold;
  }, []);

  // Reliable scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const element = scrollElRef.current;
    if (!element) return;

    isScrollingToBottomRef.current = true;
    
    requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
      
      setTimeout(() => {
        if (element.scrollTop < element.scrollHeight - element.clientHeight - 10) {
          element.scrollTop = element.scrollHeight;
        }
        isScrollingToBottomRef.current = false;
      }, 50);
    });
  }, []);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (isScrollingToBottomRef.current) return;
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const newIsAtBottom = checkIsAtBottom();
      if (newIsAtBottom !== isUserAtBottom) {
        setIsUserAtBottom(newIsAtBottom);
      }
      onScroll?.();
    }, 100);
  }, [checkIsAtBottom, isUserAtBottom, onScroll]);

  // Track last count for scroll-to-bottom logic
  useEffect(() => {
    setLastItemCount(items.length);
  }, [items.length]);

  // Maintain scroll position when not at bottom and list grows
  useEffect(() => {
    if (!maintainScrollPosition) return;
    const element = scrollElRef.current;
    if (!element) return;

    const previousHeight = lastScrollHeightRef.current || element.scrollHeight;
    requestAnimationFrame(() => {
      const newHeight = element.scrollHeight;
      const heightDelta = newHeight - previousHeight;
      if (!isUserAtBottom && heightDelta !== 0) {
        element.scrollTop = element.scrollTop + heightDelta;
      }
      lastScrollHeightRef.current = element.scrollHeight;
    });
  }, [items, maintainScrollPosition, isUserAtBottom]);

  // Handle new items when scroll-to-bottom is enabled
  useEffect(() => {
    if (!scrollToBottomOnNewItems) return;
    
    const currentCount = items.length;
    const previousCount = lastItemCount;
    
    if (currentCount > previousCount && previousCount > 0 && isUserAtBottom) {
      scrollToBottom();
      
      setTimeout(() => {
        scrollToBottom();
      }, 150);
    }
  }, [items.length, isUserAtBottom, scrollToBottomOnNewItems, scrollToBottom, lastItemCount]);

  // Handle images and dynamic content loading
  useEffect(() => {
    const handleContentLoad = () => {
      if (isUserAtBottom && scrollToBottomOnNewItems) {
        setTimeout(() => {
          scrollToBottom();
        }, 50);
      }
    };

    const element = parentRef.current;
    if (!element) return;

    const images = element.querySelectorAll('img');

    images.forEach(img => {
      if (!img.complete) {
        img.addEventListener('load', handleContentLoad, { once: true });
        img.addEventListener('error', handleContentLoad, { once: true });
      }
    });

    return () => {
      images.forEach(img => {
        img.removeEventListener('load', handleContentLoad);
        img.removeEventListener('error', handleContentLoad);
      });
    };
  }, [isUserAtBottom, scrollToBottomOnNewItems, scrollToBottom]);

  // Setup scroll listener
  useEffect(() => {
    const root = parentRef.current;
    if (!root) return;

    const isScrollable = (el: HTMLElement) => {
      const cs = getComputedStyle(el);
      const canScrollY = cs.overflowY === 'auto' || cs.overflowY === 'scroll';
      const canScrollX = cs.overflowX === 'auto' || cs.overflowX === 'scroll';
      const overflowsY = el.scrollHeight > el.clientHeight + 1;
      const overflowsX = el.scrollWidth > el.clientWidth + 1;
      return (canScrollY && overflowsY) || (canScrollX && overflowsX);
    };

    let cur: HTMLElement | null = root.parentElement as HTMLElement | null;
    let found: HTMLElement | null = null;
    while (cur && cur !== document.body) {
      if (isScrollable(cur)) { found = cur; break; }
      cur = cur.parentElement as HTMLElement | null;
    }

    if (found) {
      scrollElRef.current = found;
      setUseInternalScroll(false);
    } else {
      scrollElRef.current = root;
      setUseInternalScroll(true);
    }
    const element = scrollElRef.current;
    if (!element) return;

    element.addEventListener("scroll", handleScroll, { passive: true });
    lastScrollHeightRef.current = element.scrollHeight;

    return () => {
      element.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Initial scroll to bottom when enabled
  useEffect(() => {
    if (items.length > 0 && scrollToBottomOnNewItems) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [items.length, scrollToBottomOnNewItems, scrollToBottom]);

  return (
    <div className={`flex-1 relative ${className} h-full`}>
      <div
        ref={parentRef}
        className="h-full flex-1"
        style={{ 
          contain: "strict", 
          overflowAnchor: "none",
          scrollBehavior: "auto",
          overflowY: useInternalScroll ? 'auto' : 'hidden',
          overflowX: useInternalScroll ? 'auto' : 'hidden',
        }}
      >
        <LegendList
          key={resetKey ? `list-${resetKey}` : undefined}  // Force remount when this changes
          style={{ 
            overflow: 'visible', 
            height: '100%', 
            display: 'flex',
            flexDirection: 'column',
            width: '100%',
            position: 'relative'
          }}
          data={items}
          estimatedItemSize={estimatedItemSize}
          overscan={overscan}
          maintainVisibleContentPosition={maintainVisibleContentPosition}
          suggestEstimatedItemSize={true}
          enableAverages={enableAverages}
          recycleItems={recycleItems}
          maintainScrollAtEnd={maintainScrollAtEnd}
          getItemType={getItemType}
          getEstimatedItemSize={getEstimatedItemSize}
          itemsAreEqual={itemsAreEqual}
          ItemSeparatorComponent={ItemSeparatorComponent}
          alignItemsAtEnd={alignItemsAtEnd}
          keyExtractor={(item, index) => (keyExtractor ? keyExtractor(item, index) : `item-${index}`)}
          renderItem={({ item, index }: { item: T; index: number }) => (
            <div 
              style={{ 
                width: '100%', 
                minHeight: 0,
                position: 'relative',
                isolation: 'isolate'
              }}
            >
              {renderItem(item, index)}
            </div>
          )}
        />
      </div>

      {!maintainScrollPosition && !isUserAtBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg transition-all duration-200 z-10"
          title="Scroll to bottom"
        >
          ↓
        </button>
      )}
    </div>
  );
}