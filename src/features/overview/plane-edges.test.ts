import { expect, it } from 'vitest';
import type { CodeModel, CodeNode } from '../../core/model/types';
import { structureLayout } from '../../core/model/layout/structure';
import { tileConnections, connectionPoints } from './plane-edges';
const file: CodeNode = {
  id: 'file',
  name: 'a.py',
  kind: 'file',
  fileId: 'a.py',
  parentId: null,
  children: ['a', 'b'],
  range: { startLine: 1, startCol: 1, endLine: 21, endCol: 1 },
  meta: {},
};
const a: CodeNode = {
  ...file,
  id: 'a',
  name: 'a',
  kind: 'function',
  parentId: 'file',
  children: [],
  range: { startLine: 2, startCol: 1, endLine: 9, endCol: 1 },
};
const b: CodeNode = {
  ...a,
  id: 'b',
  name: 'b',
  range: { startLine: 10, startCol: 1, endLine: 18, endCol: 1 },
};
const ext: CodeNode = {
  id: 'ext',
  name: 'unknown',
  kind: 'external',
  fileId: null,
  range: null,
  parentId: null,
  children: [],
  meta: {},
};
const model: CodeModel = {
  schemaVersion: 1,
  languageId: 'test',
  nodes: [file, a, b, ext],
  issues: [],
  edges: [
    { id: 'call', kind: 'call', from: 'a', to: 'b', resolved: true, confidence: 1 },
    { id: 'unknown', kind: 'call', from: 'a', to: 'ext', resolved: false, confidence: 0 },
  ],
};
it('defaults off; context, unresolved ports, hidden endpoints and the cap reflect real edges', () => {
  const layout = structureLayout(model);
  expect(tileConnections(model, layout.tiles, {}, 'none', false, 'a').connections).toHaveLength(0);
  const routes = tileConnections(model, layout.tiles, {}, 'context', false, 'a');
  expect(routes.connections).toHaveLength(2);
  expect(routes.connections[1]).toMatchObject({ unresolved: true, to: null });
  expect(
    tileConnections(
      model,
      layout.tiles.filter((t) => !t.nodeIds.includes('b')),
      {},
      'all',
      false,
      null,
    ).connections,
  ).toHaveLength(1);
  expect(tileConnections(model, layout.tiles, {}, 'context', false, 'b').connections).toHaveLength(
    1,
  );
  expect(tileConnections(model, layout.tiles, {}, 'all', false, null, 1)).toMatchObject({
    hidden: 1,
  });
  const tf = {
    xScale: 1,
    xOffset: 0,
    yScale: 1,
    layerXScale: 1,
    layerYScale: 2,
    gap: 5,
    activeLane: 0,
  };
  for (const t of [0, 0.5, 1]) {
    const points = connectionPoints(routes.connections[0], layout, tf, t);
    expect(points.every((p) => p.every(Number.isFinite))).toBe(true);
    expect(points.slice(2, -2).every((p) => p[0] >= layout.width + 1)).toBe(true);
  }
});
it('aggregates imports by source/destination file pair with actual counts', () => {
  const target: CodeNode = { ...file, id: 'other', name: 'b.py', fileId: 'b.py', children: [] };
  const imports: CodeModel = {
    ...model,
    nodes: [...model.nodes, target],
    edges: Array.from({ length: 7 }, (_, i) => ({
      id: `i${i}`,
      kind: 'import',
      from: 'file',
      to: 'other',
      resolved: true,
      confidence: 1,
    })),
  };
  const layout = structureLayout(imports);
  expect(tileConnections(imports, layout.tiles, {}, 'none', true, null).connections).toMatchObject([
    { count: 7, kind: 'import', from: { fileId: 'a.py' }, to: { fileId: 'b.py' } },
  ]);
});
