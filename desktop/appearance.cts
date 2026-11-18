import { app, ipcMain, nativeTheme, type BrowserWindow } from 'electron';
import { existsSync } from 'node:fs';
import { release } from 'node:os';
import { join } from 'node:path';
import { createBlurQueue, setNativeDesktopBlur } from './native-blur.js';

const helper = app.isPackaged
  ? join(process.resourcesPath, 'app.asar.unpacked', 'desktop', 'native-blur.exe')
  : join(__dirname, 'native-blur.exe');
export const desktopBlurSupported =
  process.platform === 'win32' && Number(release().split('.')[2]) >= 17763 && existsSync(helper);

const requests = new Map<BrowserWindow, (enabled: boolean) => Promise<boolean>>();
ipcMain.handle('atlas:desktop-blur', (event, enabled: unknown) => {
  for (const [window, apply] of requests) {
    if (
      !window.isDestroyed() &&
      event.sender === window.webContents &&
      event.senderFrame === window.webContents.mainFrame &&
      typeof enabled === 'boolean'
    )
      return apply(enabled);
  }
  throw new Error('Invalid appearance request');
});

export function attachAppearance(window: BrowserWindow, origin: string) {
  let desired = false;
  let applied: boolean | undefined;
  const enqueue = createBlurQueue();
  const trusted = (event: Pick<Electron.IpcMainEvent, 'sender' | 'senderFrame'>) =>
    event.sender === window.webContents &&
    event.senderFrame === window.webContents.mainFrame &&
    event.senderFrame.url.startsWith(`${origin}/`);
  const setTheme = (event: Electron.IpcMainEvent, value: unknown) => {
    if (!trusted(event) || (value !== 'dark' && value !== 'light')) return;
    nativeTheme.themeSource = value;
  };
  const apply = async (enabled: boolean, force = false) => {
    if (window.isDestroyed()) return false;
    if (applied === enabled && !force) return enabled;
    try {
      // Remove the system material, whose fixed tint obscures the desktop.
      window.setBackgroundMaterial('none');
      window.setBackgroundColor('#00000000');
      const result = await setNativeDesktopBlur(
        helper,
        window.getNativeWindowHandle(),
        process.pid,
        enabled,
      );
      applied = result;
      return result;
    } catch (error) {
      applied = undefined;
      if (!window.isDestroyed()) {
        await setNativeDesktopBlur(
          helper,
          window.getNativeWindowHandle(),
          process.pid,
          false,
        ).catch(() => {});
      }
      throw new Error(`Desktop blur could not be applied: ${String(error)}`, { cause: error });
    }
  };
  const reapply = () => {
    if (!desired || !desktopBlurSupported) return;
    void enqueue(() => (desired ? apply(true, true) : Promise.resolve(false))).catch(
      (error: unknown) => {
        if (!window.isDestroyed())
          window.webContents.send('atlas:desktop-blur-error', String(error));
      },
    );
  };
  ipcMain.on('atlas:theme', setTheme);
  requests.set(window, (enabled) => {
    if (!window.webContents.getURL().startsWith(`${origin}/`))
      throw new Error('Invalid appearance request');
    if (!desktopBlurSupported) return Promise.resolve(false);
    desired = enabled;
    return enqueue(() => apply(enabled));
  });
  window.on('show', reapply);
  window.on('restore', reapply);
  window.on('closed', () => {
    ipcMain.removeListener('atlas:theme', setTheme);
    requests.delete(window);
  });
}
