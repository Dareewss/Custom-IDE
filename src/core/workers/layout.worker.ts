import { buildModelIndexes } from '../model/indexes';
import { automaticLayout } from '../model/layout/automatic';
import type { GraphLayout, LayoutRequest } from '../model/layout/types';

const cache = new Map<string, { revision: number; layout: GraphLayout }>();

self.onmessage = (event: MessageEvent<{ id: number; request: LayoutRequest }>) => {
  const { id, request } = event.data;
  try {
    const indexes = buildModelIndexes(request.model);
    const before = cache.get(request.projectId);
    const layout = automaticLayout(
      request.model,
      before?.revision === request.revision ? before.layout : null,
      request.revision,
    );
    cache.delete(request.projectId);
    cache.set(request.projectId, { revision: request.revision, layout });
    if (cache.size > 3) cache.delete(cache.keys().next().value!);
    self.postMessage({
      id,
      result: { layout, indexes },
    });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
