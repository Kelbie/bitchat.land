/**
 * BoundariesGlobe Component
 * 
 * Main component for the interactive boundaries explorer.
 * Renders a Mapbox GL JS map with globe projection and hierarchical boundary navigation.
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { feature as getCountryFeature } from '@rapideditor/country-coder';
import { useBoundariesState } from '../hooks/useBoundariesState';
// import { useBoundaryCache } from '../hooks/useBoundaryCache'; // Available for future caching
import { CountrySelect } from './CountrySelect';
import { Breadcrumbs } from './Breadcrumbs';
import { GeohashExplorer } from './GeohashExplorer';
import type { 
  BoundariesGlobeProps, 
  DrilldownStep,
  CountryOption,
} from '../types';
import { bboxToLngLatBounds, calculateBounds, type BBox } from '@/services/boundariesCacheService';
import { geoRelayManager, type ConnectionState } from '@/services/geoRelayConnectionManager';
import { findCountryGeohashes, type CountryGeohashResult } from '@/utils/countryGeohashFinder';
import { decodeGeohash } from '@/utils/geohashUtils';
import { useExactEventsByGeohash } from '@/stores';

// Get Mapbox token from environment
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string;

// Layer IDs for boundary visualization
const LAYER_IDS = {
  admin0Fill: 'boundaries-admin0-fill',
  admin0Line: 'boundaries-admin0-line',
  admin1Fill: 'boundaries-admin1-fill',
  admin1Line: 'boundaries-admin1-line',
  admin2Fill: 'boundaries-admin2-fill',
  admin2Line: 'boundaries-admin2-line',
  admin3Fill: 'boundaries-admin3-fill',
  admin3Line: 'boundaries-admin3-line',
  admin4Fill: 'boundaries-admin4-fill',
  admin4Line: 'boundaries-admin4-line',
  selectedFill: 'boundaries-selected-fill',
  selectedLine: 'boundaries-selected-line',
  hoverFill: 'boundaries-hover-fill',
} as const;

// Source IDs - using composite source from Mapbox style (included with public token)
const SOURCE_IDS = {
  selected: 'boundaries-selected',
  geohashHighlight: 'geohash-highlight',
  geohashGrid: 'geohash-grid',
} as const;

// Layer IDs for geohash highlight
const GEOHASH_LAYER_IDS = {
  fill: 'geohash-highlight-fill',
  line: 'geohash-highlight-line',
  gridFill: 'geohash-grid-fill',
  gridLine: 'geohash-grid-line',
} as const;

/**
 * Get theme-specific colors for boundary layers
 * Using exact Tailwind CSS color values
 */
function getThemeColors(theme: 'matrix' | 'material') {
  if (theme === 'matrix') {
    // green-400: #4ade80 = rgba(74, 222, 128, x)
    // green-500: #22c55e = rgba(34, 197, 94, x)
    // green-600: #16a34a
    return {
      // Semi-transparent fills using green-400 (#4ade80)
      fill: 'rgba(74, 222, 128, 0.08)',
      fillHover: 'rgba(74, 222, 128, 0.25)',
      fillSelected: 'rgba(34, 197, 94, 0.35)',  // green-500
      // Green lines matching Tailwind palette
      line: '#22c55e',       // green-500
      lineHover: '#4ade80',  // green-400
      lineSelected: '#4ade80', // green-400
      lineWidth: 0.8,
      lineWidthHover: 1.5,
      lineWidthSelected: 2.5,
    };
  }
  // blue-400: #60a5fa = rgba(96, 165, 250, x)
  // blue-500: #3b82f6 = rgba(59, 130, 246, x)
  // blue-600: #2563eb = rgba(37, 99, 235, x)
  return {
    // Clean blue fills using Tailwind blue palette
    fill: 'rgba(59, 130, 246, 0.08)',       // blue-500
    fillHover: 'rgba(59, 130, 246, 0.2)',   // blue-500
    fillSelected: 'rgba(37, 99, 235, 0.3)', // blue-600
    // Professional blue lines from Tailwind
    line: '#60a5fa',       // blue-400
    lineHover: '#3b82f6',  // blue-500
    lineSelected: '#2563eb', // blue-600
    lineWidth: 0.8,
    lineWidthHover: 1.5,
    lineWidthSelected: 2.5,
  };
}

/**
 * Creates a worldview filter expression for Mapbox styles
 */
function createWorldviewFilter(worldview: string): mapboxgl.FilterSpecification {
  return [
    'any',
    ['==', ['get', 'worldview'], 'all'],
    ['in', worldview, ['get', 'worldview']],
  ];
}

/**
 * Tailwind CSS color values for reference:
 * gray-950: #030712, gray-900: #111827, gray-800: #1f2937, gray-700: #374151
 * green-950: #052e16, green-900: #14532d, green-800: #166534, green-600: #16a34a
 * green-500: #22c55e, green-400: #4ade80
 * blue-600: #2563eb, blue-500: #3b82f6, blue-400: #60a5fa
 */

/**
 * Apply custom theme styling to the map layers
 */
