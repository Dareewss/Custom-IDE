import { create } from 'zustand';
import type { SourceLocation } from '../../core/trace/events';
import { useWorkspace } from '../explorer/store';
export const useCursor = create<{ line: number; column: number }>(() => ({ line: 1, column: 1 }));
export const useLocation = create<{ target: (SourceLocation & { id: number }) | null }>(() => ({
  target: null,
}));
export function navigateTo(location: SourceLocation) {
  useWorkspace.getState().open(location.path);
  useLocation.setState({ target: { ...location, id: Date.now() } });
}
