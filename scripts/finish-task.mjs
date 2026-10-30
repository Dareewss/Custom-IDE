import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const [task, message] = process.argv.slice(2);
const date = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Bucharest',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());
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
const originalProgress = readFileSync(progressPath, 'utf8');
let progress = originalProgress.replaceAll('COMPLETING_COMMIT', last);
progress += `| ${date} | ${task} | COMPLETING_COMMIT | ${message}; lint, typecheck, tests and build passed. |\n`;
writeFileSync(progressPath, progress);
run('npm', ['run', 'format'], true);
try {
  const checks = run('npm', ['run', 'check'], true);
  process.stdout.write(checks.slice(-1200));
  if (task === 'T20') {
    const browserChecks = run('npm', ['run', 'test:e2e'], true);
    process.stdout.write(browserChecks.slice(-1600));
  }
} catch (error) {
  if (error.stdout) process.stderr.write(error.stdout);
  if (error.stderr) process.stderr.write(error.stderr);
  writeFileSync(taskPath, tasks);
  writeFileSync(progressPath, originalProgress);
  process.exit(1);
}
run('git', ['add', '-A']);
run('git', ['commit', '-m', message]);
const remotes = run('git', ['remote'], true).trim();
if (remotes) run('git', ['push', '-u', 'origin', 'main']);
else process.stdout.write('Local commit retained: awaiting requested GitHub remote URL.\n');
