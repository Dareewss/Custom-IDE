import type { ModelView } from '../../core/model/view';
import { useOverview } from './store';
import { writeView } from './view-state';
import { useUI } from '../../shared/ui-store';

export function setOverviewView(patch: Partial<ModelView>): void {
  const state = useOverview.getState();
  const view = {
    depth: patch.depth ?? state.depth,
    collapsedIds: patch.collapsedIds ?? state.collapsedIds,
  };
  useOverview.setState(view);
  if (state.projectId)
    try {
      writeView(state.projectId, view);
    } catch (error) {
      useUI.getState().reportError(error);
    }
}
export function toggleOverviewNode(id: string): void {
  const state = useOverview.getState(),
    node = state.indexes?.nodeById.get(id);
  if (state.loading) return;
  if (!node?.children.length) return;
  const collapsed = state.compactIds.includes(id);
  if (collapsed) {
    const ancestors = new Set<string>([id]);
    let current = node.parentId;
    while (current) {
      ancestors.add(current);
      current = state.indexes?.nodeById.get(current)?.parentId ?? null;
    }
    setOverviewView({
      depth: 'all',
      collapsedIds: state.collapsedIds.filter((nodeId) => !ancestors.has(nodeId)),
    });
  } else setOverviewView({ collapsedIds: [...state.collapsedIds, id] });
}
export function ensureOverviewVisible(id: string): void {
  const state = useOverview.getState();
  if (state.ownerByNode[id] === id) return;
  const ancestors = new Set<string>();
  let current = state.indexes?.nodeById.get(id)?.parentId;
  while (current) {
    ancestors.add(current);
    current = state.indexes?.nodeById.get(current)?.parentId;
  }
  setOverviewView({
    depth: 'all',
    collapsedIds: state.collapsedIds.filter((nodeId) => !ancestors.has(nodeId)),
  });
}
