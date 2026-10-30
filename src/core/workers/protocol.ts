import type { FileTree } from '../fs/vfs';
export type RunRequest = { type: 'run'; tree: FileTree; entry: string };
export type RunnerMessage =
  | { type: 'status'; status: 'loading' | 'running' }
  | { type: 'output'; stream: 'stdout' | 'stderr'; text: string }
  | { type: 'done'; exitCode: number; elapsed: number }
  | { type: 'error'; message: string };
