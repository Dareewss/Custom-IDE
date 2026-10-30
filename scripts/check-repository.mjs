import { execFileSync } from 'node:child_process';

const staged = process.argv.includes('--staged');
const args = staged
  ? ['diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z']
  : ['ls-files', '-z'];
const markdown = execFileSync('git', args, { encoding: 'utf8' })
  .split('\0')
  .filter((file) => /\.md$/i.test(file));
if (markdown.length) {
  console.error(
    `Project policy: Markdown must stay local, never committed/pushed.\n${markdown.join('\n')}`,
  );
  process.exitCode = 1;
}
