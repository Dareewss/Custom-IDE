import { expect, it } from 'vitest';
import { parsePlanePreferences } from './plane-preferences';
it('validates project preferences and rejects malformed cameras without hiding the view', () => {
  expect(parsePlanePreferences({ mode: 'classic' }).mode).toBe('flat');
  expect(parsePlanePreferences(null)).toMatchObject({
    mode: 'flat',
    gap: 5,
    edges: 'none',
    levels: [true, true, true, true, true],
    extrude: false,
    cameras: { flat: null, layers: null },
  });
  expect(
    parsePlanePreferences({
      mode: 'bad',
      gap: Infinity,
      levels: [false, 'bad'],
      rootId: 12,
      query: 'x'.repeat(600),
      kind: 'bad',
      cameras: { flat: { position: [0, 0, 0], target: [0, 0, 0], zoom: 20 } },
    }),
  ).toMatchObject({
    mode: 'flat',
    gap: 5,
    levels: [false, true, true, true, true],
    rootId: null,
    kind: 'all',
    cameras: { flat: null },
  });
  const saved = {
    mode: 'layers',
    gap: 7,
    edges: 'context',
    imports: true,
    rootId: 'node',
    levels: [true, false, true, false, true],
    extrude: true,
    query: 'find',
    kind: 'function',
    cameras: { flat: { position: [2, 3, 100], target: [2, 3, 0], zoom: 40 }, layers: null },
  };
  expect(parsePlanePreferences(JSON.parse(JSON.stringify(saved)))).toEqual(saved);
});
