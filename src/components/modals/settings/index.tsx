import React from 'react';
import { Modal } from '../../common/Modal';
import { SettingsPage } from './SettingsPage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "matrix" | "material";
  onThemeChange: (theme: "matrix" | "material") => void;
  powEnabled: boolean;
  onPowToggle: (enabled: boolean) => void;
  powDifficulty: number;
  onPowDifficultyChange: (difficulty: number) => void;
}

export function SettingsModal({ 
  isOpen, 
  onClose, 
  theme, 
  onThemeChange,
  powEnabled,
  onPowToggle,
  powDifficulty,
  onPowDifficultyChange
}: SettingsModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Settings"
      theme={theme}
      size="lg"
    >
      <SettingsPage
        theme={theme}
        onThemeChange={onThemeChange}
        powEnabled={powEnabled}
        onPowToggle={onPowToggle}
        powDifficulty={powDifficulty}
        onPowDifficultyChange={onPowDifficultyChange}
      />
    </Modal>
  );
}
