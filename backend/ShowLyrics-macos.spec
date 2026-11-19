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

# ─── ICON ────────────────────────────────────────────────────────────────────
_icon = None
if os.path.exists('../src/app.icns'):
    _icon = '../src/app.icns'
elif os.path.exists('app.ico'):
    _icon = 'app.ico'

# ─── KOLEKSI DEPENDENCY ──────────────────────────────────────────────────────
def _safe_collect(pkg):
    try:
        return collect_all(pkg)
    except Exception:
        return [], [], []

def _safe_submodules(pkg):
    try:
        return collect_submodules(pkg)
    except Exception:
        return []

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
jinja2_datas,    jinja2_binaries,    jinja2_hiddenimports    = _safe_collect('jinja2')
markup_datas,    markup_binaries,    markup_hiddenimports    = _safe_collect('markupsafe')
starlette_datas, starlette_binaries, starlette_hiddenimports = _safe_collect('starlette')
httpx_datas,     httpx_binaries,     httpx_hiddenimports     = _safe_collect('httpx')
ws_datas,        ws_binaries,        ws_hiddenimports        = _safe_collect('websockets')
osc_datas,       osc_binaries,       osc_hiddenimports       = _safe_collect('pythonosc')
urllib3_datas,   urllib3_binaries,   urllib3_hiddenimports   = _safe_collect('urllib3')
anyio_datas,     anyio_binaries,     anyio_hiddenimports     = _safe_collect('anyio')
sniffio_datas,   sniffio_binaries,   sniffio_hiddenimports   = _safe_collect('sniffio')
h11_datas,       h11_binaries,       h11_hiddenimports       = _safe_collect('h11')
httpcore_datas,  httpcore_binaries,  httpcore_hiddenimports  = _safe_collect('httpcore')
uvloop_datas,    uvloop_binaries,    uvloop_hiddenimports    = _safe_collect('uvloop')
httptools_datas, httptools_binaries, httptools_hiddenimports = _safe_collect('httptools')
certifi_datas,   certifi_binaries,   certifi_hiddenimports   = _safe_collect('certifi')
pymp_datas,      pymp_binaries,      pymp_hiddenimports      = _safe_collect('python_multipart')
mp_datas,        mp_binaries,        mp_hiddenimports        = _safe_collect('multipart')

_go_arch = "arm64" if TARGET_ARCH == "arm64" else "amd64"
_extra_datas = []
for _bin_name in ('ffmpeg', 'playback-engine', 'camera-service'):
    _arch_candidate = f"{_bin_name}-{_go_arch}"
    if os.path.isfile(_bin_name):
        _extra_datas.append((_bin_name, '.'))
    elif os.path.isfile(_arch_candidate):
        _extra_datas.append((_arch_candidate, '.'))

# ─── PYARMOR RUNTIME (STRICTLY ISOLATED PER TARGET_ARCH) ─────────────────────
# KRITIS: PyInstaller macOS melempar IncompatibleBinaryArchError jika .so dari
# arsitektur lawan ikut masuk. Hanya bundle .so yang sesuai TARGET_ARCH!
pyarmor_binaries = []
pyarmor_datas = []
pyarmor_hiddenimports = []

if os.path.isdir('pyarmor_runtime_000000'):
    pyarmor_hiddenimports.append('pyarmor_runtime_000000')
    _root_init = os.path.join('pyarmor_runtime_000000', '__init__.py')
    if os.path.isfile(_root_init):
        pyarmor_datas.append((_root_init, 'pyarmor_runtime_000000'))

    # Single-platform layout fallback (pyarmor_runtime_000000/pyarmor_runtime.so)
    _flat_so = os.path.join('pyarmor_runtime_000000', 'pyarmor_runtime.so')
    if os.path.isfile(_flat_so):
        pyarmor_binaries.append((_flat_so, 'pyarmor_runtime_000000'))
        pyarmor_hiddenimports.append('pyarmor_runtime_000000.pyarmor_runtime')

    # Multi-platform layout: hanya arch TARGET_ARCH
    _arch_subdirs = ['darwin_arm64', 'darwin_aarch64'] if TARGET_ARCH == 'arm64' else ['darwin_x86_64']
    for _sub in _arch_subdirs:
        _sub_dir = os.path.join('pyarmor_runtime_000000', _sub)
        _sub_so = os.path.join(_sub_dir, 'pyarmor_runtime.so')
        _sub_init = os.path.join(_sub_dir, '__init__.py')
        if os.path.isfile(_sub_so):
            pyarmor_binaries.append((_sub_so, _sub_dir))
            pyarmor_hiddenimports += [
                f'pyarmor_runtime_000000.{_sub}',
                f'pyarmor_runtime_000000.{_sub}.pyarmor_runtime',
            ]
            if os.path.isfile(_sub_init):
                pyarmor_datas.append((_sub_init, _sub_dir))
            print(f"[SPEC] PyArmor {TARGET_ARCH} .so: {_sub_so} -> {_sub_dir}")

