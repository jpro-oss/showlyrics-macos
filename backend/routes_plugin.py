# routes_plugin.py
# ==============================================================================
# Router untuk sistem Plugin (Timer, Stopwatch, Bumper, Lowerthird, Logo, Banner)
# Mengelola preset, folder kategori, integrasi foto, dan live active state
# Kompatibel ganda: WIN VER dan MAC VER
# ==============================================================================

import os
import json
import uuid
import time
from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import JSONResponse
from config import get_user_data_path

router = APIRouter(prefix="/api/plugins", tags=["plugins"])

PLUGINS_FILE = get_user_data_path("plugins_database.json")

# ──────────────────────────────────────────────────────────────────────────────
# Built-in Default Presets (Minimal 3-4 preset berkualitas tinggi per kategori)
# ──────────────────────────────────────────────────────────────────────────────
DEFAULT_FOLDERS = [
    {"id": "ALL", "name": "ALL", "is_default": True},
    {"id": "TIMER", "name": "TIMER", "is_default": True},
    {"id": "STOPWATCH", "name": "STOPWATCH", "is_default": True},
    {"id": "BUMPER", "name": "BUMPER", "is_default": True},
    {"id": "LOWERTHIRD", "name": "LOWERTHIRD", "is_default": True},
    {"id": "LOGO", "name": "LOGO & BANNER", "is_default": True}
]

