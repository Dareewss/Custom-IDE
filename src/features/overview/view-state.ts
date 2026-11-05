import type { ModelView, DepthPreset } from '../../core/model/view';
export const defaultView = (): ModelView => ({ collapsedIds: [], depth: 'all' });
export function parseView(value: unknown): ModelView {
  if (!value || typeof value !== 'object') return defaultView();
  const data = value as Record<string, unknown>;
  return {
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
