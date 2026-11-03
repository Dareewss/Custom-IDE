import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { relative, resolve } from 'node:path';
import type { Plugin } from 'vite';

export function appWorkerPlugin(): Plugin {
  return {
    name: 'atlas-offline-application',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      const template = await readFile('src/core/app/service-worker.js', 'utf8');
      const runtimeFiles = (
        await readdir('public/runtime', { recursive: true, withFileTypes: true })
      )
        .filter((entry) => entry.isFile())
        .map((entry) => resolve(entry.parentPath, entry.name))
        .sort();
      const resources = [
        '/',
        '/index.html',
        '/manifest.webmanifest',
        '/icons/atlas.svg',
        '/icons/atlas-192.png',
        '/icons/atlas-512.png',
        ...Object.keys(bundle)
          .filter((name) => /\.(js|css|ttf|wasm)$/.test(name))
          .sort()
          .map((name) => `/${name}`),
        ...runtimeFiles.map(
          (file) => `/${relative(resolve('public'), file).replaceAll('\\', '/')}`,
        ),
      ];
      const hash = createHash('sha256').update(JSON.stringify(resources)).update(template);
      for (const file of runtimeFiles) hash.update(await readFile(file));
      const version = hash.digest('hex').slice(0, 16);
      if (!template.includes('const SHELL = [];'))
        throw new Error('Service worker shell insertion point is missing.');
      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: template
          .replace('__ATLAS_VERSION__', version)
          .replace('const SHELL = [];', `const SHELL = ${JSON.stringify(resources)};`),
      });
    },
  };
}
