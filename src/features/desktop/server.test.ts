// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serveDesktop } from '../../../desktop/server';

describe('desktop bundled-asset server', () => {
  it('isolates workers and serves only bundled files, rejecting traversal and other methods', async () => {
    const root = await mkdtemp(join(tmpdir(), 'atlas-server-'));
    if (!root.startsWith(join(tmpdir(), 'atlas-server-')))
      throw new Error('Unexpected test folder');
    await writeFile(join(root, 'index.html'), '<h1>Code Atlas</h1>');
    await writeFile(join(root, 'runtime.wasm'), new Uint8Array([0, 97, 115, 109]));
    await writeFile(join(root, 'runtime.mjs'), 'export const ready = true;');
    const { server, origin } = await serveDesktop(root, 0);
    try {
      const index = await fetch(origin);
      expect(await index.text()).toContain('Code Atlas');
      expect(index.headers.get('cross-origin-opener-policy')).toBe('same-origin');
      expect(index.headers.get('cross-origin-embedder-policy')).toBe('require-corp');
      expect(index.headers.get('content-security-policy')).toContain("object-src 'none'");
      const wasm = await fetch(`${origin}/runtime.wasm`, { method: 'HEAD' });
      expect(wasm.headers.get('content-type')).toBe('application/wasm');
      expect(await wasm.text()).toBe('');
      expect((await fetch(`${origin}/runtime.mjs`)).headers.get('content-type')).toBe(
        'text/javascript; charset=utf-8',
      );
      expect((await fetch(`${origin}/..%2f..%2fpackage.json`)).status).toBe(403);
      expect((await fetch(`${origin}/missing.js`)).status).toBe(404);
      expect((await fetch(`${origin}/%00index.html`)).status).toBe(400);
      expect((await fetch(origin, { method: 'POST', body: 'ignored' })).status).toBe(405);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((done, reject) =>
        server.close((error) => (error ? reject(error) : done())),
      );
      await rm(root, { recursive: true, force: true });
    }
  });
});
