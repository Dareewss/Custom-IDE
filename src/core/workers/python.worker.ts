import type { RunRequest, RunnerMessage } from './protocol';
import { normalizePath, type FileTree } from '../fs/vfs';
import { readMailbox } from './mailbox';
import debugScript from '../trace/debugger.py?raw';
import type { TraceEvent, VariableSnapshot } from '../trace/events';
import serializerScript from '../trace/serializer.py?raw';

function send(message: RunnerMessage) {
  self.postMessage(message);
}
async function execute(
  tree: FileTree,
  entry: string,
  mailbox?: SharedArrayBuffer,
  breakpoints: Record<string, number[]> = {},
) {
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
  if (Object.values(breakpoints).some((lines) => lines.length) && !mailbox)
    throw new Error(
      'Debugging requires cross-origin isolation. Configure the COOP/COEP deployment headers.',
    );
  python.globals.set('_atlas_breakpoints', JSON.stringify(breakpoints));
  python.registerJsModule('_atlas_debug', {
    emit: (text: string) => send({ type: 'trace', event: JSON.parse(text) as TraceEvent }),
    pause: (text: string) => {
      if (!mailbox) return 1;
      const control = new Int32Array(mailbox, 0, 4);
      Atomics.store(control, 0, 0);
      send({ type: 'paused', snapshot: JSON.parse(text) as VariableSnapshot });
      Atomics.wait(control, 0, 0);
      return Atomics.load(control, 2);
    },
  });
  python.runPython(serializerScript + '\n' + debugScript);
  send({ type: 'status', status: 'running' });
  const start = performance.now();
  const result: unknown = await python.runPythonAsync(`
import sys, os, runpy, traceback, importlib, json
sys.path.insert(0, '/project')
sys.argv = [_atlas_entry]
importlib.invalidate_caches()
_atlas_exit_code = 0
_atlas_diagnostic = None
try:
    if _atlas_debug_enabled: sys.settrace(_atlas_trace)
    runpy.run_path(_atlas_entry, run_name='__main__')
except SystemExit as exc:
    _atlas_exit_code = exc.code if isinstance(exc.code, int) else (0 if exc.code is None else 1)
    if exc.code is not None and not isinstance(exc.code, int): print(exc.code, file=sys.stderr)
except BaseException as exc:
    traceback.print_exc()
    _atlas_exit_code = 1
    _frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename.startswith('/project/')]
    if isinstance(exc, SyntaxError) and exc.filename and exc.filename.startswith('/project/'):
        _atlas_diagnostic = dict(path=exc.filename[9:], line=exc.lineno or 1, column=exc.offset or 1, endLine=exc.end_lineno or exc.lineno or 1, endColumn=exc.end_offset or (exc.offset or 1)+1)
    elif _frames:
        f = _frames[-1]
        _atlas_diagnostic = dict(path=f.filename[9:], line=f.lineno, column=(f.colno or 0)+1, endLine=f.end_lineno or f.lineno, endColumn=(f.end_colno or (f.colno or 0)+1)+1)
    if _atlas_diagnostic:
        _atlas_diagnostic.update(message=f'{type(exc).__name__}: {exc}', source='Python runtime')
finally:
    sys.settrace(None)
json.dumps(dict(exitCode=_atlas_exit_code, diagnostic=_atlas_diagnostic))
`);
  const parsed: { exitCode: number; diagnostic: import('../language/adapter').Diagnostic | null } =
    JSON.parse(String(result));
  if (parsed.diagnostic) send({ type: 'diagnostic', diagnostic: parsed.diagnostic });
  send({
    type: 'done',
    exitCode: parsed.exitCode,
    elapsed: performance.now() - start,
  });
}
self.onmessage = (event: MessageEvent<RunRequest>) => {
  if (event.data.type === 'run')
    void execute(
      event.data.tree,
      event.data.entry,
      event.data.mailbox,
      event.data.breakpoints,
    ).catch((error: unknown) => send({ type: 'error', message: String(error) }));
};
