/**
 * Boundaries Cache Service
 * 
 * IndexedDB-based caching for Mapbox Boundaries v4 data.
 * Stores boundary geometries, properties, and bounds as users explore,
 * reducing API calls on subsequent visits.
 */

// Cache duration: 30 days in milliseconds
const CACHE_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

// Database configuration
const DB_NAME = 'boundaries-cache';
const DB_VERSION = 1;
const STORE_NAME = 'boundaries';

export type AdminLevel = 'admin0' | 'admin1' | 'admin2' | 'admin3' | 'admin4';

export interface BBox {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
}

export interface CachedBoundary {
  /** Composite key: level:id:worldview */
  cacheKey: string;
  /** Feature ID from Mapbox Boundaries */
  id: string;
  /** Admin level */
  level: AdminLevel;
  /** Worldview code (e.g., 'US', 'CN', 'all') */
  worldview: string;
  /** GeoJSON geometry */
  geometry: GeoJSON.Geometry;
  /** Feature properties from Mapbox */
  properties: Record<string, unknown>;
  /** Bounding box for fitBounds */
  bounds: BBox;
  /** Timestamp when cached */
  cachedAt: number;
  /** Parent boundary ID (for drilling down) */
  parentId?: string;
  /** List of child boundary IDs */
  childIds?: string[];
}

export interface BoundaryMetadata {
  id: string;
  name: string;
  level: AdminLevel;
  bounds: BBox;
  iso3166_1?: string;
  iso3166_2?: string;
  parentId?: string;
}

/**
 * Opens the IndexedDB database, creating the object store if needed
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error(`Failed to open IndexedDB: ${request.error?.message}`));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create the boundaries store with cacheKey as the key path
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' });
        
        // Create indexes for querying
        store.createIndex('level', 'level', { unique: false });
        store.createIndex('parentId', 'parentId', { unique: false });
        store.createIndex('cachedAt', 'cachedAt', { unique: false });
      }
    };
  });
}

/**
 * Generates a cache key for a boundary
 */
export function generateCacheKey(level: AdminLevel, id: string, worldview: string): string {
  return `${level}:${id}:${worldview}`;
}

/**
 * Checks if a cached entry is still fresh
 */
function isFresh(cachedAt: number): boolean {
  return Date.now() - cachedAt < CACHE_DURATION_MS;
}

/**
 * Gets a cached boundary by its key
 */
export async function getCachedBoundary(
  level: AdminLevel,
  id: string,
  worldview: string
): Promise<CachedBoundary | null> {
  try {
    const db = await openDatabase();
    const cacheKey = generateCacheKey(level, id, worldview);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(cacheKey);

      request.onerror = () => {
        reject(new Error(`Failed to get cached boundary: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const result = request.result as CachedBoundary | undefined;
        
        if (result && isFresh(result.cachedAt)) {
          resolve(result);
        } else {
          // Return null if not found or stale
          resolve(null);
        }
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('IndexedDB cache read failed:', error);
    return null;
  }
}

/**
 * Stores a boundary in the cache
 */
export async function cacheBoundary(boundary: Omit<CachedBoundary, 'cacheKey' | 'cachedAt'>): Promise<void> {
  try {
    const db = await openDatabase();
    const cacheKey = generateCacheKey(boundary.level, boundary.id, boundary.worldview);

    const entry: CachedBoundary = {
      ...boundary,
      cacheKey,
      cachedAt: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onerror = () => {
        reject(new Error(`Failed to cache boundary: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('IndexedDB cache write failed:', error);
  }
}

/**
 * Gets all cached children of a boundary
 */
export async function getCachedChildren(
  parentId: string,
  worldview: string
): Promise<CachedBoundary[]> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('parentId');
      const request = index.getAll(parentId);

      request.onerror = () => {
        reject(new Error(`Failed to get cached children: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const results = (request.result as CachedBoundary[])
          .filter(b => b.worldview === worldview && isFresh(b.cachedAt));
        resolve(results);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('IndexedDB cache read failed:', error);
    return [];
  }
}

/**
 * Gets all cached boundaries at a specific admin level
 */
export async function getCachedByLevel(
  level: AdminLevel,
  worldview: string
): Promise<CachedBoundary[]> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('level');
      const request = index.getAll(level);

      request.onerror = () => {
        reject(new Error(`Failed to get cached by level: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        const results = (request.result as CachedBoundary[])
          .filter(b => b.worldview === worldview && isFresh(b.cachedAt));
        resolve(results);
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('IndexedDB cache read failed:', error);
    return [];
  }
}

/**
 * Clears all stale entries from the cache
 */
export async function clearStaleCache(): Promise<number> {
  try {
    const db = await openDatabase();
    const staleThreshold = Date.now() - CACHE_DURATION_MS;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('cachedAt');
      const range = IDBKeyRange.upperBound(staleThreshold);
      const request = index.openCursor(range);
      
      let deletedCount = 0;

      request.onerror = () => {
        reject(new Error(`Failed to clear stale cache: ${request.error?.message}`));
      };

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        }
      };

      transaction.oncomplete = () => {
        db.close();
        resolve(deletedCount);
      };
    });
  } catch (error) {
    console.warn('IndexedDB cache clear failed:', error);
    return 0;
  }
}

