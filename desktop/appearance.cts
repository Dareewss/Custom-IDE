import { ipcMain, nativeTheme, type BrowserWindow } from 'electron';
import { release } from 'node:os';

export const desktopBlurSupported =
  process.platform === 'win32' && Number(release().split('.')[2]) >= 22621;

export function attachAppearance(window: BrowserWindow, origin: string) {
  let theme: 'dark' | 'light' = 'dark';
  let blur = false;
  const trusted = (event: Pick<Electron.IpcMainEvent, 'sender' | 'senderFrame'>) =>
    event.sender === window.webContents &&
    event.senderFrame === window.webContents.mainFrame &&
    event.senderFrame.url.startsWith(`${origin}/`);
  const setTheme = (event: Electron.IpcMainEvent, value: unknown) => {
    if (!trusted(event) || (value !== 'dark' && value !== 'light')) return;
    theme = value;
    nativeTheme.themeSource = blur ? 'light' : theme;
  };
  ipcMain.on('atlas:theme', setTheme);
  ipcMain.handle('atlas:desktop-blur', (event, enabled: unknown) => {
    if (!trusted(event) || typeof enabled !== 'boolean')
      throw new Error('Invalid appearance request');
    if (!desktopBlurSupported) return false;
    try {
      if (blur !== enabled) window.setBackgroundMaterial(enabled ? 'acrylic' : 'none');
      blur = enabled;
      // Keep the OS backing light/colorless; renderer theme colors remain explicit.
      nativeTheme.themeSource = blur ? 'light' : theme;
      return blur;
    } catch (error) {
      blur = false;
      nativeTheme.themeSource = theme;
      try {
        window.setBackgroundMaterial('none');
      } catch {
        /* CSS backing remains available. */
      }
      throw new Error(`Desktop blur could not be applied: ${String(error)}`, { cause: error });
    }
  });
  window.on('closed', () => {
    ipcMain.removeListener('atlas:theme', setTheme);
    ipcMain.removeHandler('atlas:desktop-blur');
  });
}
