import { Play, StepForward } from 'lucide-react';
import { continueRun, useRunner } from '../runner/store';
import { IconButton } from '../../shared/IconButton';
export function DebugControls() {
  const paused = useRunner((s) => s.status === 'paused');
  return paused ? (
    <>
      <button className="run-button" onClick={() => continueRun()}>
        <Play size={12} />
        Continue
      </button>
      <IconButton label="Step Over (F10)" onClick={() => continueRun(true)}>
        <StepForward size={15} />
      </IconButton>
    </>
  ) : null;
}
