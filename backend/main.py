import sys
import os
import threading
import time
import json
import uvicorn
import asyncio
from collections import deque
import psutil
import platform

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from config import (
    load_json, save_json, get_resource_path, DEV, WS_SESSION_NONCE,
    APP_SETTINGS_FILE, DISPLAY_PRESETS_FILE, LT_PRESETS_FILE,
    FB_PRESETS_FILE, CAMERA_SETTINGS_FILE, get_user_data_path,
)

# --- IMPORT SUB-MODULES (existing) ---
import license_check
import sender
import scripture
import background_tasks as bg_tasks
import presets

# --- IMPORT ROUTE MODULES (new) ---
import routes_pages
import routes_media
import routes_service
import routes_settings

# ==========================================
# 🚀 INIT APP
# ==========================================
app = FastAPI()

# Mount Static Files
app.mount("/static", StaticFiles(directory=get_resource_path("static")), name="static")

# Templates (satu instance global, dishare ke routes_pages)
templates = Jinja2Templates(directory=get_resource_path("templates"))
templates.env.globals["VERSION"] = f"132-{int(time.time())}"

# Inisialisasi templates di routes_pages
routes_pages.init_templates(templates)

# Register sub-routers (existing modules)
app.include_router(license_check.router, prefix="/api/license")
app.include_router(sender.router, prefix="/api/senders")
app.include_router(scripture.presets_router, prefix="/api/scripture_presets")
app.include_router(scripture.bible_router, prefix="/api/scripture")
app.include_router(presets.router)

# Register route modules (new)
app.include_router(routes_pages.router)
app.include_router(routes_media.router)
app.include_router(routes_service.router)
app.include_router(routes_settings.router)

# ==========================================
# 🛡️ SECURITY MIDDLEWARE (DEV MODE)
# ==========================================

@app.middleware("http")
async def secure_electron_pages(request: Request, call_next):
    """
    Proteksi akses ke halaman sensitif.
    Hanya aktif saat DEV=False (production/Electron mode).
    """
    path = request.url.path
    if path in ["/", "/control", "/diagnostic", "/control/", "/diagnostic/"]:
        if not DEV:
            expected_token = os.environ.get("SHOWLYRICS_SECRET")
            if not expected_token:
                # Fallback to reading the .session_token file
                token_file = get_user_data_path(".session_token")
                if os.path.exists(token_file):
                    try:
                        with open(token_file, "r", encoding="utf-8") as f:
                            expected_token = f.read().strip()
                    except Exception:
                        pass

            received_token = request.headers.get("X-ShowLyrics-Secret")

            if not expected_token or received_token != expected_token:
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
                                h1 { color: #ef4444; font-size: 2rem; margin-bottom: 10px; margin-top: 0; }
                                p  { color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0; }
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
                    status_code=403,
                )
    return await call_next(request)


# ==========================================
# 📋 REQUEST LOGGER MIDDLEWARE
# ==========================================

# Buffer 200 baris log terakhir (RAM-efficient)
system_logs: deque = deque(maxlen=200)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    response   = await call_next(request)
    process_time = time.time() - start_time

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_msg = (
        f"INFO:     {client_ip} - "
        f'"{request.method} {request.url.path} HTTP/1.1" '
        f"{response.status_code} ({process_time:.3f}s)"
    )

    # Filter static files & polling diagnostics supaya log tidak penuh
    if not request.url.path.startswith("/static") and request.url.path != "/api/diagnostics":
        system_logs.append(log_msg)

    return response


