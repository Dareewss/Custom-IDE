import { describe, expect, it } from 'vitest';
import { stableEdgeId, stableNodeId } from './identity';
import { buildModelIndexes, nodeAtPosition, rangeContains, validateRange } from './indexes';
import type { CodeModel, CodeNode, SourceRange } from './types';

const range = (
  startLine: number,
  startCol: number,
  endLine: number,
  endCol: number,
): SourceRange => ({ startLine, startCol, endLine, endCol });
const node = (
  id: string,
  location: SourceRange,
  parentId: string | null = null,
  children: string[] = [],
): Extract<CodeNode, { fileId: string }> => ({
  id,
  kind: parentId ? 'function' : 'file',
  name: id,
  fileId: 'main.py',
  range: location,
  parentId,
  children,
  meta: {},
});
const model = (nodes: CodeNode[]): CodeModel => ({
  schemaVersion: 1,
  languageId: 'test-language',
  nodes,
  edges: [],
  issues: [],
});
const fixture = () =>
  model([
    node('file', range(1, 1, 101, 1), null, ['function']),
    node('function', range(3, 1, 20, 1), 'file', ['variable', 'collection']),
    { ...node('variable', range(6, 5, 6, 12), 'function'), kind: 'variable' },
    { ...node('collection', range(10, 5, 14, 6), 'function'), kind: 'collection' },
    {
      id: 'external',
      kind: 'external',
      name: 'external library',
      fileId: null,
      range: null,
      parentId: null,
      children: [],
      meta: { externalKind: 'module' },
    },
  ]);

describe('stable identities', () => {
  it('uses lexical identity and occurrence without source line numbers', () => {
    const id = stableNodeId('pkg/main.py', 'method', 'Widget.render');
    expect(stableNodeId('pkg/main.py', 'method', 'Widget.render', 0)).toBe(id);
    expect(stableNodeId('pkg/main.py', 'method', 'Widget.render', 1)).not.toBe(id);
    expect(stableNodeId('pkg/main.py', 'method', 'Widget.draw')).not.toBe(id);
    expect(stableNodeId('pkg/other.py', 'method', 'Widget.render')).not.toBe(id);
    expect(stableNodeId('pkg/main.py', 'function', 'Widget.render')).not.toBe(id);
  });
  it('cannot collide on separators, Unicode or repeated edges', () => {
    expect(stableNodeId('a::function::b', 'function', 'c')).not.toBe(
      stableNodeId('a', 'function', 'b::function::c'),
    );
    expect(stableNodeId('λ.py', 'variable', '😀')).toBe(stableNodeId('λ.py', 'variable', '😀'));
    expect(stableEdgeId('call', 'a', 'b', 0)).not.toBe(stableEdgeId('call', 'a', 'b', 1));
    for (const occurrence of [-1, 0.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])
      expect(() => stableNodeId('a', 'file', 'a', occurrence)).toThrow('occurrence');
    expect(() => stableEdgeId('call', '', 'b')).toThrow();
  });
});

