import { useLayoutEffect, type ReactNode } from 'react';
import { BackgroundLayer } from './BackgroundLayer';
import { debugLayers } from './layers';

export function BackgroundPane() {
  return <div className="background-pane" data-layer="backing" aria-hidden="true" />;
}

export function OrbPlane() {
  return (
    <div className="orb-plane" data-layer="orbs" aria-hidden="true">
      <BackgroundLayer />
    </div>
  );
}

export function LayerStack({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    const flags = debugLayers(window.location.search, import.meta.env.DEV);
    for (const [name, enabled] of Object.entries(flags))
      document.documentElement.setAttribute(`data-layer-${name}`, String(enabled));
  }, []);
  return (
    <div className="layer-stack">
      <BackgroundPane />
      <OrbPlane />
      {children}
    </div>
  );
}
