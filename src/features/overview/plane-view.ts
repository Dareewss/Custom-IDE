import { create } from 'zustand';
import { useUI } from '../../shared/ui-store';

type PlaneMode = 'flat' | 'layers' | 'classic';
const rendererKey = 'atlas-overview-renderer';
function readMode(): PlaneMode {
  try {
    const mode = localStorage.getItem(rendererKey);
    return mode === 'classic' || mode === 'layers' ? mode : 'flat';
  } catch {
    return 'flat';
  }
}
export const usePlaneView = create<{
  mode: PlaneMode;
  pixelsPerUnit: number;
  rootId: string | null;
  gap: number;
}>(() => ({
  mode: readMode(),
  pixelsPerUnit: 24,
  rootId: null,
  gap: 5,
}));
export function setPlaneMode(mode: PlaneMode) {
  usePlaneView.setState({ mode });
  try {
    localStorage.setItem(rendererKey, mode);
  } catch (error) {
    useUI.getState().reportError(error);
  }
}
