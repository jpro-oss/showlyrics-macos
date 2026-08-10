# 🍎 MAC VER — AI Context Guide
## ShowLyrics V.1.35.3 — macOS Workspace

> **BACA INI PERTAMA** sebelum mengubah file apapun di workspace ini.

---

## Identitas Workspace Ini

- **Platform target**: macOS (Big Sur 11.0+, Intel & Apple Silicon)
- **Build output**: `.dmg` dan `.zip` installer
- **Lokasi data user**: `~/Library/Application Support/ShowLyrics/`
- **Python backend binary**: `ShowLyrics` (tanpa ekstensi .exe)
- **FFmpeg binary**: `ffmpeg` (Unix, perlu chmod 0o755)
- **File dialog system**: `osascript` (AppleScript)
- **GPU API**: Metal (Apple native)
- **Electron icon**: `.icns` format

---

## Panduan Lengkap

Baca dokumen-dokumen berikut di folder parent:
- `../DUAL_WORKSPACE_GUIDE.md` — Master guide, aturan sync
- `../PLATFORM_DIFFERENCES.md` — Detail teknis perbedaan
- `../SHARED_FEATURES_CONTRACT.md` — Fitur yang harus identik dengan WIN VER
- `../SYNC_CHECKLIST.md` — Checklist saat membuat perubahan

---

## Aturan WAJIB untuk Workspace Ini

### 1. Setiap perubahan fitur HARUS direplikasi ke WIN VER
Path: `e:\NEW SHOWLYRICS\V.1.35.3\WIN VER\`

### 2. File Platform-Specific di Workspace Ini

#### `src/main.js` — macOS GPU Config
```javascript
// WAJIB di MAC VER — JANGAN hapus:
app.commandLine.appendSwitch('use-angle', 'metal');   // Metal, BUKAN d3d11
app.commandLine.appendSwitch('enable-features', [
  'MetalForWebGL',    // Metal WebGL — MAC ONLY
  // JANGAN: D3D11VideoDecoder, D3D12VideoDecoder, DirectComposition
].join(','));

// Process kill: SIGKILL (Unix)
process.kill(pyProc.pid, 'SIGKILL');

// Menu bar: wajib ada untuk Cmd+Q dan Dock behavior
Menu.setApplicationMenu(macAppMenu);

// App lifecycle: macOS keep-alive di Dock
app.on('activate', () => { ... }); // Dock click re-open
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit(); // Tetap running di macOS
});
```

#### `backend/config.py` — macOS Data Path
```python
def get_user_data_path(filename):
    # MAC: ~/Library/Application Support/ShowLyrics/
    app_folder = os.path.expanduser('~/Library/Application Support/ShowLyrics')
    # JANGAN ganti ke ~/Documents/ - itu WIN VER
```

#### `backend/background_tasks.py` — FFmpeg macOS
```python
def get_ffmpeg_path():
    ffmpeg_path = os.path.join(base_path, "ffmpeg")  # TANPA .exe
    if os.path.exists(ffmpeg_path):
        os.chmod(ffmpeg_path, 0o755)  # WAJIB - jangan hapus!
        return ffmpeg_path
    return "ffmpeg"  # Homebrew fallback
```

#### `backend/routes_settings.py` — macOS File Dialog
```python
# MAC: osascript (AppleScript) — BUKAN tkinter
import subprocess
# JANGAN: import tkinter

def _run_osascript(script, timeout=60):
    result = subprocess.run(['osascript', '-e', script], ...)
    
# Dialog pattern:
script = 'POSIX path of (choose folder ...)'
result = await asyncio.to_thread(_run_osascript, script)
```

#### `package.json` — macOS Build
```json
"scripts": {
  "dist": "electron-builder --mac",
  "dist:arm64": "electron-builder --mac --arm64",
  "dist:x64": "electron-builder --mac --x64"
},
"mac": {
  "target": [{"target": "dmg"}, {"target": "zip"}],
  "icon": "src/app.icns"  // .icns — BUKAN .ico
}
```

---

## File Eksklusif di MAC VER (tidak ada di WIN VER)

- `build-go-macos.ps1` — Build Go engine untuk macOS
- `build-go-macos.sh` — Build script shell
- `backend/ShowLyrics-macos.spec` — PyInstaller spec macOS
- `backend/build-pyinstaller-macos.sh` — PyInstaller build script
- `backend/requirements-macos.txt` — Python deps macOS
- `backend/playback-engine` — Go binary (amd64)
- `backend/playback-engine-amd64` — Go binary Intel
- `backend/playback-engine-arm64` — Go binary Apple Silicon
- `ffmpeg80intel.zip` — FFmpeg Intel build
- `ffmpeg81arm.zip` — FFmpeg ARM build
- `.github/` — GitHub Actions (mungkin CI/CD)

---

## Struktur App di macOS (Runtime)

```
ShowLyricsApp.app/
└── Contents/
    └── Resources/
        └── bin/
            └── ShowLyrics          <- Python backend binary (no .exe)
```

Data user tersimpan di:
```
~/Library/Application Support/ShowLyrics/
├── songs.json
├── service.json
├── app_settings.json
├── backgrounds.json
├── Thumbnails/
├── backgrounds/
├── audios/
├── photos/
├── presentations/
└── bibles/
```

---

## Quick Check Sebelum Commit

Sebelum selesai, pastikan:
1. Apakah saya sudah mengubah file yang sama di WIN VER?
2. Apakah ada tkinter/filedialog yang masuk ke MAC VER? (Jangan!)
3. Apakah ada D3D/DXGI flags yang masuk ke src/main.js MAC? (Jangan!)
4. Apakah `os.chmod(ffmpeg_path, 0o755)` masih ada di background_tasks.py?
