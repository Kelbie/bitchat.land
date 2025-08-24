import { BASE32 } from "../constants/projections";
import { GeohashBounds } from "../types";

// Fixed function to decode any single character geohash to its bounding box
export function decodeGeohash(geohash: string): GeohashBounds {
  const base32 = "0123456789bcdefghjkmnpqrstuvwxyz";

  let latMin = -90.0,
    latMax = 90.0;
  let lngMin = -180.0,
    lngMax = 180.0;
  let isEven = true; // Start with longitude

  for (let i = 0; i < geohash.length; i++) {
    const char = geohash[i];
    const idx = base32.indexOf(char);

    if (idx === -1) continue;

    // Process each of the 5 bits
    for (let mask = 16; mask > 0; mask >>= 1) {
      const bit = (idx & mask) !== 0;

      if (isEven) {
        // Longitude bit
        const lngMid = (lngMin + lngMax) / 2;
        if (bit) {
          lngMin = lngMid;
        } else {
          lngMax = lngMid;
        }
      } else {
        // Latitude bit
        const latMid = (latMin + latMax) / 2;
        if (bit) {
          latMin = latMid;
        } else {
          latMax = latMid;
        }
      }

      isEven = !isEven;
    }
  }

  return {
    minLat: latMin,
    maxLat: latMax,
    minLng: lngMin,
    maxLng: lngMax,
  };
}

// Function to create a polygon path from geohash bounds
export function createGeohashPath(bounds: GeohashBounds, projection: any): string | null {
  const { minLat, maxLat, minLng, maxLng } = bounds;

  // Handle antimeridian crossing
  const crossesAntimeridian = maxLng - minLng > 180;

  if (crossesAntimeridian) {
    // Split into two polygons for antimeridian crossing
    const leftBounds = { minLat, maxLat, minLng: -180, maxLng };
    const rightBounds = { minLat, maxLat, minLng, maxLng: 180 };

    const leftPath = createSingleGeohashPath(leftBounds, projection);
    const rightPath = createSingleGeohashPath(rightBounds, projection);

    if (leftPath && rightPath) {
      return leftPath + " " + rightPath;
    } else if (leftPath) {
      return leftPath;
    } else if (rightPath) {
      return rightPath;
    }
    return null;
  }

  return createSingleGeohashPath(bounds, projection);
}

// Create path for a single geohash rectangle
function createSingleGeohashPath(bounds: GeohashBounds, projection: any): string | null {
  const { minLat, maxLat, minLng, maxLng } = bounds;

  // Clamp latitudes to valid range
  const clampedMinLat = Math.max(minLat, -85);
  const clampedMaxLat = Math.min(maxLat, 85);

  // Create more points along the edges to handle projection curves
  const steps = Math.max(10, Math.ceil(Math.abs(maxLng - minLng) / 10));
  const latSteps = Math.max(
    10,
    Math.ceil(Math.abs(clampedMaxLat - clampedMinLat) / 10)
  );
  const points = [];

  // Top edge (left to right)
  for (let i = 0; i <= steps; i++) {
    const lng = minLng + (maxLng - minLng) * (i / steps);
    points.push([lng, clampedMaxLat]);
  }

  // Right edge (top to bottom)
  for (let i = 1; i <= latSteps; i++) {
    const lat =
      clampedMaxLat - (clampedMaxLat - clampedMinLat) * (i / latSteps);
    points.push([maxLng, lat]);
  }

  // Bottom edge (right to left)
  for (let i = 1; i <= steps; i++) {
    const lng = maxLng - (maxLng - minLng) * (i / steps);
    points.push([lng, clampedMinLat]);
  }

  // Left edge (bottom to top)
  for (let i = 1; i < latSteps; i++) {
    const lat =
      clampedMinLat + (clampedMaxLat - clampedMinLat) * (i / latSteps);
    points.push([minLng, lat]);
  }

  // Project all points and filter out invalid ones
  const projectedPoints = points
    .map((point) => projection(point))
    .filter(
      (p) =>
        p !== null &&
        p !== undefined &&
        !isNaN(p[0]) &&
        !isNaN(p[1]) &&
        isFinite(p[0]) &&
        isFinite(p[1])
    );

  if (projectedPoints.length < 3) return null;

  // Create SVG path
  let pathData = `M ${projectedPoints[0][0]},${projectedPoints[0][1]}`;
  for (let i = 1; i < projectedPoints.length; i++) {
    pathData += ` L ${projectedPoints[i][0]},${projectedPoints[i][1]}`;
  }
  pathData += " Z";

  return pathData;
}

// Generate geohashes for specified precision level
export function generateGeohashes(precision: number, filterPrefix: string | null = null): string[] {
  if (precision === 1) {
    const singleChars = BASE32.split("");
    return filterPrefix
      ? singleChars.filter((char) => char.startsWith(filterPrefix))
      : singleChars;
  }

  const geohashes: string[] = [];

  // Recursive function to generate all combinations
  const generateCombinations = (current: string, remainingDepth: number) => {
    if (remainingDepth === 0) {
      geohashes.push(current);
      return;
    }

    for (const char of BASE32) {
      generateCombinations(current + char, remainingDepth - 1);
    }
  };

  generateCombinations("", precision);

  // Filter by prefix if provided
  return filterPrefix
    ? geohashes.filter((hash) => hash.startsWith(filterPrefix))
    : geohashes;
}

// Function to generate localized geohashes for a given prefix
export function generateLocalizedGeohashes(prefix: string): string[] {
  return BASE32.split("").map((char) => prefix + char);
}

// Function to find matching geohash prefix for incoming events
export function findMatchingGeohash(
  eventGeohash: string,
  searchGeohash: string,
  currentGeohashes: string[]
): string | null {
  if (!eventGeohash) return null;

  const shouldShowLocalizedPrecision =
    searchGeohash &&
    searchGeohash.length >= 1 &&
    /^[0-9bcdefghjkmnpqrstuvwxyz]+$/i.test(searchGeohash);

  if (shouldShowLocalizedPrecision) {
    // When searching, check if the event falls within the search area
    if (eventGeohash.startsWith(searchGeohash.toLowerCase())) {
      // Find which localized geohash this event belongs to
      const localizedGeohash = eventGeohash.substring(
        0,
        searchGeohash.length + 1
      );
      if (currentGeohashes.includes(localizedGeohash)) {
        return localizedGeohash;
      }
    }
  } else {
    // Global view - find the geohash from currentGeohashes that this event falls into
    for (const displayGeohash of currentGeohashes) {
      if (eventGeohash.startsWith(displayGeohash)) {
        return displayGeohash;
      }
    }
  }

  return null;
}

// Function to get hierarchical event counts for a search prefix
export function getHierarchicalCounts(
  searchPrefix: string,
  allEventsByGeohash: Map<string, number>
): { direct: number; total: number } {
  if (!searchPrefix) return { direct: 0, total: 0 };

  let directCount = 0;
  let totalCount = 0;

  for (const [geohash, count] of allEventsByGeohash.entries()) {
    if (geohash.startsWith(searchPrefix)) {
      totalCount += count;
      if (geohash === searchPrefix) {
        directCount = count;
      }
    }
  }

  return { direct: directCount, total: totalCount };
}
