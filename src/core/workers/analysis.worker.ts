import { Parser, Language } from 'web-tree-sitter';
import runtimeWasm from 'web-tree-sitter/web-tree-sitter.wasm?url';
import pythonWasm from 'tree-sitter-python/tree-sitter-python.wasm?url';
import { loadWasm } from './wasm';
import { IncrementalPythonAnalyzer } from '../model/python/incremental';
import type { FileTree } from '../fs/vfs';

let analyzer: Promise<IncrementalPythonAnalyzer> | undefined;
function getAnalyzer() {
  return (analyzer ??= (async () => {
    await Parser.init({
      wasmBinary: await loadWasm(new URL(runtimeWasm, self.location.origin).href),
    });
    const parser = new Parser();
    try {
      parser.setLanguage(
        await Language.load(
          new Uint8Array(await loadWasm(new URL(pythonWasm, self.location.origin).href)),
        ),
      );
      return new IncrementalPythonAnalyzer(parser);
    } catch (error) {
      parser.delete();
      analyzer = undefined;
      throw error;
    }
  })().catch((error: unknown) => {
    analyzer = undefined;
    throw error;
  }));
}
self.onmessage = async (event: MessageEvent<{ id: number; request: FileTree }>) => {
  const { id, request } = event.data;
  try {
    self.postMessage({ id, result: (await getAnalyzer()).analyze(request) });
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
