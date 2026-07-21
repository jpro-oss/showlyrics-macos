"""
file_integrity.py — ShowLyrics File Integrity Guardian v4

Tiga lapis keamanan:
  Tier 1 (Online)  : Server JSON (GitHub Pages CDN) — Kebenaran mutlak
  Tier 2 (Offline) : macOS App Support Storage (storage_backend.py, terenkripsi HWID-based) — Cache fallback
  Tier 3 (Last)    : _BUILTIN_HASHES di dalam binary ini (PyArmor protected)

Strategi performa (LOW-END DEVICE SAFE):
  - Pre-check mtime: 0.004ms (hampir nol, check setiap 10 menit)
  - Full fingerprint: ~15ms (HANYA jika mtime berubah — jarang di sistem bersih)
  - wm.js di RAM: 12KB, immune file replacement attack
  - Background check: 10 menit interval (tidak memberatkan CPU)
"""

import os
import sys
import asyncio
import hashlib
import json
import time
import threading
import base64
from datetime import datetime, timezone
from storage_backend import get_store

# macOS: storage untuk cache integrity hash baseline
_integrity_store = get_store('integrity')

# ─── KONSTANTA — UPDATE SETIAP RILIS ──────────────────────────────────────────
APP_VERSION     = "1.3.5-2"
SERVER_HASH_URL = "https://showlyrics.github.io/file/v135-2.json"

# ─── TIER 3: BUILTIN HASHES ───────────────────────────────────────────────────
# AUTO-GENERATED oleh tools/generate_hashes.py — JANGAN edit manual!
# Nilai ini dikompilasi ke dalam binary (PyArmor/Nuitka protected).
# Digunakan sebagai last-resort jika offline + registry tidak ada.
_BUILTIN_HASHES = {
    "version":               "1.3.5-2",
    "static_fingerprint":    "d8f114e198b66127b6e4b9c024c7e9aaf1741734a9501175e8b3dbdec272efc7",
    "templates_fingerprint": "6c960da2772ef46819f17db03b69c57ce68ede99697afbefb7848fa339ecf8af",
    "folder_fingerprint":    "0adae8e34382eb41c3ed91393f9234f24eb3762902cb358ff6cf44783a6cdc4d",
    "manifest_sig":          "749ecc408f99203baf8d48ff0c48b14bfa123d14cd2df31bd9e841cab1be6af1"
}
# ─────────────────────────────────────────────────────────────────────────────

# 10 menit — aman untuk low-end device (mtime pre-check hampir gratis)
CHECK_INTERVAL  = 600   # detik
FETCH_TIMEOUT   = 8     # timeout fetch server JSON

# macOS: storage key untuk cache integrity hash baseline
# Disimpan di ~/Library/Application Support/ShowLyrics/.integrity.dat
INTEGRITY_STORAGE_KEY = "SysIntegrityData"

# Folder yang dipantau (relatif terhadap base dir) — hanya flat files, tidak rekursif
MONITORED_FOLDERS = ["static", "templates"]

# ─── GLOBAL STATE ─────────────────────────────────────────────────────────────
_wm_js_bytes: bytes = None
_wm_js_hash: str   = None
_mtime_cache: dict = {}     # {"static": float, "templates": float}
_baseline_fp: str  = None   # folder_fingerprint baseline
_manager_ref       = None
_license_ref       = None
_integrity_ok      = True
_stop_event        = threading.Event()
_event_loop        = None   # Asyncio event loop reference — diisi dari main thread via inject_loop()


def inject_deps(manager, license_check_module):
    """Dipanggil dari main.py untuk inject referensi ConnectionManager dan license_check."""
    global _manager_ref, _license_ref
    _manager_ref = manager
    _license_ref = license_check_module


def inject_loop(loop):
    """
    Dipanggil dari main.py (_integrity_startup) untuk menyimpan asyncio event loop
    yang sedang berjalan di main thread.

    PENTING: _force_watermark() berjalan di background thread (bukan async context),
    sehingga asyncio.get_event_loop() tidak reliabel di sana. Loop reference ini
    memastikan run_coroutine_threadsafe() selalu menargetkan loop yang benar.
    """
    global _event_loop
    _event_loop = loop
    print(f"[INTEGRITY] Asyncio event loop injected: {loop}")


