import os
import asyncio
from fastapi import APIRouter, Request, Response
from fastapi.responses import FileResponse, StreamingResponse
from config import load_json, BACKGROUNDS_FILE, AUDIOS_FILE, PHOTOS_FILE, PRESENTATION_DIR
from routes_media_helper import video_ram_cache, active_reads, _stream_bytes, parse_range_header

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

    # If the file is small/medium, use RAM cache for instant, zero disk I/O serving
    if file_size <= video_ram_cache.max_file_size:
        cached = video_ram_cache.get(video_path)
        if cached is None:
            loop = asyncio.get_event_loop()
            if video_path not in active_reads:
                async def read_and_cache():
                    try:
                        def read_file_sync():
                            with open(video_path, "rb") as f:
                                return f.read()
                        file_bytes = await loop.run_in_executor(None, read_file_sync)
                        video_ram_cache.put(video_path, file_bytes)
                        return (file_bytes, len(file_bytes))
                    finally:
                        active_reads.pop(video_path, None)
                active_reads[video_path] = asyncio.create_task(read_and_cache())
            
            try:
                cached = await active_reads[video_path]
            except Exception:
                # Fallback to standard FileResponse on any read exception
                return FileResponse(
                    video_path,
                    media_type="video/mp4",
                    headers={
                        "Accept-Ranges": "bytes",
                        "Cache-Control": "public, max-age=31536000",
                        "Access-Control-Allow-Origin": "*",
                    }
                )

        file_bytes, file_size = cached

        if range_header:
            start, end = parse_range_header(range_header, file_size)
            if start >= file_size:
                return Response(
                    status_code=416,
                    headers={
                        "Content-Range": f"bytes */{file_size}",
                        "Access-Control-Allow-Origin": "*",
                    }
                )
            
            chunk = file_bytes[start : end + 1]
            headers = {
                "Content-Range": f"bytes {start}-{end}/{file_size}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(len(chunk)),
                "Cache-Control": "public, max-age=31536000",
                "Access-Control-Allow-Origin": "*",
            }
            return Response(content=chunk, status_code=206, media_type="video/mp4", headers=headers)
        else:
            # Full request dari non-range request (biasanya dari Service Worker preload)
            # KRITIS: Gunakan StreamingResponse + chunked yield agar event loop tidak terblokir!
            # Response(content=file_bytes) untuk file 300MB akan memblokir event loop beberapa detik.
            headers = {
                "Accept-Ranges": "bytes",
                "Content-Length": str(file_size),
                "Cache-Control": "public, max-age=31536000",
                "Access-Control-Allow-Origin": "*",
            }
            return StreamingResponse(
                _stream_bytes(file_bytes),
                status_code=200,
                media_type="video/mp4",
                headers=headers
            )
    else:
        # Fallback to Starlette FileResponse for giant video files
        return FileResponse(
            video_path,
            media_type="video/mp4",
            headers={
                "Accept-Ranges": "bytes",
                "Cache-Control": "public, max-age=31536000",
                "Access-Control-Allow-Origin": "*",
            }
        )


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
