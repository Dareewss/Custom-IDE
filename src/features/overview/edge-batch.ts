import type { LayoutEdge, Vec3 } from '../../core/model/layout/types';
export interface EdgeBatch {
  positions: Float32Array;
  owners: LayoutEdge[];
  arrows: { edge: LayoutEdge; end: Vec3; previous: Vec3 }[];
}
export function edgeBatch(edges: LayoutEdge[], expanded: boolean): EdgeBatch {
  const positions: number[] = [],
    owners: LayoutEdge[] = [];
  const arrows: EdgeBatch['arrows'] = [];
  for (const edge of edges) {
    const points = expanded ? edge.points : edge.clusteredPoints;
    for (let i = 0; i < points.length - 1; i++) {
      if (!edge.edge.resolved && i % 4 >= 2) continue;
      positions.push(...points[i], ...points[i + 1]);
      owners.push(edge);
    }
    if (points.length >= 2) arrows.push({ edge, end: points.at(-1)!, previous: points.at(-2)! });
  }
  return { positions: new Float32Array(positions), owners, arrows };
}
