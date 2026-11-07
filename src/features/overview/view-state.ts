import type { ModelView, DepthPreset } from '../../core/model/view';
export const defaultView = (): ModelView => ({ collapsedIds: [], depth: 'all', isolate: null });
export function parseView(value: unknown): ModelView {
  if (!value || typeof value !== 'object') return defaultView();
  const data = value as Record<string, unknown>;
  const isolate =
    data.isolate && typeof data.isolate === 'object'
      ? (data.isolate as Record<string, unknown>)
      : null;
  return {
    isolate:
      isolate &&
      typeof isolate.nodeId === 'string' &&
      isolate.nodeId.length > 0 &&
      isolate.nodeId.length <= 4096 &&
      typeof isolate.depth === 'number' &&
      Number.isFinite(isolate.depth)
        ? { nodeId: isolate.nodeId, depth: Math.max(0, Math.min(3, Math.floor(isolate.depth))) }
        : null,
    depth:
      typeof data.depth === 'string' &&
      ['files', 'classes', 'functions', 'all'].includes(data.depth)
        ? (data.depth as DepthPreset)
        : 'all',
    collapsedIds: Array.isArray(data.collapsedIds)
      ? [
          ...new Set(
            data.collapsedIds.filter(
              (id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 4096,
            ),
          ),
        ].slice(0, 10000)
      : [],
  };
}
export function readView(projectId: string): ModelView {
  try {
    return parseView(
      JSON.parse(localStorage.getItem(`atlas-overview-view-${projectId}`) ?? 'null'),
    );
  } catch {
    return defaultView();
  }
}
export function writeView(projectId: string, value: ModelView): void {
  localStorage.setItem(`atlas-overview-view-${projectId}`, JSON.stringify(parseView(value)));
}
