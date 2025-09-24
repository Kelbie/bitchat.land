import { useState } from "react";
import { useAudioPlayer } from "./useAudioPlayer";
import { RadioService } from "@/services/radioService";
import { StationWithDistance, PlayerState, PlayerActions } from "@/types/app";

const radioService = new RadioService();

export function useRadioPlayer(stations: StationWithDistance[]) {
  const [currentStation, setCurrentStation] = useState<StationWithDistance | null>(null);
  const [currentStationIndex, setCurrentStationIndex] = useState(0);
  const audioPlayer = useAudioPlayer();

  const handleStationPlay = async (station: StationWithDistance) => {
    try {
      // Record click for Radio Browser statistics
      await radioService.recordStationClick(station.id);

      // Play the station
      await audioPlayer.play(station);
      setCurrentStation(station);
      setCurrentStationIndex(
        stations.findIndex((s) => s.id === station.id)
      );
    } catch (error) {
      console.error("Failed to play station:", error);
    }
  };

  const handlePlayPause = () => {
    if (currentStation) {
      if (audioPlayer.isPlaying) {
        audioPlayer.stop();
        setCurrentStation(null);
      } else {
        handleStationPlay(currentStation);
      }
    } else if (stations.length > 0) {
      // Start playing the first station
      handleStationPlay(stations[0]);
      setCurrentStationIndex(0);
    }
  };

  const handlePrevious = () => {
    if (stations.length === 0) return;

    const newIndex =
      currentStationIndex > 0 ? currentStationIndex - 1 : stations.length - 1;
    setCurrentStationIndex(newIndex);

    if (currentStation) {
      // If currently playing, switch to new station
      handleStationPlay(stations[newIndex]);
    }
  };

  const handleNext = () => {
    if (stations.length === 0) return;

    const newIndex =
      currentStationIndex < stations.length - 1 ? currentStationIndex + 1 : 0;
    setCurrentStationIndex(newIndex);

    if (currentStation) {
      // If currently playing, switch to new station
      handleStationPlay(stations[newIndex]);
    }
  };

  const playerState: PlayerState = {
    currentStation,
    isPlaying: audioPlayer.isPlaying,
    currentTime: audioPlayer.currentTime,
    duration: audioPlayer.duration,
    volume: audioPlayer.volume,
  };

  const playerActions: PlayerActions = {
    onPlayPause: handlePlayPause,
    onPrevious: handlePrevious,
    onNext: handleNext,
    onSeek: audioPlayer.seekTo,
    onVolumeChange: audioPlayer.setVolume,
    formatTime: audioPlayer.formatTime,
  };

  return {
    playerState,
    playerActions,
    handleStationPlay,
  };
}
