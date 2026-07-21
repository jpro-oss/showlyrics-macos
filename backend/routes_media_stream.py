import os
import asyncio
from fastapi import APIRouter, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from config import load_json, BACKGROUNDS_FILE, AUDIOS_FILE, PHOTOS_FILE, PRESENTATION_DIR

router = APIRouter()

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
async def get_presentation_slide(media_id: str, slide_num: int, thumb: bool = False):
    """Serve satu file gambar slide berdasarkan nomor."""
    # Slide tidak berubah setelah diekstrak — cache 1 jam aman
    slide_cache = {"Cache-Control": "public, max-age=3600, immutable"}
    slide_folder = os.path.join(PRESENTATION_DIR, media_id)

    if thumb:
        thumb_jpg_path = os.path.join(slide_folder, f"slide_{slide_num}_thumb.jpg")
        thumb_png_path = os.path.join(slide_folder, f"slide_{slide_num}_thumb.png")
        if os.path.exists(thumb_jpg_path):
            return FileResponse(thumb_jpg_path, media_type="image/jpeg", headers=slide_cache)
        elif os.path.exists(thumb_png_path):
            return FileResponse(thumb_png_path, media_type="image/png", headers=slide_cache)

    png_path = os.path.join(slide_folder, f"slide_{slide_num}.png")
    jpg_path = os.path.join(slide_folder, f"slide_{slide_num}.jpg")

    if os.path.exists(png_path):
        return FileResponse(png_path, media_type="image/png", headers=slide_cache)
    elif os.path.exists(jpg_path):
        return FileResponse(jpg_path, media_type="image/jpeg", headers=slide_cache)

    return Response(status_code=404)


# ------------------------------------------------------------------
# STREAMING: AUDIO, PHOTO
# ------------------------------------------------------------------


@router.get("/api/stream_audio/{item_id}")
def stream_audio(item_id: str):
    db = load_json(AUDIOS_FILE)
    item = db.get("items", {}).get(item_id)
    if item and os.path.exists(item["file_path"]):
        return FileResponse(
            item["file_path"],
            headers={
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=3600",
            }
        )
    return Response(status_code=404)


@router.get("/api/stream_photo/{item_id}")
def stream_photo(item_id: str):
    db = load_json(PHOTOS_FILE)
    item = db.get("items", {}).get(item_id)
    if item and os.path.exists(item["file_path"]):
        return FileResponse(
            item["file_path"],
            headers={"Cache-Control": "public, max-age=3600"}
        )
    return Response(status_code=404)


@router.get("/api/stream_video/{item_id}")
def stream_video(item_id: str):
    """Serve a video file from the backgrounds database with range request support."""
    db = load_json(BACKGROUNDS_FILE)
    items = db.get("videos", {}) if "videos" in db else db.get("items", {})
    item = items.get(item_id)
    if item:
        file_path = item.get("file_path", item.get("video_path", ""))
        if file_path and os.path.exists(file_path):
            return FileResponse(
                file_path,
                headers={
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=3600",
                }
            )
    return Response(status_code=404)
