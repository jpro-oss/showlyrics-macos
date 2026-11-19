#!/bin/bash
# ════════════════════════════════════════════════════════════════
# build-go-macos.sh — Cross-compile Go Playback Engine untuk macOS
# ════════════════════════════════════════════════════════════════
#
# Bisa dijalankan dari Windows (WSL/Git Bash) ATAU dari macOS.
#
# Prasyarat (Windows):
#   - Go terinstall (https://go.dev/dl/)
#   - Tidak butuh Xcode atau macOS SDK
#   - CGO_ENABLED=0 karena pure Go (tidak ada CGO)
#
# Prasyarat (macOS — untuk universal2):
#   - Go terinstall
#   - lipo command (sudah ada di Xcode Command Line Tools)
#
# Output:
#   bin/playback-engine          → universal binary (Intel + Apple Silicon)
#   bin/playback-engine-amd64   → Intel only
#   bin/playback-engine-arm64   → Apple Silicon only
# ════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PE_DIR="$SCRIPT_DIR/playback-engine"
CAM_DIR="$SCRIPT_DIR/camera-service"
BIN_DIR="$SCRIPT_DIR/backend"

echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "║  ShowLyrics — Go Services (Playback + Camera) macOS     ║"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

build_service() {
    local svc_dir="$1"
    local svc_name="$2"
    local pkg_target="$3"

    cd "$svc_dir"
    echo "[1/3] Building $svc_name untuk macOS Intel (amd64)..."
    GOOS=darwin GOARCH=amd64 CGO_ENABLED=0 go build \
        -ldflags="-s -w" \
        -o "$BIN_DIR/${svc_name}-amd64" \
        "$pkg_target"
    echo "✓ ${svc_name}-amd64 selesai ($(du -sh "$BIN_DIR/${svc_name}-amd64" | cut -f1))"

    echo "[2/3] Building $svc_name untuk macOS Apple Silicon (arm64)..."
    GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build \
        -ldflags="-s -w" \
        -o "$BIN_DIR/${svc_name}-arm64" \
        "$pkg_target"
    echo "✓ ${svc_name}-arm64 selesai ($(du -sh "$BIN_DIR/${svc_name}-arm64" | cut -f1))"

    echo "[3/3] Membuat default/universal binary $svc_name..."
    if command -v lipo &> /dev/null; then
        lipo -create \
            "$BIN_DIR/${svc_name}-amd64" \
            "$BIN_DIR/${svc_name}-arm64" \
            -output "$BIN_DIR/${svc_name}"
        chmod +x "$BIN_DIR/${svc_name}"
        echo "✓ ${svc_name} universal selesai ($(du -sh "$BIN_DIR/${svc_name}" | cut -f1))"
        lipo -info "$BIN_DIR/${svc_name}"
    else
        cp "$BIN_DIR/${svc_name}-amd64" "$BIN_DIR/${svc_name}"
        chmod +x "$BIN_DIR/${svc_name}"
        echo "⚠ lipo tidak tersedia — menggunakan amd64 binary saja"
    fi
}

build_service "$PE_DIR" "playback-engine" "./cmd/"
build_service "$CAM_DIR" "camera-service" "./cmd/"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✓ Build selesai!"
echo ""
echo "File yang dihasilkan:"
ls -lh "$BIN_DIR/playback-engine"* "$BIN_DIR/camera-service"*
echo ""
echo "Langkah selanjutnya:"
echo "  1. Pastikan 'ffmpeg' (macOS binary) ada di folder backend/"
echo "  2. Jalankan: cd backend && pyinstaller ShowLyrics-macos.spec --clean"
echo "  3. Copy isi dist/ShowLyrics/* ke bin/"
echo "  4. Jalankan: npm run dist"
echo "═══════════════════════════════════════════════════════"
echo ""
