import { useOverview } from './store';
import type { EdgeKind } from '../../core/model/types';

export function EdgeOptions() {
  const kinds = useOverview((s) => s.edgeKinds);
  const external = useOverview((s) => s.showExternal);
  const expanded = useOverview((s) => s.externalExpanded);
  return (
    <details className="overview-options">
      <summary>Connections</summary>
      <fieldset>
        <legend>Visible connections</legend>
        {(['import', 'call', 'inherits'] as EdgeKind[]).map((kind) => (
          <label key={kind}>
            <input
              type="checkbox"
              checked={kinds[kind]}
              onChange={(event) =>
                useOverview.setState({
                  edgeKinds: { ...kinds, [kind]: event.target.checked },
                  hoveredEdgeId: null,
                })
              }
            />
            {kind === 'inherits' ? 'Inheritance' : kind === 'import' ? 'Imports' : 'Calls'}
          </label>
        ))}
        <label>
          <input
            type="checkbox"
            checked={external}
            onChange={(e) =>
              useOverview.setState({ showExternal: e.target.checked, hoveredEdgeId: null })
            }
          />
          External symbols
        </label>
        <label>
          <input
            type="checkbox"
            checked={expanded}
            disabled={!external}
            onChange={(e) => useOverview.setState({ externalExpanded: e.target.checked })}
          />
          Expand external cluster
        </label>
      </fieldset>
    </details>
  );
}
