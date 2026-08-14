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

# Cek pyarmor runtime jika ada — sekarang dihandle oleh spec file
if [ -d "pyarmor_runtime_000000" ]; then
    echo "OK: pyarmor_runtime_000000 ditemukan — akan di-handle oleh ShowLyrics-macos.spec"
    # Pastikan file .so ada
    SO_X86="pyarmor_runtime_000000/darwin_x86_64/pyarmor_runtime.so"
    SO_ARM64="pyarmor_runtime_000000/darwin_arm64/pyarmor_runtime.so"
    [ -f "$SO_X86"   ] && echo "  OK: $SO_X86   ($(du -sh "$SO_X86"   | cut -f1))" || echo "  WARNING: $SO_X86 tidak ditemukan!"
    [ -f "$SO_ARM64" ] && echo "  OK: $SO_ARM64 ($(du -sh "$SO_ARM64" | cut -f1))" || echo "  WARNING: $SO_ARM64 tidak ditemukan!"
else
    echo "WARNING: pyarmor_runtime_000000 tidak ditemukan — build akan gagal untuk kode obfuscated!"
fi

echo ""
echo "Memulai PyInstaller build untuk $TARGET_ARCH..."
echo ""

# ─── BUILD MENGGUNAKAN SPEC FILE ─────────────────────────────────────────────
# ShowLyrics-macos.spec sudah menangani:
#   - Deteksi TARGET_ARCH via env var ARCH
#   - Pendaftaran pyarmor_runtime.so secara eksplisit (lebih reliable dari --collect-all)
#   - Semua hidden-imports dan collect-all untuk dependencies
# CATATAN: Jangan tambahkan --target-arch di sini (sudah diset di spec file)

ARCH="$TARGET_ARCH" python -m PyInstaller \
    ShowLyrics-macos.spec \
    --clean \
    --noconfirm

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
