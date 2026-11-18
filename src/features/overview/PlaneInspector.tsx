import { useStaticMarkers } from './OverlayLayer';
import { useMemo, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { planeNames } from '../../core/model/layout/structure-types';
import { lineSpan } from '../../core/model/layout/line-map';
import type { SourceRange } from '../../core/model/types';
const lines = (range: SourceRange) => {
  const [a, b] = lineSpan(range);
  return b - a;
};
import { useOverview } from './store';
import { setPlaneMode, usePlaneView } from './plane-view';
import { descendants } from './tile-context';
import { useSceneColors } from './scene-tokens';
import { tileColor } from './tile-labels';
import { ObjectSearch } from './ObjectSearch';
import { DepthControl } from './DepthControl';
import { IsolationBar } from './IsolationBar';
import { nodeDetails } from './node-details';
import { selectOverviewNode } from './selection';
import { toggleOverviewNode } from './view-actions';
export function PlaneInspector() {
  const [expanded, setExpanded] = useState(() => window.innerWidth > 900);
  const markers = useStaticMarkers();
  const model = useOverview((s) => s.model),
    indexes = useOverview((s) => s.indexes),
    selected = useOverview((s) => s.selectedNodeId),
    compact = useOverview((s) => s.compactIds),
    structure = useOverview((s) => s.structure);
  const prefs = usePlaneView(),
    colors = useSceneColors();
  const scope = useMemo(() => descendants(indexes, prefs.rootId), [indexes, prefs.rootId]);
  const stats = useMemo(() => {
    const nodes =
      model?.nodes.filter((n) => (!scope || scope.has(n.id)) && n.kind !== 'external') ?? [];
    const count = (k: string[]) => nodes.filter((n) => k.includes(n.kind)).length;
    let depth = 0;
    for (const n of nodes) {
      let p = n.parentId,
        d = 0;
      const seen = new Set<string>();
      while (p && !seen.has(p)) {
        seen.add(p);
        d++;
        p = indexes?.nodeById.get(p)?.parentId ?? null;
      }
      depth = Math.max(depth, d);
    }
    const root = prefs.rootId ? indexes?.nodeById.get(prefs.rootId) : null;
    return {
      Files: count(['file']),
      Classes: count(['class']),
      Functions: count(['function', 'method']),
      Loops: count(['loop']),
      Conditions: count(['condition']),
      'Max depth': depth,
      Lines: root?.range
        ? lines(root.range)
        : nodes
            .filter((n) => n.kind === 'file')
            .reduce((sum, n) => sum + (n.range ? lines(n.range) : 0), 0),
    };
  }, [model, indexes, scope, prefs.rootId]);
  const node = indexes?.nodeById.get(selected ?? ''),
    details = node && model && indexes ? nodeDetails(node, model, indexes) : null;
  const tile = selected ? structure?.rects[selected] : null;
  return (
    <aside
      className="plane-inspector"
      aria-label="Structure inspector"
      data-expanded={String(expanded)}
    >
      <button
        className="plane-inspector-toggle"
        aria-label={expanded ? 'Collapse structure inspector' : 'Expand structure inspector'}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? <PanelLeftClose size={14} /> : <PanelLeftOpen size={14} />}
        {expanded && <strong>Scope</strong>}
      </button>
      {expanded && (
        <div className="plane-inspector-content">
          <dl aria-label="Scope statistics">
            {Object.entries(stats).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <label>
            Mode{' '}
            <select
              aria-label="Structure view mode"
              value={prefs.mode}
              onChange={(e) => setPlaneMode(e.target.value === 'layers' ? 'layers' : 'flat')}
            >
              <option value="flat">Flat</option>
              <option value="layers">Layers</option>
            </select>
          </label>
          {prefs.mode === 'layers' && (
            <label>
              Plane gap{' '}
              <input
                aria-label="Plane gap"
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={prefs.gap}
                onChange={(e) => usePlaneView.setState({ gap: Number(e.target.value) })}
              />
              <output>{prefs.gap}</output>
            </label>
          )}
          <fieldset>
            <legend>Levels / legend</legend>
            {planeNames.map((name, level) => (
              <label key={name}>
                <input
                  type="checkbox"
                  aria-label={`Show ${name}`}
                  checked={prefs.levels[level]}
                  onChange={(e) =>
                    usePlaneView.setState({
                      levels: prefs.levels.map((v, i) => (i === level ? e.target.checked : v)),
                    })
                  }
                />
                <i style={{ background: tileColor(level, colors) }} />L{level} · {name}
              </label>
            ))}
          </fieldset>
          <label>
            <input
              type="checkbox"
              checked={prefs.extrude}
              onChange={(e) => usePlaneView.setState({ extrude: e.target.checked })}
            />
            Extrude by complexity
          </label>
          <label>
            Connections{' '}
            <select
              aria-label="Tile connections"
              value={prefs.edges}
              onChange={(e) =>
                usePlaneView.setState({ edges: e.target.value as typeof prefs.edges })
              }
            >
              <option value="none">No edges</option>
              <option value="context">Callers / callees</option>
              <option value="all">All edges (200 max)</option>
            </select>
          </label>
          <label>
            <input
              type="checkbox"
              aria-label="Import bands"
              checked={prefs.imports}
              onChange={(e) => usePlaneView.setState({ imports: e.target.checked })}
            />
            Import bands
          </label>
          {prefs.hiddenEdges > 0 && (
            <output aria-label="Hidden connections">+{prefs.hiddenEdges} hidden</output>
          )}
          <DepthControl />
          <ObjectSearch />
          <IsolationBar />
          <small>F fit all · Shift+F selection · C collapse · I isolate · Esc parent</small>
          <details>
            <summary>Markers ({markers.length})</summary>
            <ul>
              {markers.map((marker) => (
                <li key={marker.id}>{marker.label}</li>
              ))}
            </ul>
          </details>
          {node && details && (
            <section aria-label="Selected structure">
              <strong>{node.name}</strong>
              <p>
                {node.kind} · {details.lines} lines
                {details.share !== null ? ` · ${details.share}% of parent` : ''}
              </p>
              <small>
                {node.fileId}:{node.range?.startLine}:{node.range?.startCol}
              </small>
              <p>
                {details.children} children · {details.diagnostics.length} diagnostics
              </p>
              {node.children.length > 0 && (
                <button onClick={() => toggleOverviewNode(node.id)}>
                  {compact.includes(node.id) ? 'Expand selected' : 'Collapse selected'}
                </button>
              )}
              {(['callers', 'callees'] as const).map((kind) => (
                <div key={kind}>
                  <strong>
                    {kind} ({details[kind].length})
                  </strong>
                  <ul>
                    {details[kind].map((edge) => {
                      const target = indexes?.nodeById.get(
                        kind === 'callers' ? edge.from : edge.to,
                      );
                      return (
                        <li key={edge.id}>
                          <button
                            disabled={!target || target.kind === 'external'}
                            onClick={() => target && selectOverviewNode(target)}
                          >
                            {target?.name ?? 'Unknown'}
                            {!edge.resolved ? ' (unresolved)' : ''}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {tile && tile.nodeIds.length > 1 && (
                <div>
                  <strong>{tile.nodeIds.length} aggregated objects</strong>
                  <ul>
                    {tile.nodeIds.map((id) => {
                      const member = indexes?.nodeById.get(id);
                      return (
                        <li key={id}>
                          <button onClick={() => member && selectOverviewNode(member)}>
                            {member?.name}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </aside>
  );
}
