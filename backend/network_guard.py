"""
network_guard.py — ShowLyrics Network Intelligence Layer v2

Tugas:
  1. Cek CDN ShowLyrics terlebih dahulu (prioritas utama, hemat resource)
  2. Jika CDN gagal → fallback ke 4 internet umum (bedakan OFFLINE vs CDN_BLOCKED)
  3. Strike system: 3 kesempatan sebelum block (persistent di registry, TTL 14 hari)
  4. Broadcast alert ke frontend sesuai strike level (toast / modal / blocking)
  5. Adaptive watchdog:
       ONLINE_FULL    → tidak aktif (health-check 30 menit)
       OFFLINE        → 10 menit
       CDN problem    → 3 menit — hanya cek CDN saja jika sudah strike

ATURAN KERAS:
  - JANGAN PERNAH panggil clear_local_license() atau release_hwid_from_server()
  - Block hanya via watermark visual — license & HWID SELALU aman
  - Strike hanya dinaikkan 1x per startup app, BUKAN oleh watchdog
  - Strike TTL: 14 hari (2 minggu), auto-reset
  - Jika sudah strike di session ini, watchdog hanya monitor CDN recovery (hemat CPU)

Performance:
  - Skenario normal (CDN OK): 1 TCP check ~400ms, selesai
  - Skenario CDN blocked: 3 retry CDN + 4 fallback concurrent ~20s di background
  - Watchdog saat blocked (strike aktif): 1 TCP check CDN saja per 3 menit
"""

import socket
import time
import threading
import asyncio
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from enum import Enum
from dataclasses import dataclass
from typing import Optional



# ─── ENUM ────────────────────────────────────────────────────────────────────

class ConnectivityStatus(Enum):
    UNKNOWN              = "unknown"
    ONLINE_FULL          = "online_full"           # CDN ✅
    ONLINE_CDN_BLOCKED   = "online_cdn_blocked"    # Internet ✅ CDN ❌ (suspicious)
    ONLINE_CDN_UNCERTAIN = "online_cdn_uncertain"  # Internet ~50% CDN ❌ (ambiguous)
    OFFLINE              = "offline"               # Internet ❌ (truly offline)
    POOR_CONNECTION      = "poor_connection"       # Internet sangat buruk


# ─── CONFIG ──────────────────────────────────────────────────────────────────

# CDN ShowLyrics — dicek PERTAMA sebelum apapun
CDN_HOST    = "showlyrics.github.io"
CDN_PORT    = 443
CDN_TIMEOUT = 4.0    # detik

# Fallback targets — hanya dicek jika CDN gagal
FALLBACK_TARGETS = [
    ("google_dns", "8.8.8.8",       53,  2.5),
    ("cloudflare", "1.1.1.1",       53,  2.5),
    ("github",     "github.com",    443, 3.0),
    ("microsoft",  "microsoft.com", 443, 3.0),
]

# CDN retry sebelum declare blocked
CDN_RETRY_COUNT = 3    # percobaan (1 = fast/watchdog, 3 = startup)
CDN_RETRY_DELAY = 2.0  # detik antara retry

# Internet score thresholds (dari 4 fallback targets)
INTERNET_SCORE_BLOCKED   = 3  # ≥ 3/4 OK + CDN gagal = SENGAJA DIBLOKIR
INTERNET_SCORE_UNCERTAIN = 1  # 1-2/4 OK + CDN gagal = UNCERTAIN

# Strike system
MAX_STRIKES     = 3
STRIKE_TTL_DAYS = 14   # 2 minggu

# Watchdog intervals (detik)
WATCHDOG_FULL_ONLINE = 1800   # 30 menit — health-check sangat ringan
WATCHDOG_OFFLINE     = 600    # 10 menit — pantau apakah internet pulih
WATCHDOG_PROBLEM     = 180    # 3 menit  — CDN_BLOCKED / UNCERTAIN / POOR

