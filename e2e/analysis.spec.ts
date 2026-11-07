import { readFile, readdir } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { test, expect } from '@playwright/test';
import type { CodeModel } from '../src/core/model/types';
import type { FileTree } from '../src/core/fs/vfs';

test('analyzes actual Python in the bundled incremental worker and recovers after errors', async ({
  page,
}) => {
  const source = await readFile('tests/fixtures/python/constructs.py', 'utf8');
  const partial = await readFile('tests/fixtures/python/partial.py', 'utf8');
  const asset = (await readdir('dist/assets')).find((name) =>
    /^analysis\.worker-.*\.js$/.test(name),
  );
  expect(asset).toBeTruthy();
  await page.goto('/');
  const result = await page.evaluate(
    async ({ asset, source, partial }) => {
      const worker = new Worker(`/assets/${asset}`, { type: 'module' });
      let id = 0;
      const request = (content: string, path = 'main.py') =>
        new Promise<{ result?: CodeModel; error?: string }>((resolve, reject) => {
          const requestId = ++id;
          worker.onmessage = (event) => {
            if (event.data.id === requestId) resolve(event.data);
          };
          worker.onerror = (event) => reject(new Error(event.message));
          worker.postMessage({ id: requestId, request: { [path]: { kind: 'file', content } } });
        });
      try {
        const first = await request(source);
        const shifted = await request('\n' + source);
        const broken = await request(partial);
        const invalid = await request('value = 1', '../outside.py');
        const recovered = await request(source);
        return { first, shifted, broken, invalid, recovered };
      } finally {
        worker.terminate();
      }
    },
    { asset, source, partial },
  );
  expect(result.first.error).toBeUndefined();
  expect(result.first.result?.issues).toEqual([]);
  const first = result.first.result!.nodes.find((node) => node.name === 'Counter')!;
  const shifted = result.shifted.result!.nodes.find((node) => node.name === 'Counter')!;
  expect(shifted.id).toBe(first.id);
  expect(shifted.range!.startLine).toBe(first.range!.startLine + 1);
  expect(result.broken.result!.issues.length).toBeGreaterThan(0);
  expect(result.broken.result!.nodes.some((node) => node.name === 'Recoverable')).toBe(true);
  expect(result.invalid.error).toContain('Invalid project path');
  expect(result.recovered.result).toEqual(result.first.result);
});

test('builds real cross-file call and inheritance edges inside the bundled worker', async ({
  page,
}) => {
  const root = resolve('tests/fixtures/python/graph');
  const tree: FileTree = {};
  for (const entry of await readdir(root, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const path = resolve(entry.parentPath, entry.name);
    tree[relative(root, path).replaceAll('\\', '/')] = {
      kind: 'file',
      content: await readFile(path, 'utf8'),
    };
  }
  const asset = (await readdir('dist/assets')).find((name) =>
    /^analysis\.worker-.*\.js$/.test(name),
  );
  await page.goto('/');
  const model = await page.evaluate(
    ({ asset, tree }) =>
      new Promise<CodeModel>((resolve, reject) => {
        const worker = new Worker(`/assets/${asset}`, { type: 'module' });
        worker.onerror = (event) => {
          worker.terminate();
          reject(new Error(event.message));
        };
        worker.onmessage = (event) => {
          worker.terminate();
          if (event.data.error) reject(new Error(event.data.error));
          else resolve(event.data.result);
        };
        worker.postMessage({ id: 1, request: tree });
      }),
    { asset, tree },
  );
  const run = model.nodes.find((node) => node.name === 'run')!;
  const calls = model.edges.filter((edge) => edge.kind === 'call' && edge.from === run.id);
  expect(calls.filter((edge) => edge.resolved)).toHaveLength(7);
  expect(calls.filter((edge) => !edge.resolved)).toHaveLength(4);
  expect(model.edges.some((edge) => edge.kind === 'inherits' && edge.resolved)).toBe(true);
  expect(model.edges.some((edge) => edge.kind === 'import' && edge.resolved)).toBe(true);
  expect(
    model.nodes.filter((node) => node.kind === 'external').every((node) => node.range === null),
  ).toBe(true);
});
