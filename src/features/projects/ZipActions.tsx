import { useRef, useState } from 'react';
import { Upload, Download } from 'lucide-react';
import { WorkerClient } from '../../core/workers/client';
import type { ZipRequest, ZipResponse } from '../../core/workers/zip.worker';
import { useWorkspace } from '../explorer/store';
import { createProject } from './actions';
import { useUI } from '../../shared/ui-store';
import { persistCurrent } from './persistence';

const client = new WorkerClient<ZipRequest, ZipResponse>(
  () =>
    new Worker(new URL('../../core/workers/zip.worker.ts', import.meta.url), { type: 'module' }),
);
export async function exportProject() {
  await persistCurrent();
  const s = useWorkspace.getState();
  const result = await client.call({ type: 'export', tree: s.tree });
  if (result.type !== 'export') throw new Error('Invalid ZIP response.');
  const url = URL.createObjectURL(new Blob([result.bytes], { type: 'application/zip' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `${s.projectName.replaceAll(/[^a-z0-9_-]/gi, '-')}.zip`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ZipActions() {
  const field = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        type="file"
        accept=".zip,application/zip"
        ref={field}
        hidden
        aria-label="Import ZIP file"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setBusy(true);
          void (async () => {
            if (file.size > 25 * 1024 * 1024) throw new Error('ZIP must be smaller than 25 MiB.');
            const result = await client.call({ type: 'import', bytes: await file.arrayBuffer() });
            if (result.type !== 'import') throw new Error('Invalid ZIP response.');
            const entry =
              result.tree['main.py']?.kind === 'file'
                ? 'main.py'
                : (Object.keys(result.tree).find((p) => p.endsWith('.py')) ?? '');
            await createProject(file.name.replace(/\.zip$/i, ''), result.tree, entry);
            useUI.setState({ modal: null });
          })()
            .catch((error: unknown) => useUI.getState().reportError(error))
            .finally(() => {
              setBusy(false);
              if (field.current) field.current.value = '';
            });
        }}
      />
      <button className="secondary-button" disabled={busy} onClick={() => field.current?.click()}>
        <Upload size={13} />
        {busy ? 'Importing…' : 'Import ZIP'}
      </button>
      <button
        className="secondary-button"
        disabled={busy}
        onClick={() => {
          setBusy(true);
          void exportProject()
            .catch((error: unknown) => useUI.getState().reportError(error))
            .finally(() => setBusy(false));
        }}
      >
        <Download size={13} />
        Export ZIP
      </button>
    </>
  );
}
