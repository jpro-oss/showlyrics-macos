import os
from fastapi import APIRouter, BackgroundTasks
from fastapi.responses import FileResponse, Response

import background_tasks as bg_tasks
from config import (
    load_json, get_resource_path,
    PHOTOS_FILE, THUMBS_DIR, PRESENTATION_DIR,
)

router = APIRouter()

# ------------------------------------------------------------------
# THUMBNAIL UNIVERSAL
# ------------------------------------------------------------------

@router.get("/api/media/thumb/{category}/{item_id}")
async def get_media_thumb(category: str, item_id: str, background_tasks: BackgroundTasks):
    # Thumbnail belum siap: tidak di-cache agar client bisa retry
    no_cache = {"Cache-Control": "no-store, no-cache, must-revalidate, max-age=0"}
    # Thumbnail sudah siap: cache 1 jam, immutable — thumbnail tidak berubah setelah dibuat
    long_cache = {"Cache-Control": "public, max-age=3600, immutable"}

    if category == "video":
        thumb_path = os.path.join(THUMBS_DIR, f"{item_id}.jpg")
        if os.path.exists(thumb_path):
            return FileResponse(thumb_path, media_type="image/jpeg",
                                content_disposition_type="inline", headers=long_cache)

    elif category == "photo":
        thumb_path = os.path.join(THUMBS_DIR, f"photo_{item_id}.jpg")
        if os.path.exists(thumb_path):
            return FileResponse(thumb_path, media_type="image/jpeg",
                                content_disposition_type="inline", headers=long_cache)

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
                                content_disposition_type="inline", headers=no_cache)

    elif category == "presentation":
        thumb_path = os.path.join(PRESENTATION_DIR, item_id, "slide_1_thumb.jpg")
        if not os.path.exists(thumb_path):
            thumb_path = os.path.join(PRESENTATION_DIR, item_id, "slide_1_thumb.png")
        if not os.path.exists(thumb_path):
            thumb_path = os.path.join(PRESENTATION_DIR, item_id, "slide_1.jpg")
        if not os.path.exists(thumb_path):
            thumb_path = os.path.join(PRESENTATION_DIR, item_id, "slide_1.png")
        if os.path.exists(thumb_path):
            ext = os.path.splitext(thumb_path)[1].lower()
            mtype = "image/png" if ext == ".png" else "image/jpeg"
            return FileResponse(thumb_path, media_type=mtype,
                                content_disposition_type="inline", headers=long_cache)

    # Fallback logo
    return FileResponse(get_resource_path("static/logo.png"), media_type="image/png",
                        content_disposition_type="inline", headers=no_cache)


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
