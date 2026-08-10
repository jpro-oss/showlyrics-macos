"""
access_check.py — ShowLyrics macOS Beta Access Router (Decoupled Module)

Router FastAPI & Logika Verifikasi Kode Akses Beta (5 karakter).
"""

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
    update_firebase_access_field,
    register_access_hwid_to_server,
    release_access_hwid_from_server
)
from license_core import get_hwid
from config import is_online

# --- GLOBALS ---
ACCESS_VALID = False
ACCESS_CHECK_DONE = False
_access_attempts = defaultdict(list)

MAX_ACCESS_ATTEMPTS = 5
ACCESS_WINDOW_SEC = 300  # 5 menit

router = APIRouter(prefix="/api/access", tags=["access"])


def _check_rate_limit(identifier: str) -> bool:
    """Rate limit percobaan aktivasi kode akses per IP."""
    now = time.time()
    attempts = _access_attempts[identifier]
    _access_attempts[identifier] = [t for t in attempts if now - t < ACCESS_WINDOW_SEC]
    if len(_access_attempts[identifier]) >= MAX_ACCESS_ATTEMPTS:
        return False
    _access_attempts[identifier].append(now)
    return True


def startup_access_check():
    """
    Pemeriksaan status Kode Akses Beta saat startup server backend.
    Memverifikasi data lokal terenkripsi dan sync ke Firestore /access/{key}.
    """
    global ACCESS_VALID, ACCESS_CHECK_DONE

    local_data = get_local_access_data()
    if not local_data:
        ACCESS_VALID = False
        ACCESS_CHECK_DONE = True
        print("[BETA ACCESS] Tidak ada Kode Akses Beta lokal yang tersimpan.")
        return

    key = local_data["key"].strip().upper()
    exp_date_str = local_data["expiryDate"]
    current_hwid = get_hwid()

    # Sync ke server jika online
    if is_online():
        try:
            doc_result = get_firebase_access_doc(key)
            if doc_result.get("ok"):
                fields = doc_result.get("doc", {}).get("fields", {})

                # Cek Penonaktifan Status Kode
                is_active = fields.get("isActive", {}).get("booleanValue", False)
                if not is_active:
                    clear_local_access()
                    ACCESS_VALID = False
                    ACCESS_CHECK_DONE = True
                    print(f"[BETA ACCESS] Kode {key} telah DINONAKTIFKAN oleh server!")
                    return

                # Cek HWID Binding
                server_hwid = fields.get("hwid", {}).get("stringValue", "")
                if server_hwid == "":
                    print(f"[BETA ACCESS] Daftarkan HWID untuk kode {key}...")
                    register_access_hwid_to_server(key)
                elif server_hwid != current_hwid:
                    clear_local_access()
                    ACCESS_VALID = False
                    ACCESS_CHECK_DONE = True
                    print(f"[BETA ACCESS] HWID Mismatch! Kode {key} sedang digunakan di perangkat lain.")
                    return

                # Sync Tanggal Kadaluarsa Terbaru
                new_exp = fields.get("expiryDate", {}).get("stringValue", exp_date_str).strip()
                if new_exp != exp_date_str:
                    exp_date_str = new_exp
                    save_access_to_registry(key, new_exp, current_hwid, local_data.get("unbindSecret", ""))
                    print(f"[BETA ACCESS] Tanggal akses diperbarui: {exp_date_str}")
            elif doc_result.get("error") == "not_found":
                print(f"[BETA ACCESS] Kode {key} tidak ditemukan di server (404). Clear lokal.")
                clear_local_access()
                ACCESS_VALID = False
                ACCESS_CHECK_DONE = True
                return
        except Exception as e:
            print(f"[BETA ACCESS] Offline/Error sync server, fallback ke data lokal: {e}")

    # Validasi Tanggal Expiration
    try:
        exp_date = datetime.strptime(exp_date_str, "%Y-%m-%d").date()
        if datetime.now().date() > exp_date:
            clear_local_access()
            ACCESS_VALID = False
            ACCESS_CHECK_DONE = True
            print(f"[BETA ACCESS] Kode Akses Beta EXPIRED pada {exp_date_str}!")
            return
    except Exception as e:
        print(f"[BETA ACCESS] Format tanggal kadaluarsa korup: {e}")
        clear_local_access()
        ACCESS_VALID = False
        ACCESS_CHECK_DONE = True
        return

    ACCESS_VALID = True
    ACCESS_CHECK_DONE = True
    print(f"[BETA ACCESS] macOS Closed Beta Access Active - Valid until {exp_date_str} | Code: {key}")


