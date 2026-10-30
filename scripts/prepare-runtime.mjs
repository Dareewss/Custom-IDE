import { mkdir, readdir, copyFile, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

const source = resolve('node_modules/pyodide');
const target = resolve('public/runtime/pyodide');
await mkdir(target, { recursive: true });
for (const name of await readdir(source)) {
  if (/\.(m?js|wasm|zip|json)$/.test(name) && name !== 'package.json')
    await copyFile(resolve(source, name), resolve(target, name));
}
console.log('Self-hosted Python runtime prepared.');
const wheels = JSON.parse(await readFile('scripts/python-packages.json', 'utf8'));
const wheelTarget = resolve('public/runtime/wheels');
await mkdir(wheelTarget, { recursive: true });
for (const wheel of wheels) {
  const path = resolve(wheelTarget, wheel.file);
  const hash = (data) => createHash('sha256').update(data).digest('hex');
  let cached;
  try {
    cached = await readFile(path);
  } catch {
    cached = null;
  }
  if (cached && hash(cached) === wheel.sha256) continue;
  const response = await fetch(wheel.url);
  if (!response.ok) throw new Error(`Could not download ${wheel.name}: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (hash(bytes) !== wheel.sha256) throw new Error(`Integrity check failed for ${wheel.name}`);
  await writeFile(path, bytes);
}
await writeFile(
  resolve(wheelTarget, 'manifest.json'),
  JSON.stringify(wheels.map(({ file }) => file)),
);
console.log('Verified local Jedi and Parso wheels prepared.');