# ─── ANALYSIS ────────────────────────────────────────────────────────────────
a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=(
        av_binaries + fitz_binaries + psutil_binaries +
        pydantic_binaries + crypto_binaries + requests_binaries +
        pil_binaries + jinja2_binaries + markup_binaries + starlette_binaries +
        httpx_binaries + ws_binaries + osc_binaries + urllib3_binaries +
        anyio_binaries + sniffio_binaries + h11_binaries + httpcore_binaries +
        uvloop_binaries + httptools_binaries + certifi_binaries +
        pymp_binaries + mp_binaries + pyarmor_binaries
    ),
    datas=[
        # ── Application Assets ───────────────────────────────────────────
        ('templates',       'templates'), # Jinja2 templates
        ('static',          'static'),    # CSS, JS, images, wm.js
    ] + _extra_datas + pyarmor_datas + av_datas + fitz_datas + fastapi_datas +
      uvicorn_datas + pydantic_datas + crypto_datas + requests_datas +
      psutil_datas + pptx_datas + pil_datas + jinja2_datas + markup_datas +
      starlette_datas + httpx_datas + ws_datas + osc_datas + urllib3_datas +
      anyio_datas + sniffio_datas + h11_datas + httpcore_datas +
      uvloop_datas + httptools_datas + certifi_datas +
      pymp_datas + mp_datas,

    hiddenimports=(
        pyarmor_hiddenimports + [
        # ── App Modules ───────────────────────────────────────────────────
        'background_tasks', 'config', 'connection_manager',
        'license_check', 'license_core', 'middleware',
        'access_check', 'access_core',
        'presets', 'scripture', 'sender',
        'routes_media', 'routes_media_crud', 'routes_media_helper',
        'routes_media_stream', 'routes_media_thumb',
        'routes_pages', 'routes_plugin', 'routes_service', 'routes_settings',
        'network_guard', 'file_integrity',
        'storage_backend',   # macOS persistent storage (menggantikan winreg)

        # ── Python stdlib (diperlukan saat PyArmor menyembunyikan AST imports) ─
        'asyncio', 'asyncio.events', 'asyncio.selector_events',
        'platform', 'urllib', 'urllib.parse', 'urllib.request', 'urllib.error',
        'http.client', 'zipfile', 'io', 'json', 'uuid', 're', 'time', 'collections',
        'collections.abc', 'subprocess', 'tempfile', 'threading',
        'multiprocessing', 'shutil', 'glob', 'hashlib', 'base64',
        'secrets', 'socket', 'atexit', 'copy', 'datetime',
        'concurrent', 'concurrent.futures', 'dataclasses', 'enum',
        'xml', 'xml.etree', 'xml.etree.ElementTree', 'html', 'html.parser',
        'email', 'email.mime', 'email.mime.text', 'email.mime.multipart',
        'email.mime.application', 'email.parser', 'email.message', 'email.utils',
        'plistlib', 'importlib.metadata', 'importlib.resources', 'ctypes', 'ssl',

        # ── FastAPI Ecosystem ─────────────────────────────────────────────
        'uvicorn', 'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto',
        'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan', 'uvicorn.lifespan.on',
        'uvicorn.middleware', 'uvicorn.middleware.proxy_headers',
        'uvicorn.config', 'uvicorn.main', 'uvicorn.server',
        'fastapi', 'fastapi.middleware', 'fastapi.middleware.cors',
        'fastapi.templating', 'fastapi.staticfiles',
        'fastapi.responses', 'fastapi.requests', 'fastapi.encoders',
        'fastapi.exceptions', 'fastapi.routing', 'fastapi.params',
        'fastapi.security', 'fastapi.background',
        'jinja2', 'markupsafe', 'multipart', 'python_multipart',
        'starlette', 'starlette.routing', 'starlette.middleware',
        'starlette.middleware.cors', 'starlette.middleware.base',
        'starlette.staticfiles', 'starlette.templating',
        'starlette.responses', 'starlette.requests', 'starlette.background',
        'starlette.concurrency', 'starlette.config', 'starlette.exceptions',
        'starlette.formparsers', 'starlette.datastructures', 'starlette.types',
        'anyio', 'anyio.abc', 'anyio._backends._asyncio', 'anyio.streams',
        'sniffio', 'h11', 'httpcore', 'uvloop', 'httptools', 'certifi',
        'websockets', 'packaging', 'typing_extensions', 'idna', 'charset_normalizer',

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
        'urllib3', 'httpx', 'psutil',

        # ── OSC ───────────────────────────────────────────────────────────
        'pythonosc', 'pythonosc.dispatcher',
        'pythonosc.osc_server', 'pythonosc.udp_client',
        ]
    ) + av_hiddenimports + fitz_hiddenimports + uvicorn_hiddenimports +
      fastapi_hiddenimports + pydantic_hiddenimports + crypto_hiddenimports +
      requests_hiddenimports + psutil_hiddenimports + pptx_hiddenimports +
      pil_hiddenimports + jinja2_hiddenimports + markup_hiddenimports +
      starlette_hiddenimports + httpx_hiddenimports + ws_hiddenimports +
      osc_hiddenimports + urllib3_hiddenimports + anyio_hiddenimports +
      sniffio_hiddenimports + h11_hiddenimports + httpcore_hiddenimports +
      uvloop_hiddenimports + httptools_hiddenimports + certifi_hiddenimports +
      pymp_hiddenimports + mp_hiddenimports +
      _safe_submodules('uvicorn') + _safe_submodules('pydantic') +
      _safe_submodules('httpx') + _safe_submodules('websockets') +
      _safe_submodules('fastapi') + _safe_submodules('starlette') +
      _safe_submodules('requests') + _safe_submodules('urllib3') +
      _safe_submodules('cryptography') + _safe_submodules('PIL') +
      _safe_submodules('fitz') + _safe_submodules('jinja2') +
      _safe_submodules('markupsafe') + _safe_submodules('anyio') +
      _safe_submodules('httpcore') + _safe_submodules('pptx') +
      _safe_submodules('pythonosc'),

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
        # ── Stdlib tidak terpakai ─────────────────────────────────────────
        'test', 'unittest', 'doctest',
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
    console=True,                 # Headless server — stdout/stderr ditangkap Electron
    disable_windowed_traceback=False,
    argv_emulation=False,         # False untuk non-GUI app
    icon=_icon,
    target_arch=TARGET_ARCH,
    codesign_identity=None,       # Unsigned distribution (ad-hoc signed in CI)
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
