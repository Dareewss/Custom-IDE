import type { FileTree } from '../fs/vfs';
import type { CodeModel } from '../model/types';
import { WorkerClient } from '../workers/client';

const client = new WorkerClient<FileTree, CodeModel>(
  () => new Worker(new URL('../workers/analysis.worker.ts', import.meta.url), { type: 'module' }),
);
export const analyzePython = (files: FileTree): Promise<CodeModel> => client.call(files);
