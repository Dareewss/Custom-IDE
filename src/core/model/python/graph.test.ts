// @vitest-environment node
import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { Parser, Language } from 'web-tree-sitter';
import { afterEach, beforeAll, expect, it } from 'vitest';
import { IncrementalPythonAnalyzer } from './incremental';
import { buildModelIndexes } from '../indexes';
import type { CodeModel, CodeEdge } from '../types';
import type { FileTree } from '../../fs/vfs';

let language: Language;
let project: FileTree;
const analyzers: IncrementalPythonAnalyzer[] = [];
beforeAll(async () => {
  await Parser.init({
    wasmBinary: await readFile(resolve('node_modules/web-tree-sitter/web-tree-sitter.wasm')),
  });
  language = await Language.load(
    resolve('node_modules/tree-sitter-python/tree-sitter-python.wasm'),
  );
  const root = resolve('tests/fixtures/python/graph');
  const entries = await readdir(root, { recursive: true, withFileTypes: true });
  project = {};
  for (const entry of entries.filter((entry) => entry.isFile())) {
    const file = resolve(entry.parentPath, entry.name);
    project[relative(root, file).replaceAll('\\', '/')] = {
      kind: 'file',
      content: await readFile(file, 'utf8'),
    };
  }
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
const content = (value: string) => ({ kind: 'file' as const, content: value });
const target = (model: CodeModel, edge: CodeEdge) => model.nodes.find((n) => n.id === edge.to)!;
const callsFrom = (model: CodeModel, name: string) => {
  const id = model.nodes.find((node) => node.name === name && node.kind !== 'external')!.id;
  return model.edges.filter((edge) => edge.kind === 'call' && edge.from === id);
};

it('resolves project modules, relative imports, aliases, re-exports and circular imports', () => {
  const model = create().analyze(project);
  const calls = callsFrom(model, 'run');
  const resolved = calls.filter((edge) => edge.resolved).map((edge) => target(model, edge).name);
  expect(resolved).toEqual(['helper', 'inherited', 'add', 'add', 'add', 'add', 'factory']);
  expect(calls.filter((edge) => !edge.resolved).map((edge) => target(model, edge).name)).toEqual([
    'values',
    'std.sqrt',
    'unknown',
    'factory().method',
  ]);
  const imports = model.edges.filter((edge) => edge.kind === 'import' && edge.resolved);
  expect(imports.map((edge) => target(model, edge).fileId)).toEqual(
    expect.arrayContaining([
      'pkg/maths.py',
      'pkg/__init__.py',
      'pkg/base.py',
      'pkg/cycle_a.py',
      'pkg/cycle_b.py',
    ]),
  );
  expect(
    callsFrom(model, 'a').some((edge) => edge.resolved && target(model, edge).name === 'b'),
  ).toBe(true);
  expect(
    callsFrom(model, 'b').some((edge) => edge.resolved && target(model, edge).name === 'a'),
  ).toBe(true);
  expect(() => buildModelIndexes(model)).not.toThrow();
});

it('represents inheritance and self-method calls while retaining external uncertainty', () => {
  const model = create().analyze(project);
  const child = model.nodes.find((n) => n.name === 'Child')!;
  const inherited = model.edges.find((edge) => edge.kind === 'inherits' && edge.from === child.id)!;
  expect(inherited.resolved).toBe(true);
  expect(target(model, inherited).name).toBe('Base');
  for (const edge of model.edges) {
    expect(edge.confidence).toBeGreaterThanOrEqual(0);
    expect(edge.confidence).toBeLessThanOrEqual(1);
    if (!edge.resolved) {
      expect(target(model, edge).kind).toBe('external');
      expect(edge.confidence).toBe(0);
      expect(target(model, edge).range).toBeNull();
    }
  }
  expect(
    model.edges.some(
      (edge) => edge.kind === 'import' && !edge.resolved && target(model, edge).name === 'math',
    ),
  ).toBe(true);
});

it('respects lexical functions and parameter/local shadowing, including class scope rules', () => {
  const model = create().analyze({
    'main.py': content(
      `def named():\n    pass\ndef parameter(named):\n    named()\ndef shadow():\n    named()\n    named = 3\n    named()\nclass Example:\n    def helper(self):\n        pass\n    def method(self):\n        helper()\n        self.helper()\n        self = other\n        self.helper()\n`,
    ),
  });
  expect(callsFrom(model, 'parameter').every((edge) => !edge.resolved)).toBe(true);
  expect(callsFrom(model, 'shadow').every((edge) => !edge.resolved)).toBe(true);
  expect(callsFrom(model, 'method').map((edge) => edge.resolved)).toEqual([false, true, false]);
  const nested = create().analyze(project);
  expect(
    callsFrom(nested, 'outer').map((edge) => [target(nested, edge).name, edge.resolved]),
  ).toEqual([
    ['callback', false],
    ['local', true],
    ['global_fn', true],
  ]);
});

it('does not guess dynamic receivers, wildcard names, ambiguous modules or conflicting bases', () => {
  const model = create().analyze({
    'main.py': content(
      'import ambiguous as module\nfrom helpers import *\nmodule.work()\nwork()\nclass A:\n    def same(self): pass\nclass B:\n    def same(self): pass\nclass C(A, B):\n    def run(self): self.same()\n',
    ),
    'ambiguous.py': content('def work(): pass\n'),
    'ambiguous/__init__.py': content('def work(): pass\n'),
    'helpers.py': content('def work(): pass\n'),
  });
  expect(model.edges.filter((edge) => edge.kind === 'call').every((edge) => !edge.resolved)).toBe(
    true,
  );
  expect(() => buildModelIndexes(model)).not.toThrow();
});

it('re-resolves dependents when an imported file changes without changing surviving node IDs', () => {
  const analyzer = create();
  const first = analyzer.analyze(project);
  const changed = {
    ...project,
    'pkg/maths.py': content('def renamed(left, right):\n    return left + right\n'),
  };
  const second = analyzer.analyze(changed);
  expect(second.nodes.find((n) => n.name === 'run')!.id).toBe(
    first.nodes.find((n) => n.name === 'run')!.id,
  );
  expect(
    callsFrom(second, 'run').some((edge) => target(second, edge).name === 'plus' && !edge.resolved),
  ).toBe(true);
  expect(analyzer.stats.reused).toBe(Object.keys(project).length - 1);
  expect(() => buildModelIndexes(second)).not.toThrow();
});

it('retains source callsites and stable repeated-edge identities across line-only edits', () => {
  const analyzer = create();
  const source = 'def f(): pass\ndef g():\n    f()\n    f()\n';
  const first = analyzer.analyze({ 'main.py': content(source) });
  const second = analyzer.analyze({ 'main.py': content('\n' + source) });
  expect(callsFrom(first, 'g').map((edge) => edge.id)).toEqual(
    callsFrom(second, 'g').map((edge) => edge.id),
  );
  expect(new Set(first.edges.map((edge) => edge.id)).size).toBe(first.edges.length);
  expect(callsFrom(second, 'g')[0].source!.range.startLine).toBe(
    callsFrom(first, 'g')[0].source!.range.startLine + 1,
  );
});

it('keeps wildcard overrides and explicit module mutations uncertain', () => {
  const model = create().analyze({
    'main.py': content(
      'def work(): pass\nfrom helpers import *\nwork()\nimport helpers as tools\ntools.work = 3\ntools.work()\n',
    ),
    'helpers.py': content('def work(): pass\n'),
  });
  expect(model.edges.filter((edge) => edge.kind === 'call').every((edge) => !edge.resolved)).toBe(
    true,
  );
});

it('does not treat an immediately evaluated module comprehension as a deferred function body', () => {
  const model = create().analyze({
    'main.py': content('items = [later() for n in range(2)]\ndef later(): return 1\n'),
  });
  expect(model.edges.filter((edge) => edge.kind === 'call').every((edge) => !edge.resolved)).toBe(
    true,
  );
});
