# routes_settings.py
# ============================================================
# API untuk pengaturan aplikasi, kamera, file dialog,
# diagnostics, dan mask stream proxy.
# Dipisah dari main.py untuk keterbacaan yang lebih baik.
# ============================================================

import os
import socket
import asyncio
import platform
import urllib.parse
from collections import deque
from typing import Any, Dict

import psutil
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, Response, HTMLResponse
import tkinter as tk
from tkinter import filedialog

from config import (
    load_json, save_json, get_resource_path,
    APP_SETTINGS_FILE, CAMERA_SETTINGS_FILE,
    SONGS_FILE, SERVICE_FILE, SCHEDULES_FILE, OSC_FILE,
    DISPLAY_PRESETS_FILE, LT_PRESETS_FILE, FB_PRESETS_FILE,
)

router = APIRouter()

# ------------------------------------------------------------------
# INJECTED DEPENDENCIES (diisi dari main.py)
# ------------------------------------------------------------------
_manager = None
_system_logs: deque = None


def init_manager(m, system_logs: deque):
    """Dipanggil dari main.py setelah manager dan system_logs dibuat."""
    global _manager, _system_logs
    _manager = m
    _system_logs = system_logs


# ------------------------------------------------------------------
# APP SETTINGS
# ------------------------------------------------------------------

@router.get("/api/settings")
def get_app_settings():
    return load_json(APP_SETTINGS_FILE)


@router.post("/api/settings")
async def save_app_settings(request: Request):
    payload = await request.json()
    db = load_json(APP_SETTINGS_FILE)
    for k, v in payload.items():
        if isinstance(v, dict) and k in db and isinstance(db[k], dict):
            db[k].update(v)
        else:
            db[k] = v
    save_json(APP_SETTINGS_FILE, db)
    return {"status": "success"}


# ------------------------------------------------------------------
# CAMERA SETTINGS
# ------------------------------------------------------------------

@router.get("/api/camera/settings")
def get_camera_settings():
    return load_json(CAMERA_SETTINGS_FILE)


@router.post("/api/camera/settings")
async def save_camera_settings(settings: dict):
    print(f"[CAMERA] Saving settings: {settings}")
    save_json(CAMERA_SETTINGS_FILE, settings)
    if _manager:
        _manager.camera_state = settings
        await _manager.broadcast({"type": "update_camera_state", "state": settings})
    return {"status": "success"}


# ------------------------------------------------------------------
# FILE / FOLDER DIALOG (Tkinter — berjalan di thread terpisah)
# ------------------------------------------------------------------

@router.get("/api/browse_folder_dialog")
async def browse_folder_dialog():
    def open_picker():
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)
        folder = filedialog.askdirectory(title="Pilih Folder Background Visual")
        root.destroy()
        return folder

    loop = asyncio.get_event_loop()
    folder_path = await loop.run_in_executor(None, open_picker)

    if folder_path:
        return {"status": "success", "path": folder_path.replace("\\", "/")}
    return {"status": "canceled"}


@router.get("/api/browse_file_dialog")
async def browse_file_dialog():
    def open_picker():
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)
        files = filedialog.askopenfilenames(
            title="Pilih File Video",
            filetypes=[("Video Files", "*.mp4 *.webm *.mov")],
        )
        root.destroy()
        return list(files)

    loop = asyncio.get_event_loop()
    files = await loop.run_in_executor(None, open_picker)
    if files:
        return {"status": "success", "files": files}
    return {"status": "canceled"}


@router.get("/api/browse_file_dialog/{category}")
async def browse_file_dialog_cat(category: str):
    def open_picker():
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)

        ext_map = {
            "video": [("Video", "*.mp4 *.webm *.mov")],
            "audio": [("Audio", "*.mp3 *.wav *.m4a *.aac *.ogg")],
            "photo": [("Photo", "*.jpg *.jpeg *.png *.webp")],
            "presentation": [("Presentation", "*.pdf *.pptx")],
        }
        filetypes = ext_map.get(category, [("All Files", "*.*")])

        files = filedialog.askopenfilenames(
            title=f"Pilih File {category.upper()}", filetypes=filetypes
        )
        root.destroy()
        return list(files)

    loop = asyncio.get_event_loop()
    files = await loop.run_in_executor(None, open_picker)
    if files:
        return {"status": "success", "files": files}
    return {"status": "canceled"}


