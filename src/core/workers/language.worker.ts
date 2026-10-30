import type { Completion } from '../language/adapter';
import type { FileTree } from '../fs/vfs';
import { normalizePath } from '../fs/vfs';
export interface CompletionRequest {
  path: string;
  content: string;
  line: number;
  column: number;
  tree: FileTree;
}

let runtime: Promise<import('pyodide').PyodideInterface> | undefined;
async function getRuntime() {
  return (runtime ??= (async () => {
    const base = new URL('/runtime/pyodide/', self.location.origin).href;
    const module = (await import(/* @vite-ignore */ `${base}pyodide.mjs`)) as {
      loadPyodide: typeof import('pyodide').loadPyodide;
    };
    const python = await module.loadPyodide({ indexURL: base });
    const packages: string[] = await (await fetch('/runtime/wheels/manifest.json')).json();
    const site = String(python.runPython('import site; site.getsitepackages()[0]'));
    for (const file of packages) {
      const response = await fetch(`/runtime/wheels/${file}`);
      if (!response.ok) throw new Error(`Language package unavailable: ${file}`);
      python.unpackArchive(await response.arrayBuffer(), 'zip', { extractDir: site });
    }
    python.runPython('import jedi; from jedi.api.environment import InterpreterEnvironment');
    return python;
  })());
}
async function complete(request: CompletionRequest): Promise<Completion[]> {
  const python = await getRuntime();
  const reset = (path: string) => {
    for (const name of python.FS.readdir(path).filter((s: string) => s !== '.' && s !== '..')) {
      const full = `${path}/${name}`;
      if (python.FS.isDir(python.FS.stat(full).mode)) {
        reset(full);
        python.FS.rmdir(full);
      } else python.FS.unlink(full);
    }
  };
  python.FS.mkdirTree('/project');
  reset('/project');
  for (const [path, node] of Object.entries(request.tree)) {
    const safe = normalizePath(path);
    if (node.kind === 'folder') python.FS.mkdirTree(`/project/${safe}`);
    else {
      python.FS.mkdirTree(`/project/${safe.split('/').slice(0, -1).join('/')}`);
      python.FS.writeFile(`/project/${safe}`, node.content);
    }
  }
  python.globals.set('_atlas_request', JSON.stringify(request));
  const result: unknown = python.runPython(`
import json, jedi
from jedi.api.environment import InterpreterEnvironment
_r = json.loads(_atlas_request)
_script = jedi.Script(_r['content'], path='/project/' + _r['path'], environment=InterpreterEnvironment(), project=jedi.Project('/project', added_sys_path=['/project']))
json.dumps([dict(label=c.name, insertText=c.name, detail=c.description, kind=c.type) for c in _script.complete(_r['line'], _r['column'] - 1)][:150])
`);
  return JSON.parse(String(result)) as Completion[];
}
let queue = Promise.resolve();
self.onmessage = (event: MessageEvent<{ id: number; request: CompletionRequest }>) => {
  const { id, request } = event.data;
  queue = queue.then(async () => {
    try {
      self.postMessage({ id, result: await complete(request) });
    } catch (error) {
      self.postMessage({ id, error: String(error) });
    }
  });
};
