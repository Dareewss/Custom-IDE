import { describe, expect, it } from 'vitest';
import { visibleLabels, type LabelBox } from './label-budget';

const box = (id: string, x: number, y: number, priority = 4): LabelBox => ({
  id,
  x,
  y,
  priority,
  width: 30,
  height: 16,
});
describe('screen-space label budget', () => {
  it('keeps selected labels ahead of overlapping ordinary labels', () => {
    expect([
      ...visibleLabels([box('ordinary', 100, 50), box('selected', 101, 50, 0)], 200, 100, 48),
    ]).toEqual(['selected']);
  });
  it('clips labels at viewport edges and separates labels with padding', () => {
    expect([
      ...visibleLabels(
        [box('cut', 5, 40), box('left', 30, 40), box('overlap', 62, 40), box('right', 120, 40)],
        200,
        100,
        48,
      ),
    ]).toEqual(['right', 'overlap']);
  });
  it('caps non-overlapping labels and prefers the viewport center', () => {
    const boxes = [box('far', 30, 20), box('near', 100, 50), box('other', 170, 80)];
    expect([...visibleLabels(boxes, 200, 100, 1)]).toEqual(['near']);
    expect(visibleLabels(boxes, 200, 100, 0).size).toBe(0);
  });
});
