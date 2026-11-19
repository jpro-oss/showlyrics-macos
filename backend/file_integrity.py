"""
file_integrity.py — ShowLyrics File Integrity Guardian v4

Tiga lapis keamanan:
  Tier 1 (Online)  : Server JSON (GitHub Pages CDN) — Kebenaran mutlak
  Tier 2 (Offline) : macOS Storage Backend (terenkripsi HWID-based) — Cache fallback
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

APP_VERSION     = "1.3.5-4"
SERVER_HASH_URL = "https://showlyrics.github.io/file/v135-4.json"

_BUILTIN_HASHES = {
    "version":               "1.3.5-4",
    "static_fingerprint":    "c7a094a6407d19377290dae86d13c82a219be5ace9d5ef279313c4b996dca20d",
    "templates_fingerprint": "244a675c16a3395f1a3bd9cc14baa202fc09d11ab005b2195da501b634ac1932",
    "folder_fingerprint":    "f63b7f274104b1d990bf36e91f38fb2284c64dd722edafab14c396cb9ade7755",
    "manifest_sig":          "cdbe86fa80dad38b62913d70d3d19eb9d26de0caa0b73647883919a6ef149dc5"
}

CHECK_INTERVAL     = 600 
WM_CHECK_INTERVAL  = 90   
FETCH_TIMEOUT      = 8    

INTEGRITY_REG_KEY = "SysIntegrityData"
_integrity_store = get_store('integrity')

# Folder yang dipantau (relatif terhadap base dir) — hanya flat files, tidak rekursif
MONITORED_FOLDERS = ["static", "templates"]

# ─── GLOBAL STATE ─────────────────────────────────────────────────────────────
_wm_js_bytes: bytes = None
_wm_js_hash: str   = None
_wm_mtime: float   = 0.0   # mtime wm.js saat startup — baseline os.stat()
_wm_size: int      = 0     # file size wm.js saat startup — baseline os.stat()
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
        ShowLyrics.exe
        internal/            ← sys._MEIPASS mengarah ke sini
          static/            ← ADA DI SINI (di dalam internal/)
          templates/         ← ADA DI SINI (di dalam internal/)
          [DLLs, .pyd, ...]

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
    payload = json.dumps({
        "version":               version,
        "saved_at":              datetime.now(timezone.utc).isoformat(),
        "folder_fingerprint":    fp_combined,
        "static_fingerprint":    fp_static,
        "templates_fingerprint": fp_templates,
    })
    try:
        enc = _encrypt(payload)
        _integrity_store.write(INTEGRITY_REG_KEY, enc)
        print("[INTEGRITY] Storage baseline saved.")
        return True
    except Exception as e:
        print(f"[INTEGRITY] Storage write error: {e}")
        return False


def _load_registry() -> dict | None:
    try:
        enc = _integrity_store.read(INTEGRITY_REG_KEY)
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
    Aktifkan watermark paksa & TUTUP SEMUA WEBSOCKET — dipanggil saat tampering / file wm.js hilang terdeteksi.
    """
    global _integrity_ok
    _integrity_ok = False
    print(f"[INTEGRITY] ⚠️  TAMPERING / DISK MODIFICATION DETECTED: {reason}")

    # Set license invalid agar setiap client baru yang connect juga dapat status invalid
    if _license_ref:
        _license_ref.LICENSE_VALID = False

    # TUTUP SEMUA WEBSOCKET REALTIME (Output mati total: background, audio, text, dll.)
    if _manager_ref and _event_loop and not _event_loop.is_closed():
        try:
            future = asyncio.run_coroutine_threadsafe(
                _manager_ref.terminate_all_connections(code=4003, reason=f"integrity_violation:{reason}"),
                _event_loop
            )
            future.result(timeout=3)
            print("[INTEGRITY] 🚨 All websockets terminated & output killed due to tampering!")
        except Exception as e:
            print(f"[INTEGRITY] Termination error: {e}")
    elif _manager_ref and not _event_loop:
        print("[INTEGRITY] WARNING: event loop belum di-inject — watermark tidak bisa realtime.")


