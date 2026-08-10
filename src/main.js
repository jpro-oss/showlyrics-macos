const { app, BrowserWindow, screen, ipcMain, dialog, powerSaveBlocker, shell, session } = require('electron');
const path = require('path');
const { spawn, execSync } = require('child_process');
const os = require('os');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION LOG GUARD
// Semua log hanya aktif di dev mode (npm start), zero overhead di build produksi
// ─────────────────────────────────────────────────────────────────────────────
const isDev = !app.isPackaged;
const log  = (...args) => isDev && console.log(...args);
const logE = (...args) => isDev && console.error(...args);

// ─────────────────────────────────────────────────────────────────────────────
// SECURE SESSION TOKEN
// ─────────────────────────────────────────────────────────────────────────────
const secretToken = crypto.randomBytes(16).toString('hex');
process.env.SHOWLYRICS_SECRET = secretToken;

const userDocs  = path.join(os.homedir(), 'Library', 'Application Support', 'ShowLyrics');
const appFolder = userDocs;
const tokenFile = path.join(appFolder, '.session_token');
const settingsFile = path.join(appFolder, 'app_settings.json');
let appWindowBgColor = '#000000';

try {
  if (!fs.existsSync(appFolder)) fs.mkdirSync(appFolder, { recursive: true });
  fs.writeFileSync(tokenFile, secretToken, 'utf8');
  log('Secure session token stored at:', tokenFile);
} catch (err) {
  logE('Failed to write session token:', err.message);
}

try {
  if (fs.existsSync(settingsFile)) {
    const data = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    if (data && typeof data.window_bg_color === 'string' && /^#([0-9A-Fa-f]{3}){1,2}$/.test(data.window_bg_color)) {
      appWindowBgColor = data.window_bg_color;
    }
  }
} catch (err) {
  logE('Failed to read window_bg_color from app_settings.json:', err.message);
}

// ═════════════════════════════════════════════════════════════════════════════
// BLOK 1 — GPU CORE: Hardware Acceleration Maksimal (macOS)
// Gunakan Metal backend — GPU API native Apple untuk performa optimal
// ═════════════════════════════════════════════════════════════════════════════
app.commandLine.appendSwitch('ignore-gpu-blocklist');                          // Paksa aktifkan GPU walau masuk daftar hitam Chromium
app.commandLine.appendSwitch('enable-gpu-rasterization');                      // Rasterisasi via GPU (bukan CPU)
app.commandLine.appendSwitch('enable-oop-rasterization');                      // Out-of-process rasterization (lebih stabil)
app.commandLine.appendSwitch('enable-zero-copy');                              // Bypass CPU copy buffer ke GPU (DMA langsung)
app.commandLine.appendSwitch('enable-accelerated-video-decode');               // Hardware video decode (macOS VideoToolbox)
app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');         // Video frame langsung di VRAM (bukan RAM)
app.commandLine.appendSwitch('enable-hardware-overlays', 'preferred');         // Hardware overlay compositing

// ═════════════════════════════════════════════════════════════════════════════
// BLOK 2 — macOS METAL BACKEND: Pilih GPU terkuat via Metal (Apple API)
// ═════════════════════════════════════════════════════════════════════════════
app.commandLine.appendSwitch('force-high-performance-gpu');                    // Paksa high-performance GPU (discrete GPU di MacBook Pro)
app.commandLine.appendSwitch('use-angle', 'metal');                            // ANGLE backend: Metal (macOS native — bukan D3D11)
// Catatan: enable-direct-composition DIHAPUS — Windows-only Direct Composition API
// Catatan: enable-native-gpu-memory-buffers DIHAPUS — DXGI Windows-specific

// ═════════════════════════════════════════════════════════════════════════════
// BLOK 3 — ANTI-FREEZE: Cegah Render Berhenti saat Minimize / Mission Control
// Krusial untuk projector display yang harus tetap render walau di-backgroundkan
// ═════════════════════════════════════════════════════════════════════════════
app.commandLine.appendSwitch('disable-software-rasterizer');                   // WAJIB: Cegah fallback ke software (CPU) render
app.commandLine.appendSwitch('disable-renderer-backgrounding');                // Cegah renderer di-throttle saat window minimize
app.commandLine.appendSwitch('disable-background-timer-throttling');           // Cegah timer JS di-throttle saat background
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');        // Cegah freeze saat window tertutup aplikasi lain
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');   // Video autoplay tanpa interaksi user

