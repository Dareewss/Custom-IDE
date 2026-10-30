import type { RunRequest, RunnerMessage } from './protocol';
import { normalizePath, type FileTree } from '../fs/vfs';

function send(message: RunnerMessage) {
  self.postMessage(message);
}
async function execute(tree: FileTree, entry: string) {
  const start = performance.now();
  send({ type: 'status', status: 'loading' });
  const runtimeURL = new URL('/runtime/pyodide/', self.location.origin).href;
  const module = (await import(/* @vite-ignore */ `${runtimeURL}pyodide.mjs`)) as {
    loadPyodide: typeof import('pyodide').loadPyodide;
  };
  const python = await module.loadPyodide({ indexURL: runtimeURL });
  python.setStdout({
    batched: (text) => send({ type: 'output', stream: 'stdout', text: `${text}\n` }),
  });
  python.setStderr({
    batched: (text) => send({ type: 'output', stream: 'stderr', text: `${text}\n` }),
  });
  python.FS.mkdirTree('/project');
  for (const [path, node] of Object.entries(tree)) {
    const safe = normalizePath(path);
    if (!safe) continue;
    if (node.kind === 'folder') python.FS.mkdirTree(`/project/${safe}`);
    else {
      python.FS.mkdirTree(`/project/${safe.split('/').slice(0, -1).join('/')}`);
      python.FS.writeFile(`/project/${safe}`, node.content);
    }
  }
  python.FS.chdir('/project');
  python.globals.set('_atlas_entry', `/project/${normalizePath(entry)}`);
  send({ type: 'status', status: 'running' });
  const exitCode: unknown = await python.runPythonAsync(`
import sys, os, runpy, traceback, importlib
sys.path.insert(0, '/project')
sys.argv = [_atlas_entry]
importlib.invalidate_caches()
_atlas_exit_code = 0
try:
    runpy.run_path(_atlas_entry, run_name='__main__')
except SystemExit as exc:
    _atlas_exit_code = exc.code if isinstance(exc.code, int) else (0 if exc.code is None else 1)
    if exc.code is not None and not isinstance(exc.code, int): print(exc.code, file=sys.stderr)
except BaseException:
    traceback.print_exc()
    _atlas_exit_code = 1
_atlas_exit_code
`);
  send({
    type: 'done',
    exitCode: typeof exitCode === 'number' ? exitCode : 1,
    elapsed: performance.now() - start,
  });
}
self.onmessage = (event: MessageEvent<RunRequest>) => {
  if (event.data.type === 'run')
    void execute(event.data.tree, event.data.entry).catch((error: unknown) =>
      send({ type: 'error', message: String(error) }),
    );
};
