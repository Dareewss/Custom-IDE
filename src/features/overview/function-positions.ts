import { parseFunctionOffsets, validOffset, isCallable } from '../../core/model/layout/offsets';
import type { FunctionOffsets } from '../../core/model/layout/offsets';
import type { Vec3 } from '../../core/model/layout/types';
import { useOverview } from './store';
import { useUI } from '../../shared/ui-store';

export function readFunctionOffsets(projectId: string): FunctionOffsets {
  try {
    return parseFunctionOffsets(
      JSON.parse(localStorage.getItem(`atlas-function-positions-${projectId}`) ?? 'null'),
    );
  } catch {
    return {};
  }
}
export function saveFunctionOffsets() {
  const { projectId, functionOffsets } = useOverview.getState();
  if (!projectId) return;
  try {
    localStorage.setItem(`atlas-function-positions-${projectId}`, JSON.stringify(functionOffsets));
  } catch (error) {
    useUI.getState().reportError(error);
  }
}
export function moveFunction(id: string, offset: Vec3, persist = true) {
  const state = useOverview.getState();
  if (!validOffset(offset) || !isCallable(state.indexes?.nodeById.get(id)?.kind ?? '')) return;
  const functionOffsets = { ...state.functionOffsets };
  if (offset.some(Boolean)) functionOffsets[id] = offset;
  else delete functionOffsets[id];
  useOverview.setState({ functionOffsets });
  if (persist) saveFunctionOffsets();
}
