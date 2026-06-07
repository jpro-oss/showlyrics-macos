import os
import sys
import glob
import shutil
import re
import asyncio
import subprocess
import hashlib
import fitz  # PyMuPDF
from config import load_json, save_json

# ConnectionManager instance placeholder, will be injected from main.py
manager = None

def get_ffmpeg_path():
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))
    
    ffmpeg_path = os.path.join(base_path, "ffmpeg.exe")
    if os.path.exists(ffmpeg_path):
        return ffmpeg_path
    return "ffmpeg"

def calculate_file_hash(file_path: str) -> str:
    """Calculate SHA256 hash of a file in chunks to optimize memory usage."""
    if not os.path.exists(file_path):
        return ""
    sha256_hash = hashlib.sha256()
    try:
        with open(file_path, "rb") as f:
            for byte_block in iter(lambda: f.read(65536), b""):
                sha256_hash.update(byte_block)
        return sha256_hash.hexdigest()
    except Exception as e:
        print(f"[HASH] Error hashing file {file_path}: {e}")
        return ""

def extract_video_metadata(video_path: str) -> dict:
    """Use ffmpeg to extract video duration and resolution without transcode."""
    metadata = {"duration": 0.0, "width": 0, "height": 0}
    if not os.path.exists(video_path):
        return metadata
    
    try:
        ffmpeg_bin = get_ffmpeg_path()
        creation_flags = subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
        
        # Run ffmpeg -i to print file info to stderr
        cmd = [ffmpeg_bin, "-hide_banner", "-i", video_path]
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=creation_flags
        )
        _, stderr_data = process.communicate()
        stderr_str = stderr_data.decode(errors="ignore")
        
        # Parse duration
        # Example: Duration: 00:01:23.45, start: ...
        duration_match = re.search(r"Duration:\s*(\d{2}):(\d{2}):(\d{2})\.(\d{2,3})", stderr_str)
        if duration_match:
            hours = int(duration_match.group(1))
            minutes = int(duration_match.group(2))
            seconds = int(duration_match.group(3))
            ms = int(duration_match.group(4))
            # Handle 2-digit vs 3-digit ms
            ms_val = ms / 100.0 if len(duration_match.group(4)) == 2 else ms / 1000.0
            total_sec = hours * 3600 + minutes * 60 + seconds + ms_val
            metadata["duration"] = round(total_sec, 3)
            
        # Parse resolution
        # Example: Stream #0:0(und): Video: h264 (High) (avc1 / 0x31637661), yuv420p, 1920x1080 [SAR 1:1 DAR 16:9], ...
        res_match = re.search(r"Video:.*?, (\d{3,4})x(\d{3,4})", stderr_str)
        if res_match:
            metadata["width"] = int(res_match.group(1))
            metadata["height"] = int(res_match.group(2))
            
        print(f"[METADATA] Extracted for {os.path.basename(video_path)}: {metadata}")
    except Exception as e:
        print(f"[METADATA] Error extracting metadata for {video_path}: {e}")
        
    return metadata