# macOS: storage untuk strike counter
# Disimpan di ~/Library/Application Support/ShowLyrics/.network_strike.dat
STRIKE_STORAGE_KEY = "NetworkTrustData"

from storage_backend import get_store as _get_store
_strike_store = _get_store('network_strike')


# ─── DATACLASSES ─────────────────────────────────────────────────────────────

@dataclass
class InternetCheckResult:
    score:      int    # Berapa target yang berhasil (0-4)
    total:      int    # Total target yang dicek (4)
    latencies:  dict   # {name: ms} atau {name: None jika gagal}
    elapsed_ms: float  # Waktu total check (concurrent ~2.5s)

    @property
    def quality_label(self) -> str:
        if self.score >= INTERNET_SCORE_BLOCKED:   return "Good"
        if self.score >= INTERNET_SCORE_UNCERTAIN: return "Poor"
        return "No Internet"


@dataclass
class CdnStrikeData:
    count:   int   = 0
    last_at: float = 0.0  # Unix timestamp strike terakhir

    @property
    def is_expired(self) -> bool:
        """Strike dianggap expired jika > STRIKE_TTL_DAYS tanpa strike baru."""
        if self.count == 0 or self.last_at == 0:
            return False
        return (time.time() - self.last_at) / 86400 > STRIKE_TTL_DAYS

    @property
    def effective_count(self) -> int:
        """Count yang berlaku — 0 jika expired."""
        return 0 if self.is_expired else self.count


@dataclass
class NetworkStatus:
    status:         ConnectivityStatus           = ConnectivityStatus.UNKNOWN
    internet:       Optional[InternetCheckResult] = None
    cdn_reachable:  bool                          = False
    cdn_latency_ms: Optional[float]               = None
    blocked_reason: str                           = ""
    checked_at:     float                         = 0.0
    strike:         Optional[CdnStrikeData]       = None

    def __post_init__(self):
        if self.strike is None:
            self.strike = CdnStrikeData()

    @property
    def should_block_app(self) -> bool:
        """True hanya jika CDN blocked DAN sudah MAX_STRIKES."""
        return (
            self.status == ConnectivityStatus.ONLINE_CDN_BLOCKED
            and self.strike.effective_count >= MAX_STRIKES
        )


# ─── GLOBAL STATE ────────────────────────────────────────────────────────────

_current_status = NetworkStatus()
_status_lock    = threading.Lock()
_manager_ref    = None
_license_ref    = None
_event_loop     = None
_is_startup_run = True   # True hanya selama proses startup app


# ─── DEPENDENCY INJECTION ────────────────────────────────────────────────────

def inject_manager(manager):
    """Inject ConnectionManager dari main.py."""
    global _manager_ref
    _manager_ref = manager


def inject_license(license_module):
    """Inject license_check module agar bisa set LICENSE_VALID = False (watermark only)."""
    global _license_ref
    _license_ref = license_module


def inject_loop(loop):
    """
    Inject asyncio event loop dari main thread.
    Diperlukan agar _broadcast() dari background thread bisa kirim ke WebSocket.
    """
    global _event_loop
    _event_loop = loop
    print(f"[NETGUARD] Asyncio event loop injected: {loop}")


# ─── STRIKE REGISTRY I/O ─────────────────────────────────────────────────────

def _encrypt_strike(data: str) -> str:
    """Enkripsi payload strike menggunakan HWID-based cipher. Fallback ke base64."""
    try:
        from license_core import _get_cipher
        return _get_cipher().encrypt(data.encode()).decode()
    except Exception:
        import base64
        return base64.b64encode(data.encode()).decode()


def _decrypt_strike(enc: str) -> Optional[str]:
    """Dekripsi payload strike dari registry."""
    try:
        from license_core import _get_cipher
        return _get_cipher().decrypt(enc.encode()).decode()
    except Exception:
        try:
            import base64
            return base64.b64decode(enc.encode()).decode()
        except Exception:
            return None


