import { readFile, readdir } from 'node:fs/promises';
import { test, expect } from '@playwright/test';
import type { CodeModel } from '../src/core/model/types';

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
