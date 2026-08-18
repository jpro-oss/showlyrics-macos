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
# Di GitHub Actions diset otomatis via matrix env ARCH.
# ════════════════════════════════════════════════════════════════════════════

# -*- mode: python ; coding: utf-8 -*-
import sys
import os
from PyInstaller.utils.hooks import collect_all, collect_submodules, collect_data_files

assert sys.platform == 'darwin', "Spec ini hanya untuk macOS!"

# ─── DETECT TARGET ARCH ─────────────────────────────────────────────────────
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
    print("[SPEC] Icon: ../src/app.icns")
elif os.path.exists('app.ico'):
    _icon = 'app.ico'
    print("[SPEC] Icon: app.ico (fallback)")
else:
    print("[SPEC] WARNING: Tidak ada icon ditemukan.")

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
markup_datas,    markup_binaries,    markup_hiddenimports    = collect_all('markupsafe')
starlette_datas, starlette_binaries, starlette_hiddenimports = collect_all('starlette')
osc_datas,       osc_binaries,       osc_hiddenimports       = collect_all('pythonosc')
urllib3_datas,   urllib3_binaries,   urllib3_hiddenimports   = collect_all('urllib3')
anyio_datas,     anyio_binaries,     anyio_hiddenimports     = collect_all('anyio')
sniffio_datas,   sniffio_binaries,   sniffio_hiddenimports   = collect_all('sniffio')
h11_datas,       h11_binaries,       h11_hiddenimports       = collect_all('h11')
httpcore_datas,  httpcore_binaries,  httpcore_hiddenimports  = collect_all('httpcore')

# uvloop & httptools — di-install via uvicorn[standard], diimport dinamis sehingga
# PyInstaller tidak mendeteksinya secara otomatis tanpa collect_all eksplisit
try:
    uvloop_datas,     uvloop_binaries,     uvloop_hiddenimports     = collect_all('uvloop')
except Exception:
    uvloop_datas, uvloop_binaries, uvloop_hiddenimports = [], [], []
    print("[SPEC] WARNING: uvloop tidak ditemukan (opsional untuk macOS)")
try:
    httptools_datas,  httptools_binaries,  httptools_hiddenimports  = collect_all('httptools')
except Exception:
    httptools_datas, httptools_binaries, httptools_hiddenimports = [], [], []
    print("[SPEC] WARNING: httptools tidak ditemukan (opsional)")
try:
    certifi_datas,    certifi_binaries,    certifi_hiddenimports    = collect_all('certifi')
except Exception:
    certifi_datas, certifi_binaries, certifi_hiddenimports = [], [], []
    print("[SPEC] WARNING: certifi tidak ditemukan")
# ─── PYARMOR RUNTIME ─────────────────────────────────────────────────────────
# KRITIS: Daftarkan HANYA arsitektur TARGET_ARCH!
# Jika kedua arsitektur didaftarkan sebagai hiddenimport, PyInstaller akan
# mencoba mengumpulkan KEDUA .so file, lalu gagal di COLLECT phase dengan:
#   IncompatibleBinaryArchError: darwin_x86_64/pyarmor_runtime.so incompatible with arm64
# Solusi: filter binary, datas, DAN hiddenimports — semuanya berdasarkan TARGET_ARCH.
pyarmor_binaries = []
pyarmor_datas = []
pyarmor_hiddenimports = ['pyarmor_runtime_000000']

