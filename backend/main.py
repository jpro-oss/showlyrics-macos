import sys
import os
import re
import threading
import time
import json
import uvicorn
import asyncio
import subprocess
import atexit
from typing import Any
from urllib.parse import urlparse

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

# --- IMPORT FILE INTEGRITY ---
import file_integrity

# --- IMPORT NETWORK GUARD ---
import network_guard

# --- IMPORT CONNECTION MANAGER & MIDDLEWARES ---
from connection_manager import ConnectionManager
from middleware import secure_electron_pages, log_requests, system_logs

# ==========================================
# 🚀 INIT APP
# ==========================================
app = FastAPI()

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
# ⚠️  URUTAN KRITIS: routes_pages HARUS didaftarkan SEBELUM StaticFiles mount.
# routes_pages berisi route /static/wm.js yang serve dari RAM.
# Jika StaticFiles di-mount duluan, explicit route tidak akan pernah terhit.
app.include_router(routes_pages.router)
app.include_router(routes_media.router)
app.include_router(routes_service.router)
app.include_router(routes_settings.router)

# Mount Static Files — SETELAH routes_pages didaftarkan (urutan kritis!)
# Route /static/wm.js dari routes_pages akan menang vs StaticFiles ini.
app.mount("/static", StaticFiles(directory=get_resource_path("static")), name="static")


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

# Inject deps ke file_integrity (manager + license_check module)
file_integrity.inject_deps(manager, license_check)

# Inject deps ke network_guard (manager + license_check module)
network_guard.inject_manager(manager)
network_guard.inject_license(license_check)


# ==========================================
# ⚙️ GO PLAYBACK ENGINE PROCESS MANAGEMENT
# ==========================================
go_proc = None

def start_go_engine():
    global go_proc
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        # macOS: binary tanpa ekstensi .exe
        go_exe = os.path.join(base_dir, "playback-engine")
        if not os.path.exists(go_exe):
            try:
                go_exe = os.path.join(sys._MEIPASS, "playback-engine")
            except Exception:
                pass

        if os.path.exists(go_exe):
            print(f"[SYSTEM] Spawning Go Playback Engine from {go_exe}...")
            # Pastikan binary punya execute permission (penting setelah extract PyInstaller)
            try:
                os.chmod(go_exe, 0o755)
            except Exception:
                pass
            go_proc = subprocess.Popen(
                [go_exe],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL
            )
            # Beri waktu Go engine 200ms untuk bind ke port 18899
            time.sleep(0.2)
        else:
            print(f"[SYSTEM] ERROR: playback-engine not found at {go_exe}!")
    except Exception as e:
        print(f"[SYSTEM] Error starting Go engine: {e}")

def stop_go_engine():
    global go_proc
    if go_proc:
        print("[SYSTEM] Terminating Go Playback Engine...")
        try:
            go_proc.terminate()  # SIGTERM — graceful shutdown
            try:
                go_proc.wait(timeout=3)  # Tunggu max 3 detik
            except subprocess.TimeoutExpired:
                go_proc.kill()  # SIGKILL jika tidak mau mati
        except Exception as e:
            print(f"[SYSTEM] Error terminating Go engine: {e}")
        go_proc = None

atexit.register(stop_go_engine)


# ==========================================
# 🚀 STARTUP EVENT
# ==========================================
@app.on_event("startup")
async def startup_event():
    """Inisialisasi background tasks dan konfigurasi event loop."""
    
    # Suppress ConnectionResetError dan BrokenPipeError yang muncul saat browser
    # menutup koneksi TCP secara paksa (normal behavior — harmless tapi verbose).
    loop = asyncio.get_running_loop()
    _default_exc_handler = loop.get_exception_handler()
    def _suppressed_exc_handler(loop, context):
        exc = context.get('exception')
        if isinstance(exc, (ConnectionResetError, BrokenPipeError)):
            return  # Suppress harmless remote-close errors silently
        if _default_exc_handler:
            _default_exc_handler(loop, context)
        else:
            loop.default_exception_handler(context)
    loop.set_exception_handler(_suppressed_exc_handler)
    print("[SYSTEM] Starting Go Playback Engine...")
    start_go_engine()
    print("[SYSTEM] Starting background license validation...")
    asyncio.create_task(license_check.async_license_check())
    # Sync initial timeline state from Go Playback Engine
    loop.run_in_executor(None, manager.sync_state_from_go)
    asyncio.create_task(bg_tasks.run_media_migration_check())
    asyncio.create_task(bg_tasks.start_presentation_worker())
    # Mulai file integrity system (delay 2 detik — beri waktu license check selesai)
    asyncio.create_task(_integrity_startup())
    # Mulai network guard check (delay 3 detik — beri waktu client connect dulu)
    asyncio.create_task(_startup_network_check())


