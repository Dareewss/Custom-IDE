import { expect, it } from 'vitest';
import { PerspectiveCamera } from 'three';
import { minimapProjection, viewPolygon } from './minimap-math';

it('round-trips actual world points through a finite aspect-preserving minimap', () => {
  const projection = minimapProjection([{ id: 'node', position: [4, -5, 2], size: [12, 3, 1] }]);
  const point = [7, -4, 2] as [number, number, number];
  const pixel = projection.project(point),
    back = projection.unproject(...pixel, 2);
  expect(back[0]).toBeCloseTo(point[0]);
  expect(back[1]).toBeCloseTo(point[1]);
  expect(back[2]).toBe(2);
  expect(minimapProjection([]).project([0, 0, 0]).every(Number.isFinite)).toBe(true);
});
it('projects the actual camera view onto the target plane and follows pan', () => {
  const camera = new PerspectiveCamera(45, 1.5, 0.01, 100);
  camera.position.set(0, 0, 10);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const first = viewPolygon(camera, 0);
  expect(first).toHaveLength(4);
  expect(first.flat().every(Number.isFinite)).toBe(true);
  camera.position.x += 5;
  camera.lookAt(5, 0, 0);
  camera.updateMatrixWorld();
  const next = viewPolygon(camera, 0);
  for (let i = 0; i < 4; i++) expect(next[i][0] - first[i][0]).toBeCloseTo(5);
});
