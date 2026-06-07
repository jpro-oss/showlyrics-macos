import os
import time
from collections import deque
from fastapi import Request
from fastapi.responses import HTMLResponse
from config import DEV, get_user_data_path

# Buffer 200 baris log terakhir (RAM-efficient)
system_logs: deque = deque(maxlen=200)

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

    # Filter static files & polling diagnostics supaya log tidak penuh
    if not request.url.path.startswith("/static") and request.url.path != "/api/diagnostics":
        system_logs.append(log_msg)

    return response
