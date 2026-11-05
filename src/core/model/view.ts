import type { CodeModel, NodeKind } from './types';
export type DepthPreset = 'files' | 'classes' | 'functions' | 'all';
export interface ModelView {
  collapsedIds: string[];
  depth: DepthPreset;
}
export interface ProjectedModel {
  model: CodeModel;
  ownerByNode: Record<string, string | null>;
  compactIds: string[];
}
const allowed = (kind: NodeKind, depth: DepthPreset) =>
  kind === 'external' ||
  kind === 'file' ||
  depth === 'all' ||
  (depth !== 'files' && kind === 'class') ||
  (depth === 'functions' && (kind === 'function' || kind === 'method'));

/** A render projection; the complete model and source indexes remain unchanged. */
export function projectModel(model: CodeModel, view: ModelView): ProjectedModel {
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const collapsed = new Set(view.collapsedIds),
    visible = new Set<string>();
  const ownerByNode: ProjectedModel['ownerByNode'] = Object.create(
    null,
  ) as ProjectedModel['ownerByNode'];
  const pending = model.nodes
    .filter((node) => !node.parentId)
    .map((node) => ({ id: node.id, owner: null as string | null, hidden: false }));
  while (pending.length) {
    const entry = pending.pop()!,
      node = byId.get(entry.id)!;
    const shown = !entry.hidden && allowed(node.kind, view.depth);
    const owner = shown ? node.id : entry.owner;
    ownerByNode[node.id] = owner;
    if (shown) visible.add(node.id);
    for (const id of node.children)
      pending.push({ id, owner, hidden: !shown || collapsed.has(node.id) });
  }
  const nodes = model.nodes
    .filter((node) => visible.has(node.id))
    .map((node) => ({ ...node, children: node.children.filter((id) => visible.has(id)) }));
  const edges = model.edges.flatMap((edge) => {
    const from = ownerByNode[edge.from],
      to = ownerByNode[edge.to];
    if (!from || !to || (from === to && edge.from !== edge.to)) return [];
    return [{ ...edge, from, to }];
  });
  return {
    model: { ...model, nodes, edges },
    ownerByNode,
    compactIds: nodes
      .filter((node) => byId.get(node.id)!.children.length > 0 && node.children.length === 0)
      .map((node) => node.id),
  };
}