// ═════════════════════════════════════════════════════════════════════════════
// BLOK 4 — FEATURES: Aktifkan yang perlu, Nonaktifkan yang tidak terpakai
// ═════════════════════════════════════════════════════════════════════════════
app.commandLine.appendSwitch('disable-features', [
  // Catatan: CalculateNativeWinOcclusion DIHAPUS — Windows Win32 API only
  'IntensiveWakeUpThrottling',                      // Cegah throttle agresif timer background
  'ThrottleDisplayNoneAndVisibilityHiddenFrameSinks', // Cegah frame sink di-throttle (penting untuk projector)
  'Translate',                                      // Nonaktifkan Google Translate
  'AutofillServerCommunication',                    // Nonaktifkan Autofill sync ke server
  'WebXR',                                          // Nonaktifkan WebXR (AR/VR tidak digunakan)
  'SpeechSynthesis',                                // Nonaktifkan Speech API
  'MediaRouter',                                    // Nonaktifkan Chromecast / Cast SDK
  'OptimizationGuideModelDownloading',              // Nonaktifkan AI model download Chromium
  'Reporting',                                      // Nonaktifkan Reporting API
  'CrashReporting',                                 // Nonaktifkan crash reporting ke Google
  'BackForwardCache',                               // Nonaktifkan back-forward cache (hemat RAM signifikan)
  'PrefetchPrivacyChanges',                         // Nonaktifkan prefetch tracking
].join(','));

app.commandLine.appendSwitch('enable-features', [
  'OverlayFullscreenVideo',              // Overlay video di fullscreen tanpa re-composite
  'CanvasOopRasterization',             // Canvas rasterisasi di proses terpisah (lebih stabil)
  'MetalForWebGL',                      // macOS Metal backend untuk WebGL (performa lebih baik dari OpenGL)
  // Catatan: D3D11VideoDecoder, D3D12VideoDecoder, MediaFoundationVideoCapture,
  // DirectCompositionVideoOverlays, DirectCompositionHardwareOverlays — SEMUA DIHAPUS
  // Alasan: Windows-only APIs, tidak relevan dan bisa menyebabkan error di macOS
].join(','));

// ═════════════════════════════════════════════════════════════════════════════
// BLOK 5 — SERVICES TIDAK TERPAKAI: Matikan Semua Service yang Tidak Diperlukan
// ═════════════════════════════════════════════════════════════════════════════
app.commandLine.appendSwitch('disable-spell-checking');                        // Nonaktifkan spell check (tidak perlu)
app.commandLine.appendSwitch('disable-pdf-extension');                         // Nonaktifkan PDF viewer bawaan Chromium
app.commandLine.appendSwitch('disable-extensions');                            // Nonaktifkan semua Chromium extension
app.commandLine.appendSwitch('no-pings');                                      // Cegah hyperlink ping beacon tracking
app.commandLine.appendSwitch('disable-domain-reliability');                    // Nonaktifkan domain reliability monitoring
app.commandLine.appendSwitch('disable-sync');                                  // Nonaktifkan Chrome data sync
app.commandLine.appendSwitch('disable-breakpad');                              // Nonaktifkan crash reporter breakpad (hemat RAM)
app.commandLine.appendSwitch('no-crash-upload');                               // Cegah upload crash report ke server
app.commandLine.appendSwitch('disable-component-update');                      // Cegah Chromium update komponen secara diam-diam
app.commandLine.appendSwitch('disable-client-side-phishing-detection');        // Nonaktifkan phishing detector (tidak perlu)
app.commandLine.appendSwitch('disable-hang-monitor');                          // Kurangi overhead timer hang-monitor CPU
app.commandLine.appendSwitch('disable-print-preview');                         // Nonaktifkan print preview (hemat memori)
app.commandLine.appendSwitch('disable-logging');                               // Nonaktifkan internal logging Chromium
app.commandLine.appendSwitch('log-level', '3');                                // Log level: Fatal only

// ═════════════════════════════════════════════════════════════════════════════
// BLOK 6 — MEMORY & V8: Tuning untuk Video Playback + Low-to-High End Devices
// Memory sengaja diberi ruang besar karena background.html load & play video
// ═════════════════════════════════════════════════════════════════════════════
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=1536');
// Catatan: --optimize-for-size, --flush-bytecode, --gc-interval=500 DIHAPUS.
// --optimize-for-size → membuat V8 generate kode lebih lambat demi ukuran kecil (buruk untuk video player)
// --flush-bytecode   → menyebabkan re-kompilasi JIT saat fungsi dipanggil lagi (micro-jank)
// --gc-interval=500  → GC terlalu sering = GC pause saat render frame = frame drop / patah-patah

