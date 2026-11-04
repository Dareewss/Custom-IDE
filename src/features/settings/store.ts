import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultSettings, parseSettings, migrateSettings, type Settings } from './model';
import { retryOrbMotion } from '../appearance/motion-budget';

interface SettingsState extends Settings {
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setSetting: (key, value) => {
        if (key === 'backgroundAnimation' && value === true) retryOrbMotion();
        set((s) => parseSettings({ ...s, [key]: value }));
      },
    }),
    {
      name: 'atlas-settings',
      version: 11,
      migrate: migrateSettings,
      merge: (persisted, current) => ({ ...current, ...parseSettings(persisted) }),
    },
  ),
);
