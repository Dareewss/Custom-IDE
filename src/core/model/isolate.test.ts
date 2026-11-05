import { expect, it } from 'vitest';
import { isolationIds } from './isolate';
import { projectModel } from './view';
import type { CodeModel, CodeNode } from './types';

const file: CodeNode = {
  id: 'file',
  kind: 'file',
  name: 'main.py',
  fileId: 'main.py',
  range: { startLine: 1, startCol: 1, endLine: 20, endCol: 1 },
  parentId: null,
  children: ['a', 'b', 'unused'],
  meta: {},
};
const a: CodeNode = {
  ...file,
  id: 'a',
  kind: 'function',
  name: 'a',
  parentId: 'file',
  children: ['value'],
};
const value: CodeNode = {
  ...a,
  id: 'value',
  kind: 'variable',
  name: 'value',
  parentId: 'a',
  children: [],
};
const b: CodeNode = { ...a, id: 'b', name: 'b', children: [] };
const unused: CodeNode = { ...b, id: 'unused', name: 'unused' };
const ext: CodeNode = {
  id: 'ext',
  kind: 'external',
  name: 'dynamic',
  fileId: null,
  range: null,
  parentId: null,
  children: [],
  meta: {},
};
const model: CodeModel = {
  schemaVersion: 1,
  languageId: 'test',
  nodes: [file, a, value, b, unused, ext],
  edges: [
    { id: 'a-b', kind: 'call', from: 'value', to: 'b', resolved: true, confidence: 1 },
    { id: 'a-ext', kind: 'call', from: 'a', to: 'ext', resolved: false, confidence: 0 },
  ],
  issues: [],
};
it('isolates a real function, expands callers by scope and bounds callee depth', () => {
  expect([...isolationIds(model, { nodeId: 'b', depth: 0 })!].sort()).toEqual(['b', 'file']);
  expect([...isolationIds(model, { nodeId: 'b', depth: 1 })!].sort()).toEqual([
    'a',
    'b',
    'file',
    'value',
  ]);
  expect([...isolationIds(model, { nodeId: 'b', depth: 2 })!].sort()).toEqual([
    'a',
    'b',
    'ext',
    'file',
    'value',
  ]);
  const result = projectModel(model, {
    depth: 'all',
    collapsedIds: [],
    isolate: { nodeId: 'b', depth: 2 },
  });
  expect(result.model.nodes.some((node) => node.id === 'unused')).toBe(false);
  expect(result.model.edges.find((edge) => edge.id === 'a-ext')?.resolved).toBe(false);
});
it('rejects invalid roots and handles recursion without expanding unrelated file bodies', () => {
  expect(isolationIds(model, { nodeId: 'gone', depth: 1 })).toBeNull();
  expect(isolationIds(model, { nodeId: 'value', depth: 1 })).toBeNull();
  const recursive = {
    ...model,
    edges: [
      ...model.edges,
      { id: 'recursive', from: 'b', to: 'b', kind: 'call' as const, resolved: true, confidence: 1 },
    ],
  };
  expect(isolationIds(recursive, { nodeId: 'b', depth: 100 })?.has('unused')).toBe(false);
});
