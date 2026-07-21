import os
import sys
import json
import socket
import secrets
import threading
import tempfile
import time

# --- FIX PATH & DEV CONFIG ---
DEV = True  # Set to True for development browser testing, False for secure production Electron lock

env_dev = os.environ.get("SHOWLYRICS_DEV")
if env_dev is not None:
    DEV = env_dev.upper() in ("TRUE", "1", "YES")

WS_SESSION_NONCE = secrets.token_hex(32)

# Cache hasil is_online() selama 30 detik — hindari TCP dial berulang per call
_online_cache = {"value": None, "ts": 0.0}
_ONLINE_TTL = 30.0

def is_online() -> bool:
    now = time.time()
    if _online_cache["value"] is not None and (now - _online_cache["ts"]) < _ONLINE_TTL:
        return _online_cache["value"]
    try:
        import urllib.request
        # Gunakan HTTP request port 443 yang aman dari blokir ISP/firewall
        urllib.request.urlopen("https://www.google.com", timeout=1.5)
        result = True
    except Exception:
        try:
            # Fallback ke CDN host kita jika google diblokir
            import urllib.request
            urllib.request.urlopen("https://showlyrics.github.io", timeout=1.5)
            result = True
        except Exception:
            result = False
    _online_cache["value"] = result
    _online_cache["ts"] = now
    return result


def get_resource_path(relative_path):
    """
    Dapatkan path ke resource (templates/, static/, dll.) yang benar
    di semua environment: dev, PyInstaller onedir, dan InnoSetup install.

    Kompatibel dengan ShowLyrics.spec yang menggunakan contents_directory='internal':
      - sys._MEIPASS mengarah ke <appdir>/internal/
      - static/ dan templates/ ada di <appdir>/ (root, bukan di internal/)
      - Kita naik satu level ke parent _MEIPASS jika perlu
    """
    try:
        meipass = sys._MEIPASS
        # Cek apakah resource ada di _MEIPASS langsung (default PyInstaller behavior)
        direct = os.path.join(meipass, relative_path)
        if os.path.exists(direct):
            return direct
        # contents_directory='internal': coba di parent _MEIPASS
        parent = os.path.dirname(meipass)
        parent_path = os.path.join(parent, relative_path)
        if os.path.exists(parent_path):
            return parent_path
        # Fallback: kembalikan path di _MEIPASS (error akan muncul jika memang tidak ada)
        return direct
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)


def get_user_data_path(filename):
    user_docs = os.path.expanduser("~/Documents")
    app_folder = os.path.join(user_docs, "WorshipEngineData")
    if not os.path.exists(app_folder):
        os.makedirs(app_folder)
    return os.path.join(app_folder, filename)

# ---- In-memory JSON cache (mtime-based invalidation) ----
_json_cache: dict = {}
_json_cache_mtime: dict = {}
_cache_lock = threading.Lock()

def load_json(path: str) -> dict:
    """Load JSON dari disk. Cache di memory; hanya re-read jika mtime berubah."""
    try:
        mtime = os.path.getmtime(path)
        with _cache_lock:
            if path in _json_cache and _json_cache_mtime.get(path) == mtime:
                return _json_cache[path]
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        with _cache_lock:
            _json_cache[path] = data
            _json_cache_mtime[path] = mtime
        return data
    except Exception:
        return {}

def save_json(path: str, data) -> None:
    """Atomic write: tulis ke temp file dulu, lalu rename — cegah korupsi JSON."""
    dir_name = os.path.dirname(os.path.abspath(path))
    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(
            "w", encoding="utf-8", dir=dir_name, delete=False, suffix=".tmp"
        ) as tmp:
            json.dump(data, tmp, separators=(',', ':'))
            tmp_path = tmp.name
        os.replace(tmp_path, path)  # Atomic pada NTFS/Windows
        # Update cache langsung — hindari disk re-read
        with _cache_lock:
            _json_cache[path] = data
            try:
                _json_cache_mtime[path] = os.path.getmtime(path)
            except Exception:
                _json_cache_mtime.pop(path, None)
    except Exception as e:
        # Bersihkan temp file jika ada error
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass
        raise

