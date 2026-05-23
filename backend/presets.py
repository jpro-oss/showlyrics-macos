from fastapi import APIRouter
from typing import Dict, Any
from config import (
    load_json,
    save_json,
    LT_PRESETS_FILE,
    DISPLAY_PRESETS_FILE,
    FB_PRESETS_FILE,
    ALERT_PRESETS_FILE,
)

router = APIRouter()

# --- LOWER THIRD PRESET APIs ---

@router.get("/api/lt_presets")
async def get_lt_presets():
    return load_json(LT_PRESETS_FILE)

@router.post("/api/lt_presets")
async def save_lt_preset(payload: Dict[str, Any]):
    # Payload format: { "name": "NamaPreset", "config": {...}, "is_default": boolean }
    data = load_json(LT_PRESETS_FILE)
    
    # Init structure kalau file baru
    if "presets" not in data: data["presets"] = {}
    if "default" not in data: data["default"] = ""

    name = payload.get("name")
    config = payload.get("config")
    
    # Save preset
    data["presets"][name] = config
    
    # Set default kalau diminta
    if payload.get("is_default"):
        data["default"] = name
        
    save_json(LT_PRESETS_FILE, data)
    return {"status": "success"}

@router.post("/api/lt_presets/default/{name}")
async def set_default_lt_preset(name: str):
    data = load_json(LT_PRESETS_FILE)
    if "presets" in data and name in data["presets"]:
        data["default"] = name
        save_json(LT_PRESETS_FILE, data)
        return {"status": "success"}
    return {"status": "not_found"}

@router.delete("/api/lt_presets/{name}")
async def delete_lt_preset(name: str):
    data = load_json(LT_PRESETS_FILE)
    if "presets" in data and name in data["presets"]:
        del data["presets"][name]
        # Kalau yg dihapus itu default, reset defaultnya
        if data.get("default") == name:
            data["default"] = ""
        save_json(LT_PRESETS_FILE, data)
        return {"status": "success"}
    return {"status": "not_found"}

# --- DISPLAY PRESET APIs ---

@router.get("/api/display_presets")
async def get_display_presets():
    return load_json(DISPLAY_PRESETS_FILE)

@router.post("/api/display_presets")
async def save_display_preset(payload: Dict[str, Any]):
    data = load_json(DISPLAY_PRESETS_FILE)
    if "presets" not in data: data["presets"] = {}
    data["presets"][payload.get("name")] = payload.get("config")
    if payload.get("is_default"): data["default"] = payload.get("name")
    save_json(DISPLAY_PRESETS_FILE, data)
    return {"status": "success"}

@router.post("/api/display_presets/default/{name}")
async def set_default_display_preset(name: str):
    data = load_json(DISPLAY_PRESETS_FILE)
    if "presets" in data and name in data["presets"]:
        data["default"] = name
        save_json(DISPLAY_PRESETS_FILE, data)
        return {"status": "success"}
    return {"status": "not_found"}

@router.delete("/api/display_presets/{name}")
async def delete_display_preset(name: str):
    data = load_json(DISPLAY_PRESETS_FILE)
    if "presets" in data and name in data["presets"]:
        del data["presets"][name]
        if data.get("default") == name: data["default"] = ""
        save_json(DISPLAY_PRESETS_FILE, data)
        return {"status": "success"}
    return {"status": "not_found"}

# --- FOLDBACK PRESET APIs ---

@router.get("/api/fb_presets")
async def get_fb_presets():
    return load_json(FB_PRESETS_FILE)

@router.post("/api/fb_presets")
async def save_fb_preset(payload: Dict[str, Any]):
    data = load_json(FB_PRESETS_FILE)
    if "presets" not in data: data["presets"] = {}
    
    data["presets"][payload.get("name")] = payload.get("config")
    
    if payload.get("is_default"):
        data["default"] = payload.get("name")
        
    save_json(FB_PRESETS_FILE, data)
    return {"status": "success"}

@router.post("/api/fb_presets/default/{name}")
async def set_default_fb_preset(name: str):
    data = load_json(FB_PRESETS_FILE)
    if "presets" in data and name in data["presets"]:
        data["default"] = name
        save_json(FB_PRESETS_FILE, data)
        return {"status": "success"}
    return {"status": "not_found"}

@router.delete("/api/fb_presets/{name}")
async def delete_fb_preset(name: str):
    data = load_json(FB_PRESETS_FILE)
    if "presets" in data and name in data["presets"]:
        del data["presets"][name]
        if data.get("default") == name: data["default"] = ""
        save_json(FB_PRESETS_FILE, data)
        return {"status": "success"}
    return {"status": "not_found"}

# --- ALERT PRESET APIs ---

@router.get("/api/alert_presets")
async def get_alert_presets():
    return load_json(ALERT_PRESETS_FILE)

@router.post("/api/alert_presets")
async def save_alert_preset(payload: Dict[str, Any]):
    data = load_json(ALERT_PRESETS_FILE)
    if "presets" not in data: data["presets"] = {}
    
    # Payload: { name: "Nursery", config: { text: "...", targets: [], position: "top", color: "..." } }
    data["presets"][payload.get("name")] = payload.get("config")
    
    save_json(ALERT_PRESETS_FILE, data)
    return {"status": "success"}

@router.delete("/api/alert_presets/{name}")
async def delete_alert_preset(name: str):
    data = load_json(ALERT_PRESETS_FILE)
    if "presets" in data and name in data["presets"]:
        del data["presets"][name]
        save_json(ALERT_PRESETS_FILE, data)
        return {"status": "success"}
    return {"status": "not_found"}
