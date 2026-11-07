import { describe, expect, it } from 'vitest';
import {
  Group,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshBasicMaterial,
  Raycaster,
  Vector3,
  type Intersection,
} from 'three';
import { batchRaycast, boxGeometry, capsuleGeometry, visibleMeshRaycast } from './resources';

describe('shared geometry and exact picking', () => {
  it('shares equal geometry while retaining distinct dimensions', () => {
    expect(boxGeometry([2, 3, 1])).toBe(boxGeometry([2, 3, 1]));
    expect(boxGeometry([2, 3, 1])).not.toBe(boxGeometry([3, 2, 1]));
    expect(capsuleGeometry(4)).toBe(capsuleGeometry(4));
  });
  it('rejects a missed batch and returns the correct transformed instance', () => {
    const mesh = new InstancedMesh(boxGeometry([1, 1, 1]), new MeshBasicMaterial(), 2);
    mesh.setMatrixAt(0, new Matrix4().makeTranslation(-2, 0, 0));
    mesh.setMatrixAt(1, new Matrix4().makeTranslation(2, 0, 0));
    mesh.position.set(10, 0, 0);
    mesh.updateMatrixWorld();
    const hits: Intersection[] = [];
    batchRaycast.call(mesh, new Raycaster(new Vector3(12, 0, 5), new Vector3(0, 0, -1)), hits);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.every((hit) => hit.instanceId === 1)).toBe(true);
    const misses: Intersection[] = [];
    batchRaycast.call(mesh, new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1)), misses);
    expect(misses).toEqual([]);
  });
  it('does not pick culled label backplates through an invisible ancestor', () => {
    const parent = new Group(),
      mesh = new Mesh(boxGeometry([1, 1, 1]), new MeshBasicMaterial());
    parent.add(mesh);
    parent.updateMatrixWorld();
    const ray = new Raycaster(new Vector3(0, 0, 5), new Vector3(0, 0, -1));
    const hits: Intersection[] = [];
    visibleMeshRaycast.call(mesh, ray, hits);
    expect(hits.length).toBeGreaterThan(0);
    parent.visible = false;
    hits.length = 0;
    visibleMeshRaycast.call(mesh, ray, hits);
    expect(hits).toEqual([]);
  });
});
