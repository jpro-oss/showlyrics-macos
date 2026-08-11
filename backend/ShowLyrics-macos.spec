# ShowLyrics-macos.spec
# ════════════════════════════════════════════════════════════════════════════
# PyInstaller SPEC FILE — macOS Dual Architecture
#
# Mendukung build terpisah per-arsitektur:
#   ARCH=arm64  → native Apple Silicon (M1/M2/M3)
#   ARCH=x86_64 → native Intel Mac, via Rosetta di Apple Silicon
#
# Build command:
#   ARCH=arm64  pyinstaller ShowLyrics-macos.spec --clean --noconfirm
#   ARCH=x86_64 pyinstaller ShowLyrics-macos.spec --clean --noconfirm
#
# Di GitHub Actions diset otomatis via matrix env.
# ════════════════════════════════════════════════════════════════════════════

# -*- mode: python ; coding: utf-8 -*-
import sys
import os
from PyInstaller.utils.hooks import collect_all, collect_submodules, collect_data_files

assert sys.platform == 'darwin', "Spec ini hanya untuk macOS!"

# ─── DETECT TARGET ARCH ─────────────────────────────────────────────────────
# Ambil dari env var ARCH yang di-set oleh CI matrix
# Jika tidak ada, gunakan arsitektur runner yang sedang berjalan
_env_arch = os.environ.get("ARCH", "").strip()
if _env_arch in ("arm64", "x86_64"):
    TARGET_ARCH = _env_arch
else:
    import platform
    _machine = platform.machine().lower()
    TARGET_ARCH = "arm64" if _machine == "arm64" else "x86_64"

print(f"[SPEC] Building for target_arch: {TARGET_ARCH}")

# ─── KOLEKSI DEPENDENCY ──────────────────────────────────────────────────────
av_datas,        av_binaries,        av_hiddenimports        = collect_all('av')
fitz_datas,      fitz_binaries,      fitz_hiddenimports      = collect_all('fitz')
uvicorn_datas,   uvicorn_binaries,   uvicorn_hiddenimports   = collect_all('uvicorn')
fastapi_datas,   fastapi_binaries,   fastapi_hiddenimports   = collect_all('fastapi')
pydantic_datas,  pydantic_binaries,  pydantic_hiddenimports  = collect_all('pydantic')
crypto_datas,    crypto_binaries,    crypto_hiddenimports    = collect_all('cryptography')
requests_datas,  requests_binaries,  requests_hiddenimports  = collect_all('requests')
psutil_datas,    psutil_binaries,    psutil_hiddenimports    = collect_all('psutil')
pptx_datas,      pptx_binaries,      pptx_hiddenimports      = collect_all('pptx')
pil_datas,       pil_binaries,       pil_hiddenimports       = collect_all('PIL')
httpx_datas,     httpx_binaries,     httpx_hiddenimports     = collect_all('httpx')
ws_datas,        ws_binaries,        ws_hiddenimports        = collect_all('websockets')
jinja_datas,     jinja_binaries,     jinja_hiddenimports     = collect_all('jinja2')
starlette_datas, starlette_binaries, starlette_hiddenimports = collect_all('starlette')
osc_datas,       osc_binaries,       osc_hiddenimports       = collect_all('pythonosc')
urllib3_datas,   urllib3_binaries,   urllib3_hiddenimports   = collect_all('urllib3')

