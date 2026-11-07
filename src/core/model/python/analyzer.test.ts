// @vitest-environment node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Parser, Language } from 'web-tree-sitter';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { IncrementalPythonAnalyzer } from './incremental';
import { sourceEdit } from './source-edit';
import { buildModelIndexes, nodeAtPosition } from '../indexes';
import type { CodeModel } from '../types';
import { overviewTour } from '../../../features/projects/overview-tour';

let language: Language;
let constructs: string;
let partial: string;
const analyzers: IncrementalPythonAnalyzer[] = [];
beforeAll(async () => {
  await Parser.init({
    wasmBinary: await readFile(resolve('node_modules/web-tree-sitter/web-tree-sitter.wasm')),
  });
  language = await Language.load(
    resolve('node_modules/tree-sitter-python/tree-sitter-python.wasm'),
  );
  constructs = await readFile(resolve('tests/fixtures/python/constructs.py'), 'utf8');
  partial = await readFile(resolve('tests/fixtures/python/partial.py'), 'utf8');
});
afterEach(() => {
  for (const analyzer of analyzers.splice(0)) analyzer.dispose();
});
function create() {
  const parser = new Parser();
  parser.setLanguage(language);
  const analyzer = new IncrementalPythonAnalyzer(parser);
  analyzers.push(analyzer);
  return analyzer;
}
const analyze = (analyzer: IncrementalPythonAnalyzer, content: string) =>
  analyzer.analyze({ 'main.py': { kind: 'file', content } });
const named = (model: CodeModel, name: string) => model.nodes.find((n) => n.name === name)!;

it('analyzes the runnable multi-file 3D Tour with every supported shape and honest edges', () => {
  const model = create().analyze(overviewTour.tree);
  expect(model.issues).toEqual([]);
  expect(new Set(model.nodes.map((node) => node.kind))).toEqual(
    new Set([
      'file',
      'class',
      'function',
      'method',
      'variable',
      'collection',
      'loop',
      'condition',
      'import',
      'external',
    ]),
  );
  expect(model.edges.some((edge) => edge.kind === 'inherits' && edge.resolved)).toBe(true);
  expect(model.edges.some((edge) => edge.kind === 'import' && edge.resolved)).toBe(true);
  expect(model.edges.some((edge) => edge.kind === 'call' && !edge.resolved)).toBe(true);
  expect(named(model, 'Counter').fileId).toBe('tour/models.py');
  expect(named(model, 'summarize').fileId).toBe('tour/analysis.py');
  expect(named(model, 'values').meta.elementCount).toBe(6);
});

it('extracts real Python classes, methods, nested functions, params and literal values', () => {
  const model = analyze(create(), constructs);
  expect(model.issues).toEqual([]);
  const counter = named(model, 'Counter');
  expect(counter.kind).toBe('class');
  expect(named(model, '__init__')).toMatchObject({
    kind: 'method',
    parentId: counter.id,
    meta: {
      params: [
        { name: 'self' },
        { name: 'label', typeHint: 'str', defaultValue: '"items"' },
        { name: 'args', variadic: true },
        { name: 'kwargs', variadic: true },
      ],
    },
  });
  expect(named(model, 'inner')).toMatchObject({
    kind: 'function',
    parentId: named(model, 'outer').id,
    meta: { qualifiedName: 'outer.inner' },
  });
  expect(named(model, 'self.values')).toMatchObject({
    kind: 'collection',
    meta: {
      role: 'attribute',
      collectionKind: 'list',
      elementCount: 10,
      preview: ['0', '1', '2', '3', '4', '5', '6', '7'],
    },
  });
  expect(named(model, 'settings')).toMatchObject({
    kind: 'collection',
    meta: { collectionKind: 'dict', elementCount: 2 },
  });
  expect(named(model, 'empty')).toMatchObject({
    kind: 'collection',
    meta: { elementCount: 0, preview: [] },
  });
  expect(named(model, 'pair').meta.collectionKind).toBe('tuple');
  expect(named(model, 'unique').meta.collectionKind).toBe('set');
  expect(named(model, 'enabled').meta.valueType).toBe('bool');
  expect(named(model, 'initial').meta).toMatchObject({ typeHint: 'int', valueType: 'number' });
  expect(named(model, 'label').meta).toMatchObject({ role: 'parameter', valueType: 'string' });
  expect(named(model, 'left').kind).toBe('variable');
  expect(named(model, 'right').kind).toBe('variable');
  expect(() => buildModelIndexes(model)).not.toThrow();
});

it('models loops and condition branches while leaving dynamic collection counts unknown', () => {
  const model = analyze(create(), constructs);
  expect(model.nodes.filter((n) => n.kind === 'loop').map((n) => n.meta.loopKind)).toEqual([
    'for',
    'while',
    'comprehension',
  ]);
  const condition = model.nodes.find(
    (n) => n.kind === 'condition' && n.name.startsWith('if value'),
  )!;
  expect(condition.meta.branchCount).toBe(3);
  expect(model.nodes.filter((n) => n.parentId === condition.id).map((n) => n.meta.branch)).toEqual(
    expect.arrayContaining(['true', 'elif', 'false']),
  );
  expect(named(model, 'computed').meta.elementCount).toBeUndefined();
  expect(named(model, 'computed').meta.preview).toBeUndefined();
});

