import { expect, it } from 'vitest';
import { FrameBudget, type OrbFps } from './frame-budget';

it('degrades only after sustained slow raw display intervals, then pauses', () => {
  const budget = new FrameBudget();
  let fps: OrbFps = 30;
  for (let i = 0; i < 29; i++) fps = budget.sample(25, 1, fps);
  expect(fps).toBe(30);
  fps = budget.sample(25, 1, fps);
  expect(fps).toBe(15);
  for (let i = 0; i < 30; i++) fps = budget.sample(25, 1, fps);
  expect(fps).toBe(0);
});
it('ignores isolated stalls and normal 60/120Hz frames despite capped paints', () => {
  const budget = new FrameBudget();
  for (let i = 0; i < 300; i++) expect(budget.sample(i === 50 ? 45 : 16.67, 2, 30)).toBe(30);
  expect(budget.sample(1000, 1, 30)).toBe(30);
  expect(budget.sample(NaN, 1, 30)).toBe(30);
  for (let i = 0; i < 60; i++) expect(budget.sample(8.33, 1, 30)).toBe(30);
});
it('also reacts to sustained expensive paint work', () => {
  const budget = new FrameBudget();
  let fps: OrbFps = 30;
  for (let i = 0; i < 30; i++) fps = budget.sample(16, 24, fps);
  expect(fps).toBe(15);
});
