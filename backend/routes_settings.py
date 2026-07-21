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
import subprocess
from collections import deque
from typing import Any, Dict

import psutil
from fastapi import APIRouter, Request
from fastapi.responses import FileResponse, Response, HTMLResponse

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
_dialog_lock: asyncio.Lock = None  # Serialisasi osascript — hanya 1 dialog aktif sekaligus


def init_manager(m, system_logs: deque):
    """Dipanggil dari main.py setelah manager dan system_logs dibuat."""
    global _manager, _system_logs, _dialog_lock
    _manager = m
    _system_logs = system_logs
    _dialog_lock = asyncio.Lock()  # Dibuat di dalam event loop yang sudah berjalan


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
# FILE / FOLDER DIALOG (macOS Native — osascript/AppleScript)
# Menggunakan sistem dialog macOS via osascript — TIDAK menggunakan Tkinter.
# Keunggulan: tidak mengganggu keyboard focus Electron, tidak membutuhkan
# Tk/TCL framework, dialog tampil native sesuai macOS design language.
# ------------------------------------------------------------------

def _run_osascript(script: str, timeout: int = 60):
    """
    Jalankan AppleScript dan return stdout string.
    Return None jika user cancel atau terjadi error.
    """
    try:
        result = subprocess.run(
            ['osascript', '-e', script],
            capture_output=True, text=True, timeout=timeout
        )
        if result.returncode == 0:
            output = result.stdout.strip()
            return output if output else None
        # returncode 1 = user cancel (normal, bukan error)
        return None
    except subprocess.TimeoutExpired:
        return None
    except Exception as e:
        print(f"[DIALOG] osascript error: {e}")
        return None


@router.get("/api/browse_folder_dialog")
async def browse_folder_dialog():
    """
    Buka native macOS folder picker dialog via osascript.
    Return path folder yang dipilih user, atau status 'canceled'.
    """
    script = 'POSIX path of (choose folder with prompt "Pilih Folder Background Visual")'

    lock = _dialog_lock or asyncio.Lock()
    async with lock:
        loop = asyncio.get_event_loop()
        folder_path = await loop.run_in_executor(None, _run_osascript, script)

    if folder_path:
        # Hilangkan trailing slash dari osascript output
        folder_path = folder_path.rstrip('/')
        return {"status": "success", "path": folder_path}
    return {"status": "canceled"}


@router.get("/api/browse_file_dialog")
async def browse_file_dialog():
    """
    Buka native macOS file picker untuk video files.
    Return list file yang dipilih, atau status 'canceled'.
    """
    script = """
        set fList to choose file ¬with prompt "Pilih File Video" ¬with multiple selections allowed ¬of type {"mp4", "webm", "mov", "m4v", "mkv"}
        set output to ""
        repeat with f in fList
            set output to output & POSIX path of f & linefeed
        end repeat
        return output
    """
    lock = _dialog_lock or asyncio.Lock()
    async with lock:
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(None, _run_osascript, script)

    if raw:
        files = [f.strip() for f in raw.strip().split('\n') if f.strip()]
        if files:
            return {"status": "success", "files": files}
    return {"status": "canceled"}


