import type { CodeModel } from './types';
export interface ModelDiff {
  added: string[];
  removed: string[];
  updated: string[];
  edgesAdded: string[];
  edgesRemoved: string[];
  edgesUpdated: string[];
}
export const emptyDiff = (): ModelDiff => ({
  added: [],
  removed: [],
  updated: [],
  edgesAdded: [],
  edgesRemoved: [],
  edgesUpdated: [],
});
export function diffModels(before: CodeModel | null, after: CodeModel): ModelDiff {
  const diff = emptyDiff();
  const nodes = new Map(before?.nodes.map((node) => [node.id, node]) ?? []);
  const edges = new Map(before?.edges.map((edge) => [edge.id, edge]) ?? []);
  for (const node of after.nodes) {
    const previous = nodes.get(node.id);
    if (!previous) diff.added.push(node.id);
    else if (JSON.stringify(previous) !== JSON.stringify(node)) diff.updated.push(node.id);
    nodes.delete(node.id);
  }
  diff.removed = [...nodes.keys()];
  for (const edge of after.edges) {
    const previous = edges.get(edge.id);
    if (!previous) diff.edgesAdded.push(edge.id);
    else if (JSON.stringify(previous) !== JSON.stringify(edge)) diff.edgesUpdated.push(edge.id);
    edges.delete(edge.id);
  }
  diff.edgesRemoved = [...edges.keys()];
  return diff;
}
