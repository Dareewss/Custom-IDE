import type { CodeModel, NodeKind } from './types';
export type SearchKind = NodeKind | 'all';
export function searchModel(model: CodeModel, query: string, kind: SearchKind) {
  const words = query
    .slice(0, 500)
    .normalize('NFKC')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const active = words.length > 0 || kind !== 'all';
  const matches = model.nodes.filter(
    (node) =>
      (kind === 'all' || node.kind === kind) &&
      words.every((word) =>
        `${node.name} ${node.meta.qualifiedName ?? ''} ${node.fileId ?? ''}`
          .normalize('NFKC')
          .toLowerCase()
          .includes(word),
      ),
  );
  const context = new Set<string>(),
    byId = new Map(model.nodes.map((node) => [node.id, node]));
  for (const node of matches) {
    let id: string | null = node.id;
    while (id && !context.has(id)) {
      context.add(id);
      id = byId.get(id)?.parentId ?? null;
    }
  }
  return { active, matches, context };
}
