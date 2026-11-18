import type { CodeModel, CodeNode } from '../types';
import type { GraphLayout, LayoutItem, Vec3, LayoutEdge } from './types';
import { geometryTokens as tokens } from './tokens';
import { headerPosition } from './metrics';

/** Sampled once in the worker, including non-degenerate recursive call loops. */
export function edgeCurve(start: Vec3, end: Vec3, salt: number): Vec3[] {
  const distance = Math.hypot(...end.map((v, i) => v - start[i]));
  const arc = Math.min(
    tokens.edgeArcMax,
    Math.max(tokens.edgeArcMin, distance * tokens.edgeArcScale),
  );
  const bend = ((salt % 5) - 2) * tokens.edgeArcScale;
  const c1: Vec3 = [start[0] + (distance < 0.01 ? arc : bend), start[1] + arc, start[2] + arc];
  const c2: Vec3 = [end[0] - (distance < 0.01 ? arc : bend), end[1] + arc, end[2] + arc];
  return Array.from({ length: tokens.edgeSamples + 1 }, (_, i): Vec3 => {
    const t = i / tokens.edgeSamples,
      u = 1 - t;
    return start.map(
      (v, axis) =>
        u ** 3 * v + 3 * u * u * t * c1[axis] + 3 * u * t * t * c2[axis] + t ** 3 * end[axis],
    ) as Vec3;
  });
}
export function layoutEdges(
  model: CodeModel,
  layout: Pick<GraphLayout, 'items' | 'externalCluster'>,
): LayoutEdge[] {
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const files = new Map(
    model.nodes.filter((node) => node.kind === 'file').map((node) => [node.fileId, node]),
  );
  const anchor = (node: CodeNode, item: LayoutItem): Vec3 =>
    ['file', 'class', 'function', 'method', 'condition', 'collection'].includes(node.kind)
      ? headerPosition(item)
      : item.position;
  return model.edges.flatMap((edge, i) => {
    let from = byId.get(edge.from),
      to = byId.get(edge.to);
    if (!from || !to) return [];
    if (edge.kind === 'import') {
      from = files.get(from.fileId) ?? from;
      to = files.get(to.fileId) ?? to;
    }
    const a = layout.items[from.id],
      b = layout.items[to.id];
    if (!a || !b) return [];
    const start = anchor(from, a),
      end = anchor(to, b);
    const clusterStart =
      from.kind === 'external' && layout.externalCluster ? layout.externalCluster.position : start;
    const clusterEnd =
      to.kind === 'external' && layout.externalCluster ? layout.externalCluster.position : end;
    return [
      {
        edge,
        points: edgeCurve(start, end, i),
        clusteredPoints: edgeCurve(clusterStart, clusterEnd, i),
      },
    ];
  });
}