/**
 * Clears the entire cache
 */
export async function clearAllCache(): Promise<void> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        reject(new Error(`Failed to clear cache: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        resolve();
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.warn('IndexedDB cache clear failed:', error);
  }
}

/**
 * Gets cache statistics
 */
export async function getCacheStats(): Promise<{ count: number; oldestEntry: number | null }> {
  try {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const countRequest = store.count();
      
      let count = 0;
      let oldestEntry: number | null = null;

      countRequest.onsuccess = () => {
        count = countRequest.result;
      };

      // Get the oldest entry
      const index = store.index('cachedAt');
      const cursorRequest = index.openCursor();

      cursorRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
        if (cursor) {
          oldestEntry = cursor.value.cachedAt;
        }
      };

      transaction.oncomplete = () => {
        db.close();
        resolve({ count, oldestEntry });
      };

      transaction.onerror = () => {
        reject(new Error('Failed to get cache stats'));
      };
    });
  } catch (error) {
    console.warn('IndexedDB cache stats failed:', error);
    return { count: 0, oldestEntry: null };
  }
}

/**
 * Calculates bounding box from a GeoJSON geometry
 */
export function calculateBounds(geometry: GeoJSON.Geometry): BBox {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  function processCoordinates(coords: number[] | number[][] | number[][][] | number[][][][]) {
    if (typeof coords[0] === 'number') {
      // It's a coordinate pair [lng, lat]
      const [lng, lat] = coords as number[];
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
    } else {
      // It's an array of coordinates
      for (const coord of coords as (number[] | number[][] | number[][][] | number[][][][])[]) {
        processCoordinates(coord);
      }
    }
  }

  if (geometry.type === 'Point') {
    const [lng, lat] = geometry.coordinates;
    return { minLng: lng, minLat: lat, maxLng: lng, maxLat: lat };
  }

  if (geometry.type === 'GeometryCollection') {
    for (const geom of geometry.geometries) {
      const bounds = calculateBounds(geom);
      minLng = Math.min(minLng, bounds.minLng);
      minLat = Math.min(minLat, bounds.minLat);
      maxLng = Math.max(maxLng, bounds.maxLng);
      maxLat = Math.max(maxLat, bounds.maxLat);
    }
  } else {
    processCoordinates((geometry as GeoJSON.Polygon).coordinates);
  }

  return { minLng, minLat, maxLng, maxLat };
}

/**
 * Converts BBox to Mapbox LngLatBoundsLike format
 */
export function bboxToLngLatBounds(bbox: BBox): [[number, number], [number, number]] {
  return [
    [bbox.minLng, bbox.minLat],
    [bbox.maxLng, bbox.maxLat],
  ];
}

