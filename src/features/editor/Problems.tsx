import { CircleCheck, CircleAlert } from 'lucide-react';
import { useDiagnostics } from './diagnostics';
import { useWorkspace } from '../explorer/store';
import { navigateTo } from './navigation';

export function Problems() {
  const { syntax, runtime } = useDiagnostics();
  const tree = useWorkspace((s) => s.tree);
  const problems = [...Object.values(syntax).flat(), ...runtime].filter(
    (d) => tree[d.path]?.kind === 'file',
  );
  return problems.length ? (
    <div className="problems-list">
      {problems.map((problem, index) => (
        <button key={index} onClick={() => navigateTo(problem)}>
          <CircleAlert size={13} />
          <span>
            {problem.message}
            <small>
              {problem.path}:{problem.line}:{problem.column} · {problem.source}
            </small>
          </span>
        </button>
      ))}
    </div>
  ) : (
    <div className="panel-empty">
      <CircleCheck size={15} />
      No problems. Keep building.
    </div>
  );
}
