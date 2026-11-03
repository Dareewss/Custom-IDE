import init, { Workspace, PositionEncoding } from '@astral-sh/ruff-wasm-web';
import wasm from '@astral-sh/ruff-wasm-web/ruff_wasm_bg.wasm?url';
import { loadWasm } from './wasm';

let workspace: Promise<Workspace> | undefined;
async function getWorkspace() {
  return (workspace ??= (async () => {
    await init({ module_or_path: await loadWasm(new URL(wasm, self.location.origin).href) });
    return new Workspace({ 'line-length': 88, 'indent-width': 4 }, PositionEncoding.Utf16);
  })());
}
self.onmessage = async (event: MessageEvent<{ id: number; request: string }>) => {
  const { id, request } = event.data;
  try {
    self.postMessage({ id, result: (await getWorkspace()).format(request) });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
