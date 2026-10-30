# Code Atlas engineering rules

Build Phase 1 in docs/TASKS.md order, one task at a time. Work autonomously; record decisions in docs/DECISIONS.md. Ask only when blocked. Each task must work end-to-end; no stubs, fake data, or TODOs presented as complete. Split large tasks into meaningful verified commits.

## Git workflow

Start with git status and git remote -v; initialize if needed. Work on main. If no remote, try gh repo create (public); if unavailable ask once for a GitHub URL and continue local commits while waiting. Finish, verify, commit and push each task before starting the next, except the explicitly allowed missing-remote fallback. Never force push. Resolve push failures and retry. Use Conventional Commits; one logical change per commit. Tick tasks in the completing commit. Update docs/PROGRESS.md with date, task, commit and notes. Never commit secrets, .env files, node_modules or build output.

Before EVERY commit run lint, typecheck, tests and build; fix failures first. For the initial documentation-only commit, validate Markdown structure, task coverage and roadmap fidelity; application checks begin at T0.

## Stack

React, strict TypeScript, Vite, Monaco (@monaco-editor/react), Zustand, Tailwind CSS, Motion, Web Workers, web-tree-sitter + tree-sitter-python, npm self-hosted Pyodide worker, cmdk, react-resizable-panels, lucide-react, idb, JSZip, Vitest, Testing Library, ESLint, Prettier, GitHub Actions.

## Architecture and quality

Feature folders: src/features/{editor,explorer,runner,terminal,debugger,projects,settings,command-palette}; core folders: src/core/{fs,language,trace,workers}; shared UI in src/shared.

Pure unit-tested virtual file system, persisted in IndexedDB, mounted into Pyodide before each run. Project-root cwd; multi-file imports work. LanguageAdapter defines id, extensions, Monaco language, runner, diagnostics, completion, formatter and templates. Future languages must not require UI changes. Define line/call/return/exception/variable-snapshot trace types for future visualization.

Heavy work (Pyodide, tree-sitter, completion, formatter) stays in workers. Stdin uses SharedArrayBuffer and Atomics; dev/preview/deployment require COOP/COEP headers. Stop terminates and respawns worker; Restart stops then runs. Infinite loops must be stoppable.

No any. Keep components focused. Handle and display errors. Accessible labels, keyboard navigation and visible focus. Unit test pure VFS/path/traceback/zip/settings/trace logic. Modern VS Code-style resizable activity bar, explorer, tabs, editor, Console/Variables/Call Stack panel, status bar. Dark default; polished Motion transitions with reduced-motion support.

After each task report only task id/name, up to three lines describing work, commit hash and pushed status, next task; then continue. Never claim pushed when no remote exists. Keep TASKS and PROGRESS current for resumption.
