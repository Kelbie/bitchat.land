export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
  relayUrl?: string; // URL of the relay that sent this event
}

export type GeoMercatorProps = {
  width: number;
  height: number;
  events?: boolean;
};

export interface FeatureShape {
  type: "Feature";
  id: string;
  geometry: { coordinates: [number, number][][]; type: "Polygon" };
  properties: { name: string };
}

export interface GeohashActivity {
  geohash: string;
  lastActivity: number;
  eventCount: number;
}

export interface DragState {
  isDragging: boolean;
  dragStart: { x: number; y: number } | null;
  hasDragged: boolean;
}

export interface ZoomState {
  zoomedGeohash: string | null;
  zoomScale: number;
  zoomTranslate: [number, number];
}

export interface GeohashBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}


