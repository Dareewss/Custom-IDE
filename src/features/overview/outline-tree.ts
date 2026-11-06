import type { CodeNode } from '../../core/model/types';
export interface OutlineEntry {
  node: CodeNode;
  depth: number;
  position: number;
  siblings: number;
}
export function outlineTree(nodes: CodeNode[], visible: ReadonlySet<string>): OutlineEntry[] {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const roots = nodes.filter((node) => !node.parentId && visible.has(node.id));
  const entries = (items: CodeNode[], depth: number): OutlineEntry[] =>
    items.map((node, index) => ({ node, depth, position: index + 1, siblings: items.length }));
  const pending = entries(roots, 1).reverse(),
    result: OutlineEntry[] = [];
  const visited = new Set<string>();
  while (pending.length) {
    const entry = pending.pop()!;
    if (visited.has(entry.node.id)) continue;
    visited.add(entry.node.id);
    result.push(entry);
    const children = entry.node.children
      .map((id) => byId.get(id))
      .filter((node): node is CodeNode => !!node && visible.has(node.id));
    pending.push(...entries(children, entry.depth + 1).reverse());
  }
  return result;
}
