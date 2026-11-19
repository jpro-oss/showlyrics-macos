import os
import uuid
import shutil
from fastapi import APIRouter, Request, BackgroundTasks, UploadFile, File, Form

import background_tasks as bg_tasks
from config import (
    load_json, save_json,
    BACKGROUNDS_FILE, AUDIOS_FILE, PHOTOS_FILE, PRESENTATIONS_FILE,
    THUMBS_DIR, PRESENTATION_DIR,
    PHOTO_DIR, BACKGROUNDS_DIR, AUDIO_DIR,
)
from routes_media_helper import get_media_db_path, get_allowed_extensions

router = APIRouter()

# ------------------------------------------------------------------
# UNIVERSAL MEDIA GET
# ------------------------------------------------------------------

@router.get("/api/media/{category}")
async def get_media_category(category: str):
    cat = str(category).lower()
    if cat == "audio":
        raw = load_json(AUDIOS_FILE)
    elif cat == "photo":
        raw = load_json(PHOTOS_FILE)
    elif cat == "presentation":
        raw = load_json(PRESENTATIONS_FILE)
    else:
        # Default: video backgrounds
        raw = load_json(BACKGROUNDS_FILE)

    db = dict(raw or {})
    if "videos" in db and "items" not in db:
        db["items"] = db.pop("videos")
    elif "audios" in db and "items" not in db:
        db["items"] = db.pop("audios")
    elif "photos" in db and "items" not in db:
        db["items"] = db.pop("photos")
    elif "presentations" in db and "items" not in db:
        db["items"] = db.pop("presentations")

    if "folders" not in db or not isinstance(db.get("folders"), list):
        db["folders"] = ["ALL"]
    elif "ALL" not in db["folders"]:
        db["folders"].insert(0, "ALL")

    if "items" not in db or not isinstance(db.get("items"), dict):
        db["items"] = {}

    # Inject mtime
    items = db.get("items", {})
    if isinstance(items, dict):
        for item in items.values():
            if not isinstance(item, dict):
                continue
            fpath = item.get("file_path", item.get("video_path"))
            if fpath and os.path.exists(fpath):
                try:
                    item["mtime"] = os.path.getmtime(fpath)
                except Exception:
                    item["mtime"] = 0
            else:
                item["mtime"] = 0

    return db


# ------------------------------------------------------------------
# LEGACY BACKGROUNDS API
# ------------------------------------------------------------------

