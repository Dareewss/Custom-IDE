import { create } from 'zustand';
import { python, type Diagnostic } from '../../core/language/adapter';
import { WorkerClient } from '../../core/workers/client';

export const useDiagnostics = create<{
  syntax: Record<string, Diagnostic[]>;
  runtime: Diagnostic[];
}>(() => ({ syntax: {}, runtime: [] }));
const syntax = new WorkerClient<{ path: string; content: string }, Diagnostic[]>(
  () =>
    new Worker(new URL('../../core/workers/syntax.worker.ts', import.meta.url), { type: 'module' }),
);
python.diagnostics = (path, content) => syntax.call({ path, content });