def get_builtin_presets():
    return [
        # ──────────────────────────────────────────────────────────────────────
        # 1. TIMER (Broadcast Modern, Big Digits, High Legibility)
        # ──────────────────────────────────────────────────────────────────────
        {
            "id": "timer-modern-countdown",
            "name": "Modern Minimalist Countdown",
            "category": "TIMER",
            "folder": "TIMER",
            "targets": ["main", "lt"],
            "animation": {"in": "fade", "out": "fade", "duration": 0.4},
            "elements": [
                {
                    "id": "el-card-bg",
                    "type": "shape",
                    "x": 460, "y": 330, "width": 1000, "height": 420,
                    "bgColor": "#080c14", "bgOpacity": 0.90, "borderRadius": 28,
                    "borderWidth": 2, "borderColor": "#00e5ff",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-timer-title",
                    "type": "text",
                    "x": 480, "y": 365, "width": 960, "height": 50,
                    "text": "COUNTDOWN TO SERVICE",
                    "fontFamily": "Montserrat", "fontSize": 32, "color": "#00e5ff",
                    "bold": True, "italic": False, "underline": False, "uppercase": True,
                    "align": "center", "zIndex": 2
                },
                {
                    "id": "el-timer-digits",
                    "type": "timer",
                    "x": 480, "y": 440, "width": 960, "height": 180,
                    "duration": 300,
                    "finishAction": "blink",
                    "fontFamily": "Montserrat", "fontSize": 140, "color": "#ffffff",
                    "bold": True, "align": "center", "zIndex": 3
                },
                {
                    "id": "el-timer-subtitle",
                    "type": "text",
                    "x": 480, "y": 665, "width": 960, "height": 40,
                    "text": "MOHON MEMPERSIAPKAN DIRI DALAM DOA & SAAT TEDUH",
                    "fontFamily": "Montserrat", "fontSize": 24, "color": "#9ca3af",
                    "bold": True, "align": "center", "uppercase": True, "zIndex": 4
                }
            ]
        },
        {
            "id": "timer-preservice-welcome",
            "name": "Pre-Service Welcome Countdown",
            "category": "TIMER",
            "folder": "TIMER",
            "targets": ["main"],
            "animation": {"in": "slide-up", "out": "fade", "duration": 0.5},
            "elements": [
                {
                    "id": "el-box-1",
                    "type": "shape",
                    "x": 360, "y": 280, "width": 1200, "height": 520,
                    "bgColor": "#140f07", "bgOpacity": 0.92, "borderRadius": 32,
                    "borderWidth": 2, "borderColor": "#ffb300",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-txt-1",
                    "type": "text",
                    "x": 380, "y": 325, "width": 1160, "height": 65,
                    "text": "SELAMAT BERIBADAH",
                    "fontFamily": "Montserrat", "fontSize": 52, "color": "#ffb300",
                    "bold": True, "align": "center", "uppercase": True, "zIndex": 2
                },
                {
                    "id": "el-txt-sub",
                    "type": "text",
                    "x": 380, "y": 400, "width": 1160, "height": 45,
                    "text": "IBADAH RAYA AKAN DIMULAI DALAM",
                    "fontFamily": "Montserrat", "fontSize": 30, "color": "#f3f4f6",
                    "bold": True, "align": "center", "uppercase": True, "zIndex": 3
                },
                {
                    "id": "el-timer-1",
                    "type": "timer",
                    "x": 380, "y": 470, "width": 1160, "height": 170,
                    "duration": 600,
                    "finishAction": "freeze",
                    "fontFamily": "Montserrat", "fontSize": 130, "color": "#ffffff",
                    "bold": True, "align": "center", "zIndex": 4
                },
                {
                    "id": "el-txt-quote",
                    "type": "text",
                    "x": 380, "y": 700, "width": 1160, "height": 45,
                    "text": "\"Berdiam dirilah di hadapan TUHAN dan nantikanlah Dia\" — Mazmur 37:7",
                    "fontFamily": "Montserrat", "fontSize": 26, "color": "#d1d5db",
                    "bold": False, "italic": True, "align": "center", "zIndex": 5
                }
            ]
        },
        {
            "id": "timer-stage-pill",
            "name": "Minimal Stage Pill Timer",
            "category": "TIMER",
            "folder": "TIMER",
            "targets": ["main", "lt"],
            "animation": {"in": "fade", "out": "fade", "duration": 0.2},
            "elements": [
                {
                    "id": "el-pill-bg",
                    "type": "shape",
                    "x": 1460, "y": 40, "width": 420, "height": 120,
                    "bgColor": "#000000", "bgOpacity": 0.88, "borderRadius": 60,
                    "borderWidth": 2, "borderColor": "#00e5ff",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-pill-lbl",
                    "type": "text",
                    "x": 1480, "y": 55, "width": 380, "height": 25,
                    "text": "COUNTDOWN",
                    "fontFamily": "Montserrat", "fontSize": 20, "color": "#00e5ff",
                    "bold": True, "align": "center", "zIndex": 2
                },
                {
                    "id": "el-pill-digits",
                    "type": "timer",
                    "x": 1480, "y": 80, "width": 380, "height": 65,
                    "duration": 300,
                    "finishAction": "blink",
                    "fontFamily": "Montserrat", "fontSize": 56, "color": "#ffffff",
                    "bold": True, "align": "center", "zIndex": 3
                }
            ]
        },
        {
            "id": "timer-sermon-box",
            "name": "Sermon Countdown Box",
            "category": "TIMER",
            "folder": "TIMER",
            "targets": ["main", "lt"],
            "animation": {"in": "fade", "out": "fade", "duration": 0.3},
            "elements": [
                {
                    "id": "el-sermon-bg",
                    "type": "shape",
                    "x": 610, "y": 340, "width": 700, "height": 380,
                    "bgColor": "#0f172a", "bgOpacity": 0.92, "borderRadius": 26,
                    "borderWidth": 2, "borderColor": "#ef4444",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-sermon-title",
                    "type": "text",
                    "x": 620, "y": 380, "width": 680, "height": 45,
                    "text": "WAKTU KHOTBAH",
                    "fontFamily": "Montserrat", "fontSize": 36, "color": "#ef4444",
                    "bold": True, "align": "center", "uppercase": True, "zIndex": 2
                },
                {
                    "id": "el-sermon-digits",
                    "type": "timer",
                    "x": 620, "y": 450, "width": 680, "height": 160,
                    "duration": 2400,
                    "finishAction": "blink",
                    "fontFamily": "Montserrat", "fontSize": 120, "color": "#ffffff",
                    "bold": True, "align": "center", "zIndex": 3
                },
                {
                    "id": "el-sermon-sub",
                    "type": "text",
                    "x": 620, "y": 645, "width": 680, "height": 35,
                    "text": "PASTOR SERMON TIMEKEEPER",
                    "fontFamily": "Montserrat", "fontSize": 24, "color": "#9ca3af",
                    "bold": True, "align": "center", "zIndex": 4
                }
            ]
        },

        # ──────────────────────────────────────────────────────────────────────
        # 2. STOPWATCH (Preaching, Worship Set, Minimal Broadcast)
        # ──────────────────────────────────────────────────────────────────────
        {
            "id": "stopwatch-sermon-preacher",
            "name": "Preacher Sermon Stopwatch",
            "category": "STOPWATCH",
            "folder": "STOPWATCH",
            "targets": ["main", "lt"],
            "animation": {"in": "slide-up", "out": "fade", "duration": 0.4},
            "elements": [
                {
                    "id": "el-sw-live-card",
                    "type": "shape",
                    "x": 1400, "y": 40, "width": 480, "height": 130,
                    "bgColor": "#0b1220", "bgOpacity": 0.90, "borderRadius": 30,
                    "borderWidth": 2, "borderColor": "#10b981",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-sw-badge",
                    "type": "text",
                    "x": 1420, "y": 55, "width": 440, "height": 30,
                    "text": "● LIVE SERVICE KHOTBAH",
                    "fontFamily": "Montserrat", "fontSize": 22, "color": "#10b981",
                    "bold": True, "align": "center", "zIndex": 2
                },
                {
                    "id": "el-sw-live-digits",
                    "type": "stopwatch",
                    "x": 1420, "y": 90, "width": 440, "height": 65,
                    "fontFamily": "Montserrat", "fontSize": 56, "color": "#ffffff",
                    "bold": True, "align": "center", "zIndex": 3
                }
            ]
        },
        {
            "id": "stopwatch-worship-duration",
            "name": "Live Worship Set Duration",
            "category": "STOPWATCH",
            "folder": "STOPWATCH",
            "targets": ["main", "lt"],
            "animation": {"in": "slide-up", "out": "fade", "duration": 0.3},
            "elements": [
                {
                    "id": "el-worship-box",
                    "type": "shape",
                    "x": 660, "y": 900, "width": 600, "height": 140,
                    "bgColor": "#050811", "bgOpacity": 0.90, "borderRadius": 24,
                    "borderWidth": 2, "borderColor": "#8b5cf6",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-worship-title",
                    "type": "text",
                    "x": 680, "y": 920, "width": 560, "height": 35,
                    "text": "🎵 WORSHIP SET DURATION",
                    "fontFamily": "Montserrat", "fontSize": 26, "color": "#c4b5fd",
                    "bold": True, "align": "center", "zIndex": 2
                },
                {
                    "id": "el-worship-digits",
                    "type": "stopwatch",
                    "x": 680, "y": 960, "width": 560, "height": 65,
                    "fontFamily": "Montserrat", "fontSize": 60, "color": "#ffffff",
                    "bold": True, "align": "center", "zIndex": 3
                }
            ]
        },
        {
            "id": "stopwatch-stage-minimal",
            "name": "Minimal Broadcast Stage Stopwatch",
            "category": "STOPWATCH",
            "folder": "STOPWATCH",
            "targets": ["main", "lt"],
            "animation": {"in": "fade", "out": "fade", "duration": 0.2},
            "elements": [
                {
                    "id": "el-stage-pill",
                    "type": "shape",
                    "x": 50, "y": 40, "width": 340, "height": 110,
                    "bgColor": "#000000", "bgOpacity": 0.80, "borderRadius": 22,
                    "borderWidth": 1, "borderColor": "rgba(255,255,255,0.3)",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-stage-lbl",
                    "type": "text",
                    "x": 60, "y": 55, "width": 320, "height": 25,
                    "text": "ELAPSED TIME",
                    "fontFamily": "Montserrat", "fontSize": 18, "color": "#00e5ff",
                    "bold": True, "align": "center", "zIndex": 2
                },
                {
                    "id": "el-stage-digits",
                    "type": "stopwatch",
                    "x": 60, "y": 80, "width": 320, "height": 55,
                    "fontFamily": "Montserrat", "fontSize": 48, "color": "#ffffff",
                    "bold": True, "align": "center", "zIndex": 3
                }
            ]
        },

        # ──────────────────────────────────────────────────────────────────────
        # 3. LOWERTHIRD (Dual Glass, Gradient Pill, Scripture, Clean Strip)
        # ──────────────────────────────────────────────────────────────────────
        {
            "id": "lt-pastor-speaker",
            "name": "Senior Pastor / Preacher Lowerthird",
            "category": "LOWERTHIRD",
            "folder": "LOWERTHIRD",
            "targets": ["main", "lt"],
            "animation": {"in": "slide-up", "out": "slide-up", "duration": 0.4},
            "autoHide": 12,
            "elements": [
                {
                    "id": "el-lt-card",
                    "type": "shape",
                    "x": 100, "y": 830, "width": 1020, "height": 180,
                    "bgColor": "#090e1c", "bgOpacity": 0.94, "borderRadius": 20,
                    "borderWidth": 2, "borderColor": "#00e5ff",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-lt-accent-strip",
                    "type": "shape",
                    "x": 100, "y": 830, "width": 16, "height": 180,
                    "bgColor": "#00e5ff", "bgOpacity": 1, "borderRadius": 6,
                    "borderWidth": 0, "zIndex": 2
                },
                {
                    "id": "el-lt-name",
                    "type": "text",
                    "x": 140, "y": 860, "width": 950, "height": 65,
                    "text": "PS. NAMA PENDETA, M.Th",
                    "fontFamily": "Montserrat", "fontSize": 52, "color": "#ffffff",
                    "bold": True, "align": "left", "uppercase": True, "zIndex": 3
                },
                {
                    "id": "el-lt-title",
                    "type": "text",
                    "x": 140, "y": 940, "width": 950, "height": 45,
                    "text": "Gembala Sidang | Tema: \"Judul Khotbah / Tema Khotbah\"",
                    "fontFamily": "Montserrat", "fontSize": 30, "color": "#00e5ff",
                    "bold": False, "align": "left", "zIndex": 4
                }
            ]
        },
        {
            "id": "lt-worship-leader",
            "name": "Worship Leader & Band Lowerthird",
            "category": "LOWERTHIRD",
            "folder": "LOWERTHIRD",
            "targets": ["main", "lt"],
            "animation": {"in": "slide-in", "out": "fade", "duration": 0.4},
            "autoHide": 10,
            "elements": [
                {
                    "id": "el-w-card",
                    "type": "shape",
                    "x": 100, "y": 860, "width": 980, "height": 150,
                    "bgColor": "#180e29", "bgOpacity": 0.92, "borderRadius": 35,
                    "borderWidth": 2, "borderColor": "#a855f7",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-w-title",
                    "type": "text",
                    "x": 140, "y": 885, "width": 900, "height": 55,
                    "text": "🎤 NAMA WORSHIP LEADER",
                    "fontFamily": "Montserrat", "fontSize": 46, "color": "#ffffff",
                    "bold": True, "align": "left", "uppercase": True, "zIndex": 2
                },
                {
                    "id": "el-w-sub",
                    "type": "text",
                    "x": 140, "y": 950, "width": 900, "height": 40,
                    "text": "Worship Leader — \"Judul Lagu Pujian / Penyembahan\"",
                    "fontFamily": "Montserrat", "fontSize": 28, "color": "#c084fc",
                    "align": "left", "zIndex": 3
                }
            ]
        },
        {
            "id": "lt-scripture-reference",
            "name": "Scripture Verse Reference Lowerthird",
            "category": "LOWERTHIRD",
            "folder": "LOWERTHIRD",
            "targets": ["main", "lt"],
            "animation": {"in": "slide-up", "out": "fade", "duration": 0.4},
            "autoHide": 15,
            "elements": [
                {
                    "id": "el-sc-card",
                    "type": "shape",
                    "x": 80, "y": 820, "width": 1120, "height": 200,
                    "bgColor": "#0a0a0f", "bgOpacity": 0.94, "borderRadius": 22,
                    "borderWidth": 2, "borderColor": "#ffb300",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-sc-badge",
                    "type": "text",
                    "x": 120, "y": 845, "width": 1040, "height": 45,
                    "text": "📖 YOHANES 3:16",
                    "fontFamily": "Montserrat", "fontSize": 38, "color": "#ffb300",
                    "bold": True, "align": "left", "uppercase": True, "zIndex": 2
                },
                {
                    "id": "el-sc-quote",
                    "type": "text",
                    "x": 120, "y": 905, "width": 1040, "height": 90,
                    "text": "\"Karena begitu besar kasih Allah akan dunia ini, sehingga Ia telah mengaruniakan Anak-Nya yang tunggal...\"",
                    "fontFamily": "Montserrat", "fontSize": 30, "color": "#ffffff",
                    "bold": False, "align": "left", "zIndex": 3
                }
            ]
        },
        {
            "id": "lt-clean-strip",
            "name": "Church Broadcast Clean Strip",
            "category": "LOWERTHIRD",
            "folder": "LOWERTHIRD",
            "targets": ["main", "lt"],
            "animation": {"in": "slide-in", "out": "fade", "duration": 0.4},
            "autoHide": 12,
            "elements": [
                {
                    "id": "el-strip-card",
                    "type": "shape",
                    "x": 80, "y": 880, "width": 1120, "height": 140,
                    "bgColor": "#111827", "bgOpacity": 0.92, "borderRadius": 18,
                    "borderWidth": 1, "borderColor": "rgba(255,255,255,0.25)",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-strip-title",
                    "type": "text",
                    "x": 120, "y": 905, "width": 1040, "height": 50,
                    "text": "WORSHIP NIGHT SERVICE",
                    "fontFamily": "Montserrat", "fontSize": 40, "color": "#ffffff",
                    "bold": True, "align": "left", "uppercase": True, "zIndex": 2
                },
                {
                    "id": "el-strip-sub",
                    "type": "text",
                    "x": 120, "y": 965, "width": 1040, "height": 35,
                    "text": "Live Streaming dari Main Sanctuary — Sesi 2 (Pkl. 10.30 WIB)",
                    "fontFamily": "Montserrat", "fontSize": 26, "color": "#9ca3af",
                    "align": "left", "zIndex": 3
                }
            ]
        },

        # ──────────────────────────────────────────────────────────────────────
        # 4. BUMPER & BANNER (Fullscreen Bumper, Offering, Social Bar, Ribbon)
        # ──────────────────────────────────────────────────────────────────────
        {
            "id": "bumper-service-start",
            "name": "Service Starts Soon Full Bumper",
            "category": "BUMPER",
            "folder": "BUMPER",
            "targets": ["main", "lt"],
            "animation": {"in": "fade", "out": "fade", "duration": 0.5},
            "elements": [
                {
                    "id": "el-b-card",
                    "type": "shape",
                    "x": 260, "y": 210, "width": 1400, "height": 660,
                    "bgColor": "#080c14", "bgOpacity": 0.94, "borderRadius": 36,
                    "borderWidth": 2, "borderColor": "#00e5ff",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-b-church",
                    "type": "text",
                    "x": 300, "y": 270, "width": 1320, "height": 50,
                    "text": "NAMA GEREJA ANDA",
                    "fontFamily": "Montserrat", "fontSize": 36, "color": "#00e5ff",
                    "bold": True, "align": "center", "uppercase": True, "zIndex": 2
                },
                {
                    "id": "el-b-title",
                    "type": "text",
                    "x": 300, "y": 340, "width": 1320, "height": 95,
                    "text": "IBADAH AKAN SEGERA DIMULAI",
                    "fontFamily": "Montserrat", "fontSize": 72, "color": "#ffffff",
                    "bold": True, "align": "center", "uppercase": True, "zIndex": 3
                },
                {
                    "id": "el-b-sub",
                    "type": "text",
                    "x": 300, "y": 460, "width": 1320, "height": 50,
                    "text": "Mari Mempersiapkan Pujian, Penyembahan dan Firman Tuhan Bersama",
                    "fontFamily": "Montserrat", "fontSize": 32, "color": "#9ca3af",
                    "bold": False, "align": "center", "zIndex": 4
                },
                {
                    "id": "el-b-pill",
                    "type": "text",
                    "x": 300, "y": 550, "width": 1320, "height": 45,
                    "text": "📍 MAIN SANCTUARY & LIVE STREAMING",
                    "fontFamily": "Montserrat", "fontSize": 28, "color": "#ffb300",
                    "bold": True, "align": "center", "zIndex": 5
                }
            ]
        },
        {
            "id": "bumper-tithe-offering",
            "name": "Tithes & Offering Announcement",
            "category": "BUMPER",
            "folder": "BUMPER",
            "targets": ["main", "lt"],
            "animation": {"in": "fade", "out": "fade", "duration": 0.5},
            "elements": [
                {
                    "id": "el-to-card",
                    "type": "shape",
                    "x": 360, "y": 250, "width": 1200, "height": 580,
                    "bgColor": "#091219", "bgOpacity": 0.95, "borderRadius": 32,
                    "borderWidth": 2, "borderColor": "#10b981",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-to-title",
                    "type": "text",
                    "x": 400, "y": 300, "width": 1120, "height": 65,
                    "text": "PERSEMBAHAN & PERSEPULUHAN",
                    "fontFamily": "Montserrat", "fontSize": 52, "color": "#10b981",
                    "bold": True, "align": "center", "uppercase": True, "zIndex": 2
                },
                {
                    "id": "el-to-verse",
                    "type": "text",
                    "x": 400, "y": 380, "width": 1120, "height": 45,
                    "text": "\"Hendaklah masing-masing memberikan menurut kerelaan hatinya...\" (2 Korintus 9:7)",
                    "fontFamily": "Montserrat", "fontSize": 26, "color": "#9ca3af",
                    "italic": True, "align": "center", "zIndex": 3
                },
                {
                    "id": "el-to-bca",
                    "type": "text",
                    "x": 400, "y": 460, "width": 1120, "height": 50,
                    "text": "BANK : 123-456-7890 (A.N. NAMA GEREJA ANDA)",
                    "fontFamily": "Montserrat", "fontSize": 36, "color": "#ffffff",
                    "bold": True, "align": "center", "zIndex": 4
                },
                {
                    "id": "el-to-mandiri",
                    "type": "text",
                    "x": 400, "y": 530, "width": 1120, "height": 45,
                    "text": "MANDIRI : 987-654-3210  |  QRIS TERSEDIA DI WARTA JEMAAT",
                    "fontFamily": "Montserrat", "fontSize": 30, "color": "#00e5ff",
                    "bold": True, "align": "center", "zIndex": 5
                }
            ]
        },
        {
            "id": "banner-social-media",
            "name": "Bottom Social Media & Contacts Bar",
            "category": "LOGO",
            "folder": "LOGO",
            "targets": ["main", "lt"],
            "animation": {"in": "slide-up", "out": "fade", "duration": 0.4},
            "elements": [
                {
                    "id": "el-soc-bar",
                    "type": "shape",
                    "x": 160, "y": 960, "width": 1600, "height": 85,
                    "bgColor": "#000000", "bgOpacity": 0.88, "borderRadius": 42,
                    "borderWidth": 1, "borderColor": "rgba(255,255,255,0.25)",
                    "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-soc-txt",
                    "type": "text",
                    "x": 180, "y": 985, "width": 1560, "height": 40,
                    "text": "📷 Instagram: @akun_anda   •   ▶️ YouTube: Nama Channel Anda   •   🌐 www.websiteanda.com",
                    "fontFamily": "Montserrat", "fontSize": 28, "color": "#ffffff",
                    "bold": True, "align": "center", "zIndex": 2
                }
            ]
        },
        {
            "id": "banner-top-announcement-bar",
            "name": "Top Header Announcement Ribbon",
            "category": "LOGO",
            "folder": "LOGO",
            "targets": ["main", "lt"],
            "animation": {"in": "slide-up", "out": "fade", "duration": 0.4},
            "autoHide": 15,
            "elements": [
                {
                    "id": "el-ribbon-bar",
                    "type": "shape",
                    "x": 0, "y": 0, "width": 1920, "height": 80,
                    "bgColor": "#7c3aed", "bgOpacity": 0.94, "borderRadius": 0,
                    "borderWidth": 0, "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-ribbon-txt",
                    "type": "text",
                    "x": 40, "y": 22, "width": 1840, "height": 40,
                    "text": "📢 PENGUMUMAN: Pendaftaran Kegiatan / Acara Dibuka Hari Ini di Meja Informasi!",
                    "fontFamily": "Montserrat", "fontSize": 30, "color": "#ffffff",
                    "bold": True, "align": "center", "zIndex": 2
                }
            ]
        },
        {
            "id": "badge-top-left-live",
            "name": "Top-Left 'LIVE ON AIR' Badge",
            "category": "LOGO",
            "folder": "LOGO",
            "targets": ["main", "lt"],
            "animation": {"in": "slide-in", "out": "fade", "duration": 0.3},
            "elements": [
                {
                    "id": "el-live-pill",
                    "type": "shape",
                    "x": 50, "y": 45, "width": 260, "height": 75,
                    "bgColor": "#dc2626", "bgOpacity": 0.94, "borderRadius": 38,
                    "borderWidth": 2, "borderColor": "#ffffff", "shadow": True, "zIndex": 1
                },
                {
                    "id": "el-live-txt",
                    "type": "text",
                    "x": 60, "y": 64, "width": 240, "height": 40,
                    "text": "● LIVE ON AIR",
                    "fontFamily": "Montserrat", "fontSize": 28, "color": "#ffffff",
                    "bold": True, "align": "center", "zIndex": 2
                }
            ]
        }
    ]


