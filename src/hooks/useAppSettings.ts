import { useState, useEffect } from 'react';

export interface AppSettings {
  fontSize: number;
  watermarkPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  autoSave: boolean;
  watermarkText: string;
  fontSize2: number;
  watermarkPosition2: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  watermarkText2: string;
  enableWatermark2: boolean;
}

const DEFAULT_SETTINGS: AppSettings = {
  fontSize: 14,
  watermarkPosition: 'top-left',
  autoSave: false,
  watermarkText: '{{lat}}, {{lng}}',
  fontSize2: 12,
  watermarkPosition2: 'bottom-right',
  watermarkText2: '{{acc}}',
  enableWatermark2: false,
};

const useAppSettings = () => {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const savedSettings = localStorage.getItem('geoCamSettings');
      return savedSettings ? { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) } : DEFAULT_SETTINGS;
    } catch (err) {
      console.error("Could not load settings:", err);
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('geoCamSettings', JSON.stringify(settings));
    } catch (err) {
      console.error("Could not save settings:", err);
    }
  }, [settings]);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return {
    settings,
    updateSettings
  };
};

export default useAppSettings;