import asyncio
import time
from datetime import datetime
from collections import defaultdict
from fastapi import APIRouter, Request
from pydantic import BaseModel
from license_core import (
    get_local_license_data,
    clear_local_license,
    has_used_trial,
    mark_trial_used,
    save_to_registry,
    get_hwid,
    get_firebase_doc,
    register_hwid_to_server,
    release_hwid_from_server,
    update_firebase_field
)
from config import is_online

# --- GLOBALS ---
LICENSE_VALID = False
LICENSE_CHECK_DONE = False
_activation_attempts = defaultdict(list)

# ConnectionManager instance placeholder, will be injected from main.py
manager = None

MAX_ACTIVATION_ATTEMPTS = 5
ACTIVATION_WINDOW_SEC = 300  # 5 minutes

router = APIRouter()

def _check_rate_limit(identifier: str) -> bool:
    now = time.time()
    attempts = _activation_attempts[identifier]
    _activation_attempts[identifier] = [t for t in attempts if now - t < ACTIVATION_WINDOW_SEC]
    if len(_activation_attempts[identifier]) >= MAX_ACTIVATION_ATTEMPTS:
        return False
    _activation_attempts[identifier].append(now)
    return True

def startup_license_check():
    global LICENSE_VALID
    
    local_data = get_local_license_data()
    if not local_data:
        LICENSE_VALID = False
        print("[SHIELD] Tidak ada lisensi lokal yang valid")
        return
        
    key = local_data["key"]
    exp_date_str = local_data["expiryDate"]
    current_hwid = get_hwid()
    
    online = is_online()
    if online:
        try:
            doc_result = get_firebase_doc("licenses", key)
            if doc_result.get("ok"):
                doc_data = doc_result.get("doc", {})
                fields = doc_data.get("fields", {})

                # Cek Ban/Blokir
                is_active = fields.get("isActive", {}).get("booleanValue", False)
                if not is_active:
                    clear_local_license()
                    LICENSE_VALID = False
                    print(f"[SHIELD] License {key} DIBLOKIR Server!")
                    return

                # Cek HWID Binding
                server_hwid = fields.get("hwid", {}).get("stringValue", "")

                if server_hwid == "":
                    print("[HWID] HWID belum terdaftar, mendaftar sekarang...")
                    new_secret = register_hwid_to_server(key)
                    if new_secret:
                        print("[HWID] HWID berhasil terdaftar")
                        save_to_registry(key, exp_date_str, current_hwid, new_secret)
                    else:
                        print("[HWID] Gagal mendaftar HWID (fallback ke data lokal)")

                elif server_hwid != current_hwid:
                    clear_local_license()
                    LICENSE_VALID = False
                    print(f"[SHIELD] HWID tidak cocok! Lisensi ini sedang digunakan di PC lain.")
                    return

                # Update ke tanggal terbaru dari Firebase
                new_exp = fields.get("expiryDate", {}).get("stringValue", exp_date_str)
                new_exp = str(new_exp).strip()
                if new_exp != exp_date_str:
                    exp_date_str = new_exp
                    save_to_registry(key, new_exp, current_hwid, local_data.get("unbindSecret", ""))
                    print(f"[SHIELD] Tanggal lisensi diperbarui dari server: {exp_date_str}")
            elif doc_result.get("error") == "not_found":
                print("[SHIELD] License tidak ditemukan di server (404)")
                clear_local_license()
                LICENSE_VALID = False
                return
            else:
                print(f"[SHIELD] Firebase tidak bisa diverifikasi ({doc_result.get('error')}), fallback ke data lokal")
        except Exception as e:
            print(f"[SHIELD] Gagal sync Firebase REST API, fallback ke data lokal: {e}")
    else:
        print("[SHIELD] Offline saat startup, menggunakan lisensi lokal.")

    # 2. EKSEKUSI TANGGAL EXPIRATION
    try:
        exp_date = datetime.strptime(exp_date_str, "%Y-%m-%d").date()
        hari_ini = datetime.now().date()
        
        if hari_ini > exp_date:
            clear_local_license()
            LICENSE_VALID = False
            print(f"[SHIELD] License EXPIRED pada {exp_date_str}!")
            return
            
    except Exception as e:
        print(f"[SHIELD] Format tanggal salah/korup: {exp_date_str} | Error: {e}")
        clear_local_license()
        LICENSE_VALID = False
        return

    LICENSE_VALID = True
    print(f"[SHIELD] System Active - Valid until {exp_date_str} | HWID: {current_hwid[:8]}...")

async def async_license_check():
    global LICENSE_VALID, LICENSE_CHECK_DONE
    try:
        print("[SYSTEM] Pre-warming HWID cache...")
        await asyncio.to_thread(get_hwid)
        print("[SYSTEM] Running license validation...")
        await asyncio.to_thread(startup_license_check)

        print(f"[SYSTEM] License Check Result: {'ACTIVE' if LICENSE_VALID else 'INACTIVE'}")

        if manager:
            await manager.broadcast({
                "action": "license_status",
                "valid":  LICENSE_VALID
            })

    except Exception as e:
        print(f"[SYSTEM] Background License Check Error: {e}")
        LICENSE_VALID = False
        if manager:
            await manager.broadcast({
                "action": "license_status",
                "valid":  False
            })
    finally:
        LICENSE_CHECK_DONE = True
        print(f"[SYSTEM] License check done. Status: {'ACTIVE' if LICENSE_VALID else 'INACTIVE'}")


