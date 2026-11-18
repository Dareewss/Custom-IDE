import { useOverview } from './store';
import { exitIsolation, isolateSelected, setOverviewView } from './view-actions';

export function IsolationBar() {
  const selected = useOverview((s) =>
    s.selectedNodeId ? s.indexes?.nodeById.get(s.selectedNodeId) : undefined,
  );
  const isolate = useOverview((s) => s.isolate);
  const root = useOverview((s) =>
    s.isolate ? s.indexes?.nodeById.get(s.isolate.nodeId) : undefined,
  );
  const loading = useOverview((s) => s.loading);
  if (!isolate && (!selected || !['function', 'method', 'class'].includes(selected.kind)))
    return null;
  return (
    <div className="isolation-bar">
      {isolate ? (
        <>
          <span title={root?.meta.qualifiedName ?? root?.name}>
            Isolated · {root?.kind} {root?.name}
          </span>
          <label>
            Depth{' '}
            <select
              aria-label="Isolation depth"
              value={isolate.depth}
              disabled={loading}
              onChange={(e) => {
                setOverviewView({ isolate: { ...isolate, depth: Number(e.target.value) } });
                useOverview.setState({ fitAfterView: true });
              }}
            >
              {[0, 1, 2, 3].map((depth) => (
                <option key={depth} value={depth}>
                  {depth}
                </option>
              ))}
            </select>
          </label>
          <button type="button" onClick={exitIsolation}>
            Exit isolate
          </button>
        </>
      ) : (
        <button type="button" disabled={loading} onClick={isolateSelected}>
          Isolate selected structure
        </button>
      )}
    </div>
  );
}
