import type { CodeNode } from '../../core/model/types';
import { navigateTo } from '../editor/navigation';
import { useUI } from '../../shared/ui-store';
import { useOverview } from './store';
import { ensureOverviewVisible } from './view-actions';

export function selectOverviewNode(node: CodeNode) {
  ensureOverviewVisible(node.id);
  useOverview.setState((state) => ({
    selectedNodeId: node.id,
    hoveredNodeId: null,
    hoveredDetail: null,
    hoveredEdgeId: null,
    focusRequest: { nodeId: node.id, sequence: (state.focusRequest?.sequence ?? 0) + 1 },
  }));
  if (node.kind !== 'external') {
    if (useUI.getState().layout === '3d') useUI.getState().setLayout('split');
    navigateTo({ path: node.fileId, line: node.range.startLine, column: node.range.startCol });
  }
}

export function setOverviewHover(nodeId: string | null, detail: string | null = null): void {
  const state = useOverview.getState();
  if (
    state.hoveredNodeId !== nodeId ||
    state.hoveredDetail !== detail ||
    (nodeId && state.hoveredEdgeId)
  )
    useOverview.setState({
      hoveredNodeId: nodeId,
      hoveredDetail: detail,
      ...(nodeId ? { hoveredEdgeId: null } : {}),
    });
}
