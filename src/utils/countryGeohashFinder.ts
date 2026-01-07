/**
 * Country Geohash Finder
 * 
 * Smart algorithm to find all geohashes that overlap with or are contained within
 * a country's borders. Uses recursive subdivision to efficiently find the minimal
 * set of geohashes that cover the country.
 */

import { decodeGeohash } from './geohashUtils';
import { BASE32 } from '@/constants';

// Types for the algorithm
export interface GeohashResult {
  geohash: string;
  status: 'contained' | 'overlapping' | 'partial';
  depth: number;
}

export interface CountryGeohashResult {
  countryCode: string;
  countryName: string;
  geohashes: GeohashResult[];
  fullyContained: string[];  // Geohashes fully inside the country (no need to go deeper)
  overlapping: string[];     // Geohashes that partially overlap (border cases)
  totalCount: number;
  maxDepth: number;
  computeTimeMs: number;
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 */
function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [x, y] = point;
  let inside = false;
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Check if two line segments intersect
 */
function segmentsIntersect(
  p1: [number, number], p2: [number, number],
  p3: [number, number], p4: [number, number]
): boolean {
  const d1 = direction(p3, p4, p1);
  const d2 = direction(p3, p4, p2);
  const d3 = direction(p1, p2, p3);
  const d4 = direction(p1, p2, p4);
  
  if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
      ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
    return true;
  }
  
  if (d1 === 0 && onSegment(p3, p4, p1)) return true;
  if (d2 === 0 && onSegment(p3, p4, p2)) return true;
  if (d3 === 0 && onSegment(p1, p2, p3)) return true;
  if (d4 === 0 && onSegment(p1, p2, p4)) return true;
  
  return false;
}

function direction(p1: [number, number], p2: [number, number], p3: [number, number]): number {
  return (p3[0] - p1[0]) * (p2[1] - p1[1]) - (p2[0] - p1[0]) * (p3[1] - p1[1]);
}

function onSegment(p1: [number, number], p2: [number, number], p: [number, number]): boolean {
  return Math.min(p1[0], p2[0]) <= p[0] && p[0] <= Math.max(p1[0], p2[0]) &&
         Math.min(p1[1], p2[1]) <= p[1] && p[1] <= Math.max(p1[1], p2[1]);
}

/**
 * Check if a rectangle overlaps with a polygon
 */
