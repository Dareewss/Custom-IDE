import { ipcMain, screen, type BrowserWindow, type Rectangle } from 'electron';

export function attachWindowControls(
  window: BrowserWindow,
  origin: string,
  persistOnClose: boolean,
  minWidth = 800,
  minHeight = 560,
) {
  let allowClose = false;
  let rendererReady = false;
  let normalBounds: Rectangle | null = null;
  let resizing: { edge: string; x: number; y: number; bounds: Rectangle } | null = null;
  const trusted = (event: Electron.IpcMainEvent) =>
    window &&
    event.sender === window.webContents &&
    event.senderFrame === window.webContents.mainFrame &&
    event.senderFrame.url.startsWith(`${origin}/`);
  const publishVisibility = () => {
    if (window && !window.isDestroyed() && !window.webContents.isDestroyed())
      window.webContents.send('atlas:visibility', window.isVisible() && !window.isMinimized());
  };
  window.on('show', publishVisibility);
  window.on('hide', publishVisibility);
  window.on('minimize', publishVisibility);
  window.on('restore', publishVisibility);
  const onWindow = (event: Electron.IpcMainEvent, action: unknown) => {
    if (!trusted(event) || !window) return;
    if (action === 'ready') {
      rendererReady = true;
      publishVisibility();
    }
    if (action === 'minimize') window.minimize();
    if (action === 'focus' && process.env.CODE_ATLAS_TEST_MODE !== '1') {
      if (window.isMinimized()) window.restore();
      window.focus();
    }
    if (action === 'close') {
      allowClose = true;
      window.close();
    }
    if (action === 'expand') {
      if (normalBounds) {
        window.setBounds(normalBounds);
        normalBounds = null;
      } else {
        normalBounds = window.getBounds();
        window.setBounds(screen.getDisplayMatching(normalBounds).workArea);
      }
    }
  };
  ipcMain.on('atlas:window', onWindow);
  // Manual edge resizing preserves WS_EX_LAYERED; native thick frames remove alpha on Windows.
  const onResize = (
    event: Electron.IpcMainEvent,
    phase: unknown,
    edge: unknown,
    x: unknown,
    y: unknown,
  ) => {
    if (
      !trusted(event) ||
      !window ||
      typeof edge !== 'string' ||
      !['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'].includes(edge) ||
      typeof x !== 'number' ||
      typeof y !== 'number' ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    )
      return;
    if (phase === 'end') {
      resizing = null;
      return;
    }
    if (phase === 'start') {
      normalBounds = null;
      resizing = { edge, x, y, bounds: window.getBounds() };
    } else if (phase === 'move' && resizing && resizing.edge === edge) {
      const b = resizing.bounds;
      const dx = x - resizing.x;
      const dy = y - resizing.y;
      const width = Math.max(
        minWidth,
        Math.min(7680, b.width + (edge.includes('w') ? -dx : edge.includes('e') ? dx : 0)),
      );
      const height = Math.max(
        minHeight,
        Math.min(4320, b.height + (edge.includes('n') ? -dy : edge.includes('s') ? dy : 0)),
      );
      window.setBounds({
        x: edge.includes('w') ? b.x + b.width - width : b.x,
        y: edge.includes('n') ? b.y + b.height - height : b.y,
        width,
        height,
      });
    }
  };
  ipcMain.on('atlas:resize', onResize);
  window.on('close', (event) => {
    if (persistOnClose && !allowClose && rendererReady && !window?.webContents.isDestroyed()) {
      event.preventDefault();
      window?.webContents.send('atlas:before-close');
    }
  });
  window.webContents.on('render-process-gone', () => {
    rendererReady = false;
  });

  window.on('closed', () => {
    ipcMain.removeListener('atlas:window', onWindow);
    ipcMain.removeListener('atlas:resize', onResize);
  });
  return () => {
    allowClose = true;
  };
}
