const { app, BrowserWindow, screen, ipcMain, dialog, powerSaveBlocker, shell, session, Menu, systemPreferences } = require('electron');
const path = require('path');
const { spawn, execFileSync } = require('child_process');
const os = require('os');
const http = require('http');
const fs = require('fs');
const crypto = require('crypto');

// ─────────────────────────────────────────────────────────────────────────────
// SINGLE INSTANCE LOCK (cegah konflik port 18888/18899/18901 & timpa .session_token)
// ─────────────────────────────────────────────────────────────────────────────
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTION LOG GUARD & PERSISTENT BACKEND LOG
// ─────────────────────────────────────────────────────────────────────────────
const isDev = !app.isPackaged;
const log  = (...args) => isDev && console.log(...args);
const logE = (...args) => isDev && console.error(...args);

const logDir = path.join(os.homedir(), 'Library', 'Logs', 'ShowLyrics');
const backendLogPath = path.join(logDir, 'backend.log');
let backendLogStream = null;
function appendBackendLog(line) {
  try {
    if (!backendLogStream) {
      if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
      try {
        if (fs.existsSync(backendLogPath) && fs.statSync(backendLogPath).size > 5 * 1024 * 1024) {
          fs.renameSync(backendLogPath, backendLogPath + '.old');
        }
      } catch (_) {}
      backendLogStream = fs.createWriteStream(backendLogPath, { flags: 'a' });
    }
    backendLogStream.write(`[${new Date().toISOString()}] ${line}\n`);
  } catch (_) {}
}

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
let mainDisplayBgColor = '#000000';
let ltDisplayBgColor = '#000000';

// ─────────────────────────────────────────────────────────────────────────────
// BACA COMPATIBILITY SETTINGS dari app_settings.json
// Dibaca SEBELUM GPU flags diset karena flags hanya berlaku saat app cold-start.
// Default: false — hanya aktifkan jika user mengalami masalah (pink/hijau overlay, dll)
// ─────────────────────────────────────────────────────────────────────────────
let gpuCompatibilityMode = false;      // GPU Compatibility Mode: matikan Metal overlay path
let forceGpuCompositingLayer = false;  // Force GPU Compositing Layer: CSS injection

if (gotSingleInstanceLock) {
  try {
    if (!fs.existsSync(appFolder)) fs.mkdirSync(appFolder, { recursive: true });
    fs.writeFileSync(tokenFile, secretToken, { encoding: 'utf8', mode: 0o600 });
    log('Secure session token stored at:', tokenFile);
  } catch (err) {
    logE('Failed to write session token:', err.message);
  }
}

try {
  if (fs.existsSync(settingsFile)) {
    const data = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    if (data) {
      if (typeof data.window_bg_color === 'string' && /^#([0-9A-Fa-f]{3}){1,2}$/.test(data.window_bg_color)) {
        appWindowBgColor = data.window_bg_color;
        mainDisplayBgColor = data.window_bg_color;
        ltDisplayBgColor = data.window_bg_color;
      }
      if (typeof data.main_bg_color === 'string' && /^#([0-9A-Fa-f]{3}){1,2}$/.test(data.main_bg_color)) {
        mainDisplayBgColor = data.main_bg_color;
      }
      if (typeof data.lt_bg_color === 'string' && /^#([0-9A-Fa-f]{3}){1,2}$/.test(data.lt_bg_color)) {
        ltDisplayBgColor = data.lt_bg_color;
      }
      if (data.gpu_compatibility_mode === true) {
        gpuCompatibilityMode = true;
      }
      if (data.force_gpu_compositing_layer === true) {
        forceGpuCompositingLayer = true;
      }
    }
  }
} catch (err) {
  logE('Failed to read app_settings.json:', err.message);
}
log('[COMPAT] gpuCompatibilityMode:', gpuCompatibilityMode, '| forceGpuCompositingLayer:', forceGpuCompositingLayer);

// ═════════════════════════════════════════════════════════════════════════════
// BLOK 1 — GPU CORE: Hardware Acceleration Maksimal (macOS)
// Gunakan Metal backend — GPU API native Apple untuk performa optimal
// ═════════════════════════════════════════════════════════════════════════════
app.commandLine.appendSwitch('ignore-gpu-blocklist');                          // Paksa aktifkan GPU walau masuk daftar hitam Chromium
app.commandLine.appendSwitch('enable-gpu-rasterization');                      // Rasterisasi via GPU (bukan CPU)
app.commandLine.appendSwitch('enable-oop-rasterization');                      // Out-of-process rasterization (lebih stabil)
app.commandLine.appendSwitch('enable-zero-copy');                              // Bypass CPU copy buffer ke GPU (DMA langsung)
if (!gpuCompatibilityMode) {
  // Hardware video decode via VideoToolbox (macOS)
  // Dinonaktifkan di GPU Compat Mode karena Metal overlay path dapat menyebabkan warna artifact
  app.commandLine.appendSwitch('enable-accelerated-video-decode');             // Hardware video decode (macOS VideoToolbox)
  app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');       // Video frame langsung di VRAM
  app.commandLine.appendSwitch('enable-hardware-overlays', 'preferred');       // Hardware overlay compositing
} else {
  // GPU Compat Mode macOS: matikan accelerated decode
  app.commandLine.appendSwitch('disable-accelerated-video-decode');
  log('[COMPAT] GPU Compatibility Mode AKTIF (macOS) — hardware video decode DINONAKTIFKAN');
}

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
if (!gpuCompatibilityMode) {
  app.commandLine.appendSwitch('disable-software-rasterizer');                 // Cegah fallback ke software render saat mode normal
}
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
  // ─── Tambahan V.1.35.4: matikan service yang tidak digunakan app ibadah ───
  'GlobalMediaControls',                            // Media overlay controls — tidak digunakan di ShowLyrics
  'HardwareMediaKeyHandling',                       // Media key keyboard (play/pause) — tidak perlu di projector
  'DnsOverHttps',                                   // DoH tidak diperlukan untuk app yang berjalan lokal
  'WebOTP',                                         // Web OTP API — tidak digunakan
  'TextFragmentAnchor',                             // URL fragment scroll — tidak digunakan
  'SystemNotifications',                            // OS notification — ShowLyrics punya notif sendiri
].join(','));