@router.get("/api/browse_file_dialog/{category}")
async def browse_file_dialog_cat(category: str):
    """
    Buka native macOS file picker sesuai kategori media.
    Category: video | audio | photo | presentation
    """
    ext_map = {
        "video":        ("Pilih File Video",        ["mp4", "webm", "mov", "m4v", "mkv"]),
        "audio":        ("Pilih File Audio",        ["mp3", "wav", "m4a", "aac", "ogg", "flac"]),
        "photo":        ("Pilih File Foto",         ["jpg", "jpeg", "png", "webp", "heic"]),
        "presentation": ("Pilih File Presentasi",  ["pdf", "pptx"]),
    }
    prompt, exts = ext_map.get(category, ("Pilih File", []))

    if exts:
        # Buat list AppleScript: {"mp4", "webm", ...}
        ext_as = '{' + ', '.join(f'"{e}"' for e in exts) + '}'
        script = f"""
            set fList to choose file ¬with prompt "{prompt}" ¬with multiple selections allowed ¬of type {ext_as}
            set output to ""
            repeat with f in fList
                set output to output & POSIX path of f & linefeed
            end repeat
            return output
        """
    else:
        script = f"""
            set fList to choose file with prompt "{prompt}" with multiple selections allowed
            set output to ""
            repeat with f in fList
                set output to output & POSIX path of f & linefeed
            end repeat
            return output
        """

    lock = _dialog_lock or asyncio.Lock()
    async with lock:
        loop = asyncio.get_event_loop()
        raw = await loop.run_in_executor(None, _run_osascript, script)

    if raw:
        files = [f.strip() for f in raw.strip().split('\n') if f.strip()]
        if files:
            return {"status": "success", "files": files}
    return {"status": "canceled"}


# ------------------------------------------------------------------
# DIAGNOSTICS
# ------------------------------------------------------------------

# Cache diagnostics selama 5 detik — hindari poll berat berulang
import time as _time
_diag_cache: dict = {"data": None, "ts": 0.0}
_DIAG_TTL = 5.0


@router.get("/api/diagnostics")
async def api_diagnostics():
    now = _time.time()
    if _diag_cache["data"] is not None and (now - _diag_cache["ts"]) < _DIAG_TTL:
        return _diag_cache["data"]
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

    for name, path in files_to_check.items():
        if not os.path.exists(path):
            db_status[name] = "MISSING"
        else:
            try:
                # Gunakan load_json yang sudah di-cache — tidak buka file manual
                data = load_json(path)
                db_status[name] = "OK" if isinstance(data, dict) else "CORRUPT"
            except Exception:
                db_status[name] = "CORRUPT"

    clients = len(_manager.active_connections) if _manager else 0

    result = {
        "logs": list(_system_logs) if _system_logs else [],
        "databases": db_status,
        "system": system_info,
        "clients": clients,
    }
    _diag_cache["data"] = result
    _diag_cache["ts"] = _time.time()
    return result


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


# ------------------------------------------------------------------
# BACKUP & RESTORE DATA
# ------------------------------------------------------------------

import io
import json
import zipfile
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse

def merge_json_values(existing, incoming):
    if isinstance(existing, list) and isinstance(incoming, list):
        # Check if either list has dict items with a 'title' key
        has_title = False
        if existing:
            has_title = any(isinstance(x, dict) and 'title' in x for x in existing)
        if not has_title and incoming:
            has_title = any(isinstance(x, dict) and 'title' in x for x in incoming)
            
        if has_title:
            merged_items = []
            seen_titles = set()
            
            incoming_by_title = {}
            for item in incoming:
                if isinstance(item, dict) and 'title' in item:
                    incoming_by_title[item['title']] = item
            
            for item in existing:
                if isinstance(item, dict) and 'title' in item:
                    t = item['title']
                    if t in incoming_by_title:
                        merged_items.append(incoming_by_title[t])
                    else:
                        merged_items.append(item)
                    seen_titles.add(t)
                else:
                    merged_items.append(item)
                    
            for item in incoming:
                if isinstance(item, dict) and 'title' in item:
                    t = item['title']
                    if t not in seen_titles:
                        merged_items.append(item)
                else:
                    if item not in merged_items:
                        merged_items.append(item)
                        
            return merged_items
        else:
            merged = list(existing)
            for item in incoming:
                if item not in merged:
                    merged.append(item)
            return merged
    elif isinstance(existing, dict) and isinstance(incoming, dict):
        merged = dict(existing)
        for k, v in incoming.items():
            if k in merged:
                merged[k] = merge_json_values(merged[k], v)
            else:
                merged[k] = v
        return merged
    else:
        return incoming

# JSON database files related to local media references that should be excluded from export/import
EXCLUDED_JSONS = {"audios.json", "photos.json", "presentations.json", "backgrounds.json"}


