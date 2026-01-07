/**
 * useBoundaryCache Hook
 * 
 * Provides caching functionality for Mapbox Boundaries data.
 * Implements cache-through pattern: check cache first, fetch if missing, cache result.
 */

import { useCallback, useRef } from 'react';
import type { Map as MapboxMap, MapGeoJSONFeature } from 'mapbox-gl';
import {
  getCachedBoundary,
  cacheBoundary,
  getCachedChildren,
  calculateBounds,
  type AdminLevel as CacheAdminLevel,
  type CachedBoundary,
  type BBox,
} from '@/services/boundariesCacheService';
import type { AdminLevel, DrilldownStep, MapboxBoundaryFeature } from '../types';
import { BOUNDARY_TILESETS } from '../types';

/**
 * Convert our AdminLevel to cache AdminLevel
 */
function toCacheLevel(level: AdminLevel): CacheAdminLevel | null {
  if (level === 'world') return null;
  return level as CacheAdminLevel;
}

/**
 * Hook for caching and retrieving boundary data
 */
export function useBoundaryCache() {
  // Track in-flight requests to prevent duplicates
  const pendingRequests = useRef<Map<string, Promise<CachedBoundary | null>>>(new Map());

  /**
   * Get a boundary from cache or extract from map
   */
  const getBoundary = useCallback(async (
    map: MapboxMap,
    featureId: string,
    level: AdminLevel,
    worldview: string,
    feature?: MapboxBoundaryFeature
  ): Promise<CachedBoundary | null> => {
    const cacheLevel = toCacheLevel(level);
    if (!cacheLevel) return null;

    const cacheKey = `${cacheLevel}:${featureId}:${worldview}`;

    // Check if request is already in flight
    const pending = pendingRequests.current.get(cacheKey);
    if (pending) {
      return pending;
    }

    // Create promise for this request
    const requestPromise = (async () => {
      try {
        // 1. Check cache first
        const cached = await getCachedBoundary(cacheLevel, featureId, worldview);
        if (cached) {
          return cached;
        }

        // 2. If we have the feature, extract and cache it
        if (feature) {
          const bounds = calculateBounds(feature.geometry);
          const boundaryData: Omit<CachedBoundary, 'cacheKey' | 'cachedAt'> = {
            id: featureId,
            level: cacheLevel,
            worldview,
            geometry: feature.geometry,
            properties: feature.properties,
            bounds,
            parentId: feature.properties.parent_id,
          };

          await cacheBoundary(boundaryData);
          return { ...boundaryData, cacheKey, cachedAt: Date.now() };
        }

        // 3. Try to query the feature from the map
        const tilesetConfig = BOUNDARY_TILESETS[cacheLevel];
        if (!tilesetConfig) return null;

        // Query source features to find the boundary
        const sourceFeatures = map.querySourceFeatures(cacheLevel, {
          sourceLayer: tilesetConfig.sourceLayer,
          filter: ['==', ['id'], featureId],
        });

        if (sourceFeatures.length > 0) {
          const sourceFeature = sourceFeatures[0] as unknown as MapboxBoundaryFeature;
          const bounds = calculateBounds(sourceFeature.geometry);
          
          const boundaryData: Omit<CachedBoundary, 'cacheKey' | 'cachedAt'> = {
            id: featureId,
            level: cacheLevel,
            worldview,
            geometry: sourceFeature.geometry,
            properties: sourceFeature.properties,
            bounds,
            parentId: sourceFeature.properties.parent_id,
          };

          await cacheBoundary(boundaryData);
          return { ...boundaryData, cacheKey, cachedAt: Date.now() };
        }

        return null;
      } finally {
        // Clean up pending request
        pendingRequests.current.delete(cacheKey);
      }
    })();

    pendingRequests.current.set(cacheKey, requestPromise);
    return requestPromise;
  }, []);

  /**
   * Get children of a boundary from cache
   */
  const getCachedChildBoundaries = useCallback(async (
    parentId: string,
    worldview: string
  ): Promise<CachedBoundary[]> => {
    return getCachedChildren(parentId, worldview);
  }, []);

  /**
   * Cache a boundary from a map feature
   */
  const cacheFromFeature = useCallback(async (
    feature: MapGeoJSONFeature | MapboxBoundaryFeature,
    level: AdminLevel,
    worldview: string,
    parentId?: string
  ): Promise<CachedBoundary | null> => {
    const cacheLevel = toCacheLevel(level);
    if (!cacheLevel) return null;

    const featureId = String(feature.id);
    const bounds = calculateBounds(feature.geometry);
    const properties = feature.properties || {};

    const boundaryData: Omit<CachedBoundary, 'cacheKey' | 'cachedAt'> = {
      id: featureId,
      level: cacheLevel,
      worldview,
      geometry: feature.geometry,
      properties,
      bounds,
      parentId: parentId || properties.parent_id,
    };

    await cacheBoundary(boundaryData);
    
    const cacheKey = `${cacheLevel}:${featureId}:${worldview}`;
    return { ...boundaryData, cacheKey, cachedAt: Date.now() };
  }, []);

  /**
   * Convert a cached boundary to a drilldown step
   */
  const toDropdownStep = useCallback((cached: CachedBoundary): DrilldownStep => {
    const props = cached.properties;
    return {
      level: cached.level === 'admin0' ? 'admin0' : 
             cached.level === 'admin1' ? 'admin1' :
             cached.level === 'admin2' ? 'admin2' :
             cached.level === 'admin3' ? 'admin3' : 'admin4',
      id: cached.id,
      name: (props.name_en || props.name || cached.id) as string,
      bounds: cached.bounds,
      iso3166_1: props.iso_3166_1 as string | undefined,
      iso3166_2: props.iso_3166_2 as string | undefined,
    };
  }, []);

  /**
   * Get bounds for a feature, using cache if available
   */
  const getBoundsForFeature = useCallback(async (
    map: MapboxMap,
    featureId: string,
    level: AdminLevel,
    worldview: string,
    feature?: MapboxBoundaryFeature
  ): Promise<BBox | null> => {
    const cached = await getBoundary(map, featureId, level, worldview, feature);
    return cached?.bounds || null;
  }, [getBoundary]);

  return {
    getBoundary,
    getCachedChildBoundaries,
    cacheFromFeature,
    toDropdownStep,
    getBoundsForFeature,
  };
}

export type BoundaryCacheReturn = ReturnType<typeof useBoundaryCache>;

