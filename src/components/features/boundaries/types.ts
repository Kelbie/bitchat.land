/**
 * Types for the Boundaries Explorer feature
 */

import type { BBox } from '@/services/boundariesCacheService';

export type AdminLevel = 'world' | 'admin0' | 'admin1' | 'admin2' | 'admin3' | 'admin4';

/**
 * Represents a step in the drilldown navigation path
 */
export interface DrilldownStep {
  /** Admin level */
  level: AdminLevel;
  /** Feature ID from Mapbox Boundaries */
  id: string;
  /** Display name */
  name: string;
  /** Bounding box for fitBounds */
  bounds: BBox;
  /** ISO 3166-1 alpha-2 code (for countries) */
  iso3166_1?: string;
  /** ISO 3166-2 code (for subdivisions) */
  iso3166_2?: string;
}

/**
 * Main state for the boundaries drilldown
 */
export interface DrilldownState {
  /** Current admin level being viewed */
  currentLevel: AdminLevel;
  /** Navigation path from world to current selection */
  path: DrilldownStep[];
  /** Worldview for disputed borders (ISO alpha-2 code, e.g., 'US', 'CN') */
  worldview: string;
  /** Currently hovered feature ID */
  hoveredFeatureId: string | null;
  /** Loading state for boundary data */
  isLoading: boolean;
}

/**
 * Actions for the drilldown state machine
 */
export type DrilldownAction =
  | { type: 'SELECT_COUNTRY'; payload: DrilldownStep }
  | { type: 'DRILL_DOWN'; payload: DrilldownStep }
  | { type: 'GO_BACK'; payload?: number }
  | { type: 'GO_TO_LEVEL'; payload: number }
  | { type: 'RESET' }
  | { type: 'SET_HOVERED'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_WORLDVIEW'; payload: string };

/**
 * Props for the BoundariesGlobe component
 */
export interface BoundariesGlobeProps {
  /** Theme for styling consistency */
  theme?: 'matrix' | 'material';
  /** Callback when boundaries mode should be exited */
  onExit?: () => void;
  /** Initial country to zoom to (ISO code) */
  initialCountry?: string;
  /** Callback when a geohash is selected (for search integration) */
  onGeohashSelect?: (geohash: string) => void;
}

/**
 * Props for the CountrySelect component
 */
export interface CountrySelectProps {
  /** Currently selected country ISO code */
  selectedCountry?: string;
  /** Callback when a country is selected */
  onSelect: (country: CountryOption) => void;
  /** Theme for styling */
  theme?: 'matrix' | 'material';
  /** Placeholder text */
  placeholder?: string;
}

/**
 * Country option for the dropdown
 */
export interface CountryOption {
  /** ISO 3166-1 alpha-2 code */
  code: string;
  /** Country name */
  name: string;
  /** Approximate center coordinates [lng, lat] */
  center?: [number, number];
}

/**
 * Props for the Breadcrumbs component
 */
export interface BreadcrumbsProps {
  /** Navigation path */
  path: DrilldownStep[];
  /** Callback when a breadcrumb is clicked */
  onNavigate: (index: number) => void;
  /** Callback to reset to world view */
  onReset: () => void;
  /** Theme for styling */
  theme?: 'matrix' | 'material';
}

/**
 * Feature from Mapbox queryRenderedFeatures
 */
export interface MapboxBoundaryFeature {
  id: string | number;
  type: 'Feature';
  geometry: GeoJSON.Geometry;
  properties: {
    name?: string;
    name_en?: string;
    iso_3166_1?: string;
    iso_3166_2?: string;
    worldview?: string;
    admin_level?: number;
    parent_id?: string;
    [key: string]: unknown;
  };
  layer: {
    id: string;
    source: string;
    'source-layer'?: string;
  };
  source: string;
  sourceLayer?: string;
}

/**
 * Map viewport state
 */
export interface ViewportState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch?: number;
  bearing?: number;
}

/**
 * Mapbox Boundaries tileset configuration
 */
export interface BoundaryTilesetConfig {
  source: string;
  sourceLayer: string;
  adminLevel: AdminLevel;
}

/**
 * Default worldview code
 */
export const DEFAULT_WORLDVIEW = 'US';

/**
 * Mapbox Boundaries v4 tileset configurations
 */
export const BOUNDARY_TILESETS: Record<Exclude<AdminLevel, 'world'>, BoundaryTilesetConfig> = {
  admin0: {
    source: 'mapbox://mapbox.boundaries-adm0-v4',
    sourceLayer: 'boundaries_admin_0',
    adminLevel: 'admin0',
  },
  admin1: {
    source: 'mapbox://mapbox.boundaries-adm1-v4',
    sourceLayer: 'boundaries_admin_1',
    adminLevel: 'admin1',
  },
  admin2: {
    source: 'mapbox://mapbox.boundaries-adm2-v4',
    sourceLayer: 'boundaries_admin_2',
    adminLevel: 'admin2',
  },
  admin3: {
    source: 'mapbox://mapbox.boundaries-adm3-v4',
    sourceLayer: 'boundaries_admin_3',
    adminLevel: 'admin3',
  },
  admin4: {
    source: 'mapbox://mapbox.boundaries-adm4-v4',
    sourceLayer: 'boundaries_admin_4',
    adminLevel: 'admin4',
  },
};

/**
 * Gets the child admin level for a given level
 */
export function getChildLevel(level: AdminLevel): AdminLevel | null {
  const hierarchy: Record<AdminLevel, AdminLevel | null> = {
    world: 'admin0',
    admin0: 'admin1',
    admin1: 'admin2',
    admin2: 'admin3',
    admin3: 'admin4',
    admin4: null,
  };
  return hierarchy[level];
}

/**
 * Gets the parent admin level for a given level
 */
export function getParentLevel(level: AdminLevel): AdminLevel | null {
  const hierarchy: Record<AdminLevel, AdminLevel | null> = {
    world: null,
    admin0: 'world',
    admin1: 'admin0',
    admin2: 'admin1',
    admin3: 'admin2',
    admin4: 'admin3',
  };
  return hierarchy[level];
}

