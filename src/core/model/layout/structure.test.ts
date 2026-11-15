// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Parser, Language } from 'web-tree-sitter';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { IncrementalPythonAnalyzer } from '../python/incremental';
import { structureLayout, structureStrategy } from './structure';
import { lineToX, nodeRect, lineSpan, mappedX } from './line-map';
import { planeLevel, type StructureLayout } from './structure-types';
import { layeredProject } from '../../../../e2e/fixtures/layered-project';
import type { CodeModel } from '../types';

let analyzer: IncrementalPythonAnalyzer;
beforeAll(async () => {
  await Parser.init({
    wasmBinary: await readFile(resolve('node_modules/web-tree-sitter/web-tree-sitter.wasm')),
  });
  const parser = new Parser();
  parser.setLanguage(
    await Language.load(resolve('node_modules/tree-sitter-python/tree-sitter-python.wasm')),
  );
  analyzer = new IncrementalPythonAnalyzer(parser);
});
afterAll(() => analyzer?.dispose());
const analyze = (source: string) =>
  analyzer.analyze({ 'main.py': { kind: 'file', content: source } });

function noOverlap(layout: StructureLayout) {
  const rows = new Map<string, typeof layout.tiles>();
  for (const tile of layout.tiles) {
    expect([tile.x, tile.y, tile.width, tile.height]).toEqual(
      expect.arrayContaining([expect.any(Number)]),
    );
    expect(tile.width).toBeGreaterThan(0);
    expect(tile.height).toBe(1);
    const key = `${tile.lane}:${tile.level}:${tile.row}`;
    const row = rows.get(key) ?? [];
    row.push(tile);
    rows.set(key, row);
  }
  for (const row of rows.values()) {
    row.sort((a, b) => a.x - b.x);
    for (let i = 1; i < row.length; i++)
      expect(row[i].x + 1e-8).toBeGreaterThanOrEqual(row[i - 1].x + row[i - 1].width);
  }
}
for (const [size, lines] of [
  ['small', 25],
  ['medium', 50],
  ['large', 250],
] as const)
  it(`lays out actual ${lines}-line source deterministically with contained X and no overlapping row tiles`, async () => {
    const model = analyze(await readFile(`tests/fixtures/python/bug_${size}_${lines}.py`, 'utf8'));
    const before = structuredClone(model);
    const layout = structureStrategy.layout(model);
    expect(structureLayout(model)).toEqual(layout);
    expect(structureLayout({ ...model, nodes: [...model.nodes].reverse() })).toEqual(layout);
    expect(structuredClone(layout)).toEqual(layout);
    expect(model).toEqual(before);
    expect(layout.planes).toHaveLength(5);
    expect(layout.lanes).toHaveLength(1);
    for (const node of model.nodes) {
      const rect = nodeRect(layout, node.id);
      if (node.kind === 'external') {
        expect(rect).toBeNull();
        continue;
      }
      expect(rect?.level).toBe(planeLevel(node.kind));
      if (node.parentId) {
        const parent = nodeRect(layout, node.parentId)!;
        expect(rect!.x + 1e-8).toBeGreaterThanOrEqual(parent.x);
        expect(rect!.x + rect!.width).toBeLessThanOrEqual(parent.x + parent.width + 1e-8);
      }
    }
    noOverlap(layout);
    const distant = structureLayout(model, { pixelsPerUnit: 0.5 });
    noOverlap(distant);
    for (const node of model.nodes)
      if (node.parentId && node.kind !== 'external') {
        const tile = nodeRect(distant, node.id)!,
          parent = nodeRect(distant, node.parentId)!;
        expect(tile.x + 1e-8).toBeGreaterThanOrEqual(parent.x);
        expect(tile.x + tile.width).toBeLessThanOrEqual(parent.x + parent.width + 1e-8);
      }
  });
