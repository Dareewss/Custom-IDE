import { Braces } from 'lucide-react';
import type { SerializedValue } from '../../core/trace/events';
import { useRunner } from '../runner/store';

function ValueRow({ name, value }: { name: string; value: SerializedValue }) {
  const row = (
    <>
      <span className="variable-name">{name}</span>
      <span className="variable-value">{value.value}</span>
      <span className="variable-type">
        {value.type}
        {value.truncated && ' · limited'}
      </span>
    </>
  );
  return value.children?.length ? (
    <details className="variable-node">
      <summary>{row}</summary>
      <div className="variable-children">
        {value.children.map((child, index) => (
          <ValueRow key={index} {...child} />
        ))}
      </div>
    </details>
  ) : (
    <div className="variable-row">{row}</div>
  );
}
export function Variables() {
  const snapshot = useRunner((s) => s.snapshot);
  if (!snapshot)
    return (
      <div className="panel-empty">
        <Braces size={16} />
        Pause at a breakpoint to inspect your variables.
      </div>
    );
  return (
    <div className="variables">
      <div className="pause-caption">
        Paused at {snapshot.location.path}:{snapshot.location.line}
      </div>
      {(['locals', 'globals'] as const).map((scope) => (
        <details open key={scope} className="variable-scope">
          <summary>
            {scope.toUpperCase()}
            <span>{Object.keys(snapshot[scope]).length}</span>
          </summary>
          {Object.entries(snapshot[scope]).map(([name, value]) => (
            <ValueRow key={name} name={name} value={value} />
          ))}
          {!Object.keys(snapshot[scope]).length && (
            <p className="padded muted">No variables in this scope.</p>
          )}
        </details>
      ))}
    </div>
  );
}
