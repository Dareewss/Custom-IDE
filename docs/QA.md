# Phase 1 QA

Local validation date: 2026-10-30 (Europe/Bucharest).

Release result: lint, strict typecheck and build pass; 32 Vitest tests, 4 Python
serializer tests and all 10 production-browser scenarios pass. Desktop workspace,
paused-debugger and 375px screenshots were rendered and visually reviewed.

## Automated checks

- ESLint (including no explicit `any`) and Prettier.
- Strict TypeScript compilation and production Vite build.
- Vitest: VFS/path operations, IndexedDB restoration/recent ordering, ZIP round trips
  and invalid/oversized archives, real Tree-sitter parsing, traceback positions,
  settings validation, shared-memory UTF-8 transfer and trace contracts.
- Python unittest: serialization cycle/depth/size limits, internal-name filtering,
  hostile repr/attribute hooks and descriptors.
- Ten Playwright scenarios against the production preview: Code/Split/Focus layouts, rail tools, multi-file execution,
  stdin/stdout/stderr, errors/source links, breakpoint persistence, stepping and
  inspection, infinite-loop Stop/Restart, real Ruff/Jedi workers, syntax diagnostics,
  settings, palettes, ZIP download/re-import, file/project operations, output floods
  behavior without isolation headers, standalone manifest validation, installation guidance,
  offline reload and cached Python execution.

Browser verification uses installed Chrome locally and Playwright Chromium in CI.
All five starter templates were also executed in the real Pyodide worker, including
both interactive inputs and a nested multi-file import.

## Short manual release checklist

- [ ] At 1440px and 768px, resize the explorer and output panel with mouse and keyboard.
- [ ] At 375px, open a file, toggle panels and check that controls remain reachable.
- [ ] Create a nested folder/file; rename, move, reorder tabs, close and reopen it.
- [ ] Reload after editing and after setting a breakpoint; verify the saved session.
- [ ] Run Input / Output; enter Unicode and an empty line; check errors are distinct.
- [ ] Run an infinite loop, Stop, then run a normal program and verify exit status.
- [ ] Pause in an imported function; expand nested/cyclic values, Step Over and Continue.
- [ ] Use traceback links, Problems and both command palettes entirely with the keyboard.
- [ ] Change theme/font/tab size/wrap/minimap/format-on-save and reload.
- [ ] Export ZIP, import into a new project, then delete the active project.
- [ ] Serve without isolation headers; confirm input/debugger report the requirement.

## Visual review

`npm run screenshots` captures actual program output and a paused debug session at
1440×960, plus the compact layout at 375×812. Inspect the PNGs in `docs/screenshots/`.
Reduced-motion preferences suppress transitions. No remote fonts or decorative
images are required.
