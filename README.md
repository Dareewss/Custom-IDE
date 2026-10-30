# Custom-IDE

**Code Atlas** is a browser-local Python IDE: Monaco editing, multi-file execution,
interactive input, Jedi completions, Ruff formatting, breakpoints and variable inspection.
Phase 1 is implemented; [the roadmap](docs/ROADMAP.md) records the later 3D and learning phases.

![Code Atlas workspace](docs/screenshots/workspace.png)

## Development

Requires Node.js 22.12+ (Node 24 recommended), Python 3.10+ for serializer tests, and npm.

```sh
npm ci
npm run dev
```

`npm run check` runs lint, strict type checking, tests and a production build.
`npm run preview` serves the production build locally.

Open the URL printed by Vite. On first startup/build, the runtime preparation script
copies Pyodide from npm and downloads pinned, SHA-256-verified Jedi/Parso wheels from
PyPI. Python, Tree-sitter, Jedi and Ruff then run in workers using same-origin assets;
the browser does not need a runtime CDN.

Production must serve HTTPS and the headers `Cross-Origin-Opener-Policy: same-origin`
and `Cross-Origin-Embedder-Policy: require-corp`. These enable SharedArrayBuffer for
stdin and debugger pauses. Vite dev and preview set both. See
[deployment configuration](docs/DEPLOYMENT.md).

## Install as an app

Open Code Atlas in Chrome or Edge, click **Install app** in the header, then use
**Install now** when the browser offers it. If this is an embedded preview, the
guide explains how to open the same address in your browser and install from its
menu. Launching the installed app opens a dedicated window without an address bar.
Safari on iPhone/iPad uses Share → Add to Home Screen.

The production app caches its editor and application shell. Python execution,
autocomplete and formatting become available offline after each tool is used
online once. Projects remain in IndexedDB across browser and installed windows on
the same origin. **Update ready** saves the current workspace before reloading.
Run `npm run build` and `npm run preview` to try the installable production app;
development mode does not register a service worker.

See [MDN's standalone app guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Create_a_standalone_app)
for browser installation behavior.

## Using the workspace

The reference-inspired app shell uses floating dark panels, a project switcher and a
navigation rail. Choose **Code** for a bottom console, **Split** for a right-hand live
workbench, or **Focus** for an uninterrupted editor. The search and debugger rail
buttons open the real file palette and variable inspector. Narrow windows stack the
workbench below the editor automatically.

Open `main.py` and choose **Run file**. The folder icon opens the project manager:
create one of five templates, switch recent projects, rename/delete projects, or
import/export ZIPs. Explorer actions support folders, rename, move and delete;
files and editor tabs also support drag-and-drop. In the tab bar, use arrow keys
to switch tabs and Alt+Shift+Arrow to reorder them.

Changes autosave to IndexedDB. Settings apply immediately and persist locally.
Click the editor gutter or press F9 to set a breakpoint, then run the entry file.
Execution pauses before that line; inspect locals/globals, expand values, view
the call stack, Continue or Step Over. Traceback source links and Problems entries
open the relevant file and location.

| Shortcut                       | Action                        |
| ------------------------------ | ----------------------------- |
| Ctrl/Cmd+Shift+P or Ctrl/Cmd+K | Command palette               |
| Ctrl/Cmd+P                     | Quick open file               |
| F5 / Shift+F5                  | Run or Continue / Stop        |
| Ctrl/Cmd+Shift+F5              | Restart                       |
| F9 / F10                       | Toggle breakpoint / Step Over |
| Alt+Shift+F                    | Format Document               |
| Ctrl/Cmd+S                     | Save now                      |
| Ctrl/Cmd+,                     | Settings                      |
| Ctrl/Cmd+B / Ctrl/Cmd+backtick | Explorer / bottom panel       |
| Ctrl/Cmd+W                     | Close active tab              |

In the editor, Ctrl/Cmd+M toggles whether Tab moves focus to the surrounding interface.

## Checks and screenshots

```sh
npm run check
npx playwright install chromium
npm run test:e2e
```

The browser suite starts the built preview on port 4173. On Windows with Chrome
already installed, use `$env:PLAYWRIGHT_CHANNEL='chrome'` in PowerShell instead of
installing Chromium. CI runs the four quality gates plus the production browser suite.
See [QA results and the manual checklist](docs/QA.md).

To refresh the real-execution screenshots, run `npm run build`, start
`npm run preview -- --port 4173`, then run `npm run screenshots` in another terminal.
Screenshots cover the desktop workspace, paused debugger and compact layout.

![Paused debugger](docs/screenshots/debugger.png)

## Phase 1 limits

Python's standard library and project modules are supported. A package installer,
server processes, cloud sync and other language runtimes belong to later phases.
Stop destroys Python state; Restart mounts a fresh copy of the project. Breakpoints
are captured when a run starts. Output is capped at 1,000,000 characters and retained trace history
at 5,000 events. Inspector depth, item counts, strings and cycles are bounded;
custom object representations and properties are not evaluated.

ZIP projects contain UTF-8 text: 25 MiB compressed, 20 MiB total extracted, 2 MiB per
file and 2,000 entries maximum. Binary files, encrypted archives, symlinks and unsafe
paths are rejected. Export a ZIP before clearing browser data or moving computers.

## Architecture

`src/features` contains editor, explorer, runner, terminal, debugger, projects,
settings and command-palette. `src/core` contains pure filesystem and language
contracts, trace events and worker services. Shared components live in `src/shared`.

Project files remain local to this browser. Python runs in a worker; it is not a
security boundary for untrusted code. See task progress for implemented capabilities.

Tool references: [Vite setup](https://vite.dev/guide/) and
[Pyodide worker usage](https://pyodide.org/en/stable/usage/webworker.html).
