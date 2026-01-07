/**
 * Stores Module
 * 
 * Centralized state management using Zustand
 */

// Event store
export {
  useEventStore,
  eventStore,
  type StoredEvent,
  type ServerEvent,
  type GeohashStats,
  type ConnectionState,
  type EventStore,
  type EventStoreState,
  type EventStoreActions,
} from './eventStore';

// Event selectors
export {
  // Selector functions
  selectAllEvents,
  selectEventsByGeohash,
  selectExactEventsByGeohash,
  selectCountsByChannel,
  selectUserMessageCounts,
  selectChannelList,
  selectFilteredEvents,
  selectGeohashActivity,
  selectLatestEventByChannel,
  
  // React hooks
  useAllEvents,
  useEventsByGeohash,
  useExactEventsByGeohash,
  useCountsByChannel,
  useUserMessageCounts,
  useFilteredEvents,
  useGeohashActivity,
  useEventStoreConnection,
  useLatestEventByChannel,
  
  // Types
  type ChannelMeta,
  type GeohashActivity,
} from './eventSelectors';