# ------------------------------------------------------------------
# DIAGNOSTICS
# ------------------------------------------------------------------

@router.get("/api/diagnostics")
async def api_diagnostics():
    db_status = {}
    files_to_check = {
        "Songs DB": SONGS_FILE,
        "Running Order": SERVICE_FILE,
        "Schedules": SCHEDULES_FILE,
        "OSC Config": OSC_FILE,
        "Display Presets": DISPLAY_PRESETS_FILE,
        "LT Presets": LT_PRESETS_FILE,
        "FB Presets": FB_PRESETS_FILE,
    }

    ram = psutil.virtual_memory()
    system_info = {
        "os": f"{platform.system()} {platform.release()}",
        "cpu": platform.processor() or "Unknown CPU",
        "cpu_usage": f"{psutil.cpu_percent()}%",
        "ram_usage": f"{ram.percent}%",
        "ram_total": f"{round(ram.total / (1024**3), 1)} GB",
    }

    import json as _json
    for name, path in files_to_check.items():
        if not os.path.exists(path):
            db_status[name] = "MISSING"
        else:
            try:
                with open(path, "r") as f:
                    _json.load(f)
                db_status[name] = "OK"
            except Exception:
                db_status[name] = "CORRUPT"

    clients = len(_manager.active_connections) if _manager else 0

    return {
        "logs": list(_system_logs) if _system_logs else [],
        "databases": db_status,
        "system": system_info,
        "clients": clients,
    }


# ------------------------------------------------------------------
# MASK STREAM PROXY (Local file serve untuk mask image kamera)
# ------------------------------------------------------------------

@router.get("/api/mask_stream")
async def get_mask_stream(path: str):
    try:
        clean_path = urllib.parse.unquote(path).strip('"').strip("'")

        # Bersihkan prefix file:///
        clean_path = clean_path.replace("file:///", "").replace("file://", "")
        if clean_path.startswith("/") and len(clean_path) > 2 and clean_path[2] == ":":
            clean_path = clean_path[1:]

        clean_path = os.path.normpath(clean_path)

        if not os.path.isabs(clean_path):
            clean_path = os.path.abspath(clean_path)

        if os.path.exists(clean_path) and os.path.isfile(clean_path):
            ext = os.path.splitext(clean_path)[1].lower()
            mimetypes = {
                ".png": "image/png",
                ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg",
                ".webp": "image/webp",
            }
            media_type = mimetypes.get(ext, "image/png")
            return FileResponse(clean_path, media_type=media_type)

        print(f"[MASK ERROR] File not found: {clean_path}")
        return Response(status_code=404)
    except Exception as e:
        print(f"[MASK ERROR] Exception: {str(e)}")
        return Response(status_code=500)


# ------------------------------------------------------------------
# LOCAL IP ADDRESS
# ------------------------------------------------------------------

@router.get("/api/local_ip")
async def get_local_ip():
    """Return the local network IP address (non-loopback) of this machine."""
    try:
        # Connect to a public address to determine the LAN-facing interface
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
    except Exception:
        ip = "127.0.0.1"
    return {"ip": ip}


# ------------------------------------------------------------------
# OUTPUT RESOLUTION SETTINGS
# ------------------------------------------------------------------

_OUTPUT_RESOLUTION_KEY = "output_resolutions"

@router.get("/api/output_resolution")
async def get_output_resolution():
    """Return saved custom resolutions for main/lt/fb outputs."""
    data = load_json(APP_SETTINGS_FILE)
    defaults = {
        "main": {"mode": "default", "width": 1920, "height": 1080},
        "lt":   {"mode": "default", "width": 1920, "height": 1080},
        "fb":   {"mode": "default", "width": 1920, "height": 1080},
    }
    saved = data.get(_OUTPUT_RESOLUTION_KEY, {})
    # Merge with defaults so missing keys are always present
    for key in defaults:
        if key not in saved:
            saved[key] = defaults[key]
    return saved


@router.post("/api/output_resolution")
async def save_output_resolution(payload: Dict[str, Any]):
    """Save custom resolution settings for main/lt/fb outputs."""
    data = load_json(APP_SETTINGS_FILE)
    existing = data.get(_OUTPUT_RESOLUTION_KEY, {})
    existing.update(payload)
    data[_OUTPUT_RESOLUTION_KEY] = existing
    save_json(APP_SETTINGS_FILE, data)
    return {"status": "success"}
