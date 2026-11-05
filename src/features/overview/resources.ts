import {
  BoxGeometry,
  CapsuleGeometry,
  TorusGeometry,
  SphereGeometry,
  MeshLambertMaterial,
  InstancedMesh,
  Matrix4,
  Ray,
  type Raycaster,
  type Intersection,
  Mesh,
} from 'three';
import { geometryTokens as tokens } from '../../core/model/layout/tokens';
import type { Vec3 } from '../../core/model/layout/types';

const boxes = new Map<string, BoxGeometry>(),
  capsules = new Map<number, CapsuleGeometry>();
export function boxGeometry(size: Vec3) {
  const key = size.join(':');
  let geometry = boxes.get(key);
  if (!geometry) {
    geometry = new BoxGeometry(...size);
    boxes.set(key, geometry);
  }
  return geometry;
}
export function capsuleGeometry(width: number) {
  let geometry = capsules.get(width);
  if (!geometry) {
    geometry = new CapsuleGeometry(
      tokens.functionRadius,
      width - tokens.functionRadius * 2,
      tokens.functionCapSegments,
      tokens.functionRadialSegments,
    );
    capsules.set(width, geometry);
  }
  return geometry;
}
export const loopGeometry = new TorusGeometry(
  1,
  tokens.loopTube,
  tokens.loopRadialSegments,
  tokens.loopTubularSegments,
);
export const lowLoopGeometry = new TorusGeometry(
  1,
  tokens.loopTube,
  tokens.loopLowRadialSegments,
  tokens.loopLowTubularSegments,
);

export const sphereGeometry = new SphereGeometry(
  tokens.variableRadius,
  tokens.variableSegments,
  tokens.variableSegments,
);
export const mediumSphereGeometry = new SphereGeometry(
  tokens.variableRadius,
  ...tokens.sphereMediumSegments,
);
export const lowSphereGeometry = new SphereGeometry(
  tokens.variableRadius,
  ...tokens.sphereLowSegments,
);
export const cellGeometry = new BoxGeometry(tokens.cellWidth, tokens.cellHeight, tokens.cellDepth);
const materials = new Map<string, MeshLambertMaterial>();
export function valueMaterial(color: string, opacity: number) {
  const key = `${color}:${opacity}`;
  let material = materials.get(key);
  if (!material) {
    material = new MeshLambertMaterial({ color, transparent: true, opacity });
    materials.set(key, material);
  }
  return material;
}
const inverse = new Matrix4(),
  ray = new Ray();
/** Cheap per-batch box rejection before Three's exact per-instance geometry picking. */
export function batchRaycast(
  this: InstancedMesh,
  raycaster: Raycaster,
  intersections: Intersection[],
) {
  if (!this.boundingBox) this.computeBoundingBox();
  inverse.copy(this.matrixWorld).invert();
  ray.copy(raycaster.ray).applyMatrix4(inverse);
  if (this.boundingBox && !ray.intersectsBox(this.boundingBox)) return;
  InstancedMesh.prototype.raycast.call(this, raycaster, intersections);
}
export function visibleMeshRaycast(
  this: Mesh,
  raycaster: Raycaster,
  intersections: Intersection[],
) {
  if (!this.visible) return;
  let object = this.parent;
  while (object) {
    if (!object.visible) return;
    object = object.parent;
  }
  Mesh.prototype.raycast.call(this, raycaster, intersections);
}
