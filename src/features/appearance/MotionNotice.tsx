import { useMotionBudget, retryOrbMotion } from './motion-budget';
import { useSettings } from '../settings/store';
import { usePageVisible } from './visibility';

export function MotionNotice() {
  const fps = useMotionBudget((s) => s.fps);
  const animation = useSettings((s) => s.backgroundAnimation);
  const orbs = useSettings((s) => s.backgroundBlobs);
  const performanceMode = useSettings((s) => s.performanceMode);
  const visible = usePageVisible();
  if (fps !== 0 || !animation || !orbs || !visible || performanceMode) return null;
  return (
    <aside className="motion-notice glass glass--popover" role="note" aria-live="polite">
      <span>Orb animation paused to keep the editor responsive.</span>
      <button type="button" className="secondary-button" onClick={retryOrbMotion}>
        Resume animation
      </button>
    </aside>
  );
}
