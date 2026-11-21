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
from contextlib import asynccontextmanager
from typing import Any
from urllib.parse import urlparse, parse_qs

from fastapi import FastAPI, WebSocket, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles

from config import (
    load_json, save_json, get_resource_path, get_binary_path, DEV,
    APP_SETTINGS_FILE, DISPLAY_PRESETS_FILE, LT_PRESETS_FILE,
    FB_PRESETS_FILE, CAMERA_SETTINGS_FILE,
)

# --- IMPORT SUB-MODULES (existing) ---
import access_check
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
import routes_plugin

# --- IMPORT FILE INTEGRITY ---
import file_integrity

# --- IMPORT NETWORK GUARD ---
import network_guard

# --- IMPORT CONNECTION MANAGER & MIDDLEWARES ---
from connection_manager import ConnectionManager
from middleware import beta_access_gate, secure_electron_pages, log_requests, system_logs

# ==========================================
# 🚀 LIFESPAN — Startup & Shutdown Events
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """FastAPI lifespan: gantikan @app.on_event('startup') yang sudah deprecated."""
    # ──────────────────────── STARTUP ────────────────────────
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
    bg_tasks.get_ffmpeg_path()
    print("[SYSTEM] Starting Go Playback Engine...")
    start_go_engine()
    print("[SYSTEM] Starting Go Camera Service...")
    start_camera_service()
    print("[SYSTEM] Checking macOS Closed Beta Access...")
    await asyncio.to_thread(access_check.startup_access_check)
    asyncio.create_task(access_check.start_periodic_access_monitor())
    print("[SYSTEM] Starting background license validation...")
    asyncio.create_task(license_check.async_license_check())
    loop.run_in_executor(None, manager.sync_state_from_go)
    asyncio.create_task(bg_tasks.run_media_migration_check())
    asyncio.create_task(bg_tasks.start_presentation_worker())
    asyncio.create_task(_integrity_startup())
    asyncio.create_task(_startup_network_check())
    yield
    # ──────────────────────── SHUTDOWN ────────────────────────
    try:
        access_check.stop_periodic_access_monitor()
    except Exception:
        pass
    stop_camera_service()
    stop_go_engine()
    try:
        file_integrity.stop_monitor()
    except Exception:
        pass
    try:
        network_guard.stop_watchdog()
    except Exception:
        pass
    try:
        sender.stop_discovery()
    except Exception:
        pass


# ==========================================
# 🚀 INIT APP
# ==========================================
app = FastAPI(lifespan=lifespan)

# Templates (satu instance global, dishare ke routes_pages)
templates = Jinja2Templates(directory=get_resource_path("templates"))
templates.env.globals["VERSION"] = f"132-{int(time.time())}"

# Inisialisasi templates di routes_pages
routes_pages.init_templates(templates)

# Register sub-routers (existing modules)
app.include_router(access_check.router)
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
app.include_router(routes_plugin.router)

# Mount Static Files — SETELAH routes_pages didaftarkan (urutan kritis!)
# Route /static/wm.js dari routes_pages akan menang vs StaticFiles ini.
app.mount("/static", StaticFiles(directory=get_resource_path("static")), name="static")


# ==========================================
# 🛡️ SECURITY & REQUEST LOGGER MIDDLEWARE
# Urutan eksekusi Starlette adalah LIFO (yang terdaftar terakhir jalan duluan):
#   1. log_requests_middleware (outermost)
#   2. secure_electron_pages_middleware (cek X-ShowLyrics-Secret)
#   3. beta_access_gate_middleware (cek Closed Beta Access)
# ==========================================

@app.middleware("http")
async def beta_access_gate_middleware(request: Request, call_next):
    return await beta_access_gate(request, call_next)


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
access_check.inject_manager(manager)
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
# ⚙️ GO SERVICES PROCESS MANAGEMENT
# ==========================================
go_proc = None
camera_proc = None
_go_log_fp = None
_camera_log_fp = None


