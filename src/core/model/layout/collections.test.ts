import { expect, it } from 'vitest';
import { collectionCells, collectionDimensions, collectionEntries } from './collections';
import { hierarchicalLayout } from './hierarchy';
import type { CodeNode } from '../types';
import { valueInstances } from '../../../features/overview/value-instances';

const node: CodeNode = {
  id: 'items',
  kind: 'collection',
  name: 'items',
  fileId: 'main.py',
  range: { startLine: 1, startCol: 1, endLine: 1, endCol: 10 },
  parentId: null,
  children: [],
  meta: {
    collectionKind: 'list',
    elementCount: 20,
    entries: Array.from({ length: 20 }, (_, i) => ({
      value: String(i),
      valueType: 'number' as const,
    })),
  },
};
it('caps previews and actual instance cells at eight while preserving declared count', () => {
  const model = {
    schemaVersion: 1 as const,
    languageId: 'test',
    nodes: [node],
    edges: [],
    issues: [],
  };
  const layout = hierarchicalLayout(model);
  const values = valueInstances(model, layout);
  expect(collectionEntries(node)).toHaveLength(8);
  expect(values.cells).toHaveLength(8);
  expect(values.cells.every((cell) => cell.node === node && cell.kind === 'number')).toBe(true);
  expect(new Set(values.cells.map((cell) => cell.position[0])).size).toBe(8);
  expect(node.meta.elementCount).toBe(20);
});
it('places dictionary keys and values in separate aligned rows and maps every pick to its node', () => {
  const dict: CodeNode = {
    ...node,
    meta: {
      collectionKind: 'dict',
      entries: [{ key: '"on"', keyType: 'string', value: 'True', valueType: 'bool' }],
    },
  };
  const model = {
    schemaVersion: 1 as const,
    languageId: 'test',
    nodes: [dict],
    edges: [],
    issues: [],
  };
  const layout = hierarchicalLayout(model);
  const cells = layout.cells[dict.id];
  expect(cells).toHaveLength(2);
  expect(cells[0].position[0]).toBe(cells[1].position[0]);
  expect(cells[0].position[1]).toBeGreaterThan(cells[1].position[1]);
  expect(
    valueInstances(model, layout).cells.map((cell) => [cell.node.id, cell.kind, cell.detail]),
  ).toEqual([
    ['items', 'string', 'key 1: "on"'],
    ['items', 'bool', 'value 1: True'],
  ]);
});
it('keeps empty and computed collections visible without inventing data cells', () => {
  for (const meta of [
    { collectionKind: 'list' as const, elementCount: 0, entries: [] },
    { collectionKind: 'dict' as const },
  ]) {
    const empty = { ...node, meta };
    const dimensions = collectionDimensions(empty);
    expect(dimensions.width).toBeGreaterThan(0);
    expect(dimensions.height).toBeGreaterThan(0);
    expect(
      collectionCells(empty, {
        id: node.id,
        position: [0, 0, 0],
        size: [dimensions.width, dimensions.height, 1],
      }),
    ).toEqual([]);
  }
});