// ─── enable-features: kondisional berdasarkan GPU Compat Mode ───
// macOS: MetalForWebGL dinonaktifkan di compat mode
const _macEnableFeatures = [
  'OverlayFullscreenVideo',              // Overlay video di fullscreen tanpa re-composite
  'CanvasOopRasterization',             // Canvas rasterisasi di proses terpisah (lebih stabil)
  // Catatan: D3D11VideoDecoder, D3D12VideoDecoder, MediaFoundationVideoCapture,
  // DirectCompositionVideoOverlays, DirectCompositionHardwareOverlays — SEMUA DIHAPUS
  // Alasan: Windows-only APIs, tidak relevan dan bisa menyebabkan error di macOS
];
if (!gpuCompatibilityMode) {
  _macEnableFeatures.push('MetalForWebGL'); // macOS Metal backend untuk WebGL
}
app.commandLine.appendSwitch('enable-features', _macEnableFeatures.join(','));

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
// ─── Adaptive V8 Heap Memory berdasarkan RAM sistem ───
// Low-end (< 4GB RAM): 768MB — cukup untuk video render tanpa kill sistem
// Mid-range (4-8GB RAM): 1024MB — seimbang antara performa dan stabilitas
// High-end (>= 8GB RAM): 1536MB — maksimal untuk multi-projector + camera
const _totalRAMgb = os.totalmem() / (1024 ** 3);
const _v8HeapMB = _totalRAMgb >= 8 ? 1536 : (_totalRAMgb >= 4 ? 1024 : 768);
app.commandLine.appendSwitch('js-flags', `--max-old-space-size=${_v8HeapMB}`);
log(`[MEMORY] RAM: ${_totalRAMgb.toFixed(1)}GB → V8 heap: ${_v8HeapMB}MB`);
// Catatan: --optimize-for-size, --flush-bytecode, --gc-interval=500 DIHAPUS.
// --optimize-for-size → membuat V8 generate kode lebih lambat demi ukuran kecil (buruk untuk video player)
// --flush-bytecode   → menyebabkan re-kompilasi JIT saat fungsi dipanggil lagi (micro-jank)
// --gc-interval=500  → GC terlalu sering = GC pause saat render frame = frame drop / patah-patah

// ─── Adaptive Disk Cache berdasarkan RAM sistem ───
const _cacheMB = _totalRAMgb >= 8 ? 256 : (_totalRAMgb >= 4 ? 128 : 64);
app.commandLine.appendSwitch('disk-cache-size', String(_cacheMB * 1024 * 1024)); // Cache disk adaptif
log(`[MEMORY] Disk cache: ${_cacheMB}MB`);
app.commandLine.appendSwitch('num-raster-threads', '4');                       // 4 thread rasterisasi parallel — video frame lebih smooth
const _rendererLimit = _totalRAMgb >= 8 ? '8' : '4';
app.commandLine.appendSwitch('renderer-process-limit', _rendererLimit);        // Jaga isolasi persist:sl-projector di Mac >= 8GB RAM
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
let pyProcExited = false;
let pyProcExitDetail = '';
let backendReadyOnce = false;
let isQuitting = false;
let isShuttingDown = false;
let isRecoveringBackend = false;
let healthCheckTimer = null;
let runtimeRestartTimestamps = [];
const MAX_RUNTIME_RESTARTS = 3;
const RESTART_WINDOW_MS = 120000;

function updateSplashStatus(label, detail) {
  if (!splashWindow || splashWindow.isDestroyed()) return;
  const safeLabel = JSON.stringify(String(label || 'Initializing'));
  const safeDetail = JSON.stringify(String(detail || ''));
  splashWindow.webContents.executeJavaScript(`
    (function() {
      var l = document.getElementById('splash-status-label');
      var d = document.getElementById('splash-status-detail');
      if (l) l.textContent = ${safeLabel};
      if (d) d.textContent = ${safeDetail};
    })();
  `).catch(() => {});
}

