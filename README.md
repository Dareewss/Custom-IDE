# Code Atlas

A browser-based Python IDE. Phase 1 is tracked in [docs/TASKS.md](docs/TASKS.md).
The visualization and language roadmap is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Development

Requires Node.js 22.12+ (Node 24 recommended) and npm.

```sh
npm ci
npm run dev
```

`npm run check` runs lint, strict type checking, tests and a production build.
`npm run preview` serves the production build locally.

## Deployment headers

Both development and preview servers send:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Your production host must also send these headers and serve over HTTPS (localhost is
allowed for development). SharedArrayBuffer, Python stdin and debugger pause require
cross-origin isolation. Runtime assets are served from the same origin.

## Architecture

`src/features` contains editor, explorer, runner, terminal, debugger, projects,
settings and command-palette. `src/core` contains pure filesystem and language
contracts, trace events and worker services. Shared components live in `src/shared`.

Project files remain local to this browser. Python runs in a worker; it is not a
security boundary for untrusted code. See task progress for implemented capabilities.

Tool references: [Vite setup](https://vite.dev/guide/) and
[Pyodide worker usage](https://pyodide.org/en/stable/usage/webworker.html).
