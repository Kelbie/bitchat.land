// Event kinds for different channel types
export const EVENT_KINDS = {
  GEO_CHANNEL: 20000,    // For geohash-based channels
  STANDARD_CHANNEL: 23333, // For standard text channels
} as const;

export type EventKind = typeof EVENT_KINDS[keyof typeof EVENT_KINDS];
