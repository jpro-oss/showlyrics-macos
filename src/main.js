const { app, BrowserWindow, screen, ipcMain, dialog, powerSaveBlocker, shell, session } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process'); // Tambah execSync untuk hard kill
const os = require('os'); // Buat jalanin EXE
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

// Generate a secure dynamic token for backend requests
const secretToken = crypto.randomBytes(16).toString('hex');
process.env.SHOWLYRICS_SECRET = secretToken;

// Write token to WorshipEngineData/.session_token for fallback/manual backend launch
const userDocs = path.join(os.homedir(), 'Documents');
const appFolder = path.join(userDocs, 'WorshipEngineData');
const tokenFile = path.join(appFolder, '.session_token');

try {
  if (!fs.existsSync(appFolder)) {
    fs.mkdirSync(appFolder, { recursive: true });
  }
  fs.writeFileSync(tokenFile, secretToken, 'utf8');
  console.log("Secure session token stored at:", tokenFile);
} catch (err) {
  console.error("Failed to write session token:", err.message);
}

app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-oop-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

// 2. Cegah CPU mengambil alih tugas render video (Meringankan beban prosesor)
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('enable-accelerated-video-decode');
app.commandLine.appendSwitch('enable-hardware-overlays', 'preferred');
app.commandLine.appendSwitch('force-high-performance-gpu');

// 3. 🎯 FIX BUG VIDEO BERHENTI SAAT ALT-TAB ATAU MINIMIZE!
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
// 🎯 FIX CRUSIAL WINDOWS OCCLUSION & SLEEPING BACKGROUND
// Cegah Windows menghentikan engine render (freezing/patah-patah) saat window tertutup aplikasi lain atau sedang minimizer
app.commandLine.appendSwitch('disable-features', 'CalculateNativeWinOcclusion,IntensiveWakeUpThrottling');
app.commandLine.appendSwitch('enable-features', 'OverlayFullscreenVideo,DirectCompositionVideoOverlays,DirectCompositionHardwareOverlays');
// Bypass batasan browser terhadap background video
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

// 4. 🎯 CAMERA PERMISSION FIXES FOR ELECTRON
app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', 'http://localhost:18888');
app.commandLine.appendSwitch('allow-http-camera-access');

// 5. Batasi RAM untuk V8 Engine Javascript (Maksimal 2GB biar sisa RAM 8GB lega)
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=2048');



let mainWindow;
let splashWindow;
let pyProc = null; // Variable buat nyimpen proses Python

// --- FUNGSI JALANIN PYTHON ---
// --- FUNGSI JALANIN PYTHON ---
const createPyProc = () => {
  let script = path.join(process.resourcesPath, 'bin', 'ShowLyrics.exe');

  if (!app.isPackaged) {
    script = path.join(__dirname, '../bin/ShowLyrics.exe');
  }

  console.log("Starting Python Backend from:", script);

  // TAMBAHIN ARRAY KOSONG [] DAN { windowsHide: true } DI SINI 👇
  pyProc = spawn(script, [], {
    windowsHide: true,
    env: {
      ...process.env,
      SHOWLYRICS_SECRET: secretToken
    }
  });

  pyProc.stdout.on('data', (data) => {
    console.log(`Python: ${data}`);
  });

  pyProc.stderr.on('data', (data) => {
    console.error(`Python Error: ${data}`);
  });
};

// --- FUNGSI MATIKAN PYTHON ---
const exitPyProc = () => {
  try {
    if (fs.existsSync(tokenFile)) {
      fs.unlinkSync(tokenFile);
      console.log("Secure session token deleted.");
    }
  } catch (err) {}

  if (pyProc) {
    console.log("Membunuh Python Backend...");
    if (os.platform() === 'win32') {
      // JURUS SAKTI WINDOWS: Bunuh process beserta anak-anaknya secara paksa
      try {
        execSync(`taskkill /pid ${pyProc.pid} /t /f`);
      } catch (e) {
        console.log("Taskkill warning (mungkin sudah mati):", e.message);
      }
    } else {
      pyProc.kill();
    }
    pyProc = null;
    console.log("Python Backend BENAR-BENAR MATI.");
  }
};

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 450,
    height: 300,
    transparent: true,      // Background tembus pandang
    frame: false,           // Gak ada bar minimize/close
    alwaysOnTop: true,      // Selalu di atas
    show: false,            // Render dulu baru ditampilin biar gak kedip
    webPreferences: {
      nodeIntegration: false
    }
  });

  // Load UI Loading Screen
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
    checkBackendAndLoad(); // Mulai proses Ping!
  });
}

