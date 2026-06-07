import sys
import os
import threading
import time
import json
import uvicorn
import asyncio
from typing import Any

from fastapi import FastAPI, WebSocket, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from config import (
    load_json, save_json, get_resource_path, DEV,
    APP_SETTINGS_FILE, DISPLAY_PRESETS_FILE, LT_PRESETS_FILE,
    FB_PRESETS_FILE, CAMERA_SETTINGS_FILE,
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

# --- IMPORT CONNECTION MANAGER & MIDDLEWARES ---
from connection_manager import ConnectionManager
from middleware import secure_electron_pages, log_requests, system_logs

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
# 🛡️ SECURITY & REQUEST LOGGER MIDDLEWARE
# ==========================================

@app.middleware("http")
async def secure_electron_pages_middleware(request: Request, call_next):
    return await secure_electron_pages(request, call_next)


@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    return await log_requests(request, call_next)


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
    """Inisialisasi background tasks dan konfigurasi event loop."""
    
    # Suppress ConnectionResetError [WinError 10054] yang muncul saat browser
    # menutup koneksi TCP secara paksa (normal behavior di Windows).
    # Error ini bersifat harmless tapi sangat verbose di console.
    loop = asyncio.get_event_loop()
    _default_exc_handler = loop.get_exception_handler()
    def _suppressed_exc_handler(loop, context):
        exc = context.get('exception')
        if isinstance(exc, (ConnectionResetError, BrokenPipeError)):
            return  # Suppress harmless remote-close errors silently
        if isinstance(exc, OSError) and getattr(exc, 'winerror', None) == 10054:
            return  # Windows: An existing connection was forcibly closed
        if _default_exc_handler:
            _default_exc_handler(loop, context)
        else:
            loop.default_exception_handler(context)
    loop.set_exception_handler(_suppressed_exc_handler)
    
    print("[SYSTEM] Starting background license validation...")
    asyncio.create_task(license_check.async_license_check())
    asyncio.create_task(manager.sync_broadcaster())
    asyncio.create_task(bg_tasks.run_media_migration_check())


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
                url = payload.get("url", "")
                
                # Parse media_id & duration from backgrounds database
                media_id = ""
                duration = 0.0
                if url:
                    import re
                    match = re.search(r"/api/stream_video/([^/?#]+)", url)
                    if match:
                        media_id = match.group(1)
                        try:
                            from config import BACKGROUNDS_FILE
                            db = load_json(BACKGROUNDS_FILE)
                            items_key = "videos" if "videos" in db else "items"
                            item = db.get(items_key, {}).get(media_id)
                            if item:
                                duration = item.get("duration", 0.0)
                                if "hash" in item:
                                    payload["hash"] = item["hash"]
                        except Exception as e:
                            print(f"[WS] Error checking duration: {e}")

                # Capture current position BEFORE modifying the timeline (prevents circular calculation bug)
                current_pos = manager.get_video_position()
                
                if payload.get("forceReplay") or url != manager.bg_state.get("url"):
                    manager.video_timeline["media_id"] = media_id
                    manager.video_timeline["duration"] = duration
                    manager.video_timeline["playing"] = True
                    manager.video_timeline["started_at"] = time.time()
                    manager.video_timeline["paused_position"] = 0.0
                    manager.video_timeline["playback_rate"] = 1.0
                    current_pos = 0.0  # Reset to 0 for new video
                else:
                    # Preserve current playback position for the same video
                    manager.video_timeline["media_id"] = media_id
                    manager.video_timeline["duration"] = duration
                    # Don't reset playing state — keep it playing at the same position
                    if not manager.video_timeline["playing"]:
                        manager.video_timeline["playing"] = True
                        manager.video_timeline["started_at"] = time.time()
                    
                payload["start_time"] = current_pos
                payload["playing"] = manager.video_timeline["playing"]
                payload["media_id"] = manager.video_timeline["media_id"]
                payload["playback_rate"] = manager.video_timeline["playback_rate"]
                
                manager.bg_state = payload
                if manager.should_emit_background_update(payload):
                    await manager.broadcast({"type": "update_background", "payload": payload})

            elif action == "bg_control":
                payload = data.get("payload", {})
                cmd = payload.get("command")
                target = payload.get("target")

                if target == "video":
                    manager.update_video_timeline(cmd, payload.get("value"))
                    # Inject current server position and playback settings into payload for clients
                    payload["value"] = manager.get_video_position()
                    payload["playing"] = manager.video_timeline["playing"]
                    payload["playback_rate"] = manager.video_timeline["playback_rate"]
                    
                if manager.should_emit_bg_control(payload):
                    await manager.broadcast({"type": "bg_control", "payload": payload})

            elif action == "control_video":
                cmd = data.get("command")
                val = data.get("value")
                manager.update_video_timeline(cmd, val)
                
                payload = {
                    "target":  "video",
                    "command": cmd,
                    "value":   manager.get_video_position(),
                    "playing": manager.video_timeline["playing"],
                    "playback_rate": manager.video_timeline["playback_rate"]
                }
                
                if manager.should_emit_bg_control(payload):
                    await manager.broadcast({"type": "bg_control", "payload": payload})

            elif action == "ping":
                client_ts = data.get("client_ts", 0)
                try:
                    await asyncio.wait_for(
                        websocket.send_json(manager._sign({
                            "type": "pong",
                            "client_ts": client_ts,
                            "server_ts": time.time() * 1000
                        })),
                        timeout=5.0
                    )
                except Exception:
                    manager.disconnect(websocket)
                    try:
                        await websocket.close()
                    except Exception:
                        pass

            elif action == "cache_status":
                payload = data.get("payload", {})
                await manager.broadcast({"type": "cache_status", "payload": payload})

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
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=18888,
        # Naikkan WS ping timeout dari default 20s ke 40s.
        # Saat video besar dikirim, event loop sibuk dan browser mungkin
        # tidak sempat respons ping dalam 20s. 40s lebih toleran.
        ws_ping_interval=40,
        ws_ping_timeout=40,
    )