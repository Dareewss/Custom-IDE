import { expect, it } from 'vitest';
import { automaticLayout } from './automatic';
import type { CodeModel, CodeNode } from '../types';

function fixture(count: number): CodeModel {
  const nodes: CodeNode[] = [];
  for (let i = 0; i < count; i++) {
    const file: CodeNode = {
      id: `file${i}`,
      kind: 'file',
      name: `file${i}.py`,
      fileId: `file${i}.py`,
      range: { startLine: 1, startCol: 1, endLine: 50, endCol: 1 },
      parentId: null,
      children: [],
      meta: {},
    };
    nodes.push(file);
    for (let j = 0; j < i % 6; j++) {
      const child = `${file.id}-${j}`;
      file.children.push(child);
      nodes.push({
        ...file,
        id: child,
        kind: 'function',
        name: child,
        parentId: file.id,
        children: [],
        meta: {},
      });
    }
  }
  return {
    schemaVersion: 1,
    languageId: 'test',
    nodes,
    edges: Array.from({ length: Math.max(0, count - 1) }, (_, i) => ({
      id: `edge${i}`,
      from: `file${i}`,
      to: `file${i + 1}`,
      kind: 'import',
      resolved: true,
      confidence: 1,
    })),
    issues: [],
  };
}
it('produces deterministic seeded 3D file separation with finite bounds and no overlapping slabs', () => {
  const model = fixture(30),
    before = structuredClone(model);
  const a = automaticLayout(model, null, 7),
    b = automaticLayout(model, null, 7);
  expect(a).toEqual(b);
  expect(model).toEqual(before);
  expect(automaticLayout(model, null, 8).items.file0.position).not.toEqual(a.items.file0.position);
  const files = model.nodes.filter((node) => node.kind === 'file').map((node) => a.items[node.id]);
  for (let i = 0; i < files.length; i++)
    for (let j = i + 1; j < files.length; j++) {
      const x =
        Math.abs(files[i].position[0] - files[j].position[0]) -
        (files[i].size[0] + files[j].size[0]) / 2;
      const y =
        Math.abs(files[i].position[1] - files[j].position[1]) -
        (files[i].size[1] + files[j].size[1]) / 2;
      expect(Math.max(x, y)).toBeGreaterThanOrEqual(2.999);
    }
  expect(
    Object.values(a.items)
      .flatMap((item) => [...item.position, ...item.size])
      .every(Number.isFinite),
  ).toBe(true);
});
it('keeps unchanged file positions exact across edits and moves descendants by their root offset', () => {
  const model = fixture(8),
    a = automaticLayout(model);
  const b = automaticLayout(
    {
      ...model,
      nodes: model.nodes.map((node) =>
        node.kind === 'external'
          ? node
          : {
              ...node,
              range: {
                ...node.range,
                startLine: node.range.startLine + 1,
                endLine: node.range.endLine + 1,
              },
            },
      ),
    },
    a,
  );
  for (const node of model.nodes.filter((node) => node.kind === 'file'))
    expect(b.items[node.id].position).toEqual(a.items[node.id].position);
  const c = automaticLayout(model, null, 3);
  const root = model.nodes.find((node) => node.id === 'file1')!;
  const child = root.children[0];
  for (let i = 0; i < 3; i++)
    expect(c.items[child].position[i] - c.items[root.id].position[i]).toBeCloseTo(
      a.items[child].position[i] - a.items[root.id].position[i],
      10,
    );
});
it('handles empty projects and places an expanded external cluster clear of source files', () => {
  expect(automaticLayout(fixture(0)).bounds.min).toEqual([-1, -1, -1]);
  const model = fixture(1);
  for (let i = 0; i < 20; i++)
    model.nodes.push({
      id: `ext${i}`,
      name: `ext${i}`,
      kind: 'external',
      fileId: null,
      range: null,
      parentId: null,
      children: [],
      meta: {},
    });
  const layout = automaticLayout(model),
    file = layout.items.file0;
  for (const node of model.nodes.filter((node) => node.kind === 'external'))
    expect(layout.items[node.id].position[0] + layout.items[node.id].size[0] / 2).toBeLessThan(
      file.position[0] - file.size[0] / 2,
    );
});
