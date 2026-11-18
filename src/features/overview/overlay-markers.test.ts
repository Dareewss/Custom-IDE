import { expect, it } from 'vitest';
import { staticMarkers, resolveMarkers, type OverlayMarker } from './overlay-markers';
import { structureLayout } from '../../core/model/layout/structure';
import { buildModelIndexes } from '../../core/model/indexes';
import type { CodeModel } from '../../core/model/types';
it('maps real diagnostics, uncertainty and breakpoint lines through source rects and collapsed owners', () => {
  const model: CodeModel = {
    schemaVersion: 1,
    languageId: 'test',
    nodes: [
      {
        id: 'file',
        kind: 'file',
        fileId: 'main.py',
        name: 'main.py',
        parentId: null,
        children: ['fn'],
        range: { startLine: 1, startCol: 1, endLine: 10, endCol: 1 },
        meta: {},
      },
      {
        id: 'fn',
        kind: 'function',
        fileId: 'main.py',
        name: 'fn',
        parentId: 'file',
        children: [],
        range: { startLine: 2, startCol: 1, endLine: 8, endCol: 1 },
        meta: { hasError: true },
      },
    ],
    edges: [{ id: 'u', kind: 'call', from: 'fn', to: 'fn', resolved: false, confidence: 0 }],
    issues: [
      {
        fileId: 'main.py',
        range: { startLine: 3, startCol: 1, endLine: 3, endCol: 2 },
        message: 'Syntax error',
      },
    ],
  };
  const layout = structureLayout(model),
    indexes = buildModelIndexes(model),
    markers = staticMarkers(model, { 'main.py': [4] });
  expect(markers.map((m) => m.severity)).toEqual(['error', 'error', 'warning', 'breakpoint']);
  expect(resolveMarkers(markers, layout, indexes, {}, layout.tiles)).toHaveLength(4);
  expect(resolveMarkers(markers, layout, indexes, {}, [])).toEqual([]);
  const api: OverlayMarker[] = ['badge', 'outline', 'glow', 'cursor'].map((kind, i) => ({
    id: String(i),
    kind: kind as OverlayMarker['kind'],
    fileId: 'main.py',
    line: 4,
    severity: 'info',
    label: 'API',
  }));
  const actual = resolveMarkers(api, layout, indexes, {}, layout.tiles);
  expect(actual.every((e) => e.tile.nodeIds.includes('fn') && Number.isFinite(e.x))).toBe(true);
  const collapsed = { ...layout, rects: { file: layout.rects.file } };
  expect(
    resolveMarkers(markers, collapsed, indexes, { fn: 'file' }, [layout.rects.file]).every(
      (e) => e.tile.id === 'file',
    ),
  ).toBe(true);
  expect(
    resolveMarkers(
      [
        {
          id: 'missing',
          kind: 'cursor',
          severity: 'info',
          label: 'Missing',
          fileId: 'missing.py',
          line: 4,
        },
      ],
      layout,
      indexes,
      {},
      layout.tiles,
    ),
  ).toEqual([]);
});
