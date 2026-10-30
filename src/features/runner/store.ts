import { create } from 'zustand';
import type { RunnerMessage } from '../../core/workers/protocol';
import { useWorkspace } from '../explorer/store';
import { useUI } from '../../shared/ui-store';
import { languageForPath, python } from '../../core/language/adapter';
import { createMailbox, writeMailbox } from '../../core/workers/mailbox';

export interface OutputEntry {
  id: number;
  stream: 'stdout' | 'stderr' | 'system' | 'input';
  text: string;
}
interface RunState {
  awaitingInput: boolean;
  status: 'idle' | 'loading' | 'running' | 'finished' | 'error';
  output: OutputEntry[];
  exitCode: number | null;
  elapsed: number;
}
export const useRunner = create<RunState>(() => ({
  awaitingInput: false,
  status: 'idle',
  output: [],
  exitCode: null,
  elapsed: 0,
}));
let worker: Worker | undefined;
let mailbox: SharedArrayBuffer | undefined;
export function submitInput(text: string) {
  if (!mailbox || !useRunner.getState().awaitingInput) return;
  try {
    writeMailbox(mailbox, text);
    appendOutput('input', `${text}\n`);
    useRunner.setState({ awaitingInput: false });
  } catch (error) {
    useUI.getState().reportError(error);
  }
}
let outputId = 0;
export function appendOutput(stream: OutputEntry['stream'], text: string) {
  useRunner.setState((s) => ({
    output: [...s.output.slice(-4999), { id: outputId++, stream, text }],
  }));
}
python.runner = async (entry, tree) => {
  worker?.terminate();
  useRunner.setState({ status: 'loading', exitCode: null, elapsed: 0, output: [] });
  mailbox =
    typeof SharedArrayBuffer !== 'undefined' && globalThis.crossOriginIsolated
      ? createMailbox()
      : undefined;
  useRunner.setState({ awaitingInput: false });
  useUI.getState().setPanel('Console');
  worker = new Worker(new URL('../../core/workers/python.worker.ts', import.meta.url), {
    type: 'module',
  });
  appendOutput('system', `Running ${entry}\n`);
  return new Promise<void>((resolve) => {
    worker!.onmessage = (event: MessageEvent<RunnerMessage>) => {
      const message = event.data;
      if (message.type === 'input') useRunner.setState({ awaitingInput: true });
      if (message.type === 'status') useRunner.setState({ status: message.status });
      if (message.type === 'output') appendOutput(message.stream, message.text);
      if (message.type === 'done') {
        useRunner.setState({
          status: message.exitCode === 0 ? 'finished' : 'error',
          exitCode: message.exitCode,
          elapsed: message.elapsed,
        });
        resolve();
      }
      if (message.type === 'error') {
        appendOutput('stderr', `${message.message}\n`);
        useRunner.setState({ status: 'error', exitCode: 1 });
        resolve();
      }
    };
    worker!.onerror = (event) => {
      appendOutput('stderr', `${event.message}\n`);
      useRunner.setState({ status: 'error', exitCode: 1 });
      resolve();
    };
    worker!.postMessage({ type: 'run', tree, entry, mailbox });
  });
};
export async function runActive() {
  const { active, tree } = useWorkspace.getState();
  if (!active) return;
  const adapter = languageForPath(active);
  if (!adapter?.runner) {
    useUI.getState().reportError('No runtime is available for this file type.');
    return;
  }
  await adapter.runner(active, tree);
}
