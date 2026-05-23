import os
import sys
import json
import socket
import secrets

# --- FIX PATH & DEV CONFIG ---
DEV = True  # Set to True for development browser testing, False for secure production Electron lock

env_dev = os.environ.get("SHOWLYRICS_DEV")
if env_dev is not None:
    DEV = env_dev.upper() in ("TRUE", "1", "YES")

WS_SESSION_NONCE = secrets.token_hex(32)

def is_online():
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(2)
        sock.connect(("8.8.8.8", 53))
        sock.close()
        return True
    except socket.error:
        return False

def get_resource_path(relative_path):
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(base_path, relative_path)

def get_user_data_path(filename):
    user_docs = os.path.expanduser("~/Documents")
    app_folder = os.path.join(user_docs, "WorshipEngineData")
    if not os.path.exists(app_folder):
        os.makedirs(app_folder)
    return os.path.join(app_folder, filename)

def load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def save_json(path, data):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, separators=(',', ':'))

# Database paths
SONGS_FILE = get_user_data_path("songs.json")
SERVICE_FILE = get_user_data_path("service.json")
SCHEDULES_FILE = get_user_data_path("schedules.json")
LT_PRESETS_FILE = get_user_data_path("lt_presets.json")
DISPLAY_PRESETS_FILE = get_user_data_path("display_presets.json")
FB_PRESETS_FILE = get_user_data_path("fb_presets.json")
ALERT_PRESETS_FILE = get_user_data_path("alert_presets.json")
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
