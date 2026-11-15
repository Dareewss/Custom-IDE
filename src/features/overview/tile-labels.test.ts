import { describe, expect, it } from 'vitest';
import { Color } from 'three';
import { tileLabel, tileTextColor } from './tile-labels';
import type { StructureTile } from '../../core/model/layout/structure-types';
import type { CodeNode } from '../../core/model/types';

describe('inside tile labels', () => {
  it('omits narrow names, reserves the metric and keeps every palette contrast above AA', () => {
    const tile = { level: 2, nodeIds: ['a'], startLine: 1, endLine: 13 } as StructureTile;
    const node = { name: 'a_very_long_function_name' } as CodeNode;
    expect(tileLabel(tile, node, 87)).toBeNull();
    expect(tileLabel(tile, node, 140)).toMatch(/^f .*\.\.\. 12L$/);
    expect(tileLabel({ ...tile, nodeIds: ['a', 'b'] }, node, 140)).toBe('f +2 12L');
    for (const background of [
      '#545454',
      '#69747C',
      '#6BAA75',
      '#84DD63',
      '#CBFF4D',
      '#132b75',
      '#ffffff',
    ]) {
      const c = new Color(background);
      const luminance = 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
      const text = tileTextColor(background) === '#000000' ? 0 : 1;
      expect(
        (Math.max(luminance, text) + 0.05) / (Math.min(luminance, text) + 0.05),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});
