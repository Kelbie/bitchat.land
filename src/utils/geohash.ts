import ngeohash from 'ngeohash';

// Base32 alphabet used by geohash
export const GEOHASH_BASE32 = '0123456789bcdefghjkmnpqrstuvwxyz';

export interface GeohashCell {
  geohash: string;
  value: number;
  bounds: {
    minLat: number;
    minLon: number;
    maxLat: number;
    maxLon: number;
  };
}

// Convert geohash to GeoJSON Feature<Polygon>
export function geohashToGeoJSON(geohash: string): GeoJSON.Feature<GeoJSON.Polygon> {
  const bounds = ngeohash.decode_bbox(geohash);
  const [minLon, minLat, maxLon, maxLat] = bounds;
  
  return {
    type: 'Feature',
    properties: {
      geohash,
    },
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [minLon, minLat], // bottom-left
        [maxLon, minLat], // bottom-right
        [maxLon, maxLat], // top-right
        [minLon, maxLat], // top-left
        [minLon, minLat], // close polygon
      ]],
    },
  };
}

// Generate all layer 1 geohash cells (single character geohashes)
export function generateLayer1GeohashCells(): GeohashCell[] {
  const cells: GeohashCell[] = [];
  
  for (const char of GEOHASH_BASE32) {
    const bounds = ngeohash.decode_bbox(char);
    const [minLon, minLat, maxLon, maxLat] = bounds;
    
    cells.push({
      geohash: char,
      value: 1, // All cells have same value for layer 1
      bounds: {
        minLat,
        minLon,
        maxLat,
        maxLon,
      },
    });
  }
  
  return cells;
}

// Generate a grid of geohashes for a given bounding box and precision
export function generateGeohashGrid(
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number },
  precision: number = 4
): string[] {
  const geohashes: Set<string> = new Set();
  
  // Calculate step size based on precision
  const latStep = getGeohashLatStep(precision);
  const lonStep = getGeohashLonStep(precision);
  
  // Generate grid points
  for (let lat = bounds.minLat; lat <= bounds.maxLat; lat += latStep) {
    for (let lon = bounds.minLon; lon <= bounds.maxLon; lon += lonStep) {
      const geohash = ngeohash.encode(lat, lon, precision);
      geohashes.add(geohash);
    }
  }
  
  return Array.from(geohashes);
}

// Approximate step sizes for different geohash precisions
function getGeohashLatStep(precision: number): number {
  const steps = [45, 11.25, 1.4, 0.35, 0.044, 0.011, 0.0014, 0.00035];
  return steps[Math.min(precision - 1, steps.length - 1)] || 0.00035;
}

function getGeohashLonStep(precision: number): number {
  const steps = [45, 22.5, 2.8, 1.4, 0.18, 0.044, 0.0055, 0.0014];
  return steps[Math.min(precision - 1, steps.length - 1)] || 0.0014;
}

// Generate sample heatmap data
export function generateSampleHeatmapData(precision: number = 4): GeohashCell[] {
  // Focus on populated areas for more interesting visualization
  const hotspots = [
    { lat: 40.7128, lon: -74.0060, intensity: 0.9 }, // New York
    { lat: 51.5074, lon: -0.1278, intensity: 0.8 },  // London
    { lat: 35.6762, lon: 139.6503, intensity: 0.85 }, // Tokyo
    { lat: 37.7749, lon: -122.4194, intensity: 0.7 }, // San Francisco
    { lat: 48.8566, lon: 2.3522, intensity: 0.6 },   // Paris
    { lat: -33.8688, lon: 151.2093, intensity: 0.5 }, // Sydney
    { lat: 55.7558, lon: 37.6176, intensity: 0.4 },  // Moscow
    { lat: 19.4326, lon: -99.1332, intensity: 0.6 },  // Mexico City
    { lat: -23.5505, lon: -46.6333, intensity: 0.5 }, // São Paulo
    { lat: 28.6139, lon: 77.2090, intensity: 0.7 },   // Delhi
  ];
  
  const cells: GeohashCell[] = [];
  
  hotspots.forEach(hotspot => {
    // Generate geohashes around each hotspot
    const radius = 2; // degrees
    for (let latOffset = -radius; latOffset <= radius; latOffset += 0.5) {
      for (let lonOffset = -radius; lonOffset <= radius; lonOffset += 0.5) {
        const lat = hotspot.lat + latOffset;
        const lon = hotspot.lon + lonOffset;
        
        // Calculate distance from hotspot center
        const distance = Math.sqrt(latOffset * latOffset + lonOffset * lonOffset);
        const maxDistance = radius * Math.sqrt(2);
        
        // Create falloff effect
        const falloff = Math.max(0, 1 - (distance / maxDistance));
        const value = Math.round(hotspot.intensity * falloff * 100 * (0.5 + Math.random() * 0.5));
        
        if (value > 5) { // Only include cells with meaningful values
          const geohash = ngeohash.encode(lat, lon, precision);
          const bounds = ngeohash.decode_bbox(geohash);
          
          cells.push({
            geohash,
            value,
            bounds: {
              minLat: bounds[1],
              minLon: bounds[0],
              maxLat: bounds[3],
              maxLon: bounds[2],
            },
          });
        }
      }
    }
  });
  
  return cells;
}