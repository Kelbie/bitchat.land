# GeoRelay Implementation

This implementation adds geolocation-based relay selection to the Nostr client, following the Swift implementation structure closely.

## Overview

The GeoRelay system automatically selects the closest Nostr relays based on the geographic location of geohashes, improving message delivery performance and reducing latency.

## Components

### 1. GeoRelayDirectory (`src/utils/geoRelayDirectory.ts`)

A singleton class that manages relay GPS data and provides methods to find the closest relays to any geohash or coordinate.

**Key Methods:**
- `closestRelays(geohash, count)` - Get closest relays to a geohash
- `closestRelaysByCoords(lat, lon, count)` - Get closest relays to coordinates
- `prefetchIfNeeded()` - Refresh relay data from remote source

**Features:**
- Automatic caching in localStorage
- Fallback to bundled CSV data
- Remote refresh every 24 hours
- Haversine distance calculation

### 2. Relay Data (`public/relays/online_relays_gps.csv`)

Bundled CSV file containing relay hostnames and GPS coordinates. Mirrors the Swift implementation's relay data.

### 3. Integration with useNostr Hook

The `useNostr` hook now includes:
- `getGeorelayRelays(geohash, count)` - Get relays for specific geohash
- `subscribeToGeohash(geohash, kinds)` - Subscribe to events using georelay relays
- Automatic relay selection based on geohash location

## Usage

### Basic Relay Selection

```typescript
import { GeoRelayDirectory } from '../utils/geoRelayDirectory';

// Get closest relays to a geohash
const relays = GeoRelayDirectory.shared.closestRelays('u4pruyd', 5);
// Returns: ['wss://relay.damus.io', 'wss://nos.lol', ...]

// Get closest relays to coordinates
const relays = GeoRelayDirectory.shared.closestRelaysByCoords(37.7749, -122.4194, 3);
```

### In Nostr Hook

```typescript
const { getGeorelayRelays, subscribeToGeohash } = useNostr(searchGeohash, currentGeohashes, onGeohashAnimate);

// Get relays for specific geohash
const relays = getGeorelayRelays('u4pruyd', 5);

// Subscribe to events using georelay relays
const sub = subscribeToGeohash('u4pruyd', [20000, 23333]);
```

## How It Works

1. **Initialization**: GeoRelayDirectory loads cached data or bundled CSV on startup
2. **Geohash Decoding**: Converts geohash strings to center coordinates using the same algorithm as Swift
3. **Distance Calculation**: Uses Haversine formula to calculate distances between coordinates
4. **Relay Selection**: Sorts relays by distance and returns the closest ones
5. **Automatic Refresh**: Fetches updated relay data from remote source every 24 hours

## Benefits

- **Lower Latency**: Messages are sent to geographically closer relays
- **Better Reliability**: Reduces network hops for local communication
- **Automatic Optimization**: No manual relay configuration needed
- **Fallback Support**: Uses default relays when georelay data is unavailable

## Testing

A test component (`GeoRelayTest`) is included to verify functionality:
- Geohash decoding accuracy
- Relay selection logic
- CSV parsing
- Coordinate-based selection

## Future Enhancements

- Real-time relay health monitoring
- Dynamic relay weight adjustment based on performance
- Integration with relay reputation systems
- Support for custom relay lists

## Notes

- The implementation closely mirrors the Swift version for consistency
- Uses localStorage for caching (browser equivalent of iOS UserDefaults)
- Bundled CSV provides immediate fallback when remote data is unavailable
- All distance calculations use the same Haversine formula as the Swift version
