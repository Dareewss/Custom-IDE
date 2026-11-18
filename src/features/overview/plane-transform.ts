import { Vector3, type Camera } from 'three';
import type { StructureLayout, StructureTile } from '../../core/model/layout/structure-types';
import type { Vec3 } from '../../core/model/layout/types';
export interface PlaneTransform {
  xScale: number;
  xOffset: number;
  yScale: number;
  layerXScale: number;
  layerYScale: number;
  gap: number;
  activeLane: number;
}
export const lanePitch = (layout: StructureLayout, transform: PlaneTransform) =>
  Math.max(...layout.planes.map((p) => p.rows)) * transform.layerYScale + 3;
export function planePoint(
  x: number,
  y: number,
  level: number,
  lane: number,
  layout: StructureLayout,
  transform: PlaneTransform,
  progress: number,
): Vec3 {
  const { xScale, xOffset, yScale, layerXScale, layerYScale, gap } = transform;
  return [
    x * ((1 - progress) * xScale + progress * layerXScale) + xOffset,
    y * yScale * (1 - progress) - level * gap * progress,
    (lane * lanePitch(layout, transform) + (-y - layout.planes[level].firstRow) * layerYScale) *
      progress,
  ];
}
export function tilePose(
  tile: StructureTile,
  layout: StructureLayout,
  transform: PlaneTransform,
  progress: number,
) {
  const upY = transform.yScale * (1 - progress),
    upZ = -transform.layerYScale * progress;
  return {
    position: planePoint(
      tile.x + tile.width / 2,
      tile.y + tile.height / 2,
      tile.level,
      tile.lane,
      layout,
      transform,
      progress,
    ),
    width: tile.width * ((1 - progress) * transform.xScale + progress * transform.layerXScale),
    height: tile.height * Math.hypot(upY, upZ),
    angle: Math.atan2(upZ, upY),
  };
}
export function screenPoint(point: Vec3, camera: Camera, width: number, height: number): Vec3 {
  const p = new Vector3(...point).project(camera);
  return [((p.x + 1) * width) / 2, ((1 - p.y) * height) / 2, p.z];
}
