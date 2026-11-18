import { useEffect, type PointerEvent } from 'react';
import { Minus, X, Expand } from 'lucide-react';
import { IconButton } from '../../shared/IconButton';
import { persistCurrent } from '../projects/persistence';
import { useUI } from '../../shared/ui-store';
import './desktop.css';
import { useHostWindow } from '../../shared/HostWindow';

export function useDesktopLifecycle() {
  useEffect(() => {
    const desktop = window.codeAtlasDesktop;
    if (!desktop) return;
    document.documentElement.dataset.desktop = 'true';
    const unsubscribe = desktop.onCloseRequested(() => {
      void persistCurrent().then(desktop.close).catch(useUI.getState().reportError);
    });
    desktop.ready();
    return unsubscribe;
  }, []);
}

export function DesktopWindowControls({ persistOnClose = true }: { persistOnClose?: boolean }) {
  const desktop = useHostWindow().codeAtlasDesktop;
  if (!desktop) return null;
  return (
    <div className="desktop-window-controls" aria-label="Window controls">
      <IconButton label="Minimize window" onClick={desktop.minimize}>
        <Minus size={16} />
      </IconButton>
      <IconButton label="Expand or restore window" onClick={desktop.toggleExpand}>
        <Expand size={15} />
      </IconButton>
      <IconButton
        label="Close window"
        onClick={() =>
          persistOnClose
            ? void persistCurrent().then(desktop.close).catch(useUI.getState().reportError)
            : desktop.close()
        }
      >
        <X size={17} />
      </IconButton>
    </div>
  );
}

export function DesktopResizeHandles() {
  const host = useHostWindow();
  if (!host.codeAtlasDesktop) return null;
  const resize = (
    event: PointerEvent<HTMLDivElement>,
    phase: 'start' | 'move' | 'end',
    edge: DesktopResizeEdge,
  ) => {
    if (phase === 'move' && !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (phase === 'start') event.currentTarget.setPointerCapture(event.pointerId);
    host.codeAtlasDesktop?.resize(phase, edge, event.screenX, event.screenY);
    if (phase === 'end' && event.currentTarget.hasPointerCapture(event.pointerId))
      event.currentTarget.releasePointerCapture(event.pointerId);
  };
  return (['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'] as const).map((edge) => (
    <div
      key={edge}
      aria-hidden="true"
      className={`desktop-resize edge-${edge}`}
      onPointerDown={(e) => resize(e, 'start', edge)}
      onPointerMove={(e) => resize(e, 'move', edge)}
      onPointerUp={(e) => resize(e, 'end', edge)}
      onPointerCancel={(e) => resize(e, 'end', edge)}
    />
  ));
}
