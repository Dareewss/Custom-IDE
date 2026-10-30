import type { ReactNode } from 'react';
import {
  Box,
  Files,
  PanelBottom,
  PanelLeft,
  Terminal,
  X,
  ChevronRight,
  Circle,
  Code2,
} from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { motion, useReducedMotion } from 'motion/react';
import { useUI, type PanelTab } from './ui-store';
import { IconButton } from './IconButton';

interface ShellProps {
  palette?: ReactNode;
  explorer?: ReactNode;
  editor?: ReactNode;
  console?: ReactNode;
  variables?: ReactNode;
  callStack?: ReactNode;
  problems?: ReactNode;
  actions?: ReactNode;
  navigation?: ReactNode;
  status?: ReactNode;
  projectName?: string;
}

export function Shell(props: ShellProps) {
  const ui = useUI();
  const reduced = useReducedMotion();
  const content = {
    Console: props.console,
    Variables: props.variables,
    'Call Stack': props.callStack,
    Problems: props.problems,
  };
  return (
    <main className="workspace" aria-label="Code Atlas workspace">
      <header className="titlebar">
        <a className="brand" href="#" aria-label="Code Atlas home">
          <Box size={23} />
          <span>
            code<span className="brand-light">atlas</span>
            <span className="phase-badge">IDE</span>
          </span>
        </a>
        <div className="workspace-title">
          <span className="workspace-dot" />
          {props.projectName ?? 'Untitled workspace'}
          <ChevronRight size={13} />
          <span>Workspace</span>
        </div>
        {props.palette}
        <div className="title-actions">
          <IconButton label="Toggle explorer" onClick={ui.toggleSidebar}>
            <PanelLeft size={16} />
          </IconButton>
          <IconButton label="Toggle bottom panel" onClick={ui.toggleBottom}>
            <PanelBottom size={16} />
          </IconButton>
        </div>
      </header>
      <div className="workbench">
        <nav className="activitybar" aria-label="Workspace views">
          <div>
            <IconButton label="Explorer" aria-pressed={ui.sidebar} onClick={ui.toggleSidebar}>
              <Files size={22} />
            </IconButton>
            <IconButton label="Console" onClick={() => ui.setPanel('Console')}>
              <Terminal size={21} />
            </IconButton>
          </div>
          <div>
            {props.navigation}
            <span className="local-badge" title="Local workspace">
              L
            </span>
          </div>
        </nav>
        <Group orientation="horizontal" className="main-group">
          {ui.sidebar && (
            <>
              <Panel defaultSize="245px" minSize="175px" maxSize="440px">
                <aside className="sidebar">
                  <div className="section-heading">
                    EXPLORER<span className="small-tag">LOCAL</span>
                  </div>
                  {props.explorer ?? (
                    <p className="muted padded">Your project files will appear here.</p>
                  )}
                  <div className="sidebar-foot">
                    <span className="workspace-dot" />
                    Browser workspace
                  </div>
                </aside>
              </Panel>
              <Separator className="separator vertical" aria-label="Resize explorer" />
            </>
          )}
          <Panel minSize="200px">
            <div className="editor-column">
              <div className="editor-toolbar">
                <span className="eyebrow">
                  <Code2 size={14} /> EDITOR
                </span>
                <div className="toolbar-actions">{props.actions}</div>
              </div>
              <Group orientation="vertical">
                <Panel minSize="120px" defaultSize="72%">
                  <section className="editor-surface" aria-label="Editor">
                    {props.editor ?? (
                      <motion.div
                        initial={{ opacity: 0, y: reduced ? 0 : 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="welcome"
                      >
                        <div className="welcome-mark">
                          <Box size={54} strokeWidth={1} />
                        </div>
                        <span className="eyebrow">A LITTLE SPACE TO BUILD BIG THINGS</span>
                        <h1>Your next idea starts here.</h1>
                        <p>
                          A focused workspace for your code, your experiments,
                          <br />
                          and everything you’re about to figure out.
                        </p>
                        <div className="welcome-note">
                          <Circle size={8} fill="currentColor" />
                          Local by design. Yours to explore.
                        </div>
                      </motion.div>
                    )}
                  </section>
                </Panel>
                {ui.bottom && (
                  <>
                    <Separator className="separator horizontal" aria-label="Resize bottom panel" />
                    <Panel minSize="100px" defaultSize="28%">
                      <section className="bottom-panel" aria-label="Output panel">
                        <div className="panel-header">
                          <div className="panel-tabs" role="tablist" aria-label="Output views">
                            {(['Console', 'Problems', 'Variables', 'Call Stack'] as PanelTab[]).map(
                              (tab) => (
                                <button
                                  key={tab}
                                  role="tab"
                                  aria-selected={ui.panel === tab}
                                  onClick={() => ui.setPanel(tab)}
                                >
                                  {tab}
                                </button>
                              ),
                            )}
                          </div>
                          <IconButton label="Close bottom panel" onClick={ui.toggleBottom}>
                            <X size={14} />
                          </IconButton>
                        </div>
                        <div className="panel-body" role="tabpanel" aria-label={ui.panel}>
                          {content[ui.panel] ?? (
                            <div className="panel-empty">
                              <Terminal size={16} />
                              <span>
                                {ui.panel === 'Console'
                                  ? 'Your program output will appear here.'
                                  : ui.panel === 'Problems'
                                    ? 'No problems to show.'
                                    : 'Start a debug session to inspect execution.'}
                              </span>
                            </div>
                          )}
                        </div>
                      </section>
                    </Panel>
                  </>
                )}
              </Group>
            </div>
          </Panel>
        </Group>
      </div>
      <footer className="statusbar">
        <div>
          <span className="status-brand">
            <Box size={12} />
            Code Atlas
          </span>
          <span className="workspace-dot" />
          Local workspace
        </div>
        <div>
          {props.status ?? <span>Ready</span>}
          <span>UTF-8</span>
          <span>Python</span>
        </div>
      </footer>
      {ui.error && (
        <div className="error-toast" role="alert">
          <span>{ui.error}</span>
          <IconButton label="Dismiss error" onClick={() => ui.reportError(null)}>
            <X size={16} />
          </IconButton>
        </div>
      )}
    </main>
  );
}
