import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [task, message] = process.argv.slice(2);
if (!task || !message) throw new Error('Usage: node scripts/finish-task.mjs T0 "message"');
const run = (command, args, capture = false) =>
  execFileSync(command, args, {
    stdio: capture ? 'pipe' : 'inherit',
    encoding: 'utf8',
    shell: process.platform === 'win32' && command === 'npm',
  });
const taskPath = 'docs/TASKS.md';
const tasks = readFileSync(taskPath, 'utf8');
if (!tasks.includes(`## [ ] ${task} —`)) throw new Error('Task missing or already complete');
writeFileSync(taskPath, tasks.replace(`## [ ] ${task} —`, `## [x] ${task} —`));
const progressPath = 'docs/PROGRESS.md';
const last = run('git', ['rev-parse', '--short', 'HEAD'], true).trim();
let progress = readFileSync(progressPath, 'utf8').replaceAll('COMPLETING_COMMIT', last);
progress += `| 2026-10-30 | ${task} | COMPLETING_COMMIT | ${message}; lint, typecheck, tests and build passed. |\n`;
writeFileSync(progressPath, progress);
run('npm', ['run', 'format']);
try {
  run('npm', ['run', 'check']);
} catch (error) {
  writeFileSync(taskPath, tasks);
  throw error;
}
run('git', ['add', '-A']);
run('git', ['commit', '-m', message]);
const remotes = run('git', ['remote'], true).trim();
if (remotes) run('git', ['push', '-u', 'origin', 'main']);
else process.stdout.write('Local commit retained: awaiting requested GitHub remote URL.\n');
