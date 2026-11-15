import { create } from 'zustand';
import { useUI } from '../../shared/ui-store';

type PlaneMode = 'flat' | 'classic';
const rendererKey = 'atlas-overview-renderer';
function readMode(): PlaneMode {
  try {
    return localStorage.getItem(rendererKey) === 'classic' ? 'classic' : 'flat';
  } catch {
    return 'flat';
  }
}
export const usePlaneView = create<{ mode: PlaneMode }>(() => ({ mode: readMode() }));
export function setPlaneMode(mode: PlaneMode) {
  usePlaneView.setState({ mode });
  try {
    localStorage.setItem(rendererKey, mode);
  } catch (error) {
    useUI.getState().reportError(error);
  }
}