async def _integrity_startup():
    """Init file integrity system setelah startup (delay 2 detik)."""
    await asyncio.sleep(2)
    print("[SYSTEM] Starting file integrity guardian...")
    # Inject running loop SEBELUM initialize() agar _force_watermark() dari
    # background thread bisa broadcast realtime ke semua client via WebSocket.
    # Tanpa ini, asyncio.get_event_loop() di background thread tidak reliabel
    # dan watermark baru muncul setelah halaman di-refresh.
    file_integrity.inject_loop(asyncio.get_running_loop())
    await asyncio.to_thread(file_integrity.initialize)
    file_integrity.start_monitor()


async def _startup_network_check():
    """
    Cek konektivitas CDN saat startup, setelah delay 3 detik
    agar WebSocket clients sempat connect dan siap menerima broadcast.

    Alur:
      1. Inject asyncio event loop ke network_guard (untuk broadcast dari thread)
      2. Evaluate connectivity: CDN first → fallback internet jika CDN gagal
      3. Strike + broadcast sesuai hasil (dihandle di network_guard)
      4. Start adaptive watchdog
    """
    await asyncio.sleep(3)
    print("[SYSTEM] Starting network guard evaluation...")

    # Inject event loop agar watchdog & broadcast dari thread bisa jalan
    network_guard.inject_loop(asyncio.get_running_loop())

    # Jalankan di thread pool — TCP checks bersifat blocking
    status = await asyncio.to_thread(network_guard.evaluate_connectivity, False)

    print(
        f"[SYSTEM] Network status: {status.status.value} "
        f"| CDN: {'OK' if status.cdn_reachable else 'BLOCKED'}"
    )

    # Start adaptive watchdog setelah check awal selesai
    network_guard.start_watchdog()


