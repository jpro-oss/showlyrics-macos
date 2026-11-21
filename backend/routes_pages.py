# routes_pages.py
# ============================================================
# Semua route yang men-serve halaman HTML (template responses)
# Dipisah dari main.py untuk menjaga main.py tetap ringkas
# ============================================================

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, FileResponse, Response, RedirectResponse
from fastapi.templating import Jinja2Templates
from config import get_resource_path
import access_check

router = APIRouter()


# ─── wm.js dari RAM — immune terhadap file replacement attack ─────────────────
# Route ini HARUS terdaftar SEBELUM app.mount("/static", StaticFiles(...)) di main.py
# agar explicit route ini menang vs StaticFiles. Urutan sudah diperbaiki di main.py.
import file_integrity

@router.get("/static/wm.js")
async def serve_wm_js():
    """Serve wm.js dari RAM — file replacement attack tidak berguna."""
    content = file_integrity.get_wm_js()
    if content:
        return Response(
            content=content,
            media_type="application/javascript",
            headers={"Cache-Control": "no-store, no-cache, must-revalidate"}
        )
    # Fallback ke disk jika RAM belum diisi (misal startup belum selesai)
    return FileResponse(
        get_resource_path("static/wm.js"),
        media_type="application/javascript"
    )


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
    return templates.TemplateResponse(request, "index.html")


@router.get("/control", response_class=HTMLResponse)
async def get_control(request: Request):
    if not access_check.is_access_valid():
        reason = access_check.get_access_reason()
        return RedirectResponse(url=f"/?require_beta_access=true&reason={reason}", status_code=307)
    return templates.TemplateResponse(request, "control.html")


@router.get("/diagnostic", response_class=HTMLResponse)
async def get_diagnostic(request: Request):
    if not access_check.is_access_valid():
        reason = access_check.get_access_reason()
        return RedirectResponse(url=f"/?require_beta_access=true&reason={reason}", status_code=307)
    return templates.TemplateResponse(request, "diagnostic.html")


# ------------------------------------------------------------------
# DISPLAY / PROYEKTOR
# ------------------------------------------------------------------

@router.get("/display", response_class=HTMLResponse)
async def get_display(request: Request):
    editor_mode = request.query_params.get("editor", "false").lower() == "true"
    return templates.TemplateResponse(request, "display.html", {
        "is_editor": editor_mode
    })


@router.get("/preview_display", response_class=HTMLResponse)
async def get_preview_display(request: Request):
    return templates.TemplateResponse(request, "preview_display.html")


@router.get("/background")
async def background_page(request: Request):
    return templates.TemplateResponse(request, "background.html")


@router.get("/audio", response_class=HTMLResponse)
async def audio_page(request: Request):
    return templates.TemplateResponse(request, "audio.html")


@router.get("/photo", response_class=HTMLResponse)
async def photo_page(request: Request):
    return templates.TemplateResponse(request, "photo.html")


@router.get("/presentation", response_class=HTMLResponse)
async def presentation_page(request: Request):
    return templates.TemplateResponse(request, "presentation.html")


# ------------------------------------------------------------------
# LOWER THIRD & FOLDBACK
# ------------------------------------------------------------------

@router.get("/lowerthird", response_class=HTMLResponse)
async def get_lowerthird(request: Request):
    return templates.TemplateResponse(request, "lowerthird.html")


@router.get("/preview_lt", response_class=HTMLResponse)
async def get_preview_lt(request: Request):
    return templates.TemplateResponse(request, "preview_lt.html")


@router.get("/foldback", response_class=HTMLResponse)
async def get_foldback(request: Request):
    return templates.TemplateResponse(request, "foldback.html")


# ------------------------------------------------------------------
# SCRIPTURE / ALKITAB
# ------------------------------------------------------------------

@router.get("/scripture", response_class=HTMLResponse)
async def scripture_page(request: Request):
    return templates.TemplateResponse(request, "scripture.html")


@router.get("/scripture-lt", response_class=HTMLResponse)
async def scripture_lt_page(request: Request):
    return templates.TemplateResponse(request, "scripture-lt.html")


# ------------------------------------------------------------------
# KAMERA
# ------------------------------------------------------------------

@router.get("/main_cam", response_class=HTMLResponse)
async def main_cam_page(request: Request):
    return templates.TemplateResponse(request, "main_cam.html")


@router.get("/audience_cam", response_class=HTMLResponse)
async def audience_cam_page(request: Request):
    return templates.TemplateResponse(request, "audience_cam.html")


# ------------------------------------------------------------------
# PLUGIN OUTPUTS (MAIN DISPLAY & LOWER THIRD)
# ------------------------------------------------------------------

@router.get("/plugin_main", response_class=HTMLResponse)
async def plugin_main_page(request: Request):
    return templates.TemplateResponse(request, "plugin_main.html")


@router.get("/plugin_lt", response_class=HTMLResponse)
async def plugin_lt_page(request: Request):
    return templates.TemplateResponse(request, "plugin_lt.html")
