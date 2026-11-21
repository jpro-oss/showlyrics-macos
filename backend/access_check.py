"""
access_check.py — ShowLyrics macOS Beta Access Router & Guardian (Decoupled Module)

Router FastAPI & Logika Verifikasi Kode Akses Beta (5 karakter XXXXX):
  - Startup check (online Firestore sync + offline encrypted fallback)
  - Real-time O(1) validation (expiry date + anti-clock-rollback)
  - Periodic 10-minute background monitor + live WebSocket revocation (code 4001)
  - Tidak ada endpoint self-deactivate dari client (reset HWID hanya oleh Admin)
"""

import re
import asyncio
import time
from datetime import datetime
from collections import defaultdict
from fastapi import APIRouter, Request
from pydantic import BaseModel, Field

from access_core import (
    get_local_access_data,
    clear_local_access,
    save_access_to_registry,
    get_firebase_access_doc,
    register_access_hwid_to_server,
    is_clock_tampered,
    touch_last_seen_timestamp,
    CLOCK_ROLLBACK_TOLERANCE_SEC,
)
from license_core import get_hwid
from config import is_online

# --- GLOBALS ---
ACCESS_VALID = False
ACCESS_CHECK_DONE = False
ACCESS_REASON = "inactive"        # inactive | expired | revoked | hwid_mismatch | clock_tampered | none
ACCESS_EXPIRY_DATE = ""
_ACCESS_LAST_SEEN_TS = 0
_access_attempts = defaultdict(list)

_manager_ref = None
_monitor_task = None
_monitor_stop_event = None

MAX_ACCESS_ATTEMPTS = 5
ACCESS_WINDOW_SEC = 300           # 5 menit
MONITOR_INTERVAL_SEC = 600        # 10 menit
_KEY_PATTERN = re.compile(r"^[A-Z0-9]{5}$")

router = APIRouter(prefix="/api/access", tags=["access"])


def inject_manager(manager):
    """Inject ConnectionManager dari main.py untuk live revocation via WebSocket."""
    global _manager_ref
    _manager_ref = manager


def _set_state(valid: bool, reason: str, expiry_date: str = "", last_seen_ts: int = 0):
    global ACCESS_VALID, ACCESS_CHECK_DONE, ACCESS_REASON, ACCESS_EXPIRY_DATE, _ACCESS_LAST_SEEN_TS
    ACCESS_VALID = valid
    ACCESS_CHECK_DONE = True
    ACCESS_REASON = "none" if valid else reason
    ACCESS_EXPIRY_DATE = expiry_date if valid else ""
    _ACCESS_LAST_SEEN_TS = int(last_seen_ts or 0) if valid else 0


def _is_date_expired(exp_date_str: str) -> tuple[bool, bool]:
    """Return (is_expired, parse_ok) untuk string YYYY-MM-DD."""
    try:
        exp_date = datetime.strptime(exp_date_str.strip(), "%Y-%m-%d").date()
        return (datetime.now().date() > exp_date), True
    except Exception:
        return True, False


def is_access_valid() -> bool:
    """
    Pemeriksaan cepat O(1) status Beta Access untuk middleware & WebSocket.
    Memastikan expiryDate & anti-clock-rollback tetap dicek secara real-time
    meski aplikasi melewati pergantian hari (tengah malam).
    """
    if not ACCESS_VALID:
        return False

    # 1. Anti-clock-rollback real-time
    if _ACCESS_LAST_SEEN_TS > 0 and (time.time() + CLOCK_ROLLBACK_TOLERANCE_SEC) < _ACCESS_LAST_SEEN_TS:
        print("[BETA ACCESS] Deteksi clock rollback saat runtime — akses dikunci!")
        _set_state(False, "clock_tampered")
        return False

    # 2. Real-time cek expiryDate (tangkap pergantian tanggal tengah malam)
    if ACCESS_EXPIRY_DATE:
        expired, ok = _is_date_expired(ACCESS_EXPIRY_DATE)
        if not ok or expired:
            print(f"[BETA ACCESS] Kode Akses Beta EXPIRED saat runtime ({ACCESS_EXPIRY_DATE})!")
            clear_local_access()
            _set_state(False, "expired")
            return False

    return True


def get_access_reason() -> str:
    """Return alasan blokir saat ini (inactive|expired|revoked|hwid_mismatch|clock_tampered|none)."""
    is_access_valid()
    return ACCESS_REASON


def _check_rate_limit(identifier: str) -> bool:
    """Rate limit percobaan aktivasi kode akses per IP."""
    now = time.time()
    attempts = _access_attempts[identifier]
    _access_attempts[identifier] = [t for t in attempts if now - t < ACCESS_WINDOW_SEC]
    if len(_access_attempts[identifier]) >= MAX_ACCESS_ATTEMPTS:
        return False
    _access_attempts[identifier].append(now)
    return True