def _load_strike() -> CdnStrikeData:
    """
    Baca strike counter dari storage macOS.
    Auto-reset jika TTL > 14 hari.
    Return default (count=0) jika tidak ada atau error.
    """
    try:
        enc = _strike_store.read(STRIKE_STORAGE_KEY)
        if not enc:
            return CdnStrikeData()

        raw  = _decrypt_strike(enc)
        data = json.loads(raw)
        strike = CdnStrikeData(
            count   = int(data.get("count",   0)),
            last_at = float(data.get("last_at", 0.0))
        )
        # Auto-reset jika TTL expired
        if strike.is_expired:
            print(f"[NETGUARD] Strike TTL expired ({STRIKE_TTL_DAYS}d). Auto-reset.")
            _save_strike(CdnStrikeData())
            return CdnStrikeData()
        return strike
    except Exception:
        return CdnStrikeData()


def _save_strike(strike: CdnStrikeData):
    """Simpan strike counter ke storage macOS."""
    try:
        payload = json.dumps({"count": strike.count, "last_at": strike.last_at})
        enc = _encrypt_strike(payload)
        _strike_store.write(STRIKE_STORAGE_KEY, enc)
    except Exception as e:
        print(f"[NETGUARD] Strike save error: {e}")


def get_strike_count() -> int:
    """Public: baca effective strike count."""
    return _load_strike().effective_count


def increment_strike() -> CdnStrikeData:
    """
    Naikkan strike counter.
    PENTING: Hanya boleh dipanggil saat _is_startup_run == True (1x per app open).
    Return: CdnStrikeData terbaru.
    """
    strike    = _load_strike()
    new_count = min(strike.count + 1, MAX_STRIKES)  # cap di MAX_STRIKES
    new_strike = CdnStrikeData(count=new_count, last_at=time.time())
    _save_strike(new_strike)
    print(f"[NETGUARD] Strike incremented: {strike.count} → {new_count}/{MAX_STRIKES}")
    return new_strike


def reset_strike():
    """Reset strike ke 0 (dipanggil saat CDN kembali OK)."""
    prev = _load_strike()
    if prev.count > 0:
        _save_strike(CdnStrikeData())
        print(f"[NETGUARD] Strike reset (was {prev.count}/{MAX_STRIKES} — CDN restored)")


# ─── TCP CHECK (ultra-ringan) ─────────────────────────────────────────────────

def _tcp_check(host: str, port: int, timeout: float) -> tuple[bool, float]:
    """
    Single TCP connect. Return (success, latency_ms).
    Hanya buka socket, langsung tutup. Sangat ringan (~1KB memory, <1ms CPU).
    """
    try:
        t0   = time.perf_counter()
        sock = socket.create_connection((host, port), timeout=timeout)
        sock.close()
        ms = round((time.perf_counter() - t0) * 1000, 1)
        return True, ms
    except Exception:
        return False, -1.0


# ─── CDN CHECK ───────────────────────────────────────────────────────────────

def check_cdn_reachability(retry: int = CDN_RETRY_COUNT,
                           delay: float = CDN_RETRY_DELAY) -> tuple[bool, float]:
    """
    Cek apakah CDN ShowLyrics bisa diakses.
    Retry beberapa kali untuk hindari false positive dari gangguan sementara.

    Args:
      retry: Jumlah percobaan.
             3 (default) = startup (akurat).
             1 = watchdog fast-check (ringan).
      delay: Jeda detik antara retry.

    Return: (reachable, avg_latency_ms)
    """
    latencies = []
    for attempt in range(retry):
        if attempt > 0:
            time.sleep(delay)

        ok, ms = _tcp_check(CDN_HOST, CDN_PORT, CDN_TIMEOUT)
        if ok:
            latencies.append(ms)
            avg = round(sum(latencies) / len(latencies), 1)
            print(f"[NETGUARD] CDN OK on attempt {attempt + 1}/{retry} ({avg}ms)")
            return True, avg

        print(
            f"[NETGUARD] CDN attempt {attempt + 1}/{retry} failed."
            + (" Retrying..." if attempt < retry - 1 else " Giving up.")
        )

    return False, -1.0