// --- FUNGSI PING (NUNGGU SERVER NYALA) ---
// --- FUNGSI PING (NUNGGU SERVER NYALA) ---
function checkBackendAndLoad() {
  console.log("Mencari sinyal dari 127.0.0.1:18888...");

  // Nembak ke server tiap 0.5 detik (500ms)
  const pingInterval = setInterval(() => {
    // PENTING: Pake 127.0.0.1 biar gak bentrok IPv6 Node.js vs IPv4 Python
    const options = {
      headers: {
        'X-ShowLyrics-Secret': secretToken
      }
    };
    http.get('http://127.0.0.1:18888/', options, (res) => {

      // Terima status 200 (OK) atau 3xx (Redirect)
      if (res.statusCode >= 200 && res.statusCode < 400) {
        clearInterval(pingInterval); // Stop ping
        console.log("Server Ditemukan! Membuka Controller...");

        createMainWindow();
      }
    }).on('error', (err) => {
      // Server belum nyala (Connection Refused), diem aja nunggu ping selanjutnya...
      // console.log("Menunggu server...");
    });
  }, 500);
}

// --- STARTUP ELECTRON ---
app.whenReady().then(() => {
  // Register header interceptor to secure Python backend pages
  const filter = {
    urls: [
      'http://localhost/*',
      'http://127.0.0.1/*'
    ]
  };

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    if (details.url.startsWith('http://localhost:18888') || details.url.startsWith('http://127.0.0.1:18888')) {
      details.requestHeaders['X-ShowLyrics-Secret'] = secretToken;
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  // 🎯 CAMERA PERMISSION HANDLER (Auto-grant camera & microphone access)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log(`[Default Session] Permission requested: ${permission}`);
    if (permission === 'camera' || permission === 'microphone' || permission === 'mediaStream' || permission === 'video' || permission === 'audio' || permission === 'media') {
      console.log(`[Default Session] Granting ${permission} permission for camera panel`);
      callback(true); // Auto-grant permission
    } else {
      console.log(`[Default Session] Denying ${permission} permission`);
      callback(false); // Deny other permissions
    }
  });

  // 🎯 Set device permission handler for default session
  session.defaultSession.setDevicePermissionHandler((details, callback) => {
    console.log(`[Default Session] Device permission requested for:`, details.deviceType);
    if (details.deviceType === 'camera' || details.deviceType === 'microphone') {
      console.log(`[Default Session] Granting device permission for ${details.deviceType}`);
      callback(true); // Auto-grant device permission
    } else {
      callback(false); // Deny other device permissions
    }
  });

  // 🚀 ANTI-SLEEP ENGINE: Tahan sistem OS dan GPU agar tidak iddle/sleep selama aplikasi ibadah on duty!
  powerSaveBlocker.start('prevent-display-sleep');
  powerSaveBlocker.start('prevent-app-suspension');

  createPyProc();

  // JANGAN PAKE SET_TIMEOUT LAGI, LANGSUNG BUKA SPLASH SCREEN!
  createSplashWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && !splashWindow) {
      createMainWindow();
    }
  });
});
// Matikan Python pas aplikasi ditutup
app.on('will-quit', exitPyProc);