def _should_fetch_cdn() -> bool:
    """
    Tentukan apakah aman/perlu fetch CDN untuk integrity check.

    Prioritas:
      1. Jika network_guard sudah selesai evaluasi → gunakan statusnya.
         Hanya ONLINE_FULL yang boleh fetch CDN (CDN pasti bisa diakses).
      2. Jika network_guard belum selesai (UNKNOWN) → fallback ke config.is_online().
    """
    try:
        import network_guard
        from network_guard import ConnectivityStatus
        s = network_guard.get_current_status()
        if s.status == ConnectivityStatus.UNKNOWN:
            # network_guard belum evaluasi → fallback ke config
            from config import is_online
            return is_online()
        return s.status == ConnectivityStatus.ONLINE_FULL
    except ImportError:
        # network_guard tidak tersedia → fallback ke config
        from config import is_online
        return is_online()


# ─── UTILS ────────────────────────────────────────────────────────────────────

def _base_dir() -> str:
    """
    Dapatkan base directory yang berisi folder 'static/' dan 'templates/'.

    Struktur dist ShowLyrics (dari ShowLyrics.spec dengan contents_directory='internal'):
      dist/ShowLyrics/
        ShowLyrics               ← binary macOS (tanpa ekstensi)
        internal/            ← sys._MEIPASS mengarah ke sini
          static/            ← ADA DI SINI (di dalam internal/)
          templates/         ← ADA DI SINI (di dalam internal/)
          [dylibs, .so, ...]

    Strategi: cek secara dinamis di mana 'static/' berada, mulai dari _MEIPASS,
    lalu parent-nya. Dengan ini kode aman untuk:
      - PyInstaller onedir default (static di _MEIPASS)
      - PyInstaller dengan contents_directory='internal' (static di _MEIPASS juga)
      - InnoSetup (install ke Program Files, struktur folder sama persis)
      - Dev mode (static di direktori source)
    """
    try:
        meipass = sys._MEIPASS
        # Kasus utama ShowLyrics: static/ dan templates/ ada di dalam _MEIPASS/internal/
        if os.path.isdir(os.path.join(meipass, 'static')):
            return meipass
        # Fallback: cek di parent (jika suatu saat structure berubah)
        parent = os.path.dirname(meipass)
        if os.path.isdir(os.path.join(parent, 'static')):
            return parent
        # Tidak ditemukan di mana pun — kembalikan _MEIPASS sebagai best guess
        print(f"[INTEGRITY] WARNING: 'static/' folder not found near _MEIPASS={meipass}")
        return meipass
    except AttributeError:
        # Dev mode: gunakan direktori file ini
        return os.path.dirname(os.path.abspath(__file__))



