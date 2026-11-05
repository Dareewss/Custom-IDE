import { useEffect } from 'react';
import { useWorkspace } from '../explorer/store';
import { languageForPath, type LanguageAdapter } from '../../core/language/adapter';
import { WorkerClient } from '../../core/workers/client';
import type { CodeModel } from '../../core/model/types';
import type { LayoutRequest, LayoutResponse } from '../../core/model/layout/types';
import { useOverview } from './store';

const layout = new WorkerClient<LayoutRequest, LayoutResponse>(
  () =>
    new Worker(new URL('../../core/workers/layout.worker.ts', import.meta.url), { type: 'module' }),
);

export function useProjectModel() {
  const tree = useWorkspace((state) => state.tree);
  const projectId = useWorkspace((state) => state.projectId);
  const revision = useOverview((state) => state.layoutRevision);
  useEffect(() => {
    let cancelled = false;
    const changedProject = useOverview.getState().projectId !== projectId;
    useOverview.setState({
      projectId,
      loading: true,
      error: null,
      ...(changedProject
        ? {
            model: null,
            indexes: null,
            layout: null,
            selectedNodeId: null,
            hoveredNodeId: null,
            hoveredDetail: null,
            hoveredEdgeId: null,
            focusRequest: null,
          }
        : {}),
    });
    const timer = setTimeout(() => {
      void (async () => {
        const services = new Map<string, LanguageAdapter>();
        for (const [path, node] of Object.entries(tree)) {
          const adapter = node.kind === 'file' ? languageForPath(path) : undefined;
          if (adapter?.analyze) services.set(adapter.id, adapter);
        }
        const models = await Promise.all(
          [...services.values()].map((adapter) => adapter.analyze!(tree)),
        );
        if (cancelled) return;
        const model: CodeModel = {
          schemaVersion: 1,
          languageId: models.length === 1 ? models[0].languageId : 'multiple',
          nodes: models.flatMap((m) => m.nodes),
          edges: models.flatMap((m) => m.edges),
          issues: models.flatMap((m) => m.issues),
        };
        const result = await layout.call({ model, projectId, revision });
        if (cancelled) return;
        useOverview.setState((state) => ({
          model,
          layout: result.layout,
          indexes: result.indexes,
          loading: false,
          error: null,
          selectedNodeId:
            state.selectedNodeId && result.indexes.nodeById.has(state.selectedNodeId)
              ? state.selectedNodeId
              : null,
          hoveredNodeId: null,
          hoveredDetail: null,
          hoveredEdgeId: null,
        }));
      })().catch((error: unknown) => {
        if (!cancelled) useOverview.setState({ loading: false, error: String(error) });
      });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [tree, projectId, revision]);
}
