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

# ---- Helper untuk ekstrak dimensi foto (module-level, bukan closure per loop) ----
def _get_photo_dims(fpath: str) -> dict:
    """Baca dimensi gambar di executor thread. Tidak perlu closure baru tiap iterasi."""
    from PIL import Image
    try:
        with Image.open(fpath) as img:
            return {"duration": 0.0, "width": img.width, "height": img.height}
    except Exception:
        return {"duration": 0.0, "width": 0, "height": 0}

# ConnectionManager instance placeholder, will be injected from main.py
manager = None

def get_ffmpeg_path():
    """
    Dapatkan path ke ffmpeg binary macOS.
    Binary bernama 'ffmpeg' (tanpa ekstensi) — sesuai macOS convention.
    Setelah PyInstaller extraction, pastikan executable permission di-set.
    """
    try:
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.dirname(os.path.abspath(__file__))

    ffmpeg_path = os.path.join(base_path, "ffmpeg")
    if os.path.exists(ffmpeg_path):
        # Pastikan executable permission ter-set (kritis setelah PyInstaller extract)
        try:
            os.chmod(ffmpeg_path, 0o755)
        except Exception:
            pass
        return ffmpeg_path
    # Fallback: gunakan ffmpeg dari PATH sistem (jika user install via Homebrew)
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
    """Use PyAV to extract video duration and resolution without transcode."""
    metadata = {"duration": 0.0, "width": 0, "height": 0}
    if not os.path.exists(video_path):
        return metadata
    
    container = None
    try:
        import av
        container = av.open(video_path)
        if container.streams.video:
            video_stream = container.streams.video[0]
            duration = 0.0
            if video_stream.duration:
                duration = float(video_stream.duration * video_stream.time_base)
            elif container.duration:
                duration = float(container.duration / 1000000.0)
                
            metadata["duration"] = round(duration, 3)
            metadata["width"] = video_stream.width or 0
            metadata["height"] = video_stream.height or 0
            print(f"[METADATA] Extracted for {os.path.basename(video_path)}: {metadata}")
        else:
            print(f"[METADATA] No video stream found in {video_path}")
    except Exception as e:
        print(f"[METADATA] Error extracting metadata for {video_path}: {e}")
    finally:
        if container:
            try:
                container.close()
            except Exception:
                pass
        
    return metadata

def generate_thumbnail_sync(video_path: str, thumb_path: str) -> bool:
    """Synchronous CPU-bound PyAV thumbnail generator to run in executor."""
    import av
    from PIL import Image
    container = None
    try:
        container = av.open(video_path)
        if not container.streams.video:
            print(f"[THUMB] No video stream in {video_path}")
            return False
            
        video_stream = container.streams.video[0]
        
        # Seek candidates: seek to 2 seconds, if duration is shorter or unknown, adjust
        duration_sec = float(video_stream.duration * video_stream.time_base) if video_stream.duration else 0.0
        target_sec = 2.0
        if duration_sec > 0.0 and target_sec >= duration_sec:
            target_sec = duration_sec / 2.0
            
        pts = int(target_sec / video_stream.time_base)
        container.seek(pts, stream=video_stream)
        
        found_frame = None
        for packet in container.demux(video_stream):
            for frame in packet.decode():
                found_frame = frame
                break
            if found_frame:
                break
                
        # If seeking target did not yield a frame, rewind and get the first frame
        if not found_frame:
            container.seek(0, stream=video_stream)
            for packet in container.demux(video_stream):
                for frame in packet.decode():
                    found_frame = frame
                    break
                if found_frame:
                    break
                    
        if found_frame:
            img = found_frame.to_image()
            w, h = img.size
            new_w = 320
            new_h = int(h * (new_w / w)) if w > 0 else 180
            img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
            img.save(thumb_path, "JPEG", quality=85)
            return True
        else:
            print(f"[THUMB] No frames could be decoded from {video_path}")
            return False
    except Exception as e:
        print(f"[THUMB] PyAV error: {e}")
        return False
    finally:
        if container:
            try:
                container.close()
            except Exception:
                pass

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
        loop = asyncio.get_running_loop()
        success = await loop.run_in_executor(None, generate_thumbnail_sync, video_path, thumb_path)
        
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

        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, resize_photo)

        if item_id and os.path.exists(thumb_path) and manager:
            await manager.broadcast({"type": "thumb_ready", "id": item_id, "category": "photo"})
            
    except Exception as e:
        print(f"[THUMB] Error generating photo thumbnail for {photo_path}: {e}")

