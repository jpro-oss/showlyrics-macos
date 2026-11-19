"""
access_core.py — ShowLyrics macOS Beta Access Core (Decoupled Module)

Sistem penyimpan data Kode Akses Beta (5 karakter) terpisah secara modular.
Data disimpan terenkripsi di: ~/Library/Application Support/ShowLyrics/.beta_access.dat
Key Namespace: 'beta_access'
"""

import os
import hashlib
import base64
import requests
from datetime import datetime
from cryptography.fernet import Fernet
from license_core import get_hwid
from storage_backend import get_store

# Firebase Config Khusus Access System (showlyrics-data)
FIREBASE_ACCESS_CONFIG = {
    "apiKey": "AIzaSyB-T3t-07tpaPt9RNGJGL_cEQ99QhwVv5o",
    "projectId": "showlyrics-data",
    "databaseURL": "https://firestore.googleapis.com/v1"
}

_access_store = get_store('beta_access')

# Salt unik khusus dekripsi Access Key
_ACCESS_SALT = (
    b'\x1b\x9e\x4a\x7f\x5d\x3a\x2c\x8f'
    b'\x7b\x04\x6e\xc2\xe5\xd9\x30\xf1'
    b'\x72\x3c\xb8\xa1\xde\x56\xfc\x09'
    b'\x2e\x8d\x47\xb0\x19\x65\xc3\xaa'
)


def _derive_access_cipher() -> Fernet:
    """Turunkan cipher Fernet dari HWID mesin + _ACCESS_SALT via PBKDF2."""
    machine_id = get_hwid().encode('utf-8', errors='replace')
    key_bytes = hashlib.pbkdf2_hmac(
        'sha256', machine_id, _ACCESS_SALT,
        iterations=100_000, dklen=32
    )
    return Fernet(base64.urlsafe_b64encode(key_bytes))


def get_firebase_access_doc(doc_id: str):
    """GET /access/{doc_id} dari Firestore REST API."""
    try:
        url = (
            f"{FIREBASE_ACCESS_CONFIG['databaseURL']}/projects/{FIREBASE_ACCESS_CONFIG['projectId']}"
            f"/databases/(default)/documents/access/{doc_id}"
        )
        response = requests.get(url, params={"key": FIREBASE_ACCESS_CONFIG["apiKey"]}, timeout=5)
        if response.status_code == 200:
            return {"ok": True, "status": 200, "doc": response.json(), "error": None}
        if response.status_code == 404:
            return {"ok": False, "status": 404, "doc": None, "error": "not_found"}
        return {"ok": False, "status": response.status_code, "doc": None, "error": "http_error"}
    except Exception as e:
        return {"ok": False, "status": None, "doc": None, "error": "network"}


def update_firebase_access_field(doc_id: str, field_updates: dict):
    """PATCH /access/{doc_id} pada Firestore REST API."""
    try:
        url = (
            f"{FIREBASE_ACCESS_CONFIG['databaseURL']}/projects/{FIREBASE_ACCESS_CONFIG['projectId']}"
            f"/databases/(default)/documents/access/{doc_id}"
        )
        params = [("key", FIREBASE_ACCESS_CONFIG["apiKey"])] + [
            ("updateMask.fieldPaths", p) for p in field_updates.keys()
        ]
        response = requests.patch(url, json={"fields": field_updates}, params=params, timeout=5)
        return response.status_code == 200
    except Exception:
        return False


def save_access_to_registry(access_key: str, expiry_date: str, hwid=None, device_secret=None) -> bool:
    """
    Simpan data kode akses terenkripsi ke storage macOS (.beta_access.dat).
    Format: ACCESS_KEY|EXPIRY_DATE|HWID|DEVICE_SECRET|TIMESTAMP
    """
    current_hwid = hwid if hwid is not None else get_hwid()
    device_secret = current_hwid
    timestamp = str(int(datetime.now().timestamp()))
    raw_data = "|".join([access_key, expiry_date, current_hwid, device_secret, timestamp])
    try:
        cipher = _derive_access_cipher()
        encrypted_data = cipher.encrypt(raw_data.encode()).decode()
        _access_store.write('AccessData', encrypted_data)
        return True
    except Exception as e:
        print(f"[BETA ACCESS] Save error: {e}")
        return False


def get_local_access_data() -> dict | None:
    """
    Baca dan dekripsi data Kode Akses Beta dari storage lokal.
    Memverifikasi HWID dan keutuhan data.
    """
    try:
        encrypted_data = _access_store.read('AccessData')
        if not encrypted_data:
            return None

        cipher = _derive_access_cipher()
        decrypted = cipher.decrypt(encrypted_data.encode()).decode()
        parts = decrypted.split('|')

        if len(parts) < 4:
            return None

        access_key, expiry_date, saved_hwid, device_secret = parts[:4]

        # Validasi HWID
        current_hwid = get_hwid()
        if saved_hwid != current_hwid:
            print("[BETA ACCESS] HWID lokal tidak cocok dengan storage.")
            return None

        return {
            "key": access_key,
            "expiryDate": expiry_date,
            "hwid": saved_hwid,
            "unbindSecret": device_secret
        }
    except Exception:
        return None


def check_local_access() -> bool:
    """Cek apakah terdapat data Kode Akses Beta lokal yang valid."""
    return bool(get_local_access_data())


def clear_local_access():
    """Hapus data Kode Akses Beta lokal dari storage."""
    try:
        _access_store.delete_namespace()
    except Exception:
        pass


def register_access_hwid_to_server(access_key: str, device_secret=None):
    """Register HWID mesin ke dokumen /access/{access_key} di server."""
    try:
        current_hwid = get_hwid()
        device_secret = current_hwid
        payload = {
            "hwid": {"stringValue": current_hwid},
            "unbindSecret": {"stringValue": device_secret}
        }
        success = update_firebase_access_field(access_key, payload)
        if success:
            print(f"[BETA ACCESS] HWID registered to server: {current_hwid}")
            return device_secret
        return None
    except Exception as e:
        print(f"[BETA ACCESS] Register error: {e}")
        return None


def release_access_hwid_from_server(access_key: str, device_secret: str):
    """Release HWID dari dokumen /access/{access_key} di server."""
    try:
        payload = {
            "hwid": {"nullValue": None},
            "unbindSecret": {"stringValue": device_secret}
        }
        return update_firebase_access_field(access_key, payload)
    except Exception as e:
        print(f"[BETA ACCESS] Release error: {e}")
        return False
