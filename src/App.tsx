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

export function App() {
  const name = useWorkspace((s) => s.projectName);
  const saved = usePersistence((s) => s.state);
  useEffect(startPersistence, []);
  return (
    <Shell
      explorer={<Explorer />}
      editor={<EditorArea />}
      projectName={name}
      status={
        <>
          <RunStatus />
          <span>{saved}</span>
        </>
      }
      actions={<RunButton />}
      console={<Console />}
      problems={<Problems />}
    />
  );
}
