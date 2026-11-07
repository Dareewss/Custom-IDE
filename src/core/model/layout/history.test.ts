import { expect, it } from 'vitest';
import { rememberLayout } from './history';
import { automaticLayout } from './automatic';
import type { CodeModel, CodeNode } from '../types';

it('retains hidden roots across projections and prunes genuinely deleted sources', () => {
  const a: CodeNode = {
    id: 'a',
    name: 'a.py',
    kind: 'file',
    fileId: 'a.py',
    parentId: null,
    children: [],
    range: { startLine: 1, startCol: 1, endLine: 2, endCol: 1 },
    meta: {},
  };
  const b: CodeNode = { ...a, id: 'b', name: 'b.py', fileId: 'b.py' };
  const model: CodeModel = {
    schemaVersion: 1,
    languageId: 'test',
    nodes: [a, b],
    edges: [],
    issues: [],
  };
  const full = automaticLayout(model),
    subset = automaticLayout({ ...model, nodes: [a] }, full);
  const history = rememberLayout(subset, full, model);
  expect(subset.items.b).toBeUndefined();
  expect(history.items.b.position).toEqual(full.items.b.position);
  const restored = automaticLayout(model, history);
  expect(restored.items.a.position).toEqual(full.items.a.position);
  expect(restored.items.b.position).toEqual(full.items.b.position);
  expect(rememberLayout(subset, history, { ...model, nodes: [a] }).items.b).toBeUndefined();
});
