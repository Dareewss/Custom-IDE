# Code Atlas roadmap


Phase 1 — Good IDE
Features
- Monaco code editor
- Python support first
- syntax highlighting
- autocomplete
- error highlighting
- Run / Stop / Restart
- terminal / console
- stdin / stdout / stderr
- file explorer
- folders
- tabs
- autosave
- recent projects
- import/export project
- command palette
- settings
- basic breakpoints
- variable inspector
- clickable stack traces
- formatter
- basic project templates
- later: Java, JavaScript, C++, C#
Tech
- React
- TypeScript
- Vite
- Monaco Editor
- Zustand
- Tailwind CSS
- Motion
- Web Workers
- Python runtime / interpreter integration
- Tree-sitter
Phase 2 — 3D Code Overview
Features
- convert project structure into 3D
- files represented visually
- classes represented visually
- functions represented visually
- variables represented visually
- arrays / objects represented visually
- loops represented visually
- conditions represented visually
- imports / dependencies
- function connections
- click code → focus 3D object
- click 3D object → focus code
- zoom / rotate / pan
- collapse / expand
- search objects
- isolate functions/classes
- automatic graph layout
- 3D minimap
Tech
- React Three Fiber
- Three.js
- Drei
- React Spring
- Zustand
- Tree-sitter
- Web Workers
- TypeScript
Phase 3 — Live Execution Visualization
Features
- Run in Visual Mode
- Pause
- Resume
- Step Forward
- Step Back
- execution speed
- timeline
- current line highlight
- current 3D object highlight
- animated execution path
- variable changes
- function calls
- return values
- branch visualization
- loop iteration visualization
- call stack
- scope visualization
- program state history
- time-travel execution
- execution replay
Tech
- Custom Execution Trace Engine
- Tree-sitter
- Web Workers
- Zustand
- React Three Fiber
- Three.js
- React Spring
- TypeScript
- QuickJS WASM later for JavaScript execution
Phase 4 — 3D Debugging
Features
- breakpoints
- conditional breakpoints
- Step Into
- Step Over
- Step Out
- watch expressions
- variable inspector
- call stack
- exception breakpoints
- error path visualization
- broken connection visualization
- undefined references
- failed imports
- wrong function calls
- type errors
- unreachable code
- circular dependencies
- variable history
- compare program states
- infinite loop detection
- error timeline
- memory visualization
- array out-of-bounds visualization
- null references
- stack overflow visualization
- C/C++ memory errors later
Tech
- Custom Debug Engine
- Custom Execution Trace Engine
- Web Workers
- Tree-sitter
- Zustand
- React Three Fiber
- Three.js
- React Spring
- WebAssembly
- Language Adapters
- debugger protocol integrations later
Phase 5 — Full Polish + Multi-Language + Self Learning
Features
- Python
- Java
- JavaScript
- C++
- C#
- language selector
- project templates
- automatic project setup
- beginner onboarding
- dark/light themes
- custom themes
- custom 3D themes
- performance mode
- accessibility
- keyboard shortcuts
- customizable panels
- crash recovery
- project snapshots
- cloud save
- accounts
- share projects
- custom programming language support
- custom Language Plugins
- grammar definition
- custom runner/compiler
- custom debugger adapter
- custom syntax highlighting
- custom 3D mapping
Self Learning
- Learning Mode toggle
- explain error
- explain current execution
- explain variable change
- explain conditions
- predict next value
- predict output
- hints
- mistake history
- mistake categories
- practice based on mistakes
- learning progress
- beginner explanations
Tech
- React
- TypeScript
- Vite
- Monaco Editor
- React Three Fiber
- Three.js
- Drei
- React Spring
- Motion
- Tailwind CSS
- Zustand
- Tree-sitter
- Web Workers
- WebAssembly
- QuickJS WASM
- Node.js
- Fastify
- PostgreSQL
- Drizzle ORM
- Docker
- Vitest
- Playwright
- ESLint
- GitHub Actions
Full Tech Stack
Frontend
React
TypeScript
Vite

Editor
Monaco Editor

UI
Tailwind CSS
Motion

State
Zustand

3D
Three.js
React Three Fiber
Drei
React Spring

Code Analysis
Tree-sitter
Custom AST processing
Custom Execution Trace Engine
Custom Debug Engine

Performance
Web Workers
WebAssembly
InstancedMesh
OffscreenCanvas later

Execution
Python runtime
QuickJS WASM
Language Adapters

Backend
Node.js
Fastify
PostgreSQL
Drizzle ORM

Testing
Vitest
Playwright

Infrastructure
Docker
GitHub Actions
ESLint
Prettier
