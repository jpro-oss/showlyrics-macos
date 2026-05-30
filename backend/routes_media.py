# routes_media.py
# ============================================================
# API untuk semua media: video background, audio, foto,
# presentasi (PDF/PPTX), thumbnail, dan streaming.
# Dipisah dari main.py untuk keterbacaan yang lebih baik.
# ============================================================

import os
import re
import uuid
from typing import Any

from fastapi import APIRouter, Request, BackgroundTasks
from fastapi.responses import FileResponse, Response, StreamingResponse

import background_tasks as bg_tasks
from config import (
    load_json, save_json, get_resource_path,
    BACKGROUNDS_FILE, AUDIOS_FILE, PHOTOS_FILE, PRESENTATIONS_FILE,
    THUMBS_DIR, PRESENTATION_DIR,
)

router = APIRouter()


# ------------------------------------------------------------------
# HELPER
# ------------------------------------------------------------------

def get_media_db_path(category: str) -> str:
    if category == "audio":
        return AUDIOS_FILE
    if category == "photo":
        return PHOTOS_FILE
    if category == "presentation":
        return PRESENTATIONS_FILE
    return BACKGROUNDS_FILE  # default: video


def get_allowed_extensions(category: str) -> tuple:
    if category == "audio":
        return (".mp3", ".wav", ".m4a", ".aac", ".ogg")
    if category == "photo":
        return (".jpg", ".jpeg", ".png", ".gif", ".webp")
    if category == "presentation":
        return (".pdf", ".pptx")
    return (".mp4", ".webm", ".mov")  # default: video


# ------------------------------------------------------------------
# CAMERA SETTINGS
# ------------------------------------------------------------------

# Catatan: manager di-inject dari main.py via routes_settings.init_manager()
_manager = None

def init_manager(m):
    global _manager
    _manager = m


# ------------------------------------------------------------------
# UNIVERSAL MEDIA GET
# ------------------------------------------------------------------

@router.get("/api/media/{category}")
async def get_media_category(category: str):
    if category == "audio":
        return load_json(AUDIOS_FILE)
    elif category == "photo":
        return load_json(PHOTOS_FILE)
    elif category == "presentation":
        return load_json(PRESENTATIONS_FILE)
    else:
        # Default: video backgrounds
        db = load_json(BACKGROUNDS_FILE)
        if "videos" in db:
            db["items"] = db.pop("videos")
        if "folders" not in db:
            db["folders"] = ["ALL"]
        return db


# ------------------------------------------------------------------
# PRESENTATION: SLIDE COUNT & SINGLE SLIDE
# ------------------------------------------------------------------

@router.get("/api/media/presentation/{media_id}/slides")
async def get_presentation_slides(media_id: str):
    """Mengembalikan total jumlah slide untuk presentasi tertentu."""
    slide_folder = os.path.join(PRESENTATION_DIR, media_id)
    if not os.path.exists(slide_folder):
        return {"count": 0, "slides": []}

    slides = []
    i = 1
    while True:
        if os.path.exists(os.path.join(slide_folder, f"slide_{i}.png")) or \
           os.path.exists(os.path.join(slide_folder, f"slide_{i}.jpg")):
            slides.append(i)
            i += 1
        else:
            break

    return {"count": len(slides), "slides": slides}


@router.get("/api/media/presentation/{media_id}/slide/{slide_num}")
async def get_presentation_slide(media_id: str, slide_num: int):
    """Serve satu file gambar slide berdasarkan nomor."""
    cache_headers = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    slide_folder = os.path.join(PRESENTATION_DIR, media_id)

    png_path = os.path.join(slide_folder, f"slide_{slide_num}.png")
    jpg_path = os.path.join(slide_folder, f"slide_{slide_num}.jpg")

    if os.path.exists(png_path):
        return FileResponse(png_path, media_type="image/png", headers=cache_headers)
    elif os.path.exists(jpg_path):
        return FileResponse(jpg_path, media_type="image/jpeg", headers=cache_headers)

    return Response(status_code=404)


# ------------------------------------------------------------------
# THUMBNAIL UNIVERSAL
# ------------------------------------------------------------------