def load_plugins_db():
    CURRENT_VERSION = 3
    if not os.path.exists(PLUGINS_FILE):
        db = {
            "preset_version": CURRENT_VERSION,
            "folders": DEFAULT_FOLDERS,
            "presets": get_builtin_presets()
        }
        save_plugins_db(db)
        return db
    try:
        with open(PLUGINS_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Pastikan folder default tetap ada
        existing_folder_ids = {f["id"] for f in data.get("folders", [])}
        for df in DEFAULT_FOLDERS:
            if df["id"] not in existing_folder_ids:
                data.setdefault("folders", []).append(df)

        # Auto-upgrade built-in presets ke versi 2 (Broadcast Studio) jika masih versi lama
        saved_version = data.get("preset_version", 1)
        if saved_version < CURRENT_VERSION:
            builtins = get_builtin_presets()
            builtin_ids = {p["id"] for p in builtins}
            # Simpan preset kustom buatan user
            custom_presets = [p for p in data.get("presets", []) if p.get("id") not in builtin_ids]
            # Gabungkan built-in baru yang dirombak dengan preset kustom user
            data["presets"] = builtins + custom_presets
            data["preset_version"] = CURRENT_VERSION
            save_plugins_db(data)
            print(f"[PluginDB] Auto-upgraded built-in presets to v{CURRENT_VERSION} (retaining {len(custom_presets)} custom presets)")

        return data
    except Exception as e:
        print(f"[PluginDB] Error reading {PLUGINS_FILE}: {e}")
        return {"preset_version": CURRENT_VERSION, "folders": DEFAULT_FOLDERS, "presets": get_builtin_presets()}


def save_plugins_db(data):
    try:
        with open(PLUGINS_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"[PluginDB] Error saving {PLUGINS_FILE}: {e}")
        return False


# ──────────────────────────────────────────────────────────────────────────────
# REST Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.get("")
async def get_all_plugins():
    """Ambil semua folder dan preset plugin."""
    db = load_plugins_db()
    return JSONResponse(content=db)


@router.post("/preset")
async def save_preset(request: Request):
    """Buat preset baru atau simpan perubahan preset."""
    payload = await request.json()
    db = load_plugins_db()
    
    preset_id = payload.get("id")
    if not preset_id:
        preset_id = f"preset-{uuid.uuid4().hex[:8]}"
        payload["id"] = preset_id

    # Update atau insert
    idx = next((i for i, p in enumerate(db["presets"]) if p["id"] == preset_id), -1)
    if idx >= 0:
        db["presets"][idx] = payload
    else:
        db["presets"].append(payload)

    save_plugins_db(db)
    return JSONResponse(content={"status": "ok", "preset": payload})


@router.delete("/preset/{preset_id}")
async def delete_preset(preset_id: str):
    """Hapus preset berdasarkan ID."""
    db = load_plugins_db()
    db["presets"] = [p for p in db["presets"] if p["id"] != preset_id]
    save_plugins_db(db)
    return JSONResponse(content={"status": "ok", "deleted_id": preset_id})


@router.post("/preset/{preset_id}/rename")
async def rename_preset(preset_id: str, request: Request):
    """Ganti nama preset."""
    payload = await request.json()
    new_name = payload.get("name", "").strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    
    db = load_plugins_db()
    found = False
    for p in db["presets"]:
        if p["id"] == preset_id:
            p["name"] = new_name
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    save_plugins_db(db)
    return JSONResponse(content={"status": "ok", "id": preset_id, "name": new_name})


@router.post("/preset/{preset_id}/move")
async def move_preset(preset_id: str, request: Request):
    """Pindahkan preset ke folder tertentu."""
    payload = await request.json()
    folder_id = payload.get("folder_id", "ALL")
    
    db = load_plugins_db()
    found = False
    for p in db["presets"]:
        if p["id"] == preset_id:
            p["folder"] = folder_id
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    save_plugins_db(db)
    return JSONResponse(content={"status": "ok", "id": preset_id, "folder": folder_id})


@router.post("/preset/{preset_id}/duplicate")
async def duplicate_preset(preset_id: str):
    """Duplikasi preset yang sudah ada."""
    db = load_plugins_db()
    original = next((p for p in db["presets"] if p["id"] == preset_id), None)
    if not original:
        raise HTTPException(status_code=404, detail="Preset not found")
    
    import copy
    new_preset = copy.deepcopy(original)
    new_preset["id"] = f"preset-{uuid.uuid4().hex[:8]}"
    new_preset["name"] = f"{original['name']} (Copy)"
    db["presets"].append(new_preset)
    
    save_plugins_db(db)
    return JSONResponse(content={"status": "ok", "preset": new_preset})


# ──────────────────────────────────────────────────────────────────────────────
# Folder Management Endpoints
# ──────────────────────────────────────────────────────────────────────────────

@router.post("/folder")
async def create_folder(request: Request):
    """Buat folder custom baru."""
    payload = await request.json()
    folder_name = payload.get("name", "").strip().upper()
    if not folder_name:
        raise HTTPException(status_code=400, detail="Folder name cannot be empty")
    
    db = load_plugins_db()
    folder_id = folder_name.replace(" ", "_")
    # Cek duplikat
    if any(f["id"] == folder_id for f in db["folders"]):
        raise HTTPException(status_code=400, detail="Folder already exists")
    
    new_folder = {"id": folder_id, "name": folder_name, "is_default": False}
    db["folders"].append(new_folder)
    save_plugins_db(db)
    return JSONResponse(content={"status": "ok", "folder": new_folder})


@router.post("/folder/rename")
async def rename_folder(request: Request):
    """Ganti nama custom folder (folder default terkunci)."""
    payload = await request.json()
    folder_id = payload.get("folder_id")
    new_name = payload.get("new_name", "").strip().upper()
    
    if not new_name:
        raise HTTPException(status_code=400, detail="New name cannot be empty")
    
    db = load_plugins_db()
    folder = next((f for f in db["folders"] if f["id"] == folder_id), None)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder.get("is_default", False):
        raise HTTPException(status_code=403, detail="Default folders cannot be renamed")
    
    folder["name"] = new_name
    save_plugins_db(db)
    return JSONResponse(content={"status": "ok", "folder": folder})


@router.post("/folder/delete")
async def delete_folder(request: Request):
    """
    Hapus custom folder.
    delete_contents = True -> Hapus folder beserta semua preset di dalamnya
    delete_contents = False -> Pindahkan preset ke ALL
    """
    payload = await request.json()
    folder_id = payload.get("folder_id")
    delete_contents = payload.get("delete_contents", False)
    
    db = load_plugins_db()
    folder = next((f for f in db["folders"] if f["id"] == folder_id), None)
    if not folder:
        raise HTTPException(status_code=404, detail="Folder not found")
    if folder.get("is_default", False):
        raise HTTPException(status_code=403, detail="Default folders cannot be deleted")
    
    db["folders"] = [f for f in db["folders"] if f["id"] != folder_id]
    
    if delete_contents:
        db["presets"] = [p for p in db["presets"] if p.get("folder") != folder_id]
    else:
        for p in db["presets"]:
            if p.get("folder") == folder_id:
                p["folder"] = "ALL"
    
    save_plugins_db(db)
    return JSONResponse(content={"status": "ok", "deleted_folder": folder_id})