@router.get("/api/backgrounds")
async def get_backgrounds():
    db = load_json(BACKGROUNDS_FILE)
    if "folders" not in db:
        db = {"folders": [], "videos": {}}
        
    # Inject mtime for legacy backgrounds too
    videos = db.get("videos", {})
    if not videos:
        videos = db.get("items", {})
    for item in videos.values():
        fpath = item.get("file_path", item.get("video_path"))
        if fpath and os.path.exists(fpath):
            try:
                item["mtime"] = os.path.getmtime(fpath)
            except Exception:
                item["mtime"] = 0
        else:
            item["mtime"] = 0
            
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
    # Build set of existing paths untuk O(1) lookup (bukan O(N) per file)
    existing_paths = {v.get("video_path", v.get("file_path")) for v in db["items"].values()}

    for file in os.listdir(folder_path):
        if file.lower().endswith(valid_ext):
            video_full_path = os.path.join(folder_path, file).replace("\\", "/")
            if video_full_path not in existing_paths:
                video_id = str(uuid.uuid4())[:8]
                thumb_full_path = os.path.join(THUMBS_DIR, f"{video_id}.jpg")
                db["items"][video_id] = {
                    "id": video_id, "name": file, "folder": folder_path,
                    "video_path": video_full_path, "file_path": video_full_path,
                }
                existing_paths.add(video_full_path)
                background_tasks.add_task(
                    bg_tasks.generate_thumbnail_task, video_full_path, thumb_full_path, video_id, "video"
                )
                background_tasks.add_task(
                    bg_tasks.process_media_metadata_task, "video", video_id, video_full_path
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
    # Build set of existing paths untuk O(1) lookup
    existing_paths = {v.get("file_path", v.get("video_path")) for v in db["items"].values()}
    for file_path in files:
        file_path = file_path.replace("\\", "/")
        if os.path.exists(file_path):
            filename = os.path.basename(file_path)
            if file_path not in existing_paths:
                video_id = str(uuid.uuid4())[:8]
                thumb_full_path = os.path.join(THUMBS_DIR, f"{video_id}.jpg")
                db["items"][video_id] = {
                    "id": video_id,
                    "name": filename,
                    "folder": folder_name if folder_name != "ALL" else "Uncategorized",
                    "video_path": file_path,
                    "file_path": file_path,
                }
                existing_paths.add(file_path)
                background_tasks.add_task(
                    bg_tasks.generate_thumbnail_task, file_path, thumb_full_path, video_id, "video"
                )
                background_tasks.add_task(
                    bg_tasks.process_media_metadata_task, "video", video_id, file_path
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
    # Build set of existing paths untuk O(1) lookup
    existing_paths = {v.get("file_path", v.get("video_path")) for v in db["items"].values()}
    for file_path in files:
        file_path = file_path.replace("\\", "/")
        if os.path.exists(file_path):
            filename = os.path.basename(file_path)
            if file_path not in existing_paths:
                item_id = str(uuid.uuid4())[:8]
                db["items"][item_id] = {
                    "id": item_id,
                    "name": filename,
                    "folder": folder_name if folder_name != "ALL" else "Uncategorized",
                    "file_path": file_path,
                }
                existing_paths.add(file_path)

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
                    await bg_tasks.enqueue_presentation(file_path, out_folder, item_id)

                background_tasks.add_task(
                    bg_tasks.process_media_metadata_task, category, item_id, file_path
                )

                count += 1
                created_ids.append(item_id)

    save_json(db_path, db)
    return {"status": "success", "message": f"{count} File berhasil di-link ke '{folder_name}'!", "created_ids": created_ids}


@router.post("/api/media/{category}/upload")
async def upload_media_file(
    category: str,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    folder_name: str = Form("ALL")
):
    """Handle multipart file upload directly to local media storage and update DB."""
    if category == "photo":
        os.makedirs(PHOTO_DIR, exist_ok=True)
        storage_dir = PHOTO_DIR
    elif category == "audio":
        os.makedirs(AUDIO_DIR, exist_ok=True)
        storage_dir = AUDIO_DIR
    elif category == "presentation":
        os.makedirs(PRESENTATION_DIR, exist_ok=True)
        storage_dir = PRESENTATION_DIR
    else:
        os.makedirs(BACKGROUNDS_DIR, exist_ok=True)
        storage_dir = BACKGROUNDS_DIR

    raw_filename = os.path.basename(file.filename or "upload.jpg")
    dest_path = os.path.join(storage_dir, raw_filename)

    base, ext = os.path.splitext(raw_filename)
    counter = 1
    while os.path.exists(dest_path):
        dest_path = os.path.join(storage_dir, f"{base}_{counter}{ext}")
        counter += 1

    try:
        with open(dest_path, "wb") as f_out:
            shutil.copyfileobj(file.file, f_out)
    except Exception as e:
        return {"status": "error", "message": f"Gagal menyimpan file: {str(e)}"}

    normalized_path = dest_path.replace("\\", "/")

    db_path = get_media_db_path(category)
    db = load_json(db_path)
    if "folders" not in db:
        db["folders"] = ["ALL"]
    if "items" not in db:
        db["items"] = {}
    if folder_name not in db["folders"] and folder_name != "ALL":
        db["folders"].append(folder_name)

    item_id = str(uuid.uuid4())[:8]
    item_entry = {
        "id": item_id,
        "name": os.path.basename(dest_path),
        "folder": folder_name if folder_name != "ALL" else "Uncategorized",
        "file_path": normalized_path,
    }
    db["items"][item_id] = item_entry

    if category == "photo":
        thumb_full_path = os.path.join(THUMBS_DIR, f"photo_{item_id}.jpg")
        background_tasks.add_task(
            bg_tasks.generate_photo_thumbnail_task, normalized_path, thumb_full_path, item_id
        )
    elif category == "video":
        thumb_full_path = os.path.join(THUMBS_DIR, f"{item_id}.jpg")
        item_entry["video_path"] = normalized_path
        background_tasks.add_task(
            bg_tasks.generate_thumbnail_task, normalized_path, thumb_full_path, item_id, "video"
        )
    background_tasks.add_task(
        bg_tasks.process_media_metadata_task, category, item_id, normalized_path
    )

    save_json(db_path, db)
    return {"status": "success", "message": "File berhasil diupload!", "item": item_entry}


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
    # Build set of existing paths untuk O(1) lookup
    existing_paths = {v.get("file_path", v.get("video_path")) for v in db["items"].values()}

    for file in os.listdir(folder_path):
        if file.lower().endswith(valid_ext):
            file_full_path = os.path.join(folder_path, file).replace("\\", "/")
            if file_full_path not in existing_paths:
                item_id = str(uuid.uuid4())[:8]
                db["items"][item_id] = {
                    "id": item_id, "name": file,
                    "folder": folder_path, "file_path": file_full_path,
                }
                existing_paths.add(file_full_path)

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
                    await bg_tasks.enqueue_presentation(file_full_path, out_folder, item_id)

                background_tasks.add_task(
                    bg_tasks.process_media_metadata_task, category, item_id, file_full_path
                )

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


@router.post("/api/media/{category}/batch_move")
async def batch_move_media(category: str, request: Request):
    payload = await request.json()
    item_ids = payload.get("item_ids", [])
    new_folder = payload.get("new_folder", "Uncategorized").strip()
    db_path = get_media_db_path(category)
    db = load_json(db_path)

    if not item_ids:
        return {"status": "error", "message": "No items provided"}

    if "folders" not in db:
        db["folders"] = ["ALL"]
    if new_folder not in db["folders"] and new_folder != "ALL":
        db["folders"].append(new_folder)

    if "items" not in db:
        db["items"] = db.pop("videos", {})

    count = 0
    for item_id in item_ids:
        if item_id in db.get("items", {}):
            db["items"][item_id]["folder"] = new_folder
            count += 1

    save_json(db_path, db)
    return {"status": "success", "count": count}


@router.post("/api/media/{category}/batch_delete")
async def batch_delete_media(category: str, request: Request):
    payload = await request.json()
    item_ids = payload.get("item_ids", [])
    db_path = get_media_db_path(category)
    db = load_json(db_path)

    if not item_ids:
        return {"status": "error", "message": "No items provided"}

    if "items" not in db:
        db["items"] = db.pop("videos", {})

    count = 0
    for item_id in item_ids:
        deleted = False
        if category == "video" and "videos" in db and item_id in db["videos"]:
            del db["videos"][item_id]
            deleted = True
        if item_id in db.get("items", {}):
            del db["items"][item_id]
            deleted = True

        if deleted:
            count += 1
            if category == "video":
                thumb_path = os.path.join(THUMBS_DIR, f"{item_id}.jpg")
                if os.path.exists(thumb_path):
                    try:
                        os.remove(thumb_path)
                    except Exception:
                        pass
            elif category == "presentation":
                slide_folder = os.path.join(PRESENTATION_DIR, item_id)
                if os.path.exists(slide_folder):
                    try:
                        shutil.rmtree(slide_folder, ignore_errors=True)
                    except Exception:
                        pass

    save_json(db_path, db)
    return {"status": "success", "count": count}


@router.post("/api/media/inspect_paths")
async def inspect_media_paths(request: Request):
    payload = await request.json()
    paths = payload.get("paths", [])
    
    files = []
    folders = []
    
    for path in paths:
        path = path.replace("\\", "/")
        if os.path.exists(path):
            if os.path.isdir(path):
                folders.append({"path": path, "name": os.path.basename(path)})
            else:
                files.append(path)
                
    return {
        "status": "success",
        "files": files,
        "folders": folders
    }