if TARGET_ARCH == 'x86_64':
    _so_src = os.path.join('pyarmor_runtime_000000', 'darwin_x86_64', 'pyarmor_runtime.so')
    _so_dst = os.path.join('pyarmor_runtime_000000', 'darwin_x86_64')
    if os.path.exists(_so_src):
        pyarmor_binaries.append((_so_src, _so_dst))
        print(f"[SPEC] PyArmor x86_64 .so: {_so_src} -> {_so_dst}")
    else:
        print(f"[SPEC] WARNING: {_so_src} tidak ditemukan!")
    pyarmor_hiddenimports += [
        'pyarmor_runtime_000000.darwin_x86_64',
        'pyarmor_runtime_000000.darwin_x86_64.pyarmor_runtime',
    ]
    if os.path.exists('pyarmor_runtime_000000'):
        pyarmor_datas += [
            (os.path.join('pyarmor_runtime_000000', '__init__.py'),
             'pyarmor_runtime_000000'),
            (os.path.join('pyarmor_runtime_000000', 'darwin_x86_64', '__init__.py'),
             os.path.join('pyarmor_runtime_000000', 'darwin_x86_64')),
        ]

elif TARGET_ARCH == 'arm64':
    _so_src = os.path.join('pyarmor_runtime_000000', 'darwin_arm64', 'pyarmor_runtime.so')
    _so_dst = os.path.join('pyarmor_runtime_000000', 'darwin_arm64')
    if os.path.exists(_so_src):
        pyarmor_binaries.append((_so_src, _so_dst))
        print(f"[SPEC] PyArmor arm64 .so: {_so_src} -> {_so_dst}")
    else:
        print(f"[SPEC] WARNING: {_so_src} tidak ditemukan!")
    pyarmor_hiddenimports += [
        'pyarmor_runtime_000000.darwin_arm64',
        'pyarmor_runtime_000000.darwin_arm64.pyarmor_runtime',
    ]
    if os.path.exists('pyarmor_runtime_000000'):
        pyarmor_datas += [
            (os.path.join('pyarmor_runtime_000000', '__init__.py'),
             'pyarmor_runtime_000000'),
            (os.path.join('pyarmor_runtime_000000', 'darwin_arm64', '__init__.py'),
             os.path.join('pyarmor_runtime_000000', 'darwin_arm64')),
        ]

if pyarmor_binaries:
    print(f"[SPEC] PyArmor binaries: {pyarmor_binaries}")
    print(f"[SPEC] PyArmor hiddenimports: {pyarmor_hiddenimports}")
else:
    print("[SPEC] WARNING: pyarmor_runtime_000000 .so tidak ditemukan!")

