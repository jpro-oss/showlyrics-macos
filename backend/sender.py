import json
import socket
import time
import threading
from fastapi import APIRouter, Response
from pydantic import BaseModel
import httpx


# --- SENDER DISCOVERY STORAGE ---
DISCOVERED_SENDERS = {}  # ip: {device_name, ip, ws_port, output_port, media_types, last_seen}
MAX_SENDERS = 50         # Batas maksimum sender — cegah memory leak
_stop_discovery = False  # Flag untuk stop thread saat shutdown

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
    
    while not _stop_discovery:
        try:
            data, addr = sock.recvfrom(2048)
            try:
                packet = json.loads(data.decode())
                if packet.get("type") == "showlyrics_sender":
                    # Prefer the IP from the packet (explicitly set per-interface by sender)
                    # over the UDP source address, which may be routing-dependent
                    packet_ip = packet.get("ip", "")
                    src_ip = addr[0]
                    
                    # Use packet IP if valid non-loopback, otherwise fall back to source
                    if packet_ip and packet_ip != "127.0.0.1" and not packet_ip.startswith("169.254"):
                        ip = packet_ip
                    elif src_ip and src_ip != "127.0.0.1":
                        ip = src_ip
                    else:
                        ip = packet_ip or src_ip or "127.0.0.1"
                    
                    packet["ip"] = ip
                    packet["last_seen"] = time.time()
                    # Store by ip — each interface IP of the same sender is stored separately
                    # The /list endpoint deduplicates by device_name, picking the best IP
                    if ip in DISCOVERED_SENDERS or len(DISCOVERED_SENDERS) < MAX_SENDERS:
                        DISCOVERED_SENDERS[ip] = packet
            except Exception:
                pass
        except socket.timeout:
            # Clean up old senders (not seen for 15s)
            now = time.time()
            to_delete = [ip for ip, s in DISCOVERED_SENDERS.items() if now - s["last_seen"] > 15]
            for ip in to_delete:
                del DISCOVERED_SENDERS[ip]
        except Exception:
            time.sleep(1)

def stop_discovery():
    global _stop_discovery
    _stop_discovery = True

import atexit
atexit.register(stop_discovery)

# Start discovery thread immediately on import
threading.Thread(target=udp_discovery_listener, daemon=True).start()

class SenderConnectRequest(BaseModel):
    ip: str
    port: int

@router.get("/list")
async def list_media_senders():
    # Deduplicate senders by device name, prioritizing the same subnet as this server
    grouped = {}
    
    def ip_priority(ip):
        """Lower number = higher priority. Prefer 10.x.x.x then 192.168.x.x then 172.x etc."""
        if not ip:
            return 99
        # Localhost / loopback
        if ip == "127.0.0.1" or ip.lower() == "localhost":
            return 0
        # 10.x.x.x - corporate/enterprise/campus LAN (user's preferred network)
        if ip.startswith("10."):
            return 1
        # Standard home/office subnets (but NOT VirtualBox 192.168.56.x)
        if ip.startswith("192.168.") and not ip.startswith("192.168.56."):
            return 2
        if ip.startswith("172."):
            try:
                parts = ip.split('.')
                second = int(parts[1])
                if 16 <= second <= 31:
                    return 3
            except Exception:
                pass
        # VirtualBox host-only - lowest priority
        if ip.startswith("192.168.56."):
            return 6
        return 5

    for sender in DISCOVERED_SENDERS.values():
        name = sender.get("device_name") or sender.get("ip") or "Unknown"
        ip = sender.get("ip", "")
        
        if name not in grouped:
            grouped[name] = sender
        else:
            existing_ip = grouped[name].get("ip", "")
            if ip_priority(ip) < ip_priority(existing_ip):
                grouped[name] = sender
                
    return list(grouped.values())

@router.post("/connect")
async def connect_to_sender(req: SenderConnectRequest):
    if req.ip not in DISCOVERED_SENDERS:
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"http://{req.ip}:{req.port}/api/info")
                if resp.status_code == 200:
                    info = resp.json()
                    info["ip"] = req.ip
                    info["last_seen"] = time.time()
                    DISCOVERED_SENDERS[req.ip] = info
        except Exception as e:
            print(f"[DISCOVERY] Failed to connect manually to sender at {req.ip}:{req.port}: {e}")

    if req.ip in DISCOVERED_SENDERS:
        sender = DISCOVERED_SENDERS[req.ip]
        return {"status": "success", "message": f"Sender {sender['device_name']} ready", "sender": sender}
    return {"status": "error", "message": "Sender not found or offline"}

def find_sender_token(ip: str) -> str:
    """Find the auth token for a given sender IP (supports direct match, ip-field match, and loopback fallback)."""
    # 1. Direct key match (ip stored as dict key)
    if ip in DISCOVERED_SENDERS:
        return DISCOVERED_SENDERS[ip].get("token", "")
    
    # 2. Match ip field inside the dict value
    for sender in DISCOVERED_SENDERS.values():
        if sender.get("ip") == ip:
            return sender.get("token", "")
            
    # 3. Loopback / localhost - use any available sender's token
    if ip in ("127.0.0.1", "localhost"):
        for sender in DISCOVERED_SENDERS.values():
            if sender.get("token"):
                return sender["token"]
                
    # 4. Last resort: if only one sender in dict, return its token regardless of IP
    if len(DISCOVERED_SENDERS) == 1:
        return next(iter(DISCOVERED_SENDERS.values())).get("token", "")
                
    return ""

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
    
    token = find_sender_token(ip)
    print(f"[PROXY] Request: {img_type}/{base_name} from {ip}:{port} | Token: {'found('+token+')' if token else 'NOT FOUND'} | Known senders: {list(DISCOVERED_SENDERS.keys())}")
    
    # Gunakan AsyncClient persistent (tidak buat client baru tiap request)
    async with httpx.AsyncClient(timeout=3.0) as client:
        for ext in [".jpg", ".png", ".jpeg"]:
            token_param = f"?auth={token}" if token else ""
            remote_url = f"http://{ip}:{port}/{img_type}/{base_name}{ext}{token_param}"
            try:
                resp = await client.get(remote_url)
                print(f"[PROXY] Tried {remote_url} -> {resp.status_code}")
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
            except Exception as ex:
                print(f"[PROXY] Error fetching {remote_url}: {ex}")
                pass
                
    print(f"[PROXY] All attempts failed for {img_type}/{base_name} from {ip}:{port}")
    return Response(status_code=404)

