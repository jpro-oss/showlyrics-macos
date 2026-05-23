import sys
import os
import webbrowser
import threading
import time
import json
import uvicorn
import uuid
import re
import shutil
import zipfile
import io
import subprocess
import platform
import socket
from collections import deque
import psutil
import asyncio
import tkinter as tk
from tkinter import filedialog
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, UploadFile, File, BackgroundTasks
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, FileResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles

# --- IMPORT SUB-MODULES ---
from config import *
import license_check
import sender
import scripture
import background_tasks as bg_tasks
import presets

# --- INIT APP ---
app = FastAPI()

# Register sub-routers under their respective API prefixes
app.include_router(license_check.router, prefix="/api/license")
app.include_router(sender.router, prefix="/api/senders")
app.include_router(scripture.presets_router, prefix="/api/scripture_presets")
app.include_router(scripture.bible_router, prefix="/api/scripture")
app.include_router(presets.router)

# ==========================================
# 🛡️ SECURITY CONFIGURATION (DEV MODE)
# ==========================================
# DEV setting is imported from config.py to ensure a single source of truth

@app.middleware("http")
async def secure_electron_pages(request: Request, call_next):
    # Only protect index, control, and diagnostic pages (including trailing slashes)
    path = request.url.path
    if path in ["/", "/control", "/diagnostic", "/control/", "/diagnostic/"]:
        if not DEV:
            expected_token = os.environ.get("SHOWLYRICS_SECRET")
            received_token = request.headers.get("X-ShowLyrics-Secret")
            
            if not expected_token or received_token != expected_token:
                # Log the blocked attempt to system logs so developer can see it in diagnostics
                client_ip = request.client.host if request.client else "127.0.0.1"
                blocked_msg = f"ERROR:    [SECURITY] Blocked unauthorized access to {path} from {client_ip}"
                system_logs.append(blocked_msg)
                print(blocked_msg)
                
                return HTMLResponse(
                    content="""
                    <html>
                        <head>
                            <title>403 Forbidden - ShowLyrics</title>
                            <style>
                                body {
                                    background-color: #09090b;
                                    color: #f4f4f5;
                                    font-family: system-ui, -apple-system, sans-serif;
                                    display: flex;
                                    flex-direction: column;
                                    justify-content: center;
                                    align-items: center;
                                    height: 100vh;
                                    margin: 0;
                                }
                                .container {
                                    text-align: center;
                                    padding: 30px;
                                    background: rgba(24, 24, 27, 0.6);
                                    border: 1px solid rgba(255, 255, 255, 0.08);
                                    border-radius: 16px;
                                    backdrop-filter: blur(12px);
                                    max-width: 400px;
                                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
                                }
                                h1 {
                                    color: #ef4444;
                                    font-size: 2rem;
                                    margin-bottom: 10px;
                                    margin-top: 0;
                                }
                                p {
                                    color: #a1a1aa;
                                    font-size: 0.95rem;
                                    line-height: 1.5;
                                    margin-bottom: 0;
                                }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>403 Forbidden</h1>
                                <p>Error, Please using Application to access this URL!</p>
                            </div>
                        </body>
                    </html>
                    """,
                    status_code=403
                )
    return await call_next(request)

# Buffer untuk nyimpen 200 baris log terakhir (biar RAM nggak bengkak)
system_logs = deque(maxlen=200)

@app.on_event("startup")
async def startup_event():
    # Pre-warm HWID cache di background sebelum request masuk.
    # Ini kunci utama agar /api/license/status tidak blocking saat pertama kali dipanggil.
    print("[SYSTEM] Starting background license validation...")
    asyncio.create_task(license_check.async_license_check())

active_clients = {}

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    client_ip = request.client.host if request.client else "127.0.0.1"
    # Format log mirip Uvicorn
    log_msg = f"INFO:     {client_ip} - \"{request.method} {request.url.path} HTTP/1.1\" {response.status_code} ({process_time:.3f}s)"
    
    # Filter biar gak nyampah (gak usah log request file css/gambar atau polling diagnostic itu sendiri)
    if not request.url.path.startswith("/static") and request.url.path != "/api/diagnostics":
        system_logs.append(log_msg)
        
    return response

# Mount Static & Templates
app.mount("/static", StaticFiles(directory=get_resource_path("static")), name="static")
templates = Jinja2Templates(directory=get_resource_path("templates"))
templates.env.globals["VERSION"] = f"130-8-5-{int(time.time())}"

# ==========================================
# 🎨 SCRIPTURE PAGE SETUP
# ==========================================

# 1. Routing untuk Layar Proyektor Alkitab
@app.get("/scripture", response_class=HTMLResponse)
async def scripture_page(request: Request):
    return templates.TemplateResponse("scripture.html", {"request": request})


class Song(BaseModel):
    title: str
    data: List[Dict[str, Any]]
    settings: Optional[Dict[str, Any]] = {}

class SavedSchedule(BaseModel):  # <--- Ganti ScheduleModel jadi SavedSchedule
    name: str
    items: List[dict]

# --- HELPER DATABASE MEDIA UNIVERSAL ---
def get_media_db_path(category):
    if category == "audio": return AUDIOS_FILE
    if category == "photo": return PHOTOS_FILE
    if category == "presentation": return PRESENTATIONS_FILE
    return BACKGROUNDS_FILE # Default video

def get_allowed_extensions(category):
    if category == "audio": return (".mp3", ".wav", ".m4a", ".aac", ".ogg")
    if category == "photo": return (".jpg", ".jpeg", ".png", ".gif", ".webp")
    if category == "presentation": return (".pdf", ".pptx")
    return (".mp4", ".webm", ".mov") # Default video