# ─── ANALYSIS ─────────────────────────────────────────────────────────────────
a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=(
        av_binaries + fitz_binaries + psutil_binaries +
        pydantic_binaries + crypto_binaries + requests_binaries +
        pil_binaries + httpx_binaries + ws_binaries + jinja_binaries +
        markup_binaries + starlette_binaries + osc_binaries + urllib3_binaries +
        anyio_binaries + sniffio_binaries + h11_binaries + httpcore_binaries +
        uvloop_binaries + httptools_binaries + certifi_binaries +
        pyarmor_binaries
    ),
    datas=[
        ('ffmpeg',          '.'),
        ('playback-engine', '.'),
        ('camera-service',  '.'),
        ('templates',       'templates'),
        ('static',          'static'),
    ] + av_datas + fitz_datas + fastapi_datas + uvicorn_datas +
      pydantic_datas + crypto_datas + requests_datas + psutil_datas +
      pptx_datas + pil_datas + httpx_datas + ws_datas + jinja_datas +
      markup_datas + starlette_datas + osc_datas + urllib3_datas +
      anyio_datas + sniffio_datas + h11_datas + httpcore_datas +
      uvloop_datas + httptools_datas + certifi_datas +
      pyarmor_datas,
    hiddenimports=(
        pyarmor_hiddenimports + [
        'background_tasks', 'config', 'connection_manager',
        'license_check', 'license_core', 'access_check', 'access_core',
        'middleware', 'presets', 'scripture', 'sender',
        'routes_media', 'routes_media_crud', 'routes_media_helper',
        'routes_media_stream', 'routes_media_thumb',
        'routes_pages', 'routes_service', 'routes_settings',
        'network_guard', 'file_integrity', 'storage_backend',
        'plistlib', 'pkg_resources', 'importlib.metadata', 'importlib.resources',
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
        'starlette', 'starlette.routing', 'starlette.middleware',
        'starlette.middleware.cors', 'starlette.middleware.base',
        'starlette.staticfiles', 'starlette.templating',
        'starlette.responses', 'starlette.requests', 'starlette.background',
        'starlette.concurrency', 'starlette.config', 'starlette.exceptions',
        'starlette.formparsers', 'starlette.datastructures', 'starlette.types',
        'jinja2', 'jinja2.ext', 'jinja2.loaders', 'jinja2.environment',
        'jinja2.runtime', 'jinja2.filters', 'jinja2.utils', 'jinja2.nativetypes',
        'markupsafe', 'websockets', 'httpx',
        'anyio', 'anyio.abc', 'anyio._backends._asyncio',
        'anyio._backends._trio', 'anyio.streams', 'anyio.streams.memory',
        'sniffio', 'h11', 'h11._connection', 'h11._events', 'h11._state',
        'httpcore', 'httpcore._async', 'httpcore._sync',
        'uvloop', 'httptools', 'certifi',
        'python_multipart', 'multipart',
        'packaging', 'packaging.version', 'packaging.requirements',
        'packaging.specifiers', 'packaging.markers', 'packaging.utils',
        'typing_extensions', 'typing',
        'idna', 'charset_normalizer', 'chardet',
        'ssl', 'certifi', 'cryptography', 'cryptography.fernet',
        'cryptography.hazmat.primitives.kdf.pbkdf2',
        'cryptography.hazmat.primitives.ciphers',
        'cryptography.hazmat.backends',
        'PIL', 'PIL.Image', 'PIL.ImageDraw', 'PIL.ImageFont',
        'PIL.ImageOps', 'PIL.ImageFilter',
        'av', 'av.container', 'av.stream',
        'fitz',
        'pptx', 'pptx.util', 'pptx.presentation', 'pptx.parts.image',
        'requests', 'requests.adapters', 'requests.auth',
        'psutil',
        'pythonosc', 'pythonosc.dispatcher',
        'pythonosc.osc_server', 'pythonosc.udp_client',
        ]
    ) + av_hiddenimports + fitz_hiddenimports + uvicorn_hiddenimports +
      fastapi_hiddenimports + pydantic_hiddenimports + crypto_hiddenimports +
      requests_hiddenimports + psutil_hiddenimports + pptx_hiddenimports +
      pil_hiddenimports + httpx_hiddenimports + ws_hiddenimports +
      jinja_hiddenimports + markup_hiddenimports + starlette_hiddenimports +
      osc_hiddenimports + urllib3_hiddenimports +
      anyio_hiddenimports + sniffio_hiddenimports +
      h11_hiddenimports + httpcore_hiddenimports +
      uvloop_hiddenimports + httptools_hiddenimports + certifi_hiddenimports +
      collect_submodules('uvicorn') +
      collect_submodules('pydantic') +
      collect_submodules('httpx') +
      collect_submodules('websockets') +
      collect_submodules('fastapi') +
      collect_submodules('starlette') +
      collect_submodules('requests') +
      collect_submodules('urllib3') +
      collect_submodules('cryptography') +
      collect_submodules('PIL') +
      collect_submodules('fitz') +
      collect_submodules('jinja2') +
      collect_submodules('markupsafe') +
      collect_submodules('anyio') +
      collect_submodules('httpcore') +
      collect_submodules('pptx') +
      collect_submodules('pythonosc'),
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[
        'tkinter', '_tkinter',
        'win32api', 'win32con', 'win32com', 'win32com.client',
        'pywintypes', 'pythoncom', 'pywin32', 'winreg',
        'PyQt5', 'PySide2', 'PySide6', 'PyQt6',
        'test', 'unittest', 'doctest',
    ],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=None,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=None)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='ShowLyrics',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    icon=_icon,
    target_arch=TARGET_ARCH,
    codesign_identity=None,
    entitlements_file=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=False,
    upx_exclude=[],
    name='ShowLyrics',
    contents_directory='internal',
)