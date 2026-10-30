import type { FileTree } from '../fs/vfs';
import type { Diagnostic } from '../language/adapter';
export type RunRequest = {
  type: 'run';
  tree: FileTree;
  entry: string;
  mailbox?: SharedArrayBuffer;
};
export type RunnerMessage =
  | { type: 'diagnostic'; diagnostic: Diagnostic }
  | { type: 'input' }
  | { type: 'status'; status: 'loading' | 'running' }
  | { type: 'output'; stream: 'stdout' | 'stderr'; text: string }
  | { type: 'done'; exitCode: number; elapsed: number }
  | { type: 'error'; message: string };