# ==========================================
# 🔌 CONNECTION MANAGER
# ==========================================

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._last_bg_state_sig  = ""
        self._last_media_state_sig = {"audio": "", "photo": "", "presentation": ""}
        self._last_sync_emit = {
            "video": {"ts": 0.0, "value": None},
            "audio": {"ts": 0.0, "value": None},
        }
        self.last_video_sync = {"value": 0.0, "ts": 0.0}

        # State defaults
        self.current_state = {
            "text": "", "font": "Cinzel", "color": "#ffffff", "zoom": "in",
            "speed": "30s", "glow": 50, "fade": 0.5, "show": False,
            "theme": "default", "trans": "fade", "next_text": "",
        }
        self.lt_state   = {}
        self.fb_state   = {}
        self.bg_state   = {"url": ""}
        self.audio_state        = {"url": ""}
        self.photo_state        = {"url": ""}
        self.presentation_state = {"url": ""}

        # Load layer config dari app_settings
        app_settings = load_json(APP_SETTINGS_FILE)
        _default_layers = [
            {"id": "lyrics",     "visible": True},
            {"id": "ppt",        "visible": True},
            {"id": "photo",      "visible": True},
            {"id": "background", "visible": True},
            {"id": "scripture",  "visible": True},
            {"id": "camera",     "visible": True},
        ]
        self.layer_config_main = app_settings.get("layers_main", _default_layers)
        self.layer_config_lt   = app_settings.get("layers_lt",   _default_layers)

        self.bg_config         = {"transition": 0.5, "fit": "cover"}
        self.scripture_state: dict = {}
        self.scripture_config: dict = {}
        self.scripture_lt_config: dict = {}
        self.camera_state = load_json(CAMERA_SETTINGS_FILE)

        self.load_all_defaults()

    def _sign(self, data: dict) -> dict:
        """Tambahkan session nonce ke setiap pesan keluar."""
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
        cmd    = (payload or {}).get("command")
        target = (payload or {}).get("target")
        if cmd != "sync_time" or target not in ("video", "audio"):
            return True

        now = time.time()
        rec = self._last_sync_emit[target]
        try:
            value = float((payload or {}).get("value", 0))
        except Exception:
            value = 0.0

        # Drop sync_time yang terlalu rapat / terlalu kecil drift-nya
        if (now - rec["ts"]) < 0.2:
            return False
        if rec["value"] is not None and abs(value - rec["value"]) < 0.08:
            return False

        rec["ts"]    = now
        rec["value"] = value
        if target == "video":
            self.last_video_sync["value"] = value
            self.last_video_sync["ts"]    = now
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

        # Display Preset default
        try:
            disp_data = load_json(DISPLAY_PRESETS_FILE)
            if "bg_global_config" in disp_data:
                self.bg_config = disp_data["bg_global_config"]
            def_name = disp_data.get("default")
            if def_name and def_name in disp_data.get("presets", {}):
                print(f" -> Display Default Loaded: {def_name}")
                preset = disp_data["presets"][def_name]
                for k, v in preset.items():
                    self.current_state[k] = v
        except Exception as e:
            print(f"Error loading Display default: {e}")

        # Lower Third default
        try:
            lt_data  = load_json(LT_PRESETS_FILE)
            def_name = lt_data.get("default")
            if def_name and def_name in lt_data.get("presets", {}):
                print(f" -> LT Default Loaded: {def_name}")
                self.lt_state = lt_data["presets"][def_name]
        except Exception as e:
            print(f"Error loading LT default: {e}")

        # Foldback default
        try:
            fb_data  = load_json(FB_PRESETS_FILE)
            def_name = fb_data.get("default")
            if def_name and def_name in fb_data.get("presets", {}):
                print(f" -> FB Default Loaded: {def_name}")
                self.fb_state = fb_data["presets"][def_name]
        except Exception as e:
            print(f"Error loading FB default: {e}")

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

        # Kirim state penuh ke client baru
        await websocket.send_json(self._sign({"type": "update_state", "state": self.current_state}))

        # Kirim status lisensi secara non-blocking (tunggu check selesai dulu)
        asyncio.ensure_future(self._send_license_status_when_ready(websocket))

        await websocket.send_json(self._sign({"type": "update_bg_config", "payload": self.bg_config}))

        if self.lt_state:
            await websocket.send_json(self._sign({"type": "update_lt_config", "config": self.lt_state}))
        if self.fb_state:
            await websocket.send_json(self._sign({"type": "update_fb_config", "config": self.fb_state}))
        if self.bg_state.get("url"):
            await websocket.send_json(self._sign({"type": "update_background", "payload": self.bg_state}))
        if self.audio_state.get("url"):
            await websocket.send_json(self._sign({"type": "update_audio", "payload": self.audio_state}))
        if self.photo_state.get("url"):
            await websocket.send_json(self._sign({"type": "update_photo", "payload": self.photo_state}))
        if self.presentation_state.get("url"):
            await websocket.send_json(self._sign({"type": "update_presentation", "payload": self.presentation_state}))
        if self.last_video_sync.get("ts", 0) > 0:
            await websocket.send_json(self._sign({
                "type": "bg_control",
                "payload": {
                    "target": "video",
                    "command": "sync_time",
                    "value": self.last_video_sync.get("value", 0.0),
                },
            }))
        if self.scripture_state:
            await websocket.send_json(self._sign({"action": "update_scripture", "payload": self.scripture_state}))
        if self.scripture_config:
            await websocket.send_json(self._sign({"action": "update_scripture_config", "payload": self.scripture_config}))
        if self.scripture_lt_config:
            await websocket.send_json(self._sign({"action": "update_scripture_lt_config", "payload": self.scripture_lt_config}))
        if self.camera_state:
            await websocket.send_json(self._sign({"type": "update_camera_state", "state": self.camera_state}))

        # Layer config
        await websocket.send_json(self._sign({
            "type": "update_layers",
            "layers_main": self.layer_config_main,
            "layers_lt":   self.layer_config_lt,
        }))

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def _send_license_status_when_ready(self, websocket: WebSocket):
        """
        Tunggu startup license check selesai sebelum kirim status.
        Mencegah flicker watermark saat server baru restart (max 8 detik).
        """
        max_wait = 80  # 80 × 0.1s = 8 detik
        for _ in range(max_wait):
            if license_check.LICENSE_CHECK_DONE:
                break
            await asyncio.sleep(0.1)
        try:
            if websocket in self.active_connections:
                await websocket.send_json(self._sign({
                    "action": "license_status",
                    "valid":  license_check.LICENSE_VALID,
                }))
        except Exception:
            pass  # Client sudah disconnect

    async def broadcast(self, data: dict):
        """Broadcast ke semua client — semua pesan otomatis dapat nonce."""
        signed  = self._sign(data)
        sockets = list(self.active_connections)
        if sockets:
            results = await asyncio.gather(
                *[conn.send_json(signed) for conn in sockets],
                return_exceptions=True,
            )
            for conn, result in zip(sockets, results):
                if isinstance(result, Exception):
                    self.disconnect(conn)


