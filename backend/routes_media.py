# routes_media.py
# ============================================================
# API untuk semua media: video background, audio, foto,
# presentasi (PDF/PPTX), thumbnail, dan streaming.
# Dipisah dari main.py untuk keterbacaan yang lebih baik.
# ============================================================

from fastapi import APIRouter

# Import submodules
import routes_media_stream
import routes_media_thumb
import routes_media_crud

# Import compatibility helpers for other modules (e.g. main.py)
from routes_media_helper import init_manager, get_media_db_path

router = APIRouter()

# Register sub-routers
router.include_router(routes_media_stream.router)
router.include_router(routes_media_thumb.router)
router.include_router(routes_media_crud.router)
