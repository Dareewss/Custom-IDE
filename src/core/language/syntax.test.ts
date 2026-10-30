// @vitest-environment node
import { beforeAll, afterAll, expect, it } from 'vitest';
import { Parser, Language } from 'web-tree-sitter';
import { resolve } from 'node:path';
import { collectSyntaxErrors } from './syntax';

let parser: Parser;
beforeAll(async () => {
  await Parser.init({
    locateFile: () => resolve('node_modules/web-tree-sitter/web-tree-sitter.wasm'),
  });
  parser = new Parser();
  parser.setLanguage(
    await Language.load(resolve('node_modules/tree-sitter-python/tree-sitter-python.wasm')),
  );
});
afterAll(() => parser.delete());
it('detects malformed Python and clears valid code', () => {
  const broken = parser.parse('def broken(\n')!;
  expect(collectSyntaxErrors(broken.rootNode, 'main.py')).toEqual(
    expect.arrayContaining([expect.objectContaining({ path: 'main.py', line: 1 })]),
  );
  broken.delete();
  const valid = parser.parse('def square(x):\n    return x * x\n')!;
  expect(collectSyntaxErrors(valid.rootNode, 'main.py')).toEqual([]);
  valid.delete();
});
