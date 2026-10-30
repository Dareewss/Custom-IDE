import { Play, Square, RotateCcw } from 'lucide-react';
import { useWorkspace } from '../explorer/store';
import { runActive, stopRun, restartRun, useRunner } from './store';
import { IconButton } from '../../shared/IconButton';
import { languageForPath } from '../../core/language/adapter';

export function RunButton() {
  const active = useWorkspace((s) => s.active);
  const status = useRunner((s) => s.status);
  return (
    <>
      <IconButton
        label="Restart (Ctrl+Shift+F5)"
        disabled={!active || !languageForPath(active)?.runner}
        onClick={() => void restartRun()}
      >
        <RotateCcw size={14} />
      </IconButton>
      <IconButton
        label="Stop (Shift+F5)"
        disabled={status !== 'running' && status !== 'loading'}
        onClick={stopRun}
      >
        <Square size={12} fill="currentColor" />
      </IconButton>
      {
        <button
          className="run-button"
          disabled={
            !active ||
            !languageForPath(active)?.runner ||
            status === 'loading' ||
            status === 'running'
          }
          onClick={() => void runActive()}
        >
          <Play size={12} fill="currentColor" />
          {status === 'loading' ? 'Loading Python…' : 'Run file'}
        </button>
      }
    </>
  );
}
