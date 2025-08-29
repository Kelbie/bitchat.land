import { useState, useRef, useCallback } from 'react';
import { Station } from '@luigivampa/radio-browser-api';
import { RadioPlayerState } from '../types/radio';

export const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playerState, setPlayerState] = useState<RadioPlayerState>({
    isPlaying: false,
    currentStation: null,
    volume: 0.7,
    loading: false,
    error: null
  });

  const play = useCallback(async (station: Station) => {
    try {
      setPlayerState(prev => ({ ...prev, loading: true, error: null }));
      
      // Stop current stream if playing
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      
      // Create new audio element
      const audio = new Audio(station.urlResolved || station.url);
      audio.volume = playerState.volume;
      
      // Set up event listeners
      audio.onloadstart = () => setPlayerState(prev => ({ ...prev, loading: true }));
      audio.oncanplay = () => setPlayerState(prev => ({ 
        ...prev, 
        loading: false, 
        isPlaying: true,
        currentStation: station 
      }));
      audio.onerror = () => setPlayerState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load radio stream',
        isPlaying: false
      }));
      
      audioRef.current = audio;
      await audio.play();
      
    } catch (error) {
      setPlayerState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to play radio stream',
        isPlaying: false
      }));
    }
  }, [playerState.volume]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayerState(prev => ({
      ...prev,
      isPlaying: false,
      currentStation: null,
      loading: false,
      error: null
    }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    setPlayerState(prev => ({ ...prev, volume }));
  }, []);

  return {
    ...playerState,
    play,
    stop,
    setVolume
  };
};