class AccessPayload(BaseModel):
    access_key: str = Field(..., min_length=5, max_length=5, description="Kode Akses Beta 5 Karakter (XXXXX)")


@router.get("/status")
async def get_access_status():
    """Returns status data for Beta Access Code."""
    if ACCESS_VALID or get_local_access_data():
        data = await asyncio.to_thread(get_local_access_data)
        if data:
            return {
                "status": "active",
                "key": data["key"],
                "expiryDate": data["expiryDate"]
            }
    return {"status": "inactive"}


@router.post("/activate")
async def activate_access_code(payload: AccessPayload, request: Request):
    """Aktivasi Kode Akses Beta 5 Karakter (XXXXX)."""
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip):
        return {
            "status": "error",
            "message": "Terlalu banyak percobaan aktivasi. Coba lagi dalam 5 menit."
        }

    online = await asyncio.to_thread(is_online)
    if not online:
        return {
            "status": "error",
            "message": "Wajib koneksi internet untuk aktivasi Kode Akses Beta!"
        }

    key = payload.access_key.strip().upper()
    if len(key) != 5:
        return {
            "status": "error",
            "message": "Kode Akses Beta harus tepat 5 karakter (contoh: MAC01)."
        }

    current_hwid = await asyncio.to_thread(get_hwid)
    doc_result = await asyncio.to_thread(get_firebase_access_doc, key)

    if not doc_result.get("ok"):
        if doc_result.get("error") == "not_found":
            return {
                "status": "error",
                "message": "Kode Akses Beta tidak ditemukan. Pastikan 5 karakter kode dimasukkan dengan benar."
            }
        return {
            "status": "error",
            "message": "Gagal menghubungi server lisensi. Periksa koneksi internet lalu coba lagi."
        }

    doc_data = doc_result.get("doc", {})
    fields = doc_data.get("fields", {})
    is_active = fields.get("isActive", {}).get("booleanValue", False)

    if not is_active:
        return {
            "status": "error",
            "message": "Kode Akses Beta ini sudah dinonaktifkan."
        }

    saved_hwid = fields.get("hwid", {}).get("stringValue", "")
    expiry_date = fields.get("expiryDate", {}).get("stringValue", "2026-12-31").strip()

    # Cek apakah kadaluarsa
    try:
        exp_date_obj = datetime.strptime(expiry_date, "%Y-%m-%d").date()
        if datetime.now().date() > exp_date_obj:
            return {
                "status": "error",
                "message": f"Kode Akses Beta sudah kadaluarsa pada {expiry_date}."
            }
    except Exception:
        pass

    if saved_hwid == "" or saved_hwid == current_hwid:
        device_secret = current_hwid

        if saved_hwid == "":
            success_reg = await asyncio.to_thread(register_access_hwid_to_server, key, device_secret)
            if not success_reg:
                return {
                    "status": "error",
                    "message": "Gagal mendaftarkan perangkat ke server. Kode mungkin sudah dipakai di perangkat lain."
                }

        await asyncio.to_thread(save_access_to_registry, key, expiry_date, current_hwid, device_secret)
        global ACCESS_VALID, ACCESS_CHECK_DONE
        ACCESS_VALID = True
        ACCESS_CHECK_DONE = True

        print(f"[BETA ACCESS] Aktivasi sukses untuk kode {key} | HWID: {current_hwid[:8]}...")
        return {
            "status": "success",
            "message": "Akses Beta macOS Berhasil Diaktivasi!"
        }
    else:
        return {
            "status": "error",
            "message": "Kode Akses Beta ini sudah terpakai di perangkat macOS lain!"
        }


@router.post("/deactivate")
async def deactivate_access_code():
    """Deaktivasi / Release Kode Akses Beta dari perangkat ini."""
    online = await asyncio.to_thread(is_online)
    if not online:
        return {"status": "error", "message": "Wajib koneksi internet untuk Release Kode Akses Beta!"}

    data = await asyncio.to_thread(get_local_access_data)
    if not data:
        return {"status": "error", "message": "Tidak ditemukan Kode Akses Beta lokal yang valid."}

    secret = data.get("unbindSecret", "")
    success = await asyncio.to_thread(release_access_hwid_from_server, data["key"], secret)
    if not success:
        return {"status": "error", "message": "Gagal release Kode Akses di server."}

    await asyncio.to_thread(clear_local_access)
    global ACCESS_VALID, ACCESS_CHECK_DONE
    ACCESS_VALID = False
    ACCESS_CHECK_DONE = True

    print(f"[BETA ACCESS] Release sukses untuk kode: {data['key']}")
    return {"status": "success", "message": "Kode Akses Beta berhasil di-release."}
