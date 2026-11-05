import { Vector3 } from 'three';
import type { GraphLayout, Vec3 } from '../../core/model/layout/types';

export type Bounds = GraphLayout['bounds'];
export function fitCamera(
  bounds: Bounds,
  aspect: number,
  fov: number,
  direction: Vec3 = [0, 0.1, 1],
) {
  const center = new Vector3(...bounds.min).add(new Vector3(...bounds.max)).multiplyScalar(0.5);
  const forward = new Vector3(...direction).normalize();
  if (!forward.lengthSq()) forward.set(0, 0, 1);
  const right = new Vector3(0, 1, 0).cross(forward).normalize();
  if (!right.lengthSq()) right.set(1, 0, 0);
  const up = forward.clone().cross(right).normalize();
  const tangent = Math.tan((fov * Math.PI) / 360);
  let distance = 2 / tangent;
  for (const x of [bounds.min[0], bounds.max[0]])
    for (const y of [bounds.min[1], bounds.max[1]])
      for (const z of [bounds.min[2], bounds.max[2]]) {
        const point = new Vector3(x, y, z).sub(center),
          depth = point.dot(forward);
        distance = Math.max(
          distance,
          Math.abs(point.dot(right)) / (tangent * Math.max(0.1, aspect)) + depth,
          Math.abs(point.dot(up)) / tangent + depth,
        );
      }
  distance *= 1.3;
  return {
    target: center.toArray() as Vec3,
    position: center.clone().addScaledVector(forward, distance).toArray() as Vec3,
    near: 0.01,
    far: Math.max(100, distance * 10),
  };
}
export function itemBounds(item: GraphLayout['items'][string]): Bounds {
  return {
    min: item.position.map((v, i) => v - item.size[i] / 2) as Vec3,
    max: item.position.map((v, i) => v + item.size[i] / 2) as Vec3,
  };
}