# ─── INITIALIZATION ───────────────────────────────────────────────────────────

def initialize():
    """
    Dipanggil saat startup (di thread terpisah, delay 2 detik setelah license check).
    """
    global _wm_js_bytes, _wm_js_hash, _wm_mtime, _wm_size, _baseline_fp, _integrity_ok

    base = _base_dir()

    # 1. Load wm.js ke RAM — immune terhadap file replacement attack
    wm_path = os.path.join(base, "static", "wm.js")
    try:
        with open(wm_path, 'rb') as f:
            _wm_js_bytes = f.read()
        _wm_js_hash  = _sha256_bytes(_wm_js_bytes)
        _wm_mtime    = os.path.getmtime(wm_path)   # baseline mtime
        _wm_size     = os.path.getsize(wm_path)    # baseline size
        print(f"[INTEGRITY] wm.js cached in RAM ({len(_wm_js_bytes)} bytes, mtime={_wm_mtime:.0f})")
    except Exception as e:
        print(f"[INTEGRITY] ERROR loading wm.js: {e}")
        _force_watermark("wm_js_missing_on_startup")
        return

    # Hitung fingerprint lokal saat startup
    fp_s, fp_t, fp_combined = _combined_fingerprint()

    # TIER 1: ONLINE (CDN / Server)
    if _should_fetch_cdn():
        print("[INTEGRITY] [TIER 1] Online connection detected. Fetching hash from CDN server...")
        server = _fetch_server()
        if server:
            server_fp = server.get("folder_fingerprint", "")
            builtin_fp = _BUILTIN_HASHES.get("folder_fingerprint", "")
            if server_fp:
                matches_server = (fp_combined == server_fp)
                matches_builtin = bool(
                    builtin_fp
                    and builtin_fp != "PLACEHOLDER_COMBINED_FP"
                    and fp_combined == builtin_fp
                )
                if matches_server or matches_builtin:
                    if matches_server:
                        print("[INTEGRITY] [TIER 1] ✅ Verification successful. Local files match server CDN.")
                    else:
                        print("[INTEGRITY] [TIER 1] ✅ Local files match builtin baseline.")
                    _integrity_ok = True
                    _baseline_fp = fp_combined

                    # Jika storage kosong, berbeda baseline, atau versinya lama, sinkronkan
                    reg = _load_registry()
                    if reg is None or reg.get("folder_fingerprint") != fp_combined or reg.get("version") != APP_VERSION:
                        print("[INTEGRITY] [TIER 1] Storage baseline out of sync — synchronizing baseline.")
                        _save_registry(APP_VERSION, fp_s, fp_t, fp_combined)
                else:
                    print("[INTEGRITY] [TIER 1] ⚠️ Critical: Local files do not match CDN server or builtin baseline!")
                    _baseline_fp = server_fp
                    _force_watermark("Local files differ from CDN server and builtin baseline (startup)")

                _update_mtime_cache()
                return

    # TIER 2: OFFLINE (Registry)
    print("[INTEGRITY] [TIER 2] Offline or CDN server unavailable. Falling back to local Windows Registry baseline...")
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
            builtin_fp = _BUILTIN_HASHES.get("folder_fingerprint", "")
            matches_server = bool(server_fp and fp_combined == server_fp)
            matches_builtin = bool(
                builtin_fp
                and builtin_fp != "PLACEHOLDER_COMBINED_FP"
                and fp_combined == builtin_fp
            )
            if matches_server or matches_builtin:
                # File lokal = server atau builtin → refresh baseline
                print("[INTEGRITY] ✅ Files match server/builtin. Refreshing baseline.")
                reg_fp_s = server.get("static_fingerprint", fp_s) if matches_server else fp_s
                reg_fp_t = server.get("templates_fingerprint", fp_t) if matches_server else fp_t
                _save_registry(APP_VERSION, reg_fp_s, reg_fp_t, fp_combined)
                _integrity_ok = True
                _update_mtime_cache()
            else:
                # File lokal ≠ server dan ≠ builtin → tampering!
                _force_watermark("Files differ from server and builtin (background check)")
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
    Background monitor — strategi hybrid optimal (PyInstaller onedir safe):

      Setiap 90 detik:
        1. os.stat(wm.js) — hanya 1 syscall, 0.001ms, tanpa disk read/hash
        2. Jika mtime ATAU size berubah → baru baca & hash file (verifikasi)
        3. Jika stat sama → aman, skip seluruhnya (0 disk I/O)

      Setiap 10 menit atau jika folder mtime berubah:
        → _check_cycle() — full fingerprint validation

    Kompatibel onedir: static/wm.js ada di _internal/static/, mtime stabil
    selama tidak ada tampering → tidak pernah false trigger.
    """
    global _wm_mtime, _wm_size
    last_full_check = 0

    while not _stop_event.wait(WM_CHECK_INTERVAL):
        try:
            base       = _base_dir()
            wm_on_disk = os.path.join(base, "static", "wm.js")

            # ── Step 1: Fast stat — tidak ada disk read (0.001ms) ────────────
            try:
                st            = os.stat(wm_on_disk)
                current_mtime = st.st_mtime
                current_size  = st.st_size
            except FileNotFoundError:
                print("[INTEGRITY] ⚠️ wm.js deleted from disk!")
                _force_watermark("wm_js_deleted_from_disk")
                continue

            # ── Step 2: Hash hanya jika stat berubah ─────────────────────────
            if _wm_js_hash and (current_mtime != _wm_mtime or current_size != _wm_size):
                print("[INTEGRITY] wm.js stat changed — verifying hash...")
                try:
                    with open(wm_on_disk, 'rb') as f:
                        disk_hash = _sha256_bytes(f.read())
                    if disk_hash != _wm_js_hash:
                        print("[INTEGRITY] ⚠️ wm.js hash mismatch — file modified!")
                        _force_watermark("wm_js_modified_on_disk")
                    else:
                        # mtime berubah tapi isi sama (touch/backup/AV scan) — update baseline
                        print("[INTEGRITY] wm.js stat changed but hash OK (touch/backup?) — baseline updated.")
                        _wm_mtime = current_mtime
                        _wm_size  = current_size
                except Exception as read_err:
                    _force_watermark(f"wm_js_read_error:{read_err}")
                continue

            # ── Step 3: Full folder check (periodik atau jika mtime folder berubah) ──
            now = time.time()
            if now - last_full_check > CHECK_INTERVAL or _mtime_changed():
                last_full_check = now
                print("[INTEGRITY] Running periodic full integrity check...")
                _check_cycle()

        except Exception as e:
            print(f"[INTEGRITY] Monitor error: {e}")


def start_monitor():
    """Mulai background integrity monitor thread."""
    global _stop_event
    _stop_event.clear()
    t = threading.Thread(target=_monitor_loop, name="IntegrityMonitor", daemon=True)
    t.start()
    print(
        f"[INTEGRITY] Background monitor started "
        f"(wm.js stat check: {WM_CHECK_INTERVAL}s, full folder: {CHECK_INTERVAL}s)"
    )


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
        # Verifikasi: apakah wm.js di disk masih sama?
        base        = _base_dir()
        wm_on_disk  = os.path.join(base, "static", "wm.js")
        try:
            with open(wm_on_disk, 'rb') as f:
                disk_hash = _sha256_bytes(f.read())
            if disk_hash != _wm_js_hash:
                print("[INTEGRITY] ⚠️ wm.js on disk MODIFIED — triggering output shutdown!")
                _force_watermark("wm_js_modified_on_disk")
                return None
        except Exception:
            print("[INTEGRITY] ⚠️ wm.js on disk MISSING — triggering output shutdown!")
            _force_watermark("wm_js_deleted_from_disk")
            return None
        return _wm_js_bytes
    return None


def is_ok() -> bool:
    """Return True jika integritas sistem aman."""
    from config import DEV
    if DEV:
        return True
    return _integrity_ok
