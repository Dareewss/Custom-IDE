import { packager } from '@electron/packager';
import { cp, mkdir, writeFile, rm, access } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const output = resolve(process.env.CODE_ATLAS_PACKAGE_OUTPUT || 'release');
const withinRelease = relative(resolve('release'), output);
if (withinRelease.startsWith('..') || isAbsolute(withinRelease))
  throw new Error('Package output must stay inside release.');
await access(resolve('desktop-out/native-blur.exe'));
if (process.env.CODE_ATLAS_PACKAGE_OUTPUT) await mkdir(output);
const stage = resolve('release/staging');
if (relative(resolve('release'), stage) !== 'staging') throw new Error('Invalid staging path');
await rm(stage, { recursive: true, force: true });
await mkdir(stage, { recursive: true });
await cp('dist', `${stage}/dist`, { recursive: true });
await cp('desktop-out', `${stage}/desktop`, { recursive: true });
await writeFile(
  `${stage}/package.json`,
  JSON.stringify(
    {
      name: 'code-atlas-desktop',
      type: 'module',
      productName: 'Code Atlas',
      version: '0.1.0',
      main: 'desktop/main.cjs',
      author: 'Code Atlas',
    },
    null,
    2,
  ),
);
const paths = await packager({
  dir: stage,
  out: output,
  name: 'Code Atlas',
  executableName: 'Code Atlas',
  platform: 'win32',
  arch: 'x64',
  electronVersion: require('electron/package.json').version,
  ...(process.env.CODE_ATLAS_ELECTRON_ZIP_DIR
    ? { electronZipDir: resolve(process.env.CODE_ATLAS_ELECTRON_ZIP_DIR) }
    : {}),
  icon: resolve('public/icons/atlas.ico'),
  overwrite: !process.env.CODE_ATLAS_PACKAGE_OUTPUT,
  asar: { unpack: '**/native-blur.exe' },
  prune: false,
  windowsMetadata: { ProductName: 'Code Atlas', FileDescription: 'Code Atlas Python workspace' },
});
console.log(`Desktop app ready: ${paths.join(', ')}`);
