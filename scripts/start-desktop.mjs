import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import electron from 'electron';

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(electron, [resolve('desktop-out/main.cjs')], { stdio: 'inherit', env });
child.on('error', (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});