def _validate_current_access_blocking(force_reload: bool = False) -> tuple[bool, str, str]:
    """
    Verifikasi penuh (disk + anti-clock-rollback + expiry + Firestore sync jika online).
    Dipanggil saat startup dan oleh periodic background monitor (di worker thread).
    Return: (is_valid, reason, expiry_date)
    """
    local_data = get_local_access_data(force_reload=force_reload)
    if not local_data:
        _set_state(False, "inactive")
        return False, "inactive", ""

    # Cek manipulasi jam sistem macOS terlebih dahulu
    if is_clock_tampered(local_data):
        print("[BETA ACCESS] Jam sistem macOS terdeteksi mundur dari timestamp terakhir!")
        _set_state(False, "clock_tampered")
        return False, "clock_tampered", ""

    key = local_data["key"].strip().upper()
    exp_date_str = local_data["expiryDate"].strip()
    current_hwid = get_hwid()
    last_seen_ts = int(local_data.get("lastSeenTs") or int(time.time()))

    # Sync ke Firestore jika online
    if is_online():
        try:
            doc_result = get_firebase_access_doc(key)
            if doc_result.get("ok"):
                fields = doc_result.get("doc", {}).get("fields", {})

                # 1. Cek isActive
                is_active = fields.get("isActive", {}).get("booleanValue", False)
                if not is_active:
                    clear_local_access()
                    _set_state(False, "revoked")
                    print(f"[BETA ACCESS] Kode {key} telah DINONAKTIFKAN oleh server!")
                    return False, "revoked", ""

                # 2. Cek HWID Binding
                server_hwid = fields.get("hwid", {}).get("stringValue", "")
                if server_hwid == "":
                    print(f"[BETA ACCESS] Daftarkan ulang HWID untuk kode {key}...")
                    register_access_hwid_to_server(key)
                elif server_hwid != current_hwid:
                    clear_local_access()
                    _set_state(False, "hwid_mismatch")
                    print(f"[BETA ACCESS] HWID Mismatch! Kode {key} sedang digunakan di perangkat lain.")
                    return False, "hwid_mismatch", ""

                # 3. Sync Tanggal Kadaluarsa Terbaru
                new_exp = fields.get("expiryDate", {}).get("stringValue", exp_date_str).strip()
                if new_exp != exp_date_str:
                    exp_date_str = new_exp
                    now_ts = int(time.time())
                    last_seen_ts = max(last_seen_ts, now_ts)
                    save_access_to_registry(
                        key, new_exp, current_hwid,
                        local_data.get("unbindSecret", ""),
                        last_seen_ts=last_seen_ts
                    )
                    print(f"[BETA ACCESS] Tanggal akses diperbarui dari server: {exp_date_str}")
            elif doc_result.get("error") == "not_found":
                print(f"[BETA ACCESS] Kode {key} tidak ditemukan di server (404). Clear lokal.")
                clear_local_access()
                _set_state(False, "revoked")
                return False, "revoked", ""
        except Exception as e:
            print(f"[BETA ACCESS] Offline/Error sync server, fallback ke data lokal: {e}")

    # Validasi Tanggal Expiration
    expired, ok = _is_date_expired(exp_date_str)
    if not ok:
        print(f"[BETA ACCESS] Format tanggal kadaluarsa korup: {exp_date_str}")
        clear_local_access()
        _set_state(False, "expired")
        return False, "expired", ""
    if expired:
        print(f"[BETA ACCESS] Kode Akses Beta EXPIRED pada {exp_date_str}!")
        clear_local_access()
        _set_state(False, "expired")
        return False, "expired", ""

    # Majukan LAST_SEEN_TS secara monotonik
    touch_last_seen_timestamp(local_data)
    updated_ts = max(last_seen_ts, int(time.time()))
    _set_state(True, "none", exp_date_str, updated_ts)
    return True, "none", exp_date_str


def startup_access_check():
    """Pemeriksaan status Kode Akses Beta saat startup server backend."""
    valid, reason, exp_date_str = _validate_current_access_blocking(force_reload=True)
    if valid:
        print(f"[BETA ACCESS] macOS Closed Beta Access Active - Valid until {exp_date_str}")
    else:
        print(f"[BETA ACCESS] macOS Closed Beta Access LOCKED (reason={reason})")


async def _enforce_live_revocation(reason: str):
    """Broadcast beta_revoked ke semua WS client lalu tutup semua koneksi (code 4001)."""
    if not _manager_ref:
        return
    print(f"[BETA ACCESS] Menjalankan live revocation ke semua client WS (reason={reason})...")
    try:
        await _manager_ref.terminate_all_connections(
            code=4001,
            reason=reason,
            action="beta_revoked",
        )
    except Exception as e:
        print(f"[BETA ACCESS] Error saat terminate WS: {e}")


async def start_periodic_access_monitor():
    """Background monitor setiap 10 menit untuk mendeteksi expiry / revocation mid-session."""
    global _monitor_stop_event
    _monitor_stop_event = asyncio.Event()
    print(f"[BETA ACCESS] Background access monitor aktif (interval {MONITOR_INTERVAL_SEC}s)")

    while not _monitor_stop_event.is_set():
        try:
            await asyncio.wait_for(_monitor_stop_event.wait(), timeout=MONITOR_INTERVAL_SEC)
            break
        except asyncio.TimeoutError:
            pass

        was_valid = ACCESS_VALID
        if not was_valid:
            continue

        try:
            valid, reason, _ = await asyncio.to_thread(_validate_current_access_blocking, False)
            if was_valid and not valid:
                await _enforce_live_revocation(reason)
        except Exception as e:
            print(f"[BETA ACCESS] Monitor error: {e}")


