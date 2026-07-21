"""
license_core.py — ShowLyrics License Core (macOS)

HWID detection menggunakan ioreg (IOPlatformUUID).
Data lisensi disimpan terenkripsi di ~/Library/Application Support/ShowLyrics/
menggunakan storage_backend (menggantikan Windows Registry sepenuhnya).
"""

import subprocess
import sys
import os
import re
import uuid
import hashlib
import base64
import platform
from cryptography.fernet import Fernet
import requests
from datetime import datetime

# ==================== FIREBASE CONFIG ====================
FIREBASE_CONFIG = {
    "apiKey": "AIzaSyA_uiHIIz26cGnJfhiClskZfLjVEk0vNQ0",
    "projectId": "showlyrics-app",
    "databaseURL": "https://firestore.googleapis.com/v1"
}

# ==================== STORAGE BACKEND ====================
from storage_backend import get_store

_license_store = get_store('license')
_trial_store   = get_store('trial')

# ==================== KEY DERIVATION ====================
# Fernet key diturunkan dari HWID mesin + app salt via PBKDF2-HMAC-SHA256.
# Unik per mesin — data tidak bisa didekripsi di mesin lain.
# App salt WAJIB konstan setelah deploy.

_APP_SALT = (
    b'\x4a\x7f\x2c\x9e\x1b\x5d\x3a\x8f'
    b'\x6e\x04\x7b\xc2\xd9\xe5\xf1\x30'
    b'\xb8\x3c\x72\xa1\x56\xde\x09\xfc'
    b'\x47\x8d\x2e\xb0\x65\x19\xaa\xc3'
)

_cached_hwid      = None
_cipher_instance  = None


def _derive_cipher() -> Fernet:
    machine_id = get_hwid().encode('utf-8', errors='replace')
    key_bytes  = hashlib.pbkdf2_hmac(
        'sha256', machine_id, _APP_SALT,
        iterations=100_000, dklen=32
    )
    return Fernet(base64.urlsafe_b64encode(key_bytes))


def _get_cipher() -> Fernet:
    global _cipher_instance
    if _cipher_instance is None:
        _cipher_instance = _derive_cipher()
    return _cipher_instance


# ==================== FIREBASE REST HELPERS ====================

def get_firebase_doc(collection_path, doc_id):
    """Baca dokumen Firestore. Bedakan not_found vs error jaringan."""
    try:
        url = (
            f"{FIREBASE_CONFIG['databaseURL']}/projects/{FIREBASE_CONFIG['projectId']}"
            f"/databases/(default)/documents/{collection_path}/{doc_id}"
        )
        response = requests.get(url, params={"key": FIREBASE_CONFIG["apiKey"]}, timeout=5)
        if response.status_code == 200:
            return {"ok": True,  "status": 200,                      "doc": response.json(), "error": None}
        if response.status_code == 404:
            return {"ok": False, "status": 404,                      "doc": None, "error": "not_found"}
        print(f"[REST API] Error fetching doc: {response.status_code}")
        return     {"ok": False, "status": response.status_code,     "doc": None, "error": "http_error"}
    except Exception as e:
        print(f"[REST API] Connection error: {e}")
        return     {"ok": False, "status": None,                     "doc": None, "error": "network"}


def update_firebase_field(collection_path, doc_id, field_updates):
    """Update field spesifik di Firestore via REST API (PATCH)."""
    try:
        url = (
            f"{FIREBASE_CONFIG['databaseURL']}/projects/{FIREBASE_CONFIG['projectId']}"
            f"/databases/(default)/documents/{collection_path}/{doc_id}"
        )
        params = [("key", FIREBASE_CONFIG["apiKey"])] + [
            ("updateMask.fieldPaths", p) for p in field_updates.keys()
        ]
        response = requests.patch(url, json={"fields": field_updates}, params=params, timeout=5)
        if response.status_code == 200:
            return True
        print(f"[REST API] Error updating doc: {response.status_code} - {response.text}")
        return False
    except Exception as e:
        print(f"[REST API] Update error: {e}")
        return False


# Placeholder untuk compatibility
db = None

# ==================== HWID (macOS) ====================

def _get_hwid_macos() -> str | None:
    """
    Ambil Hardware UUID via ioreg pada macOS.
    IOPlatformUUID adalah pengenal unik per mesin, sama stabilnya dengan
    Windows WMIC UUID — tidak berubah antar reboot atau update OS.
    """
    try:
        result = subprocess.run(
            ['ioreg', '-rd1', '-c', 'IOPlatformExpertDevice'],
            capture_output=True, text=True, timeout=6
        )
        match = re.search(r'"IOPlatformUUID"\s*=\s*"([^"]+)"', result.stdout)
        if match:
            return match.group(1)
        print("[HWID] IOPlatformUUID tidak ditemukan di output ioreg.")
    except subprocess.TimeoutExpired:
        print("[HWID] Timeout via ioreg.")
    except Exception as e:
        print(f"[HWID] ioreg error: {e}")
    return None


def save_hwid_cache(hwid: str) -> None:
    """Simpan HWID ke cache storage."""
    try:
        _license_store.write('HWIDCache', hwid)
    except Exception as e:
        print(f"[HWID] Error saving cache: {e}")


def load_hwid_cache() -> str | None:
    """Baca HWID dari cache storage."""
    try:
        return _license_store.read('HWIDCache')
    except Exception:
        return None


