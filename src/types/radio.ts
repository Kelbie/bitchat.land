import { Station } from '@luigivampa/radio-browser-api';

export interface StationWithDistance extends Station {
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
