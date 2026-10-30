import { Shell } from './shared/Shell';
import { Explorer } from './features/explorer/Explorer';
import { useWorkspace } from './features/explorer/store';

export function App() {
  const name = useWorkspace((s) => s.projectName);
  return <Shell explorer={<Explorer />} projectName={name} />;
}
