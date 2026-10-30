import { create } from 'zustand';

export type PanelTab = 'Console' | 'Problems' | 'Variables' | 'Call Stack';
interface UIState {
  modal: 'settings' | 'projects' | null;
  sidebar: boolean;
  bottom: boolean;
  panel: PanelTab;
  error: string | null;
  toggleSidebar: () => void;
  toggleBottom: () => void;
  setPanel: (panel: PanelTab) => void;
  reportError: (error: unknown) => void;
}
export const useUI = create<UIState>((set) => ({
  modal: null,
  sidebar: true,
  bottom: true,
  panel: 'Console',
  error: null,
  toggleSidebar: () => set((s) => ({ sidebar: !s.sidebar })),
  toggleBottom: () => set((s) => ({ bottom: !s.bottom })),
  setPanel: (panel) => set({ panel, bottom: true }),
  reportError: (error) => set({ error: error === null ? null : String(error) }),
}));
