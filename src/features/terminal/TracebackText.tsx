import type { ReactNode } from 'react';
import { parseTraceback } from '../../core/language/traceback';
import { useWorkspace } from '../explorer/store';
import { navigateTo } from '../editor/navigation';

export function TracebackText({ text }: { text: string }) {
  const tree = useWorkspace((s) => s.tree);
  const parts: ReactNode[] = [];
  let offset = 0;
  for (const frame of parseTraceback(text)) {
    if (tree[frame.path]?.kind !== 'file') continue;
    parts.push(text.slice(offset, frame.start));
    parts.push(
      <button
        key={frame.start}
        className="trace-link"
        onClick={() => navigateTo(frame)}
        title={`Open ${frame.path}:${frame.line}:${frame.column}`}
      >
        {frame.text}
      </button>,
    );
    offset = frame.end;
  }
  parts.push(text.slice(offset));
  return <>{parts}</>;
}