class LicensePayload(BaseModel):
    license_key: str

@router.get("/status")
async def get_license_status():
    if not LICENSE_CHECK_DONE:
        return {"status": "checking", "message": "License validation in progress..."}

    if LICENSE_VALID:
        try:
            data = await asyncio.to_thread(get_local_license_data)
            if data:
                return {"status": "active", "key": data["key"], "expiryDate": data["expiryDate"]}
        except Exception as e:
            print(f"[LICENSE STATUS] Error reading local data: {e}")

    return {"status": "inactive"}

@router.post("/deactivate")
async def deactivate_license():
    online = await asyncio.to_thread(is_online)
    if not online:
        return {"status": "error", "message": "Wajib koneksi internet untuk Release License!"}
        
    data = await asyncio.to_thread(get_local_license_data)
    if not data:
        return {"status": "error", "message": "Tidak ditemukan lisensi lokal yang valid."}

    secret = data.get("unbindSecret", "")
    if not secret:
        return {"status": "error", "message": "Device secret tidak ditemukan. Logout tidak bisa dilakukan secara aman."}

    success = await asyncio.to_thread(release_hwid_from_server, data["key"], secret)
    if not success:
        return {"status": "error", "message": "Gagal release license di server. Periksa koneksi atau hubungi admin."}

    await asyncio.to_thread(clear_local_license)
    global LICENSE_VALID, LICENSE_CHECK_DONE
    LICENSE_VALID = False
    LICENSE_CHECK_DONE = True

    if manager:
        await manager.broadcast({
            "action": "license_status",
            "valid":  False
        })
        await manager.broadcast({
            "action": "force_watermark"
        })
    print(f"[LICENSE] Sign-out berhasil untuk key: {data['key']}")
    return {"status": "success", "message": "Lisensi berhasil di-release. Silakan aktivasi ulang."}

@router.post("/activate")
async def activate_license_patched(payload: LicensePayload, request: Request):
    client_ip = request.client.host if request.client else "unknown"
    if not _check_rate_limit(client_ip):
        return {
            "status":  "error",
            "message": "Terlalu banyak percobaan aktivasi. Coba lagi dalam 5 menit."
        }
    online = await asyncio.to_thread(is_online)
    if not online:
        return {"status": "error", "message": "Wajib koneksi internet untuk aktivasi!"}
    
    key = payload.license_key
    current_hwid = await asyncio.to_thread(get_hwid)
    
    doc_result = await asyncio.to_thread(get_firebase_doc, "licenses", key)
    if not doc_result.get("ok"):
        if doc_result.get("error") == "not_found":
            return {"status": "error", "message": "License Key tidak ditemukan di server."}
        return {"status": "error", "message": "Gagal menghubungi server lisensi. Periksa koneksi internet lalu coba lagi."}

    doc_data = doc_result.get("doc", {})
    fields = doc_data.get("fields", {})
    is_active = fields.get("isActive", {}).get("booleanValue", False)
    
    if not is_active:
        return {"status": "error", "message": "Lisensi sudah dinonaktifkan atau tidak aktif."}
    
    is_trial = fields.get("trial", {}).get("booleanValue", False)
    if is_trial:
        if has_used_trial():
            return {"status": "error", "message": "Komputer ini sudah pernah menggunakan lisensi Trial!"}
    
    saved_hwid = fields.get("hwid", {}).get("stringValue", "")
    expiry_date = fields.get("expiryDate", {}).get("stringValue", "2030-12-31")
    
    if saved_hwid == "" or saved_hwid == current_hwid:
        if is_trial:
            mark_trial_used()

        device_secret = current_hwid
        
        if saved_hwid == "":
            success_register = await asyncio.to_thread(register_hwid_to_server, key, device_secret)
            if not success_register:
                return {"status": "error", "message": "Gagal mendaftarkan HWID ke server. Lisensi mungkin sudah dipakai di perangkat lain."}

        success = True
        if saved_hwid == "":
            success = True
        else:
            success = await asyncio.to_thread(update_firebase_field, "licenses", key, {
                "hwid": {"stringValue": current_hwid},
                "unbindSecret": {"stringValue": device_secret}
            })

        if success:
            await asyncio.to_thread(save_to_registry, key, expiry_date, current_hwid, device_secret)
            global LICENSE_VALID, LICENSE_CHECK_DONE
            LICENSE_VALID = True
            if manager:
                await manager.broadcast({ "action": "license_status", "valid":  True})
            LICENSE_CHECK_DONE = True
            print(f"[LICENSE] Aktivasi berhasil untuk {key} | HWID: {current_hwid[:8]}...")
            return {"status": "success", "message": "Aktivasi berhasil!"}
        else:
            return {"status": "error", "message": "Gagal mengenkripsi HWID di server (akses ditolak atau offline)"}
    else:
        return {"status": "error", "message": "Lisensi sudah terpakai di komputer lain! Hubungi admin untuk reset."}