function ensureExecutable(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      fs.chmodSync(filePath, 0o755);
    }
  } catch (err) {
    appendBackendLog(`chmod warning for ${filePath}: ${err.message}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-FLIGHT ORPHAN CLEANUP (macOS Only)
// Bersihkan proses orphan ShowLyrics/playback-engine/camera-service yang
// mungkin masih memegang port 18888/18899/18901 dari crash sebelumnya.
// Hanya menyentuh executable ShowLyrics/playback-engine/camera-service.
// ─────────────────────────────────────────────────────────────────────────────
function cleanupStaleMacSubApps() {
  if (process.platform !== 'darwin') return;
  const lsofBin = fs.existsSync('/usr/sbin/lsof') ? '/usr/sbin/lsof' : 'lsof';
  const psBin = fs.existsSync('/bin/ps') ? '/bin/ps' : 'ps';
  const allowedNames = ['ShowLyrics', 'playback-engine', 'camera-service'];
  const ports = [18888, 18899, 18901];
  const stalePids = new Set();

  for (const port of ports) {
    try {
      const out = execFileSync(lsofBin, ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
        encoding: 'utf8',
        timeout: 2000,
        stdio: ['ignore', 'pipe', 'ignore']
      });
      for (const raw of out.split(/\r?\n/)) {
        const pid = parseInt(raw.trim(), 10);
        if (!pid || pid === process.pid) continue;
        try {
          const comm = execFileSync(psBin, ['-p', String(pid), '-o', 'comm='], {
            encoding: 'utf8',
            timeout: 1500,
            stdio: ['ignore', 'pipe', 'ignore']
          }).trim();
          const baseName = path.basename(comm);
          if (allowedNames.some((n) => baseName === n || baseName.startsWith(n))) {
            stalePids.add(pid);
            appendBackendLog(`Pre-flight: found stale ${baseName} (pid=${pid}) on port ${port}`);
          } else {
            appendBackendLog(`Pre-flight: port ${port} owned by non-ShowLyrics process "${baseName}" (pid=${pid}) — skipping`);
          }
        } catch (_) {}
      }
    } catch (_) {
      // lsof exits 1 when no process is listening on port (normal)
    }
  }

  for (const pid of stalePids) {
    try { process.kill(pid, 'SIGTERM'); } catch (_) {}
  }
  if (stalePids.size > 0) {
    const deadline = Date.now() + 600;
    while (Date.now() < deadline) {
      let anyAlive = false;
      for (const pid of stalePids) {
        try {
          process.kill(pid, 0);
          anyAlive = true;
        } catch (_) {}
      }
      if (!anyAlive) break;
    }
    for (const pid of stalePids) {
      try {
        process.kill(pid, 0);
        process.kill(pid, 'SIGKILL');
      } catch (_) {}
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI: JALANKAN PYTHON BACKEND
// ─────────────────────────────────────────────────────────────────────────────
const createPyProc = () => {
  pyProcExited = false;
  pyProcExitDetail = '';
  const binDir = app.isPackaged
    ? path.join(process.resourcesPath, 'bin')
    : path.join(__dirname, '../backend');

  let spawnArgs;

  if (app.isPackaged) {
    // Production: jalankan binary compiled (macOS: tanpa ekstensi)
    const script = path.join(binDir, 'ShowLyrics');
    if (!fs.existsSync(script)) {
      const msg = `Python backend binary not found at: ${script}`;
      appendBackendLog(msg);
      pyProcExited = true;
      pyProcExitDetail = msg;
      dialog.showErrorBox('ShowLyrics Startup Error', msg);
      return;
    }
    ensureExecutable(script);
    for (const helper of ['playback-engine', 'camera-service', 'ffmpeg']) {
      ensureExecutable(path.join(binDir, helper));
      ensureExecutable(path.join(binDir, 'internal', helper));
      ensureExecutable(path.join(binDir, '_internal', helper));
    }
    log('Starting Python Backend (production) from:', script);
    appendBackendLog(`Starting Python Backend (production) from: ${script}`);
    spawnArgs = { cmd: script, args: [] };
  } else {
    // Development: jalankan python main.py langsung — tidak perlu binary
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    const mainScript = path.join(__dirname, '../backend', 'main.py');
    log('Starting Python Backend (dev) from:', pythonCmd, mainScript);
    spawnArgs = { cmd: pythonCmd, args: [mainScript] };
  }

  const spawnedProc = spawn(spawnArgs.cmd, spawnArgs.args, {
    cwd: binDir,
    detached: process.platform !== 'win32',
    env: {
      ...process.env,
      SHOWLYRICS_SECRET: secretToken,
      SHOWLYRICS_DEV: app.isPackaged ? 'false' : 'true'
    }
  });
  pyProc = spawnedProc;

  spawnedProc.stdout.on('data', (data) => {
    const text = String(data).trimEnd();
    log(`Python: ${text}`);
    if (text) appendBackendLog(`STDOUT: ${text}`);
  });
  spawnedProc.stderr.on('data', (data) => {
    const text = String(data).trimEnd();
    logE(`Python Error: ${text}`);
    if (text) appendBackendLog(`STDERR: ${text}`);
  });

  spawnedProc.on('error', (err) => {
    if (pyProc === spawnedProc) {
      pyProcExited = true;
      pyProcExitDetail = err.message;
    }
    logE('Failed to start Python backend:', err.message);
    appendBackendLog(`SPAWN ERROR: ${err.message}`);
  });

  spawnedProc.on('close', (code, signal) => {
    if (pyProc !== spawnedProc) return;
    pyProcExited = true;
    pyProcExitDetail = `code=${code}, signal=${signal}`;
    if (code !== null && code !== 0) {
      logE(`Python backend exited with code ${code}`);
    }
    appendBackendLog(`Python backend closed (${pyProcExitDetail})`);

    if (!isQuitting && backendReadyOnce && !isRecoveringBackend) {
      handleRuntimeBackendCrash();
    }
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// RUNTIME WATCHDOG: Auto-restart backend jika crash saat aplikasi sedang live
// ─────────────────────────────────────────────────────────────────────────────
function handleRuntimeBackendCrash() {
  const now = Date.now();
  runtimeRestartTimestamps = runtimeRestartTimestamps.filter((ts) => now - ts < RESTART_WINDOW_MS);

  if (runtimeRestartTimestamps.length >= MAX_RUNTIME_RESTARTS) {
    const msg = `ShowLyrics backend crashed ${MAX_RUNTIME_RESTARTS} times within 2 minutes (${pyProcExitDetail}).\nSee log: ${backendLogPath}`;
    appendBackendLog(`Watchdog halted: ${msg}`);
    dialog.showErrorBox('ShowLyrics Backend Stopped', msg);
    return;
  }

  runtimeRestartTimestamps.push(now);
  isRecoveringBackend = true;
  appendBackendLog(`Watchdog: restarting ShowLyrics backend (attempt ${runtimeRestartTimestamps.length}/${MAX_RUNTIME_RESTARTS})...`);

  cleanupStaleMacSubApps();
  createPyProc();
  checkBackendAndLoad(() => {
    isRecoveringBackend = false;
    appendBackendLog('Watchdog: backend recovered — reloading active windows.');
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.loadURL('http://127.0.0.1:18888');
    }
    Object.keys(projectorWindows).forEach((key) => {
      const win = projectorWindows[key];
      if (win && !win.isDestroyed()) {
        win.webContents.reload();
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI: MATIKAN PYTHON BACKEND (graceful SIGTERM -> wait -> SIGKILL PGID)
// ─────────────────────────────────────────────────────────────────────────────
const exitPyProc = (forceImmediate = false) => {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }

  try {
    if (fs.existsSync(tokenFile)) {
      fs.unlinkSync(tokenFile);
      log('Secure session token deleted.');
    }
  } catch (err) {}

  if (pyProc) {
    const proc = pyProc;
    const pid = proc.pid;
    pyProc = null;
    log('Membunuh Python Backend...');
    appendBackendLog(`Terminating Python backend process group (pid=${pid}, force=${forceImmediate})`);

    const signalGroup = (sig) => {
      if (!pid) return;
      if (process.platform !== 'win32') {
        try {
          process.kill(-pid, sig);
          return;
        } catch (_) {}
      }
      try {
        process.kill(pid, sig);
      } catch (_) {}
    };

    signalGroup(forceImmediate ? 'SIGKILL' : 'SIGTERM');
    if (!forceImmediate) {
      const forceKillTimer = setTimeout(() => {
        signalGroup('SIGKILL');
      }, 1200);
      if (typeof forceKillTimer.unref === 'function') {
        forceKillTimer.unref();
      }
    }
    log('Python Backend termination signal sent.');
  }

  if (backendLogStream) {
    try { backendLogStream.end(); } catch (_) {}
    backendLogStream = null;
  }
};

function gracefulShutdownAndExit(exitCode = 0, relaunch = false) {
  if (isShuttingDown) return;
  isShuttingDown = true;
  isQuitting = true;

  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }

  Object.keys(projectorWindows).forEach((key) => {
    if (projectorWindows[key] && !projectorWindows[key].isDestroyed()) {
      projectorWindows[key].destroy();
      projectorWindows[key] = null;
    }
  });

  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.destroy();
    splashWindow = null;
  }

  const targetPid = pyProc ? pyProc.pid : null;
  exitPyProc(false);

  const finish = () => {
    if (targetPid && !pyProcExited) {
      if (process.platform !== 'win32') {
        try { process.kill(-targetPid, 'SIGKILL'); } catch (_) {}
      }
      try { process.kill(targetPid, 'SIGKILL'); } catch (_) {}
    }
    if (relaunch) {
      app.relaunch();
    }
    app.exit(exitCode);
  };

  if (!targetPid || pyProcExited) {
    finish();
    return;
  }

  const startedWait = Date.now();
  const waitTimer = setInterval(() => {
    let stillAlive = false;
    try {
      process.kill(targetPid, 0);
      stillAlive = true;
    } catch (_) {
      stillAlive = false;
    }
    if (!stillAlive || pyProcExited || Date.now() - startedWait >= 1200) {
      clearInterval(waitTimer);
      finish();
    }
  }, 50);
}

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
    updateSplashStatus('Starting Engine', 'Waiting for ShowLyrics backend (127.0.0.1:18888)...');
    checkBackendAndLoad();
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// FUNGSI: PING BACKEND (tunggu sampai server Python + auth token cocok)
// ─────────────────────────────────────────────────────────────────────────────
function checkBackendAndLoad(onReady) {
  if (healthCheckTimer) {
    clearInterval(healthCheckTimer);
    healthCheckTimer = null;
  }
  log('Mencari sinyal dari 127.0.0.1:18888...');
  const startTime = Date.now();
  const MAX_WAIT_MS = 45000;
  let attempts = 0;

  healthCheckTimer = setInterval(() => {
    if (isQuitting) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
      return;
    }

    if (pyProcExited) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
      const errMsg = `ShowLyrics backend exited unexpectedly (${pyProcExitDetail}).\nSee log: ${backendLogPath}`;
      appendBackendLog(`Startup aborted: ${errMsg}`);
      dialog.showErrorBox('ShowLyrics Backend Error', errMsg);
      gracefulShutdownAndExit(1, false);
      return;
    }

    const elapsed = Date.now() - startTime;
    if (elapsed > MAX_WAIT_MS) {
      clearInterval(healthCheckTimer);
      healthCheckTimer = null;
      const errMsg = `ShowLyrics backend timed out after ${MAX_WAIT_MS / 1000}s waiting for /api/health.\nSee log: ${backendLogPath}`;
      appendBackendLog(`Startup timeout: ${errMsg}`);
      dialog.showErrorBox('ShowLyrics Startup Timeout', errMsg);
      gracefulShutdownAndExit(1, false);
      return;
    }

    attempts += 1;
    if (attempts === 6) {
      updateSplashStatus('Loading Modules', 'Initializing Python & Go sub-services...');
    } else if (attempts === 18) {
      updateSplashStatus('Almost Ready', 'Verifying port 18888 & session token...');
    }

    const options = {
      hostname: '127.0.0.1',
      port: 18888,
      path: '/api/health',
      method: 'GET',
      headers: { 'X-ShowLyrics-Secret': secretToken }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          let parsed = null;
          try { parsed = JSON.parse(body); } catch (_) {}

          const isOkStatus = !parsed || parsed.status === 'ok';
          const isAuthMatch = !parsed || parsed.auth_ok !== false;
          const isPidMatch = !parsed || !parsed.pid || !pyProc || !pyProc.pid || !isDev || parsed.pid === pyProc.pid;

          if (isOkStatus && isAuthMatch && isPidMatch) {
            clearInterval(healthCheckTimer);
            healthCheckTimer = null;
            backendReadyOnce = true;
            log('Server Ditemukan! (health check & auth OK) Membuka Controller...', parsed);
            appendBackendLog(`Health check OK: ${body.trim()}`);
            updateSplashStatus('Launching Workspace', 'Opening ShowLyrics Controller...');
            if (typeof onReady === 'function') {
              onReady(parsed);
            } else {
              createMainWindow();
            }
          } else {
            appendBackendLog(`Health check mismatch (waiting for own backend): ${body.trim()}`);
          }
        } else {
          log(`Ping /api/health returned ${res.statusCode}, retrying...`);
        }
      });
    });

    req.on('error', () => {
      // Server belum nyala — tunggu ping berikutnya
    });

    req.setTimeout(800, () => req.destroy());
    req.end();
  }, 300);
}

// ─────────────────────────────────────────────────────────────────────────────
// STARTUP ELECTRON
// ─────────────────────────────────────────────────────────────────────────────
if (gotSingleInstanceLock) {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    } else if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.show();
      splashWindow.focus();
    }
  });

  app.whenReady().then(() => {

  // Intercept semua request HTTP & WebSocket ke backend → inject secret token header
  const filter = { urls: ['http://localhost/*', 'http://127.0.0.1/*', 'ws://localhost/*', 'ws://127.0.0.1/*'] };

  session.defaultSession.webRequest.onBeforeSendHeaders(filter, (details, callback) => {
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

  // Auto-grant camera & microphone permission (default session)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ['camera', 'microphone', 'mediaStream', 'video', 'audio', 'media'];
    callback(allowed.includes(permission));
  });

  session.defaultSession.setDevicePermissionHandler((details) => {
    return details.deviceType === 'camera' || details.deviceType === 'microphone';
  });

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
  const projectorFilter = { urls: ['http://localhost/*', 'http://127.0.0.1/*', 'ws://localhost/*', 'ws://127.0.0.1/*'] };
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
    const allowed = ['camera', 'microphone', 'mediaStream', 'video', 'audio', 'media'];
    callback(allowed.includes(permission));
  });

  projectorSess.setDevicePermissionHandler((details) => {
    return details.deviceType === 'camera' || details.deviceType === 'microphone';
  });

  // Konfigurasi macOS Menu Bar (di dalam whenReady agar Cmd+C/V/X/A/Z dan Cmd+Q berfungsi)
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
    },
    { role: 'editMenu' },
    { role: 'windowMenu' }
  ]);
  Menu.setApplicationMenu(macAppMenu);

  // Anti-sleep: tahan display & sistem agar tidak idle/sleep selama ibadah
  powerSaveBlocker.start('prevent-display-sleep');
  powerSaveBlocker.start('prevent-app-suspension');

  cleanupStaleMacSubApps();
  createPyProc();
  createSplashWindow();
  });
}

// Matikan Python saat aplikasi ditutup
app.on('before-quit', () => {
  if (!gotSingleInstanceLock) return;
  isQuitting = true;
  exitPyProc();
});

app.on('will-quit', () => {
  if (!gotSingleInstanceLock) return;
  isQuitting = true;
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
    const allowed = ['camera', 'microphone', 'mediaStream', 'video', 'audio', 'media'];
    callback(allowed.includes(permission));
  });

  mainWindow.webContents.session.setDevicePermissionHandler((details) => {
    return details.deviceType === 'camera' || details.deviceType === 'microphone';
  });

  // Gunakan 127.0.0.1 langsung (hindari delay IPv6 ::1 lookup pada 'localhost' di macOS)
  let mainLoadRetries = 0;
  const MAIN_URL = 'http://127.0.0.1:18888';

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
    if (!isMainFrame || isQuitting) return;
    if (errorCode === -3) return; // ERR_ABORTED (navigasi normal)
    appendBackendLog(`mainWindow did-fail-load (${errorCode}): ${errorDescription} [${validatedURL}]`);
    if (mainLoadRetries < 5) {
      mainLoadRetries += 1;
      updateSplashStatus('Reconnecting', `Retrying workspace load (${mainLoadRetries}/5)...`);
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed() && !isQuitting) {
          mainWindow.loadURL(MAIN_URL);
        }
      }, 1000);
    } else {
      dialog.showErrorBox(
        'ShowLyrics Workspace Load Error',
        `Failed to load ${MAIN_URL} (${errorDescription}).\nSee log: ${backendLogPath}`
      );
      if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
      mainWindow.show();
    }
  });

  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    appendBackendLog(`mainWindow render-process-gone: reason=${details.reason}, exitCode=${details.exitCode}`);
    if (!isQuitting && mainWindow && !mainWindow.isDestroyed()) {
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed() && !isQuitting) {
          mainWindow.loadURL(MAIN_URL);
        }
      }, 500);
    }
  });

  mainWindow.webContents.on('did-finish-load', () => {
    mainLoadRetries = 0;
    if (forceGpuCompositingLayer) {
      applyCompositingToWindow(mainWindow, true);
    }
  });

  mainWindow.loadURL(MAIN_URL);

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

  // Konfirmasi sebelum tutup aplikasi — Close (X) menutup seluruh app & semua child process dengan bersih
  mainWindow.on('close', (e) => {
    if (isQuitting) return;

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
      return;
    }

    e.preventDefault();
    gracefulShutdownAndExit(0, false);
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
  const primaryDisplay = screen.getPrimaryDisplay();
  const displays = screen.getAllDisplays();

  const getAspectRatioStr = (w, h) => {
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const d = gcd(w, h);
    const rw = w / d;
    const rh = h / d;
    if ((rw === 16 && rh === 9) || (rw === 16 && rh === 10) || (rw === 4 && rh === 3) || (rw === 21 && rh === 9) || (rw === 32 && rh === 9)) {
      return `${rw}:${rh}`;
    }
    const dec = w / h;
    if (Math.abs(dec - 16 / 9) < 0.03) return '16:9';
    if (Math.abs(dec - 16 / 10) < 0.03) return '16:10';
    if (Math.abs(dec - 4 / 3) < 0.03) return '4:3';
    if (Math.abs(dec - 21 / 9) < 0.03) return '21:9';
    return `${rw}:${rh}`;
  };

  displays.forEach((disp, index) => {
    const isPrimary = disp.id === primaryDisplay.id;
    const aspectRatio = getAspectRatioStr(disp.bounds.width, disp.bounds.height);
    const scalePercent = Math.round((disp.scaleFactor || 1) * 100);

    const win = new BrowserWindow({
      x: disp.bounds.x,
      y: disp.bounds.y,
      width: disp.bounds.width,
      height: disp.bounds.height,
      fullscreen: false,
      enableLargerThanScreen: true,
      frame: false,
      transparent: false,
      alwaysOnTop: true,
      autoHideMenuBar: true,
      hasShadow: false,
      resizable: false,
      movable: false,
      backgroundColor: '#000000',
      webPreferences: {
        nodeIntegration: false,
        backgroundThrottling: false,
        spellcheck: false,
        devTools: false
      }
    });
    win.setAlwaysOnTop(true, 'pop-up-menu');
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setBounds(disp.bounds);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Display Check - ${index + 1}</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              user-select: none;
            }
            html, body {
              width: 100vw;
              height: 100vh;
              overflow: hidden;
              background: #080a0f;
              color: #ffffff;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            }
            /* 100% Extreme Outer Edge Hatch / Zebra Pattern */
            .outer-zebra-border {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              pointer-events: none;
              z-index: 100;
              border: 8px solid transparent;
              border-image: repeating-linear-gradient(45deg, #ffffff 0, #ffffff 12px, #000000 12px, #000000 24px) 8;
            }
            .inner-red-line {
              position: fixed;
              top: 8px;
              left: 8px;
              right: 8px;
              bottom: 8px;
              pointer-events: none;
              z-index: 99;
              border: 2px solid #ff0055;
            }
            /* Edge Markers */
            .edge-tag {
              position: fixed;
              z-index: 101;
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 1px;
              color: #000000;
              background: #ffcc00;
              padding: 2px 10px;
              border-radius: 2px;
            }
            .edge-top { top: 10px; left: 50%; transform: translateX(-50%); }
            .edge-bottom { bottom: 10px; left: 50%; transform: translateX(-50%); }
            .edge-left { top: 50%; left: 10px; transform: translateY(-50%) rotate(-90deg); transform-origin: left center; }
            .edge-right { top: 50%; right: 10px; transform: translateY(-50%) rotate(90deg); transform-origin: right center; }

            /* Corner Crop L-Marks */
            .corner-crop {
              position: fixed;
              width: 50px;
              height: 50px;
              z-index: 98;
              pointer-events: none;
            }
            .corner-tl { top: 12px; left: 12px; border-top: 4px solid #00f0ff; border-left: 4px solid #00f0ff; }
            .corner-tr { top: 12px; right: 12px; border-top: 4px solid #00f0ff; border-right: 4px solid #00f0ff; }
            .corner-bl { bottom: 12px; left: 12px; border-bottom: 4px solid #00f0ff; border-left: 4px solid #00f0ff; }
            .corner-br { bottom: 12px; right: 12px; border-bottom: 4px solid #00f0ff; border-right: 4px solid #00f0ff; }

            /* Broadcast Safe Areas */
            .safe-action {
              position: fixed;
              top: 5vh;
              left: 5vw;
              width: 90vw;
              height: 90vh;
              border: 1px dashed rgba(0, 240, 255, 0.45);
              pointer-events: none;
              z-index: 50;
            }
            .safe-action-label {
              position: absolute;
              top: 4px;
              left: 6px;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 1px;
              color: rgba(0, 240, 255, 0.7);
            }
            .safe-title {
              position: fixed;
              top: 10vh;
              left: 10vw;
              width: 80vw;
              height: 80vh;
              border: 1px dashed rgba(255, 204, 0, 0.45);
              pointer-events: none;
              z-index: 51;
            }
            .safe-title-label {
              position: absolute;
              top: 4px;
              left: 6px;
              font-size: 10px;
              font-weight: 700;
              letter-spacing: 1px;
              color: rgba(255, 204, 0, 0.7);
            }

            /* Crosshairs & Center Circle (Aspect Ratio Distortion Check) */
            .crosshair-h {
              position: fixed;
              top: 50%;
              left: 0;
              width: 100vw;
              height: 1px;
              background: rgba(255, 255, 255, 0.15);
              pointer-events: none;
              z-index: 20;
            }
            .crosshair-v {
              position: fixed;
              top: 0;
              left: 50%;
              width: 1px;
              height: 100vh;
              background: rgba(255, 255, 255, 0.15);
              pointer-events: none;
              z-index: 20;
            }
            .center-circle {
              position: fixed;
              top: 50%;
              left: 50%;
              width: min(65vh, 65vw);
              height: min(65vh, 65vw);
              transform: translate(-50%, -50%);
              border: 2px solid rgba(255, 255, 255, 0.2);
              border-radius: 50%;
              pointer-events: none;
              z-index: 21;
            }

            /* Calibration Bars */
            .bars-container {
              position: fixed;
              bottom: 24px;
              left: 50%;
              transform: translateX(-50%);
              width: min(84vw, 900px);
              display: flex;
              flex-direction: column;
              gap: 4px;
              z-index: 60;
            }
            .color-bars {
              display: flex;
              height: 18px;
              border-radius: 4px;
              overflow: hidden;
              border: 1px solid rgba(255, 255, 255, 0.25);
            }
            .color-bar { flex: 1; height: 100%; }
            .grayscale-bars {
              display: flex;
              height: 14px;
              border-radius: 4px;
              overflow: hidden;
              border: 1px solid rgba(255, 255, 255, 0.25);
            }
            .gray-bar { flex: 1; height: 100%; }

            /* Center Hub Card */
            .hud-center {
              position: fixed;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              background: rgba(12, 16, 24, 0.92);
              backdrop-filter: blur(16px);
              border: 1px solid rgba(255, 255, 255, 0.2);
              box-shadow: 0 16px 48px rgba(0, 0, 0, 0.8), 0 0 24px rgba(0, 240, 255, 0.15);
              border-radius: 16px;
              padding: 28px 40px;
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              z-index: 70;
              min-width: min(90vw, 480px);
            }
            .hud-logo {
              width: 52px;
              height: 52px;
              margin-bottom: 12px;
              object-fit: contain;
            }
            .hud-sub {
              font-size: 11px;
              letter-spacing: 3px;
              text-transform: uppercase;
              color: #00f0ff;
              font-weight: 700;
              margin-bottom: 6px;
            }
            .hud-title-row {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 18px;
            }
            .hud-title {
              font-size: 38px;
              font-weight: 900;
              letter-spacing: 1px;
              color: #ffffff;
            }
            .role-badge {
              font-size: 11px;
              font-weight: 800;
              letter-spacing: 1px;
              padding: 4px 10px;
              border-radius: 20px;
              text-transform: uppercase;
            }
            .role-primary {
              background: rgba(255, 204, 0, 0.2);
              color: #ffcc00;
              border: 1px solid #ffcc00;
            }
            .role-secondary {
              background: rgba(0, 240, 255, 0.2);
              color: #00f0ff;
              border: 1px solid #00f0ff;
            }
            .specs-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 10px;
              width: 100%;
              margin-bottom: 18px;
            }
            .spec-box {
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 8px;
              padding: 8px 12px;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
            .spec-label {
              font-size: 10px;
              letter-spacing: 1.5px;
              color: #8892b0;
              text-transform: uppercase;
              font-weight: 600;
              margin-bottom: 4px;
            }
            .spec-val {
              font-size: 16px;
              font-weight: 800;
              color: #ffffff;
            }
            .hud-hint {
              font-size: 11px;
              color: #64748b;
              letter-spacing: 0.5px;
            }
          </style>
        </head>
        <body>
          <!-- 100% Boundary Zebra & Inner Red Perimeter Line -->
          <div class="outer-zebra-border"></div>
          <div class="inner-red-line"></div>

          <!-- Edge Position Indicators -->
          <div class="edge-tag edge-top">▲ TOP BOUNDARY (Y: ${disp.bounds.y})</div>
          <div class="edge-tag edge-bottom">▼ BOTTOM BOUNDARY (Y: ${disp.bounds.y + disp.bounds.height})</div>
          <div class="edge-tag edge-left">▲ LEFT BOUNDARY (X: ${disp.bounds.x})</div>
          <div class="edge-tag edge-right">▲ RIGHT BOUNDARY (X: ${disp.bounds.x + disp.bounds.width})</div>

          <!-- 4 Corner L-Marks -->
          <div class="corner-crop corner-tl"></div>
          <div class="corner-crop corner-tr"></div>
          <div class="corner-crop corner-bl"></div>
          <div class="corner-crop corner-br"></div>

          <!-- Safe Areas -->
          <div class="safe-action">
            <span class="safe-action-label">ACTION SAFE (90%)</span>
          </div>
          <div class="safe-title">
            <span class="safe-title-label">TITLE SAFE (80%)</span>
          </div>

          <!-- Center Crosshair & Alignment Geometry Circle -->
          <div class="crosshair-h"></div>
          <div class="crosshair-v"></div>
          <div class="center-circle"></div>

          <!-- Center HUD Card -->
          <div class="hud-center">
            <img class="hud-logo" src="http://127.0.0.1:18888/static/logo.png" alt="ShowLyrics" onerror="this.style.display='none'">
            <div class="hud-sub">ShowLyrics Display Check</div>
            <div class="hud-title-row">
              <h1 class="hud-title">DISPLAY ${index + 1}</h1>
              <span class="role-badge ${isPrimary ? 'role-primary' : 'role-secondary'}">
                ${isPrimary ? '★ PRIMARY' : 'SECONDARY'}
              </span>
            </div>
            <div class="specs-grid">
              <div class="spec-box">
                <span class="spec-label">Native Resolution</span>
                <span class="spec-val">${disp.bounds.width} × ${disp.bounds.height}</span>
              </div>
              <div class="spec-box">
                <span class="spec-label">Aspect Ratio</span>
                <span class="spec-val">${aspectRatio}</span>
              </div>
              <div class="spec-box">
                <span class="spec-label">DPI Scale</span>
                <span class="spec-val">${scalePercent}%</span>
              </div>
              <div class="spec-box">
                <span class="spec-label">Bounds Offset</span>
                <span class="spec-val">X:${disp.bounds.x} Y:${disp.bounds.y}</span>
              </div>
            </div>
            <div class="hud-hint">Verifying edge overscan & alignment • Closes automatically</div>
          </div>

          <!-- Broadcast Calibration Bars -->
          <div class="bars-container">
            <div class="color-bars">
              <div class="color-bar" style="background:#ffffff"></div>
              <div class="color-bar" style="background:#ffff00"></div>
              <div class="color-bar" style="background:#00ffff"></div>
              <div class="color-bar" style="background:#00ff00"></div>
              <div class="color-bar" style="background:#ff00ff"></div>
              <div class="color-bar" style="background:#ff0000"></div>
              <div class="color-bar" style="background:#0000ff"></div>
              <div class="color-bar" style="background:#000000"></div>
            </div>
            <div class="grayscale-bars">
              <div class="gray-bar" style="background:#000000"></div>
              <div class="gray-bar" style="background:#1c1c1c"></div>
              <div class="gray-bar" style="background:#383838"></div>
              <div class="gray-bar" style="background:#555555"></div>
              <div class="gray-bar" style="background:#717171"></div>
              <div class="gray-bar" style="background:#8d8d8d"></div>
              <div class="gray-bar" style="background:#aaaaaa"></div>
              <div class="gray-bar" style="background:#c6c6c6"></div>
              <div class="gray-bar" style="background:#e2e2e2"></div>
              <div class="gray-bar" style="background:#ffffff"></div>
            </div>
          </div>
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
    }, 3000);
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
    let bgHex = '#000000';
    if (type === 'main') bgHex = mainDisplayBgColor;
    if (type === 'lt') bgHex = ltDisplayBgColor;

    projectorWindows[type] = new BrowserWindow({
      x,
      y,
      width,
      height,
      title: winTitle,
      fullscreen: false,          // OS fullscreen dimatikan — pakai manual full-size window
      enableLargerThanScreen: true,
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
      backgroundColor: bgHex,     // Hitam/custom sejak awal — tidak ada flash putih
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
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

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
          background: #000 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
      `).catch(() => {});
    });

    win.webContents.on('did-finish-load', () => {
      // CSS 1: Layout & visual dasar
      win.webContents.insertCSS(`
        html, body {
          background: #000 !important;
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
                if (!v._intentionalPause && v.dataset.intentionalPause !== 'true') {
                  setTimeout(function() { v.play().catch(function(){}); }, 80);
                }
              });
              // Tambahan: jaga agar video tidak ter-pause via visibility change
              doc.addEventListener('visibilitychange', function() {
                if (doc.hidden) return; // jangan lakukan apa-apa saat hidden
                if (!v.paused || v._intentionalPause || v.dataset.intentionalPause === 'true') return;
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
      if (forceGpuCompositingLayer) {
        applyCompositingToWindow(win, true);
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
// APP: WINDOW-ALL-CLOSED
// Tutup seluruh aplikasi dan pastikan semua child process mati bersih
// ─────────────────────────────────────────────────────────────────────────────
app.on('window-all-closed', () => {
  if (!isShuttingDown) {
    gracefulShutdownAndExit(0, false);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// APP: ACTIVATE (macOS Dock click — cegah duplicate splash screen)
// ─────────────────────────────────────────────────────────────────────────────
app.on('activate', () => {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.show();
    return;
  }
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
// IPC: CAMERA PERMISSION
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('request-camera-permission', async () => {
  try {
    log('Camera permission requested from renderer');
    if (process.platform === 'darwin' && typeof systemPreferences.askForMediaAccess === 'function') {
      const granted = await systemPreferences.askForMediaAccess('camera');
      return granted;
    }
    return true;
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
  gracefulShutdownAndExit(0, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: RESTART APP — dipanggil setelah GPU Compatibility Mode diubah
// GPU flags hanya berlaku saat cold-start, jadi restart diperlukan
// ─────────────────────────────────────────────────────────────────────────────
ipcMain.handle('restart-app', () => {
  log('[IPC] restart-app dipanggil — melakukan relaunch...');
  gracefulShutdownAndExit(0, true);
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: APPLY COMPOSITING CSS — inject/hapus CSS Force GPU Compositing Layer
// Tidak perlu restart — berlaku langsung ke semua window yang aktif
// ─────────────────────────────────────────────────────────────────────────────
const CSS_COMPOSITING = `
  video {
    transform: translateZ(0) !important;
    isolation: isolate !important;
    will-change: transform !important;
    backface-visibility: hidden !important;
    -webkit-backface-visibility: hidden !important;
  }
`;
const CSS_RESET = `
  video {
    transform: none !important;
    isolation: auto !important;
    will-change: auto !important;
    backface-visibility: visible !important;
    -webkit-backface-visibility: visible !important;
  }
`;

function applyCompositingToWindow(win, enable) {
  if (!win || win.isDestroyed()) return;
  win.webContents.insertCSS(enable ? CSS_COMPOSITING : CSS_RESET).catch(() => {});
  win.webContents.executeJavaScript(`
    (function() {
      document.querySelectorAll('iframe').forEach(function(iframe) {
        try {
          var doc = iframe.contentDocument;
          if (!doc) return;
          var styleId = 'sl-compositing-fix';
          var existing = doc.getElementById(styleId);
          if (existing) existing.remove();
          if (${Boolean(enable)}) {
            var s = doc.createElement('style');
            s.id = styleId;
            s.textContent = ${JSON.stringify(CSS_COMPOSITING)};
            doc.head.appendChild(s);
          }
        } catch(e) {}
      });
    })();
  `).catch(() => {});
}

ipcMain.handle('apply-compositing-css', (_event, enable) => {
  forceGpuCompositingLayer = !!enable;
  BrowserWindow.getAllWindows().forEach((win) => {
    applyCompositingToWindow(win, forceGpuCompositingLayer);
    log('[IPC] apply-compositing-css', forceGpuCompositingLayer ? 'ON' : 'OFF', 'untuk window:', win.id);
  });
  return { status: 'ok', enabled: forceGpuCompositingLayer };
});

// ─────────────────────────────────────────────────────────────────────────────
// IPC: OUTPUT BACKGROUND COLOR (Main Display & Lower Third)
// ─────────────────────────────────────────────────────────────────────────────
function applyOutputBgColor(target, colorHex) {
  if (typeof colorHex !== 'string' || !/^#([0-9A-Fa-f]{3}){1,2}$/.test(colorHex)) return;

  if (!target || target === 'main' || target === 'all') {
    mainDisplayBgColor = colorHex;
    appWindowBgColor = colorHex;
    log(`[OUTPUT BG COLOR] Main Display background color set to ${colorHex}`);
    if (projectorWindows.main && !projectorWindows.main.isDestroyed()) {
      projectorWindows.main.setBackgroundColor(colorHex);
    }
  }

  if (!target || target === 'lt' || target === 'all') {
    ltDisplayBgColor = colorHex;
    log(`[OUTPUT BG COLOR] Lower Third background color set to ${colorHex}`);
    if (projectorWindows.lt && !projectorWindows.lt.isDestroyed()) {
      projectorWindows.lt.setBackgroundColor(colorHex);
    }
  }
}

ipcMain.on('set-window-background-color', (_event, payload) => {
  if (typeof payload === 'object' && payload !== null) {
    applyOutputBgColor(payload.target, payload.colorHex || payload.color);
  } else {
    applyOutputBgColor('all', payload);
  }
});

ipcMain.on('set-output-background-color', (_event, payload) => {
  if (typeof payload === 'object' && payload !== null) {
    applyOutputBgColor(payload.target, payload.colorHex || payload.color);
  } else {
    applyOutputBgColor('main', payload);
  }
});
