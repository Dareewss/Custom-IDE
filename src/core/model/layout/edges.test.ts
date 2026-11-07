import { expect, it } from 'vitest';
import { edgeCurve, layoutEdges } from './edges';
import { hierarchicalLayout } from './hierarchy';
import { edgeBatch } from '../../../features/overview/edge-batch';
import type { CodeModel, CodeNode, CodeEdge } from '../types';

const file: CodeNode = {
  id: 'file',
  kind: 'file',
  name: 'main.py',
  fileId: 'main.py',
  range: { startLine: 1, startCol: 1, endLine: 10, endCol: 1 },
  parentId: null,
  children: ['import'],
  meta: {},
};
const imported: CodeNode = {
  ...file,
  id: 'import',
  kind: 'import',
  name: 'import helper',
  parentId: 'file',
  children: [],
};
const helper: CodeNode = {
  ...file,
  id: 'helper',
  name: 'helper.py',
  fileId: 'helper.py',
  children: [],
};
const external: CodeNode = {
  id: 'ext',
  kind: 'external',
  name: 'math.sqrt',
  fileId: null,
  range: null,
  parentId: null,
  children: [],
  meta: {},
};
const edge: CodeEdge = {
  id: 'edge',
  kind: 'import',
  from: 'import',
  to: 'helper',
  resolved: true,
  confidence: 1,
};
const model: CodeModel = {
  schemaVersion: 1,
  languageId: 'test',
  nodes: [file, imported, helper, external],
  edges: [
    edge,
    {
      ...edge,
      id: 'uncertain',
      kind: 'call',
      from: 'file',
      to: 'ext',
      resolved: false,
      confidence: 0,
    },
  ],
  issues: [],
};
it('connects imports between their actual file headers and clustered externals at their shared anchor', () => {
  const layout = hierarchicalLayout(model);
  const [a, b] = layout.edges;
  expect(a.points[0][0]).toBe(layout.items.file.position[0]);
  expect(a.points[0][1]).toBeGreaterThan(layout.items.file.position[1]);
  expect(a.points.at(-1)![0]).toBe(layout.items.helper.position[0]);
  expect(b.clusteredPoints.at(-1)).toEqual(layout.externalCluster!.position);
  expect(b.edge.resolved).toBe(false);
  expect(layoutEdges(model, { items: {}, externalCluster: null })).toEqual([]);
});
it('keeps directional curves deterministic and recursive loops non-degenerate', () => {
  const start: [number, number, number] = [1, 2, 3];
  const points = edgeCurve(start, start, 3);
  expect(points).toEqual(edgeCurve(start, start, 3));
  expect(points[0]).toEqual(start);
  expect(points.at(-1)).toEqual(start);
  expect(points.some((point) => point[0] !== start[0])).toBe(true);
  expect(points.flat().every(Number.isFinite)).toBe(true);
  expect(points.at(-2)).not.toEqual(points.at(-1));
});
it('batches solid and dashed lines with exact segment ownership and one directed arrow each', () => {
  const layout = hierarchicalLayout(model);
  const solid = edgeBatch([layout.edges[0]], false),
    dashed = edgeBatch([layout.edges[1]], false);
  expect(dashed.owners.length).toBeLessThan(solid.owners.length);
  expect(dashed.positions.length).toBe(dashed.owners.length * 6);
  expect(dashed.owners.every((owner) => owner.edge.id === 'uncertain')).toBe(true);
  expect(dashed.arrows).toHaveLength(1);
  expect(dashed.arrows[0].end).toEqual(layout.externalCluster!.position);
});
