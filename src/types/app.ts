import { ElementType, ReactNode } from "react";

// Core Types
export type Theme = "matrix" | "material";

// Filter Types
export interface TagData {
  tag: string;
  totalVotes: number;
  stationCount: number;
  averageVotes: number;
}

export interface Country {
  countryCode: string;
  countryName: string;
}

export interface FilterState {
  selectedTags: Set<string>;
  selectedCountries: Set<string>;
}

export interface FilterActions {
  onTagToggle: (tag: string) => void;
  onClearTags: () => void;
  onCountryToggle: (countryCode: string) => void;
  onClearCountries: () => void;
}

export interface FilterData {
  allTags: string[];
  tagPopularity: Record<string, TagData>;
  allCountries: Country[];
  filteredStationsCount: number;
  totalStationsCount: number;
}

// Radio Types
export interface StationWithDistance {
  // Core station properties
  changeId: string;
  id: string;
  name: string;
  url: string;
  urlResolved: string;
  homepage: string;
  favicon: string;
  tags: string[];
  country: string;
  countryCode: string;
  state: string;
  language: string[];
  votes: number;
  lastChangeTime: Date;
  codec: string;
  bitrate: number;
  hls: boolean;
  lastCheckOk: boolean;
  lastCheckTime: Date;
  lastCheckOkTime: Date;
  lastLocalCheckTime: Date;
  clickTimestamp: Date;
  clickCount: number;
  clickTrend: number;
  geoLat: number | null;
  geoLong: number | null;
  
  // Additional properties from our extension
  distanceKm: number;
  isMusicStation: boolean;
}

// Player Types
export interface PlayerState {
  currentStation: StationWithDistance | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

export interface PlayerActions {
  onPlayPause: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  formatTime: (time: number) => string;
}

// Component Props
export interface PlayerBarProps {
  theme: Theme;
  state: PlayerState;
  actions: PlayerActions;
}

export interface FilterSectionProps {
  theme: Theme;
  data: FilterData;
  state: FilterState;
  actions: FilterActions;
}

// Additional Radio Types
export interface CountryInRegion {
  countryCode: string;
  countryName: string;
  distance?: number; // Distance from geohash center in km
}

export interface GeohashInfo {
  geohash: string;
  precision: number;
  boundingBox: {
    minLat: number;
    minLon: number;
    maxLat: number;
    maxLon: number;
  };
  center: {
    latitude: number;
    longitude: number;
  };
}

export interface RadioPlayerState {
  isPlaying: boolean;
  currentStation: StationWithDistance | null;
  volume: number;
  loading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  bufferAvailable: number;
  isLive: boolean;
}

// Channel Types
export interface ChannelMeta {
  key: string;
  isPinned: boolean;
  hasMessages: boolean;
  eventKind: number;
}

export interface ChannelListProps {
  channels: ChannelMeta[];
  selectedChannel: string;
  unreadCounts: Record<string, number>;
  onOpenChannel: (ch: string) => void;
  theme?: Theme;
  pinnedChannels?: string[];
  onPinnedChannelsChange?: (pinnedChannels: string[]) => void;
}

export interface ChannelItemProps {
  channelKey: string;
  category: 'pinned' | 'geohash' | 'standard' | 'country';
  isSelected: boolean;
  unread: number;
  isPinned: boolean;
  onOpenChannel: (channelKey: string) => void;
  onHeartClick: (e: React.MouseEvent, channelKey: string) => void;
  theme: Theme;
  eventKind?: number;
}

export interface ChannelToggleProps {
  viewMode: 'geohash' | 'country';
  onViewModeChange: (mode: 'geohash' | 'country') => void;
  theme: Theme;
}

export interface CategorizedChannels {
  pinned: string[];
  geohash: string[];
  standard: string[];
}

export interface CountryCategorizedChannels {
  pinned: string[];
  countries: Record<string, string[]>;
  standard: string[];
}

// User Types
export interface UserMeta {
  pubkey: string;
  displayName: string;
  isPinned: boolean;
  hasMessages: boolean;
  eventKind: number;
  lastSeen: number;
  messageCount: number;
}

export interface StoredEvent {
  pubkey: string;
  tags: Array<[string, string]>;
}

export interface UserListProps {
  users: UserMeta[];
  selectedUser: string | null;
  onSelectUser: (pubkey: string) => void;
  searchText: string;
  filteredEvents: StoredEvent[];
  theme?: Theme;
}

export interface UserItemProps {
  user: UserMeta;
  isSelected: boolean;
  onSelectUser: (pubkey: string) => void;
  theme: Theme;
}

// Button Types
export interface ButtonProps<T extends ElementType = 'button'> {
  as?: T;
  active?: boolean;
  theme?: Theme;
  className?: string;
  children: ReactNode;
}

export interface ToggleButtonProps<T extends ElementType = 'button'> {
  as?: T;
  isSelected?: boolean;
  theme?: Theme;
  className?: string;
  children: ReactNode;
  badge?: string | number;
  title?: string;
}

export interface InputProps<T extends ElementType = 'input'> {
  as?: T;
  theme?: Theme;
  className?: string;
}

// Radio Page Types
export interface RadioPageProps {
  searchText: string;
  theme: Theme;
}