def _open_service_log(filename: str):
    """Buka file log di ~/Library/Logs/ShowLyrics/ untuk sub-service Go (rotate > 5MB)."""
    try:
        log_dir = os.path.expanduser("~/Library/Logs/ShowLyrics")
        os.makedirs(log_dir, exist_ok=True)
        log_path = os.path.join(log_dir, filename)
        if os.path.exists(log_path) and os.path.getsize(log_path) > 5 * 1024 * 1024:
            try:
                os.replace(log_path, log_path + ".old")
            except Exception:
                pass
        return open(log_path, "a", encoding="utf-8", errors="replace")
    except Exception:
        return None


def _close_log_fp(fp):
    if fp:
        try:
            fp.close()
        except Exception:
            pass
    return None


def get_subservices_status() -> dict:
    return {
        "playback_engine": bool(go_proc is not None and go_proc.poll() is None),
        "camera_service": bool(camera_proc is not None and camera_proc.poll() is None),
    }


routes_service.set_subservices_probe(get_subservices_status)


def _stop_child_proc(proc, label: str):
    if not proc:
        return None
    if proc.poll() is not None:
        return None
    print(f"[SYSTEM] Terminating {label}...")
    try:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()
    except Exception as e:
        print(f"[SYSTEM] Error terminating {label}: {e}")
    return None


def start_go_engine():
    global go_proc, _go_log_fp
    try:
        if go_proc and go_proc.poll() is None:
            return
        go_exe = get_binary_path("playback-engine")
        if go_exe and os.path.exists(go_exe):
            print(f"[SYSTEM] Spawning Go Playback Engine from {go_exe}...")
            _go_log_fp = _close_log_fp(_go_log_fp)
            _go_log_fp = _open_service_log("playback-engine.log")
            out_target = _go_log_fp if _go_log_fp else subprocess.DEVNULL
            go_proc = subprocess.Popen(
                [go_exe],
                stdout=out_target,
                stderr=out_target,
            )
            time.sleep(0.1)
        else:
            print("[SYSTEM] ERROR: playback-engine binary not found!")
    except Exception as e:
        print(f"[SYSTEM] Error starting Go engine: {e}")


def stop_go_engine():
    global go_proc, _go_log_fp
    go_proc = _stop_child_proc(go_proc, "Go Playback Engine")
    _go_log_fp = _close_log_fp(_go_log_fp)


def start_camera_service():
    global camera_proc, _camera_log_fp
    try:
        if camera_proc and camera_proc.poll() is None:
            return
        cam_exe = get_binary_path("camera-service")
        if cam_exe and os.path.exists(cam_exe):
            print(f"[SYSTEM] Spawning Go Camera Service from {cam_exe}...")
            _camera_log_fp = _close_log_fp(_camera_log_fp)
            _camera_log_fp = _open_service_log("camera-service.log")
            out_target = _camera_log_fp if _camera_log_fp else subprocess.DEVNULL
            camera_proc = subprocess.Popen(
                [cam_exe],
                stdout=out_target,
                stderr=out_target,
            )
            time.sleep(0.1)
        else:
            print("[SYSTEM] WARNING: camera-service binary not found!")
    except Exception as e:
        print(f"[SYSTEM] Error starting Camera Service: {e}")


def stop_camera_service():
    global camera_proc, _camera_log_fp
    camera_proc = _stop_child_proc(camera_proc, "Go Camera Service")
    _camera_log_fp = _close_log_fp(_camera_log_fp)


