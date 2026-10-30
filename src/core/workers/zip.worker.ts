import { exportZip, importZip } from '../fs/zip';
import type { FileTree } from '../fs/vfs';
export type ZipRequest =
  { type: 'import'; bytes: ArrayBuffer } | { type: 'export'; tree: FileTree };
export type ZipResponse =
  { type: 'import'; tree: FileTree } | { type: 'export'; bytes: ArrayBuffer };
self.onmessage = async (event: MessageEvent<{ id: number; request: ZipRequest }>) => {
  const { id, request } = event.data;
  try {
    const result: ZipResponse =
      request.type === 'import'
        ? { type: 'import', tree: await importZip(request.bytes) }
        : { type: 'export', bytes: await exportZip(request.tree) };
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
