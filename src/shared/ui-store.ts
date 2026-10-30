import { create } from 'zustand';

export type PanelTab = 'Console' | 'Problems' | 'Variables' | 'Call Stack';
export type WorkspaceLayout = 'code' | 'split' | 'focus';
interface UIState {
  layout: WorkspaceLayout;
  setLayout: (layout: WorkspaceLayout) => void;
  paletteMode: 'commands' | 'files' | null;
  paletteQuery: string;
  openPalette: (mode: 'commands' | 'files') => void;
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
  layout: 'split',
  setLayout: (layout) => set({ layout, sidebar: layout !== 'focus', bottom: layout !== 'focus' }),
  paletteMode: null,
  paletteQuery: '',
  openPalette: (paletteMode) => set({ paletteMode, paletteQuery: '' }),
  modal: null,
  sidebar: typeof window === 'undefined' || window.innerWidth >= 760,
  bottom: true,
  panel: 'Console',
  error: null,
  toggleSidebar: () => set((s) => ({ sidebar: !s.sidebar })),
  toggleBottom: () =>
    set((s) => ({ bottom: !s.bottom, layout: s.layout === 'focus' ? 'code' : s.layout })),
  setPanel: (panel) =>
    set((s) => ({ panel, bottom: true, layout: s.layout === 'focus' ? 'split' : s.layout })),
  reportError: (error) => set({ error: error === null ? null : String(error) }),
}));
