import { execFileSync } from 'node:child_process';

const staged = process.argv.includes('--staged');
const args = staged
  ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
  : ['ls-files', '-z'];
const documents = execFileSync('git', args, { encoding: 'utf8' })
  .split('\0')
  .filter(
    (file) =>
      file !== 'README.md' &&
      (/\.(md|txt|text|rst|log)$/i.test(file) ||
        /(^|\/)(README|AGENTS|DECISIONS|PROGRESS|ROADMAP|TASKS)$/i.test(file)),
  );
if (documents.length) {
  console.error(
    `Project policy: only the short root README.md may be published; other documentation and text notes stay local.\n${documents.join('\n')}`,
  );
  process.exitCode = 1;
}
