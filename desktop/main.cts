import { app, BrowserWindow, dialog, ipcMain, Menu, screen, type Rectangle } from 'electron';
import { join, resolve } from 'node:path';
import { serveDesktop } from './server.js';

app.setName('Code Atlas');
app.setPath(
  'userData',
  process.env.CODE_ATLAS_USER_DATA ?? join(app.getPath('appData'), 'Code Atlas'),
);
app.setAppUserModelId('com.codeatlas.desktop');
let window: BrowserWindow | null = null;
let origin = '';
let allowClose = false;
let rendererReady = false;
let normalBounds: Rectangle | null = null;
let resizing: { edge: string; x: number; y: number; bounds: Rectangle } | null = null;
let stopServer: (() => void) | undefined;

if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => {
    if (window?.isMinimized()) window.restore();
    window?.focus();
  });
  app.on('window-all-closed', () => app.quit());
  app.on('will-quit', () => stopServer?.());
  void app
    .whenReady()
    .then(async () => {
      const root =
        process.env.CODE_ATLAS_TEST_MODE === '1' && process.env.CODE_ATLAS_ASSETS_DIR
          ? resolve(process.env.CODE_ATLAS_ASSETS_DIR)
          : resolve(__dirname, '../dist');
      const port = Number(process.env.CODE_ATLAS_PORT ?? 47831);
      const local = await serveDesktop(root, port);
      origin = local.origin;
      stopServer = () => local.server.close();
      Menu.setApplicationMenu(null);
      const area = screen.getPrimaryDisplay().workArea;
      window = new BrowserWindow({
        title: 'Code Atlas',
        width: Math.min(1440, area.width - 64),
        height: Math.min(960, area.height - 64),
        minWidth: 800,
        minHeight: 560,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        thickFrame: false,
        resizable: false,
        maximizable: false,
        hasShadow: false,
        show: false,
        icon: join(root, 'icons/atlas-192.png'),
        webPreferences: {
          preload: join(__dirname, 'preload.cjs'),
          contextIsolation: true,
          sandbox: true,
          nodeIntegration: false,
          backgroundThrottling: process.env.CODE_ATLAS_TEST_MODE !== '1',
        },
      });
      window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
      window.webContents.on('will-navigate', (event, url) => {
        if (new URL(url).origin !== origin) event.preventDefault();
      });
      window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
        callback(false),
      );
      const trusted = (event: Electron.IpcMainEvent) =>
        window &&
        event.sender === window.webContents &&
        event.senderFrame === window.webContents.mainFrame &&
        event.senderFrame.url.startsWith(`${origin}/`);
      ipcMain.on('atlas:window', (event, action: unknown) => {
        if (!trusted(event) || !window) return;
        if (action === 'ready') rendererReady = true;
        if (action === 'minimize') window.minimize();
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
      });
      // Manual edge resizing preserves WS_EX_LAYERED; native thick frames remove alpha on Windows.
      ipcMain.on('atlas:resize', (event, phase: unknown, edge: unknown, x: unknown, y: unknown) => {
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
            800,
            Math.min(7680, b.width + (edge.includes('w') ? -dx : edge.includes('e') ? dx : 0)),
          );
          const height = Math.max(
            560,
            Math.min(4320, b.height + (edge.includes('n') ? -dy : edge.includes('s') ? dy : 0)),
          );
          window.setBounds({
            x: edge.includes('w') ? b.x + b.width - width : b.x,
            y: edge.includes('n') ? b.y + b.height - height : b.y,
            width,
            height,
          });
        }
      });
      window.on('close', (event) => {
        if (!allowClose && rendererReady && !window?.webContents.isDestroyed()) {
          event.preventDefault();
          window?.webContents.send('atlas:before-close');
        }
      });
      window.webContents.on('render-process-gone', () => {
        rendererReady = false;
      });
      window.once('ready-to-show', () => {
        if (process.env.CODE_ATLAS_TEST_MODE !== '1') window?.show();
      });
      await window.loadURL(origin);
    })
    .catch((error: unknown) => {
      dialog.showErrorBox('Code Atlas could not open', String(error));
      allowClose = true;
      app.quit();
    });
}
