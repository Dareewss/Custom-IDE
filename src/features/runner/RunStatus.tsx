import { useEffect, useState } from 'react';
import { useRunner } from './store';

export function RunStatus() {
  const { status, elapsed, startedAt, exitCode, awaitingInput } = useRunner();
  const [now, setNow] = useState(Date.now);
  const busy = status === 'running' || status === 'loading';
  useEffect(() => {
    if (!busy) return;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [busy]);
  return (
    <span role="status" className={`run-status ${status}`}>
      {awaitingInput
        ? 'Waiting for input'
        : status === 'loading'
          ? 'Loading Python'
          : status === 'idle'
            ? 'Ready'
            : status[0].toUpperCase() + status.slice(1)}
      {status !== 'idle' &&
        status !== 'loading' &&
        ` · ${((busy ? Math.max(0, now - startedAt) : elapsed) / 1000).toFixed(2)}s`}
      {exitCode !== null && ` · exit ${exitCode}`}
    </span>
  );
}
