import type { FileTree } from '../fs/vfs';
import type { Diagnostic } from '../language/adapter';
import type { TraceEvent, SourceLocation } from '../trace/events';
export type RunRequest = {
  type: 'run';
  tree: FileTree;
  entry: string;
  mailbox?: SharedArrayBuffer;
  breakpoints?: Record<string, number[]>;
};
export type RunnerMessage =
  | { type: 'trace'; event: TraceEvent }
  | { type: 'paused'; location: SourceLocation }
  | { type: 'diagnostic'; diagnostic: Diagnostic }
  | { type: 'input' }
  | { type: 'status'; status: 'loading' | 'running' }
  | { type: 'output'; stream: 'stdout' | 'stderr'; text: string }
  | { type: 'done'; exitCode: number; elapsed: number }
  | { type: 'error'; message: string };