atexit.register(stop_camera_service)
atexit.register(stop_go_engine)



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
    if not access_check.is_access_valid():
        reason = access_check.get_access_reason()
        try:
            await websocket.accept()
            await websocket.send_json(manager._sign({
                "action": "beta_revoked",
                "reason": reason,
                "message": "Closed Beta Access required or expired.",
            }))
            await asyncio.sleep(0.05)
            await websocket.close(code=4001, reason=f"beta_{reason}"[:120])
        except Exception:
            pass
        return

    await manager.connect(websocket)
    try:
        while True:
            data   = await websocket.receive_json()
            if not access_check.is_access_valid():
                reason = access_check.get_access_reason()
                try:
                    await websocket.send_json(manager._sign({
                        "action": "beta_revoked",
                        "reason": reason,
                        "message": "Closed Beta Access expired or revoked.",
                    }))
                    await asyncio.sleep(0.05)
                    await websocket.close(code=4001, reason=f"beta_{reason}"[:120])
                except Exception:
                    pass
                break
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
                        if not sender_ip or sender_ip == "external":
                            parsed = urlparse(url)
                            sender_ip = parsed.hostname or "127.0.0.1"
                        
                        video_id = payload.get("video_id") or payload.get("id") or ""
                        if not video_id:
                            match = re.search(r"/(?:stream_video|videos/file)/([^/?#]+)", url)
                            video_id = match.group(1) if match else url.split('/')[-1].split('?')[0].split('#')[0]
                        video_id = re.sub(r'[^a-zA-Z0-9_\-]', '', str(video_id))
                        if not video_id:
                            print(f"[WS] Remote video missing valid video_id from url: {url}")
                            continue
                            
                        media_id = f"sender_{video_id}"
                        duration = float(payload.get("duration") or 0.0)
                        
                        token = ""
                        try:
                            parsed_url = urlparse(url)
                            query_params = parse_qs(parsed_url.query)
                            if "auth" in query_params:
                                token = query_params["auth"][0]
                        except Exception:
                            pass
                            
                        if not token:
                            try:
                                import sender
                                token = sender.find_sender_token(sender_ip)
                            except Exception:
                                pass
                        
                        token_param = f"?auth={token}" if token else ""
                        
                        fallback_url = payload.get("fallback_url") or ""
                        if not fallback_url and video_id:
                            fallback_url = f"http://{sender_ip}:18889/api/videos/file/{video_id}{token_param}"

                        # Prioritize Sender's Go Playback Engine (port 18890) if url contains it, else fallback to 18889
                        if ":18890" in url or "/api/stream_video/" in url:
                            video_path = f"http://{sender_ip}:18890/api/stream_video/{video_id}"
                        else:
                            video_path = fallback_url or f"http://{sender_ip}:18889/api/videos/file/{video_id}{token_param}"
                        
                        payload["url"] = f"/api/stream_video/{media_id}"
                        payload["media_id"] = media_id
                        payload["hash"] = video_id
                        payload["fallback_url"] = fallback_url
                        try:
                            import routes_media_stream
                            routes_media_stream.REMOTE_SENDER_CACHE[media_id] = video_path
                        except Exception:
                            pass
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
                    manager._last_bg_state_sig = ""
                    clear_payload = {"url": "", "clear_type": payload.get("clear_type", "")}
                    if payload.get("source"):
                        clear_payload["source"] = payload.get("source")
                    await manager.broadcast({"type": "update_background", "payload": clear_payload})
                else:
                    load_cmd = {
                        "media_id": media_id,
                        "path": video_path,
                        "duration": duration,
                        "hash": payload.get("hash", ""),
                        "behavior": payload.get("behavior", "loop"),
                    }
                    if is_remote and payload.get("fallback_url"):
                        load_cmd["fallback_url"] = payload.get("fallback_url")
                    await manager.send_go_command_async("load", load_cmd)
                    
                    current_pos = manager.get_video_position()
                    payload["start_time"] = current_pos
                    payload["playing"] = manager.video_timeline["playing"]
                    payload["media_id"] = manager.video_timeline["media_id"]
                    payload["playback_rate"] = manager.video_timeline["playback_rate"]
                    
                    manager.bg_state = payload
                    if payload.get("source") != "remote_sender":
                        manager.ftb_active = False
                    force_bg = bool(payload.get("forceReplay") or payload.get("force"))
                    if force_bg or manager.should_emit_background_update(payload):
                        if force_bg:
                            manager._last_bg_state_sig = manager._payload_signature(payload)
                        await manager.broadcast({"type": "update_background", "payload": payload})

            elif action == "bg_control":
                payload = data.get("payload", {})
                cmd = payload.get("command")
                target = payload.get("target")

                if cmd == "ftb":
                    is_ftb = bool(payload.get("value", payload.get("active", payload.get("enabled", False))))
                    source = payload.get("source", "")
                    current_source = (manager.bg_state or {}).get("source", "local")
                    if source == "remote_sender" and current_source != "remote_sender":
                        pass
                    else:
                        manager.ftb_active = is_ftb
                        if current_source == "remote_sender" or source != "remote_sender":
                            await manager.send_go_command_async("pause" if is_ftb else "play", {})

                if cmd == "stop":
                    if target == "audio":
                        manager.audio_state = {"url": ""}
                        manager._last_media_state_sig["audio"] = ""
                    elif target == "video":
                        manager.bg_state = {"url": ""}
                        manager._last_bg_state_sig = ""

                if target == "video":
                    go_cmd_map = {
                        "play": "play",
                        "pause": "pause",
                        "stop": "stop",
                        "replay": "replay",
                        "sync_time": "seek",
                        "seek": "seek",
                        "update_duration": "update_duration",
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
                        if actual_cmd in ("sync_time", "seek"):
                            go_payload["value"] = payload.get("value")
                        elif actual_cmd == "update_duration":
                            go_payload["duration"] = payload.get("duration", payload.get("value", 0))
                            go_payload["value"] = go_payload["duration"]
                            go_payload["media_id"] = payload.get("media_id", "")
                        elif actual_cmd == "volume":
                            go_payload["value"] = payload.get("value")
                        elif actual_cmd == "playback_rate":
                            go_payload["playback_rate"] = payload.get("value")
                        elif actual_cmd in ("loop", "update_behavior"):
                            go_payload["value"] = payload.get("value")
                        await manager.send_go_command_async(go_cmd, go_payload)
                    
                    # Inject current server position and playback settings into payload for clients
                    if cmd not in ("volume", "mute", "unmute", "mute_toggle", "loop", "update_behavior", "ftb"):
                        payload["value"] = manager.get_video_position()
                    payload["playing"] = manager.video_timeline["playing"]
                    payload["playback_rate"] = manager.video_timeline["playback_rate"]
                    
                if manager.should_emit_bg_control(payload):
                    await manager.broadcast({"type": "bg_control", "payload": payload})

            elif action == "control_video":
                cmd = data.get("command")
                val = data.get("value")
                
                if cmd == "ftb":
                    is_ftb = bool(val)
                    source = data.get("source", "")
                    current_source = (manager.bg_state or {}).get("source", "local")
                    if source == "remote_sender" and current_source != "remote_sender":
                        pass
                    else:
                        manager.ftb_active = is_ftb
                        if current_source == "remote_sender" or source != "remote_sender":
                            await manager.send_go_command_async("pause" if is_ftb else "play", {})

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
                    "value":   val if cmd in ("volume", "mute", "unmute", "mute_toggle", "loop", "update_behavior", "ftb") else manager.get_video_position(),
                    "playing": manager.video_timeline["playing"],
                    "playback_rate": manager.video_timeline["playback_rate"]
                }
                
                if manager.should_emit_bg_control(payload):
                    await manager.broadcast({"type": "bg_control", "payload": payload})

            elif action == "ftb":
                payload = data.get("payload", {})
                is_ftb = bool(payload.get("value", payload.get("active", payload.get("enabled", False))))
                source = payload.get("source", "")
                current_source = (manager.bg_state or {}).get("source", "local")
                if source == "remote_sender" and current_source != "remote_sender":
                    pass
                else:
                    manager.ftb_active = is_ftb
                    if current_source == "remote_sender" or source != "remote_sender":
                        await manager.send_go_command_async("pause" if is_ftb else "play", {})
                await manager.broadcast({"type": "ftb", "payload": payload})

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
                incoming_audio = data.get("payload", {}) or {}
                manager.audio_state = incoming_audio
                if not incoming_audio.get("url"):
                    manager._last_media_state_sig["audio"] = ""
                    await manager.broadcast({"type": "update_audio", "payload": manager.audio_state})
                elif incoming_audio.get("forceReplay") or incoming_audio.get("force") or manager.should_emit_media_update("audio", manager.audio_state):
                    manager._last_media_state_sig["audio"] = manager._payload_signature(manager.audio_state)
                    await manager.broadcast({"type": "update_audio", "payload": manager.audio_state})

            elif action == "update_photo":
                incoming_photo = data.get("payload", {}) or {}
                manager.photo_state = incoming_photo
                if not incoming_photo.get("url"):
                    manager._last_media_state_sig["photo"] = ""
                    await manager.broadcast({"type": "update_photo", "payload": manager.photo_state})
                elif incoming_photo.get("forceReplay") or incoming_photo.get("force") or manager.should_emit_media_update("photo", manager.photo_state):
                    manager._last_media_state_sig["photo"] = manager._payload_signature(manager.photo_state)
                    await manager.broadcast({"type": "update_photo", "payload": manager.photo_state})

            elif action == "update_presentation":
                incoming_pres = data.get("payload", {}) or {}
                manager.presentation_state = incoming_pres
                if not incoming_pres.get("url"):
                    manager._last_media_state_sig["presentation"] = ""
                    await manager.broadcast({"type": "update_presentation", "payload": manager.presentation_state})
                elif incoming_pres.get("forceReplay") or incoming_pres.get("force") or manager.should_emit_media_update("presentation", manager.presentation_state):
                    manager._last_media_state_sig["presentation"] = manager._payload_signature(manager.presentation_state)
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

            elif action == "toggle_plugin":
                preset = data.get("preset")
                if preset:
                    pid = preset.get("id")
                    if pid in manager.active_plugins:
                        del manager.active_plugins[pid]
                    else:
                        now = time.time()
                        timers_state = {}
                        for el in preset.get("elements", []):
                            el_type = el.get("type")
                            el_id = el.get("id")
                            if el_type == "timer":
                                dur = float(el.get("duration", 300))
                                timers_state[el_id] = {
                                    "type": "timer",
                                    "running": True,
                                    "started_at": now,
                                    "paused_at": None,
                                    "duration": dur,
                                    "target_end": now + dur,
                                    "elapsed_before_pause": 0.0
                                }
                            elif el_type == "stopwatch":
                                timers_state[el_id] = {
                                    "type": "stopwatch",
                                    "running": True,
                                    "started_at": now,
                                    "paused_at": None,
                                    "elapsed_before_pause": 0.0
                                }
                        manager.active_plugins[pid] = {
                            "preset": preset,
                            "timers": timers_state,
                            "activated_at": now
                        }
                    await manager.broadcast_plugin_state()

            elif action == "timer_control":
                preset_id = data.get("preset_id")
                cmd = data.get("command")
                val = data.get("value", 0)
                plugin_entry = manager.active_plugins.get(preset_id)
                if plugin_entry:
                    now = time.time()
                    for el_id, t_state in plugin_entry.get("timers", {}).items():
                        if cmd in ("play", "start") and not t_state.get("running"):
                            paused_at = t_state.get("paused_at", now)
                            t_state["running"] = True
                            if t_state["type"] == "timer":
                                remaining = max(0.0, t_state.get("target_end", now) - paused_at)
                                t_state["target_end"] = now + remaining
                            elif t_state["type"] == "stopwatch":
                                pause_dur = now - paused_at
                                t_state["started_at"] += pause_dur
                            t_state["paused_at"] = None
                        elif cmd == "pause" and t_state.get("running"):
                            t_state["running"] = False
                            t_state["paused_at"] = now
                        elif cmd == "reset":
                            dur = float(t_state.get("duration", 300))
                            t_state["running"] = True
                            t_state["started_at"] = now
                            t_state["paused_at"] = None
                            t_state["target_end"] = now + dur
                            t_state["elapsed_before_pause"] = 0.0
                        elif cmd == "adjust":
                            if t_state["type"] == "timer":
                                t_state["target_end"] += float(val)
                                t_state["duration"] = max(0.0, float(t_state.get("duration", 0)) + float(val))
                    await manager.broadcast_plugin_state()

            elif action == "clear_all_plugins":
                manager.active_plugins.clear()
                await manager.broadcast_plugin_state()

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