import { loadPlaneProject, usePlaneView } from './plane-view';
import { useEffect } from 'react';
import { useWorkspace } from '../explorer/store';
import { languageForPath, type LanguageAdapter } from '../../core/language/adapter';
import { WorkerClient } from '../../core/workers/client';
import type { CodeModel } from '../../core/model/types';
import type { LayoutRequest, LayoutResponse } from '../../core/model/layout/types';
import { useOverview } from './store';
import { readView } from './view-state';
import { setOverviewView } from './view-actions';
import { emptyDiff } from '../../core/model/diff';

const layout = new WorkerClient<LayoutRequest, LayoutResponse>(
  () =>
    new Worker(new URL('../../core/workers/layout.worker.ts', import.meta.url), { type: 'module' }),
);

export function useProjectModel() {
  useStructureZoom();
  const tree = useWorkspace((state) => state.tree);
  const projectId = useWorkspace((state) => state.projectId);
  const collapsedIds = useOverview((state) => state.collapsedIds);
  const depth = useOverview((state) => state.depth);
  const isolate = useOverview((state) => state.isolate);
  useEffect(() => {
    let cancelled = false;
    const changedProject = useOverview.getState().projectId !== projectId;
    const view = changedProject ? readView(projectId) : { collapsedIds, depth, isolate };
    const planePrefs = changedProject ? loadPlaneProject(projectId) : null;
    useOverview.setState({
      projectId,
      loading: true,
      error: null,
      ...(changedProject
        ? {
            model: null,
            indexes: null,
            structure: null,
            selectedNodeId: null,
            hoveredNodeId: null,
            hoveredDetail: null,
            hoveredEdgeId: null,
            focusRequest: null,
            handledFocusSequence: 0,
            cameraRequest: null,
            viewModel: null,
            ownerByNode: {},
            compactIds: [],
            isolatedIds: null,
            fitAfterView: false,
            diff: emptyDiff(),
            modelRevision: 0,
            searchQuery: planePrefs?.query ?? '',
            searchKind: planePrefs?.kind ?? 'all',
            ...view,
          }
        : {}),
    });
    const timer = setTimeout(() => {
      void (async () => {
        const services = new Map<string, LanguageAdapter>();
        const analysisStarted = performance.now();
        for (const [path, node] of Object.entries(tree)) {
          const adapter = node.kind === 'file' ? languageForPath(path) : undefined;
          if (adapter?.analyze) services.set(adapter.id, adapter);
        }
        const models = await Promise.all(
          [...services.values()].map((adapter) => adapter.analyze!(tree)),
        );
        if (cancelled) return;
        const analysisMs = performance.now() - analysisStarted;
        const model: CodeModel = {
          schemaVersion: 1,
          languageId: models.length === 1 ? models[0].languageId : 'multiple',
          nodes: models.flatMap((m) => m.nodes),
          edges: models.flatMap((m) => m.edges),
          issues: models.flatMap((m) => m.issues),
        };
        const layoutStarted = performance.now();
        const result = await layout.call({
          model,
          projectId,
          view,
          structureOptions: { pixelsPerUnit: usePlaneView.getState().pixelsPerUnit },
        });
        const layoutMs = performance.now() - layoutStarted;
        if (cancelled) return;
        if (view.isolate && !result.isolatedIds) setOverviewView({ isolate: null });
        useOverview.setState((state) => {
          const diff = state.model ? result.diff : emptyDiff();
          const selectedNodeId =
            state.selectedNodeId && result.indexes.nodeById.has(state.selectedNodeId)
              ? (result.ownerByNode[state.selectedNodeId] ?? null)
              : null;
          return {
            model,
            analysisMs,
            layoutMs,
            diff,
            modelRevision: state.modelRevision + 1,
            structure: result.structure,
            indexes: result.indexes,
            viewModel: result.viewModel,
            ownerByNode: result.ownerByNode,
            compactIds: result.compactIds,
            isolatedIds: result.isolatedIds,
            ...(state.fitAfterView
              ? {
                  cameraRequest: {
                    action: 'fit-all' as const,
                    sequence: (state.cameraRequest?.sequence ?? 0) + 1,
                  },
                  fitAfterView: false,
                }
              : {}),
            loading: false,
            error: null,
            selectedNodeId,
            ...(selectedNodeId !== state.selectedNodeId
              ? {
                  focusRequest: selectedNodeId
                    ? { nodeId: selectedNodeId, sequence: (state.focusRequest?.sequence ?? 0) + 1 }
                    : null,
                }
              : {}),
            hoveredNodeId: null,
            hoveredDetail: null,
            hoveredEdgeId: null,
          };
        });
      })().catch((error: unknown) => {
        if (!cancelled) useOverview.setState({ loading: false, error: String(error) });
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tree, projectId, collapsedIds, depth, isolate]);
}

// Zoom changes only worker layout. Do not reparse source or reset hover/selection.
function useStructureZoom() {
  const scale = usePlaneView((s) => s.pixelsPerUnit);
  const model = useOverview((s) => s.model),
    projectId = useOverview((s) => s.projectId);
  useEffect(() => {
    if (!model || !projectId) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      const state = useOverview.getState();
      if (state.loading || state.model !== model || state.projectId !== projectId) return;
      void layout
        .call({
          model,
          projectId,
          view: { depth: state.depth, collapsedIds: state.collapsedIds, isolate: state.isolate },
          structureOptions: { pixelsPerUnit: scale },
        })
        .then((result) => {
          if (
            !cancelled &&
            useOverview.getState().model === model &&
            useOverview.getState().projectId === projectId &&
            useOverview.getState().collapsedIds === state.collapsedIds &&
            useOverview.getState().depth === state.depth &&
            useOverview.getState().isolate === state.isolate
          )
            useOverview.setState({ structure: result.structure });
        })
        .catch((error: unknown) => {
          if (!cancelled) useOverview.setState({ error: String(error) });
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [scale, model, projectId]);
}