function applyThemeStyles(m: mapboxgl.Map, theme: 'matrix' | 'material') {
  // Get all layers in the style
  const layers = m.getStyle()?.layers || [];

  if (theme === 'matrix') {
    // Matrix theme using actual Tailwind gray + green values
    const matrixColors = {
      water: '#1f2937',           // Dark with slight green tint (between gray-950 and green-950)
      waterLine: '#111827',       // green-900
      land: '#111827',            // gray-900 (exact Tailwind value)
      landLine: '#111827',        // gray-800
      background: '#111827',      // gray-950 (exact Tailwind value)
      text: '#4ade80',            // green-400 (exact Tailwind value)
      textHalo: '#111827',        // gray-900 for better contrast
      road: '#111827',            // gray-800
      building: '#111827',        // gray-800
      park: '#111827',            // green-950 (exact Tailwind value)
      admin: '#22c55e',           // green-500 (exact Tailwind value)
    };

    for (const layer of layers) {
      const layerId = layer.id;
      const layerType = layer.type;

      try {
        // Water layers
        if (layerId.includes('water')) {
          if (layerType === 'fill') {
            m.setPaintProperty(layerId, 'fill-color', matrixColors.water);
          } else if (layerType === 'line') {
            m.setPaintProperty(layerId, 'line-color', matrixColors.waterLine);
          }
        }
        // Land/background layers
        else if (layerId.includes('land') || layerId.includes('background')) {
          if (layerType === 'fill') {
            m.setPaintProperty(layerId, 'fill-color', matrixColors.land);
          } else if (layerType === 'background') {
            m.setPaintProperty(layerId, 'background-color', matrixColors.background);
          }
        }
        // Park/green areas
        else if (layerId.includes('park') || layerId.includes('landuse')) {
          if (layerType === 'fill') {
            m.setPaintProperty(layerId, 'fill-color', matrixColors.park);
          }
        }
        // Roads
        else if (layerId.includes('road') || layerId.includes('bridge') || layerId.includes('tunnel')) {
          if (layerType === 'line') {
            m.setPaintProperty(layerId, 'line-color', matrixColors.road);
          }
        }
        // Buildings
        else if (layerId.includes('building')) {
          if (layerType === 'fill') {
            m.setPaintProperty(layerId, 'fill-color', matrixColors.building);
          }
        }
        // Admin boundaries
        else if (layerId.includes('admin') || layerId.includes('boundary')) {
          if (layerType === 'line') {
            m.setPaintProperty(layerId, 'line-color', matrixColors.admin);
          }
        }
        // Text labels
        else if (layerType === 'symbol') {
          if (m.getPaintProperty(layerId, 'text-color') !== undefined) {
            m.setPaintProperty(layerId, 'text-color', matrixColors.text);
            m.setPaintProperty(layerId, 'text-halo-color', matrixColors.textHalo);
            m.setPaintProperty(layerId, 'text-halo-width', 1.5);
          }
        }
      } catch {
        // Some layers might not support certain properties, skip them
      }
    }
  } else {
    // Material theme using Tailwind blue + gray values
    const materialColors = {
      water: '#dbeafe',           // blue-100
      waterLine: '#93c5fd',       // blue-300
      land: '#f9fafb',            // gray-50 (exact Tailwind value)
      landLine: '#e5e7eb',        // gray-200 (exact Tailwind value)
      background: '#ffffff',      // white
      text: '#1e40af',            // blue-800
      textHalo: '#ffffff',        // white
      road: '#e5e7eb',            // gray-200
      building: '#f3f4f6',        // gray-100 (exact Tailwind value)
      park: '#dcfce7',            // green-100
      admin: '#3b82f6',           // blue-500 (exact Tailwind value)
    };

    for (const layer of layers) {
      const layerId = layer.id;
      const layerType = layer.type;

      try {
        // Water layers
        if (layerId.includes('water')) {
          if (layerType === 'fill') {
            m.setPaintProperty(layerId, 'fill-color', materialColors.water);
          } else if (layerType === 'line') {
            m.setPaintProperty(layerId, 'line-color', materialColors.waterLine);
          }
        }
        // Land/background layers
        else if (layerId.includes('land') || layerId.includes('background')) {
          if (layerType === 'fill') {
            m.setPaintProperty(layerId, 'fill-color', materialColors.land);
          } else if (layerType === 'background') {
            m.setPaintProperty(layerId, 'background-color', materialColors.background);
          }
        }
        // Park/green areas
        else if (layerId.includes('park') || layerId.includes('landuse')) {
          if (layerType === 'fill') {
            m.setPaintProperty(layerId, 'fill-color', materialColors.park);
          }
        }
        // Admin boundaries
        else if (layerId.includes('admin') || layerId.includes('boundary')) {
          if (layerType === 'line') {
            m.setPaintProperty(layerId, 'line-color', materialColors.admin);
          }
        }
        // Text labels
        else if (layerType === 'symbol') {
          if (m.getPaintProperty(layerId, 'text-color') !== undefined) {
            m.setPaintProperty(layerId, 'text-color', materialColors.text);
            m.setPaintProperty(layerId, 'text-halo-color', materialColors.textHalo);
            m.setPaintProperty(layerId, 'text-halo-width', 1);
          }
        }
      } catch {
        // Some layers might not support certain properties, skip them
      }
    }
  }
}

