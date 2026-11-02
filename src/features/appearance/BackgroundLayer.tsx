import { useSyncExternalStore } from 'react';
import './background.css';

const subscribeVisibility = (notify: () => void) => {
  document.addEventListener('visibilitychange', notify);
  return () => document.removeEventListener('visibilitychange', notify);
};
const isHidden = () => document.visibilityState === 'hidden';

export function BackgroundLayer() {
  const hidden = useSyncExternalStore(subscribeVisibility, isHidden, () => false);
  return (
    <div className="scene" data-paused={hidden} aria-hidden="true">
      <svg className="scene-facets" viewBox="0 0 1600 1000" preserveAspectRatio="none">
        <path d="M0 0h440L90 360ZM440 0l310 330L90 360ZM440 0h780L750 330ZM1220 0h380v430L750 330ZM0 0l90 360L0 790ZM90 360l660-30-390 460ZM750 330l850 100-590 430ZM90 360l270 430L0 790ZM0 790l360 0L40 1000H0ZM360 790l650 70-970 140ZM750 330l260 530-650-70ZM1010 860l590-430v570H40Z" />
      </svg>
      {[1, 2, 3, 4, 5].map((shape) => (
        <div key={shape} className={`scene-shape scene-shape-${shape}`} />
      ))}
    </div>
  );
}
