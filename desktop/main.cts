import { app, BrowserWindow, dialog, Menu, nativeTheme, screen } from 'electron';
import { join, resolve } from 'node:path';
import { serveDesktop } from './server.js';
import { attachAppearance, desktopBlurSupported } from './appearance.cjs';
import { attachWindowControls } from './window-controls.cjs';
import { attachOverviewPopup } from './overview-popup.cjs';

app.setName('Code Atlas');
app.setPath(
  'userData',
  process.env.CODE_ATLAS_USER_DATA ?? join(app.getPath('appData'), 'Code Atlas'),
);
app.setAppUserModelId('com.codeatlas.desktop');
let window: BrowserWindow | null = null;
let origin = '';
let allowClose: (() => void) | undefined;
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
      nativeTheme.themeSource = 'dark';
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
          additionalArguments: [`--atlas-desktop-blur=${desktopBlurSupported ? 1 : 0}`],
        },
      });
      attachAppearance(window, origin);
      // Native builds serve their own complete bundle; an old PWA controller must
      // not intercept hashed runtime assets after an executable update.
      await window.webContents.session.clearStorageData({
        origin,
        storages: ['serviceworkers', 'cachestorage'],
      });
      attachOverviewPopup(window, origin, root);
      window.webContents.on('will-navigate', (event, url) => {
        if (new URL(url).origin !== origin) event.preventDefault();
      });
      window.webContents.session.setPermissionRequestHandler((_contents, _permission, callback) =>
        callback(false),
      );
      allowClose = attachWindowControls(window, origin, true);
      window.once('ready-to-show', () => {
        if (process.env.CODE_ATLAS_TEST_MODE !== '1') window?.show();
      });
      await window.loadURL(origin);
    })
    .catch((error: unknown) => {
      if (process.env.CODE_ATLAS_TEST_MODE === '1')
        console.error('Code Atlas could not open', error);
      else dialog.showErrorBox('Code Atlas could not open', String(error));
      allowClose?.();
      app.quit();
    });
}
