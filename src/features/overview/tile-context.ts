import { useMemo } from 'react';
import type { ModelIndexes } from '../../core/model/indexes';
import type { StructureLayout } from '../../core/model/layout/structure-types';
import { useOverview } from './store';
import { usePlaneView } from './plane-view';

export function descendants(indexes: ModelIndexes | null, id: string | null): Set<string> | null {
  if (!id || !indexes?.nodeById.has(id)) return null;
  const result = new Set<string>(),
    pending = [id];
  while (pending.length) {
    const current = pending.pop()!;
    if (result.has(current)) continue;
    result.add(current);
    pending.push(...(indexes.nodeById.get(current)?.children ?? []));
  }
  return result;
}
export function relatedNodes(indexes: ModelIndexes | null, id: string | null): Set<string> | null {
  const result = descendants(indexes, id);
  if (!result || !id) return null;
  let parent = indexes?.nodeById.get(id)?.parentId;
  while (parent && !result.has(parent)) {
    result.add(parent);
    parent = indexes?.nodeById.get(parent)?.parentId;
  }
  for (const edge of indexes?.edgesByNode.get(id) ?? []) {
    result.add(edge.from);
    result.add(edge.to);
  }
  return result;
}
export function useTileContext(layout: StructureLayout, fileId: string) {
  const indexes = useOverview((s) => s.indexes),
    selected = useOverview((s) => s.selectedNodeId);
  const rootId = usePlaneView((s) => s.rootId);
  const scope = useMemo(() => descendants(indexes, rootId), [indexes, rootId]);
  const related = useMemo(() => relatedNodes(indexes, selected), [indexes, selected]);
  const visible = useMemo(
    () =>
      layout.tiles.flatMap((tile, index) =>
        tile.fileId === fileId && (!scope || tile.nodeIds.some((id) => scope.has(id)))
          ? [{ tile, index }]
          : [],
      ),
    [layout, fileId, scope],
  );
  return { visible, related };
}
export function rootUp() {
  const { rootId } = usePlaneView.getState();
  const node = rootId ? useOverview.getState().indexes?.nodeById.get(rootId) : undefined;
  const parent = node?.parentId
    ? useOverview.getState().indexes?.nodeById.get(node.parentId)
    : undefined;
  usePlaneView.setState({ rootId: parent?.kind === 'file' ? null : (parent?.id ?? null) });
}
