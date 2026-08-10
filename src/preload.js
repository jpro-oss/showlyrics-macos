const { contextBridge, ipcRenderer, webUtils } = require('electron');

// 🎯 WRAP navigator.mediaDevices untuk Electron
// Preload punya akses ke browser globals, jadi bisa direct wrap navigator
const mediaDevicesProxy = {
  async enumerateDevices() {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        return await navigator.mediaDevices.enumerateDevices();
      }
      console.error("navigator.mediaDevices not available");
      return [];
    } catch (err) {
      console.error("enumerateDevices error:", err);
      throw err;
    }
  },
  async getUserMedia(constraints) {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        return await navigator.mediaDevices.getUserMedia(constraints);
      }
      console.error("navigator.mediaDevices not available");
      throw new Error("getUserMedia not available");
    } catch (err) {
      console.error("getUserMedia error:", err);
      throw err;
    }
  },
  addEventListener(type, listener) {
    if (navigator.mediaDevices && navigator.mediaDevices.addEventListener) {
      return navigator.mediaDevices.addEventListener(type, listener);
    }
  },
  removeEventListener(type, listener) {
    if (navigator.mediaDevices && navigator.mediaDevices.removeEventListener) {
      return navigator.mediaDevices.removeEventListener(type, listener);
    }
  }
};

contextBridge.exposeInMainWorld('electronAPI', {
  getDisplays: () => ipcRenderer.invoke('get-displays'),
  exportScheduleElectron: (schedName) => ipcRenderer.invoke('export-schedule-electron', { schedName }),
  // Generic Toggle Function
  toggleProjection: (data) => ipcRenderer.send('toggle-projection', data),
  // Listener kalau window ketutup sendiri
  onProjectionClosed: (callback) => ipcRenderer.on('projection-closed', (_event, value) => callback(value)),
  relaunchApp: () => {
    try {
      ipcRenderer.send('relaunch-app');
    } catch (err) {
      console.error('[preload] relaunchApp failed:', err);
    }
  },
  testDisplays: () => ipcRenderer.send('test-displays'),
  // Buka link di browser sistem (Chrome/Edge), bukan di sub-window Electron
  openExternal: (url) => ipcRenderer.send('open-external', url),
  // Set custom resolution for a projector window (applies CSS scale transform)
  setOutputResolution: (data) => ipcRenderer.send('set-output-resolution', data),
  
  // 🎯 CAMERA API (For Electron environment)
  requestCameraPermission: () => ipcRenderer.invoke('request-camera-permission'),
  mediaDevices: mediaDevicesProxy,
  
  // Expose webUtils to get real file paths from File objects in drag-and-drop
  getFilePath: (file) => webUtils ? webUtils.getPathForFile(file) : '',

  // 🔍 UI ZOOM: Set zoom factor pada controller window via main process
  // Mengubah layout viewport secara nyata (bukan CSS transform).
  // Projector window tidak terpengaruh — webContents-nya terpisah dan dikunci di 1.0.
  setControllerZoom: (factor) => ipcRenderer.send('set-controller-zoom', factor),

  // 🎨 WINDOW BACKGROUND COLOR: Ubah warna background window Electron secara dynamic & realtime
  setWindowBackgroundColor: (color) => ipcRenderer.send('set-window-background-color', color),
});
