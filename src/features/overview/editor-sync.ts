import { monaco } from '../editor/monaco';
import { useWorkspace } from '../explorer/store';
import { useUI } from '../../shared/ui-store';
import { nodeAtPosition } from '../../core/model/indexes';
import type { CodeNode } from '../../core/model/types';
import { useOverview } from './store';
import { setOverviewHover } from './selection';
import { ensureOverviewVisible } from './view-actions';

/** Each editor owns an independent decoration collection; debugger markers stay untouched. */
export function attachOverviewSync(editor: monaco.editor.IStandaloneCodeEditor): void {
  const decorations = editor.createDecorationsCollection();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let awaitingAnalysis = false;
  const current = () => {
    const workspace = useWorkspace.getState(),
      state = useOverview.getState();
    const model = editor.getModel();
    if (
      !model ||
      state.projectId !== workspace.projectId ||
      model.uri.authority !== workspace.projectId ||
      model.uri.path.slice(1) !== workspace.active
    )
      return null;
    return { state, path: workspace.active! };
  };
  const rangeFor = (node: CodeNode) =>
    node.range
      ? new monaco.Range(
          node.range.startLine,
          node.range.startCol,
          node.range.endLine,
          node.range.endCol,
        )
      : null;
  const decorate = () => {
    const value = current();
    const items: monaco.editor.IModelDeltaDecoration[] = [];
    if (value)
      for (const [id, className] of [
        [value.state.selectedNodeId, 'overview-source-selected'],
        [value.state.hoveredNodeId, 'overview-source-hover'],
      ] as const) {
        const node = id ? value.state.indexes?.nodeById.get(id) : undefined;
        const range = node && node.fileId === value.path ? rangeFor(node) : null;
        if (range)
          items.push({
            range,
            options: {
              className,
              isWholeLine: true,
              stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
            },
          });
      }
    decorations.set(items);
  };
  const sync = () => {
    const value = current(),
      position = editor.getPosition();
    if (
      awaitingAnalysis ||
      !value?.state.indexes ||
      !position ||
      !editor.hasTextFocus() ||
      useUI.getState().layout !== 'split'
    )
      return;
    const node = nodeAtPosition(
      value.state.indexes,
      value.path,
      position.lineNumber,
      position.column,
    );
    if (node && node.id !== value.state.selectedNodeId) {
      ensureOverviewVisible(node.id);
      useOverview.setState((state) => ({
        selectedNodeId: node.id,
        hoveredNodeId: null,
        hoveredDetail: null,
        hoveredEdgeId: null,
        focusRequest: { nodeId: node.id, sequence: (state.focusRequest?.sequence ?? 0) + 1 },
      }));
    }
  };
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(sync, 120);
  };
  const disposables = [
    editor.onDidChangeCursorSelection((event) => {
      if (event.source === 'api') return;
      schedule();
    }),
    editor.onDidChangeModel(() => {
      awaitingAnalysis = false;
      clearTimeout(timer);
      decorate();
    }),
    editor.onDidChangeModelContent(() => {
      awaitingAnalysis = true;
    }),
    editor.onMouseMove((event) => {
      const value = current(),
        position = event.target.position;
      if (!value?.state.indexes || !position || useUI.getState().layout !== 'split') return;
      setOverviewHover(
        nodeAtPosition(value.state.indexes, value.path, position.lineNumber, position.column)?.id ??
          null,
      );
    }),
    editor.onMouseLeave(() => setOverviewHover(null)),
  ];
  const unsubscribe = useOverview.subscribe((state, before) => {
    if (
      state.selectedNodeId !== before.selectedNodeId ||
      state.hoveredNodeId !== before.hoveredNodeId ||
      state.indexes !== before.indexes ||
      state.projectId !== before.projectId
    )
      decorate();
    if (awaitingAnalysis && state.indexes !== before.indexes) {
      awaitingAnalysis = false;
      schedule();
    }
  });
  decorate();
  editor.onDidDispose(() => {
    clearTimeout(timer);
    unsubscribe();
    for (const disposable of disposables) disposable.dispose();
    decorations.clear();
  });
}
