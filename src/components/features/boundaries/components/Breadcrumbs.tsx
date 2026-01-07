/**
 * Breadcrumbs Component
 * 
 * Navigation breadcrumbs showing the drilldown path.
 * Allows clicking any level to navigate back to that level.
 */

import React from 'react';
import type { BreadcrumbsProps } from '../types';

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  path,
  onNavigate,
  onReset,
  theme = 'matrix',
}) => {
  if (path.length === 0) return null;

  // Theme-specific styles
  const containerClasses = theme === 'matrix'
    ? 'flex items-center gap-1 px-3 py-2 bg-gray-900/90 border border-green-500/30 rounded text-sm backdrop-blur-sm'
    : 'flex items-center gap-1 px-3 py-2 bg-white/90 border border-gray-200 rounded text-sm shadow-sm backdrop-blur-sm';

  const worldButtonClasses = theme === 'matrix'
    ? 'text-green-400 hover:text-green-300 hover:underline transition-colors'
    : 'text-blue-600 hover:text-blue-800 hover:underline transition-colors';

  const separatorClasses = theme === 'matrix'
    ? 'text-green-700 mx-1'
    : 'text-gray-400 mx-1';

  const crumbButtonClasses = (isLast: boolean) => {
    if (isLast) {
      return theme === 'matrix'
        ? 'text-green-300 font-medium'
        : 'text-gray-900 font-medium';
    }
    return theme === 'matrix'
      ? 'text-green-400 hover:text-green-300 hover:underline transition-colors'
      : 'text-blue-600 hover:text-blue-800 hover:underline transition-colors';
  };

  const resetButtonClasses = theme === 'matrix'
    ? 'ml-2 p-1 text-green-500 hover:text-green-300 hover:bg-green-900/30 rounded transition-colors'
    : 'ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors';

  // Get display name for a level
  const getLevelLabel = (level: string): string => {
    const labels: Record<string, string> = {
      admin0: 'Country',
      admin1: 'State/Province',
      admin2: 'District/County',
      admin3: 'Sub-district',
      admin4: 'Locality',
    };
    return labels[level] || level;
  };

  return (
    <nav className={containerClasses} aria-label="Boundary navigation">
      {/* World link */}
      <button
        type="button"
        onClick={onReset}
        className={worldButtonClasses}
        title="Return to world view"
      >
        🌍 World
      </button>

      {/* Path items */}
      {path.map((step, index) => {
        const isLast = index === path.length - 1;
        
        return (
          <React.Fragment key={`${step.level}-${step.id}`}>
            <span className={separatorClasses}>›</span>
            
            <button
              type="button"
              onClick={() => !isLast && onNavigate(index)}
              className={crumbButtonClasses(isLast)}
              disabled={isLast}
              title={isLast ? `Current: ${step.name}` : `Go to ${step.name}`}
            >
              {step.name}
            </button>
          </React.Fragment>
        );
      })}

      {/* Reset button */}
      <button
        type="button"
        onClick={onReset}
        className={resetButtonClasses}
        title="Reset to world view"
        aria-label="Reset navigation"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </nav>
  );
};

/**
 * Compact version for mobile or limited space
 */
export const BreadcrumbsCompact: React.FC<BreadcrumbsProps> = ({
  path,
  onNavigate,
  onReset,
  theme = 'matrix',
}) => {
  if (path.length === 0) return null;

  const current = path[path.length - 1];
  const parent = path.length > 1 ? path[path.length - 2] : null;

  // Theme-specific styles
  const containerClasses = theme === 'matrix'
    ? 'flex items-center gap-2 px-3 py-2 bg-gray-900/90 border border-green-500/30 rounded text-sm backdrop-blur-sm'
    : 'flex items-center gap-2 px-3 py-2 bg-white/90 border border-gray-200 rounded text-sm shadow-sm backdrop-blur-sm';

  const backButtonClasses = theme === 'matrix'
    ? 'flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors'
    : 'flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors';

  const currentClasses = theme === 'matrix'
    ? 'text-green-300 font-medium'
    : 'text-gray-900 font-medium';

  const handleBack = () => {
    if (parent) {
      onNavigate(path.length - 2);
    } else {
      onReset();
    }
  };

  return (
    <nav className={containerClasses} aria-label="Boundary navigation">
      {/* Back button */}
      <button
        type="button"
        onClick={handleBack}
        className={backButtonClasses}
        title={parent ? `Back to ${parent.name}` : 'Back to world view'}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        <span>{parent ? parent.name : 'World'}</span>
      </button>

      {/* Separator */}
      <span className={theme === 'matrix' ? 'text-green-700' : 'text-gray-400'}>›</span>

      {/* Current level */}
      <span className={currentClasses}>{current.name}</span>
    </nav>
  );
};

export default Breadcrumbs;

