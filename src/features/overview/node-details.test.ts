import { expect, it } from 'vitest';
import { buildModelIndexes } from '../../core/model/indexes';
import type { CodeModel, CodeNode } from '../../core/model/types';
import { descendants, relatedNodes } from './tile-context';
import { nodeDetails } from './node-details';

it('keeps scope separate from call context and derives exact source metrics', () => {
  const file: CodeNode = {
    id: 'file',
    name: 'main.py',
    kind: 'file',
    fileId: 'main.py',
    parentId: null,
    children: ['a', 'b', 'c'],
    range: { startLine: 1, startCol: 1, endLine: 31, endCol: 1 },
    meta: {},
  };
  const a: CodeNode = {
    ...file,
    id: 'a',
    kind: 'function',
    name: 'a',
    parentId: 'file',
    children: ['value'],
    range: { startLine: 1, startCol: 1, endLine: 11, endCol: 1 },
  };
  const b: CodeNode = {
    ...a,
    id: 'b',
    name: 'b',
    children: [],
    range: { startLine: 12, startCol: 1, endLine: 20, endCol: 1 },
  };
  const c: CodeNode = {
    ...b,
    id: 'c',
    name: 'c',
    range: { startLine: 21, startCol: 1, endLine: 30, endCol: 1 },
  };
  const value: CodeNode = {
    ...b,
    id: 'value',
    name: 'value',
    kind: 'variable',
    parentId: 'a',
    range: { startLine: 2, startCol: 1, endLine: 2, endCol: 8 },
  };
  const model: CodeModel = {
    schemaVersion: 1,
    languageId: 'test',
    nodes: [file, a, b, c, value],
    edges: [{ id: 'call', kind: 'call', from: 'b', to: 'a', resolved: true, confidence: 1 }],
    issues: [
      {
        fileId: 'main.py',
        range: { startLine: 7, startCol: 1, endLine: 7, endCol: 2 },
        message: 'Incomplete expression',
      },
    ],
  };
  const indexes = buildModelIndexes(model);
  expect([...descendants(indexes, 'a')!]).toEqual(['a', 'value']);
  expect(relatedNodes(indexes, 'a')).toEqual(new Set(['a', 'value', 'file', 'b']));
  expect(relatedNodes(indexes, null)).toBeNull();
  expect(nodeDetails(a, model, indexes)).toMatchObject({
    lines: 10,
    share: 33,
    children: 1,
    callees: [],
    callers: [model.edges[0]],
    diagnostics: model.issues,
  });
  expect(nodeDetails(b, model, indexes).diagnostics).toEqual([]);
});
