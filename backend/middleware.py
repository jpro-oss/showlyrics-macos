import os
import time
from collections import deque
from fastapi import Request
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from config import DEV, get_user_data_path
import access_check

# Buffer 200 baris log terakhir (RAM-efficient)
system_logs: deque = deque(maxlen=200)

# Halaman output HTML yang diblokir dengan layar terkunci jika Beta Access tidak aktif
_BETA_OUTPUT_PAGES = {
    "/display", "/preview_display",
    "/lowerthird", "/preview_lt",
    "/foldback", "/background", "/audio", "/photo", "/presentation",
    "/scripture", "/scripture-lt",
    "/main_cam", "/audience_cam",
    "/plugin_main", "/plugin_lt",
}

_BETA_CONTROL_PAGES = {"/control", "/control/", "/diagnostic", "/diagnostic/"}


def _render_beta_locked_html(reason: str) -> str:
    if reason == "expired":
        title = "Beta Access Expired"
        desc = "Masa berlaku Kode Akses Beta ShowLyrics macOS Anda telah berakhir. Buka Launcher utama untuk memasukkan kode baru."
    elif reason in ("revoked", "hwid_mismatch"):
        title = "Beta Access Revoked"
        desc = "Kode Akses Beta ini telah dinonaktifkan atau terdaftar pada perangkat macOS lain."
    elif reason == "clock_tampered":
        title = "System Clock Verification Failed"
        desc = "Terdeteksi perubahan waktu sistem macOS. Aktifkan 'Set time and date automatically' lalu buka ulang Launcher."
    else:
        title = "Closed Beta Access Required"
        desc = "Aplikasi ShowLyrics macOS masih dalam tahap Closed Beta. Masukkan Kode Akses Beta (XXXXX) pada halaman Launcher."

    return f"""<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>{title} — ShowLyrics macOS Beta</title>
    <style>
        body {{
            background-color: #09090b;
            color: #f4f4f5;
            font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
        }}
        .card {{
            text-align: center;
            padding: 36px 40px;
            background: rgba(24, 24, 27, 0.92);
            border: 1px solid rgba(59, 130, 246, 0.35);
            border-radius: 16px;
            max-width: 460px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.7);
        }}
        .badge {{
            display: inline-block;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: #f59e0b;
            background: rgba(245, 158, 11, 0.14);
            border: 1px solid rgba(245, 158, 11, 0.35);
            padding: 4px 12px;
            border-radius: 999px;
            margin-bottom: 14px;
        }}
        h1 {{ font-size: 1.5rem; margin: 0 0 10px 0; color: #ffffff; }}
        p  {{ font-size: 0.92rem; line-height: 1.6; color: #a1a1aa; margin: 0; }}
    </style>
</head>
<body>
    <div class="card">
        <div class="badge">ShowLyrics macOS • Closed Beta</div>
        <h1>{title}</h1>
        <p>{desc}</p>
    </div>
</body>
</html>"""


async def beta_access_gate(request: Request, call_next):
    """
    Gerbang wajib Closed Beta Access (aktif 100% di DEV=True maupun DEV=False).
    Saat kode akses belum aktif, invalid, atau kadaluarsa:
      - Whitelist: /, /api/health, /api/access/*, /static/*, /sw.js, /favicon.ico
      - /control & /diagnostic -> 307 Redirect ke /?require_beta_access=true&reason=...
      - Halaman output (/display, /lowerthird, /foldback, ...) -> 403 Locked HTML
      - Endpoint /api/* & /import_songs lainnya -> 403 JSON
    """
    path = request.url.path

    # Whitelist wajib agar Launcher, aktivasi Beta, health check, dan aset statis tetap dapat diakses
    if (
        path == "/"
        or path == "/api/health"
        or path == "/sw.js"
        or path == "/favicon.ico"
        or path.startswith("/api/access/")
        or path == "/api/access"
        or path.startswith("/static/")
    ):
        return await call_next(request)

    if access_check.is_access_valid():
        return await call_next(request)

    reason = access_check.get_access_reason()

    if path in _BETA_CONTROL_PAGES:
        return RedirectResponse(
            url=f"/?require_beta_access=true&reason={reason}",
            status_code=307,
        )

    clean_path = path.rstrip("/") or "/"
    if clean_path in _BETA_OUTPUT_PAGES:
        return HTMLResponse(
            content=_render_beta_locked_html(reason),
            status_code=403,
        )

    return JSONResponse(
        status_code=403,
        content={
            "status": "error",
            "error": "beta_access_required",
            "reason": reason,
            "message": "Beta Access Code (XXXXX) required or expired.",
        },
    )


async def secure_electron_pages(request: Request, call_next):
    """
    Proteksi akses ke halaman sensitif.
    Hanya aktif saat DEV=False (production/Electron mode).
    """
    path = request.url.path
    if path in ["/", "/control", "/diagnostic", "/control/", "/diagnostic/"]:
        if not DEV:
            expected_token = os.environ.get("SHOWLYRICS_SECRET")
            if not expected_token:
                # Fallback to reading the .session_token file
                token_file = get_user_data_path(".session_token")
                if os.path.exists(token_file):
                    try:
                        with open(token_file, "r", encoding="utf-8") as f:
                            expected_token = f.read().strip()
                    except Exception:
                        pass

            received_token = request.headers.get("X-ShowLyrics-Secret")

            if not expected_token or received_token != expected_token:
                client_ip = request.client.host if request.client else "127.0.0.1"
                blocked_msg = f"ERROR:    [SECURITY] Blocked unauthorized access to {path} from {client_ip}"
                system_logs.append(blocked_msg)
                print(blocked_msg)

                return HTMLResponse(
                    content="""
                    <html>
                        <head>
                            <title>403 Forbidden - ShowLyrics</title>
                            <style>
                                body {
                                    background-color: #09090b;
                                    color: #f4f4f5;
                                    font-family: system-ui, -apple-system, sans-serif;
                                    display: flex;
                                    flex-direction: column;
                                    justify-content: center;
                                    align-items: center;
                                    height: 100vh;
                                    margin: 0;
                                }
                                .container {
                                    text-align: center;
                                    padding: 30px;
                                    background: rgba(24, 24, 27, 0.6);
                                    border: 1px solid rgba(255, 255, 255, 0.08);
                                    border-radius: 16px;
                                    backdrop-filter: blur(12px);
                                    max-width: 400px;
                                    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
                                }
                                h1 { color: #ef4444; font-size: 2rem; margin-bottom: 10px; margin-top: 0; }
                                p  { color: #a1a1aa; font-size: 0.95rem; line-height: 1.5; margin-bottom: 0; }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>403 Forbidden</h1>
                                <p>Error, Please using Application to access this URL!</p>
                            </div>
                        </body>
                    </html>
                    """,
                    status_code=403,
                )
    return await call_next(request)


async def log_requests(request: Request, call_next):
    start_time = time.time()
    response   = await call_next(request)
    process_time = time.time() - start_time

    client_ip = request.client.host if request.client else "127.0.0.1"
    log_msg = (
        f"INFO:     {client_ip} - "
        f'"{request.method} {request.url.path} HTTP/1.1" '
        f"{response.status_code} ({process_time:.3f}s)"
    )

    # Filter static files, polling diagnostics, dan health check supaya log tidak penuh
    skip_paths = {"/api/diagnostics", "/api/health"}
    if not request.url.path.startswith("/static") and request.url.path not in skip_paths:
        system_logs.append(log_msg)

    return response
