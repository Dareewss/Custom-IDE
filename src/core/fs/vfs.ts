export type VNode = { kind: 'file'; content: string } | { kind: 'folder' };
export type FileTree = Record<string, VNode>;

export function normalizePath(path: string): string {
  const value = path.replaceAll('\\', '/');
  if (value.startsWith('/') || /^[a-z]:/i.test(value) || value.includes('\0'))
    throw new Error('Use a relative project path.');
  const parts = value.split('/').filter((part) => part && part !== '.');
  if (
    parts.some(
      (part) =>
        part === '..' || /[<>:"|?*]/.test(part) || [...part].some((c) => c.charCodeAt(0) < 32),
    )
  )
    throw new Error('Invalid project path.');
  return parts.join('/');
}
export const basename = (path: string) => path.split('/').at(-1) ?? '';
export const dirname = (path: string) => path.split('/').slice(0, -1).join('/');
export const isWithin = (path: string, parent: string) =>
  !parent || path === parent || path.startsWith(`${parent}/`);

export function createNode(tree: FileTree, input: string, node: VNode): FileTree {
  const path = normalizePath(input);
  if (!path) throw new Error('A name is required.');
  if (tree[path]) throw new Error('A file or folder with this name already exists.');
  const parent = dirname(path);
  if (parent && tree[parent]?.kind !== 'folder') throw new Error('Parent folder does not exist.');
  return { ...tree, [path]: node };
}

export function removeNode(tree: FileTree, input: string): FileTree {
  const path = normalizePath(input);
  if (!path || !tree[path]) throw new Error('File or folder does not exist.');
  return Object.fromEntries(Object.entries(tree).filter(([key]) => !isWithin(key, path)));
}

export function moveNode(tree: FileTree, source: string, destination: string): FileTree {
  const from = normalizePath(source);
  const to = normalizePath(destination);
  if (from === to) return tree;
  if (!from || !tree[from]) throw new Error('Source does not exist.');
  if (!to || tree[to]) throw new Error('Destination already exists or is empty.');
  if (isWithin(to, from)) throw new Error('Cannot move a folder inside itself.');
  const parent = dirname(to);
  if (parent && tree[parent]?.kind !== 'folder')
    throw new Error('Destination folder does not exist.');
  const next = removeNode(tree, from);
  for (const [key, node] of Object.entries(tree)) {
    if (isWithin(key, from)) next[to + key.slice(from.length)] = node;
  }
  return next;
}

export function writeFile(tree: FileTree, path: string, content: string): FileTree {
  if (tree[path]?.kind !== 'file') throw new Error('File does not exist.');
  return { ...tree, [path]: { kind: 'file', content } };
}

export function childPaths(tree: FileTree, parent = ''): string[] {
  return Object.keys(tree)
    .filter((key) => dirname(key) === parent)
    .sort((a, b) => {
      const folderOrder = Number(tree[b].kind === 'folder') - Number(tree[a].kind === 'folder');
      return folderOrder || a.localeCompare(b);
    });
}