# ==========================================
# 🔗 DEPENDENCY INJECTION
# ==========================================
manager = ConnectionManager()

# Inject manager ke semua modul yang membutuhkannya
license_check.manager = manager
bg_tasks.manager      = manager
routes_settings.init_manager(manager, system_logs)
routes_media.init_manager(manager)


# ==========================================
# 🚀 STARTUP EVENT
# ==========================================
@app.on_event("startup")
async def startup_event():
    """Pre-warm HWID cache di background sebelum request pertama masuk."""
    print("[SYSTEM] Starting background license validation...")
    asyncio.create_task(license_check.async_license_check())


# ==========================================
# 🔌 WEBSOCKET ENDPOINT
# ==========================================
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data   = await websocket.receive_json()
            action = data.get("action")

            if action == "update_display":
                manager.current_state.update(data.get("payload", {}))
                await manager.broadcast({"type": "update_state", "state": manager.current_state})

            elif action == "update_lowerthird":
                payload = data.get("payload")
                if payload:
                    manager.lt_state = payload
                    await manager.broadcast({"type": "update_lt_config", "config": manager.lt_state})

            elif action == "alert":
                await manager.broadcast({"type": "alert", "data": data.get("payload")})

            elif action == "stage_msg":
                await manager.broadcast({"type": "stage_msg", "data": data.get("payload")})

            elif action == "stage_countdown":
                await manager.broadcast({"type": "stage_countdown", "data": data.get("payload")})

            elif action == "update_foldback":
                payload = data.get("payload")
                if payload:
                    manager.fb_state = payload
                    await manager.broadcast({"type": "update_fb_config", "config": manager.fb_state})

            elif action == "update_background":
                payload = data.get("payload", {})
                manager.bg_state = payload
                if manager.should_emit_background_update(payload):
                    await manager.broadcast({"type": "update_background", "payload": payload})

            elif action == "bg_control":
                payload = data.get("payload", {})
                if manager.should_emit_bg_control(payload):
                    await manager.broadcast({"type": "bg_control", "payload": payload})

            elif action == "control_video":
                payload = {
                    "target":  "video",
                    "command": data.get("command"),
                    "value":   data.get("value"),
                }
                if manager.should_emit_bg_control(payload):
                    await manager.broadcast({"type": "bg_control", "payload": payload})

            elif action == "update_bg_config":
                payload = data.get("payload", {})
                manager.bg_config = payload
                # Simpan ke preset JSON agar permanen
                current_db = load_json(DISPLAY_PRESETS_FILE)
                current_db["bg_global_config"] = payload
                save_json(DISPLAY_PRESETS_FILE, current_db)
                await manager.broadcast({"type": "update_bg_config", "payload": payload})

            elif action == "frontend_log":
                payload = data.get("payload", {})
                source  = payload.get("source", "UNKNOWN")
                level   = payload.get("level", "INFO")
                msg     = payload.get("message", "")
                log_msg = f"{level}:     [FRONTEND-{source.upper()}] {msg}"
                system_logs.append(log_msg)

            elif action == "update_audio":
                manager.audio_state = data.get("payload", {})
                if manager.should_emit_media_update("audio", manager.audio_state):
                    await manager.broadcast({"type": "update_audio", "payload": manager.audio_state})

            elif action == "update_photo":
                manager.photo_state = data.get("payload", {})
                if manager.should_emit_media_update("photo", manager.photo_state):
                    await manager.broadcast({"type": "update_photo", "payload": manager.photo_state})

            elif action == "update_presentation":
                manager.presentation_state = data.get("payload", {})
                if manager.should_emit_media_update("presentation", manager.presentation_state):
                    await manager.broadcast({"type": "update_presentation", "payload": manager.presentation_state})

            elif action == "update_scripture":
                payload = data.get("payload", {})
                manager.scripture_state = payload
                await manager.broadcast({"action": "update_scripture", "payload": manager.scripture_state})

            elif action == "update_scripture_config":
                payload = data.get("payload", {})
                manager.scripture_config = payload
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

                    db = load_json(APP_SETTINGS_FILE)
                    db[field] = layers
                    save_json(APP_SETTINGS_FILE, db)

                    await manager.broadcast({
                        "type":   "update_layers",
                        "target": target,
                        "layers": layers,
                    })

    except Exception as e:
        print(f"Koneksi terputus/error: {e}")
    finally:
        manager.disconnect(websocket)


# ==========================================
# 🔥 ENTRY POINT
# ==========================================
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=18888)