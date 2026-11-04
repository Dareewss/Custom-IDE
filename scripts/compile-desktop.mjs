import { rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, relative, join } from 'node:path';
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
if (process.platform === 'win32') {
  const compiler = join(
    process.env.WINDIR || 'C:\\Windows',
    'Microsoft.NET',
    'Framework64',
    'v4.0.30319',
    'csc.exe',
  );
  execFileSync(
    compiler,
    [
      '/nologo',
      '/target:exe',
      '/platform:x64',
      '/optimize+',
      `/out:${join(output, 'native-blur.exe')}`,
      resolve('desktop/native/DesktopBlur.cs'),
    ],
    { stdio: 'inherit', windowsHide: true },
  );
}
