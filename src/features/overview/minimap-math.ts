import { Vector3, type Camera } from 'three';
import type { GraphLayout, LayoutItem, Vec3 } from '../../core/model/layout/types';
import type { CodeModel } from '../../core/model/types';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';

export function minimapItems(
  model: CodeModel,
  layout: GraphLayout,
  external: boolean,
  expanded: boolean,
): LayoutItem[] {
  const items = model.nodes
    .filter((node) => node.kind !== 'external' || (external && expanded))
    .map((node) => layout.items[node.id])
    .filter(Boolean);
  if (external && !expanded && layout.externalCluster) items.push(layout.externalCluster);
  return items;
}
export function minimapProjection(items: LayoutItem[]) {
  const min = [Infinity, Infinity],
    max = [-Infinity, -Infinity];
  for (const item of items)
    for (let axis = 0; axis < 2; axis++) {
      min[axis] = Math.min(min[axis], item.position[axis] - item.size[axis] / 2);
      max[axis] = Math.max(max[axis], item.position[axis] + item.size[axis] / 2);
    }
  if (!items.length) {
    min.fill(-1);
    max.fill(1);
  }
  const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2];
  const scale = Math.min(
    (tokens.minimapWidth - tokens.minimapPadding * 2) / Math.max(1, max[0] - min[0]),
    (tokens.minimapHeight - tokens.minimapPadding * 2) / Math.max(1, max[1] - min[1]),
  );
  return {
    scale,
    project: (point: Vec3): [number, number] => [
      tokens.minimapWidth / 2 + (point[0] - center[0]) * scale,
      tokens.minimapHeight / 2 - (point[1] - center[1]) * scale,
    ],
    unproject: (x: number, y: number, z: number): Vec3 => [
      center[0] + (x - tokens.minimapWidth / 2) / scale,
      center[1] - (y - tokens.minimapHeight / 2) / scale,
      z,
    ],
  };
}
/** Intersect view rays with the camera target's XY plane; edge-on views have no finite polygon. */
export function viewPolygon(camera: Camera, z: number): Vec3[] {
  const result: Vec3[] = [];
  for (const [x, y] of [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ]) {
    const ray = new Vector3(x, y, 0).unproject(camera).sub(camera.position);
    const distance = (z - camera.position.z) / ray.z;
    if (!Number.isFinite(distance) || distance < 0 || distance > 1e6) return [];
    result.push(camera.position.clone().addScaledVector(ray, distance).toArray() as Vec3);
  }
  return result;
}
