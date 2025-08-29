import { useState, useRef, useCallback } from 'react';
import { Station } from '@luigivampa/radio-browser-api';
import { RadioPlayerState } from '../types/radio';

export const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const bufferStartTimeRef = useRef<number>(0);
  const [playerState, setPlayerState] = useState<RadioPlayerState>({
    isPlaying: false,
    currentStation: null,
    volume: 0.7,
    loading: false,
    error: null,
    currentTime: 0,
    duration: 0,
    bufferAvailable: 0,
    isLive: true
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
      audio.oncanplay = () => {
        setPlayerState(prev => ({ 
          ...prev, 
          loading: false, 
          isPlaying: true,
          currentStation: station,
          isLive: true
        }));
        
        // Start recording for buffer
        startBufferRecording(audio);
      };
      audio.onerror = () => setPlayerState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load radio stream',
        isPlaying: false
      }));
      
      // Add time tracking
      audio.ontimeupdate = () => {
        setPlayerState(prev => ({
          ...prev,
          currentTime: audio.currentTime,
          duration: audio.duration || 0
        }));
      };
      
      // Add duration change listener
      audio.ondurationchange = () => {
        setPlayerState(prev => ({
          ...prev,
          duration: audio.duration || 0
        }));
      };
      
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

  const startBufferRecording = useCallback((audio: HTMLAudioElement) => {
    try {
      // Create MediaRecorder to capture audio stream
      const stream = audio.captureStream();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      bufferStartTimeRef.current = Date.now();
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          
          // Keep only last 60 seconds of audio
          const currentTime = Date.now();
          const bufferAge = currentTime - bufferStartTimeRef.current;
          
          if (bufferAge > 60000) { // 60 seconds
            // Remove old chunks to maintain 60-second buffer
            const chunksToRemove = Math.floor((bufferAge - 60000) / 1000);
            audioChunksRef.current = audioChunksRef.current.slice(chunksToRemove);
            bufferStartTimeRef.current = currentTime - 60000;
          }
          
          // Update buffer available time
          setPlayerState(prev => ({
            ...prev,
            bufferAvailable: Math.min(60, bufferAge / 1000)
          }));
        }
      };
      
      mediaRecorder.start(1000); // Capture every second
    } catch (error) {
      console.warn('Buffer recording not supported:', error);
      setPlayerState(prev => ({ ...prev, bufferAvailable: 0 }));
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }
    audioChunksRef.current = [];
    setPlayerState(prev => ({
      ...prev,
      isPlaying: false,
      currentStation: null,
      loading: false,
      error: null,
      currentTime: 0,
      duration: 0,
      bufferAvailable: 0,
      isLive: true
    }));
  }, []);

  const setVolume = useCallback((volume: number) => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
    setPlayerState(prev => ({ ...prev, volume }));
  }, []);

  // Function to seek to a specific time within buffer
  const seekTo = useCallback((time: number) => {
    if (audioRef.current && !isNaN(time) && time >= 0) {
      // For live streams, limit seeking to buffer range
      const maxSeekTime = playerState.bufferAvailable;
      const clampedTime = Math.min(time, maxSeekTime);
      
      if (clampedTime <= maxSeekTime) {
        audioRef.current.currentTime = clampedTime;
        setPlayerState(prev => ({ ...prev, isLive: false }));
      }
    }
  }, [playerState.bufferAvailable]);

  // Function to jump back to live
  const jumpToLive = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = audioRef.current.duration || 0;
      setPlayerState(prev => ({ ...prev, isLive: true }));
    }
  }, []);

  // Helper function to format time as MM:SS
  const formatTime = useCallback((seconds: number): string => {
    if (isNaN(seconds) || seconds === 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    ...playerState,
    play,
    stop,
    setVolume,
    seekTo,
    formatTime,
    jumpToLive
  };
};