@router.get("/api/media/thumb/{category}/{item_id}")
async def get_media_thumb(category: str, item_id: str, background_tasks: BackgroundTasks):
    cache_headers = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}

    if category == "video":
        thumb_path = os.path.join(THUMBS_DIR, f"{item_id}.jpg")
        if os.path.exists(thumb_path):
            return FileResponse(thumb_path, media_type="image/jpeg",
                                content_disposition_type="inline", headers=cache_headers)

    elif category == "photo":
        thumb_path = os.path.join(THUMBS_DIR, f"photo_{item_id}.jpg")
        if os.path.exists(thumb_path):
            return FileResponse(thumb_path, media_type="image/jpeg",
                                content_disposition_type="inline", headers=cache_headers)

        # Fallback ke file asli & trigger generate thumbnail di background
        db = load_json(PHOTOS_FILE)
        item = db.get("items", {}).get(item_id)
        if item and os.path.exists(item["file_path"]):
            background_tasks.add_task(
                bg_tasks.generate_photo_thumbnail_task, item["file_path"], thumb_path, item_id
            )
            ext = os.path.splitext(item["file_path"])[1].lower()
            mtype = "image/png" if ext == ".png" else "image/jpeg"
            return FileResponse(item["file_path"], media_type=mtype,
                                content_disposition_type="inline", headers=cache_headers)

    elif category == "presentation":
        thumb_path = os.path.join(PRESENTATION_DIR, item_id, "slide_1.png")
        if not os.path.exists(thumb_path):
            thumb_path = os.path.join(PRESENTATION_DIR, item_id, "slide_1.jpg")
        if os.path.exists(thumb_path):
            ext = os.path.splitext(thumb_path)[1].lower()
            mtype = "image/png" if ext == ".png" else "image/jpeg"
            return FileResponse(thumb_path, media_type=mtype,
                                content_disposition_type="inline", headers=cache_headers)

    # Fallback logo
    return FileResponse(get_resource_path("static/logo.png"), media_type="image/png",
                        content_disposition_type="inline", headers=cache_headers)


@router.get("/api/media/thumb_status/{category}/{item_id}")
async def get_media_thumb_status(category: str, item_id: str):
    ready = False
    if category == "video":
        thumb_path = os.path.join(THUMBS_DIR, f"{item_id}.jpg")
        ready = os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0
    elif category == "presentation":
        ready = (
            os.path.exists(os.path.join(PRESENTATION_DIR, item_id, "slide_1.png")) or
            os.path.exists(os.path.join(PRESENTATION_DIR, item_id, "slide_1.jpg"))
        )
    elif category == "photo":
        thumb_path = os.path.join(THUMBS_DIR, f"photo_{item_id}.jpg")
        ready = os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0

    return {"status": "success", "ready": ready, "id": item_id, "category": category}


# ------------------------------------------------------------------
# LEGACY THUMBNAIL ROUTE
# ------------------------------------------------------------------

@router.get("/thumbs/{video_id}")
async def get_thumbnail(video_id: str):
    thumb_path = os.path.join(THUMBS_DIR, f"{video_id}.jpg")
    cache_headers = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    if os.path.exists(thumb_path):
        return FileResponse(thumb_path, headers=cache_headers)
    return FileResponse(get_resource_path("static/logo.png"), headers=cache_headers)


# ------------------------------------------------------------------
# STREAMING: VIDEO (RANGE REQUEST SUPPORT), AUDIO, PHOTO
# ------------------------------------------------------------------

