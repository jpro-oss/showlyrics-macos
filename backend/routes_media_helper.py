import os
import re
import asyncio
from collections import OrderedDict
from config import AUDIOS_FILE, PHOTOS_FILE, PRESENTATIONS_FILE, BACKGROUNDS_FILE

class LRUVideoCache:
    def __init__(self, max_items=3, max_file_size=500 * 1024 * 1024):
        self.cache = OrderedDict()
        self.max_items = max_items
        self.max_file_size = max_file_size

    def get(self, video_path: str) -> tuple[bytes, int] | None:
        if video_path in self.cache:
            # Move to end (MRU)
            val = self.cache.pop(video_path)
            self.cache[video_path] = val
            return val
        return None

    def put(self, video_path: str, file_bytes: bytes):
        if video_path in self.cache:
            self.cache.pop(video_path)
        elif len(self.cache) >= self.max_items:
            # Evict oldest (first item)
            self.cache.popitem(last=False)
        self.cache[video_path] = (file_bytes, len(file_bytes))

video_ram_cache = LRUVideoCache()
active_reads = {}


async def _stream_bytes(data: bytes, chunk_size: int = 4 * 1024 * 1024):
    """Yield bytes dalam chunks kecil sambil melepaskan event loop di setiap chunk.
    
    KRITIS: Ini mencegah event loop Python terblokir saat mengirim file video besar.
    Tanpa ini, mengirim 300MB sekaligus akan memblokir event loop selama beberapa detik,
    menyebabkan WebSocket keepalive ping timeout dan koneksi disconnect.
    
    Setiap `await asyncio.sleep(0)` memberi kesempatan asyncio untuk memproses:
    - WebSocket ping/pong frames
    - Heartbeat broadcasts
    - Permintaan HTTP lainnya
    """
    for i in range(0, len(data), chunk_size):
        yield data[i : i + chunk_size]
        await asyncio.sleep(0)  # Yield event loop control


def parse_range_header(range_header: str, file_size: int) -> tuple[int, int]:
    match = re.match(r"bytes=(\d+)-(\d*)", range_header)
    if not match:
        return 0, file_size - 1
    
    start_str, end_str = match.groups()
    start = int(start_str)
    
    if end_str:
        end = int(end_str)
        if end >= file_size:
            end = file_size - 1
    else:
        end = file_size - 1
        
    return start, end


def get_media_db_path(category: str) -> str:
    if category == "audio":
        return AUDIOS_FILE
    if category == "photo":
        return PHOTOS_FILE
    if category == "presentation":
        return PRESENTATIONS_FILE
    return BACKGROUNDS_FILE  # default: video


def get_allowed_extensions(category: str) -> tuple:
    if category == "audio":
        return (".mp3", ".wav", ".m4a", ".aac", ".ogg")
    if category == "photo":
        return (".jpg", ".jpeg", ".png", ".gif", ".webp")
    if category == "presentation":
        return (".pdf", ".pptx")
    return (".mp4",)  # default: video (restricted to .mp4 only)


_manager = None

def init_manager(m):
    global _manager
    _manager = m
