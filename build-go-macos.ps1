# build-go-macos.ps1 - Cross-compile Go Engine dari Windows untuk macOS
# 
# Jalankan dari root folder project:
#   powershell -ExecutionPolicy Bypass -File build-go-macos.ps1
#
# Prasyarat:
#   - Go SDK terinstall di Windows (https://go.dev/dl/)
#   - Tidak butuh macOS, Xcode, atau SDK apapun!
#   - CGO_ENABLED=0 karena pure Go (tidak ada CGO dependencies)

$ErrorActionPreference = "Stop"
$GoDir  = Join-Path $PSScriptRoot "playback-engine"
$BinDir = Join-Path $PSScriptRoot "backend"

Write-Host ""
Write-Host "ShowLyrics - Go Engine macOS Cross-Compile" -ForegroundColor Cyan
Write-Host "-------------------------------------------" -ForegroundColor Cyan
Write-Host ""

Set-Location $GoDir

# BUILD Intel amd64
Write-Host "[1/2] Building macOS Intel (amd64)..." -ForegroundColor Yellow
$env:GOOS        = "darwin"
$env:GOARCH      = "amd64"
$env:CGO_ENABLED = "0"

$outAmd64 = Join-Path $BinDir "playback-engine-amd64"
go build -ldflags="-s -w" -o $outAmd64 ./cmd/
Write-Host "OK - playback-engine-amd64 selesai" -ForegroundColor Green

# BUILD Apple Silicon arm64
Write-Host "[2/2] Building macOS Apple Silicon (arm64)..." -ForegroundColor Yellow
$env:GOOS        = "darwin"
$env:GOARCH      = "arm64"
$env:CGO_ENABLED = "0"

$outArm64 = Join-Path $BinDir "playback-engine-arm64"
go build -ldflags="-s -w" -o $outArm64 ./cmd/
Write-Host "OK - playback-engine-arm64 selesai" -ForegroundColor Green

# Copy amd64 sebagai default playback-engine
$outDefault = Join-Path $BinDir "playback-engine"
Copy-Item $outAmd64 $outDefault -Force
Write-Host "OK - playback-engine (default amd64) disalin" -ForegroundColor Green

# Reset env vars
Remove-Item Env:GOOS        -ErrorAction SilentlyContinue
Remove-Item Env:GOARCH      -ErrorAction SilentlyContinue
Remove-Item Env:CGO_ENABLED -ErrorAction SilentlyContinue

Set-Location $PSScriptRoot

Write-Host ""
Write-Host "-------------------------------------------" -ForegroundColor Cyan
Write-Host "Cross-compile selesai!" -ForegroundColor Green
Write-Host ""
Write-Host "File yang dihasilkan di backend/:" -ForegroundColor White
Get-ChildItem $BinDir -Filter "playback-engine*" | Select-Object Name, @{N='Size';E={"{0:N0} KB" -f ($_.Length/1KB)}} | Format-Table -AutoSize
Write-Host ""
Write-Host "Untuk universal binary (Intel + Apple Silicon) - jalankan di macOS:" -ForegroundColor Yellow
Write-Host "  lipo -create playback-engine-amd64 playback-engine-arm64 -output playback-engine"
Write-Host ""
Write-Host "Langkah selanjutnya:" -ForegroundColor Cyan
Write-Host "  1. Download ffmpeg macOS binary ke backend/"
Write-Host "  2. Di macOS: pyinstaller ShowLyrics-macos.spec --clean"
Write-Host "  3. Di macOS: copy dist/ShowLyrics/* ke bin/"
Write-Host "  4. Di macOS: npm run dist"
Write-Host "-------------------------------------------" -ForegroundColor Cyan
Write-Host ""
