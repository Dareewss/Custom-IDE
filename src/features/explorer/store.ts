import { create } from 'zustand';
import {
  createNode,
  isWithin,
  moveNode,
  removeNode,
  writeFile,
  type FileTree,
  type VNode,
} from '../../core/fs/vfs';

export interface WorkspaceState {
  projectId: string;
  projectName: string;
  tree: FileTree;
  active: string | null;
  tabs: string[];
  dirty: string[];
  open: (path: string) => void;
  close: (path: string) => void;
  reorder: (from: string, to: string) => void;
  create: (path: string, node: VNode) => void;
  move: (from: string, to: string) => void;
  remove: (path: string) => void;
  edit: (path: string, content: string) => void;
}
export const useWorkspace = create<WorkspaceState>((set) => ({
  projectId: 'first-steps',
  projectName: 'First steps',
  tree: {
    'main.py': {
      kind: 'file',
      content: '# Welcome to Code Atlas. Make something yours.\n\nprint("Hello, world!")\n',
    },
  },
  active: null,
  tabs: [],
  dirty: [],
  open: (path) =>
    set((s) =>
      s.tree[path]?.kind === 'file'
        ? { active: path, tabs: s.tabs.includes(path) ? s.tabs : [...s.tabs, path] }
        : {},
    ),
  close: (path) =>
    set((s) => {
      const tabs = s.tabs.filter((p) => p !== path);
      return {
        tabs,
        active:
          s.active === path ? (tabs[Math.max(0, s.tabs.indexOf(path) - 1)] ?? null) : s.active,
      };
    }),
  reorder: (from, to) =>
    set((s) => {
      const tabs = s.tabs.filter((p) => p !== from);
      tabs.splice(s.tabs.indexOf(to), 0, from);
      return { tabs };
    }),
  create: (path, node) => set((s) => ({ tree: createNode(s.tree, path, node) })),
  move: (from, to) =>
    set((s) => {
      const tree = moveNode(s.tree, from, to);
      const remap = (path: string) => (isWithin(path, from) ? to + path.slice(from.length) : path);
      return {
        tree,
        tabs: s.tabs.map(remap),
        dirty: s.dirty.map(remap),
        active: s.active ? remap(s.active) : null,
      };
    }),
  remove: (path) =>
    set((s) => ({
      tree: removeNode(s.tree, path),
      tabs: s.tabs.filter((p) => !isWithin(p, path)),
      dirty: s.dirty.filter((p) => !isWithin(p, path)),
      active: s.active && isWithin(s.active, path) ? null : s.active,
    })),
  edit: (path, content) =>
    set((s) => ({
      tree: writeFile(s.tree, path, content),
      dirty: s.dirty.includes(path) ? s.dirty : [...s.dirty, path],
    })),
}));
