import { Shell } from './shared/Shell';
import { Explorer } from './features/explorer/Explorer';
import { useWorkspace } from './features/explorer/store';
import { EditorArea } from './features/editor/EditorArea';
import { useEffect } from 'react';
import { startPersistence, usePersistence } from './features/projects/persistence';
import { RunButton } from './features/runner/RunButton';
import { Console } from './features/terminal/Console';

export function App() {
  const name = useWorkspace((s) => s.projectName);
  const saved = usePersistence((s) => s.state);
  useEffect(startPersistence, []);
  return (
    <Shell
      explorer={<Explorer />}
      editor={<EditorArea />}
      projectName={name}
      status={<span>{saved}</span>}
      actions={<RunButton />}
      console={<Console />}
    />
  );
}