export const BoundariesGlobe: React.FC<BoundariesGlobeProps> = ({
  theme = 'matrix',
  onExit,
  initialCountry,
  onGeohashSelect,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isLoadingBoundaries, setIsLoadingBoundaries] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  
  // Geohash computation state
  const [geohashResult, setGeohashResult] = useState<CountryGeohashResult | null>(null);
  const [isComputingGeohashes, setIsComputingGeohashes] = useState(false);
  const [hoveredGeohash, setHoveredGeohash] = useState<string | null>(null);

  // GeoRelay manager state
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [isConnectingRelays, setIsConnectingRelays] = useState(false);

  // Get exact event counts from the central store (not hierarchical - each geohash shows its own count only)
  // GeoRelayConnectionManager pushes events to the store, so this includes all sources
  const storeEventCounts = useExactEventsByGeohash();

  const boundariesState = useBoundariesState();
  // const boundaryCache = useBoundaryCache(); // Available for future caching of boundary data

  const colors = getThemeColors(theme);

  const {
    currentLevel,
    path,
    worldview,
    // hoveredFeatureId - available for tooltip display if needed
    selectCountry,
    // drillDown - will be used when admin-1 drilling is implemented
    goToLevel,
    reset,
    setHovered,
    setLoading,
  } = boundariesState;

  /**
   * Callback when relay state changes (connections updated)
   */
  const handleRelayStateChange = useCallback((state: ConnectionState) => {
    setConnectionState(state);
    setIsConnectingRelays(false);
  }, []);

  /**
   * Initialize the manager on mount
   */
  useEffect(() => {
    geoRelayManager.initialize({
      onStateChange: handleRelayStateChange,
    });
    
    return () => {
      // Clear secondary geohashes when unmounting
      geoRelayManager.clearSecondaryGeohashes();
    };
  }, [handleRelayStateChange]);

  /**
   * Start relay subscriptions for computed geohashes using the unified manager
   */
  const startRelaySubscriptions = useCallback(async (
    countryCode: string,
    geohashes: string[]
  ) => {
    console.log(`[BoundariesGlobe] Setting ${geohashes.length} secondary geohashes for ${countryCode}`);
    setIsConnectingRelays(true);
    
    try {
      // Use the manager to set secondary geohashes (country exploration)
      await geoRelayManager.setSecondaryGeohashes(geohashes);
    } catch (error) {
      console.error('[BoundariesGlobe] Failed to set secondary geohashes:', error);
      setIsConnectingRelays(false);
    }
  }, []);

  /**
   * Stop all relay subscriptions for country exploration
   */
  const stopRelaySubscriptions = useCallback(async () => {
    await geoRelayManager.clearSecondaryGeohashes();
    setConnectionState(null);
    setIsConnectingRelays(false);
  }, []);

  /**
   * Initialize the Mapbox map
   */
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    if (!MAPBOX_TOKEN) {
      console.error('VITE_MAPBOX_TOKEN is not set. Please create a .env.local file with your Mapbox token.');
      setTokenError('Mapbox token not configured. Please create a .env.local file with VITE_MAPBOX_TOKEN=your_token');
      return;
    }

    // Check if using a secret token instead of public token
    if (MAPBOX_TOKEN.startsWith('sk.')) {
      console.error('Using a secret token (sk.*). Mapbox GL JS requires a public token (pk.*).');
      setTokenError('Invalid token type: You are using a secret token (sk.*). Mapbox GL JS requires a PUBLIC token (pk.*). Get your public token from https://account.mapbox.com/access-tokens/');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;

    // Reset mapLoaded before creating new map instance
    setMapLoaded(false);

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: theme === 'matrix' 
        ? 'mapbox://styles/mapbox/dark-v11'
        : 'mapbox://styles/mapbox/light-v11',
      center: [0, 20],
      zoom: 1.5,
      projection: 'globe',
      attributionControl: false,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    map.current.addControl(new mapboxgl.AttributionControl({ compact: true }), 'bottom-right');

    // Wait for style to be fully loaded before setting mapLoaded
    // The 'load' event can fire before all layers are accessible
    map.current.on('load', () => {
      const m = map.current;
      if (!m) return;
      
      // Use idle event to ensure all tiles and resources are loaded
      const handleIdle = () => {
        setMapLoaded(true);
        m.off('idle', handleIdle);
      };
      
      // If already idle, set immediately, otherwise wait
      if (m.isStyleLoaded() && m.areTilesLoaded()) {
        setMapLoaded(true);
      } else {
        m.on('idle', handleIdle);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [theme]);

  /**
   * Add boundary sources and layers once map is loaded
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;

    // Helper to apply fog and theme styles - only if style is fully loaded
    const applyAllStyles = () => {
      // Guard: only apply if style is fully loaded
      if (!m.isStyleLoaded()) {
        return;
      }

      try {
        // Add atmosphere and fog for globe effect - using Tailwind color values
        if (theme === 'matrix') {
          // Matrix theme - gray-800 (#111827) atmosphere, gray-950 (#030712) space
          m.setFog({
            color: '#111827',                   // gray-800 - atmosphere near horizon
            'high-color': '#111827',            // gray-800 - upper atmosphere
            'horizon-blend': 0.02,
            'space-color': '#111827',           // gray-950 - deep space background
            'star-intensity': 0.3,              // Visible stars
          });
        } else {
          // Material theme - light blue tones
          m.setFog({
            color: 'rgb(249, 250, 251)',        // gray-50
            'high-color': 'rgb(219, 234, 254)', // blue-100
            'horizon-blend': 0.02,
            'space-color': 'rgb(219, 234, 254)', // blue-100 for space
            'star-intensity': 0.3,
          });
        }

        // Apply custom styling to match app theme
        applyThemeStyles(m, theme);
      } catch (e) {
        // Style might not be fully ready, ignore errors
        console.debug('Style application deferred:', e);
      }
    };

    // Apply styles immediately if ready
    applyAllStyles();
    
    // Re-apply styles after a short delay to catch any layers that loaded late
    const timeoutId = setTimeout(applyAllStyles, 500);
    
    // Also re-apply if style data changes (e.g., new tiles load)
    // Debounce to prevent excessive re-applications during tile loading
    let styleDataTimeoutId: ReturnType<typeof setTimeout> | null = null;
    const handleStyleData = () => {
      // Only handle if style is fully loaded
      if (!m.isStyleLoaded()) return;
      
      if (styleDataTimeoutId) {
        clearTimeout(styleDataTimeoutId);
      }
      styleDataTimeoutId = setTimeout(applyAllStyles, 100);
    };
    m.on('styledata', handleStyleData);

    // Guard: ensure style is loaded before adding sources/layers
    if (!m.isStyleLoaded()) {
      console.warn('Style not loaded yet, skipping source/layer setup');
      return;
    }

    try {
      // Add a GeoJSON source for the selected boundary highlight
      if (!m.getSource('boundaries-selected')) {
        m.addSource('boundaries-selected', {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      // Add a GeoJSON source for geohash highlight (when hovering on geohash panel)
      if (!m.getSource(SOURCE_IDS.geohashHighlight)) {
        m.addSource(SOURCE_IDS.geohashHighlight, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      // Add GeoJSON source for geohash grid (all depth-1 geohashes)
      if (!m.getSource(SOURCE_IDS.geohashGrid)) {
        m.addSource(SOURCE_IDS.geohashGrid, {
          type: 'geojson',
          data: { type: 'FeatureCollection', features: [] },
        });
      }

      // Add interactive boundary layers using the built-in composite source
      // The 'composite' source is already loaded with the style and includes admin boundaries
      addInteractiveBoundaryLayers(m, worldview, colors);

      // Add geohash grid layers (green dotted outlines for all depth-1 geohashes)
      if (!m.getLayer(GEOHASH_LAYER_IDS.gridFill)) {
        m.addLayer({
          id: GEOHASH_LAYER_IDS.gridFill,
          type: 'fill',
          source: SOURCE_IDS.geohashGrid,
          paint: {
            'fill-color': theme === 'matrix' ? 'rgba(0, 255, 0, 0.05)' : 'rgba(34, 197, 94, 0.05)',
            'fill-opacity': 0.3,
          },
        });
      }

      if (!m.getLayer(GEOHASH_LAYER_IDS.gridLine)) {
        m.addLayer({
          id: GEOHASH_LAYER_IDS.gridLine,
          type: 'line',
          source: SOURCE_IDS.geohashGrid,
          paint: {
            'line-color': theme === 'matrix' ? '#00ff00' : '#22c55e',
            'line-width': 1.5,
            'line-dasharray': [3, 3],
            'line-opacity': 0.7,
          },
        });
      }

      // Add geohash hover highlight layers (cyan/orange, above others)
      if (!m.getLayer(GEOHASH_LAYER_IDS.fill)) {
        m.addLayer({
          id: GEOHASH_LAYER_IDS.fill,
          type: 'fill',
          source: SOURCE_IDS.geohashHighlight,
          paint: {
            'fill-color': theme === 'matrix' ? 'rgba(0, 255, 255, 0.3)' : 'rgba(255, 165, 0, 0.3)',
            'fill-opacity': 0.6,
          },
        });
      }

      if (!m.getLayer(GEOHASH_LAYER_IDS.line)) {
        m.addLayer({
          id: GEOHASH_LAYER_IDS.line,
          type: 'line',
          source: SOURCE_IDS.geohashHighlight,
          paint: {
            'line-color': theme === 'matrix' ? '#00ffff' : '#ff8c00',
            'line-width': 2,
            'line-dasharray': [2, 2],
          },
        });
      }
    } catch (e) {
      console.warn('Error setting up map sources/layers:', e);
    }

    // Cleanup
    return () => {
      clearTimeout(timeoutId);
      if (styleDataTimeoutId) {
        clearTimeout(styleDataTimeoutId);
      }
      m.off('styledata', handleStyleData);
    };
  }, [mapLoaded, theme, colors, worldview]);

  /**
   * Update worldview filter when it changes
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;
    const filter = createWorldviewFilter(worldview);

    // Update filters on all boundary layers
    const layerIds = [
      LAYER_IDS.admin0Fill, LAYER_IDS.admin0Line,
      LAYER_IDS.admin1Fill, LAYER_IDS.admin1Line,
      LAYER_IDS.admin2Fill, LAYER_IDS.admin2Line,
      LAYER_IDS.admin3Fill, LAYER_IDS.admin3Line,
      LAYER_IDS.admin4Fill, LAYER_IDS.admin4Line,
    ];

    for (const layerId of layerIds) {
      if (m.getLayer(layerId)) {
        m.setFilter(layerId, filter);
      }
    }
  }, [worldview, mapLoaded]);

  /**
   * Auto-select initial country when provided (e.g., for /ug route)
   */
  const initialCountryProcessed = useRef(false);
  useEffect(() => {
    if (!map.current || !mapLoaded || !initialCountry || initialCountryProcessed.current) return;
    
    // Mark as processed to prevent re-running
    initialCountryProcessed.current = true;

    // Country data lookup - add more as needed
    const COUNTRY_DATA: Record<string, { name: string; center: [number, number] }> = {
      'UG': { name: 'Uganda', center: [32.3, 1.4] },
      'US': { name: 'United States', center: [-98.6, 39.8] },
      'GB': { name: 'United Kingdom', center: [-2.2, 55.4] },
      'DE': { name: 'Germany', center: [10.4, 51.2] },
      'FR': { name: 'France', center: [2.2, 46.2] },
      'KE': { name: 'Kenya', center: [38.0, -0.0] },
      'NG': { name: 'Nigeria', center: [8.7, 9.1] },
      'ZA': { name: 'South Africa', center: [22.9, -30.6] },
      'AU': { name: 'Australia', center: [133.8, -25.3] },
      'JP': { name: 'Japan', center: [138.3, 36.2] },
      'BR': { name: 'Brazil', center: [-51.9, -14.2] },
      'IN': { name: 'India', center: [78.9, 21.0] },
      'CN': { name: 'China', center: [104.2, 35.9] },
    };

    const countryData = COUNTRY_DATA[initialCountry.toUpperCase()];
    if (!countryData) {
      console.warn(`Unknown country code: ${initialCountry}`);
      return;
    }

    const m = map.current;
    const center = countryData.center;

    // Use country-coder to get geometry
    const countryFeature = getCountryFeature(center);
    
    let bounds: BBox;
    
    if (countryFeature && countryFeature.geometry) {
      bounds = calculateBounds(countryFeature.geometry);
      updateSelectedHighlight(m, countryFeature.geometry);
      
      // Compute geohashes
      setIsComputingGeohashes(true);
      setTimeout(() => {
        try {
          const result = findCountryGeohashes(
            countryFeature.geometry,
            initialCountry.toUpperCase(),
            countryData.name,
            3 // maxDepth - 3 chars matches Android app behavior
          );
          setGeohashResult(result);
          
          // Start relay subscriptions for all computed geohashes
          const allGeohashes = result.geohashes.map(g => g.geohash);
          startRelaySubscriptions(initialCountry.toUpperCase(), allGeohashes);
        } catch (err) {
          console.error('Error computing geohashes:', err);
        } finally {
          setIsComputingGeohashes(false);
        }
      }, 100);
    } else {
      const [lng, lat] = center;
      bounds = { minLng: lng - 15, minLat: lat - 15, maxLng: lng + 15, maxLat: lat + 15 };
    }

    // Create drilldown step
    const step: DrilldownStep = {
      level: 'admin0',
      id: initialCountry.toUpperCase(),
      name: countryData.name,
      bounds,
      iso3166_1: initialCountry.toUpperCase(),
    };

    selectCountry(step);

    // Fly to the country
    m.fitBounds(bboxToLngLatBounds(bounds), {
      padding: { top: 80, bottom: 80, left: 80, right: 80 },
      duration: 2000,
      essential: true,
    });

    console.log(`Auto-selected country: ${countryData.name} (${initialCountry})`);
  }, [mapLoaded, initialCountry, selectCountry, startRelaySubscriptions]);

  /**
   * Update layer visibility based on current level
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;

    // At world level, show country outlines
    // At country level, show admin-1 boundaries
    const showCountryOutlines = currentLevel === 'world';
    const showAdmin1Outlines = currentLevel === 'admin0';

    // Toggle admin-0 (country) layers
    if (m.getLayer(LAYER_IDS.admin0Fill)) {
      m.setLayoutProperty(LAYER_IDS.admin0Fill, 'visibility', showCountryOutlines ? 'visible' : 'none');
    }
    if (m.getLayer(LAYER_IDS.admin0Line)) {
      m.setLayoutProperty(LAYER_IDS.admin0Line, 'visibility', showCountryOutlines ? 'visible' : 'none');
    }

    // Toggle admin-1 (state/province) layers
    if (m.getLayer(LAYER_IDS.admin1Line)) {
      m.setLayoutProperty(LAYER_IDS.admin1Line, 'visibility', showAdmin1Outlines ? 'visible' : 'none');
    }

  }, [currentLevel, mapLoaded]);

  /**
   * Dim areas outside the selected country when zoomed in
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;
    const isZoomedIn = currentLevel !== 'world';

    // Adjust opacity of country labels and other features when zoomed into a country
    try {
      // Dim country labels outside the selected area
      if (m.getLayer('country-label')) {
        m.setPaintProperty('country-label', 'text-opacity', isZoomedIn ? 0.3 : 1);
      }
      
      // Dim the water slightly when zoomed in to focus on land
      if (m.getLayer('water')) {
        const waterColor = theme === 'matrix' 
          ? (isZoomedIn ? 'rgba(4, 26, 4, 0.95)' : 'rgb(4, 26, 4)')
          : (isZoomedIn ? 'rgba(200, 220, 240, 0.8)' : 'rgb(200, 220, 240)');
        m.setPaintProperty('water', 'fill-color', waterColor);
      }

      // Make the selected country boundary more prominent
      if (m.getLayer(LAYER_IDS.selectedLine)) {
        m.setPaintProperty(LAYER_IDS.selectedLine, 'line-width', isZoomedIn ? 4 : 2);
        m.setPaintProperty(LAYER_IDS.selectedLine, 'line-opacity', isZoomedIn ? 1 : 0.8);
      }

      // Adjust fog to create more depth when zoomed in
      if (isZoomedIn) {
        m.setFog({
          color: theme === 'matrix' ? '#1f2937' : 'rgb(240, 245, 250)',           // gray-800/lighter when zoomed
          'high-color': theme === 'matrix' ? '#111827' : 'rgb(220, 235, 250)',
          'horizon-blend': 0.06,
          'space-color': theme === 'matrix' ? '#030712' : 'rgb(210, 220, 235)',   // gray-950 space
          'star-intensity': theme === 'matrix' ? 0.4 : 0.05,                       // Dimmer stars when zoomed
        });
      } else {
        // Reset to default fog
        m.setFog({
          color: theme === 'matrix' ? '#111827' : 'rgb(249, 250, 251)',           // gray-800
          'high-color': theme === 'matrix' ? '#111827' : 'rgb(219, 234, 254)',
          'horizon-blend': 0.02,
          'space-color': theme === 'matrix' ? '#030712' : 'rgb(219, 234, 254)',   // gray-950 space
          'star-intensity': theme === 'matrix' ? 0.6 : 0.05,
        });
      }
    } catch (e) {
      // Layer might not exist, ignore
      console.debug('Could not adjust dim effect:', e);
    }
  }, [currentLevel, mapLoaded, theme]);

  /**
   * Update geohash grid visualization when country is selected
   * Shows all depth-1 geohashes with green dotted outline
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;
    const gridSource = m.getSource(SOURCE_IDS.geohashGrid) as mapboxgl.GeoJSONSource;

    if (!gridSource) return;

    // If no geohash result or at world level, clear the layer
    if (!geohashResult || currentLevel === 'world') {
      gridSource.setData({ type: 'FeatureCollection', features: [] });
      return;
    }

    // Get only depth-1 geohashes
    const depth1Geohashes = geohashResult.geohashes.filter(gh => gh.depth === 1);

    // Create polygon features for grid
    const gridFeatures: GeoJSON.Feature<GeoJSON.Polygon>[] = depth1Geohashes.map(gh => {
      const bounds = decodeGeohash(gh.geohash);
      return {
        type: 'Feature',
        properties: { 
          geohash: gh.geohash, 
          status: gh.status,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [bounds.minLng, bounds.minLat],
            [bounds.maxLng, bounds.minLat],
            [bounds.maxLng, bounds.maxLat],
            [bounds.minLng, bounds.maxLat],
            [bounds.minLng, bounds.minLat],
          ]],
        },
      };
    });

    // Update source
    gridSource.setData({
      type: 'FeatureCollection',
      features: gridFeatures,
    });

    console.log(`Displayed ${gridFeatures.length} grid geohashes`);
  }, [geohashResult, currentLevel, mapLoaded]);

  /**
   * Update geohash highlight when hovering over geohash panel items
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;
    const source = m.getSource(SOURCE_IDS.geohashHighlight) as mapboxgl.GeoJSONSource;
    
    if (!source) return;

    if (hoveredGeohash) {
      // Decode geohash to get bounds
      const bounds = decodeGeohash(hoveredGeohash);
      
      // Create a polygon from the bounds
      const polygon: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        properties: { geohash: hoveredGeohash },
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [bounds.minLng, bounds.minLat],
            [bounds.maxLng, bounds.minLat],
            [bounds.maxLng, bounds.maxLat],
            [bounds.minLng, bounds.maxLat],
            [bounds.minLng, bounds.minLat], // Close the polygon
          ]],
        },
      };

      source.setData({
        type: 'FeatureCollection',
        features: [polygon],
      });
    } else {
      // Clear the highlight
      source.setData({
        type: 'FeatureCollection',
        features: [],
      });
    }
  }, [hoveredGeohash, mapLoaded]);

  /**
   * Handle click on the map to detect and zoom to countries
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;

    const handleClick = async (e: mapboxgl.MapMouseEvent) => {
      // Only handle clicks when at world level (selecting a country)
      if (currentLevel !== 'world') {
        console.log('Not at world level, ignoring click for country selection');
        return;
      }

      const { lng, lat } = e.lngLat;
      console.log(`Clicked at ${lng.toFixed(2)}, ${lat.toFixed(2)}`);

      // Use country-coder to detect which country was clicked
      const countryFeature = getCountryFeature([lng, lat]);
      
      if (!countryFeature) {
        console.log('No country found at clicked location (probably ocean)');
        return;
      }

      const props = countryFeature.properties;
      const countryCode = props.iso1A2 || props.m49;
      const countryName = props.nameEn || 'Unknown';
      
      console.log('Clicked on country:', { code: countryCode, name: countryName });
      
      setIsLoadingBoundaries(true);
      setLoading(true);

      try {
        // Calculate bounds from the country geometry
        let bounds: BBox;
        
        if (countryFeature.geometry) {
          bounds = calculateBounds(countryFeature.geometry);
        } else {
          // Fallback bounds if geometry not available
          bounds = { minLng: lng - 10, minLat: lat - 10, maxLng: lng + 10, maxLat: lat + 10 };
        }
        
        console.log('Country bounds:', bounds);

        // Create drilldown step
        const step: DrilldownStep = {
          level: 'admin0',
          id: countryCode || countryName,
          name: countryName,
          bounds,
          iso3166_1: countryCode,
        };

        // Select the country (updates state and worldview)
        selectCountry(step);

        // Fly to the country bounds with smooth animation
        const boundsArray = bboxToLngLatBounds(bounds);
        
        m.fitBounds(boundsArray, {
          padding: { top: 80, bottom: 80, left: 80, right: 80 },
          duration: 2000,
          essential: true,
        });

        // Update selected highlight if geometry available
        if (countryFeature.geometry) {
          updateSelectedHighlight(m, countryFeature.geometry);
          
          // Compute geohashes for the country (async, in background)
          setIsComputingGeohashes(true);
          // Use setTimeout to not block the UI
          setTimeout(() => {
            try {
              const result = findCountryGeohashes(
                countryFeature.geometry,
                countryCode || 'XX',
                countryName,
                3 // maxDepth - 3 chars matches Android app behavior
              );
              setGeohashResult(result);
              console.log('Geohash computation complete:', result);
              
              // Start relay subscriptions for all computed geohashes
              const allGeohashes = result.geohashes.map(g => g.geohash);
              startRelaySubscriptions(countryCode || 'XX', allGeohashes);
            } catch (err) {
              console.error('Error computing geohashes:', err);
            } finally {
              setIsComputingGeohashes(false);
            }
          }, 100);
        }

      } catch (err) {
        console.error('Error handling country click:', err);
      } finally {
        setIsLoadingBoundaries(false);
        setLoading(false);
      }
    };

    m.on('click', handleClick);

    return () => {
      m.off('click', handleClick);
    };
  }, [currentLevel, mapLoaded, selectCountry, setLoading, startRelaySubscriptions]);

  /**
   * Handle hover - show pointer cursor when over clickable areas
   */
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const m = map.current;
    let lastHoveredCountry: string | null = null;

    const handleMouseMove = (e: mapboxgl.MapMouseEvent) => {
      // Only show pointer when at world level (can click countries)
      if (currentLevel !== 'world') {
        m.getCanvas().style.cursor = '';
        if (lastHoveredCountry) {
          setHovered(null);
          lastHoveredCountry = null;
        }
        return;
      }

      // Use country-coder to check if we're over a country
      const { lng, lat } = e.lngLat;
      const countryFeature = getCountryFeature([lng, lat]);
      
      if (countryFeature) {
        m.getCanvas().style.cursor = 'pointer';
        const countryCode = countryFeature.properties.iso1A2 || countryFeature.properties.m49 || null;
        
        if (countryCode !== lastHoveredCountry) {
          lastHoveredCountry = countryCode;
          setHovered(countryCode);
        }
      } else {
        m.getCanvas().style.cursor = '';
        if (lastHoveredCountry) {
          setHovered(null);
          lastHoveredCountry = null;
        }
      }
    };

    const handleMouseLeave = () => {
      m.getCanvas().style.cursor = '';
      if (lastHoveredCountry) {
        setHovered(null);
        lastHoveredCountry = null;
      }
    };

    m.on('mousemove', handleMouseMove);
    m.on('mouseleave', handleMouseLeave);

    return () => {
      m.off('mousemove', handleMouseMove);
      m.off('mouseleave', handleMouseLeave);
    };
  }, [currentLevel, mapLoaded, setHovered]);

  /**
   * Handle country selection from dropdown
   */
  const handleCountrySelect = useCallback(async (country: CountryOption) => {
    if (!map.current || !country.center) return;

    const m = map.current;
    const center = country.center; // Now we know it's defined
    setIsLoadingBoundaries(true);
    setLoading(true);

    try {
      // Use country-coder to get the country geometry
      const countryFeature = getCountryFeature(center);
      
      let bounds: BBox;
      
      if (countryFeature && countryFeature.geometry) {
        bounds = calculateBounds(countryFeature.geometry);
        
        // Update the highlight
        updateSelectedHighlight(m, countryFeature.geometry);
        
        // Compute geohashes for the country (async, in background)
        setIsComputingGeohashes(true);
        setTimeout(() => {
          try {
            const result = findCountryGeohashes(
              countryFeature.geometry,
              country.code,
              country.name,
              3 // maxDepth - 3 chars matches Android app behavior
            );
            setGeohashResult(result);
            console.log('Geohash computation complete:', result);
            
            // Start relay subscriptions for all computed geohashes
            const allGeohashes = result.geohashes.map(g => g.geohash);
            startRelaySubscriptions(country.code, allGeohashes);
          } catch (err) {
            console.error('Error computing geohashes:', err);
          } finally {
            setIsComputingGeohashes(false);
          }
        }, 100);
      } else {
        // Fallback: estimate bounds from center point
        const [lng, lat] = center;
        bounds = { 
          minLng: lng - 15, 
          minLat: lat - 15, 
          maxLng: lng + 15, 
          maxLat: lat + 15 
        };
      }

      // Create drilldown step
      const step: DrilldownStep = {
        level: 'admin0',
        id: country.code,
        name: country.name,
        bounds,
        iso3166_1: country.code,
      };

      selectCountry(step);

      // Fly to the country bounds
      m.fitBounds(bboxToLngLatBounds(bounds), {
        padding: { top: 80, bottom: 80, left: 80, right: 80 },
        duration: 2000,
        essential: true,
      });

    } finally {
      setIsLoadingBoundaries(false);
      setLoading(false);
    }
  }, [selectCountry, setLoading, startRelaySubscriptions]);

  /**
   * Handle breadcrumb navigation
   */
  const handleBreadcrumbNavigate = useCallback((index: number) => {
    if (!map.current) return;

    goToLevel(index);

    // Fly to the bounds of the selected level
    if (index >= 0 && index < path.length) {
      const step = path[index];
      map.current.fitBounds(bboxToLngLatBounds(step.bounds), {
        padding: 50,
        duration: 1000,
      });
    }
  }, [goToLevel, path]);

  /**
   * Handle reset to world view
   */
  const handleReset = useCallback(() => {
    if (!map.current) return;

    reset();
    
    // Clear geohash results
    setGeohashResult(null);
    
    // Stop relay subscriptions
    stopRelaySubscriptions();

    // Clear selected highlight
    const source = map.current.getSource(SOURCE_IDS.selected) as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData({ type: 'FeatureCollection', features: [] });
    }

    // Fly back to world view
    map.current.flyTo({
      center: [0, 20],
      zoom: 1.5,
      duration: 1500,
    });
  }, [reset, stopRelaySubscriptions]);

  // Theme-specific styles
  const containerClasses = theme === 'matrix'
    ? 'relative w-full h-full bg-gray-900'
    : 'relative w-full h-full bg-gray-100';

  const overlayClasses = theme === 'matrix'
    ? 'absolute top-4 left-4 z-10 space-y-2'
    : 'absolute top-4 left-4 z-10 space-y-2';

  const loadingClasses = theme === 'matrix'
    ? 'absolute bottom-4 left-4 z-10 px-3 py-1 bg-gray-900/80 text-green-400 text-sm rounded border border-green-500/30'
    : 'absolute bottom-4 left-4 z-10 px-3 py-1 bg-white/80 text-blue-600 text-sm rounded shadow';

  return (
    <div className={containerClasses}>
      {/* Token error message */}
      {tokenError && (
        <div className={`absolute inset-0 flex items-center justify-center z-20 ${
          theme === 'matrix' ? 'bg-gray-900' : 'bg-gray-100'
        }`}>
          <div className={`max-w-lg p-6 rounded-lg text-center ${
            theme === 'matrix'
              ? 'bg-gray-800 border border-red-500/30 text-red-400'
              : 'bg-white shadow-lg text-red-600'
          }`}>
            <h3 className="text-lg font-bold mb-2">Mapbox Token Issue</h3>
            <p className="text-sm mb-4">{tokenError}</p>
            <div className={`text-xs ${theme === 'matrix' ? 'text-green-500' : 'text-gray-500'}`}>
              <p className="mb-2">1. Get a <strong>public token</strong> (starts with pk.) from:</p>
              <a 
                href="https://account.mapbox.com/access-tokens/" 
                target="_blank" 
                rel="noopener noreferrer"
                className={`inline-block mb-3 underline ${
                  theme === 'matrix' ? 'text-green-400 hover:text-green-300' : 'text-blue-600 hover:text-blue-800'
                }`}
              >
                https://account.mapbox.com/access-tokens/
              </a>
              <p className="mb-1">2. Create <code className="px-1 py-0.5 bg-gray-700 rounded">.env.local</code> in project root:</p>
            </div>
            <pre className={`mt-2 p-2 rounded text-xs text-left overflow-x-auto ${
              theme === 'matrix' ? 'bg-gray-900 text-green-400' : 'bg-gray-100 text-gray-800'
            }`}>
VITE_MAPBOX_TOKEN=pk.eyJ1IjoieW91ci11c2VybmFtZSIsImEiOiJjbGFiY...
            </pre>
            <p className={`mt-2 text-xs ${theme === 'matrix' ? 'text-yellow-500' : 'text-orange-600'}`}>
              ⚠️ Use a PUBLIC token (pk.*), not a secret token (sk.*)
            </p>
            {onExit && (
              <button
                onClick={onExit}
                className={`mt-4 px-4 py-2 rounded text-sm font-medium ${
                  theme === 'matrix'
                    ? 'bg-green-900/50 text-green-400 hover:bg-green-900/70'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
              >
                Go Back
              </button>
            )}
          </div>
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* UI Overlay - only show when map is available */}
      {!tokenError && (
        <div className={overlayClasses}>
          {/* Country selector */}
          <CountrySelect
            selectedCountry={path.length > 0 ? path[0].iso3166_1 : undefined}
            onSelect={handleCountrySelect}
            theme={theme}
            placeholder="Search countries..."
          />

          {/* Breadcrumbs */}
          {path.length > 0 && (
            <Breadcrumbs
              path={path}
              onNavigate={handleBreadcrumbNavigate}
              onReset={handleReset}
              theme={theme}
            />
          )}
        </div>
      )}

      {/* Exit button - positioned same as "Explore Boundaries" button in App.tsx */}
      {onExit && !tokenError && (
        <button
          onClick={onExit}
          className={`fixed top-20 right-4 z-50 px-4 py-2 rounded-lg font-medium text-sm transition-all shadow-lg ${
            theme === 'matrix'
              ? 'bg-gray-900 text-green-400 border border-green-500/30 hover:bg-gray-800 hover:border-green-500/50'
              : 'bg-white text-blue-600 border border-blue-200 hover:bg-blue-50'
          }`}
          title="Exit Boundaries Explorer"
        >
          ✕ Exit Explorer
        </button>
      )}

      {/* Geohash Explorer Panel */}
      {currentLevel !== 'world' && (
        <div className="absolute bottom-4 left-4 z-10">
          <GeohashExplorer
            result={geohashResult}
            isLoading={isComputingGeohashes}
            theme={theme}
            onGeohashClick={(geohash) => {
              console.log('Geohash clicked:', geohash);
              // Update the search to filter by this geohash
              if (onGeohashSelect) {
                onGeohashSelect(geohash);
              }
            }}
            onGeohashHover={setHoveredGeohash}
            eventCounts={storeEventCounts}
            connectedRelayCount={connectionState?.totalConnections ?? 0}
            isConnectingRelays={isConnectingRelays}
          />
        </div>
      )}

      {/* Loading indicator */}
      {isLoadingBoundaries && (
        <div className={loadingClasses}>
          Loading boundaries...
        </div>
      )}
    </div>
  );
};

/**
 * Add interactive boundary layers using the built-in composite source
 * This uses the mapbox-streets-v8 data that comes with standard Mapbox styles
 */
function addInteractiveBoundaryLayers(
  m: mapboxgl.Map, 
  worldview: string,
  colors: ReturnType<typeof getThemeColors>
) {
  const filter = createWorldviewFilter(worldview);

  // Admin-0 (country) fill layer - clickable countries
  if (!m.getLayer(LAYER_IDS.admin0Fill)) {
    m.addLayer({
      id: LAYER_IDS.admin0Fill,
      type: 'fill',
      source: 'composite',
      'source-layer': 'country_boundaries',
      filter: ['all', filter, ['==', ['geometry-type'], 'Polygon']],
      paint: {
        'fill-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          colors.fillHover,
          colors.fill,
        ],
        'fill-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          0.7,
          0.4,
        ],
      },
      layout: {
        visibility: 'visible',
      },
    });
  }

  // Admin-0 (country) outline layer
  if (!m.getLayer(LAYER_IDS.admin0Line)) {
    m.addLayer({
      id: LAYER_IDS.admin0Line,
      type: 'line',
      source: 'composite',
      'source-layer': 'admin',
      filter: ['all', 
        filter,
        ['==', ['get', 'admin_level'], 0],
        ['==', ['get', 'maritime'], 0],
      ],
      paint: {
        'line-color': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          colors.lineHover,
          colors.line,
        ],
        'line-width': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          colors.lineWidthHover,
          colors.lineWidth,
        ],
      },
      layout: {
        visibility: 'visible',
      },
    });
  }

  // Admin-1 (state/province) layers - initially hidden
  if (!m.getLayer(LAYER_IDS.admin1Fill)) {
    m.addLayer({
      id: LAYER_IDS.admin1Fill,
      type: 'fill',
      source: 'composite',
      'source-layer': 'place_label', // Placeholder - admin-1 polygons not in standard tiles
      paint: {
        'fill-color': colors.fill,
        'fill-opacity': 0.3,
      },
      layout: {
        visibility: 'none',
      },
    });
  }

  if (!m.getLayer(LAYER_IDS.admin1Line)) {
    m.addLayer({
      id: LAYER_IDS.admin1Line,
      type: 'line',
      source: 'composite',
      'source-layer': 'admin',
      filter: ['all',
        filter,
        ['==', ['get', 'admin_level'], 1],
        ['==', ['get', 'maritime'], 0],
      ],
      paint: {
        'line-color': colors.line,
        'line-width': colors.lineWidth,
        'line-dasharray': [2, 2],
      },
      layout: {
        visibility: 'none',
      },
    });
  }

  // Selected highlight layers with glow effect
  if (!m.getLayer(LAYER_IDS.selectedFill)) {
    m.addLayer({
      id: LAYER_IDS.selectedFill,
      type: 'fill',
      source: 'boundaries-selected',
      paint: {
        'fill-color': colors.fillSelected,
        'fill-opacity': 0.6,
      },
    });
  }

  if (!m.getLayer(LAYER_IDS.selectedLine)) {
    m.addLayer({
      id: LAYER_IDS.selectedLine,
      type: 'line',
      source: 'boundaries-selected',
      paint: {
        'line-color': colors.lineSelected,
        'line-width': colors.lineWidthSelected,
        'line-blur': 1, // Slight glow effect
      },
    });
  }

  console.log('Interactive boundary layers added');
}

/**
 * Update the selected boundary highlight
 */
function updateSelectedHighlight(m: mapboxgl.Map, geometry: GeoJSON.Geometry) {
  const source = m.getSource(SOURCE_IDS.selected) as mapboxgl.GeoJSONSource;
  if (source) {
    source.setData({
      type: 'Feature',
      geometry,
      properties: {},
    });
  }
}

export default BoundariesGlobe;


