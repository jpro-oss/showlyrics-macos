import time
import json
import asyncio
from typing import Any
from fastapi import WebSocket

from config import (
    load_json, save_json, WS_SESSION_NONCE,
    APP_SETTINGS_FILE, DISPLAY_PRESETS_FILE, LT_PRESETS_FILE,
    FB_PRESETS_FILE, CAMERA_SETTINGS_FILE,
)
import license_check


class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []
        self._last_bg_state_sig  = ""
        self._last_media_state_sig = {"audio": "", "photo": "", "presentation": ""}
        self._last_sync_emit = {
            "video": {"ts": 0.0, "value": None},
            "audio": {"ts": 0.0, "value": None},
        }
        self.last_video_sync = {"value": 0.0, "ts": 0.0, "playing": True}
        
        # New mathematical timeline system
        self.video_timeline = {
            "media_id": "",
            "playing": False,
            "started_at": 0.0,
            "paused_position": 0.0,
            "playback_rate": 1.0,
            "duration": 0.0
        }

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

    def get_video_position(self) -> float:
        if self.video_timeline["playing"]:
            now = time.time()
            elapsed = now - self.video_timeline["started_at"]
            pos = self.video_timeline["paused_position"] + elapsed * self.video_timeline["playback_rate"]
            dur = self.video_timeline["duration"]
            if dur > 0.0:
                pos = pos % dur
            return round(pos, 3)
        else:
            return round(self.video_timeline["paused_position"], 3)

    def update_video_timeline(self, command: str, value: Any = None):
        """Update mathematical timeline state deterministically based on commands."""
        if command == "play":
            if not self.video_timeline["playing"]:
                self.video_timeline["playing"] = True
                self.video_timeline["started_at"] = time.time()
        elif command == "pause":
            if self.video_timeline["playing"]:
                pos = self.get_video_position()
                self.video_timeline["playing"] = False
                self.video_timeline["paused_position"] = pos
        elif command == "replay":
            self.video_timeline["playing"] = True
            self.video_timeline["started_at"] = time.time()
            self.video_timeline["paused_position"] = 0.0
        elif command in ("seek", "sync_time"):
            try:
                target_val = float(value if value is not None else 0.0)
            except Exception:
                target_val = 0.0
            if self.video_timeline["playing"]:
                self.video_timeline["started_at"] = time.time()
                self.video_timeline["paused_position"] = target_val
            else:
                self.video_timeline["paused_position"] = target_val
        elif command == "playback_rate":
            try:
                new_rate = float(value if value is not None else 1.0)
            except Exception:
                new_rate = 1.0
            if self.video_timeline["playing"]:
                pos = self.get_video_position()
                self.video_timeline["playback_rate"] = new_rate
                self.video_timeline["paused_position"] = pos
                self.video_timeline["started_at"] = time.time()
            else:
                self.video_timeline["playback_rate"] = new_rate


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
            payload = dict(self.bg_state)
            payload["playing"] = self.video_timeline["playing"]
            payload["start_time"] = self.get_video_position()
            payload["media_id"] = self.video_timeline["media_id"]
            payload["playback_rate"] = self.video_timeline["playback_rate"]
            
            # Retrieve hash from db if available
            try:
                from config import BACKGROUNDS_FILE
                db = load_json(BACKGROUNDS_FILE)
                items_key = "videos" if "videos" in db else "items"
                item = db.get(items_key, {}).get(self.video_timeline["media_id"])
                if item and "hash" in item:
                    payload["hash"] = item["hash"]
            except Exception as e:
                print(f"[WS] Error checking hash for startup client: {e}")
                
            await websocket.send_json(self._sign({"type": "update_background", "payload": payload}))
        if self.audio_state.get("url"):
            await websocket.send_json(self._sign({"type": "update_audio", "payload": self.audio_state}))
        if self.photo_state.get("url"):
            await websocket.send_json(self._sign({"type": "update_photo", "payload": self.photo_state}))
        if self.presentation_state.get("url"):
            await websocket.send_json(self._sign({"type": "update_presentation", "payload": self.presentation_state}))
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
        """Broadcast ke semua client — concurrent sends dengan batas waktu per koneksi.
        
        Menggunakan asyncio.gather() alih-alih create_task() untuk mencegah
        task pile-up yang menguras event loop dan menyebabkan WS ping timeout.
        """
        signed  = self._sign(data)
        sockets = list(self.active_connections)
        
        if not sockets:
            return

        async def send_to_one(conn):
            try:
                await asyncio.wait_for(conn.send_json(signed), timeout=5.0)
            except Exception:
                self.disconnect(conn)
                try:
                    await conn.close()
                except Exception:
                    pass

        # gather() menjalankan semua send secara concurrent (bukan sequential)
        # Total waktu = max(individual_timeouts) = max 5.0s, bukan sum
        # Bounded task count = jumlah koneksi aktif saat ini
        await asyncio.gather(*[send_to_one(c) for c in sockets], return_exceptions=True)

    async def sync_broadcaster(self):
        while True:
            await asyncio.sleep(1.0)  # 1s is sufficient — clients tolerate up to 400ms drift
            if self.bg_state.get("url") and self.video_timeline["playing"]:
                # Capture position and timestamp atomically (same tick)
                server_now_ms = time.time() * 1000
                current_val = self.get_video_position()
                await self.broadcast({
                    "type": "heartbeat",
                    "media_id": self.video_timeline["media_id"],
                    "server_time": server_now_ms,
                    "position": current_val,
                    "playing": True,
                    "playback_rate": self.video_timeline["playback_rate"]
                })
