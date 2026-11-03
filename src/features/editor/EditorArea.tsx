import { lazy, Suspense } from 'react';
import { FileCode2, X, Box, ArrowUpRight } from 'lucide-react';
import { useWorkspace } from '../explorer/store';
import { basename } from '../../core/fs/vfs';
import { motion, useReducedMotion } from 'motion/react';

const CodeEditor = lazy(() => import('./CodeEditor'));
export function EditorArea() {
  const reducedMotion = useReducedMotion();
  const s = useWorkspace();
  return (
    <>
      <div className="editor-tabs" role="tablist" aria-label="Open files">
        {s.tabs.map((path) => (
          <div
            className={`file-tab ${s.active === path ? 'active' : ''}`}
            key={path}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('atlas/tab', path)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = e.dataTransfer.getData('atlas/tab');
              if (s.tabs.includes(from)) s.reorder(from, path);
            }}
          >
            <button
              role="tab"
              data-path={path}
              tabIndex={s.active === path ? 0 : -1}
              aria-selected={s.active === path}
              onClick={() => s.open(path)}
              title={path}
              onKeyDown={(e) => {
                const index = s.tabs.indexOf(path);
                if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                  e.preventDefault();
                  const target =
                    s.tabs[
                      (index + (e.key === 'ArrowRight' ? 1 : -1) + s.tabs.length) % s.tabs.length
                    ];
                  if (e.altKey && e.shiftKey) s.reorder(path, target);
                  else {
                    s.open(target);
                    const buttons = e.currentTarget
                      .closest('[role=tablist]')
                      ?.querySelectorAll<HTMLButtonElement>('[role=tab]');
                    if (buttons)
                      [...buttons].find((button) => button.dataset.path === target)?.focus();
                  }
                }
              }}
            >
              <FileCode2 size={14} className="python-icon" />
              {basename(path)}
              {s.dirty.includes(path) && (
                <span className="dirty-dot" aria-label="Unsaved changes" />
              )}
            </button>
            <button
              className="tab-close"
              aria-label={`Close ${basename(path)}`}
              onClick={() => s.close(path)}
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      {s.active ? (
        <>
          <div className="breadcrumbs">
            <span>{s.projectName}</span>
            <span>/</span>
            <FileCode2 size={12} />
            <span>{s.active}</span>
          </div>
          <div className="monaco-host">
            <Suspense fallback={<div className="panel-empty">Loading editor…</div>}>
              <CodeEditor />
            </Suspense>
          </div>
        </>
      ) : (
        <motion.div
          className="welcome"
          initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
        >
          <div className="welcome-mark">
            <Box size={38} strokeWidth={1.2} />
          </div>
          <span className="eyebrow">CODE ATLAS WORKSPACE</span>
          <h1>Start with a file.</h1>
          <p>
            Open your code. Run an experiment.
            <br />
            Everything you need is right here.
          </p>
          <div className="welcome-actions">
            {Object.values(s.tree).some((node) => node.kind === 'file') ? (
              <button
                className="secondary-button"
                onClick={() => {
                  const path = Object.keys(s.tree).find((p) => s.tree[p].kind === 'file');
                  if (path) s.open(path);
                }}
              >
                <ArrowUpRight size={13} />
                Open a project file
              </button>
            ) : (
              <p className="muted">Create your first file with New file in the explorer.</p>
            )}
          </div>
          <div className="welcome-shortcut">
            <kbd>Ctrl</kbd>
            <kbd>P</kbd>
            <span>to find any file</span>
          </div>
        </motion.div>
      )}
    </>
  );
}
