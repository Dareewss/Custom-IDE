import { type BrowserWindow } from 'electron';
import { join } from 'node:path';
import { attachAppearance, desktopBlurSupported } from './appearance.cjs';
import { attachWindowControls } from './window-controls.cjs';

export function attachOverviewPopup(parent: BrowserWindow, origin: string, root: string) {
  let child: BrowserWindow | null = null;
  const url = `${origin}/overview-window.html`;
  parent.webContents.setWindowOpenHandler((details) => {
    if (
      details.url !== url ||
      details.frameName !== 'atlas-3d-overview' ||
      details.disposition !== 'new-window'
    )
      return { action: 'deny' };
    if (child && !child.isDestroyed()) return { action: 'deny' };
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        title: '3D overview — Code Atlas',
        width: 1000,
        height: 760,
        minWidth: 480,
        minHeight: 360,
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
      },
    };
  });
  parent.webContents.on('did-create-window', (popup) => {
    child = popup;
    attachAppearance(popup, origin);
    attachWindowControls(popup, origin, false, 480, 360);
    popup.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
    popup.webContents.on('will-navigate', (event, destination) => {
      if (destination !== url) event.preventDefault();
    });
    popup.webContents.on('will-redirect', (event) => event.preventDefault());
    popup.once('ready-to-show', () => {
      if (process.env.CODE_ATLAS_TEST_MODE !== '1') popup.show();
    });
    popup.on('closed', () => {
      child = null;
    });
  });
  parent.on('closed', () => {
    if (child && !child.isDestroyed()) child.destroy();
  });
}
