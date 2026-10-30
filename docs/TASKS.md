# Phase 1 tasks

Each task is finished only after acceptance checks and a separate verified commit; push whenever a remote is available.

## [x] T0 — Project setup

- Strict React/TypeScript Vite app starts and builds.
- Tailwind, Zustand, Motion and feature/core folders are installed.
- ESLint, Prettier, Vitest and CI run lint/typecheck/tests/build.

## [ ] T1 — App shell

- Activity bar, explorer, editor, bottom panel and status bar render.
- Sidebar and bottom panel resize with keyboard-accessible handles.
- Dark default, clear focus and reduced-motion behavior work.

## [ ] T2 — Virtual file system and explorer

- Pure VFS supports file/folder create, rename, delete and move with validation.
- Explorer supports context actions and keyboard navigation.
- Tests cover path normalization, collisions, recursive operations and invalid moves.

## [ ] T3 — Monaco editor and tabs

- Files open in locally bundled Monaco models.
- Tabs close, switch, reorder and show unsaved changes.
- Model contents track VFS edits without losing other files.

## [ ] T4 — Python editor support

- Python syntax coloring and bracket matching work.
- Python indentation and snippets are configured.
- LanguageAdapter and reusable trace event contracts are defined.

## [ ] T5 — Autosave and persistence

- Debounced IndexedDB saves restore project and open tabs.
- Pending edits flush on visibility change and project switch.
- Storage failures are visible and persistence logic is tested.

## [ ] T6 — Python worker runtime

- Self-hosted npm Pyodide runs files inside a Web Worker.
- VFS mounts at project root with working multi-file imports.
- Runtime load and Python failures are reported without freezing the UI.

## [ ] T7 — Terminal and stdin

- Stdout and stderr stream with distinct styling.
- input() blocks on shared memory and resumes with entered text.
- Clear, auto-scroll and missing-isolation feedback work.

## [ ] T8 — Execution controls

- Run, Stop and Restart control worker lifecycle.
- Status reports loading/running/finished/error, exit code and elapsed time.
- An infinite loop can be stopped and a new program runs afterward.

## [ ] T9 — Error highlighting

- Tree-sitter worker returns live syntax diagnostics.
- Syntax and runtime failures create Monaco markers.
- Problems list shows current file errors and navigates to them.

## [ ] T10 — Clickable stack traces

- Pure traceback parser extracts Python file, line and column.
- Traceback links open the correct project file and location.
- Tests cover syntax errors, chained traces and non-project paths.

## [ ] T11 — Autocomplete

- Language-service worker supplies working Python completions.
- Completions are lazy-loaded and include contextual project symbols.
- Python snippets insert usable code templates.

## [ ] T12 — Formatter

- A real Python formatter runs in a worker.
- Format Document updates the current file and reports errors.
- Format-on-save can be enabled without save loops.

## [ ] T13 — Command palette

- Ctrl/Cmd+Shift+P opens searchable commands.
- Ctrl/Cmd+P searches and opens project files.
- Commands cover implemented editor, execution, project and settings actions.

## [ ] T14 — Settings

- Font/tab size, theme, autosave, wrap, minimap and format-on-save apply live.
- Settings persist across reloads.
- Validation and serialization have pure unit tests.

## [ ] T15 — Project manager

- Create, open, rename and delete projects persist in IndexedDB.
- Recent projects show last-opened time and restore their files.
- Switching projects flushes pending edits and isolates sessions.

## [ ] T16 — ZIP import and export

- Export creates a real ZIP preserving project structure.
- Import validates paths and rejects traversal and oversized archives.
- Round-trip and invalid-archive tests pass.

## [ ] T17 — Project templates

- Hello World and Input/Output templates run.
- Functions & Classes and Algorithms templates run.
- Multi-file template imports its sibling module correctly.

## [ ] T18 — Basic breakpoints

- Gutter toggles persist breakpoints by file.
- sys.settrace pauses at breakpoints using Atomics.
- Continue and Step Over resume correctly; Stop works while paused.

## [ ] T19 — Variable inspector

- Paused frame locals/globals appear in Variables.
- Safe serialization caps depth, size and cycles.
- Call Stack and current execution line update on pause.

## [ ] T20 — Final polish

- Keyboard shortcuts, empty/loading/error states and error boundary work.
- Production build and automated tests pass; browser smoke checks are recorded.
- README documents startup, headers, screenshots and docs/QA.md manual checklist.
