import { useMemo } from "react";
import { NostrEvent } from "@/types";
import {
  parseSearchQuery,
  addGeohashToSearch,
  ParsedSearch,
} from "@/utils/searchParser";
import { colorForPeerSeed } from "@/utils/userColor";
import { hasImageUrl, extractImageUrl } from "@/utils/contentParsers";
import { RichContentDisplay } from "@/components/ui/content";
import React from "react"; // Added missing import
import { globalStyles } from "@/styles";
import { getPow } from "nostr-tools/nip13";
import { VirtualizedScroller } from "./VirtualizedScroller";
import {
  generateActionMessage,
  isActionMessage,
  type UserInfo,
} from "@/utils/commands";
import { useCallback } from "react";

const VALID_GEOHASH_CHARS = /^[0-9bcdefghjkmnpqrstuvwxyz]+$/;

interface RecentEventsProps {
  nostrEnabled: boolean;
  searchText: string;
  filteredEvents: NostrEvent[];
  onSearch?: (text: string) => void;
  forceScrollToBottom?: boolean;
  onReply?: (username: string, pubkeyHash: string) => void;
  theme: "matrix" | "material";
  currentUsername?: string;
  currentUserHash?: string;
}

// Separate EventItem component
type EventItemProps = {
  event: NostrEvent;
  searchText: string;
  onSearch?: (text: string) => void;
  onReply?: (username: string, pubkeyHash: string) => void;
  theme: "matrix" | "material";
  currentUsername?: string;
  currentUserHash?: string;
};

const EventItem = React.memo(
  ({
    event,
    searchText,
    onSearch,
    onReply,
    theme,
    currentUsername,
    currentUserHash,
  }: EventItemProps) => {
    const t = styles[theme];

    const geoTag = event.tags.find((tag: string[]) => tag[0] === "g");
    const groupTag = event.tags.find((tag: string[]) => tag[0] === "d");
    const nameTag = event.tags.find((tag: string[]) => tag[0] === "n");
    const clientTag = event.tags.find((tag: string[]) => tag[0] === "client");

    const rawGeohash = geoTag && typeof geoTag[1] === "string" ? geoTag[1] : "";
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
    const userColors = colorForPeerSeed(
      "nostr:" + event.pubkey.toLowerCase(),
      true
    );

    if (isActionMessage(event.content)) {
      return (
        <div
          className={`pb-4 ${t.eventItemContainer} ${t.messageCard} ${t.eventContent}`}
        >
          <div className="flex justify-start items-center h-4">
            <div className="flex items-center gap-2">
              <span className={t.hashTag}>
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

          <div className="mt-1 min-w-0 leading-relaxed break-words whitespace-pre-wrap font-mono tracking-wide">
            <span
              className={`text-sm italic ${
                theme === "matrix" ? "text-gray-400" : "text-gray-500"
              }`}
            >
              {event.content}
            </span>
            <span className="pl-2 text-[11px] font-mono text-gray-500">
              [{isToday ? time : `${date} ${time}`}]
            </span>
            {onSearch && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSearch(
                      addGeohashToSearch(searchText, rawGeohash.toLowerCase())
                    );
                  }}
                  className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-500 hover:bg-gray-600 hover:text-gray-200 transition-colors"
                >
                  #
                  {eventGeohash
                    ? eventGeohash.toUpperCase()
                    : groupTagValue.toUpperCase()}
                </button>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div
        className={`pb-4 ${t.eventItemContainer} ${t.messageCard} ${t.eventContent}`}
      >
        <div className="flex justify-start items-center h-4">
          <div className="flex items-center gap-2">
            <span className={t.hashTag}>
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
            <span className={t.hashTag}>•</span>
            <span className="text-[11px] font-mono text-gray-500">
              PoW {getPow(event.id)}
            </span>
            {event.relayUrl && (
              <>
                <span className={t.hashTag}>•</span>
                <span className="text-[11px] font-mono text-gray-500">
                  wss://{event.relayUrl.replace(/^wss?:\/\//, "").split("/")[0]}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="mt-1 min-w-0 leading-relaxed break-words whitespace-pre-wrap font-mono tracking-wide">
          <span className="text-sm font-bold" style={{ color: userColors.hex }}>
            &lt;@{username}#{pubkeyHash}&gt;
          </span>
          <span className="pl-2 text-[15px]" style={{ color: userColors.hex }}>
            <RichContentDisplay content={event.content || ""} theme={theme} />
          </span>
          <span className="pl-2 text-[11px] font-mono text-gray-500">
            [{isToday ? time : `${date} ${time}`}]
          </span>

          <div className="mt-2 flex items-center gap-2">
            {onSearch && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onSearch(
                    addGeohashToSearch(searchText, rawGeohash.toLowerCase())
                  );
                }}
                className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-500 hover:bg-gray-600 hover:text-gray-200 transition-colors"
              >
                #
                {eventGeohash
                  ? eventGeohash.toUpperCase()
                  : groupTagValue.toUpperCase()}
              </button>
            )}
            {onReply && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onReply(username, pubkeyHash);
                }}
                className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-500 hover:bg-gray-600 hover:text-gray-200 transition-colors"
              >
                ↪ Reply
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.updateChatInputValue) {
                  const currentUser: UserInfo = {
                    username: currentUsername || "Anonymous",
                    publicKey: currentUserHash || "0000",
                  };
                  const actionMessage = generateActionMessage(
                    "hug",
                    username,
                    pubkeyHash,
                    currentUser
                  );
                  window.updateChatInputValue(
                    actionMessage,
                    actionMessage.length
                  );
                }
              }}
              className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-500 hover:bg-gray-600 hover:text-gray-200 transition-colors"
              title="Give a warm hug"
            >
              🫂 Hug
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.updateChatInputValue) {
                  const currentUser: UserInfo = {
                    username: currentUsername || "Anonymous",
                    publicKey: currentUserHash || "0000",
                  };
                  const actionMessage = generateActionMessage(
                    "slap",
                    username,
                    pubkeyHash,
                    currentUser
                  );
                  window.updateChatInputValue(
                    actionMessage,
                    actionMessage.length
                  );
                }
              }}
              className="text-xs px-2 py-1 rounded border border-gray-600 text-gray-500 hover:bg-gray-600 hover:text-gray-200 transition-colors"
              title="Slap with a trout"
            >
              🐟 Slap
            </button>
          </div>
        </div>
      </div>
    );
  }
);

