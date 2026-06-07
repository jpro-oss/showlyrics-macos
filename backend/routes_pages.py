# routes_pages.py
# ============================================================
# Semua route yang men-serve halaman HTML (template responses)
# Dipisah dari main.py untuk menjaga main.py tetap ringkas
# ============================================================

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.templating import Jinja2Templates
from config import get_resource_path
import time

router = APIRouter()

@router.get("/sw.js")
async def get_service_worker():
    return FileResponse(get_resource_path("static/sw.js"), media_type="application/javascript")


# Templates instance — diisi dari main.py saat startup
templates: Jinja2Templates = None


def init_templates(t: Jinja2Templates):
    """Dipanggil dari main.py setelah templates dibuat."""
    global templates
    templates = t


# ------------------------------------------------------------------
# HALAMAN UTAMA & KONTROL
# ------------------------------------------------------------------

@router.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@router.get("/control", response_class=HTMLResponse)
async def get_control(request: Request):
    return templates.TemplateResponse("control.html", {"request": request})


@router.get("/diagnostic", response_class=HTMLResponse)
async def get_diagnostic(request: Request):
    return templates.TemplateResponse("diagnostic.html", {"request": request})


# ------------------------------------------------------------------
# DISPLAY / PROYEKTOR
# ------------------------------------------------------------------

@router.get("/display", response_class=HTMLResponse)
async def get_display(request: Request):
    editor_mode = request.query_params.get("editor", "false").lower() == "true"
    return templates.TemplateResponse("display.html", {
        "request": request, 
        "is_editor": editor_mode
    })


@router.get("/preview_display", response_class=HTMLResponse)
async def get_preview_display(request: Request):
    return templates.TemplateResponse("preview_display.html", {"request": request})


@router.get("/background")
async def background_page(request: Request):
    return templates.TemplateResponse("background.html", {"request": request})


@router.get("/audio", response_class=HTMLResponse)
async def audio_page(request: Request):
    return templates.TemplateResponse("audio.html", {"request": request})


@router.get("/photo", response_class=HTMLResponse)
async def photo_page(request: Request):
    return templates.TemplateResponse("photo.html", {"request": request})


@router.get("/presentation", response_class=HTMLResponse)
async def presentation_page(request: Request):
    return templates.TemplateResponse("presentation.html", {"request": request})


# ------------------------------------------------------------------
# LOWER THIRD & FOLDBACK
# ------------------------------------------------------------------

@router.get("/lowerthird", response_class=HTMLResponse)
async def get_lowerthird(request: Request):
    return templates.TemplateResponse("lowerthird.html", {"request": request})


@router.get("/preview_lt", response_class=HTMLResponse)
async def get_preview_lt(request: Request):
    return templates.TemplateResponse("preview_lt.html", {"request": request})


@router.get("/foldback", response_class=HTMLResponse)
async def get_foldback(request: Request):
    return templates.TemplateResponse("foldback.html", {"request": request})


# ------------------------------------------------------------------
# SCRIPTURE / ALKITAB
# ------------------------------------------------------------------

@router.get("/scripture", response_class=HTMLResponse)
async def scripture_page(request: Request):
    return templates.TemplateResponse("scripture.html", {"request": request})


@router.get("/scripture-lt", response_class=HTMLResponse)
async def scripture_lt_page(request: Request):
    return templates.TemplateResponse("scripture-lt.html", {"request": request})


# ------------------------------------------------------------------
# KAMERA
# ------------------------------------------------------------------

@router.get("/main_cam", response_class=HTMLResponse)
async def main_cam_page(request: Request):
    return templates.TemplateResponse("main_cam.html", {"request": request})


@router.get("/audience_cam", response_class=HTMLResponse)
async def audience_cam_page(request: Request):
    return templates.TemplateResponse("audience_cam.html", {"request": request})
