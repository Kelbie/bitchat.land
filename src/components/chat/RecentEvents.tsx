import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { NostrEvent } from "../../types";
import {
  parseSearchQuery,
  addGeohashToSearch,
  addUserToSearch,
  ParsedSearch,
} from "../../utils/searchParser";
import { renderTextWithLinks } from "../../utils/linkRenderer";
import { colorForPeerSeed } from "../../utils/userColor";
import { hasImageUrl, extractImageUrl } from "../../utils/imageUtils";
import { Image } from "../common/Image";
import React from "react"; // Added missing import
import { globalStyles } from "../../styles";
import { getPow } from "nostr-tools/nip13";

const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/;

interface RecentEventsProps {
  nostrEnabled: boolean;
  searchText: string;
  allStoredEvents: NostrEvent[];
  recentEvents: NostrEvent[];
  onSearch?: (text: string) => void;
  forceScrollToBottom?: boolean;
  onReply?: (username: string, pubkeyHash: string) => void;
  theme: "matrix" | "material";
}

// Separate EventItem component
type EventItemProps = {
  event: NostrEvent;
  searchText: string;
  onSearch?: (text: string) => void;
  onReply?: (username: string, pubkeyHash: string) => void;
  theme: "matrix" | "material";
};

const EventItem = React.memo(({
  event,
  searchText,
  onSearch,
  onReply,
  theme
}: EventItemProps) => {
  const t = styles[theme];

  const geoTag = event.tags.find((tag: string[]) => tag[0] === "g");
  const groupTag = event.tags.find((tag: string[]) => tag[0] === "d");
  const nameTag = event.tags.find((tag: string[]) => tag[0] === "n");
  const clientTag = event.tags.find((tag: string[]) => tag[0] === "client");

  const rawGeohash =
    geoTag && typeof geoTag[1] === "string" ? geoTag[1] : "";
  const groupTagValue =
    groupTag && typeof groupTag[1] === "string" ? groupTag[1] : "";
  const username = nameTag ? nameTag[1] : "Anonymous";
  const clientName = clientTag ? clientTag[1] : null;
  const pubkeyHash = event.pubkey.slice(-4);
  const time = new Date(event.created_at * 1000).toLocaleTimeString();
  const date = new Date(event.created_at * 1000).toLocaleDateString();
  const isToday =
    new Date().toDateString() ===
    new Date(event.created_at * 1000).toDateString();
  const eventGeohash = (geoTag ? geoTag[1] : "").toLowerCase();
  const userColors = colorForPeerSeed("nostr:" + event.pubkey.toLowerCase(), true);

  function isActionMessage(content: string): boolean {
    // Check for asterisk wrapper pattern
    const hasAsteriskWrapper =
      content.startsWith("* ") && content.endsWith(" *");

    if (!hasAsteriskWrapper) {
      return false;
    }

    // Check for specific action indicators
    const hasActionIndicators =
      content.includes("🫂") || // hug emoji
      content.includes("🐟") || // slap emoji
      content.includes("took a screenshot") ||
      content.includes("joined the channel"); // join messages

    return hasActionIndicators;
  }

  if (isActionMessage(event.content)) {
    return (
      <div className="pb-4">
        <div className={t.messageCard}>
          {/* Header with location/client info - same as regular messages */}
          <div className="flex justify-start items-center h-4">
            <div className="flex items-center gap-2">
              <span
                className={`${t.hashTag} ${onSearch ? "cursor-pointer" : ""}`}
                onClick={
                  onSearch
                    ? () =>
                        onSearch(
                          addGeohashToSearch(
                            searchText,
                            rawGeohash.toLowerCase()
                          )
                        )
                    : undefined
                }
              >
                {eventGeohash
                  ? `#${eventGeohash.toUpperCase()}`
                  : `#${groupTagValue.toUpperCase()}`}
              </span>

              {clientName && <span className={t.hashTag}>•</span>}
              {clientName && (
                <span className={t.hashTag}>via {clientName}</span>
              )}
            </div>
          </div>

          {/* System message content */}
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0 leading-relaxed break-words whitespace-pre-wrap font-mono tracking-wide">
              <span className={`text-sm italic ${theme === 'matrix' ? 'text-gray-400' : 'text-gray-500'}`}>
                {event.content}
              </span>

              <span className="pl-2 text-[11px] font-mono text-gray-500">
                [{isToday ? time : `${date} ${time}`}]
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className={t.messageCard}>
        <div className="flex justify-start items-center h-4">
          <div className="flex items-center gap-2">
            <span
              className={`${t.hashTag} ${onSearch ? "cursor-pointer" : ""}`}
              onClick={
                onSearch
                  ? () =>
                      onSearch(
                        addGeohashToSearch(
                          searchText,
                          rawGeohash.toLowerCase()
                        )
                      )
                  : undefined
              }
            >
              {eventGeohash
                ? `#${eventGeohash.toUpperCase()}`
                : `#${groupTagValue.toUpperCase()}`}
            </span>

            {clientName && (
              <>
                <span className={t.hashTag}>•</span>
                <span className={t.hashTag}>via {clientName}</span>
              </>
            )}

            {onReply && (
              <>
                <span className={t.hashTag}>•</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onReply(username, pubkeyHash);
                  }}
                  className={t.replyButton}
                >
                  ↪ Reply
                </button>
              </>
            )}

            <span className={t.hashTag}>•</span>
            <span className="text-[11px] font-mono text-gray-500">
              PoW {getPow(event.id)}
            </span>

            {event.relayUrl && (
              <>
                <span className={t.hashTag}>•</span>
                <span className="text-[11px] font-mono text-gray-500">
                  relay {event.relayUrl.replace(/^wss?:\/\//, '').split('/')[0]}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 leading-relaxed break-words whitespace-pre-wrap font-mono tracking-wide">
            <span
              className={`text-sm font-bold ${
                onSearch ? "cursor-pointer" : ""
              }`}
              style={{ color: userColors.hex }}
              onClick={
                onSearch
                  ? () =>
                      onSearch(
                        addUserToSearch(searchText, username, pubkeyHash)
                      )
                  : undefined
              }
            >
              &lt;@{username}#{pubkeyHash}&gt;
            </span>

            <span
              className="pl-2 text-[15px]"
              style={{ color: userColors.hex }}
            >
              {event.content
                ? (() => {
                    if (hasImageUrl(event.content)) {
                      // Find the image URL and its position
                      const imageUrl = extractImageUrl(event.content);
                      if (imageUrl) {
                        // Split content around the image URL to preserve position
                        const parts = event.content.split(imageUrl);
                        return (
                          <>
                            {parts[0] && (
                              <span>
                                {renderTextWithLinks(parts[0], theme)}
                              </span>
                            )}
                            <br />
                            <div className="block my-2">
                              <Image
                                src={imageUrl}
                                alt=""
                                theme={theme}
                                showControls={true}
                                maxWidth="200px"
                                maxHeight="200px"
                                className="max-w-[200px] h-auto rounded-lg shadow-sm"
                                tags={[]}
                                showTags={false}
                              />
                            </div>
                            <br />
                            {parts[1] && (
                              <span>
                                {renderTextWithLinks(parts[1], theme)}
                              </span>
                            )}
                          </>
                        );
                      }
                    }
                    return renderTextWithLinks(event.content, theme);
                  })()
                : "[No content]"}
            </span>

            <span className="pl-2 text-[11px] font-mono text-gray-500">
              [{isToday ? time : `${date} ${time}`}]
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

EventItem.displayName = 'EventItem';

const styles = globalStyles["RecentEvents"];

export function RecentEvents({
  nostrEnabled,
  searchText,
  allStoredEvents,
  recentEvents,
  onSearch,
  onReply,
  theme,
}: RecentEventsProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [lastSeenEventId, setLastSeenEventId] = useState<string | null>(null);
  const [isUserAtBottom, setIsUserAtBottom] = useState(true);

  const prevEventsLengthRef = useRef(0);
  const measurementCache = useRef<Map<number, number>>(new Map());

  const t = styles[theme];

  // Parse search and filter events
  const parsedSearch: ParsedSearch = parseSearchQuery(searchText);
  const hasSearchTerms =
    parsedSearch.text ||
    parsedSearch.geohashes.length > 0 ||
    parsedSearch.users.length > 0 ||
    parsedSearch.clients.length > 0 ||
    parsedSearch.colors.length > 0 ||
    parsedSearch.has.length > 0;

  const eventsToShow = hasSearchTerms ? allStoredEvents : recentEvents;
  const filteredEvents = eventsToShow.filter((event) => {
    if (!hasSearchTerms) return true;

    const messageContent = (event.content || "").toLowerCase();
    const nameTag = event.tags.find((tag: string[]) => tag[0] === "n");
    const username = (nameTag ? nameTag[1] : "").toLowerCase();
    const geoTag = event.tags.find((tag: string[]) => tag[0] === "g");
    const groupTag = event.tags.find((tag: string[]) => tag[0] === "d");
    const eventGeohash = (geoTag ? geoTag[1] : "").toLowerCase();
    const eventGroup = (groupTag ? groupTag[1] : "").toLowerCase();
    const eventLocationTag = eventGeohash || eventGroup;
    const pubkeyHash = event.pubkey.slice(-4).toLowerCase();
    const clientTag = event.tags.find((tag: string[]) => tag[0] === "client");
    const eventClient = (clientTag ? clientTag[1] : "").toLowerCase();

    let matches = true;

    if (parsedSearch.text) {
      matches = messageContent.includes(parsedSearch.text.toLowerCase());
    }

    if (parsedSearch.geohashes.length > 0 && matches) {
      if (!eventLocationTag) {
        matches = false;
      } else {
        matches = parsedSearch.geohashes.some((searchGeohash, index) => {
          const includeChildren: boolean = parsedSearch.includeChildren[index] ?? false;
          
          if (eventGeohash && VALID_GEOHASH_CHARS.test(eventGeohash)) {
            if (includeChildren) {
              // With + suffix: allow child regions (starts with)
              return eventGeohash.startsWith(searchGeohash.toLowerCase());
            } else {
              // Without + suffix: exact match only
              return eventGeohash === searchGeohash.toLowerCase();
            }
          } else {
            if (includeChildren) {
              // With + suffix: allow child regions (starts with)
              return eventLocationTag.startsWith(searchGeohash.toLowerCase());
            } else {
              // Without + suffix: exact match only
              return eventLocationTag === searchGeohash.toLowerCase();
            }
          }
        });
      }
    }

    if (parsedSearch.users.length > 0 && matches) {
      matches = parsedSearch.users.some((searchUser) => {
        if (searchUser.includes("#")) {
          const [searchUsername, searchHash] = searchUser.split("#");
          return (
            username === searchUsername.toLowerCase() &&
            pubkeyHash === searchHash.toLowerCase()
          );
        }
        return username === searchUser.toLowerCase();
      });
    }

    if (parsedSearch.clients?.length > 0 && matches) {
      matches =
        !!eventClient &&
        parsedSearch.clients?.some((searchClient) =>
          eventClient.includes(searchClient.toLowerCase())
        );
    }

    if (parsedSearch.has?.length > 0 && matches) {
      for (const filter of parsedSearch.has) {
        if (filter === "image" && !hasImageUrl(event.content)) {
          matches = false;
          break;
        }
      }
    }

    return matches;
  });

  const sortedEvents = filteredEvents.sort(
    (a, b) => a.created_at - b.created_at
  );
  const hasImageFilter = parsedSearch.has?.includes("image") || false;

  // Calculate unread count
  const unreadCount = useMemo(() => {
    if (!lastSeenEventId || sortedEvents.length === 0) return 0;

    const lastSeenIndex = sortedEvents.findIndex(
      (event) => event.id === lastSeenEventId
    );
    if (lastSeenIndex === -1) return sortedEvents.length;

    return sortedEvents.length - lastSeenIndex - 1;
  }, [sortedEvents, lastSeenEventId]);

  // Update last seen event when user is at bottom
  useEffect(() => {
    if (isUserAtBottom && sortedEvents.length > 0) {
      const latestEvent = sortedEvents[sortedEvents.length - 1];
      if (latestEvent && latestEvent.id !== lastSeenEventId) {
        setLastSeenEventId(latestEvent.id);
      }
    }
  }, [isUserAtBottom, sortedEvents, lastSeenEventId]);

  // Custom measureElement function that prevents scroll jumps when scrolling up
  const measureElement = useCallback(
    (
      element: Element,
      entry: ResizeObserverEntry | undefined,
      instance: { scrollDirection?: string | null }
    ) => {
      const height = element.getBoundingClientRect().height;
      const index = Number(element.getAttribute("data-index"));

      // Cache the measurement
      measurementCache.current.set(index, height);

      // Critical fix: When scrolling backward, use cached measurements to prevent jumps
      if (instance.scrollDirection === "backward") {
        const cachedHeight = measurementCache.current.get(index);
        return cachedHeight || height;
      }

      return height;
    },
    []
  );

  // TanStack Virtual setup with proper chat configuration
  const virtualizer = useVirtualizer({
    count: sortedEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120, // Overestimate to prevent jumps
    overscan: 5,
    measureElement,
  });

  // Disable automatic scroll position adjustment - the root cause of the issue
  virtualizer.shouldAdjustScrollPositionOnItemSizeChange = () => false;

  // Detect if user is at bottom with proper threshold
  const checkIsAtBottom = useCallback(() => {
    const element = parentRef.current;
    if (!element) return false;

    const { scrollTop, scrollHeight, clientHeight } = element;
    const threshold = 100; // Generous threshold for better UX
    return scrollHeight - scrollTop - clientHeight <= threshold;
  }, []);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    const element = parentRef.current;
    if (!element) return;

    element.scrollTo({
      top: element.scrollHeight,
      behavior: "smooth",
    });
  }, []);

  // Handle scroll events to track user position
  const handleScroll = useCallback(() => {
    setIsUserAtBottom(checkIsAtBottom());
  }, [checkIsAtBottom]);

  // Auto-scroll logic: only when user is at bottom
  useEffect(() => {
    const currentLength = sortedEvents.length;
    const prevLength = prevEventsLengthRef.current;

    if (currentLength > prevLength && currentLength > 0 && isUserAtBottom) {
      // Use RAF to ensure DOM updates are complete
      requestAnimationFrame(() => {
        scrollToBottom();
      });
    }

    prevEventsLengthRef.current = currentLength;
  }, [sortedEvents.length, isUserAtBottom, scrollToBottom]);

  // Setup scroll listener
  useEffect(() => {
    const element = parentRef.current;
    if (!element) return;

    element.addEventListener("scroll", handleScroll, { passive: true });
    return () => element.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Image grid view
  if (hasImageFilter) {
    if (sortedEvents.length === 0) {
      return (
        <div className={styles[theme].noEvents}>
          <div>
            <div className={styles[theme].noEventsMessage}>NO EVENTS FOUND</div>
            {searchText && (
              <div className="text-xs opacity-70">
                No events matching: "{searchText}"
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={styles[theme].container}>
        <div className="overflow-y-auto h-full p-3">
          <div className="columns-3 gap-3">
            {sortedEvents.map((event) => {
              const url = extractImageUrl(event.content);
              if (!url) return null;
              return (
                <div key={event.id} className="mb-3 break-inside-avoid">
                  <img src={url} alt="" className="w-full h-auto rounded" />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // Country grid view when no search terms (regardless of events)
  // if (!hasSearchTerms) {
  //   const popularCountries = [
  //     { code: 'US', name: 'United States', flag: '🇺🇸' },
  //     { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  //     { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  //     { code: 'FR', name: 'France', flag: '🇫🇷' },
  //     { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  //     { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  //     { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  //     { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  //     { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  //     { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  //     { code: 'IN', name: 'India', flag: '🇮🇳' },
  //     { code: 'NL', name: 'Netherlands', flag: '🇳🇱' }
  //   ];

  //   return (
  //     <div className={styles[theme].container}>
  //       <div className="p-6">
  //         <div className="text-center mb-6">
  //           <h2 className={`text-xl font-bold mb-2 ${t.title}`}>Popular Countries</h2>
  //           <p className={`text-sm opacity-70 ${t.subtitle}`}>
  //             Click on a country to explore local channels and events
  //           </p>
  //         </div>
          
  //         <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
  //           {popularCountries.map((country) => (
  //             <button
  //               key={country.code}
  //               onClick={() => onSearch?.(`#${country.code.toLowerCase()}+`)}
  //               className={`p-4 rounded-lg border transition-all duration-200 hover:scale-105 ${t.countryCard}`}
  //               title={`Explore ${country.name}`}
  //             >
  //               <div className="text-3xl mb-2">{country.flag}</div>
  //               <div className={`font-bold ${t.countryCode}`}>{country.code}</div>
  //               <div className={`text-xs opacity-70 ${t.countryName}`}>{country.name}</div>
  //             </button>
  //           ))}
  //         </div>
  //       </div>
  //     </div>
  //   );
  // }

  // Empty state for search results
  if (sortedEvents.length === 0 && hasSearchTerms) {
    return (
      <div className={styles[theme].noEvents}>
        <div>
          <div className={styles[theme].noEventsMessage}>NO EVENTS FOUND</div>
          {searchText && (
            <div className="text-xs opacity-70">
              No events matching: "{searchText}"
            </div>
          )}
        </div>
      </div>
    );
  }

  const items = virtualizer.getVirtualItems();

  if (!nostrEnabled) return null;

  return (
    <>
      <div className={styles[theme].container}>
        <div className="flex-1 relative">
          <div
            ref={parentRef}
            className="h-full overflow-auto"
            style={{ contain: "strict", overflowAnchor: "none" }}
          >
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {items.map((virtualItem) => {
                const event = sortedEvents[virtualItem.index];
                if (!event) return null;

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
                    <EventItem
                      event={event}
                      searchText={searchText}
                      onSearch={onSearch}
                      onReply={onReply}
                      theme={theme}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {!isUserAtBottom && (
            <button
              onClick={scrollToBottom}
              className={
                unreadCount > 0 ? t.scrollButtonWithCount : t.scrollButton
              }
            >
              {unreadCount > 0 ? (
                <span className="flex items-center gap-1">
                  <span className="text-xs">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                  <span>↓</span>
                </span>
              ) : (
                "↓"
              )}
            </button>
          )}
        </div>
      </div>
    </>
  );
}