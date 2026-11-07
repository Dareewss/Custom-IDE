import type { CodeModel } from '../types';
import type { GraphLayout, Vec3 } from './types';

export type FunctionOffsets = Record<string, Vec3>;
export const isCallable = (kind: string) => kind === 'function' || kind === 'method';
export const validOffset = (value: unknown): value is Vec3 =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every(
    (axis: unknown) => typeof axis === 'number' && Number.isFinite(axis) && Math.abs(axis) <= 10000,
  );

export function parseFunctionOffsets(value: unknown): FunctionOffsets {
  const result: FunctionOffsets = Object.create(null) as FunctionOffsets;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const [id, position] of Object.entries(value).slice(0, 2048))
    if (id.length > 0 && id.length <= 4096 && validOffset(position)) result[id] = [...position];
  return result;
}

/** Visual translations only: parsing, packing and curve generation remain in workers. */
export function offsetLayout(
  model: CodeModel,
  layout: GraphLayout,
  offsets: FunctionOffsets,
): GraphLayout {
  if (!Object.keys(offsets).length) return layout;
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const deltas = new Map<string, Vec3>();
  const zero: Vec3 = [0, 0, 0];
  for (const node of model.nodes) {
    const chain: string[] = [];
    const visited = new Set<string>();
    let current: string | null = node.id;
    while (current && byId.has(current) && !deltas.has(current) && !visited.has(current)) {
      visited.add(current);
      chain.push(current);
      current = byId.get(current)!.parentId;
    }
    let inherited = deltas.get(current ?? '') ?? zero;
    for (const id of chain.reverse()) {
      const own = isCallable(byId.get(id)!.kind) && validOffset(offsets[id]) ? offsets[id] : zero;
      inherited = inherited.map((axis, i) => axis + own[i]) as Vec3;
      deltas.set(id, inherited);
    }
  }
  const translate = (position: Vec3, delta: Vec3) =>
    position.map((axis, i) => axis + delta[i]) as Vec3;
  const items = { ...layout.items },
    cells = { ...layout.cells },
    branches = { ...layout.branches };
  let changed = false;
  for (const [id, delta] of deltas) {
    if (!delta.some(Boolean) || !items[id]) continue;
    changed = true;
    items[id] = { ...items[id], position: translate(items[id].position, delta) };
    if (cells[id])
      cells[id] = cells[id].map((cell) => ({ ...cell, position: translate(cell.position, delta) }));
    if (branches[id])
      branches[id] = branches[id].map((lane) => ({
        ...lane,
        position: translate(lane.position, delta),
      }));
  }
  if (!changed) return layout;
  const edges = layout.edges.map((edge) => {
    // Import endpoints are file headers, even when their source lies inside a moved function.
    if (edge.edge.kind === 'import') return edge;
    const from = deltas.get(edge.edge.from) ?? zero,
      to = deltas.get(edge.edge.to) ?? zero;
    if (!from.some(Boolean) && !to.some(Boolean)) return edge;
    const shift = (points: Vec3[]) =>
      points.map((point, index) => {
        const t = index / Math.max(1, points.length - 1);
        return point.map((axis, i) => axis + from[i] * (1 - t) + to[i] * t) as Vec3;
      });
    return { ...edge, points: shift(edge.points), clusteredPoints: shift(edge.clusteredPoints) };
  });
  const min: Vec3 = [Infinity, Infinity, Infinity],
    max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const item of Object.values(items))
    for (let axis = 0; axis < 3; axis++) {
      min[axis] = Math.min(min[axis], item.position[axis] - item.size[axis] / 2);
      max[axis] = Math.max(max[axis], item.position[axis] + item.size[axis] / 2);
    }
  return { ...layout, items, cells, branches, edges, bounds: { min, max } };
}