# ─── INTERNET FALLBACK CHECK ─────────────────────────────────────────────────

def check_internet_fallback() -> InternetCheckResult:
    """
    Cek kualitas internet dengan 4 target fallback secara concurrent.
    HANYA dipanggil jika CDN gagal — untuk bedakan OFFLINE vs CDN_BLOCKED.

    4 target paralel → total waktu ~2.5s (bukan 4 × 2.5 = 10s).
    """
    t0      = time.perf_counter()
    results = {}

    def _check_one(name, host, port, timeout):
        ok, ms = _tcp_check(host, port, timeout)
        return name, ok, ms

    with ThreadPoolExecutor(max_workers=len(FALLBACK_TARGETS)) as pool:
        futures = {
            pool.submit(_check_one, name, host, port, timeout): name
            for name, host, port, timeout in FALLBACK_TARGETS
        }
        for future in as_completed(futures):
            name, ok, ms = future.result()
            results[name] = ms if ok else None

    elapsed = round((time.perf_counter() - t0) * 1000, 1)
    score   = sum(1 for v in results.values() if v is not None)
    print(f"[NETGUARD] Fallback internet: {score}/{len(FALLBACK_TARGETS)} OK in {elapsed}ms "
          f"({', '.join(k for k, v in results.items() if v is not None) or 'none'})")

    return InternetCheckResult(
        score=score,
        total=len(FALLBACK_TARGETS),
        latencies=results,
        elapsed_ms=elapsed
    )


# ─── MAIN EVALUATION ─────────────────────────────────────────────────────────

def evaluate_connectivity(fast: bool = False) -> NetworkStatus:
    """
    Evaluasi koneksi internet + CDN (CDN-first, hemat resource).

    Alur:
      1. Cek CDN ShowLyrics (retry=1 jika fast, retry=3 jika startup)
         → OK: ONLINE_FULL, selesai (~400ms, 90% kasus)
         → Gagal: lanjut ke langkah 2
      2. Cek 4 fallback internet (concurrent ~2.5s)
         score=0       → OFFLINE (bukan kesalahan user, NO STRIKE)
         score=1-2     → ONLINE_CDN_UNCERTAIN (ambiguous, NO STRIKE)
         score=3-4     → ONLINE_CDN_BLOCKED (CDN sengaja diblokir, STRIKE jika startup)

    Args:
      fast: Jika True, CDN retry hanya 1x (untuk watchdog non-strike check).
    """
    print("[NETGUARD] Starting connectivity evaluation"
          + (" (fast mode)..." if fast else "..."))

    retry_count = 1 if fast else CDN_RETRY_COUNT
    status      = NetworkStatus(checked_at=time.time())

    # ── STEP 1: CDN check (prioritas) ────────────────────────────────────────
    cdn_ok, cdn_latency = check_cdn_reachability(retry=retry_count)
    status.cdn_reachable  = cdn_ok
    status.cdn_latency_ms = cdn_latency if cdn_ok else None

    if cdn_ok:
        status.status = ConnectivityStatus.ONLINE_FULL
        print(f"[NETGUARD] ✅ Status: ONLINE_FULL (CDN: {cdn_latency}ms)")
        _set_status(status)
        return status

    # ── STEP 2: CDN gagal → cek fallback internet ────────────────────────────
    print("[NETGUARD] CDN unreachable — checking internet fallback...")
    inet           = check_internet_fallback()
    status.internet = inet

    if inet.score == 0:
        status.status        = ConnectivityStatus.OFFLINE
        status.blocked_reason = "Tidak ada koneksi internet."
        print("[NETGUARD] Status: OFFLINE (no internet)")

    elif inet.score >= INTERNET_SCORE_BLOCKED:
        status.status        = ConnectivityStatus.ONLINE_CDN_BLOCKED
        status.blocked_reason = (
            f"Internet berjalan normal ({inet.score}/{inet.total} server OK) "
            f"tetapi server ShowLyrics tidak bisa diakses. "
            f"Kemungkinan diblokir oleh firewall atau hosts file."
        )
        print(f"[NETGUARD] ⚠️  Status: ONLINE_CDN_BLOCKED "
              f"(internet {inet.score}/{inet.total})")

    elif inet.score >= INTERNET_SCORE_UNCERTAIN:
        status.status        = ConnectivityStatus.ONLINE_CDN_UNCERTAIN
        status.blocked_reason = (
            f"Koneksi internet tidak stabil ({inet.score}/{inet.total} server OK) "
            f"dan server ShowLyrics tidak merespons."
        )
        print(f"[NETGUARD] ⚠️  Status: ONLINE_CDN_UNCERTAIN "
              f"(internet {inet.score}/{inet.total})")

    else:
        status.status        = ConnectivityStatus.POOR_CONNECTION
        status.blocked_reason = (
            f"Koneksi internet sangat buruk ({inet.score}/{inet.total})."
        )
        print(f"[NETGUARD] Status: POOR_CONNECTION ({inet.score}/{inet.total})")

    _set_status(status)
    return status


