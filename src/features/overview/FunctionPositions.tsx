import { RotateCcw } from 'lucide-react';
import { IconButton } from '../../shared/IconButton';
import { isCallable } from '../../core/model/layout/offsets';
import type { Vec3 } from '../../core/model/layout/types';
import { useOverview } from './store';
import { moveFunction } from './function-positions';

export function FunctionPositions() {
  const node = useOverview((state) => state.indexes?.nodeById.get(state.selectedNodeId ?? ''));
  const offsets = useOverview((state) => state.functionOffsets);
  const offset = (node && offsets[node.id]) ?? [0, 0, 0];
  return (
    <div className="function-position-bar" role="group" aria-label="Function position">
      {node && isCallable(node.kind) ? (
        <>
          {(['X', 'Y', 'Z'] as const).map((axis, index) => (
            <label key={axis}>
              {axis}
              <input
                type="number"
                aria-label={`Function ${axis} offset`}
                min={-10000}
                max={10000}
                step={0.5}
                value={+offset[index].toFixed(2)}
                onChange={(event) => {
                  const value = event.target.valueAsNumber;
                  if (!Number.isFinite(value)) return;
                  const next = offset.slice() as Vec3;
                  next[index] = value;
                  moveFunction(node.id, next);
                }}
              />
            </label>
          ))}
          <IconButton
            label="Reset function position"
            disabled={!offset.some(Boolean)}
            onClick={() => moveFunction(node.id, [0, 0, 0])}
          >
            <RotateCcw size={14} />
          </IconButton>
        </>
      ) : (
        <small title="Drag a function to move it. Shift-drag adjusts Z depth.">
          Drag a function to move · Shift-drag for Z
        </small>
      )}
    </div>
  );
}