@router.get("/api/stream_video/{video_id}")
async def stream_video(video_id: str, request: Request):
    db = load_json(BACKGROUNDS_FILE)

    # Support database lama ('videos') dan baru ('items')
    video_data = db.get("videos", {}).get(video_id) or db.get("items", {}).get(video_id)

    if not video_data:
        return {"error": "Video tidak ada di database"}

    video_path = video_data.get("video_path", video_data.get("file_path"))

    if not video_path or not os.path.exists(video_path):
        return {"error": "File asli dihapus atau dipindahkan dari Windows"}

    file_size = os.path.getsize(video_path)
    range_header = request.headers.get("range")

    if range_header:
        byte1, byte2 = 0, None
        match = re.search(r"bytes=(\d+)-(\d*)", range_header)
        if match:
            byte1 = int(match.group(1))
            if match.group(2):
                byte2 = int(match.group(2))

        chunk_size = 1024 * 1024 * 4  # 4MB
        if byte2 is None:
            byte2 = min(byte1 + chunk_size - 1, file_size - 1)

        length = byte2 - byte1 + 1

        with open(video_path, "rb") as f:
            f.seek(byte1)
            data = f.read(length)

        headers = {
            "Content-Range": f"bytes {byte1}-{byte2}/{file_size}",
            "Accept-Ranges": "bytes",
            "Content-Length": str(length),
            "Content-Type": "video/mp4",
        }
        return Response(content=data, status_code=206, headers=headers)

    return FileResponse(video_path, media_type="video/mp4")


@router.get("/api/stream_audio/{item_id}")
def stream_audio(item_id: str):
    db = load_json(AUDIOS_FILE)
    item = db.get("items", {}).get(item_id)
    if item and os.path.exists(item["file_path"]):
        return FileResponse(item["file_path"])
    return Response(status_code=404)


@router.get("/api/stream_photo/{item_id}")
def stream_photo(item_id: str):
    db = load_json(PHOTOS_FILE)
    item = db.get("items", {}).get(item_id)
    if item and os.path.exists(item["file_path"]):
        return FileResponse(item["file_path"])
    return Response(status_code=404)


# ------------------------------------------------------------------
# LEGACY BACKGROUNDS API
# ------------------------------------------------------------------

@router.get("/api/backgrounds")
async def get_backgrounds():
    db = load_json(BACKGROUNDS_FILE)
    if "folders" not in db:
        db = {"folders": [], "videos": {}}
    return db


@router.post("/api/backgrounds/add_folder")
async def add_bg_folder(folder_path: str, background_tasks: BackgroundTasks):
    if not os.path.exists(folder_path):
        return {"status": "error", "message": "Folder tidak ditemukan!"}

    db = load_json(BACKGROUNDS_FILE)

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
            exists = any(
                v.get("video_path", v.get("file_path")) == video_full_path
                for v in db["items"].values()
            )
            if not exists:
                video_id = str(uuid.uuid4())[:8]
                thumb_full_path = os.path.join(THUMBS_DIR, f"{video_id}.jpg")
                db["items"][video_id] = {
                    "id": video_id, "name": file, "folder": folder_path,
                    "video_path": video_full_path, "file_path": video_full_path,
                }
                background_tasks.add_task(
                    bg_tasks.generate_thumbnail_task, video_full_path, thumb_full_path, video_id, "video"
                )
                count += 1
                created_ids.append(video_id)

    save_json(BACKGROUNDS_FILE, db)
    return {"status": "success", "message": f"Folder ditambahkan! {count} Video diproses.", "created_ids": created_ids}


@router.post("/api/backgrounds/create_folder")
async def create_bg_folder(request: Request):
    payload = await request.json()
    folder_name = payload.get("folder_name", "").strip()

    if not folder_name:
        return {"status": "error", "message": "Nama folder kosong!"}

    db = load_json(BACKGROUNDS_FILE)
    if "folders" not in db:
        db = {"folders": [], "videos": {}}

    if folder_name not in db["folders"]:
        db["folders"].append(folder_name)
        save_json(BACKGROUNDS_FILE, db)
        return {"status": "success", "message": "Folder virtual berhasil dibuat!"}

    return {"status": "error", "message": "Folder sudah ada!"}


