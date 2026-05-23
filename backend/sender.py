import json
import socket
import time
import threading
from fastapi import APIRouter, Response
from pydantic import BaseModel
import httpx


# --- SENDER DISCOVERY STORAGE ---
DISCOVERED_SENDERS = {}  # ip: {device_name, ip, ws_port, output_port, media_types, last_seen}

router = APIRouter()

def udp_discovery_listener():
    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        sock.bind(("", 5000)) 
    except Exception as e:
        print(f"[DISCOVERY] Could not bind to port 5000: {e}")
        return
        
    sock.settimeout(1.0)
    print("[DISCOVERY] UDP Listener active on port 5000")
    
    while True:
        try:
            data, addr = sock.recvfrom(2048)
            try:
                packet = json.loads(data.decode())
                if packet.get("type") == "showlyrics_sender":
                    ip = addr[0]
                    # If received via localhost but packet contains a LAN IP, prefer the LAN IP
                    if ip == "127.0.0.1" and packet.get("ip") and packet["ip"] != "127.0.0.1":
                        ip = packet["ip"]
                    
                    packet["ip"] = ip
                    packet["last_seen"] = time.time()
                    DISCOVERED_SENDERS[ip] = packet
            except:
                pass
        except socket.timeout:
            # Clean up old senders (not seen for 10s)
            now = time.time()
            to_delete = [ip for ip, s in DISCOVERED_SENDERS.items() if now - s["last_seen"] > 10]
            for ip in to_delete:
                del DISCOVERED_SENDERS[ip]
        except Exception as e:
            time.sleep(1)

# Start discovery thread immediately on import
threading.Thread(target=udp_discovery_listener, daemon=True).start()

class SenderConnectRequest(BaseModel):
    ip: str
    port: int

@router.get("/list")
async def list_media_senders():
    return list(DISCOVERED_SENDERS.values())

@router.post("/connect")
async def connect_to_sender(req: SenderConnectRequest):
    if req.ip in DISCOVERED_SENDERS:
        sender = DISCOVERED_SENDERS[req.ip]
        return {"status": "success", "message": f"Sender {sender['device_name']} ready", "sender": sender}
    return {"status": "error", "message": "Sender not found or offline"}

@router.get("/proxy/{ip}/{port}/{img_type}/{filename}")
async def proxy_sender_image(ip: str, port: int, img_type: str, filename: str):
    """
    Proxies slide images from the remote sender to prevent IDM intercepting.
    URLs are served from localhost and do not contain file extensions.
    """
    if img_type not in ["thumbs", "hd_thumbs"]:
        return Response(status_code=400, content="Invalid type")
        
    # Ensure filename doesn't have an extension, we will handle that
    base_name = filename.split(".")[0]
    
    # We will try both .jpg and .png on the remote sender
    async with httpx.AsyncClient() as client:
        for ext in [".jpg", ".png", ".jpeg"]:
            remote_url = f"http://{ip}:{port}/{img_type}/{base_name}{ext}"
            try:
                resp = await client.get(remote_url, timeout=3.0)
                if resp.status_code == 200:
                    media_type = "image/png" if ext == ".png" else "image/jpeg"
                    return Response(
                        content=resp.content,
                        media_type=media_type,
                        headers={
                            "Cache-Control": "public, max-age=31536000",
                            "Content-Disposition": "inline"
                        }
                    )
            except Exception as e:
                # Silently continue to next extension
                pass
                
    return Response(status_code=404)

