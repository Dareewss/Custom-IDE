import { expect, it } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { fitCamera, itemBounds } from './camera-math';
import { cameraKey } from './camera-actions';

it('fits every actual box corner for narrow, wide and rotated views', () => {
  const bounds = {
    min: [-30, -4, -12] as [number, number, number],
    max: [25, 16, 5] as [number, number, number],
  };
  for (const aspect of [0.3, 1, 3])
    for (const direction of [
      [0, 0.1, 1],
      [1, 1, 1],
      [0, 1, 0],
    ] as [number, number, number][]) {
      const fit = fitCamera(bounds, aspect, 45, direction);
      const camera = new PerspectiveCamera(45, aspect, fit.near, fit.far);
      camera.position.set(...fit.position);
      camera.lookAt(...fit.target);
      camera.updateMatrixWorld();
      for (const x of [bounds.min[0], bounds.max[0]])
        for (const y of [bounds.min[1], bounds.max[1]])
          for (const z of [bounds.min[2], bounds.max[2]]) {
            const point = new Vector3(x, y, z).project(camera);
            expect(Math.abs(point.x)).toBeLessThan(1);
            expect(Math.abs(point.y)).toBeLessThan(1);
            expect(point.z).toBeLessThan(1);
            expect(point.z).toBeGreaterThan(-1);
          }
    }
});
it('has finite small/empty targets and complete local keyboard equivalents', () => {
  const fit = fitCamera(
    itemBounds({ id: 'one', position: [0, 0, 0], size: [0, 0, 0] }),
    1,
    45,
    [0, 0, 0],
  );
  expect(fit.position.every(Number.isFinite)).toBe(true);
  expect(fit.position[2]).toBeGreaterThan(0);
  expect(cameraKey('ArrowLeft', false)).toBe('orbit-left');
  expect(cameraKey('ArrowRight', true)).toBe('pan-right');
  expect(cameraKey('+', false)).toBe('zoom-in');
  expect(cameraKey('-', false)).toBe('zoom-out');
  expect(cameraKey('f', false)).toBe('fit-selection');
  expect(cameraKey('Home', false)).toBe('fit-all');
  expect(cameraKey('r', false)).toBe('reset');
  expect(cameraKey('a', false)).toBeUndefined();
});
