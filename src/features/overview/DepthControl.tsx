import { setOverviewView } from './view-actions';
import { useOverview } from './store';
import type { DepthPreset } from '../../core/model/view';

export function DepthControl() {
  const depth = useOverview((state) => state.depth);
  return (
    <label className="overview-depth">
      Detail
      <select
        aria-label="3D detail level"
        value={depth}
        onChange={(event) =>
          setOverviewView({ depth: event.target.value as DepthPreset, collapsedIds: [] })
        }
      >
        <option value="files">Files</option>
        <option value="classes">+ Classes</option>
        <option value="functions">+ Functions</option>
        <option value="all">All objects</option>
      </select>
    </label>
  );
}