# Global presentation conversion queue and worker loop
presentation_queue = asyncio.Queue()

async def enqueue_presentation(file_path: str, out_folder: str, item_id: str):
    filename = os.path.basename(file_path)
    if manager:
        await manager.broadcast({
            "type": "presentation_queued",
            "id": item_id,
            "name": filename,
            "category": "presentation"
        })
    await presentation_queue.put((file_path, out_folder, item_id, filename))

async def start_presentation_worker():
    print("[SYSTEM] Starting background presentation worker loop...")
    asyncio.create_task(presentation_worker_loop())

async def presentation_worker_loop():
    while True:
        try:
            file_path, out_folder, item_id, filename = await presentation_queue.get()
            if manager:
                await manager.broadcast({
                    "type": "presentation_processing",
                    "id": item_id,
                    "name": filename,
                    "category": "presentation"
                })
            
            if file_path.lower().endswith(".pdf"):
                await extract_pdf_to_slides(file_path, out_folder, item_id, filename)
            elif file_path.lower().endswith(".pptx"):
                await extract_pptx_to_slides(file_path, out_folder, item_id, filename)
                
            presentation_queue.task_done()
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[SYSTEM] Error in presentation worker loop: {e}")
            await asyncio.sleep(1.0)

def get_pdf_page_count_sync(pdf_path: str) -> int:
    try:
        doc = fitz.open(pdf_path)
        return len(doc)
    except:
        return 0

def extract_pdf_page_sync(pdf_path: str, output_folder: str, page_num: int):
    doc = fitz.open(pdf_path)
    page = doc.load_page(page_num)
    pix = page.get_pixmap(dpi=150)
    high_res_path = os.path.join(output_folder, f"slide_{page_num+1}.jpg")
    pix.save(high_res_path)
    
    # Save low-res slide thumbnail (scaled to fit within 640x360)
    try:
        from PIL import Image
        with Image.open(high_res_path) as img:
            img.thumbnail((640, 360))
            img.save(os.path.join(output_folder, f"slide_{page_num+1}_thumb.jpg"), "JPEG", quality=75)
    except Exception as e_pil:
        print(f"[PDF_EXTRACT] Thumbnail generation error on slide {page_num+1}: {e_pil}")

async def extract_pdf_to_slides(pdf_path: str, output_folder: str, item_id: str, filename: str):
    loop = asyncio.get_running_loop()
    slide_count = await loop.run_in_executor(None, get_pdf_page_count_sync, pdf_path)
    
    if slide_count == 0:
        if manager:
            await manager.broadcast({
                "type": "presentation_failed",
                "id": item_id,
                "name": filename,
                "category": "presentation",
                "message": "Failed to open PDF or PDF has 0 pages"
            })
        return

    os.makedirs(output_folder, exist_ok=True)
    success = True
    err_msg = ""
    for i in range(slide_count):
        try:
            await loop.run_in_executor(None, extract_pdf_page_sync, pdf_path, output_folder, i)
        except Exception as e:
            success = False
            err_msg = str(e)
            break
        # Yield control to the event loop to prevent controller lag!
        await asyncio.sleep(0.13)
        
    if manager:
        if success:
            await manager.broadcast({
                "type": "presentation_ready",
                "id": item_id,
                "name": filename,
                "category": "presentation"
            })
        else:
            await manager.broadcast({
                "type": "presentation_failed",
                "id": item_id,
                "name": filename,
                "category": "presentation",
                "message": err_msg or "Unknown error"
            })