# ─── GLOBAL STATE MANAGEMENT ─────────────────────────────────────────────────

def _set_status(status: NetworkStatus):
    """Update global status dan trigger notification jika berubah."""
    global _current_status
    with _status_lock:
        prev = _current_status.status
        _current_status = status

    if status.status != prev:
        print(f"[NETGUARD] Status changed: {prev.value} → {status.status.value}")
        _notify_status_change(status)
        _watchdog.wake()   # sesuaikan interval watchdog


def get_current_status() -> NetworkStatus:
    with _status_lock:
        return _current_status


def is_online() -> bool:
    """
    Drop-in replacement untuk config.is_online().
    Return False hanya jika OFFLINE. UNCERTAIN / POOR dianggap "online" parsial.
    """
    s = get_current_status()
    if s.status == ConnectivityStatus.UNKNOWN:
        result = evaluate_connectivity(fast=True)
        return result.status != ConnectivityStatus.OFFLINE
    return s.status != ConnectivityStatus.OFFLINE


def is_cdn_accessible() -> bool:
    """True hanya jika status ONLINE_FULL (CDN OK)."""
    return get_current_status().status == ConnectivityStatus.ONLINE_FULL


# ─── NOTIFICATION & BROADCAST ────────────────────────────────────────────────

def _notify_status_change(status: NetworkStatus):
    """
    Kirim notifikasi ke frontend sesuai status + strike level.

    Rules:
      - Strike hanya dinaikkan saat _is_startup_run == True (1x per session).
      - Strike 1 → toast ringan, app NORMAL.
      - Strike 2 → modal dismissible, app NORMAL.
      - Strike 3 → modal BLOCKING + watermark. License & HWID TIDAK disentuh.
      - Watchdog: tidak increment strike, hanya re-broadcast jika sudah strike 3.
      - ONLINE_FULL → reset strike + dismiss modal.
    """
    global _is_startup_run

    # ── CDN pulih ────────────────────────────────────────────────────────────
    if status.status == ConnectivityStatus.ONLINE_FULL:
        reset_strike()
        _watchdog.clear_strike_flag()
        _broadcast({
            "action":         "network_restored",
            "cdn_latency_ms": status.cdn_latency_ms
        })
        return

    # ── CDN Blocked ──────────────────────────────────────────────────────────
    if status.status == ConnectivityStatus.ONLINE_CDN_BLOCKED:
        inet_score = (
            f"{status.internet.score}/{status.internet.total}"
            if status.internet else "0/4"
        )

        if _is_startup_run:
            # ── Startup: increment strike (1x per session) ───────────────────
            strike    = increment_strike()
            effective = strike.effective_count
            _watchdog.mark_strike_given()

            if effective == 1:
                _broadcast({
                    "action":      "network_strike",
                    "level":       1,
                    "max":         MAX_STRIKES,
                    "dismissible": True,
                    "block_app":   False,
                    "title":       "⚠️ Server Tidak Terjangkau",
                    "message": (
                        f"Server ShowLyrics tidak dapat dijangkau saat ini "
                        f"(percobaan 1/{MAX_STRIKES}). Harap periksa apakah "
                        f"firewall atau antivirus memblokir koneksi."
                    ),
                    "internet_score": inet_score,
                })

            elif effective == 2:
                _broadcast({
                    "action":      "network_strike",
                    "level":       2,
                    "max":         MAX_STRIKES,
                    "dismissible": True,
                    "block_app":   False,
                    "title":       "⚠️ Peringatan Koneksi (2/3)",
                    "message": (
                        f"Ini adalah peringatan kedua. Server ShowLyrics masih "
                        f"tidak dapat dijangkau (percobaan 2/{MAX_STRIKES}). "
                        f"Jika pada percobaan berikutnya masih gagal, "
                        f"aplikasi akan dibatasi."
                    ),
                    "internet_score": inet_score,
                })

            else:   # effective >= 3
                _broadcast({
                    "action":      "network_strike",
                    "level":       3,
                    "max":         MAX_STRIKES,
                    "dismissible": True,
                    "block_app":   False,
                    "title":       "🚫 Server Diblokir (3/3)",
                    "message": (
                        f"Server ShowLyrics telah diblokir selama {MAX_STRIKES} "
                        f"kali berturut-turut. Internet Anda berfungsi normal "
                        f"namun server tidak dapat dijangkau. "
                        f"Kemungkinan besar terdapat pemblokiran melalui "
                        f"firewall atau hosts file."
                    ),
                    "internet_score": inet_score,
                })
                # Watermark — license & HWID TIDAK disentuh ✅
                if _license_ref:
                    _license_ref.LICENSE_VALID = False
                _broadcast({
                    "action": "force_watermark",
                    "reason": "cdn_blocked_max_strike"
                })

        else:
            # ── Watchdog: tidak increment. Jika sudah max → re-broadcast blocking ──
            strike = _load_strike()
            if strike.effective_count >= MAX_STRIKES:
                _broadcast({
                    "action":      "network_strike",
                    "level":       3,
                    "max":         MAX_STRIKES,
                    "dismissible": True,
                    "block_app":   False,
                    "title":       "🚫 Server Masih Diblokir",
                    "message":     "Server ShowLyrics masih tidak dapat dijangkau.",
                    "internet_score": inet_score,
                })

    # ── CDN Uncertain ─────────────────────────────────────────────────────────
    elif status.status == ConnectivityStatus.ONLINE_CDN_UNCERTAIN:
        if _is_startup_run:
            # Hanya warning ringan — bukan strike
            _broadcast({
                "action":  "network_warning",
                "type":    "cdn_uncertain",
                "message": status.blocked_reason,
                "internet_score": (
                    f"{status.internet.score}/{status.internet.total}"
                    if status.internet else "0/4"
                ),
            })

    # Startup selesai setelah notifikasi pertama dikirim
    _is_startup_run = False


