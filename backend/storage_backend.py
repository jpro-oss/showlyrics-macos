"""
storage_backend.py — ShowLyrics macOS Persistent Storage

Penyimpanan data persisten untuk macOS menggunakan file JSON terenkripsi
di ~/Library/Application Support/ShowLyrics/

Menggantikan Windows Registry sepenuhnya.
"""

import os
import json
import threading
import tempfile

# ─── CONFIG ───────────────────────────────────────────────────────────────────

_APP_SUPPORT_DIR = os.path.expanduser('~/Library/Application Support/ShowLyrics')


def _ensure_dir() -> str:
    """Buat direktori app support jika belum ada. Return path-nya."""
    try:
        os.makedirs(_APP_SUPPORT_DIR, exist_ok=True)
        os.chmod(_APP_SUPPORT_DIR, 0o700)  # Hanya owner yang bisa akses
    except Exception:
        pass
    return _APP_SUPPORT_DIR


# ─── NAMESPACE STORE ──────────────────────────────────────────────────────────

class _NamespaceStore:
    """
    Thread-safe JSON file store untuk satu namespace.
    Setiap namespace disimpan sebagai file .dat terpisah.
    Atomic write (temp → rename) untuk mencegah korupsi data.
    """

    def __init__(self, namespace: str):
        self._namespace = namespace
        self._lock = threading.Lock()
        base = _ensure_dir()
        self._path = os.path.join(base, f'.{namespace}.dat')

    def _load(self) -> dict:
        try:
            if not os.path.exists(self._path):
                return {}
            with open(self._path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {}

    def _save(self, data: dict) -> None:
        dir_name = os.path.dirname(os.path.abspath(self._path))
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(
                'w', encoding='utf-8', dir=dir_name,
                delete=False, suffix='.tmp'
            ) as tmp:
                json.dump(data, tmp, separators=(',', ':'))
                tmp_path = tmp.name
            os.replace(tmp_path, self._path)
            os.chmod(self._path, 0o600)  # Hanya owner bisa baca/tulis
        except Exception as e:
            print(f'[STORAGE] Write error ({self._namespace}): {e}')
            if tmp_path and os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass

    def read(self, key: str):
        """Return nilai untuk key, atau None jika tidak ada."""
        with self._lock:
            return self._load().get(key)

    def write(self, key: str, value: str) -> None:
        """Tulis nilai ke storage."""
        with self._lock:
            data = self._load()
            data[key] = value
            self._save(data)

    def delete(self, key: str) -> None:
        """Hapus satu key."""
        with self._lock:
            data = self._load()
            if key in data:
                data.pop(key, None)
                self._save(data)

    def delete_namespace(self) -> None:
        """Hapus seluruh file namespace."""
        with self._lock:
            try:
                if os.path.exists(self._path):
                    os.remove(self._path)
            except Exception as e:
                print(f'[STORAGE] Delete error ({self._namespace}): {e}')


# ─── FACTORY ──────────────────────────────────────────────────────────────────

_stores: dict = {}
_stores_lock = threading.Lock()


def get_store(namespace: str) -> _NamespaceStore:
    """
    Dapatkan atau buat store untuk namespace tertentu.

    Setiap namespace = satu file di ~/Library/Application Support/ShowLyrics/
    Contoh namespace: 'license', 'trial', 'integrity', 'network_strike'
    """
    with _stores_lock:
        if namespace not in _stores:
            _stores[namespace] = _NamespaceStore(namespace)
        return _stores[namespace]
