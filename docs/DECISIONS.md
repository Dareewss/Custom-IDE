# Decisions

- 2026-10-30: T22 implements the user's confirmed installable web app preference with a standalone manifest, an actionable installation flow, versioned application caching and explicit save-before-update behavior; no native .exe wrapper is needed.

- 2026-10-30: T21 follows the user's dark glass workspace references: charcoal surfaces, restrained purple/cyan ambient light, lime actions and vivid syntax; the design search's landing-page pattern is inapplicable to a full-screen IDE.
- 2026-10-30: Use the right-hand reference panel for real Python output and inspection, with working Code/Split/Focus layouts; do not simulate a phone preview, AI chat or collaboration features.

- 2026-10-30: Preserve the author's README title and license edits received during T14; rebase without force-pushing.
- 2026-10-30: Self-host npm Pyodide and integrity-pinned PyPI Jedi/Parso wheels; use a separate lazy language worker so completion never shares a blocked execution worker.
- 2026-10-30: Use Ruff WASM for formatting; persist settings in validated localStorage and project sessions in IndexedDB.
- 2026-10-30: Use a worker-owned shared-memory mailbox for stdin and debug commands; terminate and replace workers for Stop/Restart and project changes.
- 2026-10-30: Preserve reusable language/trace contracts; bound output, trace history and safe variable serialization to protect responsiveness.
- 2026-10-30: ZIPs represent UTF-8 text projects; validate directory sizes and paths before extraction and perform compression/decompression in a worker.
- 2026-10-30: Add production Playwright coverage and native Python serializer tests; keep generated runtime/build assets ignored and capture real execution screenshots.

- 2026-10-30: Name the project Code Atlas; implement in the supplied repository with Vite and npm.
- 2026-10-30: GitHub CLI is unavailable; requested a remote URL once and will keep verified local commits until supplied.
- 2026-10-30: Initial documentation-only commit uses document validation; application checks start at T0.
- 2026-10-30: Use a dense charcoal workspace, green execution accent, readable system sans and monospace code; omit the design search landing-page pattern because it does not fit an IDE.
