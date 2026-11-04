import type { CodeModel } from '../../core/model/types';
import type { GraphLayout } from '../../core/model/layout/types';
import { collectionEntries } from '../../core/model/layout/collections';
import { headerPosition } from '../../core/model/layout/metrics';
import type { ValueInstance } from './ValueInstances';

export function valueInstances(model: CodeModel, layout: GraphLayout) {
  const variables: ValueInstance[] = [];
  const cells: ValueInstance[] = [];
  for (const node of model.nodes) {
    const item = layout.items[node.id];
    if (!item) continue;
    if (node.kind === 'variable' && node.meta.role !== 'parameter')
      variables.push({
        node,
        position: node.children.length ? headerPosition(item) : item.position,
        kind: node.meta.valueType,
      });
    if (node.kind !== 'collection') continue;
    const entries = collectionEntries(node);
    for (const cell of layout.cells[node.id] ?? []) {
      const entry = entries[cell.index];
      if (!entry) continue;
      cells.push({
        node,
        position: cell.position,
        kind: cell.part === 'key' ? entry.keyType : entry.valueType,
        detail: `${cell.part} ${cell.index + 1}: ${cell.part === 'key' ? entry.key : entry.value}`,
      });
    }
  }
  return { variables, cells };
}
