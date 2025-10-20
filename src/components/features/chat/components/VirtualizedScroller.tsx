import { useEffect, useRef, useState, useCallback } from "react";
import { LegendList } from "@legendapp/list";

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
  const isScrollingToBottomRef = useRef(false);
  
  // Track if we're in the middle of adding new items
  const [isAddingItems, setIsAddingItems] = useState(false);

  // LegendList handles measurement internally

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
      if (isUserAtBottom && scrollToBottomOnNewItems) {
        setTimeout(() => {
          scrollToBottom();
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
  }, [isUserAtBottom, scrollToBottomOnNewItems, scrollToBottom]);

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
        <LegendList
          data={items}
          estimatedItemSize={estimatedItemSize}
          overscan={overscan}
          keyExtractor={(item, index) => (item?.id ? String(item.id) : `item-${index}`)}
          renderItem={({ item, index }) => (
            <div style={{ boxSizing: "border-box" }}>
              {renderItem(item, index)}
            </div>
          )}
        />
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