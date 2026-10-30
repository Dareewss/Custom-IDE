import { rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, relative } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const output = resolve('desktop-out');
if (relative(process.cwd(), output) !== 'desktop-out')
  throw new Error('Invalid desktop output path');
await rm(output, { recursive: true, force: true });
execFileSync(
  process.execPath,
  [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.desktop.json'],
  {
    stdio: 'inherit',
  },
);