function rectangleOverlapsPolygon(
  rect: { minLng: number; maxLng: number; minLat: number; maxLat: number },
  polygon: [number, number][]
): boolean {
  // Check if any corner of the rectangle is inside the polygon
  const corners: [number, number][] = [
    [rect.minLng, rect.minLat],
    [rect.maxLng, rect.minLat],
    [rect.maxLng, rect.maxLat],
    [rect.minLng, rect.maxLat],
  ];
  
  for (const corner of corners) {
    if (pointInPolygon(corner, polygon)) {
      return true;
    }
  }
  
  // Check if any vertex of the polygon is inside the rectangle
  for (const vertex of polygon) {
    if (vertex[0] >= rect.minLng && vertex[0] <= rect.maxLng &&
        vertex[1] >= rect.minLat && vertex[1] <= rect.maxLat) {
      return true;
    }
  }
  
  // Check if any edge of the rectangle intersects with any edge of the polygon
  const rectEdges: [[number, number], [number, number]][] = [
    [corners[0], corners[1]],
    [corners[1], corners[2]],
    [corners[2], corners[3]],
    [corners[3], corners[0]],
  ];
  
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    for (const [p1, p2] of rectEdges) {
      if (segmentsIntersect(p1, p2, polygon[i], polygon[j])) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if a rectangle is fully contained within a polygon
 */
function rectangleContainedInPolygon(
  rect: { minLng: number; maxLng: number; minLat: number; maxLat: number },
  polygon: [number, number][]
): boolean {
  // All corners must be inside the polygon
  const corners: [number, number][] = [
    [rect.minLng, rect.minLat],
    [rect.maxLng, rect.minLat],
    [rect.maxLng, rect.maxLat],
    [rect.minLng, rect.maxLat],
  ];
  
  for (const corner of corners) {
    if (!pointInPolygon(corner, polygon)) {
      return false;
    }
  }
  
  // Also check that no polygon edges intersect the rectangle edges
  // (handles cases where polygon has concavities inside the rectangle)
  const rectEdges: [[number, number], [number, number]][] = [
    [corners[0], corners[1]],
    [corners[1], corners[2]],
    [corners[2], corners[3]],
    [corners[3], corners[0]],
  ];
  
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    for (const [p1, p2] of rectEdges) {
      if (segmentsIntersect(p1, p2, polygon[i], polygon[j])) {
        return false;
      }
    }
  }
  
  return true;
}

/**
 * Extract polygon coordinates from GeoJSON geometry
 */
function extractPolygons(geometry: GeoJSON.Geometry): [number, number][][] {
  const polygons: [number, number][][] = [];
  
  if (geometry.type === 'Polygon') {
    // Use the outer ring (first ring)
    polygons.push(geometry.coordinates[0] as [number, number][]);
  } else if (geometry.type === 'MultiPolygon') {
    for (const poly of geometry.coordinates) {
      polygons.push(poly[0] as [number, number][]);
    }
  }
  
  return polygons;
}

/**
 * Check relationship between a geohash and a country geometry
 */
type GeohashRelation = 'outside' | 'overlapping' | 'contained';

function checkGeohashRelation(
  geohash: string,
  polygons: [number, number][][]
): GeohashRelation {
  const bounds = decodeGeohash(geohash);
  const rect = {
    minLng: bounds.minLng,
    maxLng: bounds.maxLng,
    minLat: bounds.minLat,
    maxLat: bounds.maxLat,
  };
  
  let anyOverlap = false;
  
  for (const polygon of polygons) {
    if (rectangleContainedInPolygon(rect, polygon)) {
      return 'contained'; // Fully inside at least one polygon
    }
    
    if (rectangleOverlapsPolygon(rect, polygon)) {
      anyOverlap = true;
    }
  }
  
  // Check if the geohash might contain the entire polygon(s)
  // This happens when the geohash is larger than the country
  for (const polygon of polygons) {
    for (const vertex of polygon) {
      if (vertex[0] >= rect.minLng && vertex[0] <= rect.maxLng &&
          vertex[1] >= rect.minLat && vertex[1] <= rect.maxLat) {
        anyOverlap = true;
        break;
      }
    }
    if (anyOverlap) break;
  }
  
  if (anyOverlap) {
    return 'overlapping';
  }
  
  return 'outside';
}

/**
 * Find all geohashes that overlap with a country
 * 
 * @param geometry - GeoJSON geometry of the country
 * @param maxDepth - Maximum geohash precision (default 3, matching Android app)
 */
export function findCountryGeohashes(
  geometry: GeoJSON.Geometry,
  countryCode: string,
  countryName: string,
  maxDepth: number = 3
): CountryGeohashResult {
  const startTime = performance.now();
  
  const polygons = extractPolygons(geometry);
  if (polygons.length === 0) {
    return {
      countryCode,
      countryName,
      geohashes: [],
      fullyContained: [],
      overlapping: [],
      totalCount: 0,
      maxDepth: 0,
      computeTimeMs: performance.now() - startTime,
    };
  }
  
  const results: GeohashResult[] = [];
  const fullyContained: string[] = [];
  const overlapping: string[] = [];
  
  // Recursive function to explore geohashes
  function explore(prefix: string, depth: number): void {
    const relation = checkGeohashRelation(prefix, polygons);
    
    if (relation === 'outside') {
      // This geohash doesn't touch the country at all
      return;
    }
    
    if (relation === 'contained') {
      // This geohash is fully inside the country - no need to go deeper
      results.push({ geohash: prefix, status: 'contained', depth });
      fullyContained.push(prefix);
      return;
    }
    
    // relation === 'overlapping'
    // Always add overlapping geohashes at ALL depths (including parents like "s", "s8", "s8n")
    results.push({ geohash: prefix, status: 'overlapping', depth });
    overlapping.push(prefix);
    
    if (depth >= maxDepth) {
      // We've reached max depth, don't explore children
      return;
    }
    
    // Explore all 32 children to find more specific geohashes
    for (const char of BASE32) {
      explore(prefix + char, depth + 1);
    }
  }
  
  // Start with all base-32 single character geohashes
  for (const char of BASE32) {
    explore(char, 1);
  }
  
  const computeTimeMs = performance.now() - startTime;
  
  return {
    countryCode,
    countryName,
    geohashes: results,
    fullyContained,
    overlapping,
    totalCount: results.length,
    maxDepth: Math.max(...results.map(r => r.depth), 0),
    computeTimeMs,
  };
}

/**
 * Get a summary of geohashes at each depth level
 */
export function summarizeByDepth(result: CountryGeohashResult): Record<number, { contained: number; overlapping: number }> {
  const summary: Record<number, { contained: number; overlapping: number }> = {};
  
  for (const gh of result.geohashes) {
    if (!summary[gh.depth]) {
      summary[gh.depth] = { contained: 0, overlapping: 0 };
    }
    
    if (gh.status === 'contained') {
      summary[gh.depth].contained++;
    } else {
      summary[gh.depth].overlapping++;
    }
  }
  
  return summary;
}

/**
 * Format geohashes for display, grouped by depth
 */
export function formatGeohashesForDisplay(result: CountryGeohashResult): {
  depth: number;
  contained: string[];
  overlapping: string[];
}[] {
  const byDepth: Map<number, { contained: string[]; overlapping: string[] }> = new Map();
  
  for (const gh of result.geohashes) {
    if (!byDepth.has(gh.depth)) {
      byDepth.set(gh.depth, { contained: [], overlapping: [] });
    }
    
    const entry = byDepth.get(gh.depth)!;
    if (gh.status === 'contained') {
      entry.contained.push(gh.geohash);
    } else {
      entry.overlapping.push(gh.geohash);
    }
  }
  
  return Array.from(byDepth.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([depth, data]) => ({
      depth,
      contained: data.contained.sort(),
      overlapping: data.overlapping.sort(),
    }));
}

