/**
 * useBoundariesState Hook
 * 
 * State machine for managing hierarchical boundary drilldown navigation.
 * Handles selection, navigation, worldview, and hover states.
 */

import { useReducer, useCallback } from 'react';
import type { 
  DrilldownState, 
  DrilldownAction, 
  DrilldownStep,
  AdminLevel 
} from '../types';
import { DEFAULT_WORLDVIEW } from '../types';

/**
 * Initial state for the drilldown state machine
 */
const initialState: DrilldownState = {
  currentLevel: 'world',
  path: [],
  worldview: DEFAULT_WORLDVIEW,
  hoveredFeatureId: null,
  isLoading: false,
};

/**
 * Reducer for drilldown state management
 */
function drilldownReducer(state: DrilldownState, action: DrilldownAction): DrilldownState {
  switch (action.type) {
    case 'SELECT_COUNTRY': {
      // Selecting a country sets the worldview and starts the path
      const country = action.payload;
      return {
        ...state,
        currentLevel: 'admin0',
        path: [country],
        worldview: country.iso3166_1 || DEFAULT_WORLDVIEW,
        hoveredFeatureId: null,
        isLoading: false,
      };
    }

    case 'DRILL_DOWN': {
      // Add the new level to the path
      const newStep = action.payload;
      return {
        ...state,
        currentLevel: newStep.level,
        path: [...state.path, newStep],
        hoveredFeatureId: null,
        isLoading: false,
      };
    }

    case 'GO_BACK': {
      // Go back by specified number of levels (default 1)
      const steps = action.payload ?? 1;
      const newPath = state.path.slice(0, -steps);
      
      if (newPath.length === 0) {
        return {
          ...initialState,
          worldview: state.worldview, // Keep worldview preference
        };
      }

      const lastStep = newPath[newPath.length - 1];
      return {
        ...state,
        currentLevel: lastStep.level,
        path: newPath,
        hoveredFeatureId: null,
        isLoading: false,
      };
    }

    case 'GO_TO_LEVEL': {
      // Navigate to a specific level in the path (for breadcrumbs)
      const index = action.payload;
      
      if (index < 0) {
        return {
          ...initialState,
          worldview: state.worldview,
        };
      }

      const newPath = state.path.slice(0, index + 1);
      
      if (newPath.length === 0) {
        return {
          ...initialState,
          worldview: state.worldview,
        };
      }

      const lastStep = newPath[newPath.length - 1];
      return {
        ...state,
        currentLevel: lastStep.level,
        path: newPath,
        hoveredFeatureId: null,
        isLoading: false,
      };
    }

    case 'RESET': {
      return {
        ...initialState,
        worldview: state.worldview, // Keep worldview preference
      };
    }

    case 'SET_HOVERED': {
      return {
        ...state,
        hoveredFeatureId: action.payload,
      };
    }

    case 'SET_LOADING': {
      return {
        ...state,
        isLoading: action.payload,
      };
    }

    case 'SET_WORLDVIEW': {
      return {
        ...state,
        worldview: action.payload,
      };
    }

    default:
      return state;
  }
}

/**
 * Hook for managing boundaries drilldown state
 */
export function useBoundariesState() {
  const [state, dispatch] = useReducer(drilldownReducer, initialState);

  /**
   * Select a country from the dropdown or by clicking on the map
   */
  const selectCountry = useCallback((country: DrilldownStep) => {
    dispatch({ type: 'SELECT_COUNTRY', payload: country });
  }, []);

  /**
   * Drill down into a child boundary (e.g., state -> county)
   */
  const drillDown = useCallback((step: DrilldownStep) => {
    dispatch({ type: 'DRILL_DOWN', payload: step });
  }, []);

  /**
   * Go back one or more levels
   */
  const goBack = useCallback((steps: number = 1) => {
    dispatch({ type: 'GO_BACK', payload: steps });
  }, []);

  /**
   * Navigate to a specific level in the path (for breadcrumbs)
   */
  const goToLevel = useCallback((index: number) => {
    dispatch({ type: 'GO_TO_LEVEL', payload: index });
  }, []);

  /**
   * Reset to world view
   */
  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  /**
   * Set the currently hovered feature
   */
  const setHovered = useCallback((featureId: string | null) => {
    dispatch({ type: 'SET_HOVERED', payload: featureId });
  }, []);

  /**
   * Set loading state
   */
  const setLoading = useCallback((loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  }, []);

  /**
   * Set worldview for disputed borders
   */
  const setWorldview = useCallback((worldview: string) => {
    dispatch({ type: 'SET_WORLDVIEW', payload: worldview });
  }, []);

  /**
   * Get the currently selected boundary (last in path)
   */
  const currentSelection = state.path.length > 0 
    ? state.path[state.path.length - 1] 
    : null;

  /**
   * Check if we can go back
   */
  const canGoBack = state.path.length > 0;

  /**
   * Check if we can drill down further
   */
  const canDrillDown = state.currentLevel !== 'admin4';

  /**
   * Get the next admin level to show
   */
  const getNextLevel = (): AdminLevel | null => {
    const levelOrder: AdminLevel[] = ['world', 'admin0', 'admin1', 'admin2', 'admin3', 'admin4'];
    const currentIndex = levelOrder.indexOf(state.currentLevel);
    if (currentIndex < levelOrder.length - 1) {
      return levelOrder[currentIndex + 1];
    }
    return null;
  };

  return {
    // State
    ...state,
    currentSelection,
    canGoBack,
    canDrillDown,

    // Actions
    selectCountry,
    drillDown,
    goBack,
    goToLevel,
    reset,
    setHovered,
    setLoading,
    setWorldview,
    getNextLevel,
  };
}

export type BoundariesStateReturn = ReturnType<typeof useBoundariesState>;