def stop_periodic_access_monitor():
    """Hentikan background monitor saat shutdown."""
    if _monitor_stop_event is not None:
        _monitor_stop_event.set()


class AccessPayload(BaseModel):
    access_key: str = Field(..., min_length=5, max_length=5, description="Kode Akses Beta 5 Karakter (XXXXX)")


@router.get("/status")
async def get_access_status():
    """Returns status Beta Access Code secara ringkas (tanpa mengekspos kode mentah)."""
    if is_access_valid():
        return {
            "status": "active",
            "expiryDate": ACCESS_EXPIRY_DATE,
            "reason": "none",
        }
    return {
        "status": "inactive",
        "reason": ACCESS_REASON or "inactive",
    }


@router.post("/activate")
async def activate_access_code(payload: AccessPayload, request: Request):
    """Aktivasi Kode Akses Beta 5 Karakter (XXXXX) — wajib online & binding HWID."""
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip):
        return {
            "status": "error",
            "code": "rate_limited",
            "message": "Terlalu banyak percobaan aktivasi. Coba lagi dalam 5 menit."
        }

    online = await asyncio.to_thread(is_online)
    if not online:
        return {
            "status": "error",
            "code": "offline",
            "message": "Wajib koneksi internet untuk aktivasi Kode Akses Beta!"
        }

    key = payload.access_key.strip().upper()
    if not _KEY_PATTERN.match(key):
        return {
            "status": "error",
            "code": "invalid_format",
            "message": "Kode Akses Beta harus tepat 5 karakter huruf/angka (contoh: MAC01)."
        }

    current_hwid = await asyncio.to_thread(get_hwid)
    doc_result = await asyncio.to_thread(get_firebase_access_doc, key)

    if not doc_result.get("ok"):
        if doc_result.get("error") == "not_found":
            return {
                "status": "error",
                "code": "not_found",
                "message": "Kode Akses Beta tidak ditemukan. Pastikan 5 karakter kode dimasukkan dengan benar."
            }
        return {
            "status": "error",
            "code": "network",
            "message": "Gagal menghubungi server verifikasi. Periksa koneksi internet lalu coba lagi."
        }

    doc_data = doc_result.get("doc", {})
    fields = doc_data.get("fields", {})
    is_active = fields.get("isActive", {}).get("booleanValue", False)

    if not is_active:
        return {
            "status": "error",
            "code": "revoked",
            "message": "Kode Akses Beta ini sudah dinonaktifkan oleh tim ShowLyrics."
        }

    saved_hwid = fields.get("hwid", {}).get("stringValue", "")
    expiry_date = fields.get("expiryDate", {}).get("stringValue", "").strip()

    if not expiry_date:
        return {
            "status": "error",
            "code": "invalid_expiry",
            "message": "Data masa berlaku kode akses tidak valid. Hubungi tim ShowLyrics."
        }

    # Cek apakah kadaluarsa
    expired, parse_ok = _is_date_expired(expiry_date)
    if not parse_ok:
        return {
            "status": "error",
            "code": "invalid_expiry",
            "message": "Format masa berlaku kode akses tidak valid. Hubungi tim ShowLyrics."
        }
    if expired:
        return {
            "status": "error",
            "code": "expired",
            "message": f"Kode Akses Beta sudah kadaluarsa pada {expiry_date}."
        }

    if saved_hwid == "" or saved_hwid == current_hwid:
        device_secret = current_hwid

        if saved_hwid == "":
            success_reg = await asyncio.to_thread(register_access_hwid_to_server, key, device_secret)
            if not success_reg:
                return {
                    "status": "error",
                    "code": "bind_failed",
                    "message": "Gagal mendaftarkan perangkat ke server. Kode mungkin sudah dipakai di perangkat lain."
                }

        now_ts = int(time.time())
        saved = await asyncio.to_thread(
            save_access_to_registry, key, expiry_date, current_hwid, device_secret, now_ts
        )
        if not saved:
            return {
                "status": "error",
                "code": "storage_failed",
                "message": "Gagal menyimpan data akses lokal. Periksa izin folder ~/Library/Application Support/ShowLyrics."
            }

        _set_state(True, "none", expiry_date, now_ts)
        print(f"[BETA ACCESS] Aktivasi sukses | Exp: {expiry_date} | HWID: {current_hwid[:8]}...")
        return {
            "status": "success",
            "expiryDate": expiry_date,
            "message": "Akses Beta macOS Berhasil Diaktivasi!"
        }

    return {
        "status": "error",
        "code": "hwid_mismatch",
        "message": "Kode Akses Beta ini sudah terpakai di perangkat macOS lain!"
    }
