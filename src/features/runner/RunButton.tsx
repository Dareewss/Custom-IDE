import { Play } from 'lucide-react';
import { useWorkspace } from '../explorer/store';
import { runActive, useRunner } from './store';
import { languageForPath } from '../../core/language/adapter';

export function RunButton() {
  const active = useWorkspace((s) => s.active);
  const status = useRunner((s) => s.status);
  return (
    <button
      className="run-button"
      disabled={
        !active || !languageForPath(active)?.runner || status === 'loading' || status === 'running'
      }
      onClick={() => void runActive()}
    >
      <Play size={12} fill="currentColor" />
      {status === 'loading' ? 'Loading Python…' : 'Run file'}
    </button>
  );
}