# ─── ANALYSIS ────────────────────────────────────────────────────────────────
a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=(
        av_binaries + fitz_binaries + psutil_binaries +
        pydantic_binaries + crypto_binaries + requests_binaries +
        pil_binaries + httpx_binaries + ws_binaries + jinja_binaries +
        starlette_binaries + osc_binaries + urllib3_binaries
    ),
    datas=[
        # ── macOS Binaries (tanpa .exe) ───────────────────────────────────
        ('ffmpeg',          '.'),          # FFmpeg macOS static binary
        ('playback-engine', '.'),          # Go engine macOS
        ('camera-service',  '.'),          # WebRTC camera service macOS
        # ── Application Assets & PyArmor Runtime ─────────────────────────
        ('templates',              'templates'), # Jinja2 templates
        ('static',                 'static'),    # CSS, JS, images, wm.js
        ('pyarmor_runtime_000000', 'pyarmor_runtime_000000') if os.path.exists('pyarmor_runtime_000000') else ('.', '.'),
    ] + av_datas + fitz_datas + fastapi_datas + uvicorn_datas +
      pydantic_datas + crypto_datas + requests_datas + psutil_datas +
      pptx_datas + pil_datas + httpx_datas + ws_datas + jinja_datas +
      starlette_datas + osc_datas + urllib3_datas,

    hiddenimports=[
        # ── PyArmor Obfuscation Runtime ──────────────────────────────────
        'pyarmor_runtime_000000',

        # ── App Modules ───────────────────────────────────────────────────
        'background_tasks', 'config', 'connection_manager',
        'license_check', 'license_core', 'access_check', 'access_core',
        'middleware', 'presets', 'scripture', 'sender',
        'routes_media', 'routes_media_crud', 'routes_media_helper',
        'routes_media_stream', 'routes_media_thumb',
        'routes_pages', 'routes_service', 'routes_settings',
        'network_guard', 'file_integrity',
        'storage_backend',   # macOS persistent storage (menggantikan winreg)

        # ── Python stdlib & Runtime Hooks (SANGAT PENTING UTK macOS) ─────
        'plistlib', 'pkg_resources', 'importlib.metadata', 'importlib.resources', 'pkg_resources.py',
        'email', 'email.mime', 'email.mime.text', 'email.mime.multipart',
        'email.mime.application', 'email.parser', 'email.message', 'email.utils',
        'xml', 'xml.etree', 'xml.etree.ElementTree', 'html', 'html.parser',
        'ctypes', 'sysconfig', 'distutils',
        'asyncio', 'asyncio.events', 'asyncio.selector_events',
        'platform', 'urllib', 'urllib.parse', 'urllib.request', 'urllib.error', 'urllib3',
        'zipfile', 'io', 'json', 'uuid', 're', 'time', 'collections', 'subprocess',
        'tempfile', 'threading', 'multiprocessing', 'hashlib', 'base64', 'dataclasses',
        'enum', 'datetime', 'secrets', 'socket', 'atexit', 'shutil', 'glob',
        'concurrent', 'concurrent.futures',

        # ── FastAPI Ecosystem ─────────────────────────────────────────────
        'uvicorn', 'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto',
        'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan', 'uvicorn.lifespan.on',
        'fastapi', 'fastapi.middleware', 'fastapi.middleware.cors',
        'starlette', 'starlette.routing', 'starlette.middleware',
        'starlette.staticfiles', 'starlette.templating',
        'jinja2', 'websockets', 'httpx',

        # ── Security / Cryptography ───────────────────────────────────────
        'cryptography', 'cryptography.fernet',
        'cryptography.hazmat.primitives.kdf.pbkdf2',
        'cryptography.hazmat.primitives.ciphers',
        'cryptography.hazmat.backends',

        # ── Media ─────────────────────────────────────────────────────────
        'PIL', 'PIL.Image', 'PIL.ImageDraw', 'PIL.ImageFont',
        'PIL.ImageOps', 'PIL.ImageFilter',
        'av', 'av.container', 'av.stream',
        'fitz',

        # ── PPTX ─────────────────────────────────────────────────────────
        'pptx', 'pptx.util', 'pptx.presentation', 'pptx.parts.image',

        # ── Network ───────────────────────────────────────────────────────
        'requests', 'requests.adapters', 'requests.auth',
        'psutil',

        # ── OSC ───────────────────────────────────────────────────────────
        'pythonosc', 'pythonosc.dispatcher',
        'pythonosc.osc_server', 'pythonosc.udp_client',

    ] + av_hiddenimports + fitz_hiddenimports + uvicorn_hiddenimports +
      fastapi_hiddenimports + pydantic_hiddenimports + crypto_hiddenimports +
      requests_hiddenimports + psutil_hiddenimports + pptx_hiddenimports +
      pil_hiddenimports + httpx_hiddenimports + ws_hiddenimports +
      jinja_hiddenimports + starlette_hiddenimports + osc_hiddenimports +
      urllib3_hiddenimports +
      collect_submodules('uvicorn') + collect_submodules('pydantic') +
      collect_submodules('httpx') + collect_submodules('websockets') +
      collect_submodules('fastapi') + collect_submodules('starlette') +
      collect_submodules('requests') + collect_submodules('urllib3'),

    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],

    excludes=[
        # ── Windows-only ──────────────────────────────────────────────────
        'tkinter', '_tkinter',
        'win32api', 'win32con', 'win32com', 'win32com.client',
        'pywintypes', 'pythoncom', 'pywin32', 'winreg',
        # ── GUI Frameworks tidak terpakai ─────────────────────────────────
        'PyQt5', 'PySide2', 'PySide6', 'PyQt6',
        # ── Stdlib test & debug modules (JANGAN exclude plistlib/email!) ──
        'test', 'unittest', 'pdb', 'doctest',
    ],

    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

# ─── PYZ ─────────────────────────────────────────────────────────────────────
pyz = PYZ(a.pure, a.zipped_data, cipher=None)

# ─── EXE ─────────────────────────────────────────────────────────────────────
exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='ShowLyrics',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,                  # Jangan strip — bisa merusak code signing di macOS
    upx=False,                    # UPX tidak kompatibel dengan macOS
    console=False,                # Headless server — tidak perlu terminal
    disable_windowed_traceback=False,
    argv_emulation=False,         # False untuk non-GUI app
    # ── TARGET ARCH ──────────────────────────────────────────────────────────
    # None = ikuti arsitektur runner (arm64 di macos-14, x86_64 di macos-13)
    # Pip wheel single-arch → HARUS None (bukan 'universal2')
    # universal2 hanya mungkin jika SEMUA .so sudah fat binary
    target_arch=None,
    codesign_identity=None,       # Unsigned distribution
    entitlements_file=None,
)

# ─── COLLECT ─────────────────────────────────────────────────────────────────
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='ShowLyrics',
    contents_directory='internal',  # sys._MEIPASS → internal/
)
