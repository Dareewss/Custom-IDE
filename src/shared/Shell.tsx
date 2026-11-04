import { useSyncExternalStore, type ReactNode } from 'react';
import {
  Box,
  Files,
  Terminal,
  X,
  ChevronDown,
  Search,
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
import { AppearanceControls } from '../features/appearance/AppearanceControls';

interface ShellProps {
  languageName?: string;
  palette?: ReactNode;
  explorer?: ReactNode;
  editor?: ReactNode;
  overview?: ReactNode;
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
    { id: '3d', label: '3D', icon: <Box size={14} /> },
  ];
  return (
    <main
      className="workspace"
      data-layer="foreground"
      data-layout={ui.layout}
      aria-label="Code Atlas workspace"
    >
      <GlassPanel as="header" className="titlebar">
        <div className="brand">
          <span className="brand-symbol">
            <Box size={23} strokeWidth={1.6} />
          </span>
          <span className="brand-wordmark">
            Code Atlas<small>Personal workspace</small>
          </span>
        </div>
        <span className="header-divider" />
        <button
          className="workspace-title"
          aria-label="Manage projects"
          title="Manage projects"
          onClick={() => useUI.setState({ modal: 'projects' })}
        >
          <Box size={15} />
          <span className="project-switcher-name">{props.projectName ?? 'Untitled workspace'}</span>
          <ChevronDown size={14} />
        </button>
        <div className="header-layout">
          <div className="layout-switch" role="group" aria-label="Workspace layout">
            {layouts.map((layout) => (
              <button
                key={layout.id}
                aria-label={layout.label}
                title={`${layout.label} layout`}
                aria-pressed={ui.layout === layout.id}
                onClick={() => ui.setLayout(layout.id)}
              >
                {layout.icon}
                <span>{layout.label}</span>
              </button>
            ))}
          </div>
          <AppearanceControls />
        </div>
        <div className="header-search">{props.palette}</div>
        <div className="title-actions">
          {props.appControls}
          {!window.codeAtlasDesktop && (
            <IconButton
              label="Enter fullscreen"
              disabled={!document.fullscreenEnabled}
              onClick={() => {
                if (document.fullscreenElement)
                  void document.exitFullscreen().catch(ui.reportError);
                else void document.documentElement.requestFullscreen().catch(ui.reportError);
              }}
            >
              <Maximize2 size={16} />
            </IconButton>
          )}
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
            <IconButton label="Workbench" aria-pressed={ui.bottom} onClick={ui.toggleBottom}>
              <Terminal size={22} />
            </IconButton>
          </div>
          <div>{props.navigation}</div>
        </GlassPanel>
        <Group orientation="horizontal" className="main-group">
          {ui.sidebar && (
            <>
              <Panel defaultSize="244px" minSize="185px" maxSize="420px">
                <GlassPanel as="aside" className="sidebar">
                  <div className="section-heading">Explorer</div>
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
                <Group
                  className="source-overview-layout"
                  orientation={wide ? 'horizontal' : 'vertical'}
                >
                  {ui.layout !== '3d' && (
                    <Panel minSize={wide ? '180px' : '80px'}>
                      <GlassPanel className="editor-card" variant="editor">
                        <div className="editor-toolbar">
                          <span className="editor-section-label">
                            <Code2 size={14} />
                            <span>Workspace</span>
                            <span className="editor-language">
                              {props.languageName ?? 'Python'}
                            </span>
                          </span>
                          <div className="toolbar-actions">{props.actions}</div>
                        </div>
                        <section className="editor-surface" aria-label="Editor">
                          {props.editor}
                        </section>
                      </GlassPanel>
                    </Panel>
                  )}
                  {(ui.layout === 'split' || ui.layout === '3d') && props.overview && (
                    <>
                      {ui.layout === 'split' && (
                        <Separator
                          className={`separator ${wide ? 'vertical' : 'horizontal'}`}
                          aria-label="Resize code overview"
                        />
                      )}
                      <Panel minSize={wide ? '180px' : '80px'}>
                        <GlassPanel className="overview-card" variant="editor">
                          {props.overview}
                        </GlassPanel>
                      </Panel>
                    </>
                  )}
                </Group>
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
