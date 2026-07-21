# ShowLyrics-macos.spec
# ════════════════════════════════════════════════════════════════════════════
# PyInstaller SPEC FILE untuk macOS — Equivalent & Optimized
# dari perintah Windows + macOS adaptasi penuh
#
# Keunggulan spec file vs command line:
#   - collect_all() lebih powerful dari --collect-all
#   - Kontrol penuh atas UPX, strip, target_arch
#   - Bisa di-extend tanpa command terlalu panjang
#   - Source control friendly
#
# Build command (jalankan dari folder backend/ di macOS):
#   pyinstaller ShowLyrics-macos.spec --clean --noconfirm
#
# Atau gunakan script:
#   chmod +x build-pyinstaller-macos.sh && ./build-pyinstaller-macos.sh
# ════════════════════════════════════════════════════════════════════════════

# -*- mode: python ; coding: utf-8 -*-
import sys
import os
from PyInstaller.utils.hooks import collect_all, collect_submodules, collect_data_files

assert sys.platform == 'darwin', "Spec ini hanya untuk macOS! Gunakan ShowLyrics.spec untuk Windows."

# ─── KOLEKSI DEPENDENCY (collect_all = binaries + datas + hiddenimports) ─────
av_datas, av_binaries, av_hiddenimports = collect_all('av')
fitz_datas, fitz_binaries, fitz_hiddenimports = collect_all('fitz')
uvicorn_datas, uvicorn_binaries, uvicorn_hiddenimports = collect_all('uvicorn')
fastapi_datas, fastapi_binaries, fastapi_hiddenimports = collect_all('fastapi')
pydantic_datas, pydantic_binaries, pydantic_hiddenimports = collect_all('pydantic')
crypto_datas, crypto_binaries, crypto_hiddenimports = collect_all('cryptography')
requests_datas, requests_binaries, requests_hiddenimports = collect_all('requests')
psutil_datas, psutil_binaries, psutil_hiddenimports = collect_all('psutil')
pptx_datas, pptx_binaries, pptx_hiddenimports = collect_all('pptx')

# ─── ANALYSIS ────────────────────────────────────────────────────────────────
a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=(
        av_binaries + fitz_binaries + psutil_binaries +
        pydantic_binaries + crypto_binaries + requests_binaries
    ),
    datas=[
        # ── macOS Binaries (tanpa .exe) ───────────────────────────────────
        ('ffmpeg',          '.'),            # FFmpeg macOS static binary
        ('playback-engine', '.'),            # Go engine macOS (universal2)
        # ── Application Assets ───────────────────────────────────────────
        ('templates',       'templates'),   # Jinja2 templates
        ('static',          'static'),      # CSS, JS, images, wm.js
        # ── Collected Data ───────────────────────────────────────────────
    ] + av_datas + fitz_datas + fastapi_datas + uvicorn_datas +
      pydantic_datas + crypto_datas + requests_datas + psutil_datas + pptx_datas,

    hiddenimports=[
        # ── App Modules ───────────────────────────────────────────────────
        'background_tasks',
        'config',
        'connection_manager',
        'license_check',
        'license_core',
        'middleware',
        'presets',
        'scripture',
        'sender',
        'routes_media',
        'routes_media_crud',
        'routes_media_helper',
        'routes_media_stream',
        'routes_media_thumb',
        'routes_pages',
        'routes_service',
        'routes_settings',
        'network_guard',
        'file_integrity',
        'storage_backend',      # macOS persistent storage (menggantikan winreg)

        # ── Python stdlib ─────────────────────────────────────────────────
        'asyncio', 'asyncio.events', 'asyncio.selector_events',
        'platform', 'urllib.parse', 'zipfile', 'io', 'json',
        'uuid', 're', 'time', 'collections', 'subprocess',
        'tempfile', 'threading', 'multiprocessing',

        # ── FastAPI Ecosystem ─────────────────────────────────────────────
        'uvicorn', 'uvicorn.logging', 'uvicorn.loops', 'uvicorn.loops.auto',
        'uvicorn.protocols', 'uvicorn.protocols.http', 'uvicorn.protocols.http.auto',
        'uvicorn.protocols.websockets', 'uvicorn.protocols.websockets.auto',
        'uvicorn.lifespan', 'uvicorn.lifespan.on',
        'fastapi', 'fastapi.middleware', 'fastapi.middleware.cors',
        'starlette', 'starlette.routing', 'starlette.middleware',
        'starlette.staticfiles', 'starlette.templating',

        # ── Security / Cryptography ───────────────────────────────────────
        'cryptography', 'cryptography.fernet',
        'cryptography.hazmat.primitives.kdf.pbkdf2',
        'cryptography.hazmat.primitives.ciphers',
        'cryptography.hazmat.backends',

        # ── Media ─────────────────────────────────────────────────────────
        'PIL', 'PIL.Image', 'PIL.ImageDraw', 'PIL.ImageFont',
        'av', 'av.container', 'av.stream',
        'fitz',

        # ── PPTX (fallback converter tanpa LibreOffice) ───────────────────
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
      collect_submodules('uvicorn') + collect_submodules('pydantic'),

    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],

    excludes=[
        # ── Windows-only (semua harus dihapus untuk macOS) ────────────────
        'tkinter', '_tkinter',
        'win32api', 'win32con', 'win32com', 'win32com.client',
        'pywintypes', 'pythoncom', 'pywin32', 'winreg',
        # ── PyArmor (skip untuk macOS compatibility release — Q1=B) ───────
        'pyarmor_runtime_000000',
        # ── GUI Frameworks tidak terpakai ─────────────────────────────────
        'PyQt5', 'PySide2', 'PySide6', 'PyQt6',
        # ── Stdlib tidak terpakai (kurangi ukuran binary) ─────────────────
        'test', 'unittest', 'pdb', 'doctest',
        'email', 'xmlrpc', 'html.server',
        'xml', 'plistlib',
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
    strip=True,                     # Strip debug symbols — kurangi ukuran
    upx=False,                      # UPX tidak kompatibel dengan macOS universal2
    console=False,                  # No console window (headless FastAPI server)
    disable_windowed_traceback=False,
    argv_emulation=False,           # PENTING: False untuk server app (bukan GUI)
    target_arch='universal2',       # Intel (x86_64) + Apple Silicon (arm64)
    codesign_identity=None,         # No Apple signing (unsigned distribution)
    entitlements_file=None,
)

# ─── COLLECT ─────────────────────────────────────────────────────────────────
coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=True,
    upx=False,
    upx_exclude=[],
    name='ShowLyrics',
    contents_directory='internal',  # internal/ = sys._MEIPASS, seperti Windows
)
