import { contextBridge, ipcRenderer } from 'electron';

const bridge: CodeAtlasDesktop = {
  platform: process.platform,
  minimize: () => ipcRenderer.send('atlas:window', 'minimize'),
  toggleExpand: () => ipcRenderer.send('atlas:window', 'expand'),
  close: () => ipcRenderer.send('atlas:window', 'close'),
  ready: () => ipcRenderer.send('atlas:window', 'ready'),
  onCloseRequested: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('atlas:before-close', listener);
    return () => ipcRenderer.removeListener('atlas:before-close', listener);
  },
  resize: (phase, edge, x, y) => ipcRenderer.send('atlas:resize', phase, edge, x, y),
};
contextBridge.exposeInMainWorld('codeAtlasDesktop', bridge);
