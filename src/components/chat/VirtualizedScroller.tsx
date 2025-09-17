import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

interface VirtualizedScrollerProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  estimatedItemSize?: number;
  overscan?: number;
  className?: string;
  onScroll?: () => void;
  maintainScrollPosition?: boolean;
  scrollToBottomOnNewItems?: boolean;
}

export function VirtualizedScroller({
  items,
  renderItem,
  estimatedItemSize = 180,
  overscan = 5,
  className = "",
  onScroll,
  maintainScrollPosition = false,
  scrollToBottomOnNewItems = true
}: VirtualizedScrollerProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);
  const [lastItemCount, setLastItemCount] = useState(0);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const measureTimeoutRef = useRef<NodeJS.Timeout>();
  const isScrollingToBottomRef = useRef(false);
  
  // Track if we're in the middle of adding new items
  const [isAddingItems, setIsAddingItems] = useState(false);

  // Create measureElement function that doesn't depend on virtualizer
  const measureElement = useCallback((element: Element) => {
    if (!element) return estimatedItemSize;
    
    // Get the actual height of the element
    const rect = element.getBoundingClientRect();
    let height = rect.height;
    
    // If height is 0 or very small, check if content is still loading
    if (height <= 10) {
      // Try to get height from offsetHeight as backup
      const offsetHeight = (element as HTMLElement).offsetHeight;
      height = offsetHeight > 0 ? offsetHeight : estimatedItemSize;
    }
    
    // Return the exact height without adding extra padding
    return Math.max(height, 50); // Reduced minimum from 60 to 50
  }, [estimatedItemSize]);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemSize,
    overscan,
    measureElement,
    lanes: 1,
    // Enable dynamic sizing with better item key
    getItemKey: (index) => items[index]?.id || `item-${index}`,
    // Disable padding between items
    paddingStart: 0,
    paddingEnd: 0,
  });

  // Force measurements to be more accurate but less aggressive
  virtualizer.shouldAdjustScrollPositionOnItemSizeChange = () => false;

  // Check if user is at bottom with proper threshold
  const checkIsAtBottom = useCallback(() => {
    const element = parentRef.current;
    if (!element) return true;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const threshold = 50; // Pixels from bottom
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= threshold;
  }, []);

  // Reliable scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const element = parentRef.current;
    if (!element) return;

    isScrollingToBottomRef.current = true;
    
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      element.scrollTop = element.scrollHeight;
      
      // Double-check after a brief delay in case content is still loading
      setTimeout(() => {
        if (element.scrollTop < element.scrollHeight - element.clientHeight - 10) {
          element.scrollTop = element.scrollHeight;
        }
        isScrollingToBottomRef.current = false;
      }, 50);
    });
  }, []);

  // Handle scroll events with less aggressive debouncing
  const handleScroll = useCallback(() => {
    // Don't update state if we're programmatically scrolling
    if (isScrollingToBottomRef.current) return;
    
    // Clear any pending scroll timeouts
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Less aggressive debounce for smoother scroll feel
    scrollTimeoutRef.current = setTimeout(() => {
      const newIsAtBottom = checkIsAtBottom();
      if (newIsAtBottom !== isUserAtBottom) {
        setIsUserAtBottom(newIsAtBottom);
      }
      onScroll?.();
    }, 100); // Increased from 50ms to 100ms
  }, [checkIsAtBottom, isUserAtBottom, onScroll]);

  // Track when items are being added
  useEffect(() => {
    const currentCount = items.length;
    const previousCount = lastItemCount;
    
    if (currentCount > previousCount) {
      setIsAddingItems(true);
      
      // Clear the adding items flag after content settles
      setTimeout(() => {
        setIsAddingItems(false);
      }, 100);
    }
    
    setLastItemCount(currentCount);
  }, [items.length, lastItemCount]);

  // Handle new items when scroll-to-bottom is enabled (less aggressive)
  useEffect(() => {
    if (!scrollToBottomOnNewItems) return;
    
    const currentCount = items.length;
    const previousCount = lastItemCount;
    
    // Only scroll if we have new items and user was at bottom
    if (currentCount > previousCount && previousCount > 0 && isUserAtBottom) {
      // Less aggressive approach - just scroll, don't force remeasure every time
      scrollToBottom();
      
      // Single delayed scroll after content settles
      setTimeout(() => {
        scrollToBottom();
      }, 150);
    }
  }, [items.length, isUserAtBottom, scrollToBottomOnNewItems, scrollToBottom, lastItemCount]);

  // Handle images and dynamic content loading (less aggressive)
  useEffect(() => {
    const handleContentLoad = () => {
      // Only remeasure if user is at bottom to avoid scroll jumping
      if (isUserAtBottom) {
        setTimeout(() => {
          virtualizer.measure();
          if (scrollToBottomOnNewItems) {
            scrollToBottom();
          }
        }, 50);
      }
    };

    // Monitor images for load events only
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
  }, [virtualizer, isUserAtBottom, scrollToBottomOnNewItems, scrollToBottom]);

  // Setup scroll listener
  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    element.addEventListener("scroll", handleScroll, { passive: true });
    
    return () => {
      element.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (measureTimeoutRef.current) {
        clearTimeout(measureTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  // Initial scroll to bottom
  useEffect(() => {
    if (items.length > 0 && scrollToBottomOnNewItems) {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, []); // Only run once on mount

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className={`flex-1 relative ${className}`}>
      <div
        ref={parentRef}
        className="h-full overflow-auto"
        style={{ 
          contain: "strict", 
          overflowAnchor: "none",
          // Smoother scroll behavior
          scrollBehavior: "auto", // Always use auto for better performance
        }}
      >
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
                  boxSizing: "border-box",
                  // Ensure proper rendering
                  willChange: "transform",
                }}
              >
                {renderItem(item, virtualItem.index)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Scroll to bottom button - only show if not maintaining scroll position */}
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