it('extracts capped typed collection entries without evaluating expressions', async () => {
  const model = analyze(create(), await readFile('tests/fixtures/python/values.py', 'utf8'));
  expect(named(model, 'items').meta.entries).toHaveLength(8);
  expect(named(model, 'items').meta.entries?.slice(0, 4)).toEqual([
    { value: '1', valueType: 'number' },
    { value: '"two"', valueType: 'string' },
    { value: 'True', valueType: 'bool' },
    { value: 'None', valueType: 'other' },
  ]);
  expect(named(model, 'options').meta.entries?.[1]).toEqual({
    key: '"enabled"',
    keyType: 'string',
    value: 'True',
    valueType: 'bool',
  });
  expect(named(model, 'empty').meta.entries).toEqual([]);
  expect(named(model, 'computed').meta.entries).toBeUndefined();
});

it('keeps correct UTF-16 ranges after astral characters', () => {
  const model = analyze(create(), constructs);
  const line = constructs.split('\n').findIndex((text) => text.includes('after ='));
  const column = constructs.split('\n')[line].indexOf('after') + 1;
  expect(named(model, 'after').range?.startCol).toBe(column);
  expect(nodeAtPosition(buildModelIndexes(model), 'main.py', line + 1, column)?.name).toBe('after');
});

it('reuses untouched files, incrementally updates changed files and frees removed trees', () => {
  const analyzer = create();
  const first = analyzer.analyze({
    'main.py': { kind: 'file', content: constructs },
    'helper.py': { kind: 'file', content: 'value = 1\n' },
    assets: { kind: 'folder' },
    'notes.json': { kind: 'file', content: '{}' },
  });
  const before = named(first, 'total');
  const changed = '\n# shifted source\n' + constructs.replace('count += 1', 'count += 2');
  const next = analyzer.analyze({
    'main.py': { kind: 'file', content: changed },
    'helper.py': { kind: 'file', content: 'value = 1\n' },
  });
  expect(named(next, 'total').id).toBe(before.id);
  expect(named(next, 'total').range?.startLine).toBe(before.range!.startLine + 2);
  expect(analyzer.stats).toEqual({ parsed: 3, reused: 1, cached: 2 });
  expect(() => buildModelIndexes(next)).not.toThrow();
  analyze(analyzer, changed);
  expect(analyzer.stats).toEqual({ parsed: 3, reused: 2, cached: 1 });
  expect(analyzer.analyze({}).nodes).toEqual([]);
  expect(analyzer.stats.cached).toBe(0);
  analyzer.dispose();
  expect(() => analyze(analyzer, '')).toThrow('disposed');
});

it('returns partial structures and error marks during incomplete typing and recovers', () => {
  const analyzer = create();
  const model = analyze(analyzer, partial);
  expect(model.issues.length).toBeGreaterThan(0);
  expect(named(model, 'Recoverable').kind).toBe('class');
  expect(named(model, 'valid').kind).toBe('method');
  expect(model.nodes.find((n) => n.kind === 'file')?.meta.hasError).toBe(true);
  expect(() => buildModelIndexes(model)).not.toThrow();
  const recovered = analyze(analyzer, constructs);
  expect(recovered.issues).toEqual([]);
  expect(recovered.nodes.find((n) => n.kind === 'file')?.meta.hasError).toBe(false);
});

it('keeps repeated lexical declarations unique and stable on unrelated edits', () => {
  const analyzer = create();
  const text = 'def same():\n    value = 1\ndef same():\n    value = 2\n';
  const first = analyze(analyzer, text);
  expect(new Set(first.nodes.map((n) => n.id)).size).toBe(first.nodes.length);
  const second = analyze(analyzer, 'other = 0\n' + text);
  expect(first.nodes.filter((n) => n.kind !== 'file').map((n) => n.id)).toEqual(
    second.nodes.filter((n) => n.name !== 'other' && n.kind !== 'file').map((n) => n.id),
  );
  expect(() => buildModelIndexes(second)).not.toThrow();
});

it('makes incremental Unicode insertions, deletions and replacements match a fresh parse', () => {
  const analyzer = create();
  const snapshots = [
    'label = "😀"\nvalue = 1\n',
    'label = "😁"\nvalue = 2\n',
    '\nlabel = "😁"\nvalue = 2\n',
    'label = "x"\n',
    '',
    'def fresh():\n    return 3\n',
  ];
  for (const source of snapshots) {
    const incremental = analyze(analyzer, source);
    const fresh = analyze(create(), source);
    expect(incremental).toEqual(fresh);
  }
  const edit = sourceEdit('a😀b', 'a😁b')!;
  expect(edit.startIndex).toBe(1);
  expect(edit.oldEndIndex).toBe(3);
  expect(edit.newEndIndex).toBe(3);
  expect(sourceEdit('same', 'same')).toBeUndefined();
});
