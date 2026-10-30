import { Shell } from './shared/Shell';
import { Explorer } from './features/explorer/Explorer';
import { useWorkspace } from './features/explorer/store';
import { EditorArea } from './features/editor/EditorArea';
import { useEffect } from 'react';
import { startPersistence, usePersistence } from './features/projects/persistence';
import { RunButton } from './features/runner/RunButton';
import { Console } from './features/terminal/Console';
import { RunStatus } from './features/runner/RunStatus';
import { Problems } from './features/editor/Problems';
import { FormatButton } from './features/editor/FormatButton';
import { CommandPalette } from './features/command-palette/CommandPalette';
import { SettingsDialog } from './features/settings/SettingsDialog';
import { useSettings } from './features/settings/store';
import { Settings, FolderOpen } from 'lucide-react';
import { ProjectManager } from './features/projects/ProjectManager';
import { IconButton } from './shared/IconButton';
import { useUI } from './shared/ui-store';
import { DebugControls } from './features/debugger/DebugControls';
import { Variables } from './features/debugger/Variables';
import { CallStack } from './features/debugger/CallStack';
import { languageForPath } from './core/language/adapter';
import { useCursor } from './features/editor/navigation';
import { startAppLifecycle } from './features/app/install';
import { AppControls, InstallDialog } from './features/app/AppControls';
import { useDesktopLifecycle } from './features/desktop/DesktopChrome';
import { LiveGlass } from './features/desktop/LiveGlass';

export function App() {
  useDesktopLifecycle();
  const name = useWorkspace((s) => s.projectName);
  const saved = usePersistence((s) => s.state);
  const hydrated = usePersistence((s) => s.hydrated);
  const active = useWorkspace((s) => s.active);
  const cursor = useCursor();
  const theme = useSettings((s) => s.theme);
  const transparency = useSettings((s) => s.backgroundTransparency);
  const glass = useSettings((s) => s.glassEffect);
  useEffect(() => {
    document.documentElement.dataset.glass = String(glass);
    const reduced = window.matchMedia('(prefers-reduced-transparency: reduce)');
    const sync = () =>
      window.codeAtlasDesktop?.setAppearance(glass && !reduced.matches, transparency, theme);
    sync();
    reduced.addEventListener('change', sync);
    return () => reduced.removeEventListener('change', sync);
  }, [glass, transparency, theme]);
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--workspace-opacity',
      String((100 - transparency) / 100),
    );
  }, [transparency]);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(startPersistence, []);
  useEffect(startAppLifecycle, []);
  if (!hydrated)
    return (
      <main className="restore-screen" aria-label="Code Atlas workspace">
        <span className="loading-orbit" />
        <h1>Opening your workspace</h1>
        <p>Making room for your next idea…</p>
      </main>
    );
  return (
    <>
      <LiveGlass />
      <SettingsDialog />
      <InstallDialog />
      <ProjectManager />
      <Shell
        appControls={<AppControls />}
        languageName={active ? (languageForPath(active)?.id ?? 'Plain text') : 'No file'}
        navigation={
          <>
            <IconButton
              label="Manage projects"
              onClick={() => useUI.setState({ modal: 'projects' })}
            >
              <FolderOpen size={20} />
            </IconButton>
            <IconButton
              label="Settings (Ctrl+,)"
              onClick={() => useUI.setState({ modal: 'settings' })}
            >
              <Settings size={20} />
            </IconButton>
          </>
        }
        palette={<CommandPalette />}
        explorer={<Explorer />}
        editor={<EditorArea />}
        projectName={name}
        status={
          <>
            <RunStatus />
            {active && (
              <span>
                Ln {cursor.line}, Col {cursor.column}
              </span>
            )}
            <span>{saved}</span>
          </>
        }
        actions={
          <>
            <FormatButton />
            <RunButton />
            <DebugControls />
          </>
        }
        console={<Console />}
        problems={<Problems />}
        variables={<Variables />}
        callStack={<CallStack />}
      />
    </>
  );
}
