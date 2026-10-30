import { mkdir, readdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = resolve('node_modules/pyodide');
const target = resolve('public/runtime/pyodide');
await mkdir(target, { recursive: true });
for (const name of await readdir(source)) {
  if (/\.(m?js|wasm|zip|json)$/.test(name) && name !== 'package.json')
    await copyFile(resolve(source, name), resolve(target, name));
}
console.log('Self-hosted Python runtime prepared.');
