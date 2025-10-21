import React, { createContext, useContext, ReactNode } from 'react';
import { useAudioPlayer } from '@/components/features/radio/hooks/useAudioPlayer';
import { RadioPlayerState, StationWithDistance } from '@/types/app';

interface RadioPlayerContextValue extends RadioPlayerState {
  play: (station: StationWithDistance) => Promise<void>;
  stop: () => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  formatTime: (seconds: number) => string;
  jumpToLive: () => void;
}

const RadioPlayerContext = createContext<RadioPlayerContextValue | undefined>(undefined);

export function RadioPlayerProvider({ children }: { children: ReactNode }) {
  const player = useAudioPlayer();
  return (
    <RadioPlayerContext.Provider value={player}>
      {children}
    </RadioPlayerContext.Provider>
  );
}

export function useRadioPlayerContext(): RadioPlayerContextValue {
  const ctx = useContext(RadioPlayerContext);
  if (!ctx) {
    throw new Error('useRadioPlayerContext must be used within RadioPlayerProvider');
  }
  return ctx;
}