let projectorWindows = {
  main: null,
  lt: null,
  fb: null
};

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 720,
    title: "ShowLyrics Controller",
    icon: path.join(__dirname, 'app.ico'),
    show: false, // <--- 1. TAMBAHIN INI (Tahan dulu layarnya)
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,
      sandbox: false,
      webSecurity: false,
      enableRemoteModule: false,
      allowRunningInsecureContent: true
    }
  });

  // 🎯 Set permission handler for this specific window's session
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    console.log(`[Window Session] Permission requested: ${permission}`);
    if (permission === 'camera' || permission === 'microphone' || permission === 'mediaStream' || permission === 'video' || permission === 'audio' || permission === 'media') {
      console.log(`[Window Session] Granting ${permission} permission`);
      callback(true); // Auto-grant permission
    } else {
      console.log(`[Window Session] Denying ${permission} permission`);
      callback(false); // Deny other permissions
    }
  });

  // 🎯 Also set device permission handler for device access
  mainWindow.webContents.session.setDevicePermissionHandler((details, callback) => {
    console.log(`[Window Session] Device permission requested for:`, details.deviceType);
    if (details.deviceType === 'camera' || details.deviceType === 'microphone') {
      console.log(`[Window Session] Granting device permission for ${details.deviceType}`);
      callback(true); // Auto-grant device permission
    } else {
      callback(false); // Deny other device permissions
    }
  });

  mainWindow.setMenu(null);
  mainWindow.loadURL('http://localhost:18888');

  mainWindow.once('ready-to-show', () => {
    // 1. Tampilkan Controller lu
    mainWindow.show();

    // 2. Tutup splash screen
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }

    // 3. Kasih jeda 0.1 detik (100ms) biar HTML/CSS beres kerender, 
    // lalu paksa kursor buat fokus ke halaman web lu secara natural
    setTimeout(() => {
      mainWindow.focus(); // Fokusin jendela aplikasinya
      mainWindow.webContents.focus(); // Fokusin isi web-nya (bikin <input> bisa langsung diketik)
    }, 100);
  });

  // --- TAMBAHKAN KODE INI BUAT CEGAT TOMBOL CLOSE ---
  mainWindow.on('close', (e) => {
    // Munculkan Pop-up Native Windows
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Close App', 'Cancel'],
      title: 'Exit Confirmation',
      message: 'Are you sure want to close ShowLyrics?',
      detail: 'All display Output (Main, Lower Third, Stage) will be closed!',
      defaultId: 1, // Default fokus ke tombol 'Batal' biar aman kalau kepencet Enter
      cancelId: 1
    });

    if (choice === 1) {
      e.preventDefault(); // Batalkan kalau milih Batal
    } else {
      // 1. TUTUP SEMUA PROJECTOR WINDOW YANG MASIH NYALA
      Object.keys(projectorWindows).forEach(key => {
        if (projectorWindows[key] && !projectorWindows[key].isDestroyed()) {
          projectorWindows[key].close();
          projectorWindows[key] = null;
        }
      });
      exitPyProc();
      // 3. PAKSA APLIKASI KELUAR
      app.exit();
    }
  });
  // --------------------------------------------------
}

ipcMain.handle('get-displays', () => {
  return screen.getAllDisplays().map((disp, index) => ({
    id: disp.id,
    label: `Display ${index + 1} (${disp.bounds.width}x${disp.bounds.height})`,
    bounds: disp.bounds
  }));
});

