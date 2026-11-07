import { contextBridge, ipcRenderer } from 'electron';

const bridge: CodeAtlasDesktop = {
  platform: process.platform,
  supportsDesktopBlur: process.argv.includes('--atlas-desktop-blur=1'),
  setDesktopBlur: (enabled) => ipcRenderer.invoke('atlas:desktop-blur', enabled),
  onDesktopBlurError: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, message: string) => callback(message);
    ipcRenderer.on('atlas:desktop-blur-error', listener);
    return () => ipcRenderer.removeListener('atlas:desktop-blur-error', listener);
  },
  setTheme: (theme) => ipcRenderer.send('atlas:theme', theme),
  minimize: () => ipcRenderer.send('atlas:window', 'minimize'),
  focus: () => ipcRenderer.send('atlas:window', 'focus'),
  toggleExpand: () => ipcRenderer.send('atlas:window', 'expand'),
  close: () => ipcRenderer.send('atlas:window', 'close'),
  ready: () => ipcRenderer.send('atlas:window', 'ready'),
  onVisibilityChanged: (callback) => {
    const listener = (_event: Electron.IpcRendererEvent, visible: boolean) => callback(visible);
    ipcRenderer.on('atlas:visibility', listener);
    return () => ipcRenderer.removeListener('atlas:visibility', listener);
  },
  onCloseRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('atlas:before-close', listener);
    return () => ipcRenderer.removeListener('atlas:before-close', listener);
  },
  resize: (phase, edge, x, y) => ipcRenderer.send('atlas:resize', phase, edge, x, y),
};
contextBridge.exposeInMainWorld('codeAtlasDesktop', bridge);
