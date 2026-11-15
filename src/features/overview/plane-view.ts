import { parsePlanePreferences, type PlanePreferences } from './plane-preferences';
import { useOverview } from './store';
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
export const usePlaneView = create<
  PlanePreferences & { projectId: string | null; pixelsPerUnit: number; hiddenEdges: number }
>(() => ({
  ...parsePlanePreferences(null),
  mode: readMode(),
  projectId: null,
  pixelsPerUnit: 24,
  hiddenEdges: 0,
}));
export function loadPlaneProject(projectId: string) {
  let value: unknown = null;
  try {
    value = JSON.parse(localStorage.getItem(`atlas-overview-planes-${projectId}`) ?? 'null');
  } catch {
    /* Invalid saved preferences safely use defaults. */
  }
  const prefs = parsePlanePreferences(value);
  if (value === null) prefs.mode = readMode() === 'classic' ? 'classic' : 'flat';
  usePlaneView.setState({ ...prefs, projectId, pixelsPerUnit: 24, hiddenEdges: 0 });
  return prefs;
}
usePlaneView.subscribe((state, previous) => {
  if (!state.projectId) return;
  const value = JSON.stringify(parsePlanePreferences(state));
  if (
    state.projectId === previous.projectId &&
    value === JSON.stringify(parsePlanePreferences(previous))
  )
    return;
  try {
    localStorage.setItem(`atlas-overview-planes-${state.projectId}`, value);
  } catch (error) {
    useUI.getState().reportError(error);
  }
});
useOverview.subscribe((state, previous) => {
  if (
    state.projectId === previous.projectId &&
    state.projectId === usePlaneView.getState().projectId &&
    (state.searchQuery !== previous.searchQuery || state.searchKind !== previous.searchKind)
  )
    usePlaneView.setState({ query: state.searchQuery, kind: state.searchKind });
});
export function setPlaneMode(mode: PlaneMode) {
  usePlaneView.setState({ mode });
  try {
    localStorage.setItem(rendererKey, mode);
  } catch (error) {
    useUI.getState().reportError(error);
  }
}
