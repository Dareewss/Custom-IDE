import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  formatOnSave: boolean;
  setFormatOnSave: (value: boolean) => void;
}
export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({ formatOnSave: false, setFormatOnSave: (formatOnSave) => set({ formatOnSave }) }),
    { name: 'atlas-settings' },
  ),
);
