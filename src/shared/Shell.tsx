import { useSyncExternalStore, type ReactNode } from 'react';
import {
  Box,
  Files,
  PanelBottom,
  PanelLeft,
  Terminal,
  X,
  ChevronDown,
  Search,
  Bug,
  Columns2,
  Code2,
  Maximize2,
  Focus,
} from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';
import { useUI, type WorkspaceLayout } from './ui-store';
import { IconButton } from './IconButton';
import { OutputDock } from './OutputDock';
import { GlassPanel } from './GlassPanel';
import { DesktopResizeHandles, DesktopWindowControls } from '../features/desktop/DesktopChrome';

interface ShellProps {
  languageName?: string;
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
  appControls?: ReactNode;
}
const subscribe = (notify: () => void) => {
  window.addEventListener('resize', notify);
  return () => window.removeEventListener('resize', notify);
};
const getWide = () => window.innerWidth >= 1100;

export function Shell(props: ShellProps) {
  const ui = useUI();
  const wide = useSyncExternalStore(subscribe, getWide, () => true);
  const docked = ui.layout === 'split' && wide;
  const content = {
    Console: props.console,
    Problems: props.problems,
    Variables: props.variables,
    'Call Stack': props.callStack,
  };
  const layouts: { id: WorkspaceLayout; label: string; icon: ReactNode }[] = [
    { id: 'code', label: 'Code', icon: <Code2 size={14} /> },
    { id: 'split', label: 'Split', icon: <Columns2 size={14} /> },
    { id: 'focus', label: 'Focus', icon: <Focus size={14} /> },
  ];
  return (
    <main
      className="workspace"
      data-layer="foreground"
      data-layout={ui.layout}
      aria-label="Code Atlas workspace"
    >
      <GlassPanel as="header" className="titlebar">
        <button
          className="brand"
          onClick={() => useUI.setState({ modal: 'projects' })}
          aria-label="Code Atlas home"
        >
          <span className="brand-symbol">
            <Box size={23} strokeWidth={1.6} />
          </span>
          <span className="brand-wordmark">
            Code Atlas<small>Personal workspace</small>
          </span>
        </button>
        <span className="header-divider" />
        <button
          className="workspace-title"
          aria-label="Open project switcher"
          onClick={() => useUI.setState({ modal: 'projects' })}
        >
          <Box size={15} />
          <span className="project-switcher-name">{props.projectName ?? 'Untitled workspace'}</span>
          <ChevronDown size={14} />
        </button>
        <div className="layout-switch" role="group" aria-label="Workspace layout">
          {layouts.map((layout) => (
            <button
              key={layout.id}
              aria-pressed={ui.layout === layout.id}
              onClick={() => ui.setLayout(layout.id)}
            >
              {layout.icon}
              <span>{layout.label}</span>
            </button>
          ))}
        </div>
        <div className="header-search">{props.palette}</div>
        <div className="title-actions">
          {props.appControls}
          <IconButton label="Toggle explorer" onClick={ui.toggleSidebar}>
            <PanelLeft size={16} />
          </IconButton>
          <IconButton label="Toggle bottom panel" onClick={ui.toggleBottom}>
            <PanelBottom size={16} />
          </IconButton>
          <IconButton
            label="Enter fullscreen"
            disabled={!document.fullscreenEnabled}
            onClick={() => {
              if (document.fullscreenElement) void document.exitFullscreen().catch(ui.reportError);
              else void document.documentElement.requestFullscreen().catch(ui.reportError);
            }}
          >
            <Maximize2 size={16} />
          </IconButton>
          <DesktopWindowControls />
        </div>
      </GlassPanel>
      <DesktopResizeHandles />
      <div className="workbench">
        <GlassPanel as="nav" className="activitybar" aria-label="Workspace views">
          <div>
            <IconButton label="Explorer" aria-pressed={ui.sidebar} onClick={ui.toggleSidebar}>
              <Files size={23} />
            </IconButton>
            <IconButton label="Search files" onClick={() => ui.openPalette('files')}>
              <Search size={23} />
            </IconButton>
            <span className="rail-divider" />
            <IconButton
              label="Debugger"
              aria-pressed={ui.bottom && ui.panel === 'Variables'}
              onClick={() => ui.setPanel('Variables')}
            >
              <Bug size={22} />
            </IconButton>
            <IconButton
              label="Console"
              aria-pressed={ui.bottom && ui.panel === 'Console'}
              onClick={() => ui.setPanel('Console')}
            >
              <Terminal size={22} />
            </IconButton>
          </div>
          <div>
            {props.navigation}
            <span className="rail-divider" />
            <button
              className="local-badge"
              aria-label="Open local workspace settings"
              onClick={() => useUI.setState({ modal: 'settings' })}
            >
              CA
            </button>
          </div>
        </GlassPanel>
        <Group orientation="horizontal" className="main-group">
          {ui.sidebar && (
            <>
              <Panel defaultSize="244px" minSize="185px" maxSize="420px">
                <GlassPanel as="aside" className="sidebar">
                  <div className="section-heading">
                    Explorer
                    <IconButton label="Hide explorer" onClick={ui.toggleSidebar}>
                      <PanelLeft size={15} />
                    </IconButton>
                  </div>
                  {props.explorer}
                  <div className="sidebar-foot">
                    <span className="workspace-dot" />
                    <span>
                      Local workspace<small>Saved on this device</small>
                    </span>
                    <Box size={14} />
                  </div>
                </GlassPanel>
              </Panel>
              <Separator className="separator vertical" aria-label="Resize explorer" />
            </>
          )}
          <Panel minSize="200px">
            <Group className="editor-layout" orientation={docked ? 'horizontal' : 'vertical'}>
              <Panel minSize={docked ? '250px' : '120px'} defaultSize={docked ? '68%' : '72%'}>
                <GlassPanel className="editor-card" variant="editor">
                  <div className="editor-toolbar">
                    <span className="editor-section-label">
                      <Code2 size={14} />
                      <span>Workspace</span>
                      <span className="editor-language">{props.languageName ?? 'Python'}</span>
                    </span>
                    <div className="toolbar-actions">{props.actions}</div>
                  </div>
                  <section className="editor-surface" aria-label="Editor">
                    {props.editor}
                  </section>
                </GlassPanel>
              </Panel>
              {ui.bottom && (
                <>
                  <Separator
                    className={`separator ${docked ? 'vertical' : 'horizontal'}`}
                    aria-label={docked ? 'Resize workbench' : 'Resize bottom panel'}
                  />
                  <Panel
                    defaultSize={docked ? '340px' : '28%'}
                    minSize={docked ? '292px' : '130px'}
                    maxSize={docked ? '520px' : undefined}
                  >
                    <OutputDock content={content} docked={docked} />
                  </Panel>
                </>
              )}
            </Group>
          </Panel>
        </Group>
      </div>
      <GlassPanel as="footer" className="statusbar">
        <div>
          <span className="status-brand">
            <Box size={12} />
            Code Atlas
          </span>
          <span className="workspace-dot" />
          All changes stay local
        </div>
        <div>
          {props.status ?? <span>Ready</span>}
          <span>UTF-8</span>
          <span className="status-language">{props.languageName ?? 'No file'}</span>
        </div>
      </GlassPanel>
      {ui.error && (
        <div className="error-toast glass glass--popover" role="alert">
          <span>{ui.error}</span>
          <IconButton label="Dismiss error" onClick={() => ui.reportError(null)}>
            <X size={16} />
          </IconButton>
        </div>
      )}
    </main>
  );
}
