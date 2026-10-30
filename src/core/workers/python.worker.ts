import type { RunRequest, RunnerMessage } from './protocol';
import { normalizePath, type FileTree } from '../fs/vfs';
import { readMailbox } from './mailbox';

function send(message: RunnerMessage) {
  self.postMessage(message);
}
async function execute(tree: FileTree, entry: string, mailbox?: SharedArrayBuffer) {
  const start = performance.now();
  send({ type: 'status', status: 'loading' });
  const runtimeURL = new URL('/runtime/pyodide/', self.location.origin).href;
  const module = (await import(/* @vite-ignore */ `${runtimeURL}pyodide.mjs`)) as {
    loadPyodide: typeof import('pyodide').loadPyodide;
  };
  const python = await module.loadPyodide({ indexURL: runtimeURL });
  for (const stream of ['stdout', 'stderr'] as const) {
    const decoder = new TextDecoder();
    const options = {
      write: (bytes: Uint8Array) => {
        const text = decoder.decode(bytes, { stream: true });
        if (text) send({ type: 'output', stream, text });
        return bytes.length;
      },
    };
    if (stream === 'stdout') python.setStdout(options);
    else python.setStderr(options);
  }
  python.setStdin({
    stdin: () => {
      if (!mailbox)
        throw new Error(
          'Interactive input requires SharedArrayBuffer. Serve with the COOP/COEP headers documented in README.',
        );
      const control = new Int32Array(mailbox, 0, 4);
      Atomics.store(control, 0, 0);
      send({ type: 'input' });
      Atomics.wait(control, 0, 0);
      return `${readMailbox(mailbox)}\n`;
    },
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
    void execute(event.data.tree, event.data.entry, event.data.mailbox).catch((error: unknown) =>
      send({ type: 'error', message: String(error) }),
    );
};
