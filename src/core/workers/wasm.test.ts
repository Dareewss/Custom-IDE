import { afterEach, expect, it, vi } from 'vitest';
import { loadWasm } from './wasm';

afterEach(() => vi.unstubAllGlobals());
it('passes actual WebAssembly bytes through unchanged', async () => {
  const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(bytes)));
  expect(new Uint8Array(await loadWasm('/test.wasm'))).toEqual(bytes);
});
it('rejects failed HTTP responses before they reach the compiler', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('This tool has not been cached yet.', { status: 503 })),
  );
  await expect(loadWasm('/test.wasm')).rejects.toThrow('Runtime file unavailable (503)');
});
it('rejects text or truncated data masquerading as a successful binary response', async () => {
  for (const data of ['This is a text response', '<html>Not found</html>', '']) {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(data)));
    await expect(loadWasm('/test.wasm')).rejects.toThrow('Invalid WebAssembly response');
  }
});
