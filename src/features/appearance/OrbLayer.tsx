import { useRef } from 'react';
import { usePageVisible } from './visibility';
import { useOrbMotion } from './useOrbMotion';

export function OrbLayer() {
  const ref = useRef<HTMLDivElement>(null);
  const visible = usePageVisible();
  useOrbMotion(ref, visible);
  return (
    <div ref={ref} className="scene orb-layer" data-paused={!visible} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((shape) => (
        <div key={shape} className={`scene-shape scene-shape-${shape}`} />
      ))}
    </div>
  );
}