# --- CONNECTION MANAGER ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._last_bg_state_sig = ""
        self._last_media_state_sig = {
            "audio": "",
            "photo": "",
            "presentation": "",
        }
        self._last_sync_emit = {
            "video": {"ts": 0.0, "value": None},
            "audio": {"ts": 0.0, "value": None},
        }
        self.last_video_sync = {"value": 0.0, "ts": 0.0}
        
        # 1. State Default (Hardcoded fallback)
        self.current_state = { 
            "text": "", "font": "Cinzel", "color": "#ffffff", "zoom": "in", 
            "speed": "30s", "glow": 50, "fade": 0.5, "show": False,
            "theme": "default", "trans": "fade", "next_text": ""
        }
        self.lt_state = {}
        self.fb_state = {}
        self.bg_state = {"url": ""}

        self.audio_state = {"url": ""}
        self.photo_state = {"url": ""}
        self.presentation_state = {"url": ""}

        # Load app settings for layer config
        app_settings = load_json(APP_SETTINGS_FILE)
        self.layer_config_main = app_settings.get("layers_main", [
            {"id": "lyrics", "visible": True},
            {"id": "ppt", "visible": True},
            {"id": "photo", "visible": True},
            {"id": "background", "visible": True},
            {"id": "scripture", "visible": True},
            {"id": "camera", "visible": True}
        ])
        self.layer_config_lt = app_settings.get("layers_lt", [
            {"id": "lyrics", "visible": True},
            {"id": "ppt", "visible": True},
            {"id": "photo", "visible": True},
            {"id": "background", "visible": True},
            {"id": "scripture", "visible": True},
            {"id": "camera", "visible": True}
        ])

        self.bg_config = {"transition": 0.5, "fit": "cover"}
        self.scripture_state: dict = {}
        self.scripture_config: dict = {}
        # 2. LANGSUNG LOAD DARI FILE SAAT INIT (FIX BUG DISPLAY)
        self.scripture_lt_config: dict = {}
        self.camera_state = load_json(CAMERA_SETTINGS_FILE)
        
        self.load_all_defaults()
        
    def _sign(self, data: dict) -> dict:
        """
        Tambahkan session nonce ke setiap pesan keluar.
        Client (wm.js) memverifikasi nonce ini sebelum menerima perintah license.
        """
        return {**data, "_nonce": WS_SESSION_NONCE}

    def _payload_signature(self, payload: dict) -> str:
        try:
            return json.dumps(payload or {}, sort_keys=True, separators=(",", ":"), default=str)
        except Exception:
            return str(payload)

    def should_emit_background_update(self, payload: dict) -> bool:
        new_sig = self._payload_signature(payload)
        if new_sig == self._last_bg_state_sig:
            return False
        self._last_bg_state_sig = new_sig
        return True

    def should_emit_bg_control(self, payload: dict) -> bool:
        cmd = (payload or {}).get("command")
        target = (payload or {}).get("target")
        if cmd != "sync_time" or target not in ("video", "audio"):
            return True

        now = time.time()
        rec = self._last_sync_emit[target]
        try:
            value = float((payload or {}).get("value", 0))
        except Exception:
            value = 0.0

        # Drop sync_time yang terlalu rapat / terlalu kecil drift-nya.
        if (now - rec["ts"]) < 0.2:
            return False
        if rec["value"] is not None and abs(value - rec["value"]) < 0.08:
            return False

        rec["ts"] = now
        rec["value"] = value
        if target == "video":
            self.last_video_sync["value"] = value
            self.last_video_sync["ts"] = now
        return True

    def should_emit_media_update(self, media_type: str, payload: dict) -> bool:
        if media_type not in self._last_media_state_sig:
            return True
        sig = self._payload_signature(payload)
        if sig == self._last_media_state_sig[media_type]:
            return False
        self._last_media_state_sig[media_type] = sig
        return True

    def load_all_defaults(self):
        print("[INIT] Loading Presets from Disk...")
        
        # Load Main Display Default
        try:
            disp_data = load_json(DISPLAY_PRESETS_FILE)
            if "bg_global_config" in disp_data:
                self.bg_config = disp_data["bg_global_config"]

            def_name = disp_data.get("default")
            if def_name and def_name in disp_data.get("presets", {}):
                print(f" -> Display Default Loaded: {def_name}")
                # Update current_state tapi jangan timpa text/show status
                preset = disp_data["presets"][def_name]
                for k, v in preset.items():
                    self.current_state[k] = v
        except Exception as e: print(f"Error loading Display default: {e}")

        # Load Lower Third Default
        try:
            lt_data = load_json(LT_PRESETS_FILE)
            def_name = lt_data.get("default")
            if def_name and def_name in lt_data.get("presets", {}):
                print(f" -> LT Default Loaded: {def_name}")
                self.lt_state = lt_data["presets"][def_name]
        except Exception as e: print(f"Error loading LT default: {e}")

        # Load Foldback Default
        try:
            fb_data = load_json(FB_PRESETS_FILE)
            def_name = fb_data.get("default")
            if def_name and def_name in fb_data.get("presets", {}):
                print(f" -> FB Default Loaded: {def_name}")
                self.fb_state = fb_data["presets"][def_name]
        except Exception as e: print(f"Error loading FB default: {e}")

    async def connect(self, websocket):
        await websocket.accept()
        self.active_connections.append(websocket)

        # Kirim semua state dengan nonce
        await websocket.send_json(self._sign({
            "type": "update_state", "state": self.current_state
        }))

        # [PENTING] Kirim status lisensi ke client baru.
        # JANGAN kirim sebelum LICENSE_CHECK_DONE — karena LICENSE_VALID masih False
        # di awal startup, dan akan membuat client memunculkan watermark palsu (flicker).
        # Pengiriman ini dilakukan secara non-blocking via background task.
        asyncio.ensure_future(self._send_license_status_when_ready(websocket))

        await websocket.send_json(self._sign({
            "type": "update_bg_config", "payload": self.bg_config
        }))
        if self.lt_state:
            await websocket.send_json(self._sign({
                "type": "update_lt_config", "config": self.lt_state
            }))
        if self.fb_state:
            await websocket.send_json(self._sign({
                "type": "update_fb_config", "config": self.fb_state
            }))
        if self.bg_state.get("url"):
            await websocket.send_json(self._sign({
                "type": "update_background", "payload": self.bg_state
            }))
        if self.audio_state.get("url"):
            await websocket.send_json(self._sign({
                "type": "update_audio", "payload": self.audio_state
            }))
        if self.photo_state.get("url"):
            await websocket.send_json(self._sign({
                "type": "update_photo", "payload": self.photo_state
            }))
        if self.presentation_state.get("url"):
            await websocket.send_json(self._sign({
                "type": "update_presentation", "payload": self.presentation_state
            }))
        if self.last_video_sync.get("ts", 0) > 0:
            await websocket.send_json(self._sign({
                "type": "bg_control",
                "payload": {
                    "target": "video",
                    "command": "sync_time",
                    "value": self.last_video_sync.get("value", 0.0)
                }
            }))
        if self.scripture_state:
            await websocket.send_json(self._sign({
                "action": "update_scripture", "payload": self.scripture_state
            }))
        if self.scripture_config:
            await websocket.send_json(self._sign({
                "action": "update_scripture_config", "payload": self.scripture_config
            }))
        if self.scripture_lt_config:
            await websocket.send_json(self._sign({
                "action": "update_scripture_lt_config", "payload": self.scripture_lt_config
            }))
        if self.camera_state:
            await websocket.send_json(self._sign({
                "type": "update_camera_state", "state": self.camera_state
            }))
        
        # Kirim Layer Config saat konek
        await websocket.send_json(self._sign({
            "type": "update_layers", 
            "layers_main": self.layer_config_main,
            "layers_lt": self.layer_config_lt
        }))

    def disconnect(self, websocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def _send_license_status_when_ready(self, websocket: WebSocket):
        """
        Tunggu startup license check selesai, BARU kirim status ke client.
        Ini mencegah flicker watermark saat server baru restart:
          - Jika langsung kirim, LICENSE_VALID masih False → client munculkan watermark
          - Setelah check selesai (max 8 detik), kirim status yang sesungguhnya
        Max wait: 8 detik. Jika masih belum selesai, kirim status saat ini (failsafe).
        """
        max_wait = 80  # 80 × 0.1s = 8 detik
        for _ in range(max_wait):
            if license_check.LICENSE_CHECK_DONE:
                break
            await asyncio.sleep(0.1)
        try:
            # Pastikan client masih terhubung sebelum kirim
            if websocket in self.active_connections:
                await websocket.send_json(self._sign({
                    "action": "license_status",
                    "valid":  license_check.LICENSE_VALID
                }))
        except Exception:
            pass  # Client sudah disconnect sebelum status dikirim

    async def broadcast(self, data: dict):
        """Broadcast ke semua client — semua pesan otomatis dapat nonce."""
        signed = self._sign(data)
        if self.active_connections:
            sockets = list(self.active_connections)
            results = await asyncio.gather(
                *[conn.send_json(signed) for conn in self.active_connections],
                return_exceptions=True
            )
            for conn, result in zip(sockets, results):
                if isinstance(result, Exception):
                    self.disconnect(conn)

manager = ConnectionManager()
license_check.manager = manager
bg_tasks.manager = manager

# --- ROUTES HTML ---
@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/display", response_class=HTMLResponse)
async def get_display(request: Request):
    return templates.TemplateResponse("display.html", {"request": request})

@app.get("/scripture-lt", response_class=HTMLResponse)
async def scripture_lt_page(request: Request):
    return templates.TemplateResponse("scripture-lt.html", {"request": request})

@app.get("/control", response_class=HTMLResponse)
async def get_control(request: Request):
    return templates.TemplateResponse("control.html", {"request": request})


# --- NEW ROUTE: LOWER THIRD ---
@app.get("/lowerthird", response_class=HTMLResponse)
async def get_lowerthird(request: Request):
    return templates.TemplateResponse("lowerthird.html", {"request": request})

# --- NEW ROUTE: FOLDBACK (STAGE DISPLAY) ---
@app.get("/foldback", response_class=HTMLResponse)
async def get_foldback(request: Request):
    return templates.TemplateResponse("foldback.html", {"request": request})

@app.get("/background")
async def background_page(request: Request):
    return templates.TemplateResponse("background.html", {"request": request})

@app.get("/audio", response_class=HTMLResponse)
async def audio_page(request: Request):
    return templates.TemplateResponse("audio.html", {"request": request})

@app.get("/photo", response_class=HTMLResponse)
async def photo_page(request: Request):
    return templates.TemplateResponse("photo.html", {"request": request})

@app.get("/presentation", response_class=HTMLResponse)
async def presentation_page(request: Request):
    return templates.TemplateResponse("presentation.html", {"request": request})

@app.get("/main_cam", response_class=HTMLResponse)
async def main_cam_page(request: Request):
    return templates.TemplateResponse("main_cam.html", {"request": request})

@app.get("/audience_cam", response_class=HTMLResponse)
async def audience_cam_page(request: Request):
    return templates.TemplateResponse("audience_cam.html", {"request": request})

@app.get("/api/camera/settings")
def get_camera_settings():
    return load_json(CAMERA_SETTINGS_FILE)

@app.post("/api/camera/settings")
async def save_camera_settings(settings: dict):
    print(f"[CAMERA] Saving settings: {settings}") # Debug log
    save_json(CAMERA_SETTINGS_FILE, settings)
    manager.camera_state = settings
    await manager.broadcast({"type": "update_camera_state", "state": settings})
    return {"status": "success"}

# --- HELPER & API (Sama persis kayak sebelumnya - Copy Paste yg lama gpp) ---
# ... (Bagian API Songs, Service, Import TXT tetep sama, gw singkat biar hemat space) ...
# Copy paste fungsi load_json, save_json, dan semua route @app.get/post/delete API disini
# PASTIKAN SEMUA API LAMA ADA DISINI (gw assume lu copy full dari main.py sebelumnya)

@app.get("/api/songs")
def get_songs(): 
    return load_json(SONGS_FILE)

@app.post("/api/songs")
def save_song(song: Song):
    songs = load_json(SONGS_FILE)
    existing_index = next((index for (index, d) in enumerate(songs) if d["title"] == song.title), None)
    if existing_index is not None: songs[existing_index] = song.dict()
    else: songs.append(song.dict())
    save_json(SONGS_FILE, songs)
    return {"status": "success"}

@app.delete("/api/songs/{title}")
def delete_song(title: str):
    songs = load_json(SONGS_FILE)
    songs = [s for s in songs if s["title"] != title]
    save_json(SONGS_FILE, songs)
    return {"status": "success"}

@app.get("/api/browse_folder_dialog")
async def browse_folder_dialog():
    # Fungsi ini bakal jalan di background thread biar server uvicorn lu ga nge-freeze
    def open_picker():
        root = tk.Tk()
        root.withdraw() # Sembunyiin jendela utama tkinter
        root.wm_attributes('-topmost', 1) # Paksa pop-up folder muncul paling depan!
        folder = filedialog.askdirectory(title="Pilih Folder Background Visual")
        root.destroy()
        return folder
    
    loop = asyncio.get_event_loop()
    folder_path = await loop.run_in_executor(None, open_picker)
    
    if folder_path:
        return {"status": "success", "path": folder_path.replace("\\", "/")}
    return {"status": "canceled"}



@app.post("/api/backgrounds/add_folder")
async def add_bg_folder(folder_path: str, background_tasks: BackgroundTasks):
    if not os.path.exists(folder_path):
        return {"status": "error", "message": "Folder tidak ditemukan!"}

    db = load_json(BACKGROUNDS_FILE)
    
    # 🎯 FIX 1: Jembatan Migrasi. Kalau ada "videos" ubah jadi "items"
    if "items" not in db:
        db["items"] = db.pop("videos", {})
        
    if "folders" not in db: 
        db["folders"] = ["ALL"]

    folder_path = folder_path.replace("\\", "/")
    if folder_path not in db["folders"] and folder_path != "ALL":
        db["folders"].append(folder_path)

    valid_ext = (".mp4", ".webm", ".mov")
    count = 0
    created_ids = []

    for file in os.listdir(folder_path):
        if file.lower().endswith(valid_ext):
            video_full_path = os.path.join(folder_path, file).replace("\\", "/")
            
            # 🎯 FIX 2: Cek data pakai get() biar tahan banting (support video_path & file_path)
            exists = any(v.get("video_path", v.get("file_path")) == video_full_path for v in db["items"].values())
            
            if not exists:
                video_id = str(uuid.uuid4())[:8]
                thumb_filename = f"{video_id}.jpg"
                thumb_full_path = os.path.join(THUMBS_DIR, thumb_filename)
                
                db["items"][video_id] = {
                    "id": video_id,
                    "name": file,
                    "folder": folder_path,
                    "video_path": video_full_path, # Jaga kompatibilitas sistem lama
                    "file_path": video_full_path   # Jaga kompatibilitas sistem universal
                }
                # Panggil worker FFmpeg dengan parameter notifikasi WS yang kita buat sebelumnya
                background_tasks.add_task(bg_tasks.generate_thumbnail_task, video_full_path, thumb_full_path, video_id, "video")
                count += 1
                created_ids.append(video_id)

    save_json(BACKGROUNDS_FILE, db)
    return {"status": "success", "message": f"Folder ditambahkan! {count} Video diproses.", "created_ids": created_ids}
# --- 🎯 API MEDIA UNIVERSAL (ALL IN ONE) ---
@app.get("/api/media/{category}")
async def get_media_category(category: str):
    if category == "audio":
        return load_json(AUDIOS_FILE)
    elif category == "photo":
        return load_json(PHOTOS_FILE)
    elif category == "presentation":
        return load_json(PRESENTATIONS_FILE)
    else:
        # Default balik ke Video (Backgrounds lama)
        db = load_json(BACKGROUNDS_FILE)
        # Samain format nama key "videos" jadi "items" biar JS-nya ga pusing
        if "videos" in db:
            db["items"] = db.pop("videos") 
        if "folders" not in db: 
            db["folders"] = ["ALL"]
        return db

# --- 🎯 API PRESENTATION: GET SLIDE COUNT ---
@app.get("/api/media/presentation/{media_id}/slides")
async def get_presentation_slides(media_id: str):
    """Returns the total slide count for a given presentation ID."""
    slide_folder = os.path.join(PRESENTATION_DIR, media_id)
    if not os.path.exists(slide_folder):
        return {"count": 0, "slides": []}
    
    # Cari semua file slide_N.jpg / slide_N.png secara berurutan
    slides = []
    i = 1
    while True:
        png_path = os.path.join(slide_folder, f"slide_{i}.png")
        jpg_path = os.path.join(slide_folder, f"slide_{i}.jpg")
        if os.path.exists(png_path) or os.path.exists(jpg_path):
            slides.append(i)
            i += 1
        else:
            break
    
    return {"count": len(slides), "slides": slides}

# --- 🎯 API PRESENTATION: SERVE SINGLE SLIDE IMAGE ---
@app.get("/api/media/presentation/{media_id}/slide/{slide_num}")
async def get_presentation_slide(media_id: str, slide_num: int):
    """Serves a single slide image by number for a given presentation ID."""
    cache_headers = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    slide_folder = os.path.join(PRESENTATION_DIR, media_id)
    
    # Coba PNG dulu, fallback ke JPG
    png_path = os.path.join(slide_folder, f"slide_{slide_num}.png")
    jpg_path = os.path.join(slide_folder, f"slide_{slide_num}.jpg")
    
    if os.path.exists(png_path):
        return FileResponse(png_path, media_type="image/png", headers=cache_headers)
    elif os.path.exists(jpg_path):
        return FileResponse(jpg_path, media_type="image/jpeg", headers=cache_headers)
    
    return Response(status_code=404)

# --- 🎯 API THUMBNAIL UNIVERSAL ---
@app.get("/api/media/thumb/{category}/{item_id}")
async def get_media_thumb(category: str, item_id: str, background_tasks: BackgroundTasks):
    cache_headers = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    
    if category == "video":
        thumb_path = os.path.join(THUMBS_DIR, f"{item_id}.jpg")
        if os.path.exists(thumb_path):
            return FileResponse(thumb_path, media_type="image/jpeg", content_disposition_type="inline", headers=cache_headers)
            
    elif category == "photo":
        thumb_path = os.path.join(THUMBS_DIR, f"photo_{item_id}.jpg")
        if os.path.exists(thumb_path):
            return FileResponse(thumb_path, media_type="image/jpeg", content_disposition_type="inline", headers=cache_headers)
            
        # Fallback ke gambar asli jika thumbnail belum siap, tapi triger generate di bg
        db = load_json(PHOTOS_FILE)
        item = db.get("items", {}).get(item_id)
        if item and os.path.exists(item["file_path"]):
            background_tasks.add_task(bg_tasks.generate_photo_thumbnail_task, item["file_path"], thumb_path, item_id)
            # Tentukan media_type berdasarkan ekstensi
            ext = os.path.splitext(item["file_path"])[1].lower()
            mtype = "image/png" if ext == ".png" else "image/jpeg"
            return FileResponse(item["file_path"], media_type=mtype, content_disposition_type="inline", headers=cache_headers)
            
    elif category == "presentation":
        # 🎯 REQUEST LU: CUKUP AMBIL SLIDE 1 SEBAGAI THUMBNAIL
        thumb_path = os.path.join(PRESENTATION_DIR, item_id, "slide_1.png")
        if not os.path.exists(thumb_path):
            thumb_path = os.path.join(PRESENTATION_DIR, item_id, "slide_1.jpg")
        if os.path.exists(thumb_path):
            ext = os.path.splitext(thumb_path)[1].lower()
            mtype = "image/png" if ext == ".png" else "image/jpeg"
            return FileResponse(thumb_path, media_type=mtype, content_disposition_type="inline", headers=cache_headers)
            
    # Fallback ke logo kalau gambar belum beres di-generate / error
    return FileResponse(get_resource_path("static/logo.png"), media_type="image/png", content_disposition_type="inline", headers=cache_headers)

@app.get("/api/media/thumb_status/{category}/{item_id}")
async def get_media_thumb_status(category: str, item_id: str):
    ready = False
    if category == "video":
        thumb_path = os.path.join(THUMBS_DIR, f"{item_id}.jpg")
        ready = os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0
    elif category == "presentation":
        thumb_path_png = os.path.join(PRESENTATION_DIR, item_id, "slide_1.png")
        thumb_path_jpg = os.path.join(PRESENTATION_DIR, item_id, "slide_1.jpg")
        ready = os.path.exists(thumb_path_png) or os.path.exists(thumb_path_jpg)
    elif category == "photo":
        thumb_path = os.path.join(THUMBS_DIR, f"photo_{item_id}.jpg")
        ready = os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0

    return {"status": "success", "ready": ready, "id": item_id, "category": category}

@app.post("/api/media/{category}/create_folder")
async def create_media_folder(category: str, request: Request):
    payload = await request.json()
    folder_name = payload.get("folder_name", "").strip()
    
    if not folder_name: return {"status": "error", "message": "Nama folder kosong!"}
    
    db_path = get_media_db_path(category)
    db = load_json(db_path)
    
    if "folders" not in db: db["folders"] = ["ALL"]
    if "items" not in db: db["items"] = {}
    
    if folder_name not in db["folders"]:
        db["folders"].append(folder_name)
        save_json(db_path, db)
        return {"status": "success", "message": f"Folder '{folder_name}' dibuat!"}
        
    return {"status": "error", "message": "Folder sudah ada!"}

@app.get("/api/settings")
def get_app_settings():
    return load_json(APP_SETTINGS_FILE)

@app.post("/api/settings")
async def save_app_settings(request: Request):
    payload = await request.json()
    db = load_json(APP_SETTINGS_FILE)
    # Update partial (biar data lain ga hilang)
    for k, v in payload.items():
        if isinstance(v, dict) and k in db and isinstance(db[k], dict):
            # Merging jika property adalah dictionary
            db[k].update(v)
        else:
            db[k] = v
    save_json(APP_SETTINGS_FILE, db)
    return {"status": "success"}

@app.get("/api/browse_file_dialog/{category}")
async def browse_file_dialog_cat(category: str):
    def open_picker():
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes('-topmost', 1)
        
        # Atur ekstensi file yang muncul di Windows Explorer berdasarkan Tab
        ext_map = {
            "video": [("Video", "*.mp4 *.webm *.mov")],
            "audio": [("Audio", "*.mp3 *.wav *.m4a *.aac *.ogg")],
            "photo": [("Photo", "*.jpg *.jpeg *.png *.webp")],
            "presentation": [("Presentation", "*.pdf *.pptx")]
        }
        filetypes = ext_map.get(category, [("All Files", "*.*")])
        
        files = filedialog.askopenfilenames(title=f"Pilih File {category.upper()}", filetypes=filetypes)
        root.destroy()
        return list(files)
    
    loop = asyncio.get_event_loop()
    files = await loop.run_in_executor(None, open_picker)
    if files: return {"status": "success", "files": files}
    return {"status": "canceled"}

# ==========================================
# 🎯 API UNIVERSAL: RENAME, MOVE, DELETE
# ==========================================

@app.put("/api/media/{category}/rename_file/{item_id}")
async def rename_media_file(category: str, item_id: str, request: Request):
    payload = await request.json()
    new_name = payload.get("new_name", "").strip()
    db_path = get_media_db_path(category)
    db = load_json(db_path)
    if "items" in db and item_id in db["items"]:
        db["items"][item_id]["name"] = new_name
        save_json(db_path, db)
        return {"status": "success"}
    return {"status": "error"}

@app.put("/api/media/{category}/rename_folder")
async def rename_media_folder(category: str, request: Request):
    payload = await request.json()
    old_name = payload.get("old_name", "")
    new_name = payload.get("new_name", "").strip()
    db_path = get_media_db_path(category)
    db = load_json(db_path)
    
    if old_name in db.get("folders", []):
        db["folders"] = [new_name if f == old_name else f for f in db["folders"]]
        for key, item in db.get("items", {}).items():
            if item.get("folder") == old_name:
                item["folder"] = new_name
        save_json(db_path, db)
        return {"status": "success"}
    return {"status": "error"}

@app.delete("/api/media/{category}/file/{item_id}")
async def delete_media_file(category: str, item_id: str):
    db_path = get_media_db_path(category)
    db = load_json(db_path)
    
    is_deleted = False

    # 🎯 FIX: Hapus dari folder lama ("videos") jika datanya tertinggal di sana
    if category == "video" and "videos" in db and item_id in db["videos"]:
        del db["videos"][item_id]
        is_deleted = True
        
    # Hapus dari folder Universal API ("items")
    if "items" in db and item_id in db["items"]:
        del db["items"][item_id]
        is_deleted = True

    if is_deleted:
        save_json(db_path, db)
        
        # 🧹 OPTIMASI: HAPUS SAMPAH CACHE FISIK BIAR HDD GA PENUH!
        if category == "video":
            thumb_path = os.path.join(THUMBS_DIR, f"{item_id}.jpg")
            if os.path.exists(thumb_path): 
                os.remove(thumb_path)
        elif category == "presentation":
            slide_folder = os.path.join(PRESENTATION_DIR, item_id)
            if os.path.exists(slide_folder): 
                shutil.rmtree(slide_folder, ignore_errors=True)
                
        return {"status": "success"}
        
    return {"status": "error"}

# 🎯 FIX: Tambahkan ':path' pada {folder_name} agar FastAPI mau menerima format "E:/folder"
@app.delete("/api/media/{category}/folder/{folder_name:path}")
async def delete_media_folder(category: str, folder_name: str):
    db_path = get_media_db_path(category)
    db = load_json(db_path)
    
    if "folders" in db and folder_name in db["folders"]:
        db["folders"].remove(folder_name)
        
        # Hapus file yg ada di dalam folder ini juga
        items_to_delete = [k for k, v in db.get("items", {}).items() if v.get("folder") == folder_name]
        for k in items_to_delete: 
            del db["items"][k]
            
        save_json(db_path, db)
        return {"status": "success"}
        
    return {"status": "error"}

@app.put("/api/media/{category}/move_file/{item_id}")
async def move_media_file(category: str, item_id: str, request: Request):
    payload = await request.json()
    new_folder = payload.get("new_folder", "Uncategorized").strip()
    db_path = get_media_db_path(category)
    db = load_json(db_path)
    if new_folder not in db.get("folders", []) and new_folder != "ALL":
        db["folders"].append(new_folder)
    if "items" in db and item_id in db["items"]:
        db["items"][item_id]["folder"] = new_folder
        save_json(db_path, db)
        return {"status": "success"}
    return {"status": "error"}

@app.post("/api/media/{category}/add_files")
async def add_media_files(category: str, request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    files = payload.get("files", [])
    folder_name = payload.get("folder_name", "Uncategorized")
    
    db_path = get_media_db_path(category)
    db = load_json(db_path)
    
    if "folders" not in db: db["folders"] = ["ALL"]
    if "items" not in db: db["items"] = {}
        
    if folder_name not in db["folders"] and folder_name != "ALL": 
        db["folders"].append(folder_name)
        
    count = 0
    created_ids = []
    for file_path in files:
        file_path = file_path.replace("\\", "/")
        if os.path.exists(file_path):
            filename = os.path.basename(file_path)
            
            # Cek apakah file udah pernah dimasukin
            exists = any(v.get("file_path", v.get("video_path")) == file_path for v in db["items"].values())
            if not exists:
                item_id = str(uuid.uuid4())[:8]
                
                # Simpan data ke JSON universal
                db["items"][item_id] = {
                    "id": item_id, 
                    "name": filename, 
                    "folder": folder_name if folder_name != "ALL" else "Uncategorized", 
                    "file_path": file_path
                }
                
                # Khusus Video & PPTX, kita suruh worker ngekstrak thumbnail
                if category == "video":
                    thumb_full_path = os.path.join(THUMBS_DIR, f"{item_id}.jpg")
                    db["items"][item_id]["video_path"] = file_path # Jaga kompatibilitas kodingan lama
                    background_tasks.add_task(bg_tasks.generate_thumbnail_task, file_path, thumb_full_path, item_id, "video")
                elif category == "photo":
                    thumb_full_path = os.path.join(THUMBS_DIR, f"photo_{item_id}.jpg")
                    background_tasks.add_task(bg_tasks.generate_photo_thumbnail_task, file_path, thumb_full_path, item_id)
                elif category == "presentation":
                    out_folder = os.path.join(PRESENTATION_DIR, item_id)
                    if file_path.lower().endswith(".pdf"):
                        background_tasks.add_task(bg_tasks.extract_pdf_to_slides, file_path, out_folder, item_id)
                    elif file_path.lower().endswith(".pptx"):
                        background_tasks.add_task(bg_tasks.extract_pptx_to_slides, file_path, out_folder, item_id)
                count += 1
                created_ids.append(item_id)
                
    save_json(db_path, db)
    return {"status": "success", "message": f"{count} File berhasil di-link ke '{folder_name}'!", "created_ids": created_ids}

@app.post("/api/media/{category}/add_folder")
async def add_media_folder(category: str, folder_path: str, background_tasks: BackgroundTasks):
    if not os.path.exists(folder_path):
        return {"status": "error", "message": "Folder tidak ditemukan!"}

    db_path = get_media_db_path(category)
    db = load_json(db_path)
    
    if "folders" not in db: 
        db["folders"] = ["ALL"]
    if "items" not in db:
        db["items"] = {}

    folder_path = folder_path.replace("\\", "/")
    if folder_path not in db["folders"] and folder_path != "ALL":
        db["folders"].append(folder_path)

    def get_allowed_extensions(cat):
        ext_map = {
            "video": (".mp4", ".webm", ".mov"),
            "audio": (".mp3", ".wav", ".m4a", ".aac", ".ogg"),
            "photo": (".jpg", ".jpeg", ".png", ".webp"),
            "presentation": (".pdf", ".pptx")
        }
        return ext_map.get(cat, ())

    valid_ext = get_allowed_extensions(category)
    count = 0
    created_ids = []

    for file in os.listdir(folder_path):
        if file.lower().endswith(valid_ext):
            file_full_path = os.path.join(folder_path, file).replace("\\", "/")
            
            exists = any(v.get("file_path", v.get("video_path")) == file_full_path for v in db["items"].values())
            
            if not exists:
                item_id = str(uuid.uuid4())[:8]
                
                db["items"][item_id] = {
                    "id": item_id,
                    "name": file,
                    "folder": folder_path,
                    "file_path": file_full_path
                }
                
                if category == "video":
                    thumb_full_path = os.path.join(THUMBS_DIR, f"{item_id}.jpg")
                    db["items"][item_id]["video_path"] = file_full_path
                    background_tasks.add_task(bg_tasks.generate_thumbnail_task, file_full_path, thumb_full_path, item_id, "video")
                elif category == "photo":
                    thumb_full_path = os.path.join(THUMBS_DIR, f"photo_{item_id}.jpg")
                    background_tasks.add_task(bg_tasks.generate_photo_thumbnail_task, file_full_path, thumb_full_path, item_id)
                elif category == "presentation":
                    out_folder = os.path.join(PRESENTATION_DIR, item_id)
                    if file.lower().endswith(".pdf"):
                        background_tasks.add_task(bg_tasks.extract_pdf_to_slides, file_full_path, out_folder, item_id)
                    elif file.lower().endswith(".pptx"):
                        background_tasks.add_task(bg_tasks.extract_pptx_to_slides, file_full_path, out_folder, item_id)
                
                count += 1
                created_ids.append(item_id)

    save_json(db_path, db)
    return {"status": "success", "message": f"Folder ditambahkan! {count} File diproses.", "created_ids": created_ids}

# --- 🎯 API STREAM AUDIO ---
@app.get("/api/stream_audio/{item_id}")
def stream_audio(item_id: str):
    db = load_json(AUDIOS_FILE)
    item = db.get("items", {}).get(item_id)
    # FileResponse otomatis ngurusin buffering & streaming buat <audio>
    if item and os.path.exists(item["file_path"]):
        return FileResponse(item["file_path"])
    return Response(status_code=404)

# --- 🎯 API STREAM PHOTO (FULL RESOLUTION) ---
@app.get("/api/stream_photo/{item_id}")
def stream_photo(item_id: str):
    db = load_json(PHOTOS_FILE)
    item = db.get("items", {}).get(item_id)
    if item and os.path.exists(item["file_path"]):
        return FileResponse(item["file_path"])
    return Response(status_code=404)

@app.get("/api/backgrounds")
async def get_backgrounds():
    db = load_json(BACKGROUNDS_FILE)
    if "folders" not in db: 
        db = {"folders": [], "videos": {}}
    return db


@app.get("/thumbs/{video_id}")
async def get_thumbnail(video_id: str):
    thumb_path = os.path.join(THUMBS_DIR, f"{video_id}.jpg")
    cache_headers = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    if os.path.exists(thumb_path):
        return FileResponse(thumb_path, headers=cache_headers)
    # Kalo gagal (karena FFmpeg belum ada), paksa tampilin logo ShowLyrics
    return FileResponse(get_resource_path("static/logo.png"), headers=cache_headers)


@app.get("/api/stream_video/{video_id}")
async def stream_video(video_id: str, request: Request):
    db = load_json(BACKGROUNDS_FILE)
    
    # 🎯 FIX BUG: Cek dua tempat sekaligus! ('videos' untuk versi lama, 'items' untuk Universal API)
    videos_db = db.get("videos", {})
    items_db = db.get("items", {})
    
    # Ambil data video, entah dia nyelip di database lama atau baru
    video_data = videos_db.get(video_id) or items_db.get(video_id)
    
    if not video_data: 
        return {"error": "Video tidak ada di database"}
    
    # 🎯 FIX BACKWARD COMPATIBILITY: Ambil path dari 'video_path' atau 'file_path'
    video_path = video_data.get("video_path", video_data.get("file_path"))
    
    if not video_path or not os.path.exists(video_path): 
        return {"error": "File asli dihapus atau dipindahkan dari Windows"}

    # 1. Ambil ukuran asli file video
    file_size = os.path.getsize(video_path)
    
    # 2. Cek apakah browser minta potongan tertentu (Range Request)
    range_header = request.headers.get("range")

    if range_header:
        # Browser ngomong: "Bro, minta byte ke-sekian sampai ke-sekian dong"
        byte1, byte2 = 0, None
        match = re.search(r"bytes=(\d+)-(\d*)", range_header)
        if match:
            byte1 = int(match.group(1))
            if match.group(2):
                byte2 = int(match.group(2))
        
        # Kalau browser minta terus-terusan tanpa ujung, kita paksa potong per 4MB biar RAM aman
        chunk_size = 1024 * 1024 * 4 
        if byte2 is None:
            byte2 = min(byte1 + chunk_size - 1, file_size - 1)
        
        length = byte2 - byte1 + 1
        
        # 3. Buka file secara Biner (rb) dan potong videonya secara presisi
        with open(video_path, "rb") as f:
            f.seek(byte1)
            data = f.read(length)
        
        # 4. Kirim balasan status HTTP 206 (Partial Content)
        headers = {
            "Content-Range": f"bytes {byte1}-{byte2}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
            "Content-Type": "video/mp4",
        }
        return Response(content=data, status_code=206, headers=headers)
        
    return FileResponse(video_path, media_type="video/mp4")
@app.get("/api/browse_file_dialog")
async def browse_file_dialog():
    def open_picker():
        root = tk.Tk()
        root.withdraw()
        root.wm_attributes('-topmost', 1)
        # askopenfilenames bikin VJ bisa milih banyak file sekaligus (Shift/Ctrl + Click)
        files = filedialog.askopenfilenames(title="Pilih File Video", filetypes=[("Video Files", "*.mp4 *.webm *.mov")])
        root.destroy()
        return list(files)
    
    loop = asyncio.get_event_loop()
    files = await loop.run_in_executor(None, open_picker)
    if files:
        return {"status": "success", "files": files}
    return {"status": "canceled"}

@app.post("/api/backgrounds/create_folder")
async def create_bg_folder(request: Request): # <--- Kuncinya di sini
    payload = await request.json()
    folder_name = payload.get("folder_name", "").strip()
    
    if not folder_name: 
        return {"status": "error", "message": "Nama folder kosong!"}
    
    db = load_json(BACKGROUNDS_FILE)
    if "folders" not in db: 
        db = {"folders": [], "videos": {}}
    
    # Murni masukin string ke array JSON (Dummy Folder), bukan bikin folder di Windows!
    if folder_name not in db["folders"]:
        db["folders"].append(folder_name)
        save_json(BACKGROUNDS_FILE, db)
        return {"status": "success", "message": "Folder virtual berhasil dibuat!"}
        
    return {"status": "error", "message": "Folder sudah ada!"}
    
@app.post("/api/backgrounds/add_files")
async def add_bg_files(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    files = payload.get("files", [])
    folder_name = payload.get("folder_name", "Uncategorized")
    
    db = load_json(BACKGROUNDS_FILE)
    
    # 🎯 FIX 1: Jembatan Migrasi
    if "items" not in db:
        db["items"] = db.pop("videos", {})
        
    if "folders" not in db: 
        db["folders"] = ["ALL"]
        
    if folder_name not in db["folders"] and folder_name != "ALL": 
        db["folders"].append(folder_name)
        
    count = 0
    created_ids = []
    for file_path in files:
        file_path = file_path.replace("\\", "/")
        if os.path.exists(file_path):
            filename = os.path.basename(file_path)
            
            # 🎯 FIX 2: Pengecekan aman di database universal
            exists = any(v.get("video_path", v.get("file_path")) == file_path for v in db["items"].values())
            
            if not exists:
                video_id = str(uuid.uuid4())[:8]
                thumb_full_path = os.path.join(THUMBS_DIR, f"{video_id}.jpg")
                
                db["items"][video_id] = {
                    "id": video_id, 
                    "name": filename, 
                    "folder": folder_name if folder_name != "ALL" else "Uncategorized", 
                    "video_path": file_path,
                    "file_path": file_path
                }
                
                background_tasks.add_task(bg_tasks.generate_thumbnail_task, file_path, thumb_full_path, video_id, "video")
                count += 1
                created_ids.append(video_id)
                
    save_json(BACKGROUNDS_FILE, db)
    return {"status": "success", "message": f"{count} File berhasil di-link ke folder '{folder_name}'!", "created_ids": created_ids}
    
@app.delete("/api/backgrounds/folder/{folder_name:path}")
async def delete_bg_folder(folder_name: str):
    db = load_json(BACKGROUNDS_FILE)
    if "folders" in db and folder_name in db["folders"]:
        db["folders"].remove(folder_name)
        
        # Cari semua ID video yang ada di dalam folder ini
        videos_to_delete = []
        for vid_id, vid_data in db.get("videos", {}).items():
            if vid_data.get("folder") == folder_name:
                videos_to_delete.append(vid_id)
                
        # Eksekusi hapus videonya dari database
        for vid_id in videos_to_delete:
            del db["videos"][vid_id]
                
        save_json(BACKGROUNDS_FILE, db)
        return {"status": "success", "message": f"Folder dan {len(videos_to_delete)} video di dalamnya dihapus!"}
        
    return {"status": "error", "message": "Folder tidak ditemukan"}

@app.delete("/api/backgrounds/video/{video_id}")
async def delete_bg_video(video_id: str):
    db = load_json(BACKGROUNDS_FILE)
    if "videos" in db and video_id in db["videos"]:
        del db["videos"][video_id]
        save_json(BACKGROUNDS_FILE, db)
        return {"status": "success", "message": "Video dihapus dari Library"}
    return {"status": "error", "message": "Video tidak ditemukan"}

@app.put("/api/backgrounds/video/{video_id}/move")
async def move_bg_video(video_id: str, request: Request):
    payload = await request.json()
    new_folder = payload.get("new_folder", "Uncategorized").strip()
    
    db = load_json(BACKGROUNDS_FILE)
    if "folders" not in db: db["folders"] = []
    
    # Kalau usernya ngetik nama folder yang belum ada, otomatis buatin!
    if new_folder not in db["folders"] and new_folder not in ["ALL", "Uncategorized"]:
        db["folders"].append(new_folder)

    if "videos" in db and video_id in db["videos"]:
        db["videos"][video_id]["folder"] = new_folder
        save_json(BACKGROUNDS_FILE, db)
        return {"status": "success", "message": "Video dipindahkan!"}
        
    return {"status": "error", "message": "Video tidak ditemukan"}
@app.get("/api/service")
async def get_service(): 
    return load_json(SERVICE_FILE)

@app.post("/api/service")
async def save_service(items: List[dict]):
    save_json(SERVICE_FILE, items)
    return {"status": "success"}

@app.post("/api/service")
async def update_service(schedule: List[dict]): # <--- Ganti 'str' jadi 'dict'
    with open(SERVICE_FILE, 'w') as f:
        json.dump(schedule, f, indent=4)
    return {"status": "success"}

@app.get("/api/schedules")
async def get_schedules(): return load_json(SCHEDULES_FILE)

@app.post("/api/schedules")
async def save_schedule_named(sched: SavedSchedule):
    data = load_json(SCHEDULES_FILE)
    data[sched.name] = sched.items
    save_json(SCHEDULES_FILE, data)
    return {"status": "success"}

@app.delete("/api/schedules/{name}")
async def delete_schedule_named(name: str):
    data = load_json(SCHEDULES_FILE)
    if name in data: del data[name]
    save_json(SCHEDULES_FILE, data)
    return {"status": "success"}

@app.post("/import_songs")
async def import_songs(files: List[UploadFile] = File(...)):
    new_songs = []
    current_songs = load_json(SONGS_FILE)
    count_success = 0

    for file in files:
        if file.filename.endswith(".txt"):
            try:
                content = await file.read()
                try: text = content.decode("utf-8")
                except: text = content.decode("latin-1", errors="ignore")
                
                # Normalisasi Enter
                # Normalisasi Enter
                text = text.replace("\r\n", "\n").replace("\r", "\n")
                
                # Split Slide (1x Enter = Slide Baru)
                raw_slides = text.split("\n")
                
                final_slides = []
                for s in raw_slides:
                    clean_s = s.strip()
                    # Abaikan baris kosong, kalau ada teksnya jadikan 1 slide
                    if clean_s: 
                        final_slides.append(clean_s)
                
                if final_slides:
                    title = os.path.splitext(file.filename)[0]
                    # Format data sesuai schema Song
                    song_obj = {
                        "title": title,
                        "data": [{"id": i, "text": txt, "type": "normal"} for i, txt in enumerate(final_slides)],
                        "settings": {}
                    }
                    new_songs.append(song_obj)
                    count_success += 1
            except Exception as e:
                print(f"Error {file.filename}: {e}")

    # Gabung Data
    if new_songs:
        # Hapus lagu lama kalau namanya sama (replace logic)
        existing_titles = [s["title"] for s in new_songs]
        current_songs = [s for s in current_songs if s["title"] not in existing_titles]
        current_songs.extend(new_songs)
        save_json(SONGS_FILE, current_songs)
            
    return {"status": "success", "count": count_success}


connected_clients = []  # <-- Tambahin ini bro kalau belum ada
active_clients = {}     # <-- Ini yang kemaren kita tambahin

# --- WEBSOCKET WITH OSC HANDLER ---    # <-- Ini yang kemaren kita tambahin
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_json()
            action = data.get("action")

            if action == "update_display":
                manager.current_state.update(data.get("payload", {}))
                await manager.broadcast({"type": "update_state", "state": manager.current_state})
            
            # ... (kode update_display yang lama) ...
            # --- NEW ACTION: LOWER THIRD CONFIG ---
            elif action == "update_lowerthird":
                payload = data.get("payload")
                if payload:
                    manager.lt_state = payload # <--- SIMPAN KE MEMORI SERVER
                    await manager.broadcast({"type": "update_lt_config", "config": manager.lt_state})
            # FITUR BARU: Handle OSC Trigger

            # ... (di bawah update_foldback)

            # 4. AUDIENCE ALERT (Running Text)
            elif action == "alert":
                # Payload: { text, show, targets: ['main','lt'], position, color, size }
                await manager.broadcast({"type": "alert", "data": data.get("payload")})

            # 5. STAGE MESSAGE (Text)
            elif action == "stage_msg":
                await manager.broadcast({"type": "stage_msg", "data": data.get("payload")})

            # 6. STAGE COUNTDOWN (Timer)
            elif action == "stage_countdown":
                # Payload: { seconds: 300, action: 'start'/'stop' }
                await manager.broadcast({"type": "stage_countdown", "data": data.get("payload")})

            elif action == "update_foldback":
                payload = data.get("payload")
                if payload:
                    manager.fb_state = payload
                    await manager.broadcast({"type": "update_fb_config", "config": manager.fb_state})

            elif action == "update_background":
                payload = data.get("payload", {})
                manager.bg_state = payload # Simpan ke otak server
                if manager.should_emit_background_update(payload):
                    await manager.broadcast({"type": "update_background", "payload": payload})
            
            elif action == "bg_control":
                payload = data.get("payload", {})
                if manager.should_emit_bg_control(payload):
                    await manager.broadcast({"type": "bg_control", "payload": payload})
            
            elif action == "control_video":
                payload = {
                    "target": "video",
                    "command": data.get("command"),
                    "value": data.get("value")
                }
                if manager.should_emit_bg_control(payload):
                    await manager.broadcast({"type": "bg_control", "payload": payload})
            
            elif action == "update_bg_config":
                payload = data.get("payload", {})
                manager.bg_config = payload 
                # 💾 SIMPAN KE CORE PRESET JSON (Biar permanen)
                current_db = load_json(DISPLAY_PRESETS_FILE)
                current_db["bg_global_config"] = payload 
                save_json(DISPLAY_PRESETS_FILE, current_db)
                
                await manager.broadcast({"type": "update_bg_config", "payload": payload})
                    

            # --- FITUR BARU: Nangkep Console.log dari Frontend ---
            elif action == "frontend_log":
                payload = data.get("payload", {})
                source = payload.get("source", "UNKNOWN")
                level = payload.get("level", "INFO")
                msg = payload.get("message", "")
                
                # Format: ERROR:    [FRONTEND-DISPLAY] TypeError: undefined is not...
                log_msg = f"{level}:     [FRONTEND-{source.upper()}] {msg}"
                system_logs.append(log_msg)
            
            elif action == "update_audio":
                manager.audio_state = data.get("payload", {}) # 🎯 Simpan ke Otak Server
                if manager.should_emit_media_update("audio", manager.audio_state):
                    await manager.broadcast({"type": "update_audio", "payload": manager.audio_state})
            
            elif action == "update_photo":
                manager.photo_state = data.get("payload", {}) # 🎯 Simpan ke Otak Server
                if manager.should_emit_media_update("photo", manager.photo_state):
                    await manager.broadcast({"type": "update_photo", "payload": manager.photo_state})
                
            elif action == "update_presentation":
                manager.presentation_state = data.get("payload", {}) # 🎯 Simpan ke Otak Server
                if manager.should_emit_media_update("presentation", manager.presentation_state):
                    await manager.broadcast({"type": "update_presentation", "payload": manager.presentation_state})

            elif action == "update_scripture":
                payload = data.get("payload", {})
                manager.scripture_state = payload # Simpan ke memori server
                # Catatan: broadcast wajib menggunakan format "action" agar sesuai dengan scripture.html
                await manager.broadcast({"action": "update_scripture", "payload": manager.scripture_state})

            elif action == "update_scripture_config":
                payload = data.get("payload", {})
                manager.scripture_config = payload # Simpan ke memori server
                await manager.broadcast({"action": "update_scripture_config", "payload": manager.scripture_config})
            
            elif action == "update_scripture_lt_config":
                payload = data.get("payload", {})
                manager.scripture_lt_config = payload
                await manager.broadcast({"action": "update_scripture_lt_config", "payload": manager.scripture_lt_config})

            elif action == "update_layers":
                target = data.get("target", "main")
                layers = data.get("layers")
                if layers:
                    if target == "main":
                        manager.layer_config_main = layers
                        field = "layers_main"
                    else:
                        manager.layer_config_lt = layers
                        field = "layers_lt"
                        
                    # 💾 SIMPAN KE APP SETTINGS
                    db = load_json(APP_SETTINGS_FILE)
                    db[field] = layers
                    save_json(APP_SETTINGS_FILE, db)
                    
                    await manager.broadcast({
                        "type": "update_layers", 
                        "target": target,
                        "layers": layers
                    })

    except Exception as e:
        print(f"Koneksi terputus/error: {e}")
    finally:
        manager.disconnect(websocket)

# ==========================================
# --- SCHEDULE BUNDLER (EXPORT / IMPORT) ---
# ==========================================

# ==========================================
# --- SCHEDULE BUNDLER (EXPORT / IMPORT) ---
# ==========================================

@app.get("/api/export_bundle/{schedule_name}")
async def export_bundle(schedule_name: str):
    try:
        # 1. BACA FILE SCHEDULES UTAMA
        all_schedules = load_json(SCHEDULES_FILE)
        
        # Cek apakah schedule yang diminta ada di dalam file itu
        if schedule_name not in all_schedules:
            return {"error": "Schedule tidak ditemukan"}
            
        sched_data = all_schedules[schedule_name]
        
        # 2. BACA FILE SONGS UTAMA
        all_songs = load_json(SONGS_FILE)
        
        # Kita bikin list buat nyimpen lagu-lagu yang dipake di schedule ini
        songs_to_export = []
        
        # Cari lagu yang dipake di schedule ini (berdasarkan nama/title)
        for item in sched_data:
            song_title = item.get("title") if isinstance(item, dict) else item
            
            # Cari judul lagu ini di dalam database all_songs
            found_song = next((s for s in all_songs if s["title"] == song_title), None)
            if found_song:
                songs_to_export.append(found_song)

        # 3. BUNGKUS KE DALAM FILE ZIP
        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, 'w', zipfile.ZIP_DEFLATED) as zf:
            # Bikin format JSON buatan khusus buat ZIP-nya
            export_data = {
                "schedule_name": schedule_name,
                "schedule_items": sched_data,
                "songs_data": songs_to_export
            }
            # Simpan 1 file utuh bernama 'bundle.json' ke dalam ZIP
            zf.writestr("bundle.json", json.dumps(export_data, indent=2))
        
        memory_file.seek(0)
        
        return StreamingResponse(
            memory_file, 
            media_type="application/zip", 
            headers={"Content-Disposition": f'attachment; filename="{schedule_name}_bundle.zip"'}
        )
    except Exception as e:
        print(f"ERROR EXPORT: {str(e)}")
        return {"error": f"Internal Server Error: {str(e)}"}

@app.post("/api/import_bundle")
async def import_bundle(file: UploadFile = File(...)):
    if not file.filename.endswith('.zip'):
        return {"status": "error", "message": "File harus format .zip"}
        
    try:
        content = await file.read()
        
        # Bongkar file ZIP yang diupload
        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            if "bundle.json" not in zf.namelist():
                return {"status": "error", "message": "File ZIP tidak valid (bundle.json tidak ditemukan)"}
                
            # Baca isi bundle-nya
            bundle_content = zf.read("bundle.json")
            bundle_data = json.loads(bundle_content)
            
            sched_name = bundle_data.get("schedule_name")
            sched_items = bundle_data.get("schedule_items")
            songs_data = bundle_data.get("songs_data", [])
            
            # 1. MASUKIN SCHEDULE KE DATABASE
            all_schedules = load_json(SCHEDULES_FILE)
            all_schedules[sched_name] = sched_items
            save_json(SCHEDULES_FILE, all_schedules)
            
            # 2. MASUKIN LAGU-LAGU KE DATABASE SONGS (TANPA DUPLIKAT)
            all_songs = load_json(SONGS_FILE)
            
            for new_song in songs_data:
                # Cek apakah lagunya udah ada
                existing_index = next((index for (index, d) in enumerate(all_songs) if d["title"] == new_song["title"]), None)
                if existing_index is not None:
                    # Kalau udah ada, timpa (replace) pakai versi yang dari ZIP
                    all_songs[existing_index] = new_song
                else:
                    # Kalau belum ada, tambahin baru
                    all_songs.append(new_song)
                    
            save_json(SONGS_FILE, all_songs)
            
        return {"status": "success", "message": f"Bundle '{sched_name}' berhasil di-import! {len(songs_data)} lagu telah ditambahkan/diupdate."}
        
    except Exception as e:
        print(f"ERROR IMPORT: {str(e)}")
        return {"status": "error", "message": f"Gagal Import: {str(e)}"}
        
# ==========================================
# --- GLOBAL BILINGUAL SETTINGS ---
# ==========================================
@app.get("/api/global_sub_settings")
async def get_global_sub_settings():
    data = load_json(DISPLAY_PRESETS_FILE)
    return data.get("global_sub_lang", {"color": "#ffc107", "size": 0.6})

@app.post("/api/global_sub_settings")
async def save_global_sub_settings(payload: Dict[str, Any]):
    data = load_json(DISPLAY_PRESETS_FILE)
    data["global_sub_lang"] = payload
    save_json(DISPLAY_PRESETS_FILE, data)
    return {"status": "success"}

@app.get("/diagnostic", response_class=HTMLResponse)
async def get_diagnostic(request: Request):
    return templates.TemplateResponse("diagnostic.html", {"request": request})

@app.get("/api/diagnostics")
async def api_diagnostics():
    # 1. Cek Kesehatan Database (JSON Files)
    db_status = {}
    files_to_check = {
        "Songs DB": SONGS_FILE,
        "Running Order": SERVICE_FILE,
        "Schedules": SCHEDULES_FILE,
        "OSC Config": OSC_FILE,
        "Display Presets": DISPLAY_PRESETS_FILE,
        "LT Presets": LT_PRESETS_FILE,
        "FB Presets": FB_PRESETS_FILE
    }

    ram = psutil.virtual_memory()
    system_info = {
        "os": f"{platform.system()} {platform.release()}",
        "cpu": platform.processor() or "Unknown CPU",
        "cpu_usage": f"{psutil.cpu_percent()}%",
        "ram_usage": f"{ram.percent}%",
        "ram_total": f"{round(ram.total / (1024**3), 1)} GB"
    }
    
    for name, path in files_to_check.items():
        if not os.path.exists(path):
            db_status[name] = "MISSING"
        else:
            try:
                with open(path, 'r') as f:
                    json.load(f)
                db_status[name] = "OK"
            except:
                db_status[name] = "CORRUPT"

    return {
        "logs": list(system_logs),
        "databases": db_status,
        "system": system_info,
        "clients": len(manager.active_connections)# <--- TAMBAHIN INI
    }

# Licensing routes and logic are fully refactored and managed in backend/license_check.py



@app.get("/api/mask_stream")
async def get_mask_stream(path: str):
    try:
        import urllib.parse
        clean_path = urllib.parse.unquote(path).strip('"').strip("'")
        
        # Strip prefixes
        clean_path = clean_path.replace("file:///", "").replace("file://", "")
        if clean_path.startswith("/") and len(clean_path) > 2 and clean_path[2] == ":":
            clean_path = clean_path[1:]
            
        clean_path = os.path.normpath(clean_path)
        
        if not os.path.isabs(clean_path):
            clean_path = os.path.abspath(clean_path)
            
        if os.path.exists(clean_path) and os.path.isfile(clean_path):
            ext = os.path.splitext(clean_path)[1].lower()
            mimetypes = {".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".webp":"image/webp"}
            media_type = mimetypes.get(ext, "image/png")
            return FileResponse(clean_path, media_type=media_type)
            
        print(f"[MASK ERROR] File not found: {clean_path}")
        return Response(status_code=404)
    except Exception as e:
        print(f"[MASK ERROR] Exception: {str(e)}")
        return Response(status_code=500)

if __name__ == "__main__":
    # Jalanin Server
    uvicorn.run(app, host="0.0.0.0", port=18888)