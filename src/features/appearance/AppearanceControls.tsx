import { Orbit, Pause, Play } from 'lucide-react';
import { useSettings } from '../settings/store';
import { IconButton } from '../../shared/IconButton';
import { useReducedMotionPreference, useReducedTransparency } from './preferences';

export function AppearanceControls() {
  const animation = useSettings((s) => s.backgroundAnimation);
  const orbs = useSettings((s) => s.backgroundBlobs);
  const performanceMode = useSettings((s) => s.performanceMode);
  const reduced = useReducedMotionPreference();
  const reducedTransparency = useReducedTransparency();
  const blocked = reduced || reducedTransparency || performanceMode;
  return (
    <div className="appearance-controls" role="group" aria-label="Background effects">
      <IconButton
        label="Toggle orb animation"
        title={
          blocked
            ? 'Animation paused by system preferences or Performance mode'
            : animation
              ? 'Pause orb animation'
              : 'Play orb animation'
        }
        aria-pressed={animation && !blocked}
        disabled={blocked}
        onClick={() => useSettings.getState().setSetting('backgroundAnimation', !animation)}
      >
        {animation && !blocked ? <Pause size={14} /> : <Play size={14} />}
      </IconButton>
      <IconButton
        label="Toggle orbs"
        title={
          reducedTransparency
            ? 'Orbs hidden by reduced transparency'
            : orbs
              ? 'Hide orbs'
              : 'Show orbs'
        }
        aria-pressed={orbs && !reducedTransparency}
        disabled={reducedTransparency}
        onClick={() => useSettings.getState().setSetting('backgroundBlobs', !orbs)}
      >
        <Orbit size={16} />
      </IconButton>
    </div>
  );
}