async def generate_thumbnail_task(video_path: str, thumb_path: str, item_id: str = None, category: str = "video"):
    os.makedirs(os.path.dirname(thumb_path), exist_ok=True)

    if os.path.exists(thumb_path): 
        if item_id and manager:
            await manager.broadcast({"type": "thumb_ready", "id": item_id, "category": category})
        return

    if not os.path.exists(video_path):
        print(f"[THUMB] Video not found: {video_path}")
        return
        
    try:
        ffmpeg_bin = get_ffmpeg_path()
        creation_flags = subprocess.CREATE_NO_WINDOW if hasattr(subprocess, "CREATE_NO_WINDOW") else 0
        seek_candidates = ["00:00:02.000", "00:00:01.000", "00:00:00.500", "00:00:00.000"]
        success = False

        for seek in seek_candidates:
            cmd = [
                ffmpeg_bin,
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-ss",
                seek,
                "-i",
                video_path,
                "-frames:v",
                "1",
                "-vf",
                "thumbnail,scale=320:-1",
                "-q:v",
                "3",
                thumb_path,
            ]

            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.PIPE,
                creationflags=creation_flags
            )
            _, stderr_data = await process.communicate()

            if process.returncode == 0 and os.path.exists(thumb_path) and os.path.getsize(thumb_path) > 0:
                success = True
                break

            if os.path.exists(thumb_path) and os.path.getsize(thumb_path) == 0:
                os.remove(thumb_path)

            if stderr_data:
                print(f"[THUMB] ffmpeg attempt failed ({seek}) for {video_path}: {stderr_data.decode(errors='ignore').strip()}")
        
        if item_id and success and os.path.exists(thumb_path) and manager:
            await manager.broadcast({"type": "thumb_ready", "id": item_id, "category": category})
        elif not success:
            print(f"[THUMB] Failed to generate thumbnail for {video_path}")
            
    except Exception as e:
        print(f"Error thumbnail: {e}")

async def generate_photo_thumbnail_task(photo_path: str, thumb_path: str, item_id: str = None):
    os.makedirs(os.path.dirname(thumb_path), exist_ok=True)

    if os.path.exists(thumb_path):
        if item_id and manager:
            await manager.broadcast({"type": "thumb_ready", "id": item_id, "category": "photo"})
        return

    if not os.path.exists(photo_path):
        print(f"[THUMB] Photo not found: {photo_path}")
        return

    try:
        def resize_photo():
            from PIL import Image
            with Image.open(photo_path) as img:
                if img.mode in ("RGBA", "P"):
                    img = img.convert("RGB")
                img.thumbnail((320, 180))
                img.save(thumb_path, "JPEG", quality=85)

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, resize_photo)

        if item_id and os.path.exists(thumb_path) and manager:
            await manager.broadcast({"type": "thumb_ready", "id": item_id, "category": "photo"})
            
    except Exception as e:
        print(f"[THUMB] Error generating photo thumbnail for {photo_path}: {e}")

def extract_pdf_sync(pdf_path: str, output_folder: str):
    try:
        os.makedirs(output_folder, exist_ok=True)
        doc = fitz.open(pdf_path)
        slide_count = len(doc)
        
        for i in range(slide_count):
            page = doc.load_page(i)
            pix = page.get_pixmap(dpi=150) 
            pix.save(os.path.join(output_folder, f"slide_{i+1}.jpg"))
            
        return {"status": "success", "slides": slide_count}
    except Exception as e:
        return {"status": "error", "message": str(e)}

async def extract_pdf_to_slides(pdf_path: str, output_folder: str, item_id: str):
    loop = asyncio.get_event_loop()
    res = await loop.run_in_executor(None, extract_pdf_sync, pdf_path, output_folder)
    
    if manager:
        if res.get("status") == "success":
            await manager.broadcast({
                "type": "presentation_ready",
                "id": item_id,
                "category": "presentation"
            })
        else:
            await manager.broadcast({
                "type": "presentation_failed",
                "id": item_id,
                "category": "presentation",
                "message": res.get("message", "Unknown error")
            })

