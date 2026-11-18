import { expect, it } from 'vitest';
import { projectModel } from './view';
import type { CodeModel, CodeNode } from './types';
import { buildModelIndexes } from './indexes';
import { automaticLayout } from './layout/automatic';

const file: CodeNode = {
  id: 'file',
  kind: 'file',
  name: 'main.py',
  fileId: 'main.py',
  range: { startLine: 1, startCol: 1, endLine: 20, endCol: 1 },
  parentId: null,
  children: ['class'],
  meta: {},
};
const cls: CodeNode = {
  ...file,
  id: 'class',
  kind: 'class',
  name: 'Thing',
  parentId: 'file',
  children: ['fn'],
};
const fn: CodeNode = {
  ...file,
  id: 'fn',
  kind: 'method',
  name: 'work',
  parentId: 'class',
  children: ['var'],
};
const variable: CodeNode = {
  ...file,
  id: 'var',
  kind: 'variable',
  name: 'value',
  parentId: 'fn',
  children: [],
};
const external: CodeNode = {
  id: 'ext',
  kind: 'external',
  name: 'print',
  fileId: null,
  range: null,
  parentId: null,
  children: [],
  meta: {},
};
const model: CodeModel = {
  schemaVersion: 1,
  languageId: 'test',
  nodes: [file, cls, fn, variable, external],
  edges: [{ id: 'call', from: 'fn', to: 'ext', kind: 'call', resolved: false, confidence: 0 }],
  issues: [],
};
it('projects semantic detail levels without changing the full source model or certainty', () => {
  const before = structuredClone(model);
  expect(
    projectModel(model, { depth: 'files', collapsedIds: [] }).model.nodes.map((n) => n.id),
  ).toEqual(['file', 'ext']);
  expect(
    projectModel(model, { depth: 'classes', collapsedIds: [] }).model.nodes.map((n) => n.id),
  ).toEqual(['file', 'class', 'ext']);
  expect(
    projectModel(model, { depth: 'functions', collapsedIds: [] }).model.nodes.map((n) => n.id),
  ).toEqual(['file', 'class', 'fn', 'ext']);
  const projected = projectModel(model, { depth: 'all', collapsedIds: ['class'] });
  expect(projected.ownerByNode.var).toBe('class');
  expect(projected.compactIds).toEqual(['class']);
  expect(projected.model.edges[0]).toEqual({ ...model.edges[0], from: 'class' });
  expect(() => buildModelIndexes(projected.model)).not.toThrow();
  expect(model).toEqual(before);
});
it('creates compact actual layout and drops internal dangling edges', () => {
  const data: CodeModel = {
    ...model,
    edges: [
      ...model.edges,
      { id: 'inside', kind: 'call', from: 'fn', to: 'var', resolved: true, confidence: 1 },
    ],
  };
  const projected = projectModel(data, { depth: 'all', collapsedIds: ['class'] });
  expect(projected.model.edges).toHaveLength(1);
  const layout = automaticLayout(projected.model, null, 0, new Set(projected.compactIds));
  expect(layout.items.class.collapsed).toBe(true);
  expect(layout.items.fn).toBeUndefined();
  expect(layout.items.class.size[1]).toBeLessThan(automaticLayout(model).items.class.size[1]);
});
it('handles deeply nested structures iteratively', () => {
  const nodes = Array.from({ length: 10000 }, (_, i): CodeNode => ({
    ...file,
    id: String(i),
    parentId: i ? String(i - 1) : null,
    children: i < 9999 ? [String(i + 1)] : [],
  }));
  const projected = projectModel(
    { ...model, nodes, edges: [] },
    { depth: 'all', collapsedIds: ['0'] },
  );
  expect(projected.model.nodes).toHaveLength(1);
  expect(projected.ownerByNode['9999']).toBe('0');
});