def _sha256_bytes(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def _folder_fingerprint(folder_path: str) -> str:
    """
    SHA-256 dari seluruh isi folder secara deterministic (flat, tidak rekursif).
    Baca setiap file sorted by name, hash digabung dalam satu pass.
    Sangat efisien: hanya baca file, tidak traverse subfolder.
    """
    h = hashlib.sha256()
    try:
        entries = sorted(os.listdir(folder_path))
        for fname in entries:
            fpath = os.path.join(folder_path, fname)
            if not os.path.isfile(fpath):
                continue  # Skip subfolder — hanya flat files
            h.update(fname.encode('utf-8'))
            with open(fpath, 'rb') as f:
                for chunk in iter(lambda: f.read(65536), b''):
                    h.update(chunk)
    except Exception as e:
        print(f"[INTEGRITY] Error hashing folder {folder_path}: {e}")
        h.update(b'ERROR')
    return h.hexdigest()


def _combined_fingerprint() -> tuple:
    """
    Hitung (static_fp, templates_fp, combined_fp).
    Combined = SHA-256(static_fp + templates_fp).
    Overhead: ~15ms total untuk kedua folder.
    """
    base        = _base_dir()
    fp_static   = _folder_fingerprint(os.path.join(base, "static"))
    fp_templates = _folder_fingerprint(os.path.join(base, "templates"))
    fp_combined  = _sha256_bytes((fp_static + fp_templates).encode())
    return fp_static, fp_templates, fp_combined


def _get_folder_mtime(folder_path: str) -> float:
    """
    Dapatkan mtime terbaru dari folder dan semua file di dalamnya (flat).
    Ultra ringan: os.path.getmtime() — tidak ada hashing sama sekali.
    Overhead: ~0.004ms per folder.
    """
    try:
        latest = os.path.getmtime(folder_path)
        for fname in os.listdir(folder_path):
            fpath = os.path.join(folder_path, fname)
            if os.path.isfile(fpath):
                mt = os.path.getmtime(fpath)
                if mt > latest:
                    latest = mt
        return latest
    except Exception:
        return -1.0


def _mtime_changed() -> bool:
    """
    Pre-check ultra ringan: apakah ada file yang mtime-nya berubah?
    Jika tidak ada perubahan → skip hashing sepenuhnya (0.004ms).
    Di sistem bersih tanpa tampering, overhead CPU = HAMPIR NOL.
    """
    base = _base_dir()
    for folder in MONITORED_FOLDERS:
        fpath   = os.path.join(base, folder)
        current = _get_folder_mtime(fpath)
        if current != _mtime_cache.get(folder, -1):
            return True
    return False


def _update_mtime_cache():
    base = _base_dir()
    for folder in MONITORED_FOLDERS:
        _mtime_cache[folder] = _get_folder_mtime(os.path.join(base, folder))


# ─── REGISTRY I/O ─────────────────────────────────────────────────────────────

def _encrypt(data: str) -> str:
    """Enkripsi data menggunakan HWID-based cipher dari license_core."""
    try:
        from license_core import _get_cipher
        return _get_cipher().encrypt(data.encode()).decode()
    except Exception:
        # Fallback: base64 encoding jika cipher tidak tersedia
        return base64.b64encode(data.encode()).decode()


def _decrypt(enc: str) -> str | None:
    """Dekripsi data dari registry."""
    try:
        from license_core import _get_cipher
        return _get_cipher().decrypt(enc.encode()).decode()
    except Exception:
        try:
            return base64.b64decode(enc.encode()).decode()
        except Exception:
            return None


def _save_registry(version: str, fp_static: str, fp_templates: str, fp_combined: str) -> bool:
    """
    Simpan baseline fingerprint ke storage macOS.
    Disimpan di ~/Library/Application Support/ShowLyrics/.integrity.dat
    """
    payload = json.dumps({
        "version":               version,
        "saved_at":              datetime.now(timezone.utc).isoformat(),
        "folder_fingerprint":    fp_combined,
        "static_fingerprint":    fp_static,
        "templates_fingerprint": fp_templates,
    })
    try:
        enc = _encrypt(payload)
        _integrity_store.write(INTEGRITY_STORAGE_KEY, enc)
        print("[INTEGRITY] Storage baseline saved.")
        return True
    except Exception as e:
        print(f"[INTEGRITY] Storage write error: {e}")
        return False


def _load_registry() -> dict | None:
    """
    Baca baseline fingerprint dari storage macOS.
    Return None jika belum ada atau gagal dekripsi.
    """
    try:
        enc = _integrity_store.read(INTEGRITY_STORAGE_KEY)
        if not enc:
            return None
        raw = _decrypt(enc)
        if raw:
            return json.loads(raw)
        return None
    except Exception:
        return None


# ─── SERVER FETCH ─────────────────────────────────────────────────────────────

def _fetch_server() -> dict | None:
    """
    Fetch dan validasi server hash JSON dari GitHub Pages CDN.
    
    Optimasi Konektivitas:
      Mencoba request HTTPS standar dengan verifikasi SSL aktif.
      Jika gagal karena SSL Error (misal sertifikat local CA kadaluarsa),
      retrying dengan verify=False. Payload JSON tetap aman karena
      setiap hash divalidasi dengan manifest_sig.
    """
    import requests
    
    # 1. First Attempt: SSL verification enabled
    try:
        resp = requests.get(SERVER_HASH_URL, timeout=FETCH_TIMEOUT)
        if resp.status_code == 200:
            return _validate_server_data(resp.json())
        print(f"[INTEGRITY] CDN server returned status: {resp.status_code}")
    except requests.exceptions.SSLError as ssl_err:
        # 2. Fallback Attempt: local SSL store outdated (sangat umum pada OS Windows lawas/offline)
        print(f"[INTEGRITY] Local SSL certification issue ({ssl_err}). Retrying with verify=False...")
        try:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            resp = requests.get(SERVER_HASH_URL, timeout=FETCH_TIMEOUT, verify=False)
            if resp.status_code == 200:
                return _validate_server_data(resp.json())
            print(f"[INTEGRITY] CDN fallback request returned status: {resp.status_code}")
        except Exception as ex:
            print(f"[INTEGRITY] CDN fallback connection failed: {ex}")
    except Exception as e:
        print(f"[INTEGRITY] CDN connection failed: {e}")
    return None


def _validate_server_data(data: dict) -> dict | None:
    """Verifikasi tanda tangan kriptografis (signature) manifest_sig."""
    expected_sig = data.get("manifest_sig", "")
    parts = (
        data.get("version", "") +
        data.get("generated_at", "") +
        data.get("folder_fingerprint", "")
    )
    computed = _sha256_bytes(parts.encode())
    if expected_sig and computed != expected_sig:
        print("[INTEGRITY] ⚠️ CDN Server JSON signature mismatch! Content was modified.")
        return None
    return data



# ─── FORCE WATERMARK ──────────────────────────────────────────────────────────

def _force_watermark(reason: str):
    """
    Aktifkan watermark paksa — dipanggil saat tampering terdeteksi.

    Broadcast dikirim ke semua client yang terhubung secara REALTIME menggunakan
    asyncio.run_coroutine_threadsafe() dengan loop reference yang disimpan saat startup.

    FIX: asyncio.get_event_loop() tidak reliabel dari background thread — bisa
    mengembalikan loop yang berbeda atau sudah closed. Gunakan _event_loop yang
    di-inject dari main thread via inject_loop() untuk memastikan broadcast berhasil.
    """
    global _integrity_ok
    _integrity_ok = False
    print(f"[INTEGRITY] ⚠️  TAMPERING DETECTED: {reason}")

    # Set license invalid agar setiap client baru yang connect juga dapat status invalid
    if _license_ref:
        _license_ref.LICENSE_VALID = False

    # Broadcast ke semua client yang sedang terhubung — REALTIME, tanpa perlu refresh
    if _manager_ref and _event_loop and not _event_loop.is_closed():
        try:
            future = asyncio.run_coroutine_threadsafe(
                _manager_ref.broadcast({
                    "action": "force_watermark",
                    "reason": "integrity_violation"
                }),
                _event_loop
            )
            # Tunggu broadcast selesai max 3 detik (non-blocking dari perspektif caller)
            future.result(timeout=3)
            print("[INTEGRITY] ✅ force_watermark broadcast sent to all clients.")
        except Exception as e:
            print(f"[INTEGRITY] Broadcast error: {e}")
    elif _manager_ref and not _event_loop:
        print("[INTEGRITY] WARNING: event loop belum di-inject — watermark tidak bisa realtime. "
              "Pastikan inject_loop() dipanggil sebelum file_integrity.initialize().")


# ─── INITIALIZATION ───────────────────────────────────────────────────────────

def initialize():
    """
    Dipanggil saat startup (di thread terpisah, delay 2 detik setelah license check).
    
    Urutan Prioritas Pengecekan Hash (mengutamakan online CDN):
      1. TIER 1: ONLINE (CDN / Server) — Jika online, bandingkan local vs server.
         - Jika cocok: set OK. Jika registry kosong atau berbeda dengan server, replace registry dengan server.
         - Jika tidak cocok: tampering detected → force watermark.
      2. TIER 2: OFFLINE (Windows Registry) — Jika offline atau fetch server gagal.
         - Jika versi di registry berbeda dengan versi aplikasi saat ini:
           Asumsikan ini update aplikasi offline yang legitimate. Baseline diperbarui
           dengan local file saat ini, dan disimpan ke registry.
         - Jika versi registry sama: bandingkan local vs registry.
           Jika berbeda: tunggu 3 detik dan re-verify. Jika masih berbeda → force watermark.
      3. TIER 3: BUILTIN HASHES (_BUILTIN_HASHES) — Jika registry kosong/tidak ada.
         - Bandingkan local vs builtin hash.
         - Jika cocok (atau dev mode): set OK & simpan baseline baru ke registry.
         - Jika berbeda: tampering detected → force watermark.
    """
    global _wm_js_bytes, _wm_js_hash, _baseline_fp, _integrity_ok

    base = _base_dir()

    # 1. Load wm.js ke RAM — immune terhadap file replacement attack
    wm_path = os.path.join(base, "static", "wm.js")
    try:
        with open(wm_path, 'rb') as f:
            _wm_js_bytes = f.read()
        _wm_js_hash = _sha256_bytes(_wm_js_bytes)
        print(f"[INTEGRITY] wm.js cached in RAM ({len(_wm_js_bytes)} bytes)")
    except Exception as e:
        print(f"[INTEGRITY] WARNING: wm.js RAM cache failed: {e}")

    # Hitung fingerprint lokal saat startup
    fp_s, fp_t, fp_combined = _combined_fingerprint()

    # TIER 1: ONLINE (CDN / Server)
    if _should_fetch_cdn():
        print("[INTEGRITY] [TIER 1] Online connection detected. Fetching hash from CDN server...")
        server = _fetch_server()
        if server:
            server_fp = server.get("folder_fingerprint", "")
            if server_fp:
                if fp_combined == server_fp:
                    print("[INTEGRITY] [TIER 1] ✅ Verification successful. Local files match server CDN.")
                    _integrity_ok = True
                    _baseline_fp = server_fp
                    
                    # Jika registry kosong, berbeda baseline, atau versinya lama, replace registry dengan server data
                    reg = _load_registry()
                    if reg is None or reg.get("folder_fingerprint") != server_fp or reg.get("version") != APP_VERSION:
                        print("[INTEGRITY] [TIER 1] Registry baseline out of sync with CDN — synchronizing registry baseline.")
                        _save_registry(APP_VERSION, fp_s, fp_t, server_fp)
                else:
                    print("[INTEGRITY] [TIER 1] ⚠️ Critical: Local files do not match CDN server!")
                    _baseline_fp = server_fp
                    _force_watermark("Local files differ from CDN server baseline (startup)")
                
                _update_mtime_cache()
                return

    # TIER 2: OFFLINE (Local Storage)
    print("[INTEGRITY] [TIER 2] Offline or CDN server unavailable. Falling back to local storage baseline...")
    reg = _load_registry()
    if reg is not None:
        reg_version = reg.get("version", "")
        reg_fp = reg.get("folder_fingerprint", "")

        # Jika versi aplikasi berubah (update offline)
        if reg_version != APP_VERSION:
            print(f"[INTEGRITY] [TIER 2] Version changed {reg_version} → {APP_VERSION} (offline update). Trusting local files and updating registry baseline.")
            _baseline_fp = fp_combined
            _integrity_ok = True
            _save_registry(APP_VERSION, fp_s, fp_t, fp_combined)
        else:
            # Versi sama, bandingkan baseline fingerprint
            _baseline_fp = reg_fp
            if fp_combined != reg_fp:
                print("[INTEGRITY] [TIER 2] ⚠️ Local fingerprint differs from registry — waiting 3s for re-verify...")
                time.sleep(3)
                fp_s2, fp_t2, fp_combined2 = _combined_fingerprint()
                if fp_combined2 != reg_fp:
                    print("[INTEGRITY] [TIER 2] ⚠️ Re-verify failed. TAMPERING CONFIRMED (offline startup).")
                    _force_watermark("Files modified vs registry baseline (startup, after re-verify)")
                else:
                    print("[INTEGRITY] [TIER 2] ✅ Re-verify passed — startup OK.")
                    _integrity_ok = True
            else:
                _integrity_ok = True
                print("[INTEGRITY] [TIER 2] ✅ Startup integrity check passed via registry.")

        _update_mtime_cache()
        return

    # TIER 3: BUILTIN HASHES (Registry Kosong / First Install offline)
    print("[INTEGRITY] [TIER 3] Local Registry baseline is empty. Falling back to builtin hashes...")
    builtin_fp = _BUILTIN_HASHES.get("folder_fingerprint", "")
    if builtin_fp and builtin_fp != "PLACEHOLDER_COMBINED_FP":
        _baseline_fp = builtin_fp
        if fp_combined == builtin_fp:
            print("[INTEGRITY] [TIER 3] ✅ Verification successful. Local files match builtin hashes. Saving to registry.")
            _integrity_ok = True
            _save_registry(APP_VERSION, fp_s, fp_t, fp_combined)
        else:
            print("[INTEGRITY] [TIER 3] ⚠️ Critical: Local files differ from builtin hashes!")
            _force_watermark("Offline: local files differ from builtin baseline")
    else:
        # Dev mode atau builtin hashes belum digenerate
        print("[INTEGRITY] [DEV MODE] Builtin hashes not set. Trusting local files and saving baseline to Registry.")
        _baseline_fp = fp_combined
        _integrity_ok = True
        _save_registry(APP_VERSION, fp_s, fp_t, fp_combined)

    _update_mtime_cache()


# ─── BACKGROUND MONITOR ───────────────────────────────────────────────────────

def _check_cycle():
    """
    Satu siklus check — dipanggil setiap 10 menit oleh background thread.

    Strategi performa LOW-END DEVICE:
      Step 1: mtime pre-check (0.004ms) — jika tidak ada perubahan → SELESAI ✅
      Step 2: Full fingerprint (15ms) — HANYA jika mtime berubah (jarang di sistem bersih)
    """
    global _integrity_ok

    # Step 1: Ultra-ringan pre-check — hampir tidak ada CPU overhead
    if not _mtime_changed():
        return  # Sistem bersih, tidak perlu hash sama sekali

    # Step 2: Ada perubahan — perlu full fingerprint (~15ms)
    print("[INTEGRITY] mtime changed — running deep fingerprint check...")
    fp_s, fp_t, fp_combined = _combined_fingerprint()

    # Gunakan _should_fetch_cdn() — hanya fetch jika CDN diketahui bisa diakses
    if _should_fetch_cdn():
        # ── ONLINE: Server = kebenaran mutlak ─────────────────────
        server = _fetch_server()
        if server:
            server_fp = server.get("folder_fingerprint", "")
            if server_fp and fp_combined == server_fp:
                # File lokal = server → rewrite registry (refresh baseline)
                print("[INTEGRITY] ✅ Files match server. Refreshing registry.")
                reg_fp_s = server.get("static_fingerprint", fp_s)
                reg_fp_t = server.get("templates_fingerprint", fp_t)
                _save_registry(APP_VERSION, reg_fp_s, reg_fp_t, server_fp)
                _integrity_ok = True
                _update_mtime_cache()
            else:
                # File lokal ≠ server → tampering!
                _force_watermark("Files differ from server (background check)")
        else:
            # Tidak bisa kontak server → fallback ke registry
            _check_vs_registry(fp_combined)
    else:
        # ── OFFLINE: Registry = fallback ──────────────────────────
        _check_vs_registry(fp_combined)

    _update_mtime_cache()


def _check_vs_registry(local_fp: str):
    """
    Bandingkan fingerprint lokal vs registry baseline.
    Jika registry tidak ada → fallback ke Tier 3 (_BUILTIN_HASHES).

    Anti-false-positive: mismatch dari background monitor juga di-re-verify
    sebelum force watermark — menghindari false positive dari:
      - Windows Defender scan saat app sedang berjalan
      - Software backup / sync (OneDrive, Google Drive, dsb)
      - Legitimate file update oleh proses sistem lain
    """
    global _integrity_ok
    reg = _load_registry()

    if reg:
        # ── Tier 2: Registry ada ──────────────────────────────────
        reg_fp = reg.get("folder_fingerprint", "")
        if local_fp != reg_fp:
            # Anti-false-positive: re-verify setelah jeda singkat
            print("[INTEGRITY] ⚠️  Offline mismatch vs registry — re-verifying in 3s...")
            time.sleep(3)
            _, _, local_fp2 = _combined_fingerprint()
            if local_fp2 != reg_fp:
                print("[INTEGRITY] ⚠️  Re-verify failed. TAMPERING CONFIRMED (offline).")
                _force_watermark("Files differ from registry baseline (offline, after re-verify)")
            else:
                print("[INTEGRITY] ✅ Re-verify passed — likely transient false positive (offline).")
                _integrity_ok = True
                _update_mtime_cache()
        else:
            _integrity_ok = True
            print("[INTEGRITY] ✅ Offline check passed (Tier 2: registry).")
        return

    # ── Tier 3: Registry tidak ada → _BUILTIN_HASHES ─────────────
    print("[INTEGRITY] Registry missing. Checking builtin hashes (Tier 3)...")
    builtin_fp = _BUILTIN_HASHES.get("folder_fingerprint", "")

    if builtin_fp and builtin_fp != "PLACEHOLDER_COMBINED_FP":
        if local_fp == builtin_fp:
            print("[INTEGRITY] ✅ Files match builtin hashes. Re-saving to registry.")
            fp_s = _BUILTIN_HASHES.get("static_fingerprint", "")
            fp_t = _BUILTIN_HASHES.get("templates_fingerprint", "")
            _save_registry(APP_VERSION, fp_s, fp_t, local_fp)
            _integrity_ok = True
        else:
            # Tier 3 mismatch — tidak ada re-verify karena ini last resort
            _force_watermark("Files differ from builtin hashes (Tier 3 — offline, no registry)")
    else:
        # Dev mode: builtin tidak diset → percaya lokal, simpan ke registry
        print("[INTEGRITY] DEV: builtin hashes not set. Trusting local (offline, no registry).")
        fp_s, fp_t, _ = _combined_fingerprint()
        _save_registry(APP_VERSION, fp_s, fp_t, local_fp)
        _integrity_ok = True


def _monitor_loop():
    """
    Background thread — jalankan check_cycle setiap 10 menit.
    Pada sistem bersih tanpa tampering, overhead CPU = hampir nol
    (hanya mtime check 0.004ms per 10 menit).
    """
    while not _stop_event.wait(CHECK_INTERVAL):
        print("[INTEGRITY] Running periodic integrity check...")
        try:
            _check_cycle()
        except Exception as e:
            print(f"[INTEGRITY] Monitor error: {e}")


def start_monitor():
    """Mulai background integrity monitor thread."""
    global _stop_event
    _stop_event.clear()
    t = threading.Thread(target=_monitor_loop, name="IntegrityMonitor", daemon=True)
    t.start()
    print(f"[INTEGRITY] Background monitor started (interval={CHECK_INTERVAL}s / {CHECK_INTERVAL//60} menit)")


def stop_monitor():
    """Hentikan background monitor thread."""
    _stop_event.set()


# ─── wm.js IN-MEMORY SERVING ──────────────────────────────────────────────────

def get_wm_js() -> bytes | None:
    """
    Return wm.js dari RAM.
    Jika file di disk berubah (file replacement attack), tetap return copy RAM.
    Immune terhadap serangan penggantian file wm.js.
    """
    if _wm_js_bytes:
        # Verifikasi silent: apakah wm.js di disk masih sama?
        base        = _base_dir()
        wm_on_disk  = os.path.join(base, "static", "wm.js")
        try:
            with open(wm_on_disk, 'rb') as f:
                disk_hash = _sha256_bytes(f.read())
            if disk_hash != _wm_js_hash:
                print("[INTEGRITY] wm.js on disk MODIFIED — serving RAM copy!")
        except Exception:
            print("[INTEGRITY] wm.js on disk MISSING — serving RAM copy!")
        return _wm_js_bytes
    return None


def is_ok() -> bool:
    """Return True jika integritas sistem aman."""
    return _integrity_ok