EventItem.displayName = "EventItem";

const styles = globalStyles["RecentEvents"];

export function RecentEvents({
  nostrEnabled,
  searchText,
  filteredEvents,
  onSearch,
  onReply,
  theme,
  currentUsername,
  currentUserHash,
}: RecentEventsProps) {
  // Parse search and filter events
  const parsedSearch: ParsedSearch = parseSearchQuery(searchText);
  const hasSearchTerms =
    parsedSearch.text ||
    parsedSearch.geohashes.length > 0 ||
    parsedSearch.users.length > 0 ||
    parsedSearch.clients.length > 0 ||
    parsedSearch.colors.length > 0 ||
    parsedSearch.has.length > 0;

  const searchFilteredEvents = filteredEvents.filter((event) => {
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
          const includeChildren: boolean =
            parsedSearch.includeChildren[index] ?? false;

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

  const sortedEvents = searchFilteredEvents.sort(
    (a, b) => a.created_at - b.created_at
  );
  const hasImageFilter = parsedSearch.has?.includes("image") || false;

  // Create render function for VirtualizedScroller
  const renderEvent = useMemo(
    () => (event: NostrEvent) =>
      (
        <EventItem
          event={event}
          searchText={searchText}
          onSearch={onSearch}
          onReply={onReply}
          theme={theme}
          currentUsername={currentUsername}
          currentUserHash={currentUserHash}
        />
      ),
    [searchText, onSearch, onReply, theme, currentUsername, currentUserHash]
  );

  const getEstimatedSize = useCallback((_index: number, item: NostrEvent) => {
    // Action messages are shorter
    if (isActionMessage(item.content)) {
      return 100;
    }
    // Messages with images are taller
    if (hasImageUrl(item.content)) {
      return 300;
    }
    // Regular messages
    return 180;
  }, []);

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
      <div className={`${styles[theme].container} p-3 overflow-y-auto h-full`}>
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
    );
  }

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

  if (!nostrEnabled) return null;

  return (
    <div className={styles[theme].container}>
      <VirtualizedScroller<NostrEvent>
        items={sortedEvents}
        getEstimatedItemSize={getEstimatedSize}
        keyExtractor={(item) => `${item.id}-${item.created_at}`}
        maintainScrollPosition={false}
        renderItem={renderEvent}
        estimatedItemSize={180}
        overscan={3}
        scrollToBottomOnNewItems={true}
        maintainScrollAtEnd={{ 
          onLayout: true, 
          onItemLayout: true, 
          onDataChange: true 
        }}
        className="h-full"
        resetKey={searchText}
        enableAverages={true}
        recycleItems={true}
        alignItemsAtEnd={true}
      />
    </div>
  );
}
