import React, { useState, useCallback, useEffect, useRef } from "react";
import { SimplePool, Event, Filter } from "nostr-tools";
import { useVirtualizer } from '@tanstack/react-virtual';
import { Image } from "../../common/Image";
import { addToFavorites, isFavorited } from "../../../utils/favorites";

interface NostrImageSearchProps {
  theme: "matrix" | "material";
  onImageSelect: (imageUrl: string) => void;
}

interface ImageEvent {
  id: string;
  url: string;
  alt: string;
  tags: string[];
  createdAt: number;
}

// True Masonry Grid with Virtual Scrolling
const MasonryGrid: React.FC<{
  images: ImageEvent[];
  onImageSelect: (url: string) => void;
  theme: "matrix" | "material";
  className: string;
}> = ({ images, onImageSelect, theme, className }) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [imageHeights, setImageHeights] = useState<Record<string, number>>({});
  const [columnHeights, setColumnHeights] = useState<number[]>([0, 0, 0]);
  const [itemPositions, setItemPositions] = useState<Array<{ x: number; y: number; height: number }>>([]);
  
  const COLUMN_COUNT = 3;
  const GAP = 16;
  
  // Calculate positions when images or heights change
  useEffect(() => {
    if (images.length === 0) return;
    
    const containerWidth = parentRef.current?.clientWidth || 800;
    const columnWidth = (containerWidth - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;
    const heights = [0, 0, 0];
    const positions: Array<{ x: number; y: number; height: number }> = [];
    
    images.forEach((image, index) => {
      // Find shortest column
      const shortestColumnIndex = heights.indexOf(Math.min(...heights));
      
      // Get estimated or actual height
      const estimatedHeight = imageHeights[image.id] || 250;
      
      // Calculate position
      const x = shortestColumnIndex * (columnWidth + GAP);
      const y = heights[shortestColumnIndex];
      
      positions.push({ x, y, height: estimatedHeight });
      
      // Update column height
      heights[shortestColumnIndex] += estimatedHeight + GAP;
    });
    
    setItemPositions(positions);
    setColumnHeights(heights);
  }, [images, imageHeights]);

  // Handle image load to get actual dimensions
  const handleImageLoad = useCallback((imageId: string, naturalHeight: number, displayWidth: number) => {
    const containerWidth = parentRef.current?.clientWidth || 800;
    const columnWidth = (containerWidth - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;
    
    // Calculate actual display height based on aspect ratio
    const aspectRatio = naturalHeight / displayWidth;
    const actualHeight = Math.min(columnWidth * aspectRatio, 400); // Max height 400px
    
    setImageHeights(prev => ({
      ...prev,
      [imageId]: actualHeight
    }));
  }, []);

  // Calculate total height for scrolling
  const totalHeight = Math.max(...columnHeights);

  // Use regular virtualizer for vertical scrolling only
  const virtualizer = useVirtualizer({
    count: images.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 250,
    overscan: 5,
  });

  return (
    <div
      ref={parentRef}
      className="h-96 w-full overflow-auto"
      style={{ height: '500px' }}
    >
      <div
        style={{
          height: `${totalHeight}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {images.map((image, index) => {
          const position = itemPositions[index];
          if (!position) return null;

          // Only render items that are likely to be visible
          const scrollTop = parentRef.current?.scrollTop || 0;
          const containerHeight = parentRef.current?.clientHeight || 500;
          const isVisible = position.y < scrollTop + containerHeight + 500 && 
                           position.y + position.height > scrollTop - 500;

          if (!isVisible) return null;

          const containerWidth = parentRef.current?.clientWidth || 800;
          const columnWidth = (containerWidth - (GAP * (COLUMN_COUNT - 1))) / COLUMN_COUNT;

          return (
            <div
              key={image.id}
              style={{
                position: 'absolute',
                left: `${position.x}px`,
                top: `${position.y}px`,
                width: `${columnWidth}px`,
                height: `${position.height}px`,
              }}
            >
              <MasonryImage
                image={image}
                onImageSelect={onImageSelect}
                onLoad={handleImageLoad}
                theme={theme}
                width={columnWidth}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Separate component for masonry images with load handling and controls
const MasonryImage: React.FC<{
  image: ImageEvent;
  onImageSelect: (url: string) => void;
  onLoad: (imageId: string, naturalHeight: number, displayWidth: number) => void;
  theme: "matrix" | "material";
  width: number;
}> = ({ image, onImageSelect, onLoad, theme, width }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isFavoritedState, setIsFavoritedState] = useState(() => isFavorited(image.url));

  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      onLoad(image.id, imgRef.current.naturalHeight, imgRef.current.naturalWidth);
    }
  }, [image.id, onLoad]);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFavoritedState) {
      // Already favorited, could remove if needed
      console.log('Image already in favorites');
    } else {
      // Add to favorites
      addToFavorites(image.url, image.tags);
      setIsFavoritedState(true);
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Copy image URL to clipboard
    navigator.clipboard.writeText(image.url);
    console.log('Link copied to clipboard');
  };

  return (
    <div className="w-full h-full relative group">
      <img
        ref={imgRef}
        src={image.url}
        alt={image.alt}
        onLoad={handleImageLoad}
        onClick={() => onImageSelect(image.url)}
        className="w-full h-full object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
        style={{ maxHeight: '400px', objectFit: 'cover' }}
      />
      
      {/* Controls Overlay */}
      <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {/* Heart Button */}
        <button
          onClick={handleHeartClick}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            theme === "matrix"
              ? "bg-black/70 text-[#00ff00] border border-[#00ff00]/20 hover:bg-[#00ff00]/20"
              : "bg-white/70 text-red-500 border border-gray-300 hover:bg-red-50"
          }`}
          title={isFavoritedState ? "Already in favorites" : "Add to favorites"}
        >
          {isFavoritedState ? "❤️" : "🤍"}
        </button>
        
        {/* Link Button */}
        <button
          onClick={handleLinkClick}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
            theme === "matrix"
              ? "bg-black/70 text-[#00ff00] border border-[#00ff00]/20 hover:bg-[#00ff00]/20"
              : "bg-white/70 text-blue-500 border border-gray-300 hover:bg-blue-50"
          }`}
          title="Copy image URL"
        >
          🔗
        </button>
      </div>

      {/* Tags */}
      {image.tags.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex flex-wrap gap-1">
            {image.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className={`px-2 py-1 text-xs rounded ${
                  theme === "matrix" 
                    ? "bg-black/70 text-[#00ff00] border border-[#00ff00]/20" 
                    : "bg-white/70 text-gray-800 border border-gray-300"
                }`}
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const RELAYS = [
  "wss://relay.nostr.band",
  "wss://relay.damus.io",
  "wss://nos.lol",
];

const TOPICS = [
  "meme",
  "gif",
  "art",
  "photography",
  "cat",
  "dog",
  "bitcoin",
  "nostr",
  "nature",
  "food",
  "music",
  "travel",
  "bitchat",
];

const IMAGES_PER_PAGE = 12;
const SEARCH_DEBOUNCE_MS = 500;
const QUERY_TIMEOUT_MS = 5000;

// Extract image URLs from text content
const extractImageUrls = (content: string): string[] => {
  const imageUrlRegex =
    /https?:\/\/[^\s]+\.(?:jpg|jpeg|png|gif|webp)(?:\?[^\s]*)?/gi;
  return content.match(imageUrlRegex) || [];
};

// Check if URL is a valid image
const isValidImageUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(
      parsedUrl.pathname + parsedUrl.search
    );
  } catch {
    return false;
  }
};

// Convert Nostr event to ImageEvent
const eventToImageEvent = (event: Event): ImageEvent[] => {
  const images: ImageEvent[] = [];

  // Get images from 'r' tags (references)
  const imageTags = event.tags
    .filter((tag) => tag[0] === "r" && tag[1] && isValidImageUrl(tag[1]))
    .map((tag) => tag[1]);

  // Get images from content
  const contentImages = event.content ? extractImageUrls(event.content) : [];

  // Combine and deduplicate
  const allUrls = [...new Set([...imageTags, ...contentImages])];

  // Extract topic tags
  const topicTags = event.tags
    .filter((tag) => tag[0] === "t" && tag[1])
    .map((tag) => tag[1].toLowerCase());

  // Create alt text from content (first 100 chars, clean)
  const altText = event.content
    ? event.content
        .replace(/https?:\/\/[^\s]+/g, "")
        .trim()
        .slice(0, 100)
    : `Image from ${new Date(event.created_at * 1000).toLocaleDateString()}`;

  allUrls.forEach((url) => {
    images.push({
      id: `${event.id}-${url}`,
      url,
      alt: altText || "Nostr image",
      tags: topicTags,
      createdAt: event.created_at,
    });
  });

  return images;
};

export function NostrImageSearch({
  theme,
  onImageSelect,
}: NostrImageSearchProps) {
  const [images, setImages] = useState<ImageEvent[]>([]);
  const [unfilteredImages, setUnfilteredImages] = useState<ImageEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("meme");
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nsfwFilterEnabled, setNsfwFilterEnabled] = useState(true);
  const [hasInitialized, setHasInitialized] = useState(false);

  const poolRef = useRef<SimplePool | null>(null);
  const searchTimeoutRef = useRef<number>();
  const seenEventIds = useRef(new Set<string>());
  const oldestTimestamp = useRef<number>(Math.floor(Date.now() / 1000));
  const lastSearchTermRef = useRef<string>("meme");

  // Initialize pool
  useEffect(() => {
    poolRef.current = new SimplePool();
    return () => {
      if (poolRef.current) {
        poolRef.current.close(RELAYS);
      }
    };
  }, []);

  // Initial search effect - only run once when component mounts
  useEffect(() => {
    if (hasInitialized) return; // Prevent multiple initializations
    
    const checkAndSearch = async () => {
      if (poolRef.current) {
        setHasInitialized(true);
        await handleSearch(true);
      } else {
        // If pool isn't ready, wait a bit more
        setTimeout(checkAndSearch, 100);
      }
    };
    
    // Start checking after a short delay
    const timer = setTimeout(checkAndSearch, 100);
    return () => clearTimeout(timer);
  }, []);

  // Re-filter images when NSFW filter changes
  useEffect(() => {
    if (unfilteredImages.length > 0) {
      const filteredImages = nsfwFilterEnabled
        ? unfilteredImages.filter(
            (img) => !img.tags.some((tag) => tag.toLowerCase() === "nsfw")
          )
        : unfilteredImages;
      setImages(filteredImages);
    }
  }, [nsfwFilterEnabled, unfilteredImages]);

  // Debounced search effect - only for manual input changes
  useEffect(() => {
    // Don't run during initial load or if search term hasn't actually changed
    if (!hasInitialized || searchTerm === lastSearchTermRef.current) {
      lastSearchTermRef.current = searchTerm;
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = window.setTimeout(() => {
      handleSearch(true);
      lastSearchTermRef.current = searchTerm;
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, hasInitialized]);

  // Helper to check if search term contains a topic
  const getSelectedTopic = useCallback((): string => {
    const lowerSearchTerm = searchTerm.toLowerCase().trim();
    return TOPICS.find((topic) => lowerSearchTerm.includes(topic)) || "";
  }, [searchTerm]);

  const buildFilters = useCallback(
    (isNewSearch: boolean): Filter[] => {
      const baseFilter: Filter = {
        kinds: [1], // Text notes
        limit: 50,
        until: isNewSearch ? undefined : oldestTimestamp.current,
      };

      const filters: Filter[] = [];

      // If we have a topic in the search term, use both topic filter and search
      if (searchTerm.trim()) {
        filters.push({
          ...baseFilter,
          "#t": [searchTerm.trim()],
        });
      } else {
        // Add a default filter if no search term
        filters.push({
          ...baseFilter,
          "#t": ["meme"], // Default to meme
        });
      }

      return filters;
    },
    [searchTerm, getSelectedTopic]
  );

  const handleSearch = useCallback(
    async (isNewSearch = false) => {
      if (!poolRef.current) return;

      setIsLoading(true);
      setError(null);

      if (isNewSearch) {
        setImages([]);
        setUnfilteredImages([]);
        seenEventIds.current.clear();
        oldestTimestamp.current = Math.floor(Date.now() / 1000);
        setHasMore(true);
      }

      try {
        const filters = buildFilters(isNewSearch);
        const events: Event[] = [];

        // Use Promise.race with timeout for better UX
        const queryPromise = Promise.all(
          filters.map((filter) =>
            poolRef.current!.querySync(RELAYS, filter).catch((err) => {
              console.warn("Query failed for filter:", filter, err);
              return [];
            })
          )
        );

        const timeoutPromise = new Promise<Event[][]>((_, reject) =>
          window.setTimeout(
            () => reject(new Error("Query timeout")),
            QUERY_TIMEOUT_MS
          )
        );

        const results = await Promise.race([queryPromise, timeoutPromise]);
        
        // Flatten and deduplicate events
        results.forEach((eventList) => {
          eventList.forEach((event) => {
            if (!seenEventIds.current.has(event.id)) {
              seenEventIds.current.add(event.id);
              events.push(event);
            }
          });
        });

        // Sort by created_at desc and extract images
        const sortedEvents = events.sort((a, b) => b.created_at - a.created_at);
        const newImages: ImageEvent[] = [];

        sortedEvents.forEach((event) => {
          const eventImages = eventToImageEvent(event);
          newImages.push(...eventImages);
          // Update oldest timestamp for pagination
          if (event.created_at < oldestTimestamp.current) {
            oldestTimestamp.current = event.created_at;
          }
        });

        // Remove duplicates by URL
        const uniqueImages = newImages.filter(
          (img, index, arr) =>
            arr.findIndex((other) => other.url === img.url) === index
        );

        // Store unfiltered images for NSFW filtering
        if (isNewSearch) {
          setUnfilteredImages(uniqueImages);
        } else {
          setUnfilteredImages(prev => [...prev, ...uniqueImages]);
        }

        // Apply NSFW filter if enabled
        const filteredImages = nsfwFilterEnabled
          ? uniqueImages.filter(
              (img) => !img.tags.some((tag) => tag.toLowerCase() === "nsfw")
            )
          : uniqueImages;

        if (isNewSearch) {
          setImages(filteredImages.slice(0, IMAGES_PER_PAGE));
        } else {
          // For load more, append to existing images and deduplicate
          setImages((prev) => {
            const existingUrls = new Set(prev.map((img) => img.url));
            const newUniqueImages = filteredImages.filter(
              (img) => !existingUrls.has(img.url)
            );
            // Only add truly new images to prevent masonry recalculation
            return newUniqueImages.length > 0
              ? [...prev, ...newUniqueImages]
              : prev;
          });
        }

        setHasMore(uniqueImages.length >= IMAGES_PER_PAGE);
      } catch (err) {
        console.error("Search failed:", err);
        setError(err instanceof Error ? err.message : "Search failed");
        setHasMore(false);
      } finally {
        setIsLoading(false);
      }
    },
    [buildFilters, nsfwFilterEnabled]
  );

  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      handleSearch(false);
    }
  }, [handleSearch, isLoading, hasMore]);

  const handleTopicClick = useCallback(
    (topic: string) => {
      const currentTopic = getSelectedTopic();

      if (currentTopic === topic) {
        // Remove the topic from search term
        const newSearchTerm = searchTerm
          .replace(new RegExp(`\\b${topic}\\b`, "gi"), "")
          .replace(/\s+/g, " ")
          .trim();
        setSearchTerm(newSearchTerm);
        // Trigger search immediately for topic changes
        setTimeout(() => handleSearch(true), 0);
      } else {
        // Clear the entire search input and set just the new topic
        setSearchTerm(topic);
        // Trigger search immediately for topic changes
        setTimeout(() => handleSearch(true), 0);
      }
    },
    [searchTerm, getSelectedTopic]
  );

  const selectedTopic = getSelectedTopic();

  const styles = {
    matrix: {
      container: "space-y-4",
      searchContainer: "space-y-4 mb-6",
      topicLabel: "text-sm font-medium text-[#00ff00]",
      topicButton: "px-3 py-1 text-xs rounded-full transition-all duration-200",
      topicButtonActive:
        "bg-[#00ff00] text-black shadow-[0_0_8px_rgba(0,255,0,0.5)]",
      topicButtonInactive:
        "bg-[#003300] text-[#00aa00] hover:bg-[#004400] border border-[#00ff00]/20",
      searchInput:
        "w-full px-4 py-2 rounded border bg-black border-[#003300] text-[#00ff00] placeholder-[#00aa00] focus:border-[#00ff00] focus:outline-none focus:shadow-[0_0_8px_rgba(0,255,0,0.3)]",
      errorContainer:
        "text-center py-4 text-red-400 bg-red-900/20 rounded border border-red-500/20",
      noResultsContainer: "text-center py-8 text-[#00aa00]",
      imageGrid: "grid grid-cols-3 gap-4 auto-rows-max",
      imageButton:
        "w-full rounded-lg border-none cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-200 overflow-hidden",
      loadMoreButton:
        "w-full px-6 py-3 rounded-lg font-medium transition-all bg-[#003300] text-[#00ff00] border border-[#00ff00] hover:bg-[#004400] hover:shadow-[0_0_8px_rgba(0,255,0,0.3)] disabled:opacity-50 disabled:cursor-not-allowed",
    },
    material: {
      container: "space-y-4",
      searchContainer: "space-y-4 mb-6",
      topicLabel: "text-sm font-medium text-gray-700",
      topicButton: "px-3 py-1 text-xs rounded-full transition-all duration-200",
      topicButtonActive: "bg-blue-600 text-white shadow-lg",
      topicButtonInactive:
        "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300",
      searchInput:
        "w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-800 placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white",
      errorContainer:
        "text-center py-4 text-red-600 bg-red-50 rounded-lg border border-red-200",
      noResultsContainer: "text-center py-8 text-gray-500",
      imageGrid: "grid grid-cols-3 gap-4 auto-rows-max",
      imageButton:
        "w-full rounded-lg border-none cursor-pointer hover:border-blue-400 hover:shadow-lg transition-all duration-200 overflow-hidden",
      loadMoreButton:
        "w-full px-6 py-3 rounded-lg font-medium transition-all bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed",
    },
  };

  const s = styles[theme];

  return (
    <div className={s.container}>
      {/* NSFW Filter Toggle */}
      <div className="flex items-center gap-2">
        <label
          className={`text-sm font-medium ${
            theme === "matrix" ? "text-[#00aa00]" : "text-gray-700"
          }`}
        >
          NSFW Filter:
        </label>
        <button
          onClick={() => setNsfwFilterEnabled(!nsfwFilterEnabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            nsfwFilterEnabled
              ? theme === "matrix"
                ? "bg-[#00ff00]"
                : "bg-blue-600"
              : theme === "matrix"
              ? "bg-[#003300]"
              : "bg-gray-300"
          }`}
          type="button"
          title={
            nsfwFilterEnabled ? "NSFW filter enabled" : "NSFW filter disabled"
          }
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              nsfwFilterEnabled ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
        <span
          className={`text-xs ${
            theme === "matrix" ? "text-[#00aa00]" : "text-gray-600"
          }`}
        >
          {nsfwFilterEnabled ? "ON" : "OFF"}
        </span>
      </div>
      <div className={s.searchContainer}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={s.topicLabel}>Topics:</span>
            {TOPICS.map((topic) => (
              <button
                key={topic}
                onClick={() => handleTopicClick(topic)}
                className={`${s.topicButton} ${
                  selectedTopic === topic
                    ? s.topicButtonActive
                    : s.topicButtonInactive
                }`}
                type="button"
              >
                {topic.charAt(0).toUpperCase() + topic.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <input
              type="text"
              placeholder="Search for images... (try typing 'bitcoin', 'nature', etc.)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={s.searchInput}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className={s.errorContainer}>
          <div className="font-medium">⚠️ Search Error</div>
          <div className="text-sm mt-1">{error}</div>
        </div>
      )}

      {!isLoading && !error && images.length === 0 && hasInitialized && (
        <div className={s.noResultsContainer}>
          <div className="text-2xl mb-2">🔍</div>
          <div className="font-medium">No images found</div>
          <div className="text-sm mt-1 opacity-75">
            Try different search terms or click a topic button
          </div>
        </div>
      )}

      {images.length > 0 && (
        <>
          <div className="text-sm opacity-75 mb-4">
            💡 Found {images.length} image{images.length !== 1 ? "s" : ""}.
            Click any image to select it.
          </div>

          <MasonryGrid
            images={images}
            onImageSelect={onImageSelect}
            theme={theme}
            className={s.imageGrid}
          />

          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className={s.loadMoreButton}
                type="button"
              >
                {isLoading ? "Loading..." : "Load More Images"}
              </button>
            </div>
          )}
        </>
      )}

      {isLoading && images.length === 0 && (
        <div className="text-center py-8">
          <div className="text-2xl mb-2">⏳</div>
          <div className="font-medium">Searching Nostr...</div>
        </div>
      )}
    </div>
  );
}