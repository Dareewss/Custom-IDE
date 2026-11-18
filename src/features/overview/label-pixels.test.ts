import { expect, it } from 'vitest';
import { labelPixels } from './label-pixels';
it('bounds projected label pixels at near/far depths and compensates parent animation scale', () => {
  expect(labelPixels(100, 2, 1000).pixels).toBe(13);
  expect(labelPixels(1, 2, 1000).pixels).toBe(18);
  const world = labelPixels(20, 2, 1000),
    scaled = labelPixels(20, 2, 1000, 0.5);
  expect(world.pixels).toBeCloseTo(14);
  expect(scaled.pixels).toBe(13);
  expect(scaled.scale * 0.5 * 14).toBeCloseTo(13);
  expect(labelPixels(20, 2, 1000)).toEqual(labelPixels(-20, 2, 1000));
});