def _broadcast(data: dict):
    """
    Thread-safe broadcast ke semua WebSocket clients.
    Dijalankan dari background thread via run_coroutine_threadsafe.
    """
    if not _manager_ref:
        return
    try:
        loop = _event_loop
        if loop and not loop.is_closed() and loop.is_running():
            asyncio.run_coroutine_threadsafe(_manager_ref.broadcast(data), loop)
        else:
            # Fallback: _event_loop belum di-inject atau sudah closed
            # Tidak ada cara aman untuk broadcast dari thread ini tanpa loop reference
            # Biarkan silent — akan di-catch oleh next watchdog cycle
            pass
    except Exception as e:
        print(f"[NETGUARD] Broadcast error: {e}")


# ─── WATCHDOG CONTROLLER ─────────────────────────────────────────────────────

class _WatchdogController:
    """
    Adaptive background watchdog untuk memantau status CDN secara periodik.

    Interval berubah otomatis berdasarkan status terkini:
      ONLINE_FULL    → 30 menit (health-check ringan — pastikan CDN masih OK)
      OFFLINE        → 10 menit (pantau apakah internet pulih)
      CDN problem    → 3 menit  (CDN_BLOCKED / UNCERTAIN / POOR)

    Optimasi CPU ketika sudah strike aktif:
      Jika startup sudah memberikan strike (status BLOCKED diketahui dari startup),
      watchdog hanya perlu cek CDN saja (1 TCP check) — tidak perlu evaluasi ulang
      4 fallback sites karena status sudah jelas. Hemat CPU dan jaringan signifikan.

      → CDN pulih: reset strike, dismiss modal, update status ONLINE_FULL
      → CDN masih gagal: tidak perlu broadcast / fallback check
    """

    def __init__(self):
        self._stop_event    = threading.Event()
        self._wake_event    = threading.Event()   # trigger interval change tanpa restart thread
        self._thread: Optional[threading.Thread] = None
        self._strike_given  = False               # sudah berikan strike di session ini?

    # ── Public ───────────────────────────────────────────────────────────────

    def mark_strike_given(self):
        """Dipanggil dari _notify_status_change saat startup memberikan strike."""
        self._strike_given = True

    def clear_strike_flag(self):
        """Dipanggil saat CDN pulih dan strike direset."""
        self._strike_given = False

    def wake(self):
        """
        Bangunkan watchdog lebih awal — dipanggil saat status berubah.
        Memastikan interval disesuaikan segera tanpa tunggu sleep habis.
        """
        self._wake_event.set()

    def start(self):
        self._stop_event.clear()
        self._wake_event.clear()
        self._thread = threading.Thread(
            target=self._loop,
            name="NetworkWatchdog",
            daemon=True
        )
        self._thread.start()
        print("[NETGUARD] Watchdog started.")

    def stop(self):
        self._stop_event.set()
        self._wake_event.set()   # bangunkan agar thread bisa exit

    # ── Private ──────────────────────────────────────────────────────────────

    def _get_interval(self) -> int:
        s = get_current_status().status
        if s == ConnectivityStatus.ONLINE_FULL:
            return WATCHDOG_FULL_ONLINE   # 30 menit
        if s == ConnectivityStatus.OFFLINE:
            return WATCHDOG_OFFLINE        # 10 menit
        return WATCHDOG_PROBLEM            # 3 menit

    def _run_check(self):
        """
        Satu siklus check watchdog.

        Optimasi:
          Jika sudah ada strike aktif di session ini DAN status masih BLOCKED:
            → Hanya cek CDN saja (1 TCP check, ~400ms)
            → CDN pulih: reset strike, update status → broadcast network_restored
            → CDN masih gagal: tidak lakukan apa-apa (sudah tahu statusnya)

          Jika belum ada strike (OFFLINE / UNCERTAIN / POOR / ONLINE_FULL):
            → Full evaluate: CDN first, fallback jika CDN gagal (fast=True)
        """
        current = get_current_status()

        if (self._strike_given
                and current.status == ConnectivityStatus.ONLINE_CDN_BLOCKED):
            # ── Mode hemat: hanya pantau recovery CDN ─────────────────────
            cdn_ok, cdn_latency = check_cdn_reachability(retry=1)
            if cdn_ok:
                print("[NETGUARD] Watchdog: CDN recovered! Resetting strike.")
                reset_strike()
                self.clear_strike_flag()
                new_status = NetworkStatus(
                    status         = ConnectivityStatus.ONLINE_FULL,
                    cdn_reachable  = True,
                    cdn_latency_ms = cdn_latency,
                    checked_at     = time.time()
                )
                _set_status(new_status)
                # _set_status → _notify_status_change → broadcast "network_restored"
            else:
                print("[NETGUARD] Watchdog: CDN still blocked. No action needed.")
            return

        # ── Mode normal: full evaluate (CDN first, fallback jika CDN gagal) ──
        evaluate_connectivity(fast=True)

    def _loop(self):
        """Background thread loop dengan adaptive interval."""
        global _is_startup_run

        # Tunggu 15 detik setelah startup — beri waktu evaluate_connectivity selesai
        self._stop_event.wait(timeout=15)
        if self._stop_event.is_set():
            return

        # Tandai startup selesai
        _is_startup_run = False
        print("[NETGUARD] Watchdog active (startup phase complete).")

        while not self._stop_event.is_set():
            interval = self._get_interval()
            self._wake_event.clear()
            # Tunggu interval atau sampai di-wake (status berubah → sesuaikan interval)
            self._wake_event.wait(timeout=interval)

            if self._stop_event.is_set():
                break

            try:
                self._run_check()
            except Exception as e:
                print(f"[NETGUARD] Watchdog error: {e}")


