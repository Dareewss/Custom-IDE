import { expect, it } from 'vitest';
import type { CodeModel, CodeNode } from '../types';
import { hierarchicalLayout } from './hierarchy';
import { offsetLayout, parseFunctionOffsets } from './offsets';
import { headerPosition } from './metrics';

const make = (
  id: string,
  kind: Exclude<CodeNode['kind'], 'external'>,
  parentId: string | null,
  children: string[] = [],
): CodeNode => ({
  id,
  kind,
  parentId,
  children,
  name: id,
  fileId: 'main.py',
  range: { startLine: 1, startCol: 1, endLine: 2, endCol: 1 },
  meta: {},
});
const model: CodeModel = {
  schemaVersion: 1,
  languageId: 'test',
  issues: [],
  nodes: [
    make('file', 'file', null, ['outer', 'other']),
    make('outer', 'function', 'file', ['nested', 'values']),
    make('nested', 'function', 'outer', ['value']),
    make('value', 'variable', 'nested'),
    {
      ...make('values', 'collection', 'outer'),
      meta: { collectionKind: 'list', elementCount: 2, preview: ['1', '2'] },
    },
    make('other', 'function', 'file'),
  ],
  edges: [
    {
      id: 'call',
      kind: 'call',
      from: 'nested',
      to: 'other',
      resolved: true,
      confidence: 1,
      source: { fileId: 'main.py', range: { startLine: 1, startCol: 1, endLine: 1, endCol: 2 } },
    },
  ],
};

it('moves complete nested function subtrees and their cells without moving their file or sibling', () => {
  const base = hierarchicalLayout(model),
    before = structuredClone(base);
  const result = offsetLayout(model, base, { outer: [2, 3, 4], nested: [1, 0, 2] });
  expect(base).toEqual(before);
  expect(result.items.file).toBe(base.items.file);
  expect(result.items.other).toBe(base.items.other);
  for (const id of ['outer', 'values'])
    expect(result.items[id].position).toEqual(
      base.items[id].position.map((v, i) => v + [2, 3, 4][i]),
    );
  for (const id of ['nested', 'value'])
    expect(result.items[id].position).toEqual(
      base.items[id].position.map((v, i) => v + [3, 3, 6][i]),
    );
  expect(result.cells.values[0].position).toEqual(
    base.cells.values[0].position.map((v, i) => v + [2, 3, 4][i]),
  );
  expect(result.edges[0].points[0]).toEqual(headerPosition(result.items.nested));
  expect(result.edges[0].points.at(-1)).toEqual(headerPosition(result.items.other));
  expect(result.bounds.max[2]).toBeGreaterThan(base.bounds.max[2]);
  expect(offsetLayout(model, base, {})).toBe(base);
  expect(offsetLayout(model, base, { missing: [1, 2, 3], file: [1, 1, 1] })).toBe(base);
});

it('keeps import curves anchored to source files while moving function call endpoints', () => {
  const data: CodeModel = {
    ...model,
    edges: [{ ...model.edges[0], id: 'import', kind: 'import', from: 'nested', to: 'other' }],
  };
  const base = hierarchicalLayout(data);
  const result = offsetLayout(data, base, { outer: [2, 0, 1] });
  expect(result.edges[0]).toBe(base.edges[0]);
});

it('validates finite bounded per-function offsets and limits corrupted persisted data', () => {
  expect(
    parseFunctionOffsets({
      good: [1, -2, 3],
      nan: [NaN, 0, 0],
      infinite: [Infinity, 1, 1],
      huge: [10001, 0, 0],
      short: [1, 2],
      text: ['1', 2, 3],
      '': [1, 1, 1],
    }),
  ).toEqual({ good: [1, -2, 3] });
  expect(parseFunctionOffsets(null)).toEqual({});
  expect(parseFunctionOffsets([])).toEqual({});
  expect(
    Object.keys(
      parseFunctionOffsets(
        Object.fromEntries(Array.from({ length: 3000 }, (_, i) => [`fn-${i}`, [1, 2, 3]])),
      ),
    ),
  ).toHaveLength(2048);
});

it('separates differently sized sibling functions on Z with aligned headers and no body overlap', () => {
  const { items } = hierarchicalLayout(model);
  expect(headerPosition(items.outer)[1]).toBe(headerPosition(items.other)[1]);
  const bodyFront = Math.max(
    ...['outer', 'nested', 'value', 'values'].map(
      (id) => items[id].position[2] + items[id].size[2] / 2,
    ),
  );
  expect(items.other.position[2] - items.other.size[2] / 2).toBeGreaterThan(bodyFront);
  expect(items.nested.position[2]).toBeGreaterThan(items.outer.position[2]);
});
