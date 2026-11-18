import { expect, it } from 'vitest';
import { diffModels } from './diff';
import type { CodeModel, CodeNode } from './types';

const node: CodeNode = {
  id: 'stable',
  name: 'stable',
  kind: 'function',
  fileId: 'main.py',
  range: { startLine: 1, startCol: 1, endLine: 3, endCol: 1 },
  parentId: null,
  children: [],
  meta: {},
};
const model: CodeModel = {
  schemaVersion: 1,
  languageId: 'test',
  nodes: [node],
  edges: [],
  issues: [],
};
it('distinguishes stable source-range updates from additions and removals without mutation', () => {
  const before = structuredClone(model);
  const after: CodeModel = {
    ...model,
    nodes: [
      { ...node, range: { ...node.range!, startLine: 2, endLine: 4 } },
      { ...node, id: 'new', name: 'new' },
    ],
  };
  expect(diffModels(model, after)).toMatchObject({
    added: ['new'],
    removed: [],
    updated: ['stable'],
  });
  expect(diffModels(after, model)).toMatchObject({ removed: ['new'], updated: ['stable'] });
  expect(diffModels(null, model).added).toEqual(['stable']);
  expect(model).toEqual(before);
});
it('tracks changed graph certainty separately from identity', () => {
  const before: CodeModel = {
    ...model,
    edges: [
      { id: 'call', kind: 'call', from: node.id, to: node.id, resolved: false, confidence: 0 },
    ],
  };
  const after = { ...before, edges: [{ ...before.edges[0], resolved: true, confidence: 1 }] };
  expect(diffModels(before, after).edgesUpdated).toEqual(['call']);
  expect(diffModels(before, model).edgesRemoved).toEqual(['call']);
});