# ==========================================
# 🔌 CACHE STATUS CALLBACK FOR GO
# ==========================================
@app.post("/api/background/cache_status")
async def go_cache_status(request: Request):
    payload = await request.json()
    await manager.broadcast({"type": "cache_status", "payload": payload})
    return {"status": "ok"}


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
                payload = data.get("payload")
                manager.alert_state = payload
                await manager.broadcast({"type": "alert", "data": payload})

            elif action == "stage_msg":
                payload = data.get("payload")
                manager.stage_msg_state = payload
                await manager.broadcast({"type": "stage_msg", "data": payload})

            elif action == "stage_countdown":
                payload = data.get("payload") or {}
                if payload.get("action") == "start":
                    manager.stage_countdown_state = {
                        "action": "start",
                        "total_seconds": float(payload.get("seconds", 300)),
                        "start_time": time.time()
                    }
                else:
                    manager.stage_countdown_state = {
                        "action": "stop"
                    }
                await manager.broadcast({"type": "stage_countdown", "data": payload})

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
                video_path = ""
                is_remote = payload.get("source") == "remote_sender"
                
                if url:
                    if is_remote:
                        sender_ip = payload.get("sender_id")
                        if not sender_ip:
                            parsed = urlparse(url)
                            sender_ip = parsed.hostname or "127.0.0.1"
                        
                        video_id = payload.get("video_id")
                        if not video_id:
                            match = re.search(r"/api/videos/file/([^/?#]+)", url)
                            video_id = match.group(1) if match else url.split('/')[-1]
                            
                        media_id = f"sender_{video_id}"
                        duration = float(payload.get("duration") or 0.0)
                        video_path = f"http://{sender_ip}:18890/api/stream_video/{video_id}"
                        
                        payload["url"] = f"/api/stream_video/{media_id}"
                        payload["hash"] = video_id
                    else:
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
                                    video_path = item.get("video_path", item.get("file_path", ""))
                                    if "hash" in item:
                                        payload["hash"] = item["hash"]
                            except Exception as e:
                                print(f"[WS] Error checking duration: {e}")

                if not url:
                    await manager.send_go_command_async("stop")
                    manager.bg_state = {"url": ""}
                    await manager.broadcast({"type": "update_background", "payload": {"url": "", "clear_type": payload.get("clear_type", "")}})
                else:
                    await manager.send_go_command_async("load", {
                        "media_id": media_id,
                        "path": video_path,
                        "duration": duration,
                        "hash": payload.get("hash", ""),
                        "behavior": payload.get("behavior", "loop")
                    })
                    
                    current_pos = manager.get_video_position()
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
                    go_cmd_map = {
                        "play": "play",
                        "pause": "pause",
                        "replay": "replay",
                        "sync_time": "seek",
                        "volume": "volume",
                        "mute": "mute",
                        "unmute": "unmute",
                        "playback_rate": "playback_rate",
                        "loop": "loop",
                        "update_behavior": "update_behavior"
                    }
                    
                    actual_cmd = cmd
                    if cmd == "mute_toggle":
                        actual_cmd = "mute" if payload.get("value") else "unmute"
                        
                    go_cmd = go_cmd_map.get(actual_cmd)
                    if go_cmd:
                        go_payload = {}
                        if actual_cmd == "sync_time":
                            go_payload["value"] = payload.get("value")
                        elif actual_cmd == "volume":
                            go_payload["value"] = payload.get("value")
                        elif actual_cmd == "playback_rate":
                            go_payload["playback_rate"] = payload.get("value")
                        elif actual_cmd in ("loop", "update_behavior"):
                            go_payload["value"] = payload.get("value")
                        await manager.send_go_command_async(go_cmd, go_payload)
                    
                    # Inject current server position and playback settings into payload for clients
                    if cmd not in ("volume", "mute", "unmute", "mute_toggle", "loop", "update_behavior"):
                        payload["value"] = manager.get_video_position()
                    payload["playing"] = manager.video_timeline["playing"]
                    payload["playback_rate"] = manager.video_timeline["playback_rate"]
                    
                if manager.should_emit_bg_control(payload):
                    await manager.broadcast({"type": "bg_control", "payload": payload})

            elif action == "control_video":
                cmd = data.get("command")
                val = data.get("value")
                
                go_cmd_map = {
                    "play": "play",
                    "pause": "pause",
                    "replay": "replay",
                    "seek": "seek",
                    "sync_time": "seek",
                    "volume": "volume",
                    "mute": "mute",
                    "unmute": "unmute",
                    "playback_rate": "playback_rate",
                    "loop": "loop",
                    "update_behavior": "update_behavior"
                }
                
                actual_cmd = cmd
                if cmd == "mute_toggle":
                    actual_cmd = "mute" if val else "unmute"
                
                go_cmd = go_cmd_map.get(actual_cmd)
                if go_cmd:
                    go_payload = {}
                    if actual_cmd in ("seek", "sync_time"):
                        go_payload["value"] = val
                    elif actual_cmd == "volume":
                        go_payload["value"] = val
                    elif actual_cmd == "playback_rate":
                        go_payload["playback_rate"] = val
                    elif actual_cmd in ("loop", "update_behavior"):
                        go_payload["value"] = val
                    await manager.send_go_command_async(go_cmd, go_payload)
                
                payload = {
                    "target":  "video",
                    "command": cmd,
                    "value":   val if cmd in ("volume", "mute", "unmute", "mute_toggle", "loop", "update_behavior") else manager.get_video_position(),
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
                await manager.send_go_command_async("update_bg_config", {"payload": payload})
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

            elif action == "stage_rundown":
                payload = data.get("payload")
                manager.stage_rundown_state = payload
                await manager.broadcast({"type": "stage_rundown", "data": payload})

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