it('uses monotonic compressed source knots and end-exclusive source-line spans', () => {
  expect(lineSpan({ startLine: 2, startCol: 1, endLine: 5, endCol: 1 })).toEqual([2, 5]);
  expect(lineSpan({ startLine: 2, startCol: 1, endLine: 5, endCol: 2 })).toEqual([2, 6]);
  const model = analyze('label = "😀"; count = 1\n' + '\n'.repeat(200) + 'result = count\n');
  const layout = structureLayout(model);
  expect(layout.width).toBeLessThan(25);
  const fileId = layout.lanes[0].fileId;
  let previous = -1;
  for (let line = 1; line <= 204; line += 0.25) {
    const x = lineToX(layout, fileId, line)!;
    expect(x).toBeGreaterThanOrEqual(previous);
    previous = x;
  }
  expect(lineToX(layout, fileId, -20)).toBe(0);
  expect(lineToX(layout, fileId, Infinity)).toBeNull();
  expect(lineToX(layout, 'missing', 1)).toBeNull();
  expect(nodeRect(layout, '__proto__')).toBeNull();
  expect(mappedX([], 1)).toBe(0);
});
it('preserves same-plane nesting rows and aggregates line-sharing siblings without losing source members', () => {
  const model = analyze(
    'def outer(a, b):\n    def inner():\n        if a:\n            if b:\n                return a\n        return b\n    return inner()\n',
  );
  const layout = structureLayout(model);
  const outer = model.nodes.find((node) => node.name === 'outer')!;
  const inner = model.nodes.find((node) => node.name === 'inner')!;
  expect(nodeRect(layout, outer.id)?.level).toBe(2);
  expect(nodeRect(layout, inner.id)?.row).toBe(1);
  expect(layout.tiles.some((tile) => tile.nodeIds.length > 1)).toBe(true);
  const members = layout.tiles.flatMap((tile) => tile.nodeIds);
  expect(new Set(members).size).toBe(members.length);
  expect(members.length).toBe(model.nodes.filter((node) => node.kind !== 'external').length);
  noOverlap(layout);
});
it('aggregates narrow adjacent tiles at low zoom and expands them at high zoom with stable IDs', () => {
  const model = analyze('a = 1\nb = 2\nc = 3\n');
  const low = structureLayout(model, { pixelsPerUnit: 2 });
  const high = structureLayout(model, { pixelsPerUnit: 30 });
  expect(low.tiles.length).toBeLessThan(high.tiles.length);
  expect(low.tiles.find((tile) => tile.level === 4)?.nodeIds).toHaveLength(3);
  expect(structureLayout(model, { pixelsPerUnit: 2 })).toEqual(low);
  noOverlap(low);
  noOverlap(high);
  for (const node of model.nodes)
    if (node.kind === 'variable') expect(nodeRect(high, node.id)?.id).toBe(node.id);
});
it('keeps unchanged file lanes and coordinates stable when another source changes or a file is added', () => {
  const tree = layeredProject(3, 2);
  const model = analyzer.analyze(tree);
  const before = structureLayout(model);
  tree['module_001.py'] = { kind: 'file', content: 'value = 9\n'.repeat(20) };
  tree['aaa.py'] = { kind: 'file', content: 'fresh = True\n' };
  const changed = structureLayout(analyzer.analyze(tree), {}, before);
  const unchanged = before.lanes.find((lane) => lane.fileId === 'module_000.py')!;
  expect(changed.lanes.find((lane) => lane.fileId === unchanged.fileId)).toEqual(unchanged);
  for (const tile of before.tiles.filter((tile) => tile.fileId === unchanged.fileId))
    expect(nodeRect(changed, tile.nodeIds[0])).toEqual(tile);
  expect(changed.lanes.at(-1)?.fileId).toBe('aaa.py');
});
it('handles empty and 100-file real-source projects with finite cloneable geometry and invalid scale rejection', () => {
  const empty: CodeModel = {
    schemaVersion: 1,
    languageId: 'python',
    nodes: [],
    edges: [],
    issues: [],
  };
  expect(structureLayout(empty).tiles).toEqual([]);
  const model = analyzer.analyze(layeredProject());
  const layout = structureLayout(model);
  expect(layout.lanes).toHaveLength(100);
  expect(layout.tiles.length).toBeGreaterThan(1000);
  expect(
    layout.tiles.every((tile) => [tile.x, tile.y, tile.width, tile.height].every(Number.isFinite)),
  ).toBe(true);
  noOverlap(layout);
  expect(() => structureLayout(model, { pixelsPerUnit: NaN })).toThrow('Invalid');
  expect(() => structureLayout(model, { pixelsPerUnit: 0 })).toThrow('Invalid');
});
