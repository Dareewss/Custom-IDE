import { Layers } from 'lucide-react';
import { useRunner } from '../runner/store';
import { navigateTo } from '../editor/navigation';
export function CallStack() {
  const snapshot = useRunner((s) => s.snapshot);
  return snapshot ? (
    <div className="call-stack">
      {snapshot.stack.map((frame, index) => (
        <button key={index} onClick={() => navigateTo(frame.location)}>
          <span className="frame-index">{index}</span>
          <strong>{frame.name}</strong>
          <span>
            {frame.location.path}:{frame.location.line}
          </span>
        </button>
      ))}
    </div>
  ) : (
    <div className="panel-empty">
      <Layers size={16} />
      The call stack appears when execution pauses.
    </div>
  );
}
