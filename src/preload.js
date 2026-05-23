const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  // Generic Toggle Function
  toggleProjection: (data) => ipcRenderer.send('toggle-projection', data),
  // Listener kalau window ketutup sendiri
  onProjectionClosed: (callback) => ipcRenderer.on('projection-closed', (_event, value) => callback(value)),
  relaunchApp: () => ipcRenderer.send('relaunch-app'),
  testDisplays: () => ipcRenderer.send('test-displays'),
  // Buka link di browser sistem (Chrome/Edge), bukan di sub-window Electron
  openExternal: (url) => ipcRenderer.send('open-external', url)
});