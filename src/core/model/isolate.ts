import type { CodeModel } from './types';
export interface IsolateView {
  nodeId: string;
  depth: number;
}

/** Static caller/callee neighborhood, including real source ancestors for containment. */
export function isolationIds(
  model: CodeModel,
  view: IsolateView | null | undefined,
): Set<string> | null {
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const root = view ? byId.get(view.nodeId) : undefined;
  if (!view || !root || !['function', 'method', 'class'].includes(root.kind)) return null;
  const region = new Set<string>();
  const add = (id: string) => {
    const pending = [id];
    while (pending.length) {
      const current = pending.pop()!,
        node = byId.get(current);
      if (!node || region.has(current)) continue;
      region.add(current);
      if (node.kind !== 'file') pending.push(...node.children);
    }
  };
  const scope = (id: string) => {
    const original = id;
    while (true) {
      const node = byId.get(id);
      if (!node) return original;
      if (['function', 'method', 'class', 'external'].includes(node.kind)) return id;
      if (!node.parentId) return original;
      id = node.parentId;
    }
  };
  add(root.id);
  const calls = model.edges.filter((edge) => edge.kind === 'call');
  for (let step = 0; step < Math.max(0, Math.min(3, Math.floor(view.depth))); step++) {
    const next = new Set<string>();
    for (const edge of calls) {
      if (region.has(edge.from) && !region.has(edge.to)) next.add(scope(edge.to));
      if (region.has(edge.to) && !region.has(edge.from)) next.add(scope(edge.from));
    }
    for (const id of next) add(id);
    if (!next.size) break;
  }
  const included = new Set(region);
  for (const id of region) {
    let parent = byId.get(id)?.parentId;
    while (parent && !included.has(parent)) {
      included.add(parent);
      parent = byId.get(parent)?.parentId;
    }
  }
  return included;
}
