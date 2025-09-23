import { Modal } from '../../common/Modal';
import { SettingsPage } from './SettingsPage';
import { NostrEvent } from '../../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "matrix" | "material";
  onThemeChange: (theme: "matrix" | "material") => void;
  powEnabled: boolean;
  onPowToggle: (enabled: boolean) => void;
  powDifficulty: number;
  onPowDifficultyChange: (difficulty: number) => void;
  walletVisible: boolean;
  onWalletToggle: (visible: boolean) => void;
  allStoredEvents: NostrEvent[];
}

export function SettingsModal({ 
  isOpen, 
  onClose, 
  theme, 
  onThemeChange,
  powEnabled,
  onPowToggle,
  powDifficulty,
  onPowDifficultyChange,
  walletVisible,
  onWalletToggle,
  allStoredEvents
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
        walletVisible={walletVisible}
        onWalletToggle={onWalletToggle}
        allStoredEvents={allStoredEvents}
      />
    </Modal>
  );
}
