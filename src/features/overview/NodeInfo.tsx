import { collectionEntries } from '../../core/model/layout/collections';
import { useOverview } from './store';

export function NodeInfo() {
  const edge = useOverview((state) =>
    state.model?.edges.find((edge) => edge.id === state.hoveredEdgeId),
  );
  const model = useOverview((state) => state.model);
  const node = useOverview((state) =>
    state.indexes?.nodeById.get(state.hoveredNodeId ?? state.selectedNodeId ?? ''),
  );
  const detail = useOverview((state) => state.hoveredDetail);
  if (edge)
    return (
      <aside className="overview-node-info" role="tooltip">
        <strong>
          {edge.kind === 'inherits'
            ? 'Inheritance'
            : edge.kind === 'call'
              ? 'Function call'
              : 'Import'}
        </strong>
        <p>
          {model?.nodes.find((node) => node.id === edge.from)?.name} →{' '}
          {model?.nodes.find((node) => node.id === edge.to)?.name}
        </p>
        <span>
          {edge.resolved
            ? `Static match · ${Math.round(edge.confidence * 100)}% confidence`
            : 'Unresolved · dashed connection'}
        </span>
        <small>Click to open the source</small>
      </aside>
    );
  if (!node) return null;
  const entries = collectionEntries(node);
  return (
    <aside className="overview-node-info" role="tooltip" id="overview-node-info">
      <strong>{node.name}</strong>
      <span>
        {node.meta.typeHint ??
          (node.kind === 'collection' ? node.meta.collectionKind : node.meta.valueType) ??
          node.kind}
      </span>
      {node.fileId && (
        <small>
          {node.fileId}:{node.range.startLine}
        </small>
      )}
      {node.kind === 'loop' && (
        <p>
          {node.meta.loopKind ?? 'Loop'} · {node.children.length} body objects
        </p>
      )}
      {node.kind === 'condition' && (
        <p>{node.meta.branchCount ?? 2} possible branches · static structure</p>
      )}
      {node.kind === 'collection' && (
        <>
          <p>
            {node.meta.elementCount === undefined
              ? 'Computed collection'
              : `${node.meta.elementCount} declared ${node.meta.collectionKind === 'dict' ? 'entries' : 'items'}`}
          </p>
          {entries.length > 0 && (
            <ol>
              {entries.map((entry, index) => (
                <li key={index}>
                  {entry.key !== undefined && <span>{entry.key}: </span>}
                  <code>{entry.value}</code>
                </li>
              ))}
            </ol>
          )}
          {node.meta.elementCount !== undefined && node.meta.elementCount > entries.length && (
            <small>{node.meta.elementCount - entries.length} more</small>
          )}
        </>
      )}
      {detail && <small>{detail}</small>}
    </aside>
  );
}
