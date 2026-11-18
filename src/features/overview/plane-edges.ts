import type { CodeModel } from '../../core/model/types';
import type { StructureLayout, StructureTile } from '../../core/model/layout/structure-types';
import type { Vec3 } from '../../core/model/layout/types';
import { planePoint, type PlaneTransform } from './plane-transform';

export interface TileConnection {
  id: string;
  from: StructureTile;
  to: StructureTile | null;
  unresolved: boolean;
  count: number;
  kind: 'call' | 'import';
  label: string;
}
export function tileConnections(
  model: CodeModel,
  visible: StructureTile[],
  owners: Record<string, string | null>,
  mode: 'none' | 'context' | 'all',
  imports: boolean,
  focus: string | null,
  cap = 200,
) {
  const tiles = new Map(visible.flatMap((tile) => tile.nodeIds.map((id) => [id, tile] as const)));
  const nodes = new Map(model.nodes.map((node) => [node.id, node]));
  const lookup = (id: string) => tiles.get(id) ?? tiles.get(owners[id] ?? '');
  const groups = new Map<string, TileConnection>();
  for (const edge of model.edges) {
    if (
      edge.kind === 'inherits' ||
      (edge.kind === 'import'
        ? !imports
        : mode === 'none' || (mode === 'context' && edge.from !== focus && edge.to !== focus))
    )
      continue;
    const from = lookup(edge.from),
      to = lookup(edge.to);
    const external = nodes.get(edge.to)?.kind === 'external';
    if (!from || (!to && !external) || from === to) continue;
    const kind = edge.kind;
    // External references get an explicitly unresolved port, never a fabricated destination tile.
    const key = kind === 'import' ? JSON.stringify([from.fileId, to?.fileId ?? edge.to]) : edge.id;
    const previous = groups.get(key);
    if (previous) {
      previous.count++;
      previous.unresolved ||= !edge.resolved;
      continue;
    }
    const source =
      kind === 'import'
        ? (visible.find((t) => t.fileId === from.fileId && t.level === 0) ?? from)
        : from;
    const target =
      kind === 'import' && to
        ? (visible.find((t) => t.fileId === to.fileId && t.level === 0) ?? to)
        : to;
    groups.set(key, {
      id: edge.id,
      from: source,
      to: target ?? null,
      unresolved: !edge.resolved || !target,
      count: 1,
      kind,
      label: nodes.get(edge.to)?.name ?? 'Unresolved reference',
    });
  }
  const all = [...groups.values()].sort((a, b) => a.id.localeCompare(b.id));
  return { connections: all.slice(0, cap), hidden: Math.max(0, all.length - cap) };
}
/** Runs along row borders, then outside the entire X extent; never cuts through a tile. */
export function connectionPoints(
  edge: TileConnection,
  layout: StructureLayout,
  tf: PlaneTransform,
  t: number,
): Vec3[] {
  const border = (tile: StructureTile) =>
    planePoint(tile.x + tile.width / 2, tile.y + tile.height, tile.level, tile.lane, layout, tf, t);
  const a = border(edge.from),
    b = edge.to ? border(edge.to) : ([a[0] + 0.4, a[1], a[2]] as Vec3);
  const normal: Vec3 = [
    0,
    Math.sin(Math.atan2(tf.layerYScale * t, tf.yScale * (1 - t))),
    Math.cos(Math.atan2(tf.layerYScale * t, tf.yScale * (1 - t))),
  ];
  const lift = Math.min(0.7, tf.gap * 0.2) * t;
  const raised = (p: Vec3): Vec3 => p.map((v, i) => v + normal[i] * lift) as Vec3;
  const ar = raised(a),
    br = raised(b);
  const gate = layout.width * ((1 - t) * tf.xScale + t * tf.layerXScale) + tf.xOffset + 1;
  if (!edge.to) return [a, ar, [ar[0] + 1, ar[1], ar[2]], [ar[0] + 1, ar[1] + 0.15, ar[2]]];
  const arc: Vec3[] = [];
  for (let i = 0; i <= 16; i++) {
    const u = i / 16,
      smooth = u * u * (3 - 2 * u);
    arc.push([
      gate + Math.sin(Math.PI * u) * 0.7,
      ar[1] + (br[1] - ar[1]) * smooth,
      ar[2] + (br[2] - ar[2]) * smooth,
    ]);
  }
  return [a, ar, ...arc, br, b];
}
