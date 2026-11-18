import { expect, it } from 'vitest';
import { hierarchicalLayout } from './hierarchy';
import type { CodeModel, CodeNode } from '../types';

const file: CodeNode = {
  id: 'file',
  kind: 'file',
  name: 'main.py',
  fileId: 'main.py',
  range: { startLine: 1, startCol: 1, endLine: 20, endCol: 1 },
  parentId: null,
  children: ['fn'],
  meta: {},
};
const fn: CodeNode = {
  ...file,
  id: 'fn',
  kind: 'function',
  name: 'main',
  parentId: 'file',
  children: ['value'],
};
const value: CodeNode = {
  ...file,
  id: 'value',
  kind: 'variable',
  name: 'value',
  parentId: 'fn',
  children: [],
};
const model: CodeModel = {
  schemaVersion: 1,
  languageId: 'test',
  nodes: [file, fn, value],
  edges: [],
  issues: [],
};

it('lays out real containment deterministically with finite centered bounds', () => {
  const before = structuredClone(model);
  const result = hierarchicalLayout(model);
  expect(hierarchicalLayout(model)).toEqual(result);
  expect(model).toEqual(before);
  expect(Object.keys(result.items).sort()).toEqual(['file', 'fn', 'value']);
  expect(result.items.value.position[2]).toBeGreaterThan(result.items.fn.position[2]);
  expect(result.items.fn.position[2]).toBeGreaterThan(result.items.file.position[2]);
  for (const item of Object.values(result.items))
    for (let axis = 0; axis < 3; axis++) {
      expect(Number.isFinite(item.position[axis])).toBe(true);
      expect(item.position[axis] - item.size[axis] / 2).toBeGreaterThanOrEqual(
        result.bounds.min[axis] - 1e-9,
      );
      expect(item.position[axis] + item.size[axis] / 2).toBeLessThanOrEqual(
        result.bounds.max[axis] + 1e-9,
      );
    }
});
it('keeps function footprints inside their source plate and separates siblings on Z', () => {
  const data: CodeModel = {
    ...model,
    nodes: [
      { ...file, children: ['a', 'b'] },
      { ...fn, id: 'a', children: [] },
      { ...fn, id: 'b', children: [] },
    ],
  };
  const { items } = hierarchicalLayout(data);
  for (const child of ['a', 'b']) {
    expect(
      Math.abs(items[child].position[0] - items.file.position[0]) + items[child].size[0] / 2,
    ).toBeLessThan(items.file.size[0] / 2);
    expect(
      Math.abs(items[child].position[1] - items.file.position[1]) + items[child].size[1] / 2,
    ).toBeLessThanOrEqual(items.file.size[1] / 2);
  }
  expect(items.a.position[1]).toBe(items.b.position[1]);
  expect(Math.abs(items.a.position[2] - items.b.position[2])).toBeGreaterThan(
    (items.a.size[2] + items.b.size[2]) / 2,
  );
});
it('has a usable empty extent and handles external nodes without invented source positions', () => {
  expect(hierarchicalLayout({ ...model, nodes: [] }).bounds).toEqual({
    min: [-1, -1, -1],
    max: [1, 1, 1],
  });
  const data: CodeModel = {
    ...model,
    nodes: [
      ...model.nodes,
      {
        id: 'external',
        kind: 'external',
        name: 'print',
        fileId: null,
        range: null,
        parentId: null,
        children: [],
        meta: {},
      },
    ],
  };
  expect(hierarchicalLayout(data).items.external).toBeDefined();
});