app.commandLine.appendSwitch('disk-cache-size', '268435456');                  // Cache disk 256MB — penting untuk video asset caching
app.commandLine.appendSwitch('num-raster-threads', '4');                       // 4 thread rasterisasi parallel — video frame lebih smooth
// disable-frame-rate-limit — DIHAPUS: KRITIS! Flag ini membuang vsync alignment.
// Video 60fps butuh frame dikirim tepat tiap 16.67ms aligned ke refresh rate display.
// Tanpa limiter → Chromium kirim frame tak teratur → GPU overload → stutter/patah-patah.
// process-per-site — DIHAPUS: menyebabkan projector window masuk renderer berbeda → instabilitas multi-window

// ═════════════════════════════════════════════════════════════════════════════
// BLOK 7 — CAMERA / LOCALHOST ACCESS
// ═════════════════════════════════════════════════════════════════════════════
app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', 'http://localhost:18888,http://127.0.0.1:18888');
app.commandLine.appendSwitch('allow-http-camera-access');

// ─────────────────────────────────────────────────────────────────────────────
// WINDOW & PROCESS VARIABLES
// ─────────────────────────────────────────────────────────────────────────────
let mainWindow;
let splashWindow;
let pyProc = null;

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI: JALANKAN PYTHON BACKEND
// ─────────────────────────────────────────────────────────────────────────────
const createPyProc = () => {
  // macOS: binary tanpa ekstensi .exe
  let script = path.join(process.resourcesPath, 'bin', 'ShowLyrics');
  if (!app.isPackaged) {
    script = path.join(__dirname, '../bin/ShowLyrics');
  }
  log('Starting Python Backend from:', script);

  pyProc = spawn(script, [], {
    env: { ...process.env, SHOWLYRICS_SECRET: secretToken }
  });

  pyProc.stdout.on('data', (data) => log(`Python: ${data}`));
  pyProc.stderr.on('data', (data) => logE(`Python Error: ${data}`));
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI: MATIKAN PYTHON BACKEND
// ─────────────────────────────────────────────────────────────────────────────
const exitPyProc = () => {
  try {
    if (fs.existsSync(tokenFile)) {
      fs.unlinkSync(tokenFile);
      log('Secure session token deleted.');
    }
  } catch (err) {}

  if (pyProc) {
    log('Membunuh Python Backend...');
    try {
      // macOS: gunakan SIGKILL agar semua child process (Go engine) juga mati
      process.kill(pyProc.pid, 'SIGKILL');
    } catch (e) {
      log('Kill warning:', e.message);
      try { pyProc.kill(); } catch (_) {}
    }
    pyProc = null;
    log('Python Backend BENAR-BENAR MATI.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI: SPLASH SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 450,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,  // Tetap render walau behind main window
      spellcheck: false,            // Tidak perlu spell check di splash
      devTools: false,              // DevTools dimatikan total
      disableBlinkFeatures: 'AutomationControlled'
    }
  });

  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  splashWindow.once('ready-to-show', () => {
    splashWindow.show();
    checkBackendAndLoad();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI: PING BACKEND (tunggu sampai server Python nyala)
// ─────────────────────────────────────────────────────────────────────────────
function checkBackendAndLoad() {
  log('Mencari sinyal dari 127.0.0.1:18888...');

  const pingInterval = setInterval(() => {
    const options = {
      hostname: '127.0.0.1',
      port: 18888,
      path: '/',
      method: 'GET',
      headers: { 'X-ShowLyrics-Secret': secretToken }
    };

    const req = http.request(options, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 400) {
        clearInterval(pingInterval);
        log('Server Ditemukan! Membuka Controller...');
        createMainWindow();
      }
      // Drain response agar socket tidak hang
      res.resume();
    });

    req.on('error', () => {
      // Server belum nyala — tunggu ping berikutnya
    });

    req.setTimeout(400, () => req.destroy());
    req.end();
  }, 500);
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP ELECTRON
// ─────────────────────────────────────────────────────────────────────────────
app.whenReady().then(() => {

  // Intercept semua request ke backend → inject secret token header
  const filter = { urls: ['http://localhost/*', 'http://127.0.0.1/*'] };

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
    if (
      details.url.startsWith('http://localhost:18888') ||
      details.url.startsWith('http://127.0.0.1:18888')
    ) {
      details.requestHeaders['X-ShowLyrics-Secret'] = secretToken;
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  // Auto-grant camera & microphone permission (default session)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  session.defaultSession.setDevicePermissionHandler(() => true);

  // setPermissionCheckHandler: return true untuk SEMUA permission
  session.defaultSession.setPermissionCheckHandler(() => true);

  // ─────────────────────────────────────────────────────────────────────────
  // PROJECTOR SESSION — Renderer Process Isolation
  // ─────────────────────────────────────────────────────────────────────────
  // KRITIS: Controller window dan projector window keduanya membuka localhost:18888.
  // Tanpa partition, Chromium memasukkan mereka ke SATU renderer process yang sama.
  // Akibatnya: JS WebSocket + DOM manipulation controller MENCURI thread time dari
  // projector yang sedang render video + CSS animation → patah-patah / lag.
  //
  // Dengan partition 'persist:sl-projector':
  //   ✓ Projector windows mendapat renderer process TERPISAH
  //   ✓ Full thread priority untuk rendering video & CSS
  //   ✓ Cache tetap persist antar sesi (asset video ter-cache)
  //   ✓ Auth header tetap diinject via onBeforeSendHeaders projector session
  const projectorFilter = { urls: [
    'http://localhost/*', 'http://127.0.0.1/*',
    'ws://localhost/*',   'ws://127.0.0.1/*'
  ]};
  const projectorSess = session.fromPartition('persist:sl-projector', { cache: true });

  projectorSess.webRequest.onBeforeSendHeaders(projectorFilter, (details, callback) => {
    if (
      details.url.startsWith('http://localhost:18888') ||
      details.url.startsWith('http://127.0.0.1:18888') ||
      details.url.startsWith('ws://localhost:18888') ||
      details.url.startsWith('ws://127.0.0.1:18888')
    ) {
      details.requestHeaders['X-ShowLyrics-Secret'] = secretToken;
    }
    callback({ requestHeaders: details.requestHeaders });
  });

  projectorSess.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  projectorSess.setDevicePermissionHandler(() => true);

  projectorSess.setPermissionCheckHandler(() => true);

  // Anti-sleep: tahan display & sistem agar tidak idle/sleep selama ibadah
  powerSaveBlocker.start('prevent-display-sleep');
  powerSaveBlocker.start('prevent-app-suspension');

  createPyProc();
  createSplashWindow();
});

// Matikan Python saat aplikasi ditutup
app.on('will-quit', () => {
  exitPyProc();
});

// ─────────────────────────────────────────────────────────────────────────────
// PROJECTOR WINDOWS REGISTRY
// ─────────────────────────────────────────────────────────────────────────────
let projectorWindows = {
  main: null,
  lt: null,
  fb: null
};

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI: MAIN CONTROLLER WINDOW
// ─────────────────────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 1024,
    minHeight: 720,
    title: 'ShowLyrics Controller',
    icon: path.join(__dirname, 'app.icns'),  // macOS: gunakan .icns
    show: false,
    autoHideMenuBar: true,
    backgroundColor: appWindowBgColor,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false,  // Jangan throttle walau di-background
      sandbox: false,               // Nonaktifkan sandbox untuk performa maksimal
      webSecurity: false,           // Request ke local backend tanpa CORS block
      enableRemoteModule: false,
      allowRunningInsecureContent: true,
      spellcheck: false,            // Spell check tidak diperlukan
      devTools: false,              // DevTools dimatikan total
      disableBlinkFeatures: 'AutomationControlled',
      v8CacheOptions: 'bypassHeatCheck', // Cache bytecode lebih agresif
    }
  });

  // Auto-grant camera & microphone permission untuk window ini
  mainWindow.webContents.session.setPermissionRequestHandler((webContents, permission, callback) => {
    callback(true);
  });

  mainWindow.webContents.session.setDevicePermissionHandler(() => true);

  mainWindow.webContents.session.setPermissionCheckHandler(() => true);

  // Di macOS, setMenu(null) akan menghapus seluruh menu bar termasuk menu Quit.
  // Menu sudah diset via Menu.setApplicationMenu() di bagian bawah file ini.
  mainWindow.loadURL('http://localhost:18888');

  // Kunci Electron zoom di 1.0 — CSS scale di frontend yang handle UI zoom,
  // bukan Electron zoom (yang akan mempengaruhi layout internal secara unpredictable).
  mainWindow.webContents.setZoomFactor(1.0);
  mainWindow.webContents.setZoomLevel(0);
  mainWindow.webContents.setVisualZoomLevelLimits(1, 1); // Cegah pinch-zoom/ctrl+scroll zoom

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }

    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.focus();
        mainWindow.webContents.focus();
      }
    }, 100);
  });

  // Konfirmasi sebelum tutup aplikasi
  mainWindow.on('close', (e) => {
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      buttons: ['Close App', 'Cancel'],
      title: 'Exit Confirmation',
      message: 'Are you sure want to close ShowLyrics?',
      detail: 'All display Output (Main, Lower Third, Stage) will be closed!',
      defaultId: 1,
      cancelId: 1
    });

    if (choice === 1) {
      e.preventDefault();
    } else {
      // Tutup semua projector window
      Object.keys(projectorWindows).forEach(key => {
        if (projectorWindows[key] && !projectorWindows[key].isDestroyed()) {
          projectorWindows[key].close();
          projectorWindows[key] = null;
        }
      });
      exitPyProc();
      app.exit();
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC: GET DISPLAYS
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('get-displays', () => {
  return screen.getAllDisplays().map((disp, index) => ({
    id: disp.id,
    label: `Display ${index + 1} (${disp.bounds.width}x${disp.bounds.height})`,
    bounds: disp.bounds
  }));
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: TEST DISPLAYS
// ─────────────────────────────────────────────────────────────────────────────
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
      backgroundColor: appWindowBgColor,
      webPreferences: {
        nodeIntegration: false,
        backgroundThrottling: false,
        spellcheck: false,
        devTools: false
      }
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
            img { width: 150px; margin-bottom: 30px; }
            h1 { font-size: 8vw; margin: 0; font-weight: 900; }
            h2 { font-size: 3vw; color: #aaa; margin-top: 20px; font-weight: 300; }
            h3 { font-size: 2vw; color: #888; margin-top: 80px; letter-spacing: 5px; }
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

    const tempFilePath = path.join(os.tmpdir(), `display-test-${index}.html`);
    fs.writeFileSync(tempFilePath, htmlContent, 'utf8');
    win.loadFile(tempFilePath);

    win.once('ready-to-show', () => win.show());
    win.setIgnoreMouseEvents(true);
    win.setAutoHideMenuBar(true);
    if (typeof win.webContents.setFrameRate === 'function') {
      win.webContents.setFrameRate(60);
    }

    setTimeout(() => {
      if (!win.isDestroyed()) {
        win.close();
        try { fs.unlinkSync(tempFilePath); } catch (err) {}
      }
    }, 2000);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS: OUTPUT RESOLUTION
// ─────────────────────────────────────────────────────────────────────────────
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
    log(`[RESOLUTION] ${type} set to custom ${width}x${height} (scale: ${scaleX.toFixed(3)}x${scaleY.toFixed(3)})`);
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
    log(`[RESOLUTION] ${type} reset to default`);
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
    headers: { 'X-ShowLyrics-Secret': secretToken }
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const saved = JSON.parse(data);
        const cfg = saved[type];
        if (cfg) setWindowResolution(type, cfg.mode, cfg.width, cfg.height);
      } catch (err) {
        logE(`[RESOLUTION] Error parsing saved resolution for ${type}:`, err);
      }
    });
  });

  req.on('error', (err) => logE(`[RESOLUTION] Error fetching resolution for ${type}:`, err));
  req.end();
}

