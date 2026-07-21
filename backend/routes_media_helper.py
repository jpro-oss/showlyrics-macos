import os
from config import AUDIOS_FILE, PHOTOS_FILE, PRESENTATIONS_FILE, BACKGROUNDS_FILE


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