def get_hwid() -> str:
    """
    Dapatkan Hardware UUID mesin secara cross-attempt:
      1. IOPlatformUUID via ioreg (primary — paling stabil)
      2. Cache dari storage (fallback jika ioreg gagal)
      3. Hash MAC address + hostname (last resort)
    """
    global _cached_hwid
    if _cached_hwid:
        return _cached_hwid

    # Primary: ioreg IOPlatformUUID
    hwid = _get_hwid_macos()
    if hwid:
        _cached_hwid = hwid
        save_hwid_cache(hwid)
        return hwid

    # Fallback 1: Cache dari storage
    cached = load_hwid_cache()
    if cached:
        print(f"[HWID] Menggunakan HWID dari cache: {cached[:8]}...")
        _cached_hwid = cached
        return cached

    # Fallback 2: Hash dari MAC address + hostname
    try:
        mac = hex(uuid.getnode())[2:].upper()
        raw = f"{platform.node()}:{mac}:{platform.machine()}"
        fallback = hashlib.sha256(raw.encode()).hexdigest()[:32].upper()
        print(f"[HWID] Fallback HWID dari system info: {fallback[:8]}...")
        _cached_hwid = fallback
        save_hwid_cache(fallback)
        return fallback
    except Exception:
        pass

    # Last resort
    last_resort = hashlib.sha256(platform.node().encode()).hexdigest()[:32].upper()
    _cached_hwid = last_resort
    return last_resort


# ==================== HWID BINDING ====================

def register_hwid_to_server(license_key, device_secret=None):
    try:
        current_hwid  = get_hwid()
        device_secret = current_hwid  # unbindSecret = HWID
        payload = {
            "hwid":         {"stringValue": current_hwid},
            "unbindSecret": {"stringValue": device_secret}
        }
        success = update_firebase_field("licenses", license_key, payload)
        if success:
            print(f"[HWID] Terdaftar: {current_hwid}")
            return device_secret
        print("[HWID] Gagal register HWID")
        return None
    except Exception as e:
        print(f"[HWID] Error: {e}")
        return None


def release_hwid_from_server(license_key, device_secret):
    try:
        payload = {
            "hwid":         {"nullValue": None},
            "unbindSecret": {"stringValue": device_secret}
        }
        return update_firebase_field("licenses", license_key, payload)
    except Exception as e:
        print(f"[HWID] Release error: {e}")
        return False


# ==================== LICENSE STORAGE ====================

def save_to_registry(license_key, expiry_date, hwid=None, device_secret=None):
    """
    Simpan data lisensi terenkripsi ke storage macOS.
    Format: LICENSE_KEY|EXPIRY_DATE|HWID|DEVICE_SECRET|TIMESTAMP_EPOCH

    Disimpan di: ~/Library/Application Support/ShowLyrics/.license.dat
    Key: 'TaskData'
    """
    current_hwid  = hwid if hwid is not None else get_hwid()
    device_secret = current_hwid  # unbindSecret = HWID

    timestamp = str(int(datetime.now().timestamp()))
    raw_data  = "|".join([license_key, expiry_date, current_hwid,
                          device_secret, timestamp])
    try:
        encrypted_data = _get_cipher().encrypt(raw_data.encode()).decode()
        _license_store.write('TaskData', encrypted_data)
        return True
    except Exception as e:
        print(f"[LICENSE] Save error: {e}")
        return False


def check_local_license():
    return bool(get_local_license_data())


def get_local_license_data():
    """
    Baca dan validasi data lisensi dari storage.
    Verifikasi: dekripsi OK + HWID cocok + format valid.
    """
    try:
        encrypted_data = _license_store.read('TaskData')
        if not encrypted_data:
            return None

        decrypted = _get_cipher().decrypt(encrypted_data.encode()).decode()
        parts     = decrypted.split('|')

        # Support format lama (3-4 field) dan baru (5 field dengan timestamp)
        if len(parts) == 3:
            license_key, expiry_date, saved_hwid = parts
            device_secret = ""
            saved_ts      = None
        elif len(parts) == 4:
            license_key, expiry_date, saved_hwid, device_secret = parts
            saved_ts = None
        elif len(parts) == 5:
            license_key, expiry_date, saved_hwid, device_secret, saved_ts = parts
        else:
            print("[LICENSE] Format data storage tidak dikenal")
            return None

        # Validasi HWID
        current_hwid = get_hwid()
        if saved_hwid != current_hwid:
            print("[LICENSE] HWID tidak cocok dengan data storage")
            return None

        # Validasi timestamp — tolak jika lebih dari 366 hari
        if saved_ts:
            try:
                ts_age = datetime.now().timestamp() - float(saved_ts)
                if ts_age > 366 * 24 * 3600:
                    print("[LICENSE] Storage terlalu lama, perlu re-aktivasi")
                    return None
            except ValueError:
                pass

        return {
            "key":          license_key,
            "expiryDate":   expiry_date,
            "hwid":         saved_hwid,
            "unbindSecret": device_secret
        }
    except Exception:
        return None


def clear_local_license():
    """Hapus data lisensi dari storage."""
    try:
        _license_store.delete_namespace()
    except Exception:
        pass
    # Reset cipher cache
    global _cipher_instance
    _cipher_instance = None


# ==================== TRIAL MANAGEMENT ====================

def has_used_trial() -> bool:
    """Cek apakah trial sudah pernah digunakan di mesin ini."""
    try:
        value = _trial_store.read('ConfigData')
        if value is None:
            return False
        return value == hashlib.sha256(get_hwid().encode()).hexdigest()
    except Exception:
        return False


def mark_trial_used() -> bool:
    """Tandai trial sudah digunakan untuk mesin ini."""
    try:
        hwid_hash = hashlib.sha256(get_hwid().encode()).hexdigest()
        _trial_store.write('ConfigData', hwid_hash)
        return True
    except Exception:
        return False
