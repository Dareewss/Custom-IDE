import { useSyncExternalStore } from 'react';

const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
};
const isHidden = () => document.visibilityState === 'hidden';

export function OrbLayer() {
  const hidden = useSyncExternalStore(subscribeVisibility, isHidden, () => false);
  return (
    <div className="scene orb-layer" data-paused={hidden} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((shape) => (
        <div key={shape} className={`scene-shape scene-shape-${shape}`} />
      ))}
    </div>
  );
}
