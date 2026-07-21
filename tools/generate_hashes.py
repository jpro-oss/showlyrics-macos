"""
tools/generate_hashes.py — ShowLyrics Build Tool

Jalankan setelah obfuscation, SEBELUM compile ke binary (PyArmor/Nuitka).

Melakukan 2 hal sekaligus:
  1. Generate dist/hashes/versi.json → upload ke GitHub Pages CDN
  2. Inject _BUILTIN_HASHES ke backend/file_integrity.py → dikompilasi ke binary

Usage:
  python tools/generate_hashes.py

Output:
  [1/2] dist/hashes/versi.json        — upload ke GitHub Pages
  [2/2] backend/file_integrity.py     — auto-patched dengan hash terbaru

CATATAN BUILD:
  URUTAN: generate_hashes.py → PyArmor/Nuitka compile
  Jika terbalik, binary tidak akan punya _BUILTIN_HASHES terbaru!
"""

import hashlib
import json
import os
import re
from datetime import datetime, timezone

# ── KONFIGURASI — UPDATE SETIAP RILIS ─────────────────────────────────────────
APP_VERSION = "1.3.5-2"  # ← UPDATE SETIAP RILIS BARU

# ── PATH SETUP ────────────────────────────────────────────────────────────────
BASE     = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND  = os.path.join(BASE, "backend")
FI_PATH  = os.path.join(BACKEND, "file_integrity.py")


# ── FUNGSI HASH FOLDER (flat, tidak rekursif) ─────────────────────────────────
def sha256_folder(folder_path: str) -> str:
    """
    SHA-256 dari seluruh isi folder (flat — hanya file langsung, bukan subfolder).
    Sorted by name untuk memastikan hasil deterministik.
    """
    h = hashlib.sha256()
    for fname in sorted(os.listdir(folder_path)):
        fpath = os.path.join(folder_path, fname)
        if not os.path.isfile(fpath):
            continue  # Skip subfolder
        h.update(fname.encode('utf-8'))
        with open(fpath, 'rb') as f:
            for chunk in iter(lambda: f.read(65536), b''):
                h.update(chunk)
    return h.hexdigest()


# ── HITUNG FINGERPRINTS ───────────────────────────────────────────────────────
print(f"[INFO] Menghitung fingerprint untuk versi {APP_VERSION}...")
print(f"[INFO] Backend dir: {BACKEND}")

static_dir    = os.path.join(BACKEND, "static")
templates_dir = os.path.join(BACKEND, "templates")

if not os.path.isdir(static_dir):
    print(f"[ERROR] Folder static tidak ditemukan: {static_dir}")
    raise SystemExit(1)

if not os.path.isdir(templates_dir):
    print(f"[ERROR] Folder templates tidak ditemukan: {templates_dir}")
    raise SystemExit(1)

fp_static    = sha256_folder(static_dir)
fp_templates = sha256_folder(templates_dir)
fp_combined  = hashlib.sha256((fp_static + fp_templates).encode()).hexdigest()
generated_at = datetime.now(timezone.utc).isoformat()
sig_parts    = APP_VERSION + generated_at + fp_combined
manifest_sig = hashlib.sha256(sig_parts.encode()).hexdigest()

print(f"[INFO] Fingerprint berhasil dihitung.")

# ── OUTPUT 1: JSON untuk GitHub Pages CDN ─────────────────────────────────────
# File ini diupload ke: https://showlyrics.github.io/file/versi.json
out_dir  = os.path.join(BASE, "dist", "hashes")
os.makedirs(out_dir, exist_ok=True)
out_json = os.path.join(out_dir, "versi.json")

manifest = {
    "version":               APP_VERSION,
    "generated_at":          generated_at,
    "static_fingerprint":    fp_static,
    "templates_fingerprint": fp_templates,
    "folder_fingerprint":    fp_combined,
    "manifest_sig":          manifest_sig
}

with open(out_json, 'w') as f:
    json.dump(manifest, f, indent=2)
print(f"[1/2] JSON output : {out_json}")

# ── OUTPUT 2: Inject ke backend/file_integrity.py ─────────────────────────────
# Cari dan replace blok _BUILTIN_HASHES = { ... }
new_builtin = f'''_BUILTIN_HASHES = {{
    "version":               "{APP_VERSION}",
    "static_fingerprint":    "{fp_static}",
    "templates_fingerprint": "{fp_templates}",
    "folder_fingerprint":    "{fp_combined}",
    "manifest_sig":          "{manifest_sig}"
}}'''

if not os.path.exists(FI_PATH):
    print(f"[ERROR] file_integrity.py tidak ditemukan: {FI_PATH}")
    raise SystemExit(1)

with open(FI_PATH, 'r', encoding='utf-8') as f:
    source = f.read()

# Regex: cari blok _BUILTIN_HASHES = { ... } (multiline, greedy hingga closing })
pattern = r'_BUILTIN_HASHES\s*=\s*\{[^}]*\}'
if re.search(pattern, source, re.DOTALL):
    patched = re.sub(pattern, new_builtin, source, flags=re.DOTALL)
    with open(FI_PATH, 'w', encoding='utf-8') as f:
        f.write(patched)
    print(f"[2/2] _BUILTIN_HASHES injected into: {FI_PATH}")
else:
    print(f"[2/2] WARNING: _BUILTIN_HASHES pattern tidak ditemukan di {FI_PATH}!")
    print("      Pastikan file_integrity.py memiliki blok _BUILTIN_HASHES = {{...}}")

# ── SUMMARY ───────────────────────────────────────────────────────────────────
print()
print(f"  Version      : {APP_VERSION}")
print(f"  Static FP    : {fp_static[:32]}...")
print(f"  Templates FP : {fp_templates[:32]}...")
print(f"  Combined FP  : {fp_combined[:32]}...")
print(f"  Manifest Sig : {manifest_sig[:32]}...")
print()
print("→ LANGKAH SELANJUTNYA:")
print(f"  1. Upload {out_json} ke GitHub Pages")
print(f"     URL target: https://showlyrics.github.io/file/versi.json")
print(f"  2. Pastikan SERVER_HASH_URL di file_integrity.py sudah benar")
print(f"  3. Jalankan PyArmor / Nuitka untuk compile file_integrity.py")
print(f"     (file_integrity.py sudah di-patch dengan _BUILTIN_HASHES terbaru)")
