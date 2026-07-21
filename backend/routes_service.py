# routes_service.py
# ============================================================
# API untuk lagu, jadwal ibadah, running order,
# import/export bundle, dan pengaturan subtitle global.
# Dipisah dari main.py untuk keterbacaan yang lebih baik.
# ============================================================

import os
import io
import json
import zipfile
from typing import List, Dict, Any, Optional

from fastapi import APIRouter, UploadFile, File
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from config import (
    load_json, save_json,
    SONGS_FILE, SERVICE_FILE, SCHEDULES_FILE, DISPLAY_PRESETS_FILE,
)

router = APIRouter()


# ------------------------------------------------------------------
# PYDANTIC MODELS
# ------------------------------------------------------------------

class Song(BaseModel):
    title: str
    data: List[Dict[str, Any]]
    settings: Optional[Dict[str, Any]] = {}


class SavedSchedule(BaseModel):
    name: str
    items: List[dict]


# ------------------------------------------------------------------
# SONGS
# ------------------------------------------------------------------

@router.get("/api/songs")
def get_songs():
    return load_json(SONGS_FILE)


@router.post("/api/songs")
def save_song(song: Song):
    songs = load_json(SONGS_FILE)
    existing_index = next(
        (i for i, d in enumerate(songs) if d["title"] == song.title), None
    )
    if existing_index is not None:
        songs[existing_index] = song.dict()
    else:
        songs.append(song.dict())
    save_json(SONGS_FILE, songs)
    return {"status": "success"}


@router.delete("/api/songs/{title}")
def delete_song(title: str):
    songs = load_json(SONGS_FILE)
    songs = [s for s in songs if s["title"] != title]
    save_json(SONGS_FILE, songs)
    return {"status": "success"}


# ------------------------------------------------------------------
# SERVICE (Running Order)
# ------------------------------------------------------------------

@router.get("/api/service")
async def get_service():
    return load_json(SERVICE_FILE)


@router.post("/api/service")
async def save_service(items: List[dict]):
    save_json(SERVICE_FILE, items)
    return {"status": "success"}


# ------------------------------------------------------------------
# SCHEDULES
# ------------------------------------------------------------------

@router.get("/api/schedules")
async def get_schedules():
    return load_json(SCHEDULES_FILE)


@router.post("/api/schedules")
async def save_schedule_named(sched: SavedSchedule):
    data = load_json(SCHEDULES_FILE)
    data[sched.name] = sched.items
    save_json(SCHEDULES_FILE, data)
    return {"status": "success"}


@router.delete("/api/schedules/{name}")
async def delete_schedule_named(name: str):
    data = load_json(SCHEDULES_FILE)
    if name in data:
        del data[name]
    save_json(SCHEDULES_FILE, data)
    return {"status": "success"}


# ------------------------------------------------------------------
# IMPORT SONGS (TXT)
# ------------------------------------------------------------------

@router.post("/import_songs")
async def import_songs(files: List[UploadFile] = File(...)):
    new_songs = []
    current_songs = load_json(SONGS_FILE)
    count_success = 0

    for file in files:
        if file.filename.endswith(".txt"):
            try:
                content = await file.read()
                try:
                    text = content.decode("utf-8")
                except Exception:
                    text = content.decode("latin-1", errors="ignore")

                # Normalisasi line endings
                text = text.replace("\r\n", "\n").replace("\r", "\n")

                # Split per baris — setiap baris non-kosong = 1 slide
                raw_slides = text.split("\n")
                final_slides = [s.strip() for s in raw_slides if s.strip()]

                if final_slides:
                    title = os.path.splitext(file.filename)[0]
                    song_obj = {
                        "title": title,
                        "data": [
                            {"id": i, "text": txt, "type": "normal"}
                            for i, txt in enumerate(final_slides)
                        ],
                        "settings": {},
                    }
                    new_songs.append(song_obj)
                    count_success += 1
            except Exception as e:
                print(f"Error {file.filename}: {e}")

    if new_songs:
        existing_titles = [s["title"] for s in new_songs]
        current_songs = [s for s in current_songs if s["title"] not in existing_titles]
        current_songs.extend(new_songs)
        save_json(SONGS_FILE, current_songs)

    return {"status": "success", "count": count_success}


# ------------------------------------------------------------------
# EXPORT / IMPORT BUNDLE
# ------------------------------------------------------------------