@router.get("/api/backup/export")
async def export_showlyrics_backup():
    try:
        app_folder = os.path.dirname(SONGS_FILE)
        memory_file = io.BytesIO()
        
        with zipfile.ZipFile(memory_file, "w", zipfile.ZIP_DEFLATED) as zf:
            for root, dirs, files in os.walk(app_folder):
                for file in files:
                    if file.endswith(".json") and file not in EXCLUDED_JSONS:
                        full_path = os.path.join(root, file)
                        rel_path = os.path.relpath(full_path, app_folder)
                        rel_path = rel_path.replace("\\", "/")
                        zf.write(full_path, rel_path)
                        
        memory_file.seek(0)
        return StreamingResponse(
            memory_file,
            media_type="application/octet-stream",
            headers={
                "Content-Disposition": 'attachment; filename="showlyrics_backup.showlyrics"'
            }
        )
    except Exception as e:
        print(f"[BACKUP EXPORT ERROR] {str(e)}")
        return {"status": "error", "message": f"Export failed: {str(e)}"}


@router.post("/api/backup/import")
async def import_showlyrics_backup(mode: str = "append", file: UploadFile = File(...)):
    if not file.filename.endswith(".showlyrics") and not file.filename.endswith(".zip"):
        return {"status": "error", "message": "Invalid file format. Must be a .showlyrics file."}
        
    try:
        content = await file.read()
        app_folder = os.path.dirname(SONGS_FILE)
        zip_data = io.BytesIO(content)
        
        with zipfile.ZipFile(zip_data) as zf:
            # Filter zip file names to ignore any that are in the excluded list
            json_files_in_zip = [
                name for name in zf.namelist() 
                if name.endswith(".json") and os.path.basename(name) not in EXCLUDED_JSONS
            ]
            if not json_files_in_zip:
                return {"status": "error", "message": "Backup file contains no exportable database files."}
                
            if mode == "replace":
                # Clear existing non-excluded json files
                for root, dirs, files in os.walk(app_folder):
                    for f in files:
                        if f.endswith(".json") and f not in EXCLUDED_JSONS:
                            try:
                                os.remove(os.path.join(root, f))
                            except Exception:
                                pass
                
                # Extract backup files
                for name in zf.namelist():
                    if name.endswith(".json"):
                        filename = os.path.basename(name)
                        if filename in EXCLUDED_JSONS:
                            continue
                        dest_path = os.path.join(app_folder, name)
                        dest_dir = os.path.dirname(dest_path)
                        os.makedirs(dest_dir, exist_ok=True)
                        with open(dest_path, "wb") as f:
                            f.write(zf.read(name))
            else:
                # Merge (append) files
                for name in zf.namelist():
                    if name.endswith(".json"):
                        filename = os.path.basename(name)
                        if filename in EXCLUDED_JSONS:
                            continue
                        dest_path = os.path.join(app_folder, name)
                        dest_dir = os.path.dirname(dest_path)
                        os.makedirs(dest_dir, exist_ok=True)
                        
                        incoming_data = json.loads(zf.read(name).decode("utf-8"))
                        
                        if os.path.exists(dest_path):
                            try:
                                with open(dest_path, "r", encoding="utf-8") as f:
                                    existing_data = json.load(f)
                            except Exception:
                                existing_data = {}
                            
                            merged_data = merge_json_values(existing_data, incoming_data)
                        else:
                            merged_data = incoming_data
                            
                        with open(dest_path, "w", encoding="utf-8") as f:
                            json.dump(merged_data, f, ensure_ascii=False, indent=2)
                            
        # Clear in-memory config cache
        import config
        with config._cache_lock:
            config._json_cache.clear()
            config._json_cache_mtime.clear()
            
        return {"status": "success", "message": "Data successfully imported!"}
    except Exception as e:
        print(f"[BACKUP IMPORT ERROR] {str(e)}")
        return {"status": "error", "message": f"Import failed: {str(e)}"}

