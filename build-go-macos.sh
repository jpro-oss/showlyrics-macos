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
GO_DIR="$SCRIPT_DIR/playback-engine"
CAM_GO_DIR="$SCRIPT_DIR/camera-service"
BIN_DIR="$SCRIPT_DIR/backend"

echo ""
echo "╔══════════════════════════════════════════════════╗"
echo "║  ShowLyrics — Go Playback Engine macOS Build    ║"
echo "╚══════════════════════════════════════════════════╝"
echo ""

cd "$GO_DIR"

# ─── BUILD Intel (amd64) ─────────────────────────────────────────
echo "[1/3] Building untuk macOS Intel (amd64)..."
GOOS=darwin GOARCH=amd64 CGO_ENABLED=0 go build \
    -ldflags="-s -w" \
    -o "$BIN_DIR/playback-engine-amd64" \
    ./cmd/
echo "✓ playback-engine-amd64 selesai ($(du -sh "$BIN_DIR/playback-engine-amd64" | cut -f1))"

# ─── BUILD Apple Silicon (arm64) ─────────────────────────────────
echo "[2/3] Building untuk macOS Apple Silicon (arm64)..."
GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build \
    -ldflags="-s -w" \
    -o "$BIN_DIR/playback-engine-arm64" \
    ./cmd/
echo "✓ playback-engine-arm64 selesai ($(du -sh "$BIN_DIR/playback-engine-arm64" | cut -f1))"

# ─── LIPO Universal Binary ────────────────────────────────────────
echo "[3/3] Membuat Universal Binary (Intel + Apple Silicon)..."

if command -v lipo &> /dev/null; then
    lipo -create \
        "$BIN_DIR/playback-engine-amd64" \
        "$BIN_DIR/playback-engine-arm64" \
        -output "$BIN_DIR/playback-engine"
    
    # Beri execute permission
    chmod +x "$BIN_DIR/playback-engine"
    
    echo "✓ playback-engine universal selesai ($(du -sh "$BIN_DIR/playback-engine" | cut -f1))"
    echo ""
    echo "Info architecture:"
    lipo -info "$BIN_DIR/playback-engine"
else
    # lipo tidak tersedia (Windows/Linux) — copy amd64 sebagai default
    cp "$BIN_DIR/playback-engine-amd64" "$BIN_DIR/playback-engine"
    chmod +x "$BIN_DIR/playback-engine"
    echo "⚠ lipo tidak tersedia — menggunakan amd64 binary saja"
    echo "  Untuk universal binary, jalankan script ini di macOS"
fi

cd "$CAM_GO_DIR"

echo "[camera 1/3] Building camera-service untuk macOS Intel (amd64)..."
go mod tidy
GOOS=darwin GOARCH=amd64 CGO_ENABLED=0 go build \
    -ldflags="-s -w" \
    -o "$BIN_DIR/camera-service-amd64" \
    ./cmd/
echo "camera-service-amd64 selesai ($(du -sh "$BIN_DIR/camera-service-amd64" | cut -f1))"

echo "[camera 2/3] Building camera-service untuk macOS Apple Silicon (arm64)..."
GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build \
    -ldflags="-s -w" \
    -o "$BIN_DIR/camera-service-arm64" \
    ./cmd/
echo "camera-service-arm64 selesai ($(du -sh "$BIN_DIR/camera-service-arm64" | cut -f1))"

echo "[camera 3/3] Membuat camera-service Universal Binary..."
if command -v lipo &> /dev/null; then
    lipo -create \
        "$BIN_DIR/camera-service-amd64" \
        "$BIN_DIR/camera-service-arm64" \
        -output "$BIN_DIR/camera-service"
    chmod +x "$BIN_DIR/camera-service"
    echo "camera-service universal selesai ($(du -sh "$BIN_DIR/camera-service" | cut -f1))"
    lipo -info "$BIN_DIR/camera-service"
else
    cp "$BIN_DIR/camera-service-amd64" "$BIN_DIR/camera-service"
    chmod +x "$BIN_DIR/camera-service"
    echo "lipo tidak tersedia - menggunakan camera-service amd64 sebagai default"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✓ Build selesai!"
echo ""
echo "File yang dihasilkan:"
ls -lh "$BIN_DIR/playback-engine"*
ls -lh "$BIN_DIR/camera-service"*
echo ""
echo "Langkah selanjutnya:"
echo "  1. Pastikan 'ffmpeg' (macOS binary) ada di folder backend/"
echo "  2. Jalankan: cd backend && pyinstaller ShowLyrics-macos.spec --clean"
echo "  3. Copy isi dist/ShowLyrics/* ke bin/"
echo "  4. Jalankan: npm run dist"
echo "═══════════════════════════════════════════════════════"
echo ""
