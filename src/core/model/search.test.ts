import { expect, it } from 'vitest';
import { searchModel } from './search';
import type { CodeModel, CodeNode } from './types';

const file: CodeNode = {
  id: 'file',
  kind: 'file',
  name: 'main.py',
  fileId: 'src/main.py',
  range: { startLine: 1, startCol: 1, endLine: 10, endCol: 1 },
  parentId: null,
  children: ['fn', 'var'],
  meta: {},
};
const fn: CodeNode = {
  ...file,
  id: 'fn',
  kind: 'function',
  name: 'Build',
  parentId: 'file',
  children: [],
  meta: { qualifiedName: 'Factory.Build' },
};
const variable: CodeNode = { ...fn, id: 'var', kind: 'variable', name: 'build_count', meta: {} };
const model: CodeModel = {
  schemaVersion: 1,
  languageId: 'test',
  nodes: [file, fn, variable],
  edges: [],
  issues: [],
};
it('matches normalized names, qualified paths and kind with real ancestor context', () => {
  const result = searchModel(model, 'ＢＵＩＬＤ src', 'function');
  expect(result.matches.map((node) => node.id)).toEqual(['fn']);
  expect([...result.context]).toEqual(['fn', 'file']);
  expect(result.active).toBe(true);
  expect(searchModel(model, '', 'all').active).toBe(false);
  expect(searchModel(model, 'missing', 'all').matches).toEqual([]);
  expect(searchModel(model, 'Factory.Build', 'all').matches.map((node) => node.id)).toEqual(['fn']);
});
