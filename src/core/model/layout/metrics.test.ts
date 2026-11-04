import { expect, it } from 'vitest';
import { functionWidth, headerPosition } from './metrics';
import { hierarchicalLayout } from './hierarchy';
import { geometryTokens as tokens } from './tokens';
import type { CodeModel, CodeNode } from '../types';

const fn: CodeNode = {
  id: 'fn',
  kind: 'function',
  name: 'sum',
  fileId: 'main.py',
  range: { startLine: 1, startCol: 1, endLine: 2, endCol: 1 },
  parentId: null,
  children: ['a', 'b'],
  meta: { params: [{ name: 'a' }, { name: 'b' }] },
};
const parameter = (name: string): CodeNode => ({
  ...fn,
  id: name,
  name,
  kind: 'variable',
  parentId: 'fn',
  children: [],
  meta: { role: 'parameter' },
});

it('sizes capsules by source length while keeping parameter ports within the header', () => {
  const longer: CodeNode = { ...fn, range: { ...fn.range!, endLine: 80 } };
  expect(functionWidth(longer, 2)).toBeGreaterThan(functionWidth(fn, 2));
  expect(functionWidth(fn, 50)).toBeGreaterThanOrEqual(50 * tokens.portGap);
  const model: CodeModel = {
    schemaVersion: 1,
    languageId: 'test',
    nodes: [fn, parameter('a'), parameter('b')],
    edges: [],
    issues: [],
  };
  const { items } = hierarchicalLayout(model);
  const header = headerPosition(items.fn);
  expect(items.a.position[1]).toBe(items.b.position[1]);
  expect(items.a.position[0]).toBeLessThan(items.b.position[0]);
  expect(items.a.position[1]).toBeGreaterThan(header[1]);
  expect(items.a.size[0]).toBe(tokens.portRadius * 2);
  expect(items.fn.size[1]).toBe(tokens.functionHeaderHeight);
  for (const name of ['a', 'b'])
    expect(
      Math.abs(items[name].position[0] - items.fn.position[0]) + tokens.portRadius,
    ).toBeLessThan(items.fn.size[0] / 2);
});