def extract_pptx_sync(pptx_path: str, output_folder: str):
    import pythoncom
    import win32com.client
    
    pythoncom.CoInitialize()
    powerpoint = None
    pres = None
    try:
        if os.path.exists(output_folder):
            try: shutil.rmtree(output_folder)
            except: pass
        os.makedirs(output_folder, exist_ok=True)
        
        powerpoint = win32com.client.DispatchEx("Powerpoint.Application")
        powerpoint.DisplayAlerts = 1
        
        pres = powerpoint.Presentations.Open(
            FileName=os.path.normpath(os.path.abspath(pptx_path)),
            ReadOnly=1,
            Untitled=0,
            WithWindow=0
        )
        
        pres.Export(os.path.normpath(os.path.abspath(output_folder)), "JPG", 1920, 1080)
        pres.Close()
        pres = None
        
        slides = glob.glob(os.path.join(output_folder, "*"))
        
        def get_slide_num(filepath):
            m = re.search(r'\d+', os.path.basename(filepath))
            return int(m.group()) if m else 0
            
        slides_sorted = sorted(slides, key=get_slide_num)
        
        temp_files = []
        for idx, slide_file in enumerate(slides_sorted):
            temp_name = os.path.join(output_folder, f"temp_{idx+1}.jpg")
            shutil.move(slide_file, temp_name)
            temp_files.append(temp_name)
            
        for idx, temp_file in enumerate(temp_files):
            final_name = os.path.join(output_folder, f"slide_{idx+1}.jpg")
            shutil.move(temp_file, final_name)
                
        return {"status": "success"}
    except Exception as e:
        print(f"PPTX Extract Error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if pres:
            try: pres.Close()
            except: pass
        pres = None
        if powerpoint:
            try: 
                if powerpoint.Presentations.Count == 0:
                    powerpoint.Quit()
            except: pass
        powerpoint = None
        pythoncom.CoUninitialize()

async def extract_pptx_to_slides(pptx_path: str, output_folder: str, item_id: str):
    loop = asyncio.get_event_loop()
    res = await loop.run_in_executor(None, extract_pptx_sync, pptx_path, output_folder)
    
    if manager:
        if res.get("status") == "success":
            await manager.broadcast({
                "type": "presentation_ready",
                "id": item_id,
                "category": "presentation"
            })
        else:
            await manager.broadcast({
                "type": "presentation_failed",
                "id": item_id,
                "category": "presentation",
                "message": res.get("message", "Unknown error")
            })

def get_media_db_path(category: str) -> str:
    from config import BACKGROUNDS_FILE, AUDIOS_FILE, PHOTOS_FILE, PRESENTATIONS_FILE
    if category == "audio":
        return AUDIOS_FILE
    if category == "photo":
        return PHOTOS_FILE
    if category == "presentation":
        return PRESENTATIONS_FILE
    return BACKGROUNDS_FILE

async def process_media_metadata_task(category: str, item_id: str, file_path: str):
    """Asynchronously calculate file hash and extract metadata, then update db and notify clients."""
    print(f"[METADATA_TASK] Starting for {category}/{item_id} at {file_path}")
    
    # Run CPU/Disk intensive task (hashing) in an executor to avoid blocking FastAPI event loop
    loop = asyncio.get_event_loop()
    file_hash = await loop.run_in_executor(None, calculate_file_hash, file_path)
    
    meta = {"duration": 0.0, "width": 0, "height": 0}
    if category == "video":
        meta = await loop.run_in_executor(None, extract_video_metadata, file_path)
    elif category == "photo":
        try:
            from PIL import Image
            def get_photo_dims():
                with Image.open(file_path) as img:
                    return {"duration": 0.0, "width": img.width, "height": img.height}
            meta = await loop.run_in_executor(None, get_photo_dims)
        except Exception as e:
            print(f"[METADATA_TASK] PIL error for {file_path}: {e}")
            
    from config import load_json, save_json
    db_path = get_media_db_path(category)
    db = load_json(db_path)
    
    # Support both old ('videos') and new ('items') structure
    items_key = "videos" if (category == "video" and "videos" in db) else "items"
    if items_key not in db:
        db[items_key] = {}
        
    if item_id in db[items_key]:
        db[items_key][item_id]["hash"] = file_hash
        db[items_key][item_id]["duration"] = meta.get("duration", 0.0)
        db[items_key][item_id]["width"] = meta.get("width", 0)
        db[items_key][item_id]["height"] = meta.get("height", 0)
        save_json(db_path, db)
        print(f"[METADATA_TASK] Completed and saved for {item_id}: hash={file_hash[:10]}... duration={meta.get('duration')}s")
        
        if manager:
            await manager.broadcast({
                "type": "media_metadata_ready",
                "payload": {
                    "id": item_id,
                    "category": category,
                    "hash": file_hash,
                    "duration": meta.get("duration", 0.0),
                    "width": meta.get("width", 0),
                    "height": meta.get("height", 0)
                }
            })
    else:
        print(f"[METADATA_TASK] Item ID {item_id} not found in DB {db_path} during processing!")


async def run_media_migration_check():
    """Progressively checks existing database entries for missing hashes and metadata, and calculates them in the background."""
    # Delay check by 5.0 seconds to allow the main application to boot and load instantly
    await asyncio.sleep(5.0)
    print("[SYSTEM] Starting background media library migration check...")
    
    categories = ["video", "photo", "audio", "presentation"]
    loop = asyncio.get_event_loop()
    
    for cat in categories:
        try:
            from routes_media import get_media_db_path
            db_path = get_media_db_path(cat)
            if not os.path.exists(db_path):
                continue
            
            db = load_json(db_path)
            items_key = "videos" if (cat == "video" and "videos" in db) else "items"
            items = db.get(items_key, {})
            if not items:
                continue
            
            # Find items that need processing
            to_process = []
            for item_id, item in items.items():
                fpath = item.get("file_path", item.get("video_path"))
                if fpath and os.path.exists(fpath):
                    needs_hash = "hash" not in item or not item["hash"]
                    needs_meta = (cat == "video" and ("duration" not in item or "width" not in item or not item.get("duration")))
                    if needs_hash or needs_meta:
                        to_process.append((item_id, fpath, item))
            
            if to_process:
                print(f"[SYSTEM] Category '{cat}' has {len(to_process)} files to migrate/process...")
                db_modified = False
                for item_id, fpath, item in to_process:
                    # 1. Calculate hash asynchronously in executor
                    file_hash = await loop.run_in_executor(None, calculate_file_hash, fpath)
                    
                    # 2. Extract metadata asynchronously in executor
                    meta = {"duration": 0.0, "width": 0, "height": 0}
                    if cat == "video":
                        meta = await loop.run_in_executor(None, extract_video_metadata, fpath)
                    elif cat == "photo":
                        try:
                            from PIL import Image
                            def get_photo_dims():
                                with Image.open(fpath) as img:
                                    return {"duration": 0.0, "width": img.width, "height": img.height}
                            meta = await loop.run_in_executor(None, get_photo_dims)
                        except Exception as e:
                            print(f"[SYSTEM] PIL error during migration for {fpath}: {e}")
                    
                    # 3. Update memory copy
                    item["hash"] = file_hash
                    item["duration"] = meta.get("duration", 0.0)
                    item["width"] = meta.get("width", 0)
                    item["height"] = meta.get("height", 0)
                    db_modified = True
                    
                    # Broadcast updates to clients
                    if manager:
                        await manager.broadcast({
                            "type": "media_metadata_ready",
                            "payload": {
                                "id": item_id,
                                "category": cat,
                                "hash": file_hash,
                                "duration": meta.get("duration", 0.0),
                                "width": meta.get("width", 0),
                                "height": meta.get("height", 0)
                            }
                        })
                    
                    # Pause between items to yield execution time to FastAPI
                    await asyncio.sleep(0.2)
                
                # Write changes to disk once per category
                if db_modified:
                    current_db = load_json(db_path)
                    current_items = current_db.get(items_key, {})
                    for item_id, fpath, item in to_process:
                        if item_id in current_items:
                            current_items[item_id]["hash"] = item["hash"]
                            current_items[item_id]["duration"] = item["duration"]
                            current_items[item_id]["width"] = item["width"]
                            current_items[item_id]["height"] = item["height"]
                    save_json(db_path, current_db)
                    print(f"[SYSTEM] Saved migrated items for category '{cat}' to disk.")
                    
        except Exception as e:
            print(f"[SYSTEM] Error during media migration check for '{cat}': {e}")
            
    print("[SYSTEM] Background media library migration check completed.")