// ─────────────────────────────────────────────────────────────────────────────
// IPC: TOGGLE PROJECTION (buka / tutup projector window)
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.on('toggle-projection', (event, { type, action, url, displayId }) => {
  if (action === 'stop') {
    if (projectorWindows[type] && !projectorWindows[type].isDestroyed()) {
      projectorWindows[type].close();
      projectorWindows[type] = null;
    }
    return;
  }

  if (action === 'start') {
    // Tutup window lama jika ada
    if (projectorWindows[type] && !projectorWindows[type].isDestroyed()) {
      projectorWindows[type].close();
    }

    const displays = screen.getAllDisplays();
    const targetDisplay = displays.find(d => String(d.id) === String(displayId)) || displays[0];
    const { x, y, width, height } = targetDisplay.bounds;

    let winTitle = 'Projector Output';
    if (type === 'main') winTitle = 'Main Display (Projector)';
    if (type === 'lt')   winTitle = 'Lower Third (Overlay)';
    if (type === 'fb')   winTitle = 'Foldback (Stage)';

    // ⚠️ PENTING: TIDAK gunakan fullscreen: true di secondary display!
    // fullscreen:true memicu OS display mode switching → interrupt video / stuck.
    // Ganti dengan frameless window yang menutupi SELURUH area display secara manual.
    // Ini lebih stabil dan video tetap jalan tanpa interupsi apapun.
    projectorWindows[type] = new BrowserWindow({
      x,
      y,
      width,
      height,
      title: winTitle,
      fullscreen: false,          // OS fullscreen dimatikan — pakai manual full-size window
      frame: false,               // Tanpa frame/titlebar
      transparent: false,         // WAJIB FALSE: Nutupin Desktop Wallpaper
      alwaysOnTop: true,
      autoHideMenuBar: true,
      focusable: true,            // OS perlakukan dengan prioritas render normal
      show: false,                // Tahan dulu, tampilkan setelah render siap
      skipTaskbar: false,         // Muncul di Alt-Tab/Taskbar
      hasShadow: false,
      resizable: false,           // Projector tidak perlu di-resize
      movable: false,             // Projector tidak perlu dipindah
      backgroundColor: appWindowBgColor, // Sesuai setting user — tidak ada flash putih
      webPreferences: {
        partition: 'persist:sl-projector', // KRITIS: Dedicated renderer process — isolated dari controller
        nodeIntegration: false,
        contextIsolation: true,
        backgroundThrottling: false,  // WAJIB: Tetap render walau di-backgroundkan
        sandbox: false,               // Nonaktifkan sandbox untuk video render maksimal
        webSecurity: false,           // Request ke local backend tanpa CORS
        allowRunningInsecureContent: true,
        spellcheck: false,
        devTools: false,              // DevTools dimatikan total
        offscreen: false,             // Render ke layar fisik (bukan offscreen buffer)
        paintWhenInitiallyHidden: true,
        v8CacheOptions: 'bypassHeatCheck',
      }
    });

    const win = projectorWindows[type];

    win.setIgnoreMouseEvents(true);
    win.setAutoHideMenuBar(true);

    // 'pop-up-menu' lebih stabil dari 'screen-saver' untuk render engine
    win.setAlwaysOnTop(true, 'pop-up-menu');

    // Kunci zoom level = 1.0 — cegah kalkulasi layout zoom yang tidak perlu
    win.webContents.setZoomFactor(1.0);
    win.webContents.setZoomLevel(0);
    win.webContents.setVisualZoomLevelLimits(1, 1);

    if (typeof win.webContents.setFrameRate === 'function') {
      win.webContents.setFrameRate(60);
    }

    // Inject CSS hitam secepat mungkin saat navigasi mulai (sebelum konten load)
    // Mencegah flash putih/kosong selama halaman belum selesai render
    win.webContents.on('did-start-navigation', () => {
      win.webContents.insertCSS(`
        html, body {
          background: ${appWindowBgColor} !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `).catch(() => {});
    });

    win.webContents.on('did-finish-load', () => {
      // CSS 1: Layout & visual dasar
      win.webContents.insertCSS(`
        html, body {
          background: ${appWindowBgColor} !important;
          cursor: none !important;
          overflow: hidden !important;
          user-select: none !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `);

      // CSS 2: GPU Compositing Hint — hanya untuk iframe video (#frame-video)
      // User request: optimasi HANYA untuk iframe video, bukan semua elemen.
      // #frame-video adalah iframe yang memuat /background (background.html dengan <video>).
      // will-change: transform, opacity memberikan hint ke compositor untuk
      // menjadikan iframe ini GPU compositing layer tersendiri yang stabil.
      win.webContents.insertCSS(`
        #frame-video {
          will-change: transform, opacity;
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
      `).catch(() => {});

      // 🎯 VIDEO ANTI-STALL GUARD — PARENT FRAME
      // Inject di parent document: menjangkau video langsung DAN video di dalam iframe same-origin
      // KRITIS: display.html/lowerthird.html menggunakan <iframe> untuk load /background
      // sehingga <video> ada di dalam iframe, bukan di parent. Guard HARUS masuk ke iframe juga.
      win.webContents.executeJavaScript(`
        (function() {
          'use strict';

          // Fungsi guard satu dokumen (parent atau iframe)
          function guardDoc(doc) {
            if (!doc) return;
            doc.querySelectorAll('video').forEach(function(v) {
              if (v._slGuarded) return;
              v._slGuarded = true;
              v.addEventListener('pause', function() {
                if (!v._intentionalPause) {
                  setTimeout(function() { v.play().catch(function(){}); }, 80);
                }
              });
              // Tambahan: jaga agar video tidak ter-pause via visibility change
              doc.addEventListener('visibilitychange', function() {
                if (doc.hidden) return; // jangan lakukan apa-apa saat hidden
                if (!v.paused || v._intentionalPause) return;
                v.play().catch(function(){});
              });
            });
          }

          // Guard parent document
          guardDoc(document);

          // Guard semua iframe same-origin yang sudah ada (termasuk /background)
          function guardIframes() {
            document.querySelectorAll('iframe').forEach(function(iframe) {
              if (iframe._slIframeGuarded) return;
              // Guard saat iframe sudah selesai load
              var tryGuard = function() {
                try {
                  var doc = iframe.contentDocument;
                  if (doc && doc.readyState !== 'loading') {
                    iframe._slIframeGuarded = true;
                    guardDoc(doc);
                    // Watch perubahan DOM di dalam iframe (video lazy load)
                    var iObs = new MutationObserver(function() { guardDoc(doc); });
                    iObs.observe(doc.documentElement, { childList: true, subtree: true });
                  }
                } catch(e) {}
              };
              iframe.addEventListener('load', tryGuard);
              tryGuard(); // coba langsung jika sudah ada
            });
          }

          guardIframes();

          // Watch iframe baru yang ditambahkan secara dinamis
          var obs = new MutationObserver(function() {
            guardDoc(document);
            guardIframes();
          });
          obs.observe(document.documentElement, { childList: true, subtree: true });

          // API global untuk pause/resume yang disengaja oleh app
          window._slPauseVideo = function(v) { v._intentionalPause = true; v.pause(); };
          window._slResumeVideo = function(v) { v._intentionalPause = false; v.play().catch(function(){}); };
        })();
      `).catch(() => {});

      applySavedResolutionForType(type);

      // 🎥 BACKUP CAMERA PRE-WARM (Fallback Layer 2)
      if (type === 'main' || type === 'lt') {
        win.webContents.executeJavaScript(`
          (function() {
            'use strict';
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return;
            navigator.mediaDevices.getUserMedia({ video: true, audio: false })
              .then(function(s) {
                s.getTracks().forEach(function(t) { t.stop(); });
                console.log('[CamPrewarm-Main] Camera permission established (MAC).');
              })
              .catch(function(e) {
                console.warn('[CamPrewarm-Main] Pre-warm failed (MAC):', e.name);
              });
          })();
        `).catch(() => {});
      }
    });

    // CATATAN: did-frame-finish-load subframe injection DIHAPUS.
    // executeJavaScript() selalu berjalan di MAIN frame context, bukan di subframe.
    // Guard video di iframe ditangani oleh guardIframes() di parent frame (same-origin access).
    // guardIframes() mengakses iframe.contentDocument langsung (cross-frame same-origin access).

    // Tampilkan secara inactive agar tidak merebut fokus dari Controller
    win.once('ready-to-show', () => {
      win.showInactive();
      // Pastikan window benar-benar menutupi seluruh display area
      win.setBounds({ x, y, width, height });
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

// ─────────────────────────────────────────────────────────────────────────────
// APP: MENU BAR (macOS — wajib ada agar Cmd+Q berfungsi dan OS tidak complain)
// ─────────────────────────────────────────────────────────────────────────────
const { Menu } = require('electron');
const macAppMenu = Menu.buildFromTemplate([
  {
    label: app.name,
    submenu: [
      { role: 'about', label: `About ${app.name}` },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide', label: `Hide ${app.name}` },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit', label: `Quit ${app.name}`, accelerator: 'Cmd+Q' }
    ]
  }
]);
Menu.setApplicationMenu(macAppMenu);

// ─────────────────────────────────────────────────────────────────────────────
// APP: WINDOW-ALL-CLOSED
// Di macOS, app tetap aktif di Dock setelah semua window ditutup (konvensi macOS)
// ─────────────────────────────────────────────────────────────────────────────
app.on('window-all-closed', () => {
  // macOS: app tetap berjalan di background (behavior standar macOS)
  // User bisa re-open via Dock. Quit hanya via Cmd+Q atau menu Quit.
  // Jika ingin quit saat semua window ditutup, hapus kondisi ini.
  if (process.platform !== 'darwin') app.quit();
});

// ─────────────────────────────────────────────────────────────────────────────
// APP: ACTIVATE (macOS Dock click — re-buka window jika sudah ditutup)
// ─────────────────────────────────────────────────────────────────────────────
app.on('activate', () => {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createSplashWindow();
  } else {
    mainWindow.show();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: OPEN EXTERNAL LINK (buka di browser sistem, bukan sub-window Electron)
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.on('open-external', (_event, url) => {
  if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
    shell.openExternal(url);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: SET OUTPUT RESOLUTION (custom scale via CSS transform)
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.on('set-output-resolution', (_event, { type, mode, width, height }) => {
  setWindowResolution(type, mode, width, height);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: SET CONTROLLER ZOOM (UI Scale — hanya controller window!)
// Dipanggil dari renderer via electronAPI.setControllerZoom(factor)
// Mengubah viewport layout secara nyata — konten mengisi seluruh window.
// Projector window TIDAK disentuh (webContents-nya terpisah, dikunci di 1.0).
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.on('set-controller-zoom', (_event, factor) => {
  factor = parseFloat(factor);
  if (isNaN(factor) || factor < 0.5 || factor > 2.0) return; // Batas aman
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.setZoomFactor(factor);
    log(`[UI ZOOM] Controller zoom set to ${factor}`);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: WINDOW BACKGROUND COLOR
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.on('set-window-background-color', (_event, colorHex) => {
  if (typeof colorHex === 'string' && /^#([0-9A-Fa-f]{3}){1,2}$/.test(colorHex)) {
    appWindowBgColor = colorHex;
    log(`[WINDOW BG COLOR] Dynamic background color set to ${colorHex}`);
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.setBackgroundColor(colorHex);
    }
    Object.values(projectorWindows).forEach((win) => {
      if (win && !win.isDestroyed()) {
        win.setBackgroundColor(colorHex);
        win.webContents.insertCSS(`html, body { background: ${colorHex} !important; }`).catch(() => {});
      }
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: CAMERA PERMISSION
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('request-camera-permission', async () => {
  try {
    log('Camera permission requested from renderer');
    return true; // Auto-granted via setPermissionRequestHandler
  } catch (err) {
    logE('Camera permission request failed:', err);
    return false;
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: RELAUNCH APP (restart seluruh aplikasi)
// Dipanggil dari renderer via electronAPI.relaunchApp()
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.on('relaunch-app', () => {
  log('Relaunch requested — restarting app...');
  app.relaunch();
  app.exit(0);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: EXPORT SCHEDULE BUNDLE (WITH DIALOG FOR ELECTRON SAVING)
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('export-schedule-electron', async (event, { schedName }) => {
  const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Schedule Bundle',
    defaultPath: `${schedName}_bundle.zip`,
    filters: [
      { name: 'ZIP Archives', extensions: ['zip'] }
    ]
  });

  if (canceled || !filePath) {
    return { status: 'canceled' };
  }

  return new Promise((resolve) => {
    const file = fs.createWriteStream(filePath);
    
    const options = {
      hostname: '127.0.0.1',
      port: 18888,
      path: `/api/export_bundle/${encodeURIComponent(schedName)}`,
      method: 'GET',
      headers: {
        'X-ShowLyrics-Secret': secretToken
      }
    };

    const request = http.get(options, (response) => {
      if (response.statusCode !== 200) {
        file.close();
        try { fs.unlinkSync(filePath); } catch (e) {}
        resolve({ status: 'error', message: `Server returned status code ${response.statusCode}` });
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve({ status: 'success', filePath });
      });
      
      file.on('error', (err) => {
        file.close();
        try { fs.unlinkSync(filePath); } catch (e) {}
        resolve({ status: 'error', message: err.message });
      });
    });
    
    request.on('error', (err) => {
      file.close();
      try { fs.unlinkSync(filePath); } catch (e) {}
      resolve({ status: 'error', message: err.message });
    });
  });
});