# Singleton watchdog instance
_watchdog = _WatchdogController()


# ─── PUBLIC API ───────────────────────────────────────────────────────────────

def start_watchdog():
    """Mulai adaptive watchdog (dipanggil dari main.py setelah startup check)."""
    _watchdog.start()


def stop_watchdog():
    """Hentikan watchdog (dipanggil saat app shutdown)."""
    _watchdog.stop()


async def send_status_to_client(websocket, sign_fn):
    """Kirim status koneksi terbaru langsung ke satu client baru."""
    status = get_current_status()
    if status.status == ConnectivityStatus.UNKNOWN:
        return

    if status.status == ConnectivityStatus.ONLINE_FULL:
        return

    if status.status == ConnectivityStatus.ONLINE_CDN_BLOCKED:
        strike = _load_strike()
        effective = strike.effective_count
        inet_score = (
            f"{status.internet.score}/{status.internet.total}"
            if status.internet else "0/4"
        )
        
        payload = {
            "action": "network_strike",
            "level": effective,
            "max": MAX_STRIKES,
            "internet_score": inet_score,
        }
        if effective == 1:
            payload.update({
                "dismissible": True,
                "block_app":   False,
                "title":       "⚠️ Server Tidak Terjangkau",
                "message":     f"Server ShowLyrics tidak dapat dijangkau saat ini (percobaan 1/{MAX_STRIKES}). Harap periksa apakah firewall atau antivirus memblokir koneksi.",
            })
        elif effective == 2:
            payload.update({
                "dismissible": True,
                "block_app":   False,
                "title":       "⚠️ Peringatan Koneksi (2/3)",
                "message":     f"Ini adalah peringatan kedua. Server ShowLyrics masih tidak dapat dijangkau (percobaan 2/{MAX_STRIKES}). Jika pada percobaan berikutnya masih gagal, aplikasi akan dibatasi.",
            })
        else:
            payload.update({
                "dismissible": True,
                "block_app":   False,
                "title":       "🚫 Server Diblokir (3/3)",
                "message":     f"Server ShowLyrics telah diblokir selama {MAX_STRIKES} kali berturut-turut. Internet Anda berfungsi normal namun server tidak dapat dijangkau. Kemungkinan besar terdapat pemblokiran melalui firewall atau hosts file.",
            })
        
        try:
            await websocket.send_json(sign_fn(payload))
        except Exception:
            pass

    elif status.status == ConnectivityStatus.ONLINE_CDN_UNCERTAIN:
        try:
            await websocket.send_json(sign_fn({
                "action":  "network_warning",
                "type":    "cdn_uncertain",
                "message": status.blocked_reason,
                "internet_score": (
                    f"{status.internet.score}/{status.internet.total}"
                    if status.internet else "0/4"
                ),
            }))
        except Exception:
            pass

