import type { FileTree } from '../../src/core/fs/vfs';

/** Deterministic real-source benchmark: no fabricated analyzer nodes. */
export function layeredProject(files = 100, functions = 8): FileTree {
  const tree: FileTree = {};
  for (let file = 0; file < files; file++) {
    const name = (index: number) => `module_${String(index).padStart(3, '0')}`;
    const lines = [`import ${name((file + 1) % files)}`, ''];
    for (let fn = 0; fn < functions; fn++)
      lines.push(
        `def calculate_${fn}(value):`,
        '    values = [value, value + 1]',
        '    total = 0',
        '    for item in values:',
        '        if item > 0:',
        '            total += item',
        '    return total',
        '',
      );
    tree[`${name(file)}.py`] = { kind: 'file', content: lines.join('\n') };
  }
  return tree;
}