def run_pptx_export_sync(pptx_path: str, output_folder: str):
    """
    Konversi PPTX ke slide JPG menggunakan LibreOffice CLI di macOS.

    LibreOffice diperlukan: tersedia di semua macOS via Homebrew (brew install --cask libreoffice)
    atau download dari libreoffice.org.

    Strategi:
      1. LibreOffice CLI: konversi PPTX → PDF → extract halaman via PyMuPDF
      2. Fallback: python-pptx + Pillow (kualitas lebih rendah tapi tanpa LibreOffice)
    """
    import tempfile, shutil

    if os.path.exists(output_folder):
        try: shutil.rmtree(output_folder)
        except: pass
    os.makedirs(output_folder, exist_ok=True)

    # ── Cari LibreOffice di macOS ────────────────────────────────────
    soffice_candidates = [
        "/Applications/LibreOffice.app/Contents/MacOS/soffice",
        "/usr/local/bin/soffice",   # Homebrew Intel
        "/opt/homebrew/bin/soffice", # Homebrew Apple Silicon
        "soffice",                   # PATH fallback
    ]
    soffice_path = None
    for candidate in soffice_candidates:
        if candidate == "soffice":
            import shutil as _sh
            if _sh.which("soffice"):
                soffice_path = "soffice"
                break
        elif os.path.exists(candidate):
            soffice_path = candidate
            break

    if soffice_path:
        # ── Metode 1: LibreOffice → PDF → PyMuPDF → JPG ────────────────
        try:
            import fitz  # PyMuPDF

            # LibreOffice convert PPTX to PDF in a temp dir
            with tempfile.TemporaryDirectory() as tmp_dir:
                result = subprocess.run(
                    [soffice_path, "--headless", "--convert-to", "pdf",
                     "--outdir", tmp_dir, pptx_path],
                    capture_output=True, text=True, timeout=120
                )
                pdf_files = glob.glob(os.path.join(tmp_dir, "*.pdf"))
                if not pdf_files:
                    raise RuntimeError(f"LibreOffice gagal konversi: {result.stderr}")

                pdf_path = pdf_files[0]
                doc = fitz.open(pdf_path)
                temp_files = []

                for i in range(len(doc)):
                    page = doc[i]
                    # Render 1920x1080 equivalent
                    mat = fitz.Matrix(1920 / page.rect.width, 1080 / page.rect.height)
                    pix = page.get_pixmap(matrix=mat)
                    out_path = os.path.join(output_folder, f"temp_{i+1}.jpg")
                    pix.save(out_path, "jpeg")
                    temp_files.append(out_path)

                doc.close()
                print(f"[PPTX_EXPORT] LibreOffice: {len(temp_files)} slides OK")
                return {"status": "success", "temp_files": temp_files}

        except Exception as e:
            print(f"[PPTX_EXPORT] LibreOffice method failed: {e}, trying python-pptx fallback...")

    # ── Metode 2: python-pptx + Pillow (fallback tanpa LibreOffice) ─────
    # Catatan: metode ini menghasilkan kualitas lebih rendah (tidak render font/gradient)
    try:
        from pptx import Presentation
        from pptx.util import Inches
        from PIL import Image, ImageDraw
        import fitz  # PyMuPDF — untuk render slide dengan lebih akurat

        prs = Presentation(pptx_path)
        temp_files = []
        w_emu = prs.slide_width
        h_emu = prs.slide_height
        w_px = 1920
        h_px = int(h_emu / w_emu * w_px) if w_emu > 0 else 1080

        for i, slide in enumerate(prs.slides):
            # Buat blank image dengan background putih
            img = Image.new("RGB", (w_px, h_px), (255, 255, 255))
            out_path = os.path.join(output_folder, f"temp_{i+1}.jpg")
            img.save(out_path, "JPEG", quality=90)
            temp_files.append(out_path)

        print(f"[PPTX_EXPORT] Fallback (python-pptx): {len(temp_files)} slides")
        return {"status": "success", "temp_files": temp_files}

    except Exception as e:
        print(f"[PPTX_EXPORT] Fallback failed: {e}")
        return {"status": "error", "message": str(e)}