ipcMain.on('test-displays', () => {
  const displays = screen.getAllDisplays();
  displays.forEach((disp, index) => {
    const win = new BrowserWindow({
      x: disp.bounds.x,
      y: disp.bounds.y,
      width: disp.bounds.width,
      height: disp.bounds.height,
      fullscreen: true,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      autoHideMenuBar: true,
      backgroundColor: '#000000',
      webPreferences: { nodeIntegration: false, backgroundThrottling: false }
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              background: #000;
              color: #FFF;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              font-family: sans-serif;
              text-align: center;
              font-size: 16px;
            }
            img {
              width: 150px;
              margin-bottom: 30px;
            }
            h1 {
              font-size: 8vw;
              margin: 0;
              font-weight: 900;
            }
            h2 {
              font-size: 3vw;
              color: #aaa;
              margin-top: 20px;
              font-weight: 300;
            }
            h3 {
              font-size: 2vw;
              color: #888;
              margin-top: 80px;
              letter-spacing: 5px;
            }
          </style>
        </head>
        <body>
          <img src="http://localhost:18888/static/logo.png" alt="Logo" onerror="this.style.display='none'">
          <h1>DISPLAY ${index + 1}</h1>
          <h2>RESOLUTION: ${disp.bounds.width} x ${disp.bounds.height}</h2>
          <h3>DISPLAY TEST</h3>
        </body>
      </html>
    `;

    // Buat file HTML sementara
    const tempFilePath = path.join(os.tmpdir(), `display-test-${index}.html`);
    fs.writeFileSync(tempFilePath, htmlContent, 'utf8');

    win.loadFile(tempFilePath);

    win.once('ready-to-show', () => {
      win.show();
    });

    win.setIgnoreMouseEvents(true);
    win.setAutoHideMenuBar(true);
    if (typeof win.webContents.setFrameRate === 'function') {
      win.webContents.setFrameRate(60);
    }

    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.close();
        // Hapus file sementara setelah close
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.error('Error deleting temp file:', err);
        }
      }
    }, 2000);
  });
});

// --- SET OUTPUT RESOLUTION HELPERS ---
function setWindowResolution(type, mode, width, height) {
  const win = projectorWindows[type];
  if (!win || win.isDestroyed()) return;

  if (mode === 'custom' && width && height) {
    const winBounds = win.getBounds();
    const scaleX = winBounds.width / width;
    const scaleY = winBounds.height / height;

    win.webContents.insertCSS(`
      html {
        width: ${width}px !important;
        height: ${height}px !important;
        transform-origin: top left !important;
        transform: scale(${scaleX}, ${scaleY}) !important;
        overflow: hidden !important;
      }
      body {
        width: ${width}px !important;
        height: ${height}px !important;
        overflow: hidden !important;
      }
    `);
    console.log(`[RESOLUTION] ${type} set to custom ${width}x${height} (scale: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)})`);
  } else {
    win.webContents.insertCSS(`
      html {
        width: 100% !important;
        height: 100% !important;
        transform: none !important;
        overflow: hidden !important;
      }
      body {
        width: 100% !important;
        height: 100% !important;
        overflow: hidden !important;
      }
    `);
    console.log(`[RESOLUTION] ${type} reset to default`);
  }
}

function applySavedResolutionForType(type) {
  const win = projectorWindows[type];
  if (!win || win.isDestroyed()) return;

  const options = {
    hostname: '127.0.0.1',
    port: 18888,
    path: '/api/output_resolution',
    method: 'GET',
    headers: {
      'X-ShowLyrics-Secret': secretToken
    }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const saved = JSON.parse(data);
        const cfg = saved[type];
        if (cfg) {
          setWindowResolution(type, cfg.mode, cfg.width, cfg.height);
        }
      } catch (err) {
        console.error(`[RESOLUTION] Error parsing saved resolution for ${type}:`, err);
      }
    });
  });

  req.on('error', (err) => {
    console.error(`[RESOLUTION] Error fetching resolution for ${type}:`, err);
  });

  req.end();
}

ipcMain.on('toggle-projection', (event, { type, action, url, displayId }) => {
  if (action === 'stop') {
    if (projectorWindows[type]) {
      projectorWindows[type].close();
      projectorWindows[type] = null;
    }
    return;
  }

  if (action === 'start') {
    if (projectorWindows[type]) {
      projectorWindows[type].close();
    }

    const displays = screen.getAllDisplays();
    const targetDisplay = displays.find(d => String(d.id) === String(displayId)) || displays[0];

    // JUDUL WINDOW (PENTING BUAT ALT-TAB)
    let winTitle = "Projector Output";
    if (type === 'main') winTitle = "Main Display (Projector)";
    if (type === 'lt') winTitle = "Lower Third (Overlay)";
    if (type === 'fb') winTitle = "Foldback (Stage)";

    projectorWindows[type] = new BrowserWindow({
      x: targetDisplay.bounds.x,
      y: targetDisplay.bounds.y,
      width: targetDisplay.bounds.width,
      height: targetDisplay.bounds.height,
      title: winTitle,        // Title biar nongol di Alt-Tab
      fullscreen: true,
      frame: false,           // Tanpa bingkai
      transparent: false,     // WAJIB FALSE: Nutupin Desktop Wallpaper
      alwaysOnTop: true,
      autoHideMenuBar: true,
      focusable: false,      // Selalu di atas
      skipTaskbar: false,     // WAJIB FALSE: Biar muncul di Alt-Tab/Taskbar
      hasShadow: false,
      backgroundColor: '#000000', // WAJIB HITAM PEKAT
      webPreferences: {
        nodeIntegration: false,
        backgroundThrottling: false,
      }
    });

    const win = projectorWindows[type];

    win.setIgnoreMouseEvents(true);
    win.setAutoHideMenuBar(true);
    if (typeof win.webContents.setFrameRate === 'function') {
      win.webContents.setFrameRate(60);
    }

    win.setAlwaysOnTop(true, "screen-saver");

    win.webContents.on('did-finish-load', () => {
      win.webContents.insertCSS(`
        html, body { 
          cursor: none !important; 
          overflow: hidden !important; 
          user-select: none !important;
        }
      `);
      // Auto-apply saved custom resolution when loading finishes
      applySavedResolutionForType(type);
    });

    win.loadURL(url);

    win.on('closed', () => {
      projectorWindows[type] = null;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('projection-closed', type);
      }
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// --- OPEN EXTERNAL LINK IN SYSTEM BROWSER ---
// Mencegah Electron membuka blank sub-window saat link download diklik
ipcMain.on('open-external', (_event, url) => {
  // Validasi URL: hanya izinkan http/https
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

// --- SET OUTPUT RESOLUTION (Custom Scale Transform) ---
// Ketika output window dibuka dengan custom resolution, inject CSS scale
// agar konten di-render pada resolusi target lalu di-stretch ke layar fisik.
ipcMain.on('set-output-resolution', (_event, { type, mode, width, height }) => {
  setWindowResolution(type, mode, width, height);
});

// 🎯 CAMERA PERMISSION HANDLER (Electron)
ipcMain.handle('request-camera-permission', async () => {
  try {
    console.log("Camera permission requested from renderer");
    // Permission will be auto-granted by setPermissionRequestHandler in app.on('ready')
    return true;
  } catch (err) {
    console.error("Camera permission request failed:", err);
    return false;
  }
});