describe('source positions and adjacency', () => {
  it('chooses the smallest enclosing node with end-exclusive UTF-16 positions', () => {
    const indexes = buildModelIndexes(fixture());
    expect(nodeAtPosition(indexes, 'main.py', 6, 5)?.id).toBe('variable');
    expect(nodeAtPosition(indexes, 'main.py', 6, 11)?.id).toBe('variable');
    expect(nodeAtPosition(indexes, 'main.py', 6, 12)?.id).toBe('function');
    expect(nodeAtPosition(indexes, 'main.py', 6, 1)?.id).toBe('function');
    expect(nodeAtPosition(indexes, 'main.py', 6)?.id).toBe('variable');
    expect(nodeAtPosition(indexes, 'main.py', 12, 1)?.id).toBe('collection');
    expect(nodeAtPosition(indexes, 'main.py', 14, 6)?.id).toBe('function');
    expect(nodeAtPosition(indexes, 'main.py', 20, 1)?.id).toBe('file');
    expect(nodeAtPosition(indexes, 'main.py', 101, 1)).toBeUndefined();
    expect(nodeAtPosition(indexes, 'missing.py', 1, 1)).toBeUndefined();
    expect(indexes.lineToNode.has('external')).toBe(false);
    for (const [line, col] of [
      [0, 1],
      [1, 0],
      [1.2, 1],
      [NaN, 1],
      [1, Infinity],
    ])
      expect(nodeAtPosition(indexes, 'main.py', line, col)).toBeUndefined();
  });
  it('prefers deeper nodes at identical ranges and handles empty sources', () => {
    const same = range(1, 1, 1, 12);
    const indexes = buildModelIndexes(
      model([node('parent', same, null, ['child']), node('child', same, 'parent')]),
    );
    expect(nodeAtPosition(indexes, 'main.py', 1, 3)?.id).toBe('child');
    expect(
      nodeAtPosition(buildModelIndexes(model([node('empty', range(1, 1, 1, 1))])), 'main.py', 1),
    ).toBeUndefined();
  });
  it('indexes both edge directions once, retaining unresolved information', () => {
    const data = fixture();
    data.edges = [
      {
        id: 'call',
        kind: 'call',
        from: 'function',
        to: 'external',
        resolved: false,
        confidence: 0.1,
        source: { fileId: 'main.py', range: range(8, 5, 8, 13) },
      },
      {
        id: 'recursive',
        kind: 'call',
        from: 'function',
        to: 'function',
        resolved: true,
        confidence: 0.9,
      },
    ];
    const indexes = buildModelIndexes(data);
    expect(indexes.edgesByNode.get('external')).toEqual([data.edges[0]]);
    expect(indexes.edgesByNode.get('function')).toEqual(data.edges);
    expect(indexes.edgesByNode.get('variable')).toEqual([]);
    expect(indexes.nodeById.get('variable')).toBe(data.nodes[2]);
  });
  it('matches an independent flat containment search across thousands of ranges', () => {
    const nodes = [node('file', range(1, 1, 2002, 1), null, [])];
    for (let i = 1; i <= 2000; i++) {
      const id = `item${i}`;
      nodes[0].children.push(id);
      nodes.push(node(id, range(i + 1, 3, i + 1, 11), 'file'));
    }
    const indexes = buildModelIndexes(model(nodes));
    for (let line = 1; line <= 2002; line += 7)
      for (const column of [1, 3, 8, 11]) {
        const expected = nodes
          .filter((n) => n.range && rangeContains(n.range, line, column))
          .at(-1);
        expect(nodeAtPosition(indexes, 'main.py', line, column)?.id).toBe(expected?.id);
      }
  });
});

describe('model integrity', () => {
  it('rejects invalid ranges rather than silently selecting arbitrary source', () => {
    for (const invalid of [
      range(0, 1, 1, 1),
      range(2, 1, 1, 1),
      range(1, 4, 1, 3),
      range(1, NaN, 2, 1),
      range(1, 1, 2, 1.5),
    ])
      expect(() => validateRange(invalid)).toThrow('range');
  });
  it('rejects duplicate IDs, broken containment and cycles', () => {
    const data = fixture();
    expect(() => buildModelIndexes({ ...data, nodes: [...data.nodes, data.nodes[0]] })).toThrow(
      'Duplicate node',
    );
    expect(() =>
      buildModelIndexes(model([node('missing-parent', range(1, 1, 2, 1), 'unknown')])),
    ).toThrow('Missing parent');
    expect(() =>
      buildModelIndexes(
        model([node('a', range(1, 1, 2, 1), 'b', ['b']), node('b', range(1, 1, 2, 1), 'a', ['a'])]),
      ),
    ).toThrow('Cyclic');
    expect(() =>
      buildModelIndexes(model([node('a', range(1, 1, 2, 1), null, ['unknown'])])),
    ).toThrow('containment');
  });
  it('rejects missing edge endpoints and invalid confidence', () => {
    const data = fixture();
    data.edges = [
      { id: 'bad', kind: 'call', from: 'function', to: 'unknown', resolved: false, confidence: 0 },
    ];
    expect(() => buildModelIndexes(data)).toThrow('endpoint');
    data.edges[0].to = 'external';
    data.edges[0].confidence = 1.1;
    expect(() => buildModelIndexes(data)).toThrow('confidence');
  });
  it('handles very deep source containment without recursive ancestry traversal', () => {
    const nodes: CodeNode[] = [];
    for (let i = 0; i < 10000; i++)
      nodes.push(
        node(
          String(i),
          range(1, 1, 2, 1),
          i ? String(i - 1) : null,
          i < 9999 ? [String(i + 1)] : [],
        ),
      );
    expect(nodeAtPosition(buildModelIndexes(model(nodes)), 'main.py', 1, 1)?.id).toBe('9999');
  });
});