@router.post("/api/backgrounds/add_files")
async def add_bg_files(request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    files = payload.get("files", [])
    folder_name = payload.get("folder_name", "Uncategorized")

    db = load_json(BACKGROUNDS_FILE)

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
            exists = any(
                v.get("video_path", v.get("file_path")) == file_path
                for v in db["items"].values()
            )
            if not exists:
                video_id = str(uuid.uuid4())[:8]
                thumb_full_path = os.path.join(THUMBS_DIR, f"{video_id}.jpg")
                db["items"][video_id] = {
                    "id": video_id,
                    "name": filename,
                    "folder": folder_name if folder_name != "ALL" else "Uncategorized",
                    "video_path": file_path,
                    "file_path": file_path,
                }
                background_tasks.add_task(
                    bg_tasks.generate_thumbnail_task, file_path, thumb_full_path, video_id, "video"
                )
                count += 1
                created_ids.append(video_id)

    save_json(BACKGROUNDS_FILE, db)
    return {"status": "success", "message": f"{count} File berhasil di-link ke folder '{folder_name}'!", "created_ids": created_ids}


@router.delete("/api/backgrounds/folder/{folder_name:path}")
async def delete_bg_folder(folder_name: str):
    db = load_json(BACKGROUNDS_FILE)
    if "folders" in db and folder_name in db["folders"]:
        db["folders"].remove(folder_name)

        videos_to_delete = [
            vid_id for vid_id, vid_data in db.get("videos", {}).items()
            if vid_data.get("folder") == folder_name
        ]
        for vid_id in videos_to_delete:
            del db["videos"][vid_id]

        save_json(BACKGROUNDS_FILE, db)
        return {"status": "success", "message": f"Folder dan {len(videos_to_delete)} video di dalamnya dihapus!"}

    return {"status": "error", "message": "Folder tidak ditemukan"}


@router.delete("/api/backgrounds/video/{video_id}")
async def delete_bg_video(video_id: str):
    db = load_json(BACKGROUNDS_FILE)
    if "videos" in db and video_id in db["videos"]:
        del db["videos"][video_id]
        save_json(BACKGROUNDS_FILE, db)
        return {"status": "success", "message": "Video dihapus dari Library"}
    return {"status": "error", "message": "Video tidak ditemukan"}


@router.put("/api/backgrounds/video/{video_id}/move")
async def move_bg_video(video_id: str, request: Request):
    payload = await request.json()
    new_folder = payload.get("new_folder", "Uncategorized").strip()

    db = load_json(BACKGROUNDS_FILE)
    if "folders" not in db:
        db["folders"] = []

    if new_folder not in db["folders"] and new_folder not in ["ALL", "Uncategorized"]:
        db["folders"].append(new_folder)

    if "videos" in db and video_id in db["videos"]:
        db["videos"][video_id]["folder"] = new_folder
        save_json(BACKGROUNDS_FILE, db)
        return {"status": "success", "message": "Video dipindahkan!"}

    return {"status": "error", "message": "Video tidak ditemukan"}


# ------------------------------------------------------------------
# UNIVERSAL MEDIA CRUD (POST add_folder, add_files, rename, move, delete)
# ------------------------------------------------------------------

@router.post("/api/media/{category}/create_folder")
async def create_media_folder(category: str, request: Request):
    payload = await request.json()
    folder_name = payload.get("folder_name", "").strip()

    if not folder_name:
        return {"status": "error", "message": "Nama folder kosong!"}

    db_path = get_media_db_path(category)
    db = load_json(db_path)

    if "folders" not in db:
        db["folders"] = ["ALL"]
    if "items" not in db:
        db["items"] = {}

    if folder_name not in db["folders"]:
        db["folders"].append(folder_name)
        save_json(db_path, db)
        return {"status": "success", "message": f"Folder '{folder_name}' dibuat!"}

    return {"status": "error", "message": "Folder sudah ada!"}


@router.post("/api/media/{category}/add_files")
async def add_media_files(category: str, request: Request, background_tasks: BackgroundTasks):
    payload = await request.json()
    files = payload.get("files", [])
    folder_name = payload.get("folder_name", "Uncategorized")

    db_path = get_media_db_path(category)
    db = load_json(db_path)

    if "folders" not in db:
        db["folders"] = ["ALL"]
    if "items" not in db:
        db["items"] = {}
    if folder_name not in db["folders"] and folder_name != "ALL":
        db["folders"].append(folder_name)

    count = 0
    created_ids = []
    for file_path in files:
        file_path = file_path.replace("\\", "/")
        if os.path.exists(file_path):
            filename = os.path.basename(file_path)
            exists = any(
                v.get("file_path", v.get("video_path")) == file_path
                for v in db["items"].values()
            )
            if not exists:
                item_id = str(uuid.uuid4())[:8]
                db["items"][item_id] = {
                    "id": item_id,
                    "name": filename,
                    "folder": folder_name if folder_name != "ALL" else "Uncategorized",
                    "file_path": file_path,
                }

                if category == "video":
                    thumb_full_path = os.path.join(THUMBS_DIR, f"{item_id}.jpg")
                    db["items"][item_id]["video_path"] = file_path
                    background_tasks.add_task(
                        bg_tasks.generate_thumbnail_task, file_path, thumb_full_path, item_id, "video"
                    )
                elif category == "photo":
                    thumb_full_path = os.path.join(THUMBS_DIR, f"photo_{item_id}.jpg")
                    background_tasks.add_task(
                        bg_tasks.generate_photo_thumbnail_task, file_path, thumb_full_path, item_id
                    )
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


@router.post("/api/media/{category}/add_folder")
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

    valid_ext = get_allowed_extensions(category)
    count = 0
    created_ids = []

    for file in os.listdir(folder_path):
        if file.lower().endswith(valid_ext):
            file_full_path = os.path.join(folder_path, file).replace("\\", "/")
            exists = any(
                v.get("file_path", v.get("video_path")) == file_full_path
                for v in db["items"].values()
            )
            if not exists:
                item_id = str(uuid.uuid4())[:8]
                db["items"][item_id] = {
                    "id": item_id, "name": file,
                    "folder": folder_path, "file_path": file_full_path,
                }

                if category == "video":
                    thumb_full_path = os.path.join(THUMBS_DIR, f"{item_id}.jpg")
                    db["items"][item_id]["video_path"] = file_full_path
                    background_tasks.add_task(
                        bg_tasks.generate_thumbnail_task, file_full_path, thumb_full_path, item_id, "video"
                    )
                elif category == "photo":
                    thumb_full_path = os.path.join(THUMBS_DIR, f"photo_{item_id}.jpg")
                    background_tasks.add_task(
                        bg_tasks.generate_photo_thumbnail_task, file_full_path, thumb_full_path, item_id
                    )
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


@router.put("/api/media/{category}/rename_file/{item_id}")
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


@router.put("/api/media/{category}/rename_folder")
async def rename_media_folder(category: str, request: Request):
    payload = await request.json()
    old_name = payload.get("old_name", "")
    new_name = payload.get("new_name", "").strip()
    db_path = get_media_db_path(category)
    db = load_json(db_path)

    if old_name in db.get("folders", []):
        db["folders"] = [new_name if f == old_name else f for f in db["folders"]]
        for item in db.get("items", {}).values():
            if item.get("folder") == old_name:
                item["folder"] = new_name
        save_json(db_path, db)
        return {"status": "success"}
    return {"status": "error"}


@router.delete("/api/media/{category}/file/{item_id}")
async def delete_media_file(category: str, item_id: str):
    import shutil
    db_path = get_media_db_path(category)
    db = load_json(db_path)

    is_deleted = False

    # Support database lama 'videos'
    if category == "video" and "videos" in db and item_id in db["videos"]:
        del db["videos"][item_id]
        is_deleted = True

    if "items" in db and item_id in db["items"]:
        del db["items"][item_id]
        is_deleted = True

    if is_deleted:
        save_json(db_path, db)
        # Hapus cache thumbnail/slide
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


@router.delete("/api/media/{category}/folder/{folder_name:path}")
async def delete_media_folder(category: str, folder_name: str):
    db_path = get_media_db_path(category)
    db = load_json(db_path)

    if "folders" in db and folder_name in db["folders"]:
        db["folders"].remove(folder_name)
        items_to_delete = [
            k for k, v in db.get("items", {}).items()
            if v.get("folder") == folder_name
        ]
        for k in items_to_delete:
            del db["items"][k]

        save_json(db_path, db)
        return {"status": "success"}

    return {"status": "error"}


@router.put("/api/media/{category}/move_file/{item_id}")
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
