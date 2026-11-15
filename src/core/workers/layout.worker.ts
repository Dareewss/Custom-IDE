import { structureStrategy } from '../model/layout/structure';
import type { StructureLayout } from '../model/layout/structure-types';
import { buildModelIndexes } from '../model/indexes';
import { automaticLayout } from '../model/layout/automatic';
import type { GraphLayout, LayoutRequest } from '../model/layout/types';
import { projectModel } from '../model/view';
import { diffModels } from '../model/diff';
import { rememberLayout } from '../model/layout/history';
import type { CodeModel } from '../model/types';

const cache = new Map<
  string,
  { revision: number; layout: GraphLayout; model: CodeModel; structure: StructureLayout }
>();

self.onmessage = (event: MessageEvent<{ id: number; request: LayoutRequest }>) => {
  const { id, request } = event.data;
  try {
    const indexes = buildModelIndexes(request.model);
    const before = cache.get(request.projectId);
    const projected = projectModel(request.model, request.view);
    const layout = automaticLayout(
      projected.model,
      before?.revision === request.revision ? before.layout : null,
      request.revision,
      new Set(projected.compactIds),
    );
    const structure = structureStrategy.layout(
      projected.model,
      request.structureOptions,
      before?.structure,
    );
    cache.delete(request.projectId);
    const diff = diffModels(before?.model ?? null, request.model);
    cache.set(request.projectId, {
      revision: request.revision,
      layout: rememberLayout(
        layout,
        before?.revision === request.revision ? before.layout : null,
        request.model,
      ),
      model: request.model,
      structure,
    });
    if (cache.size > 3) cache.delete(cache.keys().next().value!);
    self.postMessage({
      id,
      result: {
        layout,
        structure,
        indexes,
        viewModel: projected.model,
        ownerByNode: projected.ownerByNode,
        compactIds: projected.compactIds,
        isolatedIds: projected.isolatedIds,
        diff,
      },
    });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
