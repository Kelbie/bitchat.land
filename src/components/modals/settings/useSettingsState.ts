import { useState, useEffect } from 'react';

interface SettingsState {
  powEnabled: boolean;
  powDifficulty: number;
  walletVisible: boolean;
}

export function useSettingsState() {
  const [settings, setSettings] = useState<SettingsState>({
    powEnabled: false,
    powDifficulty: 12,
    walletVisible: false,
  });

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('bitchat-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(prev => ({
          ...prev,
          ...parsed,
        }));
      } catch (error) {
        console.warn('Failed to parse saved settings:', error);
      }
    }
  }, []);

  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('bitchat-settings', JSON.stringify(settings));
  }, [settings]);

  const updateSettings = (updates: Partial<SettingsState>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return {
    settings,
    updateSettings,
  };
}
