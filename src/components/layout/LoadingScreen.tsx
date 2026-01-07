import React, { useEffect, useState, useMemo } from 'react';
import { PrefetchProgress } from '@/services/prefetchService';

interface LoadingScreenProps {
  progress: PrefetchProgress;
  theme?: 'matrix' | 'material';
}

// Theme styles matching the app's global styles
const styles = {
  matrix: {
    container: 'bg-gray-900 text-green-400 font-mono',
    title: 'text-green-400 [text-shadow:0_0_10px_rgba(74,222,128,0.5)]',
    subtitle: 'text-green-600',
    progressBarOuter: 'bg-gray-800 border border-green-900',
    progressBarInner: 'bg-green-400',
    eventCount: 'text-green-400 [text-shadow:0_0_8px_rgba(74,222,128,0.4)]',
    currentRelay: 'text-green-600',
    dot: 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)]',
    border: 'border-green-900',
    spinner: 'border-green-400 border-t-transparent',
  },
  material: {
    container: 'bg-white text-gray-800 font-sans',
    title: 'text-blue-600',
    subtitle: 'text-gray-600',
    progressBarOuter: 'bg-gray-200 border border-gray-300',
    progressBarInner: 'bg-blue-600',
    eventCount: 'text-blue-600',
    currentRelay: 'text-gray-500',
    dot: 'bg-blue-600',
    border: 'border-gray-200',
    spinner: 'border-blue-600 border-t-transparent',
  },
};

// Simple spinner component
const Spinner: React.FC<{ theme: 'matrix' | 'material' }> = ({ theme }) => {
  const t = styles[theme];
  return (
    <div 
      className={`w-12 h-12 border-4 rounded-full animate-spin ${t.spinner}`}
    />
  );
};

const LoadingScreen: React.FC<LoadingScreenProps> = ({ progress, theme = 'matrix' }) => {
  const [dots, setDots] = useState('');
  const t = styles[theme];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.');
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const phaseText = useMemo(() => {
    switch (progress.phase) {
      case 'initializing':
        return 'Initializing relay directory';
      case 'connecting':
        return 'Connecting to georelays';
      case 'fetching':
        return 'Fetching events';
      case 'complete':
        return 'Ready';
      case 'error':
        return 'Connection error';
      default:
        return 'Loading';
    }
  }, [progress.phase]);

  const percentage = progress.totalRelays > 0 
    ? Math.round((progress.connectedRelays / progress.totalRelays) * 100) 
    : 0;

  return (
    <div className={`fixed inset-0 ${t.container} flex flex-col items-center justify-center z-50`}>
      <div className="flex flex-col items-center gap-6 px-6 max-w-md w-full">
        
        {/* Spinner */}
        <Spinner theme={theme} />
        
        {/* Title */}
        <div className="text-center">
          <h1 className={`text-2xl font-bold uppercase tracking-wider ${t.title}`}>
            GEOHASH RADIO
          </h1>
          <p className={`text-sm mt-1 ${t.subtitle}`}>
            Loading messages from worldwide relays
          </p>
        </div>
        
        {/* Phase indicator */}
        <div className={`text-sm flex items-center gap-1 ${t.subtitle}`}>
          <span>{phaseText}</span>
          <span className="w-6">{progress.phase !== 'complete' ? dots : ' ✓'}</span>
        </div>
        
        {/* Progress bar */}
        {(progress.phase === 'connecting' || progress.phase === 'fetching') && (
          <div className="w-full">
            <div className="flex justify-between text-xs mb-2">
              <span>{progress.connectedRelays} / {progress.totalRelays} relays</span>
              <span>{percentage}%</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${t.progressBarOuter}`}>
              <div
                className={`h-full rounded-full transition-all duration-300 ease-out ${t.progressBarInner}`}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Event counter */}
        {progress.eventsReceived > 0 && (
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full animate-pulse ${t.dot}`} />
            <span className={`text-2xl font-bold ${t.eventCount}`}>
              {progress.eventsReceived.toLocaleString()}
            </span>
            <span className={`text-sm ${t.subtitle}`}>events</span>
          </div>
        )}
        
        {/* Current relay */}
        {progress.currentRelay && progress.phase === 'fetching' && (
          <div className={`text-xs max-w-full truncate ${t.currentRelay}`}>
            ↳ {progress.currentRelay.replace('wss://', '')}
          </div>
        )}
        
        {/* Error message */}
        {progress.phase === 'error' && progress.errorMessage && (
          <div className="text-red-400 text-sm text-center max-w-md">
            {progress.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
export { LoadingScreen };