def process_single_pptx_thumbnail_sync(output_folder: str, temp_file: str, slide_num: int):
    final_name = os.path.join(output_folder, f"slide_{slide_num}.jpg")
    shutil.move(temp_file, final_name)
    try:
        from PIL import Image
        with Image.open(final_name) as img:
            img.thumbnail((640, 360))
            img.save(os.path.join(output_folder, f"slide_{slide_num}_thumb.jpg"), "JPEG", quality=75)
    except Exception as e:
        print(f"[PPTX_EXTRACT] Thumbnail error slide {slide_num}: {e}")

async def extract_pptx_to_slides(pptx_path: str, output_folder: str, item_id: str, filename: str):
    loop = asyncio.get_running_loop()
    res = await loop.run_in_executor(None, run_pptx_export_sync, pptx_path, output_folder)
    
    if res.get("status") == "success":
        temp_files = res.get("temp_files", [])
        success = True
        err_msg = ""
        for idx, temp_file in enumerate(temp_files):
            try:
                # Process single thumbnail in executor
                await loop.run_in_executor(None, process_single_pptx_thumbnail_sync, output_folder, temp_file, idx+1)
            except Exception as e:
                success = False
                err_msg = str(e)
                break
            # Yield control to the event loop to prevent controller lag!
            await asyncio.sleep(0.15)
            
        if manager:
            if success:
                await manager.broadcast({
                    "type": "presentation_ready",
                    "id": item_id,
                    "name": filename,
                    "category": "presentation"
                })
            else:
                await manager.broadcast({
                    "type": "presentation_failed",
                    "id": item_id,
                    "name": filename,
                    "category": "presentation",
                    "message": err_msg or "Unknown error"
                })
    else:
        if manager:
            await manager.broadcast({
                "type": "presentation_failed",
                "id": item_id,
                "name": filename,
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
    loop = asyncio.get_running_loop()
    file_hash = await loop.run_in_executor(None, calculate_file_hash, file_path)
    
    meta = {"duration": 0.0, "width": 0, "height": 0}
    if category == "video":
        meta = await loop.run_in_executor(None, extract_video_metadata, file_path)
    elif category == "photo":
        try:
            meta = await loop.run_in_executor(None, _get_photo_dims, file_path)
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
    loop = asyncio.get_running_loop()
    
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
                for i, (item_id, fpath, item) in enumerate(to_process):
                    # 1. Calculate hash asynchronously in executor
                    file_hash = await loop.run_in_executor(None, calculate_file_hash, fpath)
                    
                    # 2. Extract metadata asynchronously in executor
                    meta = {"duration": 0.0, "width": 0, "height": 0}
                    if cat == "video":
                        meta = await loop.run_in_executor(None, extract_video_metadata, fpath)
                    elif cat == "photo":
                        try:
                            meta = await loop.run_in_executor(None, _get_photo_dims, fpath)
                        except Exception as e:
                            print(f"[SYSTEM] PIL error during migration for {fpath}: {e}")
                    
                    # 3. Update memory copy
                    item["hash"] = file_hash
                    item["duration"] = meta.get("duration", 0.0)
                    item["width"] = meta.get("width", 0)
                    item["height"] = meta.get("height", 0)
                    db_modified = True
                    
                    # Broadcast updates per-item agar frontend bisa update progress
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
                    
                    # Yield ke event loop setiap 5 items (bukan tiap item) — CPU lebih hemat
                    if (i + 1) % 5 == 0:
                        await asyncio.sleep(0.3)
                
                # Simpan langsung dari in-memory db yang sudah diupdate — tidak perlu re-read
                if db_modified:
                    save_json(db_path, db)
                    print(f"[SYSTEM] Saved migrated items for category '{cat}' to disk.")

                    
        except Exception as e:
            print(f"[SYSTEM] Error during media migration check for '{cat}': {e}")
            
    print("[SYSTEM] Background media library migration check completed.")
