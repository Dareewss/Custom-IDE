import { Parser, Language } from 'web-tree-sitter';
import runtimeWasm from 'web-tree-sitter/web-tree-sitter.wasm?url';
import pythonWasm from 'tree-sitter-python/tree-sitter-python.wasm?url';
import { collectSyntaxErrors } from '../language/syntax';
import { loadWasm } from './wasm';

let parser: Promise<Parser> | undefined;
async function getParser() {
  return (parser ??= (async () => {
    await Parser.init({
      wasmBinary: await loadWasm(new URL(runtimeWasm, self.location.origin).href),
    });
    const instance = new Parser();
    instance.setLanguage(
      await Language.load(
        new Uint8Array(await loadWasm(new URL(pythonWasm, self.location.origin).href)),
      ),
    );
    return instance;
  })());
}
self.onmessage = async (
  event: MessageEvent<{ id: number; request: { path: string; content: string } }>,
) => {
  const { id, request } = event.data;
  try {
    const tree = (await getParser()).parse(request.content);
    if (!tree) throw new Error('Parser could not process this file.');
    try {
      self.postMessage({ id, result: collectSyntaxErrors(tree.rootNode, request.path) });
    } finally {
      tree.delete();
    }
  } catch (error) {
    self.postMessage({ id, error: String(error) });
  }
};
