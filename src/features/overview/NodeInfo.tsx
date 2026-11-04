import { collectionEntries } from '../../core/model/layout/collections';
import { useOverview } from './store';

export function NodeInfo() {
  const node = useOverview((state) =>
    state.indexes?.nodeById.get(state.hoveredNodeId ?? state.selectedNodeId ?? ''),
  );
  const detail = useOverview((state) => state.hoveredDetail);
  if (!node || !['variable', 'collection'].includes(node.kind)) return null;
  const entries = collectionEntries(node);
  return (
    <aside className="overview-node-info" role="tooltip" id="overview-node-info">
      <strong>{node.name}</strong>
      <span>
        {node.meta.typeHint ??
          (node.kind === 'collection' ? node.meta.collectionKind : node.meta.valueType) ??
          node.kind}
      </span>
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
