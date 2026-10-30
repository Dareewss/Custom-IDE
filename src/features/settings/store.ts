import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { defaultSettings, parseSettings, type Settings } from './model';

interface SettingsState extends Settings {
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  setFormatOnSave: (value: boolean) => void;
}
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      setSetting: (key, value) => set((s) => parseSettings({ ...s, [key]: value })),
      setFormatOnSave: (formatOnSave) => set({ formatOnSave }),
    }),
    {
      name: 'atlas-settings',
      version: 1,
      migrate: (value) => parseSettings(value),
      merge: (persisted, current) => ({ ...current, ...parseSettings(persisted) }),
    },
  ),
);
