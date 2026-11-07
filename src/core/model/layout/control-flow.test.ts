import { expect, it } from 'vitest';
import { hierarchicalLayout } from './hierarchy';
import { branchGroups } from './control-flow';
import type { CodeNode, CodeModel } from '../types';

const loop: CodeNode = {
  id: 'loop',
  kind: 'loop',
  name: 'for i',
  fileId: 'main.py',
  range: { startLine: 1, startCol: 1, endLine: 9, endCol: 1 },
  parentId: null,
  children: ['if'],
  meta: { loopKind: 'for' },
};
const condition: CodeNode = {
  ...loop,
  id: 'if',
  kind: 'condition',
  name: 'if i',
  parentId: 'loop',
  children: ['yes', 'no'],
  meta: { conditionKind: 'if', branchCount: 2 },
};
const yes: CodeNode = {
  ...loop,
  id: 'yes',
  kind: 'variable',
  name: 'yes',
  parentId: 'if',
  children: [],
  meta: { branch: 'true' },
};
const no: CodeNode = { ...yes, id: 'no', name: 'no', meta: { branch: 'false' } };
const model: CodeModel = {
  schemaVersion: 1,
  languageId: 'test',
  nodes: [loop, condition, yes, no],
  edges: [],
  issues: [],
};
it('separates true and false branches and contains the nested body inside the loop ellipse', () => {
  const { items, branches } = hierarchicalLayout(model);
  expect(items.yes.position[0]).toBeLessThan(items.no.position[0]);
  expect(branches.if.map((lane) => [lane.name, lane.children])).toEqual([
    ['True', ['yes']],
    ['False', ['no']],
  ]);
  const body = items.if,
    ring = items.loop;
  for (const x of [-1, 1])
    for (const y of [-1, 1]) {
      const dx =
        (body.position[0] + (x * body.size[0]) / 2 - ring.position[0]) / (ring.size[0] / 2);
      const dy =
        (body.position[1] + (y * body.size[1]) / 2 - ring.position[1]) / (ring.size[1] / 2);
      expect(dx * dx + dy * dy).toBeLessThan(1);
    }
});
it('keeps empty false paths and match cases distinct without fabricating source nodes', () => {
  const empty = { ...condition, children: ['yes'] };
  const byId = new Map(model.nodes.map((node) => [node.id, node]));
  const sizes = new Map<string, [number, number, number]>([['yes', [1, 1, 1]]]);
  expect(branchGroups(empty, byId, sizes).map((group) => group.children)).toEqual([['yes'], []]);
  expect(
    branchGroups({ ...empty, children: [], meta: { conditionKind: 'match' } }, byId, sizes).map(
      (group) => group.name,
    ),
  ).toEqual(['Cases']);
});
