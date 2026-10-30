import {
  clipboard,
  ClipboardItem,
  desktopCapturer,
  screen,
  ipcMain,
  type BrowserWindow,
  type IpcMainInvokeEvent,
} from 'electron';

export function attachDesktopGlass(window: BrowserWindow, origin: string) {
  let sequence = 0;
  let active = 0;
  const trusted = (event: IpcMainInvokeEvent) =>
    event.sender === window.webContents &&
    event.senderFrame === window.webContents.mainFrame &&
    event.senderFrame.url.startsWith(`${origin}/`);
  const geometry = (): DesktopGlassGeometry => {
    const bounds = window.getBounds();
    const display = screen.getDisplayMatching(bounds);
    return {
      displayId: String(display.id),
      x: bounds.x - display.bounds.x,
      y: bounds.y - display.bounds.y,
      displayWidth: display.bounds.width,
      displayHeight: display.bounds.height,
    };
  };
  const sync = () => {
    if (active && !window.isDestroyed())
      window.webContents.send('atlas:glass-geometry', geometry());
  };
  ipcMain.handle('atlas:glass-screenshot', async (event) => {
    if (!trusted(event)) throw new Error('Untrusted screenshot request');
    const png = (await window.capturePage()).toPNG();
    await clipboard.write([
      new ClipboardItem({ 'image/png': new Blob([new Uint8Array(png)], { type: 'image/png' }) }),
    ]);
  });
  ipcMain.handle('atlas:glass-open', async (event) => {
    if (!trusted(event) || process.platform !== 'win32')
      throw new Error('Desktop glass is unavailable');
    const session = ++sequence;
    active = session;
    // Exclusion makes Windows capture the actual windows/wallpaper behind this window,
    // rather than recursively capturing the glass renderer itself.
    window.setContentProtection(true);
    await new Promise<void>((done) => setTimeout(done, 80));
    try {
      const position = geometry();
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: 0, height: 0 },
      });
      const source = sources.find((source) => source.display_id === position.displayId);
      if (!source) throw new Error('No desktop source for this display');
      return { ...position, sourceId: source.id, session } satisfies DesktopGlassSource;
    } catch (error) {
      if (active === session) {
        active = 0;
        window.setContentProtection(false);
      }
      throw error;
    }
  });
  ipcMain.on('atlas:glass-close', (event, session: unknown) => {
    if (event.sender === window.webContents && session === active) {
      active = 0;
      window.setContentProtection(false);
    }
  });
  window.on('move', sync);
  window.on('resize', sync);
  window.on('minimize', () => window.webContents.send('atlas:glass-visible', false));
  window.on('restore', () => {
    sync();
    window.webContents.send('atlas:glass-visible', true);
  });
  window.on('closed', () => {
    ipcMain.removeHandler('atlas:glass-open');
    ipcMain.removeHandler('atlas:glass-screenshot');
  });
}
