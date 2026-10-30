import { describe, expect, it } from 'vitest';
import {
  childPaths,
  createNode,
  moveNode,
  normalizePath,
  removeNode,
  writeFile,
  type FileTree,
} from './vfs';

const tree: FileTree = {
  src: { kind: 'folder' },
  'src/main.py': { kind: 'file', content: 'print(1)' },
  'a.py': { kind: 'file', content: '' },
};
describe('virtual filesystem', () => {
  it('normalizes relative separators', () =>
    expect(normalizePath('./src\\main.py')).toBe('src/main.py'));
  it.each(['../secret', '/etc/passwd', 'C:\\secret', 'a\0b', 'a/../../b'])(
    'rejects unsafe path %s',
    (path) => expect(() => normalizePath(path)).toThrow(),
  );
  it('creates without mutating its input', () => {
    const next = createNode(tree, 'src/new.py', { kind: 'file', content: '' });
    expect(next['src/new.py']).toBeDefined();
    expect(tree['src/new.py']).toBeUndefined();
  });
  it('rejects duplicates and missing parents', () => {
    expect(() => createNode(tree, 'a.py', { kind: 'folder' })).toThrow();
    expect(() => createNode(tree, 'no/a', { kind: 'folder' })).toThrow();
  });
  it('moves a directory recursively', () => {
    const next = moveNode(tree, 'src', 'lib');
    expect(next['lib/main.py']).toEqual(tree['src/main.py']);
    expect(next.src).toBeUndefined();
  });
  it('rejects cycles and collisions', () => {
    expect(() => moveNode(tree, 'src', 'src/nested')).toThrow();
    expect(() => moveNode(tree, 'a.py', 'src')).toThrow();
  });
  it('deletes descendants only', () =>
    expect(Object.keys(removeNode(tree, 'src'))).toEqual(['a.py']));
  it('writes files only', () => {
    expect(writeFile(tree, 'a.py', 'x')['a.py']).toEqual({ kind: 'file', content: 'x' });
    expect(() => writeFile(tree, 'src', 'x')).toThrow();
  });
  it('sorts folders first', () => expect(childPaths(tree)).toEqual(['src', 'a.py']));
});
