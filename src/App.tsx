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

export function App() {
  const name = useWorkspace((s) => s.projectName);
  const saved = usePersistence((s) => s.state);
  const theme = useSettings((s) => s.theme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  useEffect(startPersistence, []);
  return (
    <>
      <SettingsDialog />
      <ProjectManager />
      <Shell
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
