import { useState, useEffect } from 'react';
import { TorManager, TorMode } from '../../../services/tor';

interface SettingsState {
  powEnabled: boolean;
  powDifficulty: number;
  torMode: TorMode;
}

export function useSettingsState() {
  const [settings, setSettings] = useState<SettingsState>({
    powEnabled: false,
    powDifficulty: 12,
    torMode: TorMode.OFF,
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
          torMode: parsed.torMode ?? TorMode.OFF,
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

  useEffect(() => {
    TorManager.setMode(settings.torMode);
  }, [settings.torMode]);

  const updateSettings = (updates: Partial<SettingsState>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return {
    settings,
    updateSettings,
  };
}
