#!/bin/bash
# ════════════════════════════════════════════════════════════════════════════
# build-pyinstaller-macos.sh
# ShowLyrics macOS — PyInstaller Build Script (Optimized)
#
# Setara dengan perintah PyInstaller Windows, tapi fully adapted untuk macOS:
#   - Separator --add-data pakai ':' bukan ';'
#   - Tidak ada .exe di binary (ffmpeg, playback-engine)
#   - Tidak ada Windows-only imports (tkinter, win32com, pythoncom, pywintypes)
#   - Tidak ada PyArmor (skip untuk macOS compatibility release)
#   - Universal Binary: Intel (x86_64) + Apple Silicon (arm64)
#   - Strip debug symbols untuk binary lebih kecil
#   - UPX dimatikan (tidak kompatibel dengan macOS universal2)
#
# Cara pakai:
#   cd e:/SHOWLYRICS/V135-2-MACOS/backend   (di macOS)
#   chmod +x build-pyinstaller-macos.sh
#   ./build-pyinstaller-macos.sh
#
# Prasyarat:
#   pip install -r requirements-macos.txt
#   (ffmpeg dan playback-engine harus sudah ada di folder backend/)
# ════════════════════════════════════════════════════════════════════════════

set -e

echo ""
echo "ShowLyrics - PyInstaller macOS Build"
echo "--------------------------------------"

# Cek prasyarat
for binary in ffmpeg playback-engine; do
    if [ ! -f "$binary" ]; then
        echo "ERROR: '$binary' tidak ditemukan di folder ini!"
        echo "  Pastikan binary macOS sudah ada di backend/ sebelum build."
        exit 1
    fi
    chmod +x "$binary"
    echo "OK: $binary ditemukan ($(du -sh "$binary" | cut -f1))"
done

echo ""
echo "Memulai PyInstaller build..."
echo ""

python -m PyInstaller \
    --name="ShowLyrics" \
    --onedir \
    --icon="app.icns" \
    --contents-directory="internal" \
    --target-arch=universal2 \
    --strip \
    --noupx \
    --noconfirm \
    \
    \
    --add-data="ffmpeg:." \
    --add-data="playback-engine:." \
    --add-data="templates:templates" \
    --add-data="static:static" \
    \
    \
    --hidden-import="background_tasks" \
    --hidden-import="config" \
    --hidden-import="connection_manager" \
    --hidden-import="license_check" \
    --hidden-import="license_core" \
    --hidden-import="middleware" \
    --hidden-import="presets" \
    --hidden-import="scripture" \
    --hidden-import="sender" \
    --hidden-import="routes_media" \
    --hidden-import="routes_media_crud" \
    --hidden-import="routes_media_helper" \
    --hidden-import="routes_media_stream" \
    --hidden-import="routes_media_thumb" \
    --hidden-import="routes_pages" \
    --hidden-import="routes_service" \
    --hidden-import="routes_settings" \
    --hidden-import="network_guard" \
    --hidden-import="file_integrity" \
    --hidden-import="storage_backend" \
    \
    \
    --hidden-import="asyncio" \
    --hidden-import="asyncio.events" \
    --hidden-import="asyncio.selector_events" \
    --hidden-import="platform" \
    --hidden-import="urllib.parse" \
    --hidden-import="zipfile" \
    --hidden-import="io" \
    --hidden-import="json" \
    --hidden-import="uuid" \
    --hidden-import="re" \
    --hidden-import="time" \
    --hidden-import="collections" \
    --hidden-import="subprocess" \
    --hidden-import="tempfile" \
    --hidden-import="threading" \
    --hidden-import="multiprocessing" \
    \
    \
    --hidden-import="uvicorn" \
    --hidden-import="uvicorn.logging" \
    --hidden-import="uvicorn.loops" \
    --hidden-import="uvicorn.loops.auto" \
    --hidden-import="uvicorn.protocols" \
    --hidden-import="uvicorn.protocols.http" \
    --hidden-import="uvicorn.protocols.http.auto" \
    --hidden-import="uvicorn.protocols.websockets" \
    --hidden-import="uvicorn.protocols.websockets.auto" \
    --hidden-import="uvicorn.lifespan" \
    --hidden-import="uvicorn.lifespan.on" \
    --hidden-import="fastapi" \
    --hidden-import="fastapi.middleware" \
    --hidden-import="fastapi.middleware.cors" \
    --hidden-import="starlette" \
    --hidden-import="starlette.routing" \
    --hidden-import="starlette.middleware" \
    --hidden-import="starlette.staticfiles" \
    --hidden-import="starlette.templating" \
    \
    \
    --hidden-import="cryptography" \
    --hidden-import="cryptography.fernet" \
    --hidden-import="cryptography.hazmat.primitives.kdf.pbkdf2" \
    --hidden-import="cryptography.hazmat.primitives.ciphers" \
    --hidden-import="cryptography.hazmat.backends" \
    \
    \
    --hidden-import="PIL" \
    --hidden-import="PIL.Image" \
    --hidden-import="PIL.ImageDraw" \
    --hidden-import="PIL.ImageFont" \
    --hidden-import="av" \
    --hidden-import="av.container" \
    --hidden-import="av.stream" \
    --hidden-import="fitz" \
    \
    \
    --hidden-import="pptx" \
    --hidden-import="pptx.util" \
    --hidden-import="pptx.presentation" \
    --hidden-import="pptx.parts.image" \
    \
    \
    --hidden-import="requests" \
    --hidden-import="requests.adapters" \
    --hidden-import="requests.auth" \
    --hidden-import="psutil" \
    \
    \
    --hidden-import="pythonosc" \
    --hidden-import="pythonosc.dispatcher" \
    --hidden-import="pythonosc.osc_server" \
    --hidden-import="pythonosc.udp_client" \
    \
    \
    --collect-all="cryptography" \
    --collect-all="requests" \
    --collect-all="av" \
    --collect-all="uvicorn" \
    --collect-all="fastapi" \
    --collect-all="pydantic" \
    --collect-all="psutil" \
    --collect-all="fitz" \
    --collect-all="pptx" \
    \
    \
    --exclude-module="PyQt5" \
    --exclude-module="PySide2" \
    --exclude-module="tkinter" \
    --exclude-module="_tkinter" \
    --exclude-module="win32api" \
    --exclude-module="win32con" \
    --exclude-module="win32com" \
    --exclude-module="pywintypes" \
    --exclude-module="pythoncom" \
    --exclude-module="pywin32" \
    --exclude-module="winreg" \
    --exclude-module="test" \
    --exclude-module="unittest" \
    --exclude-module="pdb" \
    --exclude-module="doctest" \
    --exclude-module="email" \
    --exclude-module="xmlrpc" \
    \
    main.py

echo ""
echo "--------------------------------------"
echo "Build selesai!"
echo ""
echo "Output: dist/ShowLyrics/"
echo ""
echo "Verifikasi binary:"
ls -lh dist/ShowLyrics/ShowLyrics
echo ""
echo "Ukuran total folder:"
du -sh dist/ShowLyrics/
echo ""
echo "Langkah selanjutnya:"
echo "  1. Test: ./dist/ShowLyrics/ShowLyrics"
echo "  2. Copy ke bin/: cp -r dist/ShowLyrics/* ../bin/"
echo "  3. Build DMG: cd .. && npm run dist"
echo "--------------------------------------"
echo ""
