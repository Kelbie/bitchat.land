import { Station } from '@luigivampa/radio-browser-api';

// Enhanced interface that explicitly includes all the properties we need
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

export interface RadioPlayerState {
  isPlaying: boolean;
  currentStation: Station | null;
  volume: number;
  loading: boolean;
  error: string | null;
  currentTime: number;
  duration: number;
  bufferAvailable: number;
  isLive: boolean;
}

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
