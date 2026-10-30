import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, relative, resolve, isAbsolute } from 'node:path';

const mime: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webmanifest': 'application/manifest+json',
};

// A stable loopback origin preserves IndexedDB and enables SharedArrayBuffer.
// Only the bundled build is exposed; no project files or host filesystem API.
export async function serveDesktop(root: string, port: number) {
  let origin = '';
  const server = createServer((request, response) => {
    response.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    response.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; media-src 'self' blob:; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'",
    );
    void (async () => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405).end();
        return;
      }
      const url = new URL(request.url ?? '/', origin);
      if (request.headers.host !== new URL(origin).host || url.origin !== origin) {
        response.writeHead(403).end();
        return;
      }
      const path = decodeURIComponent(url.pathname);
      if (path.includes('\\') || path.includes('\0')) {
        response.writeHead(400).end();
        return;
      }
      const file = resolve(root, path === '/' ? 'index.html' : `.${path}`);
      const within = relative(root, file);
      if (within.startsWith('..') || isAbsolute(within)) {
        response.writeHead(403).end();
        return;
      }
      const info = await stat(file).catch(() => null);
      if (!info?.isFile()) {
        response.writeHead(404).end();
        return;
      }
      response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
      response.setHeader('Content-Length', info.size);
      if (request.method === 'HEAD') response.end();
      else
        createReadStream(file)
          .on('error', () => response.destroy())
          .pipe(response);
    })().catch(() => {
      if (!response.headersSent) response.writeHead(400).end();
      else response.destroy();
    });
  });
  await new Promise<void>((accept, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      server.off('error', reject);
      accept();
    });
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Desktop server did not bind');
  origin = `http://127.0.0.1:${address.port}`;
  return { origin, server };
}
