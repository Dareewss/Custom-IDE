import { expect, it } from 'vitest';
import { structureLayout } from '../../core/model/layout/structure';
import type { CodeNode } from '../../core/model/types';
import { lanePitch, planePoint, tilePose, type PlaneTransform } from './plane-transform';

it('maps the same source rectangles from uniform Flat rows to constant-height planes and distinct Z lanes', () => {
  const file: CodeNode = {
    id: 'a',
    name: 'a.py',
    kind: 'file',
    fileId: 'a.py',
    parentId: null,
    children: ['f'],
    range: { startLine: 1, startCol: 1, endLine: 21, endCol: 1 },
    meta: {},
  };
  const fn: CodeNode = {
    ...file,
    id: 'f',
    kind: 'function',
    name: 'f',
    parentId: 'a',
    children: [],
    range: { startLine: 2, startCol: 1, endLine: 8, endCol: 1 },
  };
  const second: CodeNode = { ...file, id: 'b', name: 'b.py', fileId: 'b.py', children: [] };
  const layout = structureLayout({
    schemaVersion: 1,
    languageId: 'test',
    nodes: [file, fn, second],
    edges: [],
    issues: [],
  });
  const transform: PlaneTransform = {
    xScale: 2,
    xOffset: 0,
    yScale: 1,
    layerXScale: 2,
    layerYScale: 2,
    gap: 5,
    activeLane: 0,
  };
  for (const tile of layout.tiles) {
    const flat = tilePose(tile, layout, transform, 0),
      layers = tilePose(tile, layout, transform, 1);
    expect(flat.position[1]).toBe(tile.y + tile.height / 2);
    expect(flat.angle).toBeCloseTo(0);
    expect(flat.position[2]).toBe(0);
    expect(layers.position[1]).toBe(-tile.level * 5);
    expect(layers.angle).toBeCloseTo(-Math.PI / 2);
    expect(layers.position[2]).toBe(
      tile.lane * lanePitch(layout, transform) + (tile.row + 0.5) * 2,
    );
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      const p = tilePose(tile, layout, transform, t),
        top = planePoint(
          tile.x + tile.width / 2,
          tile.y + tile.height,
          tile.level,
          tile.lane,
          layout,
          transform,
          t,
        );
      expect(top[1] - p.position[1]).toBeCloseTo((Math.cos(p.angle) * p.height) / 2);
      expect(top[2] - p.position[2]).toBeCloseTo((Math.sin(p.angle) * p.height) / 2);
      expect(p.position.every(Number.isFinite)).toBe(true);
    }
  }
  expect(
    tilePose(layout.rects.b, layout, transform, 1).position[2] -
      tilePose(layout.rects.a, layout, transform, 1).position[2],
  ).toBe(lanePitch(layout, transform));
});
