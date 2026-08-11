#!/bin/bash
# ╔════════════════════════════════════════════════════════════════════════════
# build-pyinstaller-macos.sh
# ShowLyrics macOS — PyInstaller Build Script (Optimized)
#
# Setara dengan perintah PyInstaller Windows, tapi fully adapted untuk macOS:
#   - Separator --add-data pakai ':' bukan ';'
#   - Tidak ada .exe di binary (ffmpeg, playback-engine)
#   - Tidak ada Windows-only imports (tkinter, win32com, pythoncom, pywintypes)
#   - target-arch mengikuti env ARCH atau arsitektur mesin secara otomatis
#   - TIDAK pakai --target-arch=universal2 (crash dengan single-arch pip wheels)
#   - TIDAK pakai --strip (merusak code signing Apple)
#   - UPX dimatikan (tidak kompatibel dengan macOS)
#
# Cara pakai:
#   cd /path/to/project/backend
#   chmod +x build-pyinstaller-macos.sh
#   ./build-pyinstaller-macos.sh
#
# Untuk target arsitektur spesifik:
#   ARCH=arm64  ./build-pyinstaller-macos.sh
#   ARCH=x86_64 ./build-pyinstaller-macos.sh
#
# Prasyarat:
#   pip install -r requirements-macos.txt
#   (ffmpeg dan playback-engine harus sudah ada di folder backend/)
# ╚════════════════════════════════════════════════════════════════════════════

set -e

echo ""
echo "ShowLyrics - PyInstaller macOS Build"
echo "--------------------------------------"

# Deteksi target architecture
# Prioritas: env var ARCH > arsitektur mesin yang berjalan
if [ -n "$ARCH" ] && { [ "$ARCH" = "arm64" ] || [ "$ARCH" = "x86_64" ]; }; then
    TARGET_ARCH="$ARCH"
else
    MACHINE=$(uname -m)
    if [ "$MACHINE" = "arm64" ]; then
        TARGET_ARCH="arm64"
    else
        TARGET_ARCH="x86_64"
    fi
fi
echo "Target architecture: $TARGET_ARCH"

# Cek prasyarat binary
for binary in ffmpeg playback-engine camera-service; do
    if [ ! -f "$binary" ]; then
        echo "ERROR: '$binary' tidak ditemukan di folder ini!"
        echo "  Pastikan binary macOS sudah ada di backend/ sebelum build."
        exit 1
    fi
    chmod +x "$binary"
    echo "OK: $binary ditemukan ($(du -sh "$binary" | cut -f1))"
    file "$binary"
done

# Cek icon - gunakan .icns di src/ jika ada, fallback ke .ico di backend/
ICON_FLAG=""
if [ -f "../src/app.icns" ]; then
    ICON_FLAG="--icon=../src/app.icns"
    echo "OK: Menggunakan icon ../src/app.icns"
elif [ -f "app.ico" ]; then
    ICON_FLAG="--icon=app.ico"
    echo "OK: Menggunakan icon app.ico (fallback)"
else
    echo "WARNING: Tidak ada icon ditemukan, build tanpa custom icon."
fi

# Cek pyarmor runtime jika ada
PYARMOR_FLAG=""
if [ -d "pyarmor_runtime_000000" ]; then
    PYARMOR_FLAG="--add-data=pyarmor_runtime_000000:pyarmor_runtime_000000 --hidden-import=pyarmor_runtime_000000"
    echo "OK: pyarmor_runtime_000000 ditemukan, menyertakan ke build."
fi

echo ""
echo "Memulai PyInstaller build untuk $TARGET_ARCH..."
echo ""

python -m PyInstaller \
    --name="ShowLyrics" \
    --onedir \
    $ICON_FLAG \
    $PYARMOR_FLAG \
    --contents-directory="internal" \
    --target-arch="$TARGET_ARCH" \
    --noupx \
    --noconfirm \
    \
    \
    --add-data="ffmpeg:." \
    --add-data="playback-engine:." \
    --add-data="camera-service:." \
    --add-data="templates:templates" \
    --add-data="static:static" \
    \
    \
    --hidden-import="background_tasks" \
    --hidden-import="config" \
    --hidden-import="connection_manager" \
    --hidden-import="license_check" \
    --hidden-import="license_core" \
    --hidden-import="access_core" \
    --hidden-import="access_check" \
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
    --hidden-import="plistlib" \
    --hidden-import="pkg_resources" \
    --hidden-import="importlib.metadata" \
    --hidden-import="importlib.resources" \
    --hidden-import="email" \
    --hidden-import="email.mime" \
    --hidden-import="email.mime.text" \
    --hidden-import="email.mime.multipart" \
    --hidden-import="email.mime.application" \
    --hidden-import="email.parser" \
    --hidden-import="email.message" \
    --hidden-import="email.utils" \
    --hidden-import="xml" \
    --hidden-import="xml.etree" \
    --hidden-import="xml.etree.ElementTree" \
    --hidden-import="html" \
    --hidden-import="html.parser" \
    --hidden-import="ctypes" \
    --hidden-import="sysconfig" \
    --hidden-import="distutils" \
    --hidden-import="asyncio" \
    --hidden-import="asyncio.events" \
    --hidden-import="asyncio.selector_events" \
    --hidden-import="platform" \
    --hidden-import="urllib" \
    --hidden-import="urllib.parse" \
    --hidden-import="urllib.request" \
    --hidden-import="urllib.error" \
    --hidden-import="urllib3" \
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
    --hidden-import="hashlib" \
    --hidden-import="base64" \
    --hidden-import="dataclasses" \
    --hidden-import="enum" \
    --hidden-import="datetime" \
    --hidden-import="secrets" \
    --hidden-import="socket" \
    --hidden-import="atexit" \
    --hidden-import="shutil" \
    --hidden-import="glob" \
    --hidden-import="concurrent" \
    --hidden-import="concurrent.futures" \
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
    --hidden-import="jinja2" \
    --hidden-import="websockets" \
    --hidden-import="httpx" \
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
    --hidden-import="PIL.ImageOps" \
    --hidden-import="PIL.ImageFilter" \
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
    --collect-all="httpx" \
    --collect-all="websockets" \
    --collect-all="jinja2" \
    --collect-all="starlette" \
    --collect-all="pythonosc" \
    --collect-all="PIL" \
    --collect-all="urllib3" \
    \
    \
    --exclude-module="PyQt5" \
    --exclude-module="PySide2" \
    --exclude-module="PySide6" \
    --exclude-module="PyQt6" \
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
