import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { HostWindow } from '../../shared/HostWindow';
import { GlassPanel } from '../../shared/GlassPanel';
import { BackgroundPane, OrbPlane } from '../appearance/LayerStack';
import { useAppearance } from '../appearance/useAppearance';
import { DesktopResizeHandles, DesktopWindowControls } from '../desktop/DesktopChrome';
import { useWorkspace } from '../explorer/store';
import { OverviewPanel } from './OverviewPanel';
import type { OverviewWindow } from './useOverviewWindow';

function PopupContents({ target, onDock }: { target: OverviewWindow; onDock: () => void }) {
  useAppearance(target.window);
  const name = useWorkspace((s) => s.projectName);
  useEffect(() => {
    target.window.codeAtlasDesktop?.ready();
    target.window.document
      .querySelector('title')
      ?.replaceChildren(`${name} — 3D overview — Code Atlas`);
    target.root.querySelector<HTMLButtonElement>('[aria-label="Dock 3D view"]')?.focus();
  }, [name, target]);
  return (
    <HostWindow.Provider value={target.window}>
      <div className="layer-stack overview-popout">
        <BackgroundPane />
        <OrbPlane />
        <DesktopResizeHandles />
        <GlassPanel className="overview-card overview-popout-card" variant="editor">
          <OverviewPanel
            onDock={onDock}
            windowControls={<DesktopWindowControls persistOnClose={false} />}
          />
        </GlassPanel>
      </div>
    </HostWindow.Provider>
  );
}

export function OverviewPopout({ target, onDock }: { target: OverviewWindow; onDock: () => void }) {
  return createPortal(<PopupContents target={target} onDock={onDock} />, target.root);
}
