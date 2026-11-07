import { expect, it } from 'vitest';
import type { CodeNode } from '../../core/model/types';
import { outlineTree } from './outline-tree';
const file: CodeNode = {
  id: 'file',
  name: 'main.py',
  kind: 'file',
  fileId: 'main.py',
  range: { startLine: 1, startCol: 1, endLine: 3, endCol: 1 },
  parentId: null,
  children: ['a', 'b'],
  meta: {},
};
const nodes: CodeNode[] = [
  file,
  { ...file, id: 'a', name: 'alpha', kind: 'variable', parentId: 'file', children: [] },
  { ...file, id: 'b', name: 'beta', kind: 'variable', parentId: 'file', children: [] },
];
it('orders nested visible nodes with truthful accessible sibling metadata', () => {
  expect(
    outlineTree(nodes, new Set(['file', 'a', 'b'])).map(({ node, ...entry }) => ({
      id: node.id,
      ...entry,
    })),
  ).toEqual([
    { id: 'file', depth: 1, position: 1, siblings: 1 },
    { id: 'a', depth: 2, position: 1, siblings: 2 },
    { id: 'b', depth: 2, position: 2, siblings: 2 },
  ]);
  expect(outlineTree(nodes, new Set(['file', 'b']))[1]).toMatchObject({ position: 1, siblings: 1 });
  expect(outlineTree(nodes, new Set(['file']))).toHaveLength(1);
});
