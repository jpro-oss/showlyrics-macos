import os
import sys
import glob
import shutil
import re
import asyncio
import subprocess
import fitz  # PyMuPDF

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
