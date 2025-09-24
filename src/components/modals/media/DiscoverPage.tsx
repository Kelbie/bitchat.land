import React, { useState, useCallback, useEffect, useRef } from "react";
import { SimplePool, Event, Filter } from "nostr-tools";
import { addToFavorites, isFavorited } from "@/utils/favorites";
import { MasonryGrid, MasonryImage as BaseMasonryImage } from "@/components/ui/data";
import { globalStyles } from "@/styles";
import { capitalizeFirst } from "@/utils/stringUtils";

interface NostrImageSearchProps {
  theme: "matrix" | "material";
  onImageSelect: (imageUrl: string) => void;
}

interface ImageEvent extends BaseMasonryImage {
  alt: string;
  createdAt: number;
}

// Separate component for masonry images with load handling and controls
const MasonryImage: React.FC<{
  image: ImageEvent;
  onImageSelect: (url: string) => void;
  onLoad: (imageId: string, naturalHeight: number, displayWidth: number) => void;
  theme: "matrix" | "material";
}> = ({ image, onImageSelect, onLoad, theme }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [isFavoritedState, setIsFavoritedState] = useState(() => isFavorited(image.url));

  const handleImageLoad = useCallback(() => {
    if (imgRef.current) {
      onLoad(image.id, imgRef.current.naturalHeight, imgRef.current.naturalWidth);
    }
  }, [image.id, onLoad]);

  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isFavoritedState) {
      // Add to favorites
      addToFavorites(image.url, image.tags);
      setIsFavoritedState(true);
    }
  };

  const handleLinkClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Copy image URL to clipboard
    navigator.clipboard.writeText(image.url);
  };

  const styles = globalStyles["DiscoverPage"];
  const s = styles[theme];

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
              ? "bg-gray-900/70 text-green-400 border border-green-400/20 hover:bg-green-400/20"
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
              ? "bg-gray-900/70 text-green-400 border border-green-400/20 hover:bg-green-400/20"
              : "bg-white/70 text-blue-500 border border-gray-300 hover:bg-blue-50"
          }`}
          title="Copy image URL"
        >
          🔗
        </button>
      </div>

      {/* Tags */}
      {image.tags && image.tags.length > 0 && (
        <div className="absolute bottom-2 left-2 right-2">
          <div className="flex flex-wrap gap-1">
            {image.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className={`px-2 py-1 text-xs rounded ${
                  theme === "matrix" 
                    ? "bg-gray-900/70 text-green-400 border border-green-400/20" 
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

export function DiscoverPage({
  theme,
  onImageSelect,
}: NostrImageSearchProps) {
  const [images, setImages] = useState<ImageEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("meme");
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
    [searchTerm]
  );

  const handleSearch = useCallback(
    async (isNewSearch = false) => {
      if (!poolRef.current) return;

      setIsLoading(true);
      setError(null);

      if (isNewSearch) {
        setImages([]);
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

        if (isNewSearch) {
          setImages(uniqueImages.slice(0, IMAGES_PER_PAGE));
        } else {
          // For load more, append to existing images and deduplicate
          setImages((prev: ImageEvent[]) => {
            const existingUrls = new Set(prev.map((img) => img.url));
            const newUniqueImages = uniqueImages.filter(
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
    [buildFilters]
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

  const styles = globalStyles["DiscoverPage"];

  const s = styles[theme];

  const renderImage = (image: ImageEvent, onLoad: (imageId: string, naturalHeight: number, displayWidth: number) => void) => (
    <MasonryImage
      image={image}
      onImageSelect={onImageSelect}
      onLoad={onLoad}
      theme={theme}
    />
  );

  return (
    <div className={s.container}>
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
                {capitalizeFirst(topic)}
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
            renderImage={renderImage}
            columnCount={3}
            gap={16}
            maxHeight={400}
          />

          {hasMore && (
            <div className="text-center pt-4 pb-6">
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