import { expect, it } from 'vitest';
import { buildTileBvh, pickTile } from './tile-bvh';
import { structureLayout } from './structure';
import type { CodeModel, CodeNode } from '../types';

it('picks the exact source tile through a cloneable BVH, rejects gaps, and handles empty data', () => {
  const file: CodeNode = {
    id: 'file',
    name: 'main.py',
    kind: 'file',
    fileId: 'main.py',
    parentId: null,
    children: [],
    meta: {},
    range: { startLine: 1, startCol: 1, endLine: 101, endCol: 1 },
  };
  const nodes: CodeNode[] = [file];
  for (let i = 0; i < 100; i++) {
    const id = `value${i}`;
    file.children.push(id);
    nodes.push({
      ...file,
      id,
      name: id,
      kind: 'variable',
      parentId: file.id,
      children: [],
      range: { startLine: i + 1, startCol: 1, endLine: i + 1, endCol: 8 },
    });
  }
  const model: CodeModel = { schemaVersion: 1, languageId: 'test', nodes, edges: [], issues: [] };
  const layout = structureLayout(model);
  const tree = structuredClone(layout.picking['main.py']);
  expect(tree?.children).toHaveLength(2);
  layout.tiles.forEach((tile, index) =>
    expect(pickTile(tree, layout.tiles, tile.x + tile.width / 2, tile.y + tile.height / 2)).toBe(
      index,
    ),
  );
  expect(pickTile(tree, layout.tiles, -1, -1)).toBeNull();
  expect(pickTile(tree, layout.tiles, 1, -3.05)).toBeNull();
  const value = layout.tiles.find((tile) => tile.id === 'value0')!;
  expect(pickTile(tree, layout.tiles, value.x + 0.01, value.y + 0.4, 0.05, 0.05)).toBeNull();
  expect(buildTileBvh([], [])).toBeNull();
  expect(pickTile(null, [], 0, 0)).toBeNull();
});