@router.get("/api/export_bundle/{schedule_name}")
async def export_bundle(schedule_name: str):
    try:
        all_schedules = load_json(SCHEDULES_FILE)

        if schedule_name not in all_schedules:
            return {"error": "Schedule tidak ditemukan"}

        sched_data = all_schedules[schedule_name]
        all_songs = load_json(SONGS_FILE)

        songs_to_export = []
        for item in sched_data:
            song_title = item.get("title") if isinstance(item, dict) else item
            found_song = next((s for s in all_songs if s["title"] == song_title), None)
            if found_song:
                songs_to_export.append(found_song)

        memory_file = io.BytesIO()
        with zipfile.ZipFile(memory_file, "w", zipfile.ZIP_DEFLATED) as zf:
            export_data = {
                "schedule_name": schedule_name,
                "schedule_items": sched_data,
                "songs_data": songs_to_export,
            }
            zf.writestr("bundle.json", json.dumps(export_data, indent=2))

        memory_file.seek(0)
        return StreamingResponse(
            memory_file,
            media_type="application/zip",
            headers={
                "Content-Disposition": f'attachment; filename="{schedule_name}_bundle.zip"'
            },
        )
    except Exception as e:
        print(f"ERROR EXPORT: {str(e)}")
        return {"error": f"Internal Server Error: {str(e)}"}


@router.post("/api/import_bundle")
async def import_bundle(file: UploadFile = File(...)):
    if not file.filename.endswith(".zip"):
        return {"status": "error", "message": "File harus format .zip"}

    try:
        content = await file.read()

        with zipfile.ZipFile(io.BytesIO(content)) as zf:
            if "bundle.json" not in zf.namelist():
                return {
                    "status": "error",
                    "message": "File ZIP tidak valid (bundle.json tidak ditemukan)",
                }

            bundle_data = json.loads(zf.read("bundle.json"))

            sched_name = bundle_data.get("schedule_name")
            sched_items = bundle_data.get("schedule_items")
            songs_data = bundle_data.get("songs_data", [])

            # Simpan schedule
            all_schedules = load_json(SCHEDULES_FILE)
            all_schedules[sched_name] = sched_items
            save_json(SCHEDULES_FILE, all_schedules)

            # Simpan songs (merge, no duplicate)
            all_songs = load_json(SONGS_FILE)
            for new_song in songs_data:
                existing_index = next(
                    (i for i, d in enumerate(all_songs) if d["title"] == new_song["title"]),
                    None,
                )
                if existing_index is not None:
                    all_songs[existing_index] = new_song
                else:
                    all_songs.append(new_song)
            save_json(SONGS_FILE, all_songs)

        return {
            "status": "success",
            "message": f"Bundle '{sched_name}' berhasil di-import! {len(songs_data)} lagu telah ditambahkan/diupdate.",
        }

    except Exception as e:
        print(f"ERROR IMPORT: {str(e)}")
        return {"status": "error", "message": f"Gagal Import: {str(e)}"}


# ------------------------------------------------------------------
# GLOBAL BILINGUAL SUB SETTINGS
# ------------------------------------------------------------------

@router.get("/api/global_sub_settings")
async def get_global_sub_settings():
    data = load_json(DISPLAY_PRESETS_FILE)
    return data.get("global_sub_lang", {"color": "#ffc107", "size": 0.6})


@router.post("/api/global_sub_settings")
async def save_global_sub_settings(payload: Dict[str, Any]):
    data = load_json(DISPLAY_PRESETS_FILE)
    data["global_sub_lang"] = payload
    save_json(DISPLAY_PRESETS_FILE, data)
    return {"status": "success"}


# ------------------------------------------------------------------
# NETWORK GUARD — Manual Retry Check
# ------------------------------------------------------------------

import asyncio as _asyncio


@router.post("/api/network/retry-check")
async def retry_network_check():
    """
    Dipanggil dari frontend ketika user klik 'Coba Lagi' di modal CDN blocked.
    Re-evaluasi koneksi CDN (3 retry — akurat) dan broadcast hasilnya ke semua client.

    CDN check first:
      - CDN OK   → ONLINE_FULL → reset strike → dismiss modal (broadcast "network_restored")
      - CDN fail → cek 4 fallback → tentukan status baru → broadcast sesuai

    Return JSON untuk frontend agar bisa update tombol Coba Lagi.
    """
    import network_guard
    status = await _asyncio.to_thread(network_guard.evaluate_connectivity, False)
    return {
        "status":         status.status.value,
        "cdn_ok":         status.cdn_reachable,
        "internet_score": (
            f"{status.internet.score}/{status.internet.total}"
            if status.internet else "0/4"
        ),
        "cdn_latency_ms": status.cdn_latency_ms,
        "blocked_reason": status.blocked_reason,
    }

