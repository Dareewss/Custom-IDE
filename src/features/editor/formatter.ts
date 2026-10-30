import { python } from '../../core/language/adapter';
import { WorkerClient } from '../../core/workers/client';
import { useWorkspace } from '../explorer/store';
import { useUI } from '../../shared/ui-store';

const formatter = new WorkerClient<string, string>(
  () =>
    new Worker(new URL('../../core/workers/formatter.worker.ts', import.meta.url), {
      type: 'module',
    }),
);
python.formatter = (content) => formatter.call(content);
export async function formatFile(path: string) {
  const node = useWorkspace.getState().tree[path];
  const { languageForPath } = await import('../../core/language/adapter');
  const service = languageForPath(path)?.formatter;
  if (node?.kind !== 'file' || !service) return;
  const formatted = await service(node.content);
  const current = useWorkspace.getState().tree[path];
  if (current?.kind === 'file' && current.content === node.content && formatted !== node.content)
    useWorkspace.getState().edit(path, formatted);
}
export async function formatActive() {
  const path = useWorkspace.getState().active;
  if (path)
    try {
      await formatFile(path);
    } catch (error) {
      useUI.getState().reportError(`Could not format document: ${String(error)}`);
    }
}