# Database paths
SONGS_FILE = get_user_data_path("songs.json")
SERVICE_FILE = get_user_data_path("service.json")
SCHEDULES_FILE = get_user_data_path("schedules.json")
LT_PRESETS_FILE = get_user_data_path("lt_presets.json")
DISPLAY_PRESETS_FILE = get_user_data_path("display_presets.json")
FB_PRESETS_FILE = get_user_data_path("fb_presets.json")
ALERT_PRESETS_FILE = get_user_data_path("alert_presets.json")
RUNDOWN_PRESETS_FILE = get_user_data_path("rundown_presets.json")
OSC_FILE = get_user_data_path("osc_config.json")
BACKGROUNDS_FILE = get_user_data_path("backgrounds.json")
APP_SETTINGS_FILE = get_user_data_path("app_settings.json")
THUMBS_DIR = get_user_data_path("Thumbnails")
os.makedirs(THUMBS_DIR, exist_ok=True)
BACKGROUNDS_DIR = get_user_data_path("backgrounds")
AUDIO_DIR = get_user_data_path("audios")
PHOTO_DIR = get_user_data_path("photos")
PRESENTATION_DIR = get_user_data_path("presentations")
AUDIOS_FILE = get_user_data_path("audios.json")
PHOTOS_FILE = get_user_data_path("photos.json")
PRESENTATIONS_FILE = get_user_data_path("presentations.json")
BIBLE_DIR = get_user_data_path("bibles")
os.makedirs(BIBLE_DIR, exist_ok=True)
SCRIPTURE_PRESETS_FILE = get_user_data_path("scripture_presets.json")
CAMERA_SETTINGS_FILE = get_user_data_path("camera_settings.json")

# Ensure files exist with standard structure
if not os.path.exists(SCRIPTURE_PRESETS_FILE):
    with open(SCRIPTURE_PRESETS_FILE, "w") as f:
        json.dump({}, f)

if not os.path.exists(RUNDOWN_PRESETS_FILE):
    with open(RUNDOWN_PRESETS_FILE, "w") as f:
        json.dump({"default": "", "presets": {}}, f)

for fpath2 in [AUDIOS_FILE, PHOTOS_FILE, PRESENTATIONS_FILE]:
    if not os.path.exists(fpath2):
        with open(fpath2, "w") as f:
            json.dump({"folders": ["ALL"], "items": {}}, f)

for fpath in [SONGS_FILE, SERVICE_FILE, SCHEDULES_FILE, LT_PRESETS_FILE, DISPLAY_PRESETS_FILE, FB_PRESETS_FILE, ALERT_PRESETS_FILE, OSC_FILE, BACKGROUNDS_FILE, APP_SETTINGS_FILE]:
    if not os.path.exists(fpath):
        with open(fpath, "w") as f:
            if fpath in [SCHEDULES_FILE, LT_PRESETS_FILE, DISPLAY_PRESETS_FILE, FB_PRESETS_FILE, ALERT_PRESETS_FILE, OSC_FILE, BACKGROUNDS_FILE]:
                json.dump({}, f)
            elif fpath == APP_SETTINGS_FILE:
                json.dump({"display_mapping": {}}, f)
            else:
                json.dump([], f)

if not os.path.exists(CAMERA_SETTINGS_FILE):
    with open(CAMERA_SETTINGS_FILE, "w") as f:
        json.dump({
            "main": {
                "device_id": "", "res": "1280x720", "fit": "fill", "show": False,
                "x": 0, "y": 0, "zoom": 100, "opacity": 100,
                "saturation": 100, "hue": 0, "brightness": 100, "contrast": 100,
                "mask_image": "", "mask_x": 0, "mask_y": 0, "mask_zoom": 100, "mask_fit": "fill"
            },
            "audience": {
                "device_id": "", "res": "1280x720", "fit": "fill", "show": False,
                "x": 0, "y": 0, "zoom": 100, "opacity": 100,
                "saturation": 100, "hue": 0, "brightness": 100, "contrast": 100,
                "mask_image": "", "mask_x": 0, "mask_y": 0, "mask_zoom": 100, "mask_fit": "fill"
            }
        }, f)

for d in [BACKGROUNDS_DIR, AUDIO_DIR, PHOTO_DIR, PRESENTATION_DIR]:
    os.makedirs(d, exist_ok=True)
