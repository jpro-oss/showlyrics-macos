let currentActiveTab = 'library'; // Lacak tab apa yang lagi dibuka

window.activeLibraryPlayers = { video: false, audio: false, photo: false };
window.activeSenderMedia = { video: false, audio: false, photo: false };
window.currentSongHasLocalBg = false;
// =======================================================
// --- THEME AUTO-RESET ENGINE (FIX OVERGLOW) ---
// =======================================================
const THEME_DEFAULTS = {
    // Modern & Minimalist
    "box-black": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "frosted": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "clean": { glow: 0, shadow_int: 20, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "pure": { glow: 0, shadow_int: 20, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "thin": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "bold": { glow: 0, shadow_int: 20, stroke_size: 0.1, color_type: 'solid', glow_type: 'text' },
    "soft": { glow: 0, shadow_int: 30, stroke_size: 0, color_type: 'solid', glow_type: 'text' },

    // Worship Atmosphere (Glow diset 0 biar CSS aslinya nyala!)
    "plain": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "default": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "heaven": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "gold": { glow: 0, shadow_int: 20, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "mist": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "ocean": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "sunset": { glow: 0, shadow_int: 15, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "majesty": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "nature": { glow: 0, shadow_int: 15, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "holy": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "grace": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "dove": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "sacred": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "sunrise": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "midnight": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "emerald": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "crystal": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "sepia": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },

    // Praise & High Energy
    "neon": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "fire": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "electric": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "cyberpunk": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "hologram": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "retro": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "joy": { glow: 0, shadow_int: 20, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "firework": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "royal": { glow: 0, shadow_int: 20, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "spirit": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "victory": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "rainbow": { glow: 0, shadow_int: 20, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "toxic": { glow: 0, shadow_int: 20, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "lava": { glow: 0, shadow_int: 30, stroke_size: 0.5, color_type: 'solid', glow_type: 'text' },
    "synthwave": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "disco": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },

    // Luxury & Texture
    "metal": { glow: 0, shadow_int: 20, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "glass": { glow: 15, shadow_int: 0, stroke_size: 1, color_type: 'solid', glow_type: 'text' },
    "3d": { glow: 0, shadow_int: 40, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "ice": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "outline": { glow: 0, shadow_int: 20, stroke_size: 0.4, color_type: 'solid', glow_type: 'text' },
    "marble": { glow: 0, shadow_int: 20, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "velvet": { glow: 0, shadow_int: 20, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "diamond": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "leather": { glow: 0, shadow_int: 30, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "goldleaf": { glow: 0, shadow_int: 20, stroke_size: 0, color_type: 'solid', glow_type: 'text' },

    // Creative & Artistic
    "comic": { glow: 0, shadow_int: 30, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "arcade": { glow: 0, shadow_int: 20, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "matrix": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "horror": { glow: 0, shadow_int: 40, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "paper": { glow: 0, shadow_int: 30, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "vintage": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "dusk": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "graffiti": { glow: 0, shadow_int: 30, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "watercolor": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "chalk": { glow: 0, shadow_int: 10, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "popart": { glow: 0, shadow_int: 40, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "blueprint": { glow: 0, shadow_int: 15, stroke_size: 0, color_type: 'solid', glow_type: 'text' },

    // Advanced scenic / text-box presets
    "cloud-halo": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "cinematic-caption": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "calligraphy-gold": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "neo-prism": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "liquid-gold-box": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "aurora-glass-box": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "ink-sermon": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "velvet-marquee": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "modern-kinetic": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },
    "sacred-parchment": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' },

    "_fallback": { glow: 0, shadow_int: 0, stroke_size: 0, color_type: 'solid', glow_type: 'text' }
};

// =======================================================
// 🔌 SILENT AUTO-RECONNECT WEBSOCKET MANAGER + SEND QUEUE
// Menjaga kompatibilitas penuh `ws` & `window.ws` untuk script.js, bg.js, plugin.js, external.js
// =======================================================
const _WS_BACKOFF_STEPS = [1000, 2000, 5000];
const _WS_MAX_QUEUE = 20;
const _wsListeners = { open: [], message: [], close: [], error: [] };
const _wsQueue = [];
let _rawWs = null;
let _wsReconnectTimer = null;
let _wsReconnectAttempt = 0;
let _wsBetaHalted = false;

function _redirectForBetaRevoked(reason) {
    if (_wsBetaHalted) return;
    _wsBetaHalted = true;
    if (_wsReconnectTimer) {
        clearTimeout(_wsReconnectTimer);
        _wsReconnectTimer = null;
    }
    const r = encodeURIComponent(String(reason || 'expired'));
    window.location.replace(`/?require_beta_access=true&reason=${r}`);
}

function _enqueueWsMessage(payloadStr) {
    // Hindari menumpuk heartbeat sync_time di antrian offline
    if (typeof payloadStr === 'string' && payloadStr.includes('"sync_time"')) {
        return;
    }
    if (_wsQueue.length >= _WS_MAX_QUEUE) {
        _wsQueue.shift();
    }
    _wsQueue.push(payloadStr);
}

function _flushWsQueue() {
    if (!_rawWs || _rawWs.readyState !== WebSocket.OPEN) return;
    while (_wsQueue.length > 0 && _rawWs.readyState === WebSocket.OPEN) {
        const nextMsg = _wsQueue.shift();
        try {
            _rawWs.send(nextMsg);
        } catch (_) {
            _wsQueue.unshift(nextMsg);
            break;
        }
    }
}

function _initControllerWs() {
    if (_wsBetaHalted) return;
    if (_rawWs && (_rawWs.readyState === WebSocket.OPEN || _rawWs.readyState === WebSocket.CONNECTING)) {
        return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let sock;
    try {
        sock = new WebSocket(`${protocol}//${window.location.host}/ws`);
    } catch (_) {
        _scheduleControllerWsReconnect();
        return;
    }
    _rawWs = sock;

    sock.addEventListener('open', (ev) => {
        if (sock !== _rawWs) return;
        _wsReconnectAttempt = 0;
        if (_wsReconnectTimer) {
            clearTimeout(_wsReconnectTimer);
            _wsReconnectTimer = null;
        }
        _flushWsQueue();
        _wsListeners.open.forEach((fn) => {
            try { fn.call(ws, ev); } catch (_) { }
        });
    });

    sock.addEventListener('message', (ev) => {
        if (sock !== _rawWs) return;
        _wsListeners.message.forEach((fn) => {
            try { fn.call(ws, ev); } catch (_) { }
        });
    });

    sock.addEventListener('close', (ev) => {
        if (sock !== _rawWs) return;
        _wsListeners.close.forEach((fn) => {
            try { fn.call(ws, ev); } catch (_) { }
        });
        if (ev && ev.code === 4001) {
            const rawReason = (ev.reason || '').replace(/^beta_/, '') || 'inactive';
            _redirectForBetaRevoked(rawReason);
            return;
        }
        _scheduleControllerWsReconnect();
    });

    sock.addEventListener('error', (ev) => {
        if (sock !== _rawWs) return;
        _wsListeners.error.forEach((fn) => {
            try { fn.call(ws, ev); } catch (_) { }
        });
        try { sock.close(); } catch (_) { }
    });
}

function _scheduleControllerWsReconnect() {
    if (_wsBetaHalted || _wsReconnectTimer) return;
    const delay = _WS_BACKOFF_STEPS[Math.min(_wsReconnectAttempt, _WS_BACKOFF_STEPS.length - 1)];
    _wsReconnectAttempt += 1;
    _wsReconnectTimer = setTimeout(() => {
        _wsReconnectTimer = null;
        _initControllerWs();
    }, delay);
}

const ws = {
    get readyState() {
        return _rawWs ? _rawWs.readyState : WebSocket.CLOSED;
    },
    get url() {
        return _rawWs ? _rawWs.url : '';
    },
    send(data) {
        if (_wsBetaHalted) return false;
        const payload = (typeof data === 'string') ? data : JSON.stringify(data);
        if (_rawWs && _rawWs.readyState === WebSocket.OPEN) {
            try {
                _rawWs.send(payload);
                return true;
            } catch (_) {
                _enqueueWsMessage(payload);
                _scheduleControllerWsReconnect();
                return false;
            }
        }
        _enqueueWsMessage(payload);
        if (!_rawWs || _rawWs.readyState === WebSocket.CLOSED) {
            _scheduleControllerWsReconnect();
        }
        return false;
    },
    close(code, reason) {
        if (_rawWs) {
            try { _rawWs.close(code, reason); } catch (_) { }
        }
    },
    addEventListener(type, fn) {
        if (typeof fn !== 'function') return;
        if (_wsListeners[type]) _wsListeners[type].push(fn);
    },
    removeEventListener(type, fn) {
        if (!_wsListeners[type]) return;
        const idx = _wsListeners[type].indexOf(fn);
        if (idx !== -1) _wsListeners[type].splice(idx, 1);
    },
};

function safeWsSend(objOrStr) {
    return ws.send(objOrStr);
}
window.ws = ws; // expose globally so plugin.js, bg.js, and external.js can send safely
window.safeWsSend = safeWsSend;

ws.addEventListener('open', () => {
    if (typeof _WEShield !== 'undefined' && typeof _WEShield.attachSocket === 'function') {
        _WEShield.attachSocket(_rawWs);
    }
    if (typeof applyScriptureSettings === "function") {
        applyScriptureSettings();
    }
    if (typeof sendLTConfig === "function") {
        sendLTConfig();
    }
    if (typeof sendFBConfig === "function") {
        sendFBConfig();
    }
});

_initControllerWs();
window.pendingThumbWatchers = window.pendingThumbWatchers || new Map();

function markThumbAsReadyRealtime(category, itemId) {
    if (!window.freshThumbs) window.freshThumbs = new Set();
    window.freshThumbs.add(itemId);

    const imgTags = document.querySelectorAll(`img[data-thumb-id="${itemId}"]`);
    imgTags.forEach(img => {
        img.style.opacity = "0.2";
        setTimeout(() => {
            img.src = `/api/media/thumb/${category}/${itemId}?t=${Date.now()}`;
            img.style.opacity = "1";
        }, 120);
    });

    if (window.pendingThumbWatchers.has(itemId)) {
        clearInterval(window.pendingThumbWatchers.get(itemId));
        window.pendingThumbWatchers.delete(itemId);
    }
}

window.startThumbRealtimeWatcher = function (ids, category = "video") {
    if (!Array.isArray(ids) || ids.length === 0) return;

    ids.forEach((itemId) => {
        if (!itemId || window.pendingThumbWatchers.has(itemId)) return;

        const intervalId = setInterval(async () => {
            try {
                const res = await fetch(`/api/media/thumb_status/${category}/${itemId}?t=${Date.now()}`);
                const data = await res.json();
                if (data && data.ready) {
                    markThumbAsReadyRealtime(category, itemId);
                }
            } catch (_) {
                // Silent retry: watcher akan mencoba lagi.
            }
        }, 1200);

        window.pendingThumbWatchers.set(itemId, intervalId);

        // Hard timeout biar watcher tidak menggantung selamanya jika file rusak.
        setTimeout(() => {
            if (window.pendingThumbWatchers.has(itemId)) {
                clearInterval(window.pendingThumbWatchers.get(itemId));
                window.pendingThumbWatchers.delete(itemId);
            }
        }, 120000);
    });
};

// 🎯 MASTER AUDIO ENGINE (MEMINDAHKAN AUDIO KE CONTROL.HTML)
const masterBgAudio = new Audio();
const masterSfxAudio = new Audio();
const monitorBgAudio = new Audio();
const monitorSfxAudio = new Audio();
// [FIX] Expose players on window so external.js (Media Sender receiver) can pause/resume/stop them.
// Top-level `const` does NOT create window properties; without this, every window.masterXAudio call was a silent no-op.
window.masterBgAudio = masterBgAudio;
window.masterSfxAudio = masterSfxAudio;
window.monitorBgAudio = monitorBgAudio;
window.monitorSfxAudio = monitorSfxAudio;
window._localBgVolume = 1.0;
window._localSfxVolume = 1.0;

// True when Media Sender FTB is active and the incoming update belongs to the Sender (staged under blackout)
function isRemoteStagedUnderFtb(payload) {
    try {
        return Boolean(
            payload && payload.source === "remote_sender" &&
            window.externalMediaReceiver && typeof window.externalMediaReceiver.isFtbActive === "function" &&
            window.externalMediaReceiver.isFtbActive()
        );
    } catch (_) { return false; }
}

function syncMonitorPlayer(master, monitor) {
    if (!window._audioMonitorEnabled) {
        monitor.pause();
        monitor.muted = true;
        return;
    }
    const masterAttrSrc = master.getAttribute ? master.getAttribute("src") : "";
    if (!masterAttrSrc || masterAttrSrc.trim() === "") {
        if (!monitor.paused) monitor.pause();
        if (monitor.getAttribute && monitor.getAttribute("src")) {
            monitor.removeAttribute("src");
            try { monitor.load(); } catch (_) { }
        }
        return;
    }
    monitor.muted = false;
    if (monitor.src !== master.src) {
        monitor.src = master.src;
    }
    monitor.loop = master.loop;
    monitor.volume = master.volume;
    if (master.paused) {
        monitor.pause();
    } else {
        if (monitor.paused || Math.abs(monitor.currentTime - master.currentTime) > 0.8) {
            monitor.currentTime = master.currentTime;
        }
        monitor.play().catch(() => { });
    }
}
window.syncMonitorPlayer = syncMonitorPlayer;

// Keep monitor players perfectly in sync with the master players
setInterval(() => {
    syncMonitorPlayer(masterBgAudio, monitorBgAudio);
    syncMonitorPlayer(masterSfxAudio, monitorSfxAudio);
}, 500);

const VIDEO_TIMELINE_SNAPSHOT_KEY = "showlyrics_video_timeline_snapshot";

function normalizeMediaVolume(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 1;
    return Math.max(0, Math.min(1, num > 1 ? num / 100 : num));
}

function getEffectiveLocalVolume(target) {
    const isAudio = (target === "audio" || target === "sfx");
    try {
        const fpId = isAudio ? "fp-audio" : "fp-video";
        const fpEl = document.getElementById(fpId);
        if (fpEl && window.activeLibraryPlayers && window.activeLibraryPlayers[isAudio ? "audio" : "video"]) {
            const fpSlider = fpEl.querySelector(".fp-dynamic-vol-slider");
            if (fpSlider && fpSlider.value !== undefined) {
                return normalizeMediaVolume(fpSlider.value);
            }
        }
        if (
            window._liveMediaActive &&
            window.activeMediaScheduledItem &&
            window.activeMediaScheduledItem.resolved_category === (isAudio ? "audio" : "video")
        ) {
            const schedSlider = document.getElementById("media-vol-slider");
            if (schedSlider && schedSlider.value !== undefined) {
                return normalizeMediaVolume(Number(schedSlider.value) / 100);
            }
        }
    } catch (_) { }
    const stored = isAudio ? window._localSfxVolume : window._localBgVolume;
    return Number.isFinite(stored) ? Math.max(0, Math.min(1, stored)) : 1.0;
}
window.getEffectiveLocalVolume = getEffectiveLocalVolume;

function saveVideoTimelineSnapshot(extra = {}) {
    const snapshot = {
        activeVideoUrl: masterBgAudio.currentSrc || masterBgAudio.src || "",
        behavior: masterBgAudio.dataset.behavior || (masterBgAudio.loop ? "loop" : "once"),
        isPlaying: !masterBgAudio.paused,
        currentTime: Number.isFinite(masterBgAudio.currentTime) ? masterBgAudio.currentTime : 0,
        sentAt: Date.now(),
        ...extra
    };
    try { localStorage.setItem(VIDEO_TIMELINE_SNAPSHOT_KEY, JSON.stringify(snapshot)); } catch (_) { }
}

function applyMediaTimeSync(targetPlayer, rawValue, options = {}) {
    if (!targetPlayer) return;
    const targetTime = Number(rawValue);
    if (!Number.isFinite(targetTime)) return;

    try {
        if ("preservesPitch" in targetPlayer) targetPlayer.preservesPitch = true;
        else if ("webkitPreservesPitch" in targetPlayer) targetPlayer.webkitPreservesPitch = true;
    } catch (_) { }

    const currentTime = Number.isFinite(targetPlayer.currentTime) ? targetPlayer.currentTime : 0;
    const signedDrift = currentTime - targetTime;
    const drift = Math.abs(signedDrift);

    if (options.force) {
        if (drift < 0.05) return;
        try {
            if (targetPlayer.playbackRate !== 1.0) targetPlayer.playbackRate = 1.0;
            targetPlayer.currentTime = Math.max(0, targetTime);
        } catch (_) { }
        return;
    }

    // Tier 1 (< 0.35s): ignore micro-drift and restore normal rate when aligned
    if (drift < 0.35) {
        if (drift < 0.12 && targetPlayer.playbackRate !== 1.0) {
            try { targetPlayer.playbackRate = 1.0; } catch (_) { }
        }
        return;
    }

    // Tier 2 (0.35s - 1.5s): smooth catch-up via playbackRate without flushing audio buffer
    if (drift <= 1.5) {
        if (targetPlayer.readyState >= 3 && !targetPlayer.paused) {
            const newRate = signedDrift < 0 ? 1.02 : 0.98;
            if (Math.abs((targetPlayer.playbackRate || 1.0) - newRate) > 0.003) {
                try { targetPlayer.playbackRate = newRate; } catch (_) { }
            }
        }
        return;
    }

    // Tier 3 (> 1.5s): hard-seek
    try {
        if (targetPlayer.playbackRate !== 1.0) targetPlayer.playbackRate = 1.0;
        targetPlayer.currentTime = Math.max(0, targetTime);
    } catch (_) { }
}

// 🚀 MASTER TIME SYNC ENGINE (ANTI DELAY & DOUBLE REQUEST)
// Mengirimkan waktu asli dari control.html ke semua penonton setiap 1 detik
setInterval(() => {
    if (ws && ws.readyState === WebSocket.OPEN) {
        if (!masterBgAudio.paused && masterBgAudio.readyState > 0) {
            saveVideoTimelineSnapshot();
        }
        const isRemoteSenderAudio = Boolean(window.activeSenderMedia && window.activeSenderMedia.audio);
        if (!isRemoteSenderAudio && !masterSfxAudio.paused && masterSfxAudio.readyState > 0) {
            ws.send(JSON.stringify({
                action: "bg_control",
                payload: { target: "audio", command: "sync_time", value: masterSfxAudio.currentTime }
            }));
        }
    }
}, 1000);

// ==========================================
// ⚙️ SINKRONISASI UI GLOBAL & MASTER AUDIO
// ==========================================
ws.addEventListener("message", function (event) {
    if (typeof _WEShield !== 'undefined' && typeof _WEShield.dispatch === 'function') {
        _WEShield.dispatch(event.data, function (data) {
            handleMasterWsMessage(data);
        });
    } else {
        try { handleMasterWsMessage(JSON.parse(event.data)); } catch (_) { }
    }
});

function handleMasterWsMessage(data) {
    try {
        const action = data.action || data.type;
        const payload = data.payload || {};

        if (action === "beta_revoked") {
            _redirectForBetaRevoked(data.reason || "expired");
            return;
        }

        // 🎯 TANGKAP LAYER CONFIG (Dynamic Z-Index)
        if (action === "update_layers") {
            if (data.layers_main) {
                layerConfigMain = data.layers_main;
                renderLayerList('main');
            }
            if (data.layers_lt) {
                layerConfigLt = data.layers_lt;
                renderLayerList('lt');
            }
            if (data.target && data.layers) {
                if (data.target === 'main') {
                    layerConfigMain = data.layers;
                    renderLayerList('main');
                } else {
                    layerConfigLt = data.layers;
                    renderLayerList('lt');
                }
            }
            return;
        }

        if (action === "update_plugin_state") {
            if (typeof window.handlePluginStateUpdate === "function") {
                window.handlePluginStateUpdate(data.active_plugins);
            }
            return;
        }

        // --- 🎯 TANGKAP MASTER AUDIO ---
        if (action === "update_background") {
            if (payload.url) {
                // [SINGLE-OWNER FIX Q7] When source is remote_sender, external.js owns masterBgAudio (including its lightweight .m4a stream, mute state, and fade-in).
                // Do not overwrite masterBgAudio.src, reset currentTime, or force muted = false here.
                if (payload.source === "remote_sender") {
                    const snapshotExtra = { activeVideoUrl: payload.url, isPlaying: payload.playing !== false };
                    if (payload.forceReplay) snapshotExtra.currentTime = 0;
                    else if (payload.start_time !== undefined) snapshotExtra.currentTime = parseFloat(payload.start_time) || 0;
                    saveVideoTimelineSnapshot(snapshotExtra);
                    return;
                }
                if (typeof window.cancelExternalAudioFade === "function") {
                    window.cancelExternalAudioFade("bg");
                }
                masterBgAudio._intendedPlaying = true;
                masterBgAudio.onerror = null;
                masterBgAudio.onloadedmetadata = null;
                masterBgAudio.onended = null;
                try { masterBgAudio.playbackRate = 1.0; } catch (_) { }

                let url = payload.url;
                if (url.startsWith('/')) {
                    url = window.location.protocol + "//" + window.location.hostname + ":18899" + url;
                } else {
                    try {
                        const parsedUrl = new URL(url);
                        parsedUrl.host = window.location.hostname + ":18899";
                        url = parsedUrl.href;
                    } catch (e) {
                        url = url.replace(/:\d+/, ":18899").replace("localhost", window.location.hostname).replace("127.0.0.1", window.location.hostname);
                    }
                }
                const currentBgSrc = masterBgAudio.getAttribute ? (masterBgAudio.getAttribute("src") || "") : "";
                const isSameVideo = Boolean(currentBgSrc && (masterBgAudio.currentSrc || masterBgAudio.src || "").includes(url));
                if (!isSameVideo || payload.forceReplay) {
                    masterBgAudio.src = url;
                    if (payload.forceReplay) {
                        try { masterBgAudio.currentTime = 0; } catch (_) { }
                    } else if (payload.start_time !== undefined) {
                        try { masterBgAudio.currentTime = parseFloat(payload.start_time) || 0; } catch (_) { }
                    }
                } else {
                    // Same video URL, seek to start_time (especially on unclear or replay)
                    try {
                        masterBgAudio.currentTime = parseFloat(payload.start_time) || 0;
                    } catch (_) { }
                }
                masterBgAudio.loop = (payload.behavior === "loop" || payload.behavior === undefined);
                masterBgAudio.dataset.behavior = payload.behavior || "loop";
                // [FIX] masterBgAudio di control.html SELALU unmuted — payload.muted hanya untuk display output
                // Audio routing dikelola via updateMonitorPlayersRouting() -> setSinkId ke audio_output_device
                masterBgAudio.muted = false;
                masterBgAudio.volume = getEffectiveLocalVolume("video");
                if (isRemoteStagedUnderFtb(payload)) { masterBgAudio.pause(); } else { masterBgAudio.play().catch(e => console.warn(e)); }
                const snapshotExtra = { activeVideoUrl: payload.url, isPlaying: true };
                if (payload.forceReplay) snapshotExtra.currentTime = 0;
                else if (payload.start_time !== undefined) snapshotExtra.currentTime = parseFloat(payload.start_time) || 0;
                saveVideoTimelineSnapshot(snapshotExtra);
            } else {
                // When source is remote_sender, external.js has already stopped its own channel synchronously.
                // Never wipe masterBgAudio if local video has already taken over.
                if (payload.source === "remote_sender") {
                    const currentBgSrc = masterBgAudio.getAttribute ? (masterBgAudio.getAttribute("src") || "") : "";
                    if (!currentBgSrc) {
                        saveVideoTimelineSnapshot({ activeVideoUrl: "", isPlaying: false, currentTime: 0 });
                    }
                    return;
                }
                if (typeof window.cancelExternalAudioFade === "function") {
                    window.cancelExternalAudioFade("bg");
                }
                masterBgAudio._intendedPlaying = false;
                masterBgAudio.onerror = null;
                masterBgAudio.onloadedmetadata = null;
                masterBgAudio.onended = null;
                try { masterBgAudio.playbackRate = 1.0; } catch (_) { }
                masterBgAudio.pause();
                masterBgAudio.removeAttribute('src');
                try { masterBgAudio.load(); } catch (_) { }
                masterBgAudio.muted = false;
                masterBgAudio.volume = getEffectiveLocalVolume("video");
                saveVideoTimelineSnapshot({ activeVideoUrl: "", isPlaying: false, currentTime: 0 });
            }
        }
        else if (action === "update_audio") {
            if (payload.url) {
                // [SINGLE-OWNER FIX Q7] Sender audio is owned and initialized directly by external.js: do NOT reload or re-trigger play here.
                if (payload.source === "remote_sender") {
                    return;
                }
                if (typeof window.cancelExternalAudioFade === "function") {
                    window.cancelExternalAudioFade("sfx");
                }
                masterSfxAudio._intendedPlaying = true;
                masterSfxAudio.onerror = null;
                masterSfxAudio.onloadedmetadata = null;
                masterSfxAudio.onended = null;
                try { masterSfxAudio.playbackRate = 1.0; } catch (_) { }

                let sameAudio = false;
                const currentSfxSrc = masterSfxAudio.getAttribute ? (masterSfxAudio.getAttribute("src") || "") : "";
                if (currentSfxSrc) {
                    try { sameAudio = masterSfxAudio.src === new URL(payload.url, window.location.href).href; } catch (_) { }
                }
                if (!sameAudio) {
                    masterSfxAudio.src = payload.url;
                }
                masterSfxAudio.loop = (payload.loop !== false && payload.behavior !== "once");
                masterSfxAudio.dataset.behavior = payload.behavior || (masterSfxAudio.loop ? "loop" : "once");
                masterSfxAudio.muted = false;
                masterSfxAudio.volume = getEffectiveLocalVolume("audio");
                if (isRemoteStagedUnderFtb(payload)) { masterSfxAudio.pause(); }
                else { masterSfxAudio.play().catch(e => console.warn(e)); }
            } else {
                if (payload.source === "remote_sender") {
                    return;
                }
                if (typeof window.cancelExternalAudioFade === "function") {
                    window.cancelExternalAudioFade("sfx");
                }
                masterSfxAudio._intendedPlaying = false;
                masterSfxAudio.onerror = null;
                masterSfxAudio.onloadedmetadata = null;
                masterSfxAudio.onended = null;
                try { masterSfxAudio.playbackRate = 1.0; } catch (_) { }
                masterSfxAudio.pause();
                masterSfxAudio.removeAttribute('src');
                try { masterSfxAudio.load(); } catch (_) { }
                masterSfxAudio.muted = false;
                masterSfxAudio.volume = getEffectiveLocalVolume("audio");
            }
        }
        else if (action === "bg_control") {
            const cmd = payload.command;
            // [SINGLE-OWNER FIX Q7] When source is remote_sender, external.js has already applied the control command
            // directly to masterBgAudio / masterSfxAudio in control.html and only sent bg_control for display outputs.
            if (payload.source === "remote_sender") {
                if (payload.target === "video") {
                    const isManualRemoteSync = cmd === "sync_time" && payload.manual === true;
                    if (!isManualRemoteSync || payload.force === true) saveVideoTimelineSnapshot();
                }
                return;
            }
            const targetPlayer = (payload.target === "video") ? masterBgAudio : masterSfxAudio;
            if (cmd === "play") {
                targetPlayer._intendedPlaying = true;
                targetPlayer.muted = false;
                if (targetPlayer.volume === 0) {
                    targetPlayer.volume = getEffectiveLocalVolume(payload.target);
                }
                targetPlayer.play().catch(e => console.warn(e));
                if (typeof activePlayers !== "undefined" && activePlayers[payload.target]) {
                    activePlayers[payload.target].playing = true;
                    const fpBtn = document.getElementById(`btn-play-${payload.target}`);
                    if (fpBtn) {
                        fpBtn.innerHTML = "⏸️ PAUSE";
                        fpBtn.className = "fp-dynamic-btn fp-dynamic-btn-play";
                    }
                }
                const schedPlayBtn = document.getElementById("media-btn-play");
                if (schedPlayBtn) {
                    schedPlayBtn.classList.remove("paused");
                    const iconSpan = document.getElementById("media-play-icon");
                    const textSpan = document.getElementById("media-play-text");
                    if (iconSpan) iconSpan.innerText = "⏸️";
                    if (textSpan) textSpan.innerText = "PAUSE LIVE";
                }
            }
            else if (cmd === "pause") {
                targetPlayer._intendedPlaying = false;
                targetPlayer.pause();
                if (typeof activePlayers !== "undefined" && activePlayers[payload.target]) {
                    activePlayers[payload.target].playing = false;
                    const fpBtn = document.getElementById(`btn-play-${payload.target}`);
                    if (fpBtn) {
                        fpBtn.innerHTML = "▶️ PLAY";
                        fpBtn.className = "fp-dynamic-btn fp-dynamic-btn-pause";
                    }
                }
                const schedPlayBtn = document.getElementById("media-btn-play");
                if (schedPlayBtn) {
                    schedPlayBtn.classList.add("paused");
                    const iconSpan = document.getElementById("media-play-icon");
                    const textSpan = document.getElementById("media-play-text");
                    if (iconSpan) iconSpan.innerText = "▶️";
                    if (textSpan) textSpan.innerText = "PLAY LIVE";
                }
            }
            else if (cmd === "stop") {
                targetPlayer._intendedPlaying = false;
                targetPlayer.onerror = null;
                targetPlayer.onloadedmetadata = null;
                targetPlayer.onended = null;
                try { targetPlayer.playbackRate = 1.0; } catch (_) { }
                targetPlayer.pause();
                try { targetPlayer.currentTime = 0; } catch (_) { }
                targetPlayer.removeAttribute("src");
                try { targetPlayer.load(); } catch (_) { }
                targetPlayer.muted = false;
                targetPlayer.volume = getEffectiveLocalVolume(payload.target);
            }
            else if (cmd === "replay") {
                const expectedUrl = payload.url || "";
                const currentUrl = targetPlayer.currentSrc || targetPlayer.src || "";
                if (!expectedUrl || currentUrl.includes(expectedUrl)) {
                    targetPlayer._intendedPlaying = true;
                    targetPlayer.muted = false;
                    if (targetPlayer.volume === 0) {
                        targetPlayer.volume = getEffectiveLocalVolume(payload.target);
                    }
                    try { targetPlayer.playbackRate = 1.0; } catch (_) { }
                    targetPlayer.currentTime = 0;
                    targetPlayer.play().catch(e => console.warn(e));
                }
            }
            else if (cmd === "volume") {
                const normVol = normalizeMediaVolume(payload.value);
                if (payload.target === "video") window._localBgVolume = normVol;
                else window._localSfxVolume = normVol;
                targetPlayer.volume = normVol;
                targetPlayer.muted = false;
            }
            else if (cmd === "loop") { targetPlayer.loop = (payload.value === true || payload.value === "loop"); }
            else if (cmd === "mute_toggle" || cmd === "mute") { targetPlayer.muted = Boolean(payload.value); }
            else if (cmd === "unmute") { targetPlayer.muted = false; }
            else if (cmd === "update_behavior") {
                targetPlayer.dataset.behavior = payload.value;
                targetPlayer.loop = (payload.value === "loop" || payload.value === undefined);
            }
            else if (cmd === "seek" || cmd === "sync_time") {
                applyMediaTimeSync(targetPlayer, payload.value, { force: cmd === "seek" || payload.force === true });
            }
            if (payload.target === "video") {
                const isManualRemoteSync = payload.source === "remote_sender" && cmd === "sync_time" && payload.manual === true;
                if (!isManualRemoteSync || payload.force === true) saveVideoTimelineSnapshot();
            }
        }

        // 🎯 TANGKAP NOTIFIKASI THUMBNAIL BERES DARI FFMPEG
        if (action === "thumb_ready") {
            markThumbAsReadyRealtime(data.category || "video", data.id);
        }

        // 🎯 TANGKAP NOTIFIKASI PPT/PDF ANTRIAN / PROSES / SUKSES DI BACKEND
        if (action === "presentation_queued") {
            const name = data.name || "Presentation";
            showMiniToast(`⏳ Queued: ${name}`, "info", 0, `ppt-extract-${data.id}`);
        }

        if (action === "presentation_processing") {
            const name = data.name || "Presentation";
            showMiniToast(`⚡ Converting: ${name}`, "loading", 0, `ppt-extract-${data.id}`);
        }

        if (action === "presentation_ready") {
            if (typeof markThumbAsReadyRealtime === "function") {
                markThumbAsReadyRealtime("presentation", data.id);
            }
            if (typeof window.loadMediaData === "function") {
                window.loadMediaData("presentation");
            }

            // Update/remove mini toast
            const name = data.name || "Presentation";
            showMiniToast(`✅ Success: ${name} converted!`, "success", 2000, `ppt-extract-${data.id}`);

            if (window.waitingForPPTId && window.waitingForPPTId === data.id) {
                showToast("PowerPoint slides converted successfully!", "success", 2000);
                window.loadPPTToGrid(window.waitingForPPTId, window.waitingForPPTName);
            }
        }

        if (action === "presentation_failed") {
            const name = data.name || "Presentation";
            showMiniToast(`❌ Failed: ${name} conversion failed!`, "error", 4000, `ppt-extract-${data.id}`);

            if (window.waitingForPPTId && window.waitingForPPTId === data.id) {
                showToast("PowerPoint conversion failed: " + (data.message || "Unknown error"), "error", 4000);
                const overlay = document.getElementById('ppt-grid-overlay');
                if (overlay) overlay.classList.remove('show-flex');
                window.waitingForPPTId = null;
                window.waitingForPPTName = null;
            }
        }
        if (action === "cache_status") {
            const videoId = payload.video_id;
            const status = payload.status;
            console.log(`[Cache Sync] Client background video ${videoId} status: ${status}`);
        }

        // 🎯 FORCE SIGN OUT (Revoke License UI)
        if (action === "force_watermark") {
            const card = document.getElementById('license-card-container');
            if (card) {
                card.innerHTML = `
                        <label class="license-label">🔑 LICENSE ACTIVATION</label>
                        <p class="license-desc">Enter your License Key to activate full features or transfer the license to this device.</p>
                        <input type="text" id="license-key-input" class="compact-input license-input" placeholder="SHOWLYRICS026">
                        <button class="btn-action btn-activate" onclick="activateShowLyrics()">ACTIVATE DEVICE</button>
                    `;
            }
        }

        // 🌐 NETWORK GUARD — CDN Strike / Warning / Restored
        if (action === "network_strike") {
            _handleNetworkStrike(data);
        }
        if (action === "network_warning") {
            _showNetworkToast(data.message || "Koneksi tidak stabil.", "warning");
        }
        if (action === "network_restored") {
            _dismissNetworkModals();
        }

        // Tangkap data memori settingan dari main.py pas baru connect / ada update
        if (data.type === "update_bg_config" || data.action === "update_bg_config") {
            const config = data.payload;

            // 1. Update Slider Crossfade & Teksnya
            if (config.transition !== undefined) {
                const transInput = document.getElementById('bg-trans-input');
                const transVal = document.getElementById('val-bg-trans');
                if (transInput) transInput.value = config.transition;
                if (transVal) transVal.innerText = config.transition + 's';
            }

            // 2. Update Dropdown Fit Mode
            if (config.fit !== undefined) {
                const fitInput = document.getElementById('bg-fit-input');
                if (fitInput) fitInput.value = config.fit;
            }
            // 🎯 TANGKAP PHOTO FIT
            if (config.photo_fit !== undefined) {
                const pFitInput = document.getElementById('photo-fit-input');
                if (pFitInput) pFitInput.value = config.photo_fit;
            }

            // 🎯 TANGKAP PHOTO FIT
            if (config.photo_fit !== undefined) {
                const pFitInput = document.getElementById('photo-fit-input');
                if (pFitInput) pFitInput.value = config.photo_fit;
            }
        }

        // 🚨 EMERGENCY CONTROL SYNC (REALTIME STATE RECOVERY)
        if (action === "alert") {
            const d = data.data;
            if (d) {
                isAlertOn = !!d.show;
                const btn = document.getElementById("btn-toggle-alert");
                if (btn) {
                    if (isAlertOn) {
                        btn.innerHTML = "🛑 HIDE ALERT";
                        btn.style.background = "#dc3545";
                    } else {
                        btn.innerHTML = "📢 SHOW ALERT";
                        btn.style.background = "#28a745";
                    }
                }
                const input = document.getElementById("alert-input");
                if (input) {
                    input.value = d.text || "";
                }

                const chkMain = document.getElementById("chk-main");
                if (chkMain && d.targets) {
                    chkMain.checked = d.targets.includes('main');
                }
                const chkLt = document.getElementById("chk-lt");
                if (chkLt && d.targets) {
                    chkLt.checked = d.targets.includes('lt');
                }

                const alertPos = document.getElementById("alert-pos");
                if (alertPos && d.position) {
                    alertPos.value = d.position;
                }

                const alertColor = document.getElementById("alert-color");
                if (alertColor && d.color) {
                    alertColor.value = d.color;
                }

                if (d.speed !== undefined) {
                    const alertSpeed = document.getElementById("alert-speed");
                    const valAlertSpeed = document.getElementById("val-alert-speed");
                    if (alertSpeed) alertSpeed.value = d.speed;
                    if (valAlertSpeed) valAlertSpeed.innerText = d.speed + "s";
                }

                updateNavBlinker();
            }
        }

        if (action === "stage_msg") {
            const d = data.data;
            if (d) {
                isMessageOn = !!d.show;
                const btn = document.getElementById("btn-toggle-msg");
                if (btn) {
                    if (isMessageOn) {
                        btn.innerHTML = "🛑 HIDE MESSAGE";
                        btn.style.background = "#dc3545";
                    } else {
                        btn.innerHTML = "💬 SHOW MESSAGE";
                        btn.style.background = "#28a745";
                    }
                }
                const input = document.getElementById("stage-input");
                if (input) {
                    input.value = d.text || "";
                }
                const chkFlash = document.getElementById("chk-flash");
                if (chkFlash) {
                    chkFlash.checked = !!d.flash;
                }
                updateNavBlinker();
            }
        }

        if (action === "stage_countdown") {
            const d = data.data;
            if (d) {
                const btn = document.getElementById("btn-toggle-timer");
                const btnText = document.getElementById("timer-btn-text");
                const display = document.getElementById("controller-timer-display");
                const minInput = document.getElementById("timer-min");

                if (d.action === "start") {
                    isStageTimerRunning = true;
                    if (btn) btn.style.background = "#dc3545";
                    if (btnText) btnText.innerText = "⏹ STOP";
                    if (display) {
                        display.style.display = "inline-block";
                        display.classList.remove("nav-blink-alert");
                    }
                    if (minInput) minInput.disabled = true;

                    stageTimeLeft = d.seconds;

                    const updateControllerTimer = () => {
                        const m = Math.floor(stageTimeLeft / 60).toString().padStart(2, '0');
                        const s = (stageTimeLeft % 60).toString().padStart(2, '0');
                        if (display) display.innerText = `${m}:${s}`;

                        if (stageTimeLeft <= 0) {
                            clearInterval(stageTimerInterval);
                            if (display) display.classList.add("nav-blink-alert");
                        }
                        stageTimeLeft--;
                    };

                    clearInterval(stageTimerInterval);
                    updateControllerTimer();
                    stageTimerInterval = setInterval(updateControllerTimer, 1000);
                } else if (d.action === "stop") {
                    isStageTimerRunning = false;
                    clearInterval(stageTimerInterval);
                    if (btn) btn.style.background = "#28a745";
                    if (btnText) btnText.innerText = "▶ START";
                    if (display) {
                        display.style.display = "none";
                        display.classList.remove("nav-blink-alert");
                    }
                    if (minInput) minInput.disabled = false;
                }
            }
        }

        if (action === "stage_rundown") {
            const d = data.data;
            if (d) {
                handleIncomingRundownState(d);
            }
        }
    } catch (e) {
        console.error("Settings sync failed:", e);
    }
}

// Stage Rundown State & Functions
let rundownState = {
    presetName: "",
    items: [],
    activeIndex: -1,
    status: "stopped",
    transitionMode: "auto",
    startedAt: 0,
    pausedRemaining: 0,
    overtimeStartedAt: 0,
    activeOffset: 0,
    miniTimerSize: 110,
    miniTitleSize: 80,
    miniTitleAuto: true,
    fullTimerSize: 190,
    fullTitleSize: 190,
    fullTitleAuto: true,
    overtimeFlash: true,
    overtimeColor: "#ff4081",
    overtimeSpeed: 1.0
};
let rundownTickInterval = null;

function handleIncomingRundownState(state) {
    rundownState = state;
    updateRundownStyleUI();

    const select = document.getElementById("rundown-preset-select");
    if (select && state.presetName) {
        select.value = state.presetName;
    }

    const transitionSelect = document.getElementById("rundown-transition-select");
    if (transitionSelect) {
        transitionSelect.value = state.transitionMode || "auto";
    }

    renderRundownUI();

    if (rundownState.status === "running" || rundownState.status === "overtime") {
        if (!rundownTickInterval) {
            rundownTickInterval = setInterval(tickRundown, 1000);
        }
    } else {
        if (rundownTickInterval) {
            clearInterval(rundownTickInterval);
            rundownTickInterval = null;
        }
    }

    // Auto show or clear overtime toast based on state status
    if (rundownState.status === "overtime") {
        const existingToast = document.getElementById("rundown-overtime-toast");
        if (!existingToast && rundownState.activeIndex !== -1 && rundownState.items && rundownState.items.length > 0) {
            const completedName = rundownState.items[rundownState.activeIndex].name;
            const nextIndex = rundownState.activeIndex + 1;
            const hasNext = nextIndex < rundownState.items.length;
            const nextName = hasNext ? rundownState.items[nextIndex].name : "Selesai";

            showRundownToast(
                `⚠️ [OVERTIME] ${completedName} telah habis waktu!`,
                "confirm",
                [
                    {
                        text: hasNext ? `Lanjut ke: ${nextName}` : "Selesaikan Rundown",
                        primary: true,
                        onClick: () => {
                            confirmRundownNext();
                        }
                    },
                    {
                        text: "Tetap Overtime",
                        primary: false,
                        keepToast: true,
                        onClick: () => {
                            keepRundownOvertime();
                        }
                    }
                ],
                "rundown-overtime-toast"
            );
        }
    } else {
        const existingToast = document.getElementById("rundown-overtime-toast");
        if (existingToast) {
            existingToast.remove();
        }
    }

    updateRundownTimerDisplay();
}

function getRundownTimeValues() {
    if (rundownState.activeIndex === -1 || !rundownState.items || rundownState.items.length === 0) {
        return { remaining: 0, overtime: 0, total: 0, mode: "duration" };
    }
    const item = rundownState.items[rundownState.activeIndex];
    const offset = rundownState.activeOffset || 0;

    if (item.mode === "duration") {
        const total = item.value * 60;
        if (rundownState.status === "running") {
            const elapsed = Math.floor((Date.now() - rundownState.startedAt) / 1000);
            const remaining = total - elapsed + offset;
            return { remaining, overtime: remaining < 0 ? -remaining : 0, total, mode: "duration" };
        } else if (rundownState.status === "paused") {
            const remaining = rundownState.pausedRemaining + offset;
            return { remaining, overtime: remaining < 0 ? -remaining : 0, total, mode: "duration" };
        } else if (rundownState.status === "overtime") {
            const elapsedOvertime = Math.floor((Date.now() - rundownState.overtimeStartedAt) / 1000);
            return { remaining: -elapsedOvertime, overtime: elapsedOvertime, total, mode: "duration" };
        } else {
            return { remaining: total, overtime: 0, total, mode: "duration" };
        }
    } else if (item.mode === "clock") {
        const [h, m] = item.value.split(':').map(Number);
        const targetDate = new Date();
        targetDate.setHours(h, m, 0, 0);

        const now = Date.now();
        let remaining = Math.floor((targetDate.getTime() - now) / 1000) + offset;

        if (rundownState.status === "running") {
            return { remaining, overtime: remaining < 0 ? -remaining : 0, total: 0, mode: "clock" };
        } else if (rundownState.status === "paused") {
            const remainingPaused = rundownState.pausedRemaining + offset;
            return { remaining: remainingPaused, overtime: remainingPaused < 0 ? -remainingPaused : 0, total: 0, mode: "clock" };
        } else if (rundownState.status === "overtime") {
            const elapsedOvertime = Math.floor((Date.now() - rundownState.overtimeStartedAt) / 1000);
            return { remaining: -elapsedOvertime, overtime: elapsedOvertime, total: 0, mode: "clock" };
        } else {
            return { remaining, overtime: 0, total: 0, mode: "clock" };
        }
    }
    return { remaining: 0, overtime: 0, total: 0, mode: "duration" };
}

function tickRundown() {
    updateRundownTimerDisplay();

    if (rundownState.status === "running") {
        const { remaining } = getRundownTimeValues();
        if (remaining <= 0) {
            if (rundownState.transitionMode === "auto") {
                const nextIndex = rundownState.activeIndex + 1;
                if (nextIndex < rundownState.items.length) {
                    const completedName = rundownState.items[rundownState.activeIndex].name;
                    const nextName = rundownState.items[nextIndex].name;

                    rundownState.activeIndex = nextIndex;
                    rundownState.startedAt = Date.now();
                    rundownState.activeOffset = 0;
                    rundownState.status = "running";

                    sendRundownState();
                    showRundownToast(`⏱️ ${completedName} selesai! Sekarang: ${nextName}`, "info");
                } else {
                    const completedName = rundownState.items[rundownState.activeIndex].name;
                    rundownState.status = "stopped";
                    rundownState.activeIndex = -1;
                    rundownState.activeOffset = 0;

                    sendRundownState();
                    showRundownToast(`⏱️ Rundown selesai: ${completedName}`, "info");
                }
            } else {
                const completedName = rundownState.items[rundownState.activeIndex].name;
                rundownState.status = "overtime";
                rundownState.overtimeStartedAt = Date.now();

                sendRundownState();

                const nextIndex = rundownState.activeIndex + 1;
                const hasNext = nextIndex < rundownState.items.length;
                const nextName = hasNext ? rundownState.items[nextIndex].name : "Selesai";

                showRundownToast(
                    `⚠️ [OVERTIME] ${completedName} telah habis waktu!`,
                    "confirm",
                    [
                        {
                            text: hasNext ? `Lanjut ke: ${nextName}` : "Selesaikan Rundown",
                            primary: true,
                            onClick: () => {
                                confirmRundownNext();
                            }
                        },
                        {
                            text: "Tetap Overtime",
                            primary: false,
                            keepToast: true,
                            onClick: () => {
                                keepRundownOvertime();
                            }
                        }
                    ],
                    "rundown-overtime-toast"
                );
            }
        }
    }
}

function updateRundownTimerDisplay() {
    const banner = document.getElementById("rundown-active-banner");
    const activeTitle = document.getElementById("rundown-active-title");
    const activeTime = document.getElementById("rundown-active-time");
    const activeStatus = document.getElementById("rundown-active-status");
    const playPauseBtn = document.getElementById("rundown-play-pause-btn");

    if (rundownState.activeIndex === -1 || !rundownState.items || rundownState.items.length === 0) {
        if (banner) banner.style.display = "none";
        return;
    }

    if (banner) banner.style.display = "block";
    const item = rundownState.items[rundownState.activeIndex];
    if (activeTitle) activeTitle.innerText = item.name;

    const { remaining, overtime } = getRundownTimeValues();

    let displayStr = "00:00:00";
    if (rundownState.status === "overtime" || remaining < 0) {
        const secs = overtime;
        const h = Math.floor(secs / 3600).toString().padStart(2, '0');
        const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        displayStr = `+${h}:${m}:${s}`;
        if (activeTime) {
            activeTime.innerText = displayStr;
            activeTime.style.color = "#ff4081";
        }
    } else {
        const secs = Math.max(0, remaining);
        const h = Math.floor(secs / 3600).toString().padStart(2, '0');
        const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        displayStr = `${h}:${m}:${s}`;
        if (activeTime) {
            activeTime.innerText = displayStr;
            activeTime.style.color = "#00e5ff";
        }
    }

    if (activeStatus) {
        activeStatus.innerText = rundownState.status;
        if (rundownState.status === "running") {
            activeStatus.style.background = "#28a745";
            activeStatus.style.color = "#fff";
        } else if (rundownState.status === "paused") {
            activeStatus.style.background = "#ffc107";
            activeStatus.style.color = "#000";
        } else if (rundownState.status === "overtime") {
            activeStatus.style.background = "#ff4081";
            activeStatus.style.color = "#fff";
        } else {
            activeStatus.style.background = "#555";
            activeStatus.style.color = "#fff";
        }
    }

    if (playPauseBtn) {
        if (rundownState.status === "running" || rundownState.status === "overtime") {
            playPauseBtn.innerText = "⏸ PAUSE";
            playPauseBtn.style.background = "#ffc107";
            playPauseBtn.style.color = "#000";
        } else if (rundownState.status === "paused") {
            playPauseBtn.innerText = "▶ RESUME";
            playPauseBtn.style.background = "#28a745";
            playPauseBtn.style.color = "#fff";
        } else {
            playPauseBtn.innerText = "▶ START";
            playPauseBtn.style.background = "#28a745";
            playPauseBtn.style.color = "#fff";
        }
    }
}

function renderRundownUI() {
    updateRundownTimerDisplay();

    const container = document.getElementById("rundown-items-container");
    if (!container) return;

    container.ondragover = (e) => { e.preventDefault(); };
    container.ondrop = (e) => {
        e.preventDefault();
        const fromIndex = window.rundownDragStartIndex;
        if (fromIndex === undefined || fromIndex === -1) return;

        const draggedItem = rundownState.items.splice(fromIndex, 1)[0];
        rundownState.items.push(draggedItem);

        if (rundownState.activeIndex === fromIndex) {
            rundownState.activeIndex = rundownState.items.length - 1;
        } else if (rundownState.activeIndex > fromIndex) {
            rundownState.activeIndex--;
        }

        window.rundownDragStartIndex = -1;
        sendRundownState();
        renderRundownUI();
    };

    if (!rundownState.items || rundownState.items.length === 0) {
        container.innerHTML = `<div style="color: #666; font-size: 0.8em; text-align: center; padding: 10px 0;">No rundown items added.</div>`;
        return;
    }

    container.innerHTML = "";
    rundownState.items.forEach((item, index) => {
        const itemRow = document.createElement("div");
        const isActive = rundownState.activeIndex === index;

        itemRow.style.display = "flex";
        itemRow.style.alignItems = "center";
        itemRow.style.justifyContent = "space-between";
        itemRow.style.padding = "6px 8px";
        itemRow.style.background = isActive ? "rgba(0, 229, 255, 0.1)" : "#222";
        itemRow.style.border = isActive ? "1px solid #00e5ff" : "1px solid #333";
        itemRow.style.borderRadius = "4px";
        itemRow.style.gap = "8px";

        // Drag and drop event listeners
        itemRow.draggable = true;
        itemRow.ondragstart = (e) => {
            window.rundownDragStartIndex = index;
            e.dataTransfer.effectAllowed = 'move';
        };
        itemRow.ondragover = (e) => {
            e.preventDefault();
            itemRow.style.borderTop = "2px solid #00e5ff";
            itemRow.style.background = "#333";
        };
        itemRow.ondragleave = (e) => {
            itemRow.style.borderTop = "";
            itemRow.style.background = isActive ? "rgba(0, 229, 255, 0.1)" : "#222";
        };
        itemRow.ondrop = (e) => {
            e.preventDefault();
            e.stopPropagation();
            itemRow.style.borderTop = "";
            itemRow.style.background = isActive ? "rgba(0, 229, 255, 0.1)" : "#222";

            const fromIndex = window.rundownDragStartIndex;
            if (fromIndex === undefined || fromIndex === -1 || fromIndex === index) return;

            const draggedItem = rundownState.items.splice(fromIndex, 1)[0];
            rundownState.items.splice(index, 0, draggedItem);

            if (rundownState.activeIndex === fromIndex) {
                rundownState.activeIndex = index;
            } else if (rundownState.activeIndex > fromIndex && rundownState.activeIndex <= index) {
                rundownState.activeIndex--;
            } else if (rundownState.activeIndex < fromIndex && rundownState.activeIndex >= index) {
                rundownState.activeIndex++;
            }

            window.rundownDragStartIndex = -1;
            sendRundownState();
            renderRundownUI();
        };

        // Grip handle
        const dragHandle = document.createElement("div");
        dragHandle.className = "drag-handle";
        dragHandle.innerText = "☰";
        dragHandle.title = "Drag to reorder";
        itemRow.appendChild(dragHandle);

        const infoCol = document.createElement("div");
        infoCol.style.flex = "1";
        infoCol.style.display = "flex";
        infoCol.style.flexDirection = "column";

        const nameSpan = document.createElement("span");
        nameSpan.innerText = item.name;
        nameSpan.style.fontWeight = "bold";
        nameSpan.style.fontSize = "0.9em";
        nameSpan.style.color = isActive ? "#00e5ff" : "#fff";

        const valSpan = document.createElement("span");
        valSpan.innerText = item.mode === "duration" ? `${item.value} Min` : `@ ${item.value}`;
        valSpan.style.fontSize = "0.75em";
        valSpan.style.color = "#aaa";

        infoCol.appendChild(nameSpan);
        infoCol.appendChild(valSpan);
        itemRow.appendChild(infoCol);

        const actionsCol = document.createElement("div");
        actionsCol.style.display = "flex";
        actionsCol.style.gap = "4px";
        actionsCol.style.alignItems = "center";

        const playBtn = document.createElement("button");
        playBtn.innerHTML = "▶";
        playBtn.style.background = "#28a745";
        playBtn.style.border = "none";
        playBtn.style.color = "#fff";
        playBtn.style.borderRadius = "3px";
        playBtn.style.padding = "2px 6px";
        playBtn.style.cursor = "pointer";
        playBtn.style.fontSize = "0.75em";
        playBtn.onclick = () => {
            rundownState.activeIndex = index;
            rundownState.status = "running";
            rundownState.startedAt = Date.now();
            rundownState.activeOffset = 0;
            sendRundownState();
        };
        actionsCol.appendChild(playBtn);

        const delBtn = document.createElement("button");
        delBtn.innerHTML = "🗑️";
        delBtn.style.background = "#dc3545";
        delBtn.style.border = "none";
        delBtn.style.color = "#fff";
        delBtn.style.borderRadius = "3px";
        delBtn.style.padding = "2px 6px";
        delBtn.style.cursor = "pointer";
        delBtn.style.fontSize = "0.75em";
        delBtn.onclick = () => {
            deleteRundownItem(index);
        };
        actionsCol.appendChild(delBtn);

        itemRow.appendChild(actionsCol);
        container.appendChild(itemRow);
    });
}

async function loadRundownPresetsList() {
    try {
        const res = await fetch("/api/rundown_presets");
        const data = await res.json();
        const select = document.getElementById("rundown-preset-select");
        if (!select) return;

        select.innerHTML = "";
        const presets = data.presets || {};
        const def = data.default || "";

        const keys = Object.keys(presets);
        if (keys.length === 0) {
            select.innerHTML = `<option value="">- No Presets -</option>`;
            const defStatus = document.getElementById("rundown-default-status");
            if (defStatus) defStatus.innerText = "Default: None";
            return;
        }

        keys.forEach(k => {
            const opt = document.createElement("option");
            opt.value = k;
            opt.innerText = k + (k === def ? " (Default)" : "");
            select.appendChild(opt);
        });

        const defStatus = document.getElementById("rundown-default-status");
        if (defStatus) defStatus.innerText = def ? `Default: ${def}` : "Default: None";

        if (rundownState.presetName && presets[rundownState.presetName]) {
            select.value = rundownState.presetName;
            loadSelectedRundownPreset();
        } else if (def && presets[def]) {
            select.value = def;
            loadSelectedRundownPreset();
        }
    } catch (e) {
        console.error("Failed to load rundown presets list:", e);
    }
}

async function loadSelectedRundownPreset() {
    const select = document.getElementById("rundown-preset-select");
    if (!select || !select.value) return;

    try {
        const res = await fetch("/api/rundown_presets");
        const data = await res.json();
        const preset = data.presets[select.value];
        if (preset) {
            rundownState.presetName = select.value;
            rundownState.items = preset.items || [];
            rundownState.transitionMode = preset.transitionMode || "auto";
            rundownState.miniTimerSize = preset.miniTimerSize !== undefined ? preset.miniTimerSize : 110;
            rundownState.miniTitleSize = preset.miniTitleSize !== undefined ? preset.miniTitleSize : 80;
            rundownState.miniTitleAuto = preset.miniTitleAuto !== undefined ? preset.miniTitleAuto : true;
            rundownState.fullTimerSize = preset.fullTimerSize !== undefined ? preset.fullTimerSize : 190;
            rundownState.fullTitleSize = preset.fullTitleSize !== undefined ? preset.fullTitleSize : 190;
            rundownState.fullTitleAuto = preset.fullTitleAuto !== undefined ? preset.fullTitleAuto : true;
            rundownState.overtimeFlash = preset.overtimeFlash !== undefined ? preset.overtimeFlash : true;
            rundownState.overtimeColor = preset.overtimeColor || "#ff4081";
            rundownState.overtimeSpeed = preset.overtimeSpeed !== undefined ? preset.overtimeSpeed : 1.0;

            updateRundownStyleUI();

            rundownState.activeIndex = -1;
            rundownState.status = "stopped";
            rundownState.startedAt = 0;
            rundownState.pausedRemaining = 0;
            rundownState.overtimeStartedAt = 0;
            rundownState.activeOffset = 0;

            sendRundownState();
        }
    } catch (e) {
        console.error("Failed to load selected rundown preset:", e);
    }
}

async function newRundownPreset() {
    const isOk = await showCustomDialog("confirm", "Create new rundown?<br><span style='color: #ffc107; font-size: 0.85em;'>This will clear the current rundown list. Please make sure you have saved your current preset first.</span>");
    if (!isOk) return;

    rundownState.items = [];
    rundownState.activeIndex = -1;
    rundownState.status = "stopped";
    rundownState.startedAt = 0;
    rundownState.pausedRemaining = 0;
    rundownState.overtimeStartedAt = 0;
    rundownState.activeOffset = 0;
    rundownState.presetName = "";

    const select = document.getElementById("rundown-preset-select");
    if (select) select.value = "";

    sendRundownState();
    renderRundownUI();
    showToast("New rundown list initialized", "info", 2000);
}

async function saveRundownPreset() {
    const select = document.getElementById("rundown-preset-select");
    if (!select || !select.value) {
        saveAsRundownPreset();
        return;
    }

    const name = select.value;
    const isOk = await showCustomDialog("confirm", `Update rundown preset <br><b style="color:#00e5ff;">"${name}"</b><br> with current settings?`);
    if (!isOk) return;

    const payload = {
        name: name,
        config: {
            items: rundownState.items,
            transitionMode: rundownState.transitionMode,
            miniTimerSize: rundownState.miniTimerSize,
            miniTitleSize: rundownState.miniTitleSize,
            miniTitleAuto: rundownState.miniTitleAuto,
            fullTimerSize: rundownState.fullTimerSize,
            fullTitleSize: rundownState.fullTitleSize,
            fullTitleAuto: rundownState.fullTitleAuto,
            overtimeFlash: rundownState.overtimeFlash,
            overtimeColor: rundownState.overtimeColor,
            overtimeSpeed: rundownState.overtimeSpeed
        }
    };

    try {
        const res = await fetch("/api/rundown_presets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === "success") {
            rundownState.presetName = name;
            showToast(`Preset "${name}" saved!`, "success", 1500);
            await loadRundownPresetsList();
            sendRundownState();
            safeCloseModal('fb-modal');
        }
    } catch (e) {
        console.error("Failed to save rundown preset:", e);
    }
}

async function saveAsRundownPreset() {
    const name = await showCustomDialog("prompt", "Enter new rundown preset name:");
    if (!name) return;

    const payload = {
        name: name,
        config: {
            items: rundownState.items,
            transitionMode: rundownState.transitionMode,
            miniTimerSize: rundownState.miniTimerSize,
            miniTitleSize: rundownState.miniTitleSize,
            miniTitleAuto: rundownState.miniTitleAuto,
            fullTimerSize: rundownState.fullTimerSize,
            fullTitleSize: rundownState.fullTitleSize,
            fullTitleAuto: rundownState.fullTitleAuto,
            overtimeFlash: rundownState.overtimeFlash,
            overtimeColor: rundownState.overtimeColor,
            overtimeSpeed: rundownState.overtimeSpeed
        }
    };

    try {
        const res = await fetch("/api/rundown_presets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.status === "success") {
            rundownState.presetName = name;
            showToast(`Preset "${name}" created!`, "success", 1500);
            await loadRundownPresetsList();
            sendRundownState();
            safeCloseModal('fb-modal');
        }
    } catch (e) {
        console.error("Failed to save as rundown preset:", e);
    }
}

async function deleteRundownPreset() {
    const select = document.getElementById("rundown-preset-select");
    if (!select || !select.value) return;

    const name = select.value;
    const isOk = await showCustomDialog("confirm", `Are you sure you want to delete preset <br><b style="color:#ff4444;">"${name}"</b>?`);
    if (!isOk) return;

    try {
        const res = await fetch(`/api/rundown_presets/${encodeURIComponent(name)}`, {
            method: "DELETE"
        });
        const data = await res.json();
        if (data.status === "success") {
            if (rundownState.presetName === name) rundownState.presetName = "";
            showToast(`Preset "${name}" deleted.`, "success", 1500);
            await loadRundownPresetsList();
        }
    } catch (e) {
        console.error("Failed to delete preset:", e);
    }
}

async function setDefaultRundownPreset() {
    const select = document.getElementById("rundown-preset-select");
    if (!select || !select.value) return;

    const name = select.value;
    try {
        const res = await fetch(`/api/rundown_presets/default/${encodeURIComponent(name)}`, {
            method: "POST"
        });
        const data = await res.json();
        if (data.status === "success") {
            showToast(`"${name}" set as startup default.`, "success", 1500);
            await loadRundownPresetsList();
        }
    } catch (e) {
        console.error("Failed to set default preset:", e);
    }
}

async function addRundownItem() {
    const nameInput = document.getElementById("rundown-new-name");
    const modeSelect = document.getElementById("rundown-new-mode");
    const valInput = document.getElementById("rundown-new-val");

    if (!nameInput || !modeSelect || !valInput) return;

    const name = nameInput.value.trim();
    const mode = modeSelect.value;
    const valRaw = valInput.value.trim();

    if (!name) {
        await showCustomDialog("alert", "Please enter item name.");
        return;
    }

    let value = valRaw;
    if (mode === "duration") {
        const mins = parseInt(valRaw, 10);
        if (isNaN(mins) || mins <= 0) {
            await showCustomDialog("alert", "Please enter a valid duration in minutes.");
            return;
        }
        value = mins;
    } else if (mode === "clock") {
        if (!/^\d{1,2}:\d{2}$/.test(valRaw)) {
            await showCustomDialog("alert", "Please enter a valid clock target in HH:MM format.");
            return;
        }
    }

    rundownState.items.push({ name, mode, value });

    nameInput.value = "";
    valInput.value = "";

    sendRundownState();
}

function deleteRundownItem(index) {
    if (index < 0 || index >= rundownState.items.length) return;

    rundownState.items.splice(index, 1);

    if (rundownState.activeIndex === index) {
        rundownState.activeIndex = -1;
        rundownState.status = "stopped";
    } else if (rundownState.activeIndex > index) {
        rundownState.activeIndex--;
    }

    sendRundownState();
}

function moveRundownItem(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= rundownState.items.length) return;

    const temp = rundownState.items[index];
    rundownState.items[index] = rundownState.items[target];
    rundownState.items[target] = temp;

    if (rundownState.activeIndex === index) {
        rundownState.activeIndex = target;
    } else if (rundownState.activeIndex === target) {
        rundownState.activeIndex = index;
    }

    sendRundownState();
}

async function clearRundownList() {
    const isOk = await showCustomDialog("confirm", "Are you sure you want to clear the rundown list?");
    if (!isOk) return;
    rundownState.items = [];
    rundownState.activeIndex = -1;
    rundownState.status = "stopped";
    rundownState.startedAt = 0;
    rundownState.pausedRemaining = 0;
    rundownState.overtimeStartedAt = 0;
    rundownState.activeOffset = 0;

    sendRundownState();
}

function toggleRundownTransitionMode() {
    const select = document.getElementById("rundown-transition-select");
    if (!select) return;
    rundownState.transitionMode = select.value;
    sendRundownState();
}

async function toggleActiveRundown() {
    if (rundownState.activeIndex === -1) {
        if (rundownState.items.length === 0) {
            await showCustomDialog("alert", "No items in rundown list.");
            return;
        }
        rundownState.activeIndex = 0;
    }

    const item = rundownState.items[rundownState.activeIndex];
    let totalSec = 0;
    if (item.mode === "duration") {
        totalSec = item.value * 60;
    } else {
        const [h, m] = item.value.split(':').map(Number);
        const targetDate = new Date();
        targetDate.setHours(h, m, 0, 0);
        totalSec = Math.max(0, Math.floor((targetDate.getTime() - Date.now()) / 1000));
    }

    if (rundownState.status === "stopped") {
        rundownState.status = "running";
        rundownState.startedAt = Date.now();
        rundownState.activeOffset = 0;
    } else if (rundownState.status === "paused") {
        if (rundownState.pausedRemaining < 0) {
            rundownState.status = "overtime";
            rundownState.overtimeStartedAt = Date.now() + rundownState.pausedRemaining * 1000;
        } else {
            rundownState.status = "running";
            if (item.mode === "duration") {
                rundownState.startedAt = Date.now() - (totalSec - rundownState.pausedRemaining) * 1000;
            } else if (item.mode === "clock") {
                const [h, m] = item.value.split(':').map(Number);
                const targetDate = new Date();
                targetDate.setHours(h, m, 0, 0);
                rundownState.activeOffset = rundownState.pausedRemaining - Math.floor((targetDate.getTime() - Date.now()) / 1000);
            }
        }
    } else if (rundownState.status === "running" || rundownState.status === "overtime") {
        const { remaining, overtime } = getRundownTimeValues();
        rundownState.status = "paused";
        if (remaining < 0 || overtime > 0) {
            rundownState.pausedRemaining = -overtime;
        } else {
            rundownState.pausedRemaining = remaining;
        }
    }

    sendRundownState();
}

function stopActiveRundown() {
    rundownState.status = "stopped";
    rundownState.activeIndex = -1;
    rundownState.startedAt = 0;
    rundownState.pausedRemaining = 0;
    rundownState.overtimeStartedAt = 0;
    rundownState.activeOffset = 0;

    sendRundownState();
}

function adjustRundownTime(minutes) {
    if (rundownState.status !== "running" && rundownState.status !== "overtime") return;

    rundownState.activeOffset = (rundownState.activeOffset || 0) + minutes * 60;

    sendRundownState();
}

function confirmRundownNext() {
    const nextIndex = rundownState.activeIndex + 1;
    if (nextIndex < rundownState.items.length) {
        rundownState.activeIndex = nextIndex;
        rundownState.startedAt = Date.now();
        rundownState.activeOffset = 0;
        rundownState.status = "running";
    } else {
        rundownState.status = "stopped";
        rundownState.activeIndex = -1;
        rundownState.activeOffset = 0;
    }
    sendRundownState();
}

function keepRundownOvertime() {
    rundownState.status = "overtime";
    sendRundownState();
}

function sendRundownState() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: "stage_rundown",
            payload: rundownState
        }));
    }
}

function showRundownToast(message, type, buttons = [], toastId = "") {
    const container = document.getElementById("rundown-toast-container");
    if (!container) return;

    if (toastId && document.getElementById(toastId)) return;

    if (!document.getElementById("rundown-toast-style")) {
        const style = document.createElement("style");
        style.id = "rundown-toast-style";
        style.innerHTML = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    const toast = document.createElement("div");
    if (toastId) toast.id = toastId;
    toast.style.background = "#222";
    toast.style.border = "2px solid " + (type === "confirm" ? "#ff9800" : "#00e5ff");
    toast.style.boxShadow = "0 4px 20px rgba(0,0,0,0.5)";
    toast.style.borderRadius = "8px";
    toast.style.padding = "12px 16px";
    toast.style.color = "#fff";
    toast.style.fontSize = "0.95em";
    toast.style.fontFamily = "sans-serif";
    toast.style.display = "flex";
    toast.style.flexDirection = "column";
    toast.style.gap = "10px";
    toast.style.animation = "slideInRight 0.3s ease-out";
    toast.style.pointerEvents = "auto";

    const text = document.createElement("div");
    text.innerText = message;
    text.style.fontWeight = "bold";
    toast.appendChild(text);

    if (buttons.length > 0) {
        const btnRow = document.createElement("div");
        btnRow.style.display = "flex";
        btnRow.style.gap = "8px";
        buttons.forEach(btnInfo => {
            const btn = document.createElement("button");
            btn.innerText = btnInfo.text;
            btn.style.padding = "6px 12px";
            btn.style.border = "none";
            btn.style.borderRadius = "4px";
            btn.style.cursor = "pointer";
            btn.style.fontWeight = "bold";
            btn.style.fontSize = "0.85em";
            if (btnInfo.primary) {
                btn.style.background = "#ff9800";
                btn.style.color = "#000";
            } else {
                btn.style.background = "#444";
                btn.style.color = "#fff";
            }
            btn.onclick = () => {
                btnInfo.onClick();
                if (!btnInfo.keepToast) {
                    toast.remove();
                }
            };
            btnRow.appendChild(btn);
        });
        toast.appendChild(btnRow);
    } else {
        setTimeout(() => {
            toast.style.animation = "slideOutRight 0.3s ease-in";
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    container.appendChild(toast);
}

function showMiniToast(message, type = "info", duration = 4000, toastId = "") {
    const container = document.getElementById("rundown-toast-container");
    if (!container) return;

    let toast = toastId ? document.getElementById(toastId) : null;
    let textEl;

    if (toast) {
        textEl = toast.querySelector(".mini-toast-text");
        if (textEl) textEl.innerHTML = message;
        toast.style.border = "1px solid " + (type === "success" ? "#28a745" : (type === "error" ? "#dc3545" : (type === "loading" ? "#ff9800" : "#00e5ff")));

        if (toast.dataset.timerId) {
            clearTimeout(parseInt(toast.dataset.timerId));
            toast.removeAttribute("data-timer-id");
        }
    } else {
        toast = document.createElement("div");
        if (toastId) toast.id = toastId;
        toast.style.background = "rgba(14, 14, 18, 0.97)";
        // backdropFilter removed: was causing GPU overhead on every toast appearance
        toast.style.border = "1px solid " + (type === "success" ? "#28a745" : (type === "error" ? "#dc3545" : (type === "loading" ? "#ff9800" : "#00e5ff")));
        toast.style.boxShadow = "0 3px 10px rgba(0,0,0,0.35)";
        toast.style.borderRadius = "5px";
        toast.style.padding = "9px 15px";
        toast.style.color = "#eee";
        toast.style.fontSize = "0.82em";
        toast.style.fontWeight = "500";
        toast.style.fontFamily = "system-ui, -apple-system, sans-serif";
        toast.style.display = "flex";
        toast.style.flexDirection = "column";
        toast.style.gap = "3px";
        toast.style.animation = "slideInRight 0.25s ease-out";
        toast.style.pointerEvents = "auto";
        toast.style.marginBottom = "3px";
        toast.style.width = "max-content";
        toast.style.maxWidth = "290px";
        toast.style.alignSelf = "flex-end";

        textEl = document.createElement("div");
        textEl.className = "mini-toast-text";
        textEl.style.whiteSpace = "nowrap";
        textEl.style.overflow = "hidden";
        textEl.style.textOverflow = "ellipsis";
        textEl.style.maxWidth = "270px";
        textEl.innerHTML = message;
        toast.appendChild(textEl);
        container.appendChild(toast);
    }

    if (duration > 0) {
        const timerId = setTimeout(() => {
            toast.style.animation = "slideOutRight 0.25s ease-in";
            setTimeout(() => toast.remove(), 250);
        }, duration);
        toast.dataset.timerId = timerId;
    }
}

// Auto initialize Stage Rundown presets list on startup
function syncRundownStyleFromUI() {
    const miniTimer = document.getElementById("rundown-mini-timer-size");
    const miniTitle = document.getElementById("rundown-mini-title-size");
    const miniTitleAuto = document.getElementById("rundown-mini-title-auto");
    const fullTimer = document.getElementById("rundown-full-timer-size");
    const fullTitle = document.getElementById("rundown-full-title-size");
    const fullTitleAuto = document.getElementById("rundown-full-title-auto");
    const otFlash = document.getElementById("rundown-overtime-flash");
    const otColor = document.getElementById("rundown-overtime-flash-color");
    const otSpeed = document.getElementById("rundown-overtime-flash-speed");

    if (miniTimer) rundownState.miniTimerSize = parseFloat(miniTimer.value) || 80;
    if (miniTitle) rundownState.miniTitleSize = parseFloat(miniTitle.value) || 40;
    if (miniTitleAuto) rundownState.miniTitleAuto = miniTitleAuto.checked;
    if (fullTimer) rundownState.fullTimerSize = parseFloat(fullTimer.value) || 150;
    if (fullTitle) rundownState.fullTitleSize = parseFloat(fullTitle.value) || 50;
    if (fullTitleAuto) rundownState.fullTitleAuto = fullTitleAuto.checked;
    if (otFlash) rundownState.overtimeFlash = otFlash.checked;
    if (otColor) rundownState.overtimeColor = otColor.value;
    if (otSpeed) {
        rundownState.overtimeSpeed = parseFloat(otSpeed.value) || 1.0;
        const valSpan = document.getElementById("rundown-overtime-flash-speed-val");
        if (valSpan) valSpan.innerText = rundownState.overtimeSpeed.toFixed(1) + 's';
    }
}

function updateRundownStyleUI() {
    const miniTimer = document.getElementById("rundown-mini-timer-size");
    const miniTitle = document.getElementById("rundown-mini-title-size");
    const miniTitleAuto = document.getElementById("rundown-mini-title-auto");
    const fullTimer = document.getElementById("rundown-full-timer-size");
    const fullTitle = document.getElementById("rundown-full-title-size");
    const fullTitleAuto = document.getElementById("rundown-full-title-auto");
    const otFlash = document.getElementById("rundown-overtime-flash");
    const otColor = document.getElementById("rundown-overtime-flash-color");
    const otSpeed = document.getElementById("rundown-overtime-flash-speed");
    const valSpan = document.getElementById("rundown-overtime-flash-speed-val");

    if (miniTimer) miniTimer.value = rundownState.miniTimerSize !== undefined ? rundownState.miniTimerSize : 80;
    if (miniTitle) {
        miniTitle.value = rundownState.miniTitleSize !== undefined ? rundownState.miniTitleSize : 40;
        miniTitle.disabled = rundownState.miniTitleAuto === true;
    }
    if (miniTitleAuto) miniTitleAuto.checked = rundownState.miniTitleAuto !== undefined ? rundownState.miniTitleAuto : true;
    if (fullTimer) fullTimer.value = rundownState.fullTimerSize !== undefined ? rundownState.fullTimerSize : 150;
    if (fullTitle) {
        fullTitle.value = rundownState.fullTitleSize !== undefined ? rundownState.fullTitleSize : 50;
        fullTitle.disabled = rundownState.fullTitleAuto === true;
    }
    if (fullTitleAuto) fullTitleAuto.checked = rundownState.fullTitleAuto !== undefined ? rundownState.fullTitleAuto : true;
    if (otFlash) otFlash.checked = rundownState.overtimeFlash !== undefined ? rundownState.overtimeFlash : true;
    if (otColor) otColor.value = rundownState.overtimeColor || "#ff4081";
    if (otSpeed) {
        otSpeed.value = rundownState.overtimeSpeed !== undefined ? rundownState.overtimeSpeed : 1.0;
        if (valSpan) valSpan.innerText = rundownState.overtimeSpeed.toFixed(1) + 's';
    }
}

function toggleRundownTitleAuto() {
    const miniTitleAuto = document.getElementById("rundown-mini-title-auto");
    if (miniTitleAuto) {
        setElementDisabled("rundown-mini-title-container", miniTitleAuto.checked);
    }
    const fullTitleAuto = document.getElementById("rundown-full-title-auto");
    if (fullTitleAuto) {
        setElementDisabled("rundown-full-title-container", fullTitleAuto.checked);
    }
    // Also sync and send state so it applies in real-time
    if (typeof syncRundownStyleFromUI === 'function') {
        syncRundownStyleFromUI();
        if (typeof sendRundownState === 'function') {
            sendRundownState();
        }
    }
}

function toggleRundownStyleCollapse() {
    const content = document.getElementById("rundown-style-collapse-content");
    const icon = document.getElementById("rundown-style-collapse-icon");
    if (content && icon) {
        if (content.style.display === "none") {
            content.style.display = "flex";
            icon.innerText = "▼";
        } else {
            content.style.display = "none";
            icon.innerText = "▶";
        }
    }
}

(function () {
    const initRundown = () => {
        loadRundownPresetsList();

        // Expose functions globally to prevent obfuscator naming issues
        window.newRundownPreset = newRundownPreset;
        window.loadSelectedRundownPreset = loadSelectedRundownPreset;
        window.deleteRundownPreset = deleteRundownPreset;
        window.saveRundownPreset = saveRundownPreset;
        window.saveAsRundownPreset = saveAsRundownPreset;
        window.setDefaultRundownPreset = setDefaultRundownPreset;
        window.addRundownItem = addRundownItem;
        window.toggleActiveRundown = toggleActiveRundown;
        window.stopActiveRundown = stopActiveRundown;
        window.adjustRundownTime = adjustRundownTime;
        window.toggleRundownTransitionMode = toggleRundownTransitionMode;
        window.confirmRundownNext = confirmRundownNext;
        window.syncRundownStyleFromUI = syncRundownStyleFromUI;
        window.updateRundownStyleUI = updateRundownStyleUI;
        window.toggleRundownTitleAuto = toggleRundownTitleAuto;
        window.toggleRundownStyleCollapse = toggleRundownStyleCollapse;
        window.keepRundownOvertime = keepRundownOvertime;
        window.clearRundownList = clearRundownList;
        window.deleteRundownItem = deleteRundownItem;
        window.moveRundownItem = moveRundownItem;
    };

    if (document.readyState === "complete" || document.readyState === "interactive") {
        setTimeout(initRundown, 100);
    } else {
        document.addEventListener("DOMContentLoaded", initRundown);
    }
})();

let layerConfigMain = [];
let layerConfigLt = [];

function renderLayerList(target) {
    const containerId = target === 'main' ? 'layer-manager-main' : 'layer-manager-lt';
    const config = target === 'main' ? layerConfigMain : layerConfigLt;
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';

    config.forEach((layer, index) => {
        const item = document.createElement('div');
        item.className = 'layer-item';
        item.draggable = true;
        item.dataset.id = layer.id;
        item.dataset.index = index;
        item.dataset.target = target;

        // No toggle for scripture and camera
        const hasToggle = !['scripture', 'camera'].includes(layer.id);
        const toggleHtml = hasToggle ? `
            <label class="switch">
                <input type="checkbox" ${layer.visible ? 'checked' : ''} onchange="toggleLayerVisibility('${layer.id}', '${target}')">
                <span class="slider"></span>
            </label>
        ` : '';

        item.innerHTML = `
            <div class="layer-drag-handle">☰</div>
            <div class="layer-name">${layer.id}</div>
            ${toggleHtml}
        `;

        // Drag and Drop Events
        item.addEventListener('dragstart', handleLayerDragStart);
        item.addEventListener('dragover', handleLayerDragOver);
        item.addEventListener('drop', handleLayerDrop);
        item.addEventListener('dragend', handleLayerDragEnd);
        item.addEventListener('dragleave', handleLayerDragLeave);

        container.appendChild(item);
    });
}

let draggedLayerItem = null;

function handleLayerDragStart(e) {
    draggedLayerItem = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
}

function handleLayerDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
}

function handleLayerDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleLayerDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    if (draggedLayerItem !== this) {
        const target = this.dataset.target;
        if (draggedLayerItem.dataset.target !== target) return; // Prevent cross-column drag

        const config = target === 'main' ? layerConfigMain : layerConfigLt;
        const fromIndex = parseInt(draggedLayerItem.dataset.index);
        const toIndex = parseInt(this.dataset.index);

        const [movedLayer] = config.splice(fromIndex, 1);
        config.splice(toIndex, 0, movedLayer);

        renderLayerList(target);
        sendLayerUpdate(target);
    }
}

function handleLayerDragEnd() {
    this.classList.remove('dragging');
    document.querySelectorAll('.layer-item').forEach(el => el.classList.remove('drag-over'));
    draggedLayerItem = null;
}

function toggleLayerVisibility(layerId, target) {
    const config = target === 'main' ? layerConfigMain : layerConfigLt;
    const layer = config.find(l => l.id === layerId);
    if (layer) {
        layer.visible = !layer.visible;
        renderLayerList(target);
        sendLayerUpdate(target);
    }
}

function sendLayerUpdate(target) {
    const config = target === 'main' ? layerConfigMain : layerConfigLt;
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: "update_layers",
            target: target,
            layers: config
        }));
    }
}

let currentSongCustomSettings = {}; // 🧠 Memori buat nyimpen DNA Asli lagu
let currentGlobalDefaultName = "";
// Helper biar gampang ngambil nilai UI
function getDisplayConfigFromUI() {
    return {
        font: getCurrentFont(), theme: document.getElementById("theme-input").value,
        color: document.getElementById("color-input").value, glow: parseInt(document.getElementById("glow-input").value),
        fade: parseFloat(document.getElementById("fade-input").value), trans: document.getElementById("trans-input").value,
        speed: document.getElementById("speed-input").value, zoom: document.getElementById("zoom-input").value,
        motion: getSafeMotionValue(document.getElementById("motion-input").value), align: document.getElementById("align-input").value,
        v_align: document.getElementById("te-valign") ? document.getElementById("te-valign").value : 'center',
        v_margin: document.getElementById("te-vmargin") ? parseInt(document.getElementById("te-vmargin").value) : 5,
        margin_x: parseInt(document.getElementById("margin-x-input").value),
        text_wrap: parseInt(document.getElementById("text-wrap-input").value),
        pad_x: parseInt(document.getElementById("margin-x-input").value),
        font_size: parseFloat(document.getElementById("font-size-input").value),
        line_height: (() => { const el = document.getElementById("line-height-input"); return el ? parseFloat(el.value) : 1.0; })(),
        sub_color: document.getElementById("sub-color-input").value,
        sub_size: parseFloat(document.getElementById("sub-size-input").value),
        sub_bold: subTextState.bold,
        sub_italic: subTextState.italic,
        sub_underline: subTextState.underline,
        sub_font: (() => {
            const chk = document.getElementById('sub-font-follow');
            if (!chk || chk.checked) return 'follow';
            const inp = document.getElementById('sub-font-input');
            return (inp && inp.value.trim()) ? inp.value.trim() : 'follow';
        })(),

        text_transform: document.getElementById("transform-input").value,
        font_weight: textState.bold ? 'bold' : 'normal',
        font_style: textState.italic ? 'italic' : 'normal',
        text_decoration: textState.underline ? 'underline' : 'none',

        // COLOR (SOLID/GRADIENT)
        color_type: document.getElementById("color-type-input").value,
        color: document.getElementById("color-input").value,
        color_2: document.getElementById("color2-input").value,
        color_angle: parseInt(document.getElementById("color-angle-input").value),

        // GLOW (TEXT/SOLID/GRADIENT)
        glow: parseInt(document.getElementById("glow-input").value),
        glow_type: document.getElementById("glow-type-input").value,
        glow_color_1: document.getElementById("glow-c1-input").value,
        glow_color_2: document.getElementById("glow-c2-input").value,
        glow_angle: parseInt(document.getElementById("glow-angle-input").value),

        // SHADOW & STROKE
        shadow_int: parseInt(document.getElementById("shadow-int-input").value),
        shadow_color: document.getElementById("shadow-color-input").value,
        stroke_size: parseFloat(document.getElementById("stroke-size-input").value),
        stroke_color: document.getElementById("stroke-color-input").value
    };
}

function getSafeMotionValue(value) {
    const motionInput = document.getElementById("motion-input");
    if (!motionInput) return value || 'none';
    const allowed = new Set(Array.from(motionInput.options).map((opt) => opt.value));
    return allowed.has(value) ? value : 'none';
}
let appShortcuts = {
    clear_lyrics: { ctrlKey: true, shiftKey: false, altKey: false, key: 'C', display: 'CTRL + C' },
    clear_video: { ctrlKey: true, shiftKey: false, altKey: false, key: 'V', display: 'CTRL + V' },
    clear_audio: { ctrlKey: true, shiftKey: false, altKey: false, key: 'A', display: 'CTRL + A' },
    clear_presentation: { ctrlKey: true, shiftKey: false, altKey: false, key: 'P', display: 'CTRL + P' },
    clear_photo: { ctrlKey: true, shiftKey: false, altKey: false, key: 'I', display: 'CTRL + I' },

    jump_verse: { ctrlKey: false, shiftKey: false, altKey: false, key: 'V', display: 'V' },
    jump_verse2: { ctrlKey: false, shiftKey: false, altKey: false, key: 'I', display: 'I' },
    jump_pre: { ctrlKey: false, shiftKey: false, altKey: false, key: 'P', display: 'P' },
    jump_chorus: { ctrlKey: false, shiftKey: false, altKey: false, key: 'C', display: 'C' },
    jump_chorus2: { ctrlKey: false, shiftKey: false, altKey: false, key: 'X', display: 'X' },
    jump_bridge: { ctrlKey: false, shiftKey: false, altKey: false, key: 'B', display: 'B' },
    jump_tag: { ctrlKey: false, shiftKey: false, altKey: false, key: 'T', display: 'T' },

    assign_verse: { ctrlKey: false, shiftKey: true, altKey: false, key: 'V', display: 'SHIFT + V' },
    assign_verse2: { ctrlKey: false, shiftKey: true, altKey: false, key: 'I', display: 'SHIFT + I' },
    assign_pre: { ctrlKey: false, shiftKey: true, altKey: false, key: 'P', display: 'SHIFT + P' },
    assign_chorus: { ctrlKey: false, shiftKey: true, altKey: false, key: 'C', display: 'SHIFT + C' },
    assign_chorus2: { ctrlKey: false, shiftKey: true, altKey: false, key: 'X', display: 'SHIFT + X' },
    assign_bridge: { ctrlKey: false, shiftKey: true, altKey: false, key: 'B', display: 'SHIFT + B' },
    assign_tag: { ctrlKey: false, shiftKey: true, altKey: false, key: 'T', display: 'SHIFT + T' },
    assign_unassign: { ctrlKey: false, shiftKey: true, altKey: false, key: 'D', display: 'SHIFT + D' }
};

const shortcutActionLabels = {
    clear_lyrics: "Emergency: Hide/Show Lyrics",
    clear_video: "Emergency: Hide/Show Video",
    clear_audio: "Emergency: Hide/Show Audio",
    clear_presentation: "Emergency: Hide/Show Presentation",
    clear_photo: "Emergency: Hide/Show Image",

    jump_verse: "Jump Live: Verse 1",
    jump_verse2: "Jump Live: Verse 2",
    jump_pre: "Jump Live: Pre-Chorus",
    jump_chorus: "Jump Live: Chorus 1",
    jump_chorus2: "Jump Live: Chorus 2",
    jump_bridge: "Jump Live: Bridge",
    jump_tag: "Jump Live: Tag",

    assign_verse: "Tag Lyric Grid: Verse 1",
    assign_verse2: "Tag Lyric Grid: Verse 2",
    assign_pre: "Tag Lyric Grid: Pre-Chorus",
    assign_chorus: "Tag Lyric Grid: Chorus 1",
    assign_chorus2: "Tag Lyric Grid: Chorus 2",
    assign_bridge: "Tag Lyric Grid: Bridge",
    assign_tag: "Tag Lyric Grid: Tag",
    assign_unassign: "Tag Lyric Grid: Default / Unassign"
};

function matchShortcut(e, action) {
    const s = appShortcuts[action];
    if (!s) return false;

    let eventKey = e.key.toUpperCase();
    if (e.code === "Space") eventKey = " ";

    let shortcutKey = s.key.toUpperCase();

    return eventKey === shortcutKey &&
        (!!e.ctrlKey || !!e.metaKey) === !!s.ctrlKey &&
        !!e.shiftKey === !!s.shiftKey &&
        !!e.altKey === !!s.altKey;
}

async function loadAppShortcutsFromServer() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const settings = await res.json();
            if (settings.shortcuts) {
                appShortcuts = { ...appShortcuts, ...settings.shortcuts };
            }
        }
    } catch (err) {
        console.warn("Failed to load shortcuts from server:", err);
    }
}

// 🎯 FIX 1: Ubah isShowing menjadi true
let lyricsData = []; let currentIndex = -1; let isShowing = true; let currentSongTitle = "";
let allSongs = []; let scheduleList = []; let savedSchedules = {}; let lastSelectedSched = "";
let scriptureGroupExpanded = true; // 🎯 State accordion SCRIPTURE LIST di schedule
let scrVerseDragGroupIdx = -1;   // 🎯 Drag tracking untuk verse reorder
let scrVerseDragVerseIdx = -1;
let dispPresetsData = {};
let globalDefaultDisplayConfig = null;

window.onload = async function () {
    await loadAppShortcutsFromServer();
    // Load and route audio settings on startup
    try { await loadSavedAudioSettings(); } catch (e) { }
    // 🎯 FIX: Pastikan langsung masuk tab library waktu baru refresh biar tidak tabrakan
    switchTab('library');
    setupPlaylistResizer();
    setupSidebarResizer();
    setupSettingsResizer();
    if (typeof setupBgLibraryResizer === 'function') {
        setupBgLibraryResizer();
    }
    await initGridSettings();

    // Load memori Bilingual dari server
    try {
        const res = await fetch('/api/global_sub_settings');
        const subData = await res.json();
        if (subData.color) document.getElementById("sub-color-input").value = subData.color;
        if (subData.size) {
            document.getElementById("sub-size-input").value = subData.size;
            document.getElementById("val-sub-size").innerText = subData.size + 'em';
        }
        // JOB 3: Load sub B/I/U state
        if (subData.bold !== undefined) subTextState.bold = subData.bold;
        if (subData.italic !== undefined) subTextState.italic = subData.italic;
        if (subData.underline !== undefined) subTextState.underline = subData.underline;
        // Update sub B/I/U button states
        ['bold', 'italic', 'underline'].forEach(type => {
            const btn = document.getElementById('sub-btn-' + type);
            if (btn) {
                if (subTextState[type]) btn.classList.add('active');
                else btn.classList.remove('active');
            }
        });
        // FIX: Load sub font + checkbox state
        const isFollow = !subData.font || subData.font === 'follow';
        const chk = document.getElementById('sub-font-follow');
        const inp = document.getElementById('sub-font-input');
        if (chk) chk.checked = isFollow;
        if (inp) {
            inp.disabled = isFollow;
            inp.value = isFollow ? '' : (subData.font || '');
        }
    } catch (e) { }

    // fetchActiveSchedule() dimatikan biar schedule selalu kosong pas awal buka
    fetchLibrary(); renderSchedule(); fetchSavedSchedules();
    fetchLTPresets(); fetchDisplayPresets(); fetchFBPresets(); loadWindowsFonts();
};

let toastTimeout;
function showToast(message, type = "info", duration = 0) {
    const modal = document.getElementById("save-progress-modal");
    if (!modal) return;
    const box = modal.querySelector('.modal-box');
    const icon = document.getElementById("save-icon");
    const title = document.getElementById("save-title");
    const msgBox = document.getElementById("save-message");

    clearTimeout(toastTimeout); // Reset timer

    // Munculkan modal overlay
    modal.style.display = "flex";
    if (msgBox) msgBox.innerText = message;

    // Ganti tema warna & icon sesuai status
    if (type === "loading") {
        if (box) box.style.borderColor = "#ffc107"; // Kuning
        if (title) {
            title.style.color = "#ffc107";
            title.innerText = "SAVING DATA";
        }
        if (icon) {
            icon.innerText = "⏳";
            icon.style.animation = "pulseIcon 1s infinite ease-in-out"; // Kasih animasi detak
        }
    } else if (type === "success") {
        if (box) box.style.borderColor = "#28a745"; // Hijau
        if (title) {
            title.style.color = "#28a745";
            title.innerText = "SUCCESS";
        }
        if (icon) {
            icon.innerText = "✅";
            icon.style.animation = "none";
        }
    } else if (type === "warning") {
        if (box) box.style.borderColor = "#fd7e14"; // Oranye / Amber
        if (title) {
            title.style.color = "#fd7e14";
            title.innerText = "WARNING";
        }
        if (icon) {
            icon.innerText = "⚠️";
            icon.style.animation = "none";
        }
    } else if (type === "error") {
        if (box) box.style.borderColor = "#dc3545"; // Merah
        if (title) {
            title.style.color = "#dc3545";
            title.innerText = "ERROR";
        }
        if (icon) {
            icon.innerText = "❌";
            icon.style.animation = "none";
        }
    } else { // "info" atau status lainnya
        if (box) box.style.borderColor = "#00e5ff"; // Cyan
        if (title) {
            title.style.color = "#00e5ff";
            title.innerText = "INFO";
        }
        if (icon) {
            icon.innerText = "ℹ️";
            icon.style.animation = "none";
        }
    }

    // Auto-tutup modalnya setelah durasi habis (standar durasi dipercepat sesuai permintaan)
    const TOAST_DURATIONS = {
        warning: 1500, // 1.5 detik
        error: 1300,   // 1.3 detik
        success: 1000, // 1.0 detik
        info: 2000,    // 2.0 detik
        loading: 0     // loading tetap tampil hingga digantikan toast lain
    };

    let effectiveDuration = TOAST_DURATIONS[type] !== undefined ? TOAST_DURATIONS[type] : 2000;
    const parsedDur = parseInt(duration, 10);
    if (!isNaN(parsedDur) && parsedDur > 0) {
        // Jika durasi lama warisan (>= 1500), gunakan standar durasi baru yang dipercepat
        if ([2000, 2500, 3000, 3500, 4000].includes(parsedDur)) {
            effectiveDuration = TOAST_DURATIONS[type] !== undefined ? TOAST_DURATIONS[type] : parsedDur;
        } else {
            effectiveDuration = parsedDur;
        }
    }

    if (effectiveDuration > 0) {
        toastTimeout = setTimeout(() => {
            modal.style.display = "none";
        }, effectiveDuration);
    }
}

// 🎯 FIX 1: UPDATE SWITCH TAB
function switchTab(tab) {
    currentActiveTab = tab;

    const tabBtns = document.querySelectorAll('.tab-btn');
    const contentLib = document.getElementById('tab-library');
    const contentSched = document.getElementById('tab-schedule');

    // Library dan schedule sekarang tampil bersamaan dalam satu kolom.
    // Fungsi ini tetap dipertahankan untuk compatibility dengan pemanggilan lama.
    if (contentLib && contentSched && document.getElementById('playlist-resizer')) {
        tabBtns.forEach(btn => btn.classList.remove('active'));
        contentLib.classList.remove('te-hidden');
        contentSched.classList.remove('te-hidden');
        contentLib.style.display = 'flex';
        contentSched.style.display = 'flex';
        return;
    }

    // Reset semua tombol
    tabBtns.forEach(btn => btn.classList.remove('active'));

    // Sembunyikan semua panel
    contentLib.classList.add('te-hidden'); contentLib.style.display = 'none';
    contentSched.classList.add('te-hidden'); contentSched.style.display = 'none';

    // Aktifkan sesuai pilihan
    if (tab === 'library') {
        tabBtns[0].classList.add('active');
        contentLib.classList.remove('te-hidden');
        contentLib.style.display = 'flex';
    } else if (tab === 'schedule') {
        tabBtns[1].classList.add('active');
        contentSched.classList.remove('te-hidden');
        contentSched.style.display = 'flex';
    }
}

async function setupSidebarResizer() {
    const playlist = document.querySelector('.col-playlist');
    const resizer = document.getElementById('sidebar-resizer');
    if (!playlist || !resizer) return;

    // Helper to calculate current bounds dynamically
    const getBounds = () => {
        const min = Math.max(250, Math.round(window.innerWidth * 0.15));
        const max = Math.max(350, Math.round(window.innerWidth * 0.25));
        return { min, max };
    };

    // Helper to clamp values
    const clampWidth = (val) => {
        const { min, max } = getBounds();
        return Math.min(Math.max(val, min), max);
    };

    // Load initial width from settings
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const settings = await res.json();
            if (settings.sidebar_width) {
                const savedWidth = parseInt(settings.sidebar_width);
                const clamped = clampWidth(savedWidth);
                playlist.style.setProperty('--col-playlist-width', `${clamped}px`);
            } else {
                const clamped = clampWidth(280);
                playlist.style.setProperty('--col-playlist-width', `${clamped}px`);
            }
        }
    } catch (err) {
        console.warn("Failed to load sidebar width:", err);
    }

    let isDragging = false;
    let startX = 0;
    let startWidth = 0;
    let animationFrameId = null;

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startWidth = playlist.offsetWidth;
        document.body.classList.add('sidebar-resizing');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        animationFrameId = requestAnimationFrame(() => {
            const newWidth = startWidth + (e.clientX - startX);
            const clamped = clampWidth(newWidth);
            playlist.style.setProperty('--col-playlist-width', `${clamped}px`);
        });
    });

    document.addEventListener('mouseup', async () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.classList.remove('sidebar-resizing');

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        const finalWidth = playlist.offsetWidth;
        // Save to settings
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sidebar_width: finalWidth })
            });
        } catch (err) {
            console.warn("Failed to save sidebar width:", err);
        }
    });

    // Handle window resize dynamically to clamp width within new bounds if necessary
    window.addEventListener('resize', () => {
        const currentWidth = playlist.offsetWidth;
        const clamped = clampWidth(currentWidth);
        if (clamped !== currentWidth) {
            playlist.style.setProperty('--col-playlist-width', `${clamped}px`);
        }
    });
}
window.setupSidebarResizer = setupSidebarResizer;

async function setupSettingsResizer() {
    const settings = document.querySelector('.col-settings');
    const resizer = document.getElementById('settings-resizer');
    if (!settings || !resizer) return;

    // Dynamic bounds: Min 20% window width (min 250px), Max 30% window width (min 450px)
    const getBounds = () => ({
        min: Math.max(250, Math.round(window.innerWidth * 0.20)),
        max: Math.max(450, Math.round(window.innerWidth * 0.30))
    });

    const clampWidth = (val) => {
        const { min, max } = getBounds();
        return Math.min(Math.max(val, min), max);
    };

    // Load initial width from settings
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const data = await res.json();
            if (data.settings_panel_width) {
                const saved = parseInt(data.settings_panel_width);
                settings.style.setProperty('--col-settings-width', `${clampWidth(saved)}px`);
            } else {
                settings.style.setProperty('--col-settings-width', `${clampWidth(260)}px`);
            }
        }
    } catch (err) {
        console.warn("Failed to load settings panel width:", err);
    }

    let isDragging = false;
    let startX = 0;
    let startWidth = 0;
    let animationFrameId = null;

    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault();
        isDragging = true;
        startX = e.clientX;
        startWidth = settings.offsetWidth;
        document.body.classList.add('settings-resizing');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        // Settings is on the right: dragging left (smaller clientX) = wider panel
        animationFrameId = requestAnimationFrame(() => {
            const newWidth = startWidth + (startX - e.clientX);
            const clamped = clampWidth(newWidth);
            settings.style.setProperty('--col-settings-width', `${clamped}px`);
            // Re-scale the display preview iframe to fit its updated container
            if (typeof resizePreview === 'function') resizePreview();
        });
    });

    document.addEventListener('mouseup', async () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.classList.remove('settings-resizing');

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        const finalWidth = settings.offsetWidth;
        // Final rescale after drag ends
        if (typeof resizePreview === 'function') requestAnimationFrame(resizePreview);
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings_panel_width: finalWidth })
            });
        } catch (err) {
            console.warn("Failed to save settings panel width:", err);
        }
    });

    // Re-clamp on window resize
    window.addEventListener('resize', () => {
        const currentWidth = settings.offsetWidth;
        const clamped = clampWidth(currentWidth);
        if (clamped !== currentWidth) {
            settings.style.setProperty('--col-settings-width', `${clamped}px`);
            if (typeof resizePreview === 'function') requestAnimationFrame(resizePreview);
        }
    });
}
window.setupSettingsResizer = setupSettingsResizer;

function setupPlaylistResizer() {
    const playlist = document.querySelector('.col-playlist');
    const schedulePanel = document.getElementById('tab-schedule');
    const libraryPanel = document.getElementById('tab-library');
    if (!playlist || !schedulePanel || !libraryPanel) return;

    schedulePanel.classList.remove('te-hidden');
    libraryPanel.classList.remove('te-hidden');
    schedulePanel.style.display = 'flex';
    libraryPanel.style.display = 'flex';

    let resizer = document.getElementById('playlist-resizer');
    if (!resizer) {
        resizer = document.createElement('div');
        resizer.id = 'playlist-resizer';
        resizer.className = 'playlist-resizer';
        resizer.title = 'Drag to resize schedule and song library';
        playlist.insertBefore(resizer, libraryPanel);
    }

    const savedHeight = localStorage.getItem('playlistScheduleHeight');
    if (savedHeight) playlist.style.setProperty('--playlist-schedule-height', savedHeight);

    let isDragging = false;

    const setScheduleHeight = (clientY) => {
        const rect = playlist.getBoundingClientRect();
        const brand = playlist.querySelector('.brand-header');
        const brandHeight = brand ? brand.getBoundingClientRect().height : 0;
        const availableHeight = Math.max(260, rect.height - brandHeight - resizer.offsetHeight);
        const relativeY = clientY - rect.top - brandHeight;
        const minHeight = 130;
        const maxHeight = Math.max(minHeight, availableHeight - 170);
        const nextHeight = Math.min(Math.max(relativeY, minHeight), maxHeight);
        const cssValue = `${Math.round(nextHeight)}px`;

        playlist.style.setProperty('--playlist-schedule-height', cssValue);
        localStorage.setItem('playlistScheduleHeight', cssValue);
    };

    resizer.onmousedown = (e) => {
        e.preventDefault();
        isDragging = true;
        document.body.classList.add('playlist-resizing');
    };

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        setScheduleHeight(e.clientY);
    });

    document.addEventListener('mouseup', () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.classList.remove('playlist-resizing');
    });
}

function checkFontMode() { const select = document.getElementById("font-select"); const manual = document.getElementById("font-manual"); if (select.value === "custom") { manual.style.display = "block"; manual.focus(); } else { manual.style.display = "none"; updateSettings(); } }
function getCurrentFont() { const select = document.getElementById("font-select"); if (select.value === "custom") return document.getElementById("font-manual").value || "Cinzel"; return select.value; }

// async function fetchLibrary() { const res = await fetch('/api/songs'); allSongs = await res.json(); renderLibrary(allSongs); }
async function fetchLibrary() {
    const res = await fetch('/api/songs');
    allSongs = await res.json();

    // --- CACHE CLEANED SEARCH FIELDS FOR 100x SPEEDUP ---
    allSongs.forEach(song => {
        song.cleanTitle = cleanText(song.title);
        song.cleanLyrics = song.data ? song.data.map(slide => cleanText(slide.text)).join(" ") : "";
    });

    // --- ALGORITMA SORTING A-Z ---
    allSongs.sort((a, b) => a.title.localeCompare(b.title));

    renderLibrary(allSongs);
}
// ==========================================
// --- LIBRARY LAZY LOAD ENGINE (ANTI-LAG) ---
// ==========================================
let currentlyRenderedSongs = [];
let currentRenderIndex = 0;
const RENDER_CHUNK_SIZE = 300; // Cuma gambar 100 lagu tiap kali render

function renderLibrary(songs) {
    const container = document.getElementById("library-list");
    container.innerHTML = ""; // Bersihkan list sebelumnya

    // --- UPDATE TEXT TOTAL LAGU ---
    const countInfo = document.getElementById("song-count-info");
    if (countInfo) {
        if (songs.length === allSongs.length) {
            countInfo.innerHTML = `📚 Total: <b>${allSongs.length}</b> Lagu`;
        } else {
            countInfo.innerHTML = `🔍 Ditemukan: <b>${songs.length}</b> / ${allSongs.length} Lagu`;
        }
    }

    currentlyRenderedSongs = songs;
    currentRenderIndex = 0;

    // Render batch pertama (Super ngebut instan)
    renderNextChunk();
}

function renderNextChunk() {
    const container = document.getElementById("library-list");
    const chunk = currentlyRenderedSongs.slice(currentRenderIndex, currentRenderIndex + RENDER_CHUNK_SIZE);
    if (chunk.length === 0) return; // Udah mentok habis

    // Teknik BATCH HTML STRING: Jauh lebih enteng dari document.createElement
    let htmlString = "";
    chunk.forEach(song => {
        // Antisipasi kalau ada tanda petik (') di judul lagu (contoh: Ku 'Kan Bangkit)
        let safeTitle = song.title.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        let activeClass = (song.title === currentSongTitle) ? " active" : "";

        htmlString += `
                    <div class="song-item${activeClass}" draggable="true" ondragstart="startLibrarySongDrag(event, '${safeTitle}')" oncontextmenu="showLibrarySongContextMenu(event, '${safeTitle}')">
                        <span style="flex:1" onclick="loadSong('${safeTitle}')">${song.title}</span>
                    </div>`;
    });

    // Tembak HTML ke layar sekaligus pakai insertAdjacentHTML
    container.insertAdjacentHTML('beforeend', htmlString);
    currentRenderIndex += RENDER_CHUNK_SIZE;
}

function startLibrarySongDrag(event, title) {
    window.dragStartIndex = -1;
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData("text/plain", JSON.stringify({
        action: "add_song_to_schedule",
        title: title
    }));
}

// 🎯 LIBRARY SONG CONTEXT MENU (Right-Click)
function showLibrarySongContextMenu(event, title) {
    event.preventDefault();

    // Hapus context menu lama jika ada
    const oldMenu = document.getElementById("library-song-context-menu");
    if (oldMenu) oldMenu.remove();

    // Buat context menu baru
    const menu = document.createElement("div");
    menu.id = "library-song-context-menu";
    menu.className = "library-context-menu";

    // Option 1: Add to Schedule
    const addOption = document.createElement("div");
    addOption.className = "library-context-item";
    addOption.innerHTML = "✚ Add to Schedule";
    addOption.onclick = () => {
        addToSchedule(title);
        menu.remove();
    };
    menu.appendChild(addOption);

    // Option 2: Delete
    const delOption = document.createElement("div");
    delOption.className = "library-context-item library-context-danger";
    delOption.innerHTML = "🗑 Delete";
    delOption.onclick = () => {
        deleteSong(title);
        menu.remove();
    };
    menu.appendChild(delOption);

    // Tambahkan menu ke body
    document.body.appendChild(menu);

    // Positioning logic: jangan sampai terpotong oleh viewport
    const rect = menu.getBoundingClientRect();
    let x = event.clientX;
    let y = event.clientY;

    // Cek apakah menu keluar dari kanan layar
    if (x + rect.width > window.innerWidth) {
        x = window.innerWidth - rect.width - 10;
    }

    // Cek apakah menu keluar dari bawah layar
    if (y + rect.height > window.innerHeight) {
        y = window.innerHeight - rect.height - 10;
    }

    menu.style.left = x + "px";
    menu.style.top = y + "px";

    // Hapus menu jika klik di tempat lain
    setTimeout(() => {
        document.addEventListener('click', function removeMenu(e) {
            if (!menu.contains(e.target) && menu.parentElement) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        });
    }, 10);
}

// Pasang sensor scroll (Kalo VJ scroll mentok bawah, render lagi 100 lagu) - THROTTLED WITH requestAnimationFrame
let isScrollThrottled = false;
document.getElementById("library-list").addEventListener('scroll', function () {
    if (!isScrollThrottled) {
        window.requestAnimationFrame(() => {
            // Kalau jarak scroll udah mendekati dasar kotak (sisa 100px)
            if (this.scrollTop + this.clientHeight >= this.scrollHeight - 100) {
                renderNextChunk();
            }
            isScrollThrottled = false;
        });
        isScrollThrottled = true;
    }
});
// ==========================================
// --- TEXT TRANSFORMER ENGINE (UPPER/LOWER) ---
// ==========================================
function transformText(mode, caseType) {
    saveEditorState(); // 📸 BACKUP (Biar bisa di-Undo)

    editorSlides.forEach(slide => {
        let txt = slide.text;

        if (caseType === 'upper') {
            slide.text = txt.toUpperCase();
        }
        else if (caseType === 'lower') {
            slide.text = txt.toLowerCase();
        }
        else if (caseType === 'title') {
            // Bikin huruf pertama tiap kata jadi Huruf Besar
            slide.text = txt.toLowerCase().replace(/\b\w/g, char => char.toUpperCase());
        }

        // Opsional: Bersihkan spasi ganda bawaan copy-paste (tanpa hapus koma/titik)
        slide.text = slide.text.replace(/  +/g, ' ');
    });

    renderEditor(mode); // Render ulang layar
    isFormDirty = true; // Nyalain tombol kuning Smart Save
}

function cleanText(text) {
    if (!text) return "";
    return text.toString()
        .toLowerCase()                 // Huruf kecil semua
        .replace(/[^a-z0-9\s]/g, '')   // Hapus karakter aneh/tanda baca
        .replace(/\s+/g, ' ')          // Jadikan spasi ganda (termasuk Enter/ \n) jadi spasi biasa
        .trim();
}

// --- DEBOUNCE ENGINE (Anti-Ngelag pas ngetik) ---
let searchTimeout = null;

function onSearchInput() {
    clearTimeout(searchTimeout);
    // Tunda pencarian 300ms setelah user BERHENTI ngetik
    searchTimeout = setTimeout(() => {
        filterLibrary();
    }, 300);
}

function filterLibrary() {
    const rawQuery = document.getElementById("search-library").value;
    const query = cleanText(rawQuery);

    const MIN_CHARS = 3; // Ngetik 3 huruf baru mulai nyari

    if (!query) {
        renderLibrary(allSongs);
        return;
    }

    if (query.length < MIN_CHARS) {
        renderLibrary(allSongs);
        const countInfo = document.getElementById("song-count-info");
        if (countInfo) countInfo.innerHTML = `Type at least <b>${MIN_CHARS} characters</b> to search...`;
        return;
    }

    // 🚀 OPTIMASI HIGH-SPEED O(N) SEARCH MENGGUNAKAN PRE-CACHED MEMORY
    const filtered = [];

    // Pake for-loop murni (100x lebih cepat dari .forEach / .map)
    for (let i = 0; i < allSongs.length; i++) {
        const s = allSongs[i];

        // Prioritas 1: Cari dari Judul (Pre-cached!)
        if (s.cleanTitle && s.cleanTitle.includes(query)) {
            filtered.push(s);
            continue; // Kalo judul cocok, stop & skip cari lirik biar hemat CPU!
        }

        // Prioritas 2: Cari dari Lirik (Pre-cached, cuma kalau panjang query >= 4)
        if (query.length >= 4 && s.cleanLyrics && s.cleanLyrics.includes(query)) {
            filtered.push(s);
        }
    }

    renderLibrary(filtered);
}
let dragStartIndex = -1;

async function fetchActiveSchedule() {
    const res = await fetch('/api/service');
    const data = await res.json();
    // Backward compatibility: Ubah data lama (string) jadi format baru (object)
    scheduleList = data.map(item => typeof item === 'string' ? { title: item, note: '' } : item);
    renderSchedule();
}
// Pastikan variabel drag tidak hilang/error di memori
if (typeof dragStartIndex === 'undefined') {
    window.dragStartIndex = -1;
}

// ====================================================================
// 🎬 MEDIA SCHEDULED VIEW & 2-COLUMN SPLIT CONTROLLER ENGINE
// ====================================================================

// --- Audio Routing State ---
window._audioMonitorEnabled = false;
window._audioOutputDeviceId = 'default';
window._audioMonitorDeviceId = 'default';

function supportsAudioRouting() {
    return typeof HTMLMediaElement !== 'undefined' &&
        typeof HTMLMediaElement.prototype.setSinkId === 'function';
}

function applyAudioRouting(el, deviceId, enabled = true) {
    if (!el) return;
    if (enabled) {
        el.muted = false;
        if (el.setSinkId && deviceId && deviceId !== 'default') {
            el.setSinkId(deviceId).catch((err) => {
                console.warn('[Audio Routing] Failed to set sink ID:', err);
            });
        } else if (el.setSinkId) {
            el.setSinkId('default').catch(() => { });
        }
    } else {
        el.muted = true;
    }
}
window.applyAudioRouting = applyAudioRouting;

function applyMonitorRouting(el) {
    applyAudioRouting(el, window._audioMonitorDeviceId, window._audioMonitorEnabled);
}
window.applyMonitorRouting = applyMonitorRouting;

function updateMonitorPlayersRouting() {
    // Route master players (output/jemaat)
    if (typeof masterBgAudio !== 'undefined') applyAudioRouting(masterBgAudio, window._audioOutputDeviceId, true);
    if (typeof masterSfxAudio !== 'undefined') applyAudioRouting(masterSfxAudio, window._audioOutputDeviceId, true);

    // Route monitor players (operator/headphones)
    if (typeof monitorBgAudio !== 'undefined') applyAudioRouting(monitorBgAudio, window._audioMonitorDeviceId, window._audioMonitorEnabled);
    if (typeof monitorSfxAudio !== 'undefined') applyAudioRouting(monitorSfxAudio, window._audioMonitorDeviceId, window._audioMonitorEnabled);

    // Route live monitor element (scheduled media preview)
    if (window._liveMonitorEl) applyAudioRouting(window._liveMonitorEl, window._audioMonitorDeviceId, window._audioMonitorEnabled);

    // Also update any active media scheduled preview element
    const previewEl = document.getElementById('media-sched-preview-el');
    if (previewEl) {
        applyAudioRouting(previewEl, window._audioMonitorDeviceId, window._audioMonitorEnabled);
    }
}
window.updateMonitorPlayersRouting = updateMonitorPlayersRouting;

async function loadAudioDevices() {
    const outputSel = document.getElementById('audio-output-select');
    const monitorSel = document.getElementById('audio-monitor-select');
    if (!outputSel && !monitorSel) return;

    const supported = supportsAudioRouting();
    const noSupportMsg = '<option value="default">⚠️ Not supported in this browser</option>';

    if (!supported) {
        if (outputSel) outputSel.innerHTML = noSupportMsg;
        if (monitorSel) monitorSel.innerHTML = noSupportMsg;
        return;
    }

    try {
        // Request permission to enumerate with labels
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try { const s = await navigator.mediaDevices.getUserMedia({ audio: true }); s.getTracks().forEach(t => t.stop()); } catch (e) { }
        }
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioOutputs = devices.filter(d => d.kind === 'audiooutput');

        const buildOptions = (savedId) => {
            let html = '<option value="default">🔊 Default System Audio</option>';
            audioOutputs.forEach(d => {
                const label = d.label || `Speaker (${d.deviceId.substring(0, 8)})`;
                const sel = d.deviceId === savedId ? ' selected' : '';
                html += `<option value="${d.deviceId}"${sel}>${label}</option>`;
            });
            return html;
        };

        if (outputSel) outputSel.innerHTML = buildOptions(window._audioOutputDeviceId);
        if (monitorSel) monitorSel.innerHTML = buildOptions(window._audioMonitorDeviceId);

        // Restore saved selections
        if (outputSel && window._audioOutputDeviceId) outputSel.value = window._audioOutputDeviceId;
        if (monitorSel && window._audioMonitorDeviceId) monitorSel.value = window._audioMonitorDeviceId;
    } catch (e) {
        console.warn('[Audio Routing] Failed to enumerate devices:', e);
    }
}

async function loadSavedAudioSettings() {
    try {
        const res = await fetch('/api/settings');
        const data = await res.json();
        window._audioOutputDeviceId = data.audio_output_device || 'default';
        window._audioMonitorDeviceId = data.audio_monitor_device || 'default';
        window._audioMonitorEnabled = !!data.audio_monitor_enabled;

        const monitorToggle = document.getElementById('audio-monitor-toggle');
        if (monitorToggle) monitorToggle.checked = window._audioMonitorEnabled;

        const monitorRow = document.getElementById('audio-monitor-device-row');
        if (monitorRow) monitorRow.style.display = window._audioMonitorEnabled ? 'block' : 'none';

        updateMonitorPlayersRouting();
    } catch (e) {
        console.warn('[Audio Routing] Failed to load saved audio settings:', e);
    }
}

async function saveAudioSettings() {
    const outputSel = document.getElementById('audio-output-select');
    const monitorSel = document.getElementById('audio-monitor-select');
    const monitorToggle = document.getElementById('audio-monitor-toggle');

    if (outputSel) window._audioOutputDeviceId = outputSel.value;
    if (monitorSel) window._audioMonitorDeviceId = monitorSel.value;
    if (monitorToggle) window._audioMonitorEnabled = monitorToggle.checked;

    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                audio_output_device: window._audioOutputDeviceId,
                audio_monitor_device: window._audioMonitorDeviceId,
                audio_monitor_enabled: window._audioMonitorEnabled
            })
        });
    } catch (e) {
        console.warn('[Audio Routing] Failed to save audio settings:', e);
    }

    updateMonitorPlayersRouting();
}

function onAudioMonitorToggle() {
    const monitorToggle = document.getElementById('audio-monitor-toggle');
    const monitorRow = document.getElementById('audio-monitor-device-row');
    window._audioMonitorEnabled = monitorToggle ? monitorToggle.checked : false;
    if (monitorRow) monitorRow.style.display = window._audioMonitorEnabled ? 'block' : 'none';
    saveAudioSettings();
}
window.onAudioMonitorToggle = onAudioMonitorToggle;
window.loadAudioDevices = loadAudioDevices;
window.loadSavedAudioSettings = loadSavedAudioSettings;
window.saveAudioSettings = saveAudioSettings;

// --- Media Scheduled View ---

function loadMediaScheduledView(item) {
    const grid = document.getElementById("grid-container");
    if (!grid) return;

    window.currentSongTitle = item.title;
    window.activeMediaScheduledItem = item;
    if (typeof renderSchedule === 'function') renderSchedule();

    const titleStr = item.title || "";
    let category = item.media_category;
    if (!category) {
        if (titleStr.includes('VIDEO')) category = 'video';
        else if (titleStr.includes('PHOTO')) category = 'photo';
        else category = 'audio';
    }

    let mediaId = item.media_id;
    let mediaName = item.media_name;

    if (!mediaId || !mediaName) {
        const parts = titleStr.split(': ');
        const extracted = parts.length > 1 ? parts.slice(1).join(': ').trim() : titleStr;
        mediaId = mediaId || extracted;
        mediaName = mediaName || extracted;
    }

    window.activeMediaScheduledItem.resolved_category = category;
    window.activeMediaScheduledItem.resolved_id = mediaId;
    window.activeMediaScheduledItem.resolved_name = mediaName;

    const icon = category === 'video' ? '🎬' : (category === 'photo' ? '📷' : '🎵');
    const safeName = mediaName.replace(/'/g, "\\'").replace(/"/g, "&quot;");

    let streamUrl = `/api/stream_video/${mediaId}`;
    if (category === 'photo') streamUrl = `/api/stream_photo/${mediaId}`;
    else if (category === 'audio') streamUrl = `/api/stream_audio/${mediaId}`;

    let previewMediaHtml = "";
    const previewBoxClass = `media-preview-box${category === 'audio' ? ' audio-mode' : ''}`;

    if (category === 'video') {
        previewMediaHtml = `<video id="media-sched-preview-el" class="media-sched-video" src="${streamUrl}" loop playsinline controls></video>`;
    } else if (category === 'photo') {
        previewMediaHtml = `<img id="media-sched-preview-el" class="media-sched-photo" src="${streamUrl}" onerror="this.src='/static/logo.png'">`;
    } else if (category === 'audio') {
        previewMediaHtml = `
            <div class="audio-preview-wrapper">
                <div class="audio-visualizer-box">
                    <div class="audio-disc-icon">🎵</div>
                    <div class="sound-wave-bars">
                        <span class="sw-bar"></span><span class="sw-bar"></span><span class="sw-bar"></span>
                        <span class="sw-bar"></span><span class="sw-bar"></span>
                    </div>
                </div>
                <audio id="media-sched-preview-el" src="${streamUrl}" loop controls></audio>
            </div>`;
    }

    grid.innerHTML = `
        <div class="media-sched-container">
            <!-- LEFT COLUMN: PREVIEW (native controls) -->
            <div class="media-sched-preview-col">
                <div class="${previewBoxClass}">
                    ${previewMediaHtml}
                </div>
                <div class="media-preview-label">LOCAL PREVIEW</div>
            </div>

            <!-- RIGHT COLUMN: LIVE OUTPUT CONTROLLER -->
            <div class="media-sched-control-col">
                <div class="media-control-header">
                    <span class="media-cat-badge ${category}">${icon} ${category.toUpperCase()} MEDIA</span>
                    <h3 class="media-control-title" title="${safeName}">${mediaName}</h3>
                </div>

                <div class="media-control-body">
                    ${category !== 'photo' ? `
                    <!-- LIVE OUTPUT CONTROLS — video & audio only -->
                    <div class="media-control-section">
                        <label class="media-ctrl-label">🎯 LIVE OUTPUT CONTROLS</label>
                        <div class="media-playback-btns">
                            <button id="media-btn-play" class="media-ctrl-btn media-btn-play" onclick="toggleLiveMediaPlay('${category}', '${mediaId}', '${safeName}')">
                                <span id="media-play-icon">▶️</span> <span id="media-play-text">PLAY LIVE</span>
                            </button>
                            <button id="media-btn-loop" class="media-ctrl-btn media-btn-loop active" onclick="toggleLiveMediaLoop('${category}', '${mediaId}')">
                                🔁 LOOP: ON
                            </button>
                            <button id="media-btn-replay" class="media-ctrl-btn media-btn-replay" onclick="replayLiveMedia('${category}', '${mediaId}', '${safeName}')">
                                🔄 RESTART
                            </button>
                        </div>
                    </div>

                    <!-- LIVE OUTPUT VOLUME -->
                    <div class="media-control-section">
                        <div class="media-vol-header">
                            <label class="media-ctrl-label"><span id="media-vol-icon">🔊</span> OUTPUT VOLUME</label>
                            <span id="media-vol-val" class="media-vol-val">100%</span>
                        </div>
                        <div class="media-vol-slider-wrap">
                            <input type="range" id="media-vol-slider" class="media-vol-slider" min="0" max="100" value="100"
                                oninput="onLiveVolumeChange(this.value, '${category}', '${mediaId}')">
                        </div>
                        <small class="media-ctrl-hint">Controls volume on live display output</small>
                    </div>
                    ` : ''}

                    <!-- SHOW NOW / CLEAR -->
                    <div class="media-control-section media-live-section">
                        <label class="media-ctrl-label">DISPLAY OUTPUT</label>
                        <div class="media-live-btns">
                            <button class="media-live-btn btn-go-live" onclick="sendMediaToLiveDisplay('${category}', '${mediaId}', '${safeName}')">
                                🚀 SHOW NOW
                            </button>
                            <button class="media-live-btn btn-clear-live" onclick="clearLiveMediaDisplay('${category}')">
                                ⏹️ HIDE / CLEAR
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Apply monitor routing to the preview element
    setTimeout(() => {
        const previewEl = document.getElementById("media-sched-preview-el");
        if (previewEl && (category === 'video' || category === 'audio')) {
            if (window._audioMonitorEnabled) {
                applyMonitorRouting(previewEl);
            }
        }
    }, 100);

    // Track live loop state
    window._liveLoopEnabled = true;
    window._liveMediaActive = false;
}
window.loadMediaScheduledView = loadMediaScheduledView;

// --- LIVE OUTPUT CONTROL FUNCTIONS (send to display via WebSocket) ---

// --- LIVE OUTPUT CONTROL FUNCTIONS (send to display via WebSocket) ---

// --- LIVE OUTPUT CONTROL FUNCTIONS (send to display via WebSocket) ---

window._liveMonitorEl = null;

function playLiveMonitor(category, streamUrl) {
    stopLiveMonitor();

    if (!window._audioMonitorEnabled) return;

    if (category === 'video' || category === 'audio') {
        const el = document.createElement(category === 'video' ? 'video' : 'audio');
        el.src = streamUrl;
        el.volume = (document.getElementById("media-vol-slider")?.value || 100) / 100;
        el.loop = window._liveLoopEnabled;

        // Route to monitor device if custom monitor is enabled
        if (el.setSinkId && window._audioMonitorDeviceId && window._audioMonitorDeviceId !== 'default') {
            el.setSinkId(window._audioMonitorDeviceId).catch(() => { });
        }

        window._liveMonitorEl = el;
        el.play().catch(() => { });
    }
}
window.playLiveMonitor = playLiveMonitor;

function stopLiveMonitor() {
    if (window._liveMonitorEl) {
        try {
            window._liveMonitorEl.pause();
            window._liveMonitorEl.src = "";
            window._liveMonitorEl.removeAttribute('src');
            window._liveMonitorEl.load();
        } catch (e) { }
        window._liveMonitorEl = null;
    }
}
window.stopLiveMonitor = stopLiveMonitor;

function checkAndClearLiveMediaController(willPlayNewVis = false) {
    if (window._liveMediaActive) {
        stopLiveMonitor();
        window._liveMediaActive = false;

        const playBtn = document.getElementById("media-btn-play");
        const iconSpan = document.getElementById("media-play-icon");
        const textSpan = document.getElementById("media-play-text");
        if (iconSpan) iconSpan.innerText = "▶️";
        if (textSpan) textSpan.innerText = "PLAY LIVE";
        if (playBtn) playBtn.classList.remove("paused");

        if (!willPlayNewVis) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
                ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } }));
                ws.send(JSON.stringify({ action: "update_audio", payload: { url: "" } }));
            }
        }
    }
}
window.checkAndClearLiveMediaController = checkAndClearLiveMediaController;

function toggleLiveMediaPlay(category, mediaId, mediaName) {
    const playBtn = document.getElementById("media-btn-play");
    const iconSpan = document.getElementById("media-play-icon");
    const textSpan = document.getElementById("media-play-text");
    if (!playBtn) return;

    if (!window._liveMediaActive) {
        sendMediaToLiveDisplay(category, mediaId, mediaName);
        return;
    }

    const isPaused = playBtn.classList.contains("paused");
    const target = (category === 'audio') ? 'audio' : 'video';
    const cmd = isPaused ? 'play' : 'pause';

    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: "bg_control",
            payload: { target: target, command: cmd }
        }));
    }

    // Sync local hidden live monitor element instead of preview element to avoid double audio
    if (window._liveMonitorEl) {
        if (isPaused) {
            window._liveMonitorEl.play().catch(() => { });
        } else {
            window._liveMonitorEl.pause();
        }
    }

    // Pause the preview element on the left so that sound doesn't double
    const previewEl = document.getElementById("media-sched-preview-el");
    if (previewEl) {
        previewEl.pause();
    }

    if (isPaused) {
        if (iconSpan) iconSpan.innerText = "⏸️";
        if (textSpan) textSpan.innerText = "PAUSE LIVE";
        playBtn.classList.remove("paused");
    } else {
        if (iconSpan) iconSpan.innerText = "▶️";
        if (textSpan) textSpan.innerText = "PLAY LIVE";
        playBtn.classList.add("paused");
    }
}
window.toggleLiveMediaPlay = toggleLiveMediaPlay;

function toggleLiveMediaLoop(category, mediaId) {
    window._liveLoopEnabled = !window._liveLoopEnabled;
    const loopBtn = document.getElementById("media-btn-loop");
    if (loopBtn) {
        loopBtn.innerText = window._liveLoopEnabled ? "🔁 LOOP: ON" : "➡️ LOOP: OFF";
        loopBtn.classList.toggle("active", window._liveLoopEnabled);
    }
    const target = (category === 'audio') ? 'audio' : 'video';
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: "bg_control",
            payload: { target: target, command: "loop", value: window._liveLoopEnabled }
        }));
    }
    // Sync local hidden live monitor element loop setting
    if (window._liveMonitorEl) {
        window._liveMonitorEl.loop = window._liveLoopEnabled;
    }
}
window.toggleLiveMediaLoop = toggleLiveMediaLoop;

function replayLiveMedia(category, mediaId, mediaName) {
    const target = (category === 'audio') ? 'audio' : 'video';
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: "bg_control",
            payload: { target: target, command: "replay" }
        }));
    }

    // Sync local hidden live monitor element
    if (window._liveMonitorEl) {
        window._liveMonitorEl.currentTime = 0;
        window._liveMonitorEl.play().catch(() => { });
    }

    // Pause local preview element to avoid double sound
    const previewEl = document.getElementById("media-sched-preview-el");
    if (previewEl) {
        previewEl.pause();
    }

    // Update play button state to playing
    const playBtn = document.getElementById("media-btn-play");
    const iconSpan = document.getElementById("media-play-icon");
    const textSpan = document.getElementById("media-play-text");
    if (iconSpan) iconSpan.innerText = "⏸️";
    if (textSpan) textSpan.innerText = "PAUSE LIVE";
    if (playBtn) playBtn.classList.remove("paused");
}
window.replayLiveMedia = replayLiveMedia;

// Volume controls both live output and the local preview (mirroring)
function onLiveVolumeChange(volVal, category, mediaId) {
    const val = parseInt(volVal) || 0;
    const valSpan = document.getElementById("media-vol-val");
    if (valSpan) valSpan.innerText = val + "%";
    const iconSpan = document.getElementById("media-vol-icon");
    if (iconSpan) iconSpan.innerText = (val === 0) ? "🔇" : (val < 50 ? "🔉" : "🔊");

    const target = (category === 'audio') ? 'audio' : 'video';
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
            action: "bg_control",
            payload: { target: target, command: "volume", value: val / 100 }
        }));
    }

    // Sync local hidden live monitor element volume
    if (window._liveMonitorEl) {
        window._liveMonitorEl.volume = val / 100;
    }
}
window.onLiveVolumeChange = onLiveVolumeChange;

function onMediaVolumeChange(volVal, category, mediaId) { onLiveVolumeChange(volVal, category, mediaId); }
window.onMediaVolumeChange = onMediaVolumeChange;

// SHOW NOW from media controller acts like showing slide background (does NOT lock activeLibraryPlayers)
function sendMediaToLiveDisplay(category, mediaId, mediaName) {
    if (category === 'video' || category === 'audio') {
        window._liveMediaActive = true;
        const schedSlider = document.getElementById("media-vol-slider");
        const initVol = schedSlider ? normalizeMediaVolume(Number(schedSlider.value) / 100) : 1.0;
        if (category === 'video') window._localBgVolume = initVol;
        else window._localSfxVolume = initVol;
    }
    if (typeof window.markLocalMediaTookOver === 'function') window.markLocalMediaTookOver(category);
    const streamUrl = (category === 'video') ? `/api/stream_video/${mediaId}` :
        (category === 'photo') ? `/api/stream_photo/${mediaId}` :
            `/api/stream_audio/${mediaId}`;

    if (category === 'video') {
        if (window.activeSenderMedia) {
            window.activeSenderMedia.video = false;
        }
        if (window.masterBgAudio && !window.masterBgAudio.paused) {
            window.masterBgAudio.pause();
        }
        window.lastTriggeredBg = mediaId;
        window.lastTriggeredBehavior = window._liveLoopEnabled ? "loop" : "once_hold";
        window.currentlyPlayingBg = mediaId;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: "update_background",
                payload: {
                    url: streamUrl,
                    behavior: window._liveLoopEnabled ? "loop" : "once_hold",
                    muted: true, // [FIX] Audio hanya dari masterBgAudio di control.html — display selalu muted
                    name: mediaName
                }
            }));
            // Clear other active media layers
            ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } }));
            ws.send(JSON.stringify({ action: "update_audio", payload: { url: "" } }));
            ws.send(JSON.stringify({ action: "update_presentation", payload: { url: "" } }));
        }
    } else if (category === 'photo') {
        if (window.activeSenderMedia) {
            window.activeSenderMedia.photo = false;
        }
        window.lastTriggeredBg = mediaId;
        window.currentlyPlayingBg = mediaId;
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: "update_photo",
                payload: { url: streamUrl, name: mediaName }
            }));
            // Clear other active media layers
            ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
            ws.send(JSON.stringify({ action: "update_audio", payload: { url: "" } }));
            ws.send(JSON.stringify({ action: "update_presentation", payload: { url: "" } }));
        }
    } else if (category === 'audio') {
        if (window.activeSenderMedia) {
            window.activeSenderMedia.audio = false;
        }
        if (window.masterBgAudio && !window.masterBgAudio.paused) {
            window.masterBgAudio.pause();
        }
        if (window.masterSfxAudio && !window.masterSfxAudio.paused) {
            window.masterSfxAudio.pause();
        }
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: "update_audio",
                payload: { url: streamUrl, name: mediaName }
            }));
            // Clear other active media layers
            ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
            ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } }));
            ws.send(JSON.stringify({ action: "update_presentation", payload: { url: "" } }));
        }
    }

    // Play local hidden live monitor element
    playLiveMonitor(category, streamUrl);

    // Pause the preview element on the left so that sound doesn't double
    const previewEl = document.getElementById("media-sched-preview-el");
    if (previewEl) {
        previewEl.pause();
    }

    window._liveMediaActive = true;
    const playBtn = document.getElementById("media-btn-play");
    const iconSpan = document.getElementById("media-play-icon");
    const textSpan = document.getElementById("media-play-text");
    if (iconSpan) iconSpan.innerText = "⏸️";
    if (textSpan) textSpan.innerText = "PAUSE LIVE";
    if (playBtn) playBtn.classList.remove("paused");
}
window.sendMediaToLiveDisplay = sendMediaToLiveDisplay;

function clearLiveMediaDisplay(category) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        if (category === 'audio') {
            ws.send(JSON.stringify({ action: "update_audio", payload: { url: "" } }));
        } else if (category === 'video') {
            ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
        } else if (category === 'photo') {
            ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } }));
        }
    }

    // Stop local hidden live monitor element
    stopLiveMonitor();

    // Pause local preview element
    const previewEl = document.getElementById("media-sched-preview-el");
    if (previewEl && (category === 'video' || category === 'audio')) {
        previewEl.pause();
        previewEl.currentTime = 0;
    }

    window._liveMediaActive = false;
    const iconSpan = document.getElementById("media-play-icon");
    const textSpan = document.getElementById("media-play-text");
    const playBtn = document.getElementById("media-btn-play");
    if (iconSpan) iconSpan.innerText = "▶️";
    if (textSpan) textSpan.innerText = "PLAY LIVE";
    if (playBtn) playBtn.classList.remove("paused");
}
window.clearLiveMediaDisplay = clearLiveMediaDisplay;



function renderSchedule() {
    const container = document.getElementById("schedule-list");
    container.innerHTML = "";

    // 🎯 BISA DROP PPT / MEDIA KE AREA KOSONG SCHEDULE (Paling Bawah)
    container.ondragover = (e) => { e.preventDefault(); };
    container.ondrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            const dataStr = e.dataTransfer.getData("text/plain");
            if (dataStr) {
                const data = JSON.parse(dataStr);
                if (data.action === "apply_media") {
                    if (data.category === "presentation") {
                        window.addPPTToSchedule(data.id, data.name);
                    } else if (data.category === "video" || data.category === "photo" || data.category === "audio") {
                        window.addMediaToSchedule(data.category, data.id, data.name);
                    }
                    return;
                }
                if (data.action === "add_song_to_schedule" && data.title) {
                    await addSongToScheduleAt(data.title);
                    return;
                }
            }
        } catch (err) { }
    };

    if (scheduleList.length === 0) {
        container.innerHTML = "<div style='padding:20px; text-align:center; color:#555;'>Empty Running Order</div>";
        return;
    }

    scheduleList.forEach((item, index) => {
        // 🎯 SCRIPTURE GROUP — Accordion collapsible
        if (item.type === "scripture_group") {
            const grpDiv = document.createElement("div");
            grpDiv.className = "song-item scr-group-item";
            grpDiv.draggable = true;
            grpDiv.ondragstart = (e) => {
                e.stopPropagation();
                window.dragStartIndex = index;
                e.dataTransfer.effectAllowed = 'move';
            };
            grpDiv.ondragover = (e) => { e.preventDefault(); grpDiv.classList.add('over'); };
            grpDiv.ondragleave = () => grpDiv.classList.remove('over');
            grpDiv.ondrop = async (e) => {
                e.preventDefault(); e.stopPropagation();
                grpDiv.classList.remove('over');
                // Ignore if a verse drag is in progress
                if (scrVerseDragVerseIdx !== -1) { scrVerseDragGroupIdx = -1; scrVerseDragVerseIdx = -1; return; }
                if (window.dragStartIndex === -1 || window.dragStartIndex === index) return;
                const draggedItem = scheduleList.splice(window.dragStartIndex, 1)[0];
                scheduleList.splice(index, 0, draggedItem);
                renderSchedule();
                await saveActiveSchedule();
                window.dragStartIndex = -1;
            };
            const arrow = scriptureGroupExpanded ? "\u25BC" : "\u25B6";
            const count = item.verses ? item.verses.length : 0;
            grpDiv.innerHTML = `
                <div class="drag-handle" title="Drag to reorder">\u2630</div>
                <div class="sched-item-wrap">
                    <div class="sched-title-text sched-title-scripture scr-group-header">
                        ${index + 1}. \uD83D\uDCD6 SCRIPTURE LIST
                        <span class="scr-group-count">(${count} ayat)</span>
                        <span class="scr-group-arrow">${arrow}</span>
                    </div>
                </div>`;
            grpDiv.onclick = (e) => {
                if (e.target.classList.contains('drag-handle')) return;
                scriptureGroupExpanded = !scriptureGroupExpanded;
                renderSchedule();
            };
            grpDiv.oncontextmenu = (e) => { showScheduleContextMenu(e, index, item.title); };
            container.appendChild(grpDiv);

            if (scriptureGroupExpanded && item.verses && item.verses.length > 0) {
                item.verses.forEach((verse, vi) => {
                    const vDiv = document.createElement("div");
                    vDiv.className = "scr-verse-sched-item";
                    vDiv.draggable = true;
                    vDiv.innerHTML = `<span class="scr-verse-sched-dot">\u25B8</span>${verse.display || verse.book + ' ' + verse.chapter + ':' + verse.verse}`;
                    vDiv.onclick = (e) => {
                        e.stopPropagation();
                        document.querySelectorAll('.scr-verse-sched-item').forEach(el => el.classList.remove('scr-verse-sched-active'));
                        vDiv.classList.add('scr-verse-sched-active');
                        loadScriptureFromSchedule(verse);
                    };
                    vDiv.oncontextmenu = (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        showScriptureVerseContextMenu(e, index, vi);
                    };
                    vDiv.ondragstart = (e) => {
                        e.stopPropagation();
                        scrVerseDragGroupIdx = index;
                        scrVerseDragVerseIdx = vi;
                        e.dataTransfer.effectAllowed = 'move';
                    };
                    vDiv.ondragover = (e) => { e.preventDefault(); e.stopPropagation(); vDiv.classList.add('over'); };
                    vDiv.ondragleave = () => vDiv.classList.remove('over');
                    vDiv.ondrop = async (e) => {
                        e.preventDefault(); e.stopPropagation();
                        vDiv.classList.remove('over');
                        if (scrVerseDragGroupIdx !== index || scrVerseDragVerseIdx === -1 || scrVerseDragVerseIdx === vi) {
                            scrVerseDragGroupIdx = -1; scrVerseDragVerseIdx = -1; return;
                        }
                        const verses = scheduleList[index].verses;
                        const [draggedVerse] = verses.splice(scrVerseDragVerseIdx, 1);
                        verses.splice(vi, 0, draggedVerse);
                        scrVerseDragGroupIdx = -1; scrVerseDragVerseIdx = -1;
                        renderSchedule();
                        await saveActiveSchedule();
                    };
                    container.appendChild(vDiv);
                });
            }
            return;
        }

        const div = document.createElement("div");
        div.className = "song-item";
        div.draggable = true;
        if (item.title === currentSongTitle) div.classList.add("active");

        div.ondragstart = (e) => {
            window.dragStartIndex = index;
            e.dataTransfer.effectAllowed = 'move';
        };

        div.ondragover = (e) => {
            e.preventDefault();
            div.classList.add('over');
        };

        div.ondragleave = (e) => {
            div.classList.remove('over');
        };

        div.ondrop = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            div.classList.remove('over');

            try {
                const dataStr = e.dataTransfer.getData("text/plain");
                if (dataStr) {
                    const data = JSON.parse(dataStr);
                    if (data.action === "apply_media") {
                        if (data.category === "presentation") {
                            window.addPPTToSchedule(data.id, data.name, index);
                        } else if (data.category === "video" || data.category === "photo" || data.category === "audio") {
                            window.addMediaToSchedule(data.category, data.id, data.name, index);
                        }
                        return;
                    }
                    if (data.action === "add_song_to_schedule" && data.title) {
                        await addSongToScheduleAt(data.title, index);
                        return;
                    }
                }
            } catch (err) { }

            if (window.dragStartIndex === -1 || window.dragStartIndex === index) return;
            const draggedItem = scheduleList.splice(window.dragStartIndex, 1)[0];
            scheduleList.splice(index, 0, draggedItem);

            renderSchedule();
            await saveActiveSchedule();
            window.dragStartIndex = -1;
        };

        // 🎯 CLICK DI FULL KOTAK UNTUK LOAD SONG ATAU MEDIA SCHEDULED VIEW
        div.onclick = (e) => {
            if (e.target.classList.contains('sched-note-text')) return;
            window.activeScheduleIndex = index;
            const isMediaItem = item.type === "media" ||
                item.title.startsWith("🎬 VIDEO:") ||
                item.title.startsWith("📷 PHOTO:") ||
                item.title.startsWith("🎵 AUDIO:");
            if (isMediaItem) {
                loadMediaScheduledView(item);
            } else {
                loadSong(item.title);
            }
        };

        // 🎯 RIGHT-CLICK CONTEXT MENU
        div.oncontextmenu = (e) => {
            showScheduleContextMenu(e, index, item.title);
        };

        // 🎯 FIX 2: POTONG TEKS KEPANJANGAN
        let safeTitle = item.title.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        let displayTitle = item.title;
        if (displayTitle.length > 25) {
            displayTitle = displayTitle.substring(0, 25) + "...";
        }

        const noteText = item.note ? item.note : "+ add note...";
        const noteClass = item.note ? "sched-note-active" : "sched-note-empty";

        const isPPT = item.title.startsWith("📊 PPT:");
        const isVideo = item.title.startsWith("🎬 VIDEO:") || item.media_category === "video";
        const isPhoto = item.title.startsWith("📷 PHOTO:") || item.media_category === "photo";
        const isAudio = item.title.startsWith("🎵 AUDIO:") || item.media_category === "audio";

        let titleClass = "sched-title-text";
        if (isPPT) titleClass += " sched-title-ppt";
        else if (isVideo) titleClass += " sched-title-video";
        else if (isPhoto) titleClass += " sched-title-photo";
        else if (isAudio) titleClass += " sched-title-audio";

        div.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">☰</div>
                    <div class="sched-item-wrap">
                        <div class="${titleClass}" title="${safeTitle}">${index + 1}. ${displayTitle}</div>
                        <div class="sched-note-text ${noteClass}">${noteText}</div>
                    </div>
                `;

        const noteElement = div.querySelector('.sched-note-text');
        if (noteElement) {
            noteElement.onclick = (e) => {
                e.stopPropagation();
                editScheduleNote(index);
            };
            noteElement.style.cursor = 'pointer';
        }

        container.appendChild(div);
    });
}
async function addToSchedule(title) {
    await addSongToScheduleAt(title);
}

async function addSongToScheduleAt(title, insertIndex = -1) {
    const newItem = { title: title, note: '' };
    if (insertIndex >= 0 && insertIndex <= scheduleList.length) {
        scheduleList.splice(insertIndex, 0, newItem);
    } else {
        scheduleList.push(newItem);
    }
    renderSchedule();
    await saveActiveSchedule();
}
async function removeFromSchedule(index) {
    // Hapus langsung tanpa konfirmasi
    scheduleList.splice(index, 1);
    renderSchedule();
    await saveActiveSchedule();
}

// ==========================================
// 🎯 SCRIPTURE → SCHEDULE SYSTEM
// ==========================================

function addScriptureToSchedule() {
    const searchInput = document.getElementById("bible-search-input");
    if (searchInput && searchInput.value.trim()) {
        const parsed = parseScriptureReference(searchInput.value.trim());
        if (parsed.valid) {
            const bInput = document.getElementById("bible-book");
            const cInput = document.getElementById("bible-chapter");
            const vInput = document.getElementById("bible-verse");
            if (bInput) bInput.value = parsed.bookEng;
            if (cInput) cInput.value = parsed.chapter;
            if (vInput) vInput.value = parsed.verse;
        }
    }

    const rawBook = document.getElementById("bible-book").value;
    const chapter = document.getElementById("bible-chapter").value;
    const verse = document.getElementById("bible-verse").value || "1";

    if (!rawBook || !chapter) {
        showToast("Fill in Book and Chapter first!", "error", 1300);
        return;
    }
    const checked = document.querySelectorAll(".bible-version-cb:checked");
    if (checked.length === 0) {
        showToast("Select at least 1 Bible translation!", "error", 1300);
        return;
    }

    const v1 = checked[0].value;
    const v2 = checked.length > 1 ? checked[1].value : "";
    const titleLang = document.getElementById('scr-title-lang')?.value || 'id';
    const engBook = translateBookName(rawBook, 'en');
    const dispBook = translateBookName(engBook, titleLang);
    const display = `\uD83D\uDCD6 ${dispBook} ${chapter}:${verse}`;

    const verseData = { book: engBook, chapter, verse, v1, v2, title_lang: titleLang, display };

    // Cari scripture_group yang sudah ada, atau buat baru
    const groupIdx = scheduleList.findIndex(i => i.type === "scripture_group");
    if (groupIdx !== -1) {
        scheduleList[groupIdx].verses.push(verseData);
        scheduleList[groupIdx].note = `${scheduleList[groupIdx].verses.length} ayat`;
    } else {
        scheduleList.push({
            title: "\uD83D\uDCD6 SCRIPTURE LIST",
            type: "scripture_group",
            note: "1 ayat",
            verses: [verseData]
        });
    }

    scriptureGroupExpanded = true;
    renderSchedule();
    saveActiveSchedule();
}

async function loadScriptureFromSchedule(verseData) {
    // Switch ke tab scripture jika belum aktif
    if (typeof currentMediaCategory !== 'undefined' && currentMediaCategory !== 'scripture') {
        switchMediaCategory(null, 'scripture');
    }

    // Restore Bible version checkboxes — fallback gracefully if version not on this computer
    document.querySelectorAll('.bible-version-cb').forEach(cb => { cb.checked = false; });
    if (verseData.v1) {
        const cb1 = document.querySelector(`.bible-version-cb[value="${verseData.v1}"]`);
        if (cb1) {
            cb1.checked = true;
        } else {
            // v1 tidak ada di komputer ini — pakai terjemahan pertama yang tersedia
            const firstCb = document.querySelector('.bible-version-cb');
            if (firstCb) firstCb.checked = true;
        }
    }
    if (verseData.v2) {
        const cb2 = document.querySelector(`.bible-version-cb[value="${verseData.v2}"]`);
        if (cb2) cb2.checked = true;
        // Jika v2 tidak ada, skip — pakai v1 saja
    }

    // Restore title lang
    const langSel = document.getElementById('scr-title-lang');
    if (langSel && verseData.title_lang) langSel.value = verseData.title_lang;

    // Set input fields
    const lang = verseData.title_lang || 'id';
    const bookInput = document.getElementById('bible-book');
    const chapInput = document.getElementById('bible-chapter');
    const verseInput = document.getElementById('bible-verse');
    const dispBook = translateBookName(verseData.book, lang);
    if (bookInput) bookInput.value = translateBookName(verseData.book, 'en');
    if (chapInput) chapInput.value = verseData.chapter;
    if (verseInput) verseInput.value = verseData.verse;

    const searchInput = document.getElementById("bible-search-input");
    if (searchInput) {
        searchInput.value = `${dispBook} ${verseData.chapter}:${verseData.verse}`;
    }

    // Load chapter + auto-fire ayat yang dituju
    await searchScripture(false);
}

async function removeScriptureVerseFromGroup(groupIndex, verseIndex) {
    if (!scheduleList[groupIndex] || scheduleList[groupIndex].type !== 'scripture_group') return;
    scheduleList[groupIndex].verses.splice(verseIndex, 1);
    scheduleList[groupIndex].note = `${scheduleList[groupIndex].verses.length} ayat`;
    renderSchedule();
    await saveActiveSchedule();
}

function showScriptureVerseContextMenu(e, groupIndex, verseIndex) {
    const oldMenu = document.getElementById("schedule-context-menu");
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement("div");
    menu.id = "schedule-context-menu";
    menu.className = "library-context-menu";

    const delOpt = document.createElement("div");
    delOpt.className = "library-context-item library-context-danger";
    delOpt.innerHTML = "\uD83D\uDDD1 Remove verse";
    delOpt.onclick = () => {
        removeScriptureVerseFromGroup(groupIndex, verseIndex);
        menu.remove();
    };
    menu.appendChild(delOpt);
    document.body.appendChild(menu);

    let x = e.clientX, y = e.clientY;
    menu.style.left = x + "px";
    menu.style.top = y + "px";
    requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 10) + "px";
        if (y + rect.height > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 10) + "px";
    });

    setTimeout(() => {
        document.addEventListener('click', function rm(e2) {
            if (!menu.contains(e2.target) && menu.parentElement) {
                menu.remove();
                document.removeEventListener('click', rm);
            }
        });
    }, 10);
}

// 🎯 SCHEDULE CONTEXT MENU (Right-Click)
function showScheduleContextMenu(event, index, title) {
    event.preventDefault();

    // Hapus context menu lama jika ada
    const oldMenu = document.getElementById("schedule-context-menu");
    if (oldMenu) oldMenu.remove();

    // Buat context menu baru
    const menu = document.createElement("div");
    menu.id = "schedule-context-menu";
    menu.className = "library-context-menu";

    // Option 1: Edit Note
    const editNoteOption = document.createElement("div");
    editNoteOption.className = "library-context-item";
    editNoteOption.innerHTML = "✏️ Edit Note";
    editNoteOption.onclick = () => {
        editScheduleNote(index);
        menu.remove();
    };
    menu.appendChild(editNoteOption);

    // Option 2: Delete
    const delOption = document.createElement("div");
    delOption.className = "library-context-item library-context-danger";
    delOption.innerHTML = "🗑 Delete";
    delOption.onclick = () => {
        removeFromSchedule(index);
        menu.remove();
    };
    menu.appendChild(delOption);

    // Tambahkan menu ke body
    document.body.appendChild(menu);

    // Positioning logic: jangan sampai terpotong oleh viewport
    const rect = menu.getBoundingClientRect();
    let x = event.clientX;
    let y = event.clientY;

    // Cek apakah menu keluar dari kanan layar
    if (x + rect.width > window.innerWidth) {
        x = window.innerWidth - rect.width - 10;
    }

    // Cek apakah menu keluar dari bawah layar
    if (y + rect.height > window.innerHeight) {
        y = window.innerHeight - rect.height - 10;
    }

    menu.style.left = x + "px";
    menu.style.top = y + "px";

    // Hapus menu jika klik di tempat lain
    setTimeout(() => {
        document.addEventListener('click', function removeMenu(e) {
            if (!menu.contains(e.target) && menu.parentElement) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        });
    }, 10);
}
async function editScheduleNote(index) {
    const oldNote = scheduleList[index].note || "";
    // Ganti prompt() bawaan dengan showCustomDialog buatan kita sendiri
    const newNote = await showCustomDialog("prompt", `Edit Notes untuk lagu <b>"${scheduleList[index].title}"</b><br><small>(Contoh: "Medley", "Key G", "Pelayan Firman")</small> :`, oldNote);

    if (newNote !== null) {
        scheduleList[index].note = newNote;
        renderSchedule();
        await saveActiveSchedule();
    }
}
async function saveActiveSchedule() { await fetch('/api/service', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scheduleList) }); }
async function fetchSavedSchedules() {
    try {
        const res = await fetch('/api/schedules');
        savedSchedules = await res.json();
    } catch (e) {
        console.error("Failed to fetch schedules:", e);
        return;
    }
    const select = document.getElementById("saved-sched-select");
    if (!select) return;
    const currentVal = select.value;
    select.innerHTML = '<option value="">-- Select Saved --</option>';

    // 🎯 GET ALL SCHEDULE NAMES & SORT - MOST RECENT FIRST
    let scheduleNames = Object.keys(savedSchedules);

    // Sort by updated_at descending if available, else reverse insertion order
    scheduleNames.sort((a, b) => {
        const dataA = savedSchedules[a];
        const dataB = savedSchedules[b];
        const dateA = (dataA && typeof dataA === 'object' && !Array.isArray(dataA) && dataA.updated_at) ? new Date(dataA.updated_at).getTime() : 0;
        const dateB = (dataB && typeof dataB === 'object' && !Array.isArray(dataB) && dataB.updated_at) ? new Date(dataB.updated_at).getTime() : 0;
        if (dateA && dateB) return dateB - dateA;
        if (dateA) return -1;
        if (dateB) return 1;
        return 0;
    });

    // If more than 10, limit top 10; otherwise show all
    const displayNames = scheduleNames.length > 10 ? scheduleNames.slice(0, 10) : scheduleNames;

    displayNames.forEach(name => {
        const opt = document.createElement("option");
        opt.value = name;
        opt.innerText = name;
        select.appendChild(opt);
    });

    // Always append "Show All Schedules..." option at the very bottom
    const optDivider = document.createElement("option");
    optDivider.disabled = true;
    optDivider.innerText = "──────────────";
    select.appendChild(optDivider);

    const optShowAll = document.createElement("option");
    optShowAll.value = "__SHOW_ALL__";
    optShowAll.innerText = "📜 Show All Schedules...";
    optShowAll.style.fontWeight = "bold";
    select.appendChild(optShowAll);

    // Restore previous selection if still valid
    if (currentVal && currentVal !== '__SHOW_ALL__' && savedSchedules[currentVal]) {
        select.value = currentVal;
        lastSelectedSched = currentVal;
    } else {
        lastSelectedSched = select.value;
    }
}

async function saveCurrentGrid() {
    if (currentActiveTab === 'scripture') {
        showToast("Cannot save song in Scripture mode!", "error", 1300);
        return;
    }
    if (lyricsData.length === 0) { showToast("Grid is empty, nothing to save.", "error", 3000); return; }
    if (!currentSongTitle) { showToast("No song loaded. Use 'Add Song' first.", "error", 3000); return; }

    let finalCustomSettings = currentSongCustomSettings;
    if (document.getElementById("current-disp-mode").value === 'custom') {
        finalCustomSettings = getDisplayConfigFromUI();
    }

    const currentSettings = {
        mode: document.getElementById("current-disp-mode").value,
        preset_name: document.getElementById("song-preset-select").value,
        custom: getDisplayConfigFromUI()
    };
    const payload = { title: currentSongTitle, data: lyricsData, settings: currentSettings };

    // 🚀 MUNCULIN LOADING PAS DIKLIK
    showToast("Saving song...", "loading");

    const res = await fetch('/api/songs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
        const idx = allSongs.findIndex(s => s.title === currentSongTitle);
        if (idx !== -1) {
            allSongs[idx].data = lyricsData;
            allSongs[idx].settings = currentSettings;
            // Update cached clean lyrics
            allSongs[idx].cleanLyrics = lyricsData ? lyricsData.map(slide => cleanText(slide.text)).join(" ") : "";
        }

        // 🚀 UBAH JADI SUCCESS (Auto ilang 2 detik)
        showToast(`"${currentSongTitle}" saved!`, "success", 2000);
        markSongSaved();
    } else {
        showToast("Failed to save song.", "error", 3000);
    }
}

function loadSong(title) {
    if (typeof setNavigationTarget === 'function') setNavigationTarget('lyrics');
    // Hide stuck PPT loading overlay
    const pptOverlay = document.getElementById('ppt-grid-overlay');
    if (pptOverlay) {
        pptOverlay.classList.remove('show-flex');
    }
    window.waitingForPPTId = null;
    window.waitingForPPTName = null;

    if (typeof window.exitPPTRemoteMode === 'function') window.exitPPTRemoteMode();

    const song = allSongs.find(s => s.title === title);
    if (song) {
        const previousHadLocalBg = Boolean(window.currentSongHasLocalBg);
        const newSongHasLocalBg = song.data && song.data.some(s => s.bg_id && (s.bg_type === 'video' || s.bg_type === 'photo'));
        if (previousHadLocalBg && !newSongHasLocalBg) {
            // Lagu sebelumnya punya background lokal, tapi lagu baru tidak punya:
            // Sesuai Decision 4: bersihkan layar menjadi hitam sampai ada media baru atau sender trigger
            window.currentVisId = null;
            window.currentVisType = null;
            window.currentSongHasLocalBg = false;
            if (window.activeSenderMedia) {
                window.activeSenderMedia.video = false;
                window.activeSenderMedia.photo = false;
            }
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
                ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } }));
            }
        } else if (newSongHasLocalBg) {
            window.currentSongHasLocalBg = true;
        }

        currentSongTitle = song.title;
        lyricsData = song.data;

        // --- FIX UI TEKS NOW LOADED ---
        // (Di dalam loadSong)
        // --- FIX UI TEKS NOW LOADED ---
        const loadedLabel = document.getElementById("now-loaded-text");
        if (loadedLabel) {
            let displayTitle = currentSongTitle;
            if (displayTitle.length > 30) displayTitle = displayTitle.substring(0, 30) + "...";

            loadedLabel.innerText = displayTitle;
            loadedLabel.classList.remove("now-loaded-ppt");
            loadedLabel.classList.add("now-loaded-cyan"); // Pakai Class, NO INLINE!
        }

        const s = song.settings || {};

        // DETEKSI LAGU BARU (Belum punya settingan sama sekali)
        const isNewSong = Object.keys(s).length === 0 || (!s.custom && !s.theme && !s.mode);

        let mode = s.mode || 'custom';
        let presetName = s.preset_name || '';

        if (isNewSong) {
            // Kalau lagu baru, cek apakah ada Default Global Preset?
            if (currentGlobalDefaultName && dispPresetsData[currentGlobalDefaultName]) {
                mode = 'preset';
                presetName = currentGlobalDefaultName;
            }
            // Reset custom DNA jadi netral (biar ga nyolong style lagu sebelumnya)
            currentSongCustomSettings = { font: 'Cinzel', theme: 'default', color: '#ffffff', glow: 50, fade: 0.5, trans: 'fade', speed: '30s', zoom: 'stay', motion: 'none', align: 'center', pad_x: 10, margin_x: 10, text_wrap: 80 };
        } else {
            // Kalau lagu lama, ambil DNA aslinya
            currentSongCustomSettings = s.custom || {};
            if (!s.custom && s.theme) { currentSongCustomSettings = { font: s.font, theme: s.theme, color: s.color, glow: s.glow, fade: s.fade, trans: s.trans, speed: s.speed, zoom: s.zoom, motion: s.motion, align: s.align, pad_x: s.pad_x, margin_x: s.margin_x !== undefined ? s.margin_x : s.pad_x, text_wrap: s.text_wrap !== undefined ? s.text_wrap : (s.pad_x !== undefined ? 100 - 2 * s.pad_x : 80) }; }
        }

        // 2. Set UI DNA
        document.getElementById("current-disp-mode").value = mode;
        updateStyleButtonsUI(mode);
        document.getElementById("song-preset-select").value = presetName;

        // 3. TENTUKAN BAJU YANG DIPAKAI (Global vs DNA)
        let activeSettings = {};
        const isForceGlobal = document.getElementById("force-global").checked;
        const globalPresetName = document.getElementById("global-preset-select").value;

        if (isForceGlobal && globalPresetName && dispPresetsData[globalPresetName]) {
            activeSettings = dispPresetsData[globalPresetName]; // Bos Besar
        } else {
            if (mode === 'preset' && presetName && dispPresetsData[presetName]) {
                activeSettings = dispPresetsData[presetName]; // Preset Lagu
            } else {
                activeSettings = currentSongCustomSettings; // DNA Asli
            }
        }

        // 4. APPLY TO UI & SCREEN
        applyDisplayPresetToUI(activeSettings);

        // 🎯 AUTO-SET BOX MODE IF PPT IS LOADED
        if (currentSongTitle.startsWith("📊 PPT:")) {
            currentGridMode = 'box';
        }

        // updateSettings(); 
        renderGrid();
        const libraryItems = document.querySelectorAll('#library-list .song-item');
        libraryItems.forEach(item => {
            const titleSpan = item.querySelector('span');
            if (titleSpan && titleSpan.innerText === currentSongTitle) {
                item.classList.add('active'); // Kasih warna biru ke lagu yg diklik
            } else {
                item.classList.remove('active'); // Copot warna biru dari lagu lain
            }
        });
        renderSchedule();

        // --- MODE MEDLEY (STANDBY) ---
        // Jangan paksa tembak lirik ke layar. Tahan di lirik lagu sebelumnya.
        currentIndex = -1;
        markSongSaved();

    }
}
async function deleteSong(title) {
    const isOk = await showCustomDialog("confirm", `Delete "${title}" from library?`);
    if (!isOk) return;
    await fetch(`/api/songs/${title}`, { method: 'DELETE' });

    // Cek apakah lagu ada di schedule (Pencarian Object)
    const schedIndex = scheduleList.findIndex(item => item.title === title);
    if (schedIndex !== -1) {
        scheduleList = scheduleList.filter(t => t.title !== title);
        saveActiveSchedule();
        renderSchedule();
    }
    if (currentSongTitle === title) {
        currentSongTitle = "";
        document.getElementById("current-song-display").innerText = "- NO SONG LOADED -";
        lyricsData = [];
        renderGrid();
    }
    fetchLibrary();
}
function parseLyrics() { const raw = document.getElementById("raw-input").value; const lines = raw.split('\n'); lyricsData = []; currentSongTitle = ""; let idCounter = 0; lines.forEach(line => { if (line.trim()) { lyricsData.push({ id: idCounter++, text: line.trim(), type: 'normal' }); } }); renderGrid(); }

const gridBoxSizes = [
    { width: '110px', height: '60px', fontSize: '0.62em' },
    { width: '140px', height: '70px', fontSize: '0.7em' },
    { width: '170px', height: '80px', fontSize: '0.8em' }, // Default
    { width: '200px', height: '90px', fontSize: '0.9em' },
    { width: '240px', height: '105px', fontSize: '1.0em' },
    { width: '280px', height: '120px', fontSize: '1.1em' },
    { width: '320px', height: '140px', fontSize: '1.2em' }
];
let currentGridBoxSizeIndex = 2; // Default size index (170px)
let currentGridMode = 'box'; // Default grid mode
let currentGridGrouping = false; // Default grouping mode

// Update text content of all existing lyric boxes in-place when switching BOX <-> ROW mode
function updateGridLyricTexts() {
    const spans = document.querySelectorAll('#grid-container .grid-lyric-text[data-full-text]');
    spans.forEach(span => {
        const fullText = span.getAttribute('data-full-text');
        if (!fullText) return;
        if (currentGridMode === 'box') {
            // Re-apply truncation: full text is stored, so decode and re-truncate
            const plain = fullText;
            const truncated = plain.length > 35 ? plain.substring(0, 35) + '...' : plain;
            const safe = document.createElement('div');
            safe.textContent = truncated;
            span.innerHTML = safe.innerHTML;
        } else {
            // ROW mode: show full untruncated text with <br> for newline rendering
            const tmp = document.createElement('div');
            tmp.textContent = fullText;
            span.innerHTML = tmp.innerHTML.replace(/\r?\n/g, '<br>');
        }
    });
}
window.updateGridLyricTexts = updateGridLyricTexts;

function applyGridModeAndSize() {
    const container = document.getElementById("grid-container");
    if (!container) return;

    // 🎯 FORCE BOX MODE IF PPT IS ACTIVE
    if (currentSongTitle.startsWith("📊 PPT:") && currentGridMode === 'row') {
        currentGridMode = 'box';
    }

    // Remove existing mode classes
    container.classList.remove("grid-mode-box", "grid-mode-row", "grid-grouped");

    if (currentGridGrouping) {
        container.classList.add("grid-grouped");
    }

    const dropdownVal = document.getElementById("grid-dropdown-val");
    const itemBox = document.getElementById("item-grid-mode-box");
    const itemRow = document.getElementById("item-grid-mode-row");
    const zoomControls = document.getElementById("grid-dropdown-zoom");

    const chkGrouping = document.getElementById("chk-grid-grouping");
    const itemGrouping = document.getElementById("item-grid-grouping");
    if (chkGrouping) chkGrouping.checked = currentGridGrouping;
    if (itemGrouping) {
        if (currentGridGrouping) {
            itemGrouping.classList.add("active");
        } else {
            itemGrouping.classList.remove("active");
        }
    }

    if (currentGridMode === 'row') {
        container.classList.add("grid-mode-row");
        if (dropdownVal) dropdownVal.textContent = "☰ ROW";
        if (itemBox) itemBox.classList.remove("active");
        if (itemRow) itemRow.classList.add("active");
        if (zoomControls) zoomControls.style.display = "none";
    } else {
        container.classList.add("grid-mode-box");
        if (dropdownVal) dropdownVal.textContent = "⊞ BOX";
        if (itemBox) itemBox.classList.add("active");
        if (itemRow) itemRow.classList.remove("active");
        if (zoomControls) zoomControls.style.display = "flex";

        // Apply box sizes using CSS variables on the container
        const size = gridBoxSizes[currentGridBoxSizeIndex];
        container.style.setProperty('--grid-box-width', size.width);
        container.style.setProperty('--grid-box-height', size.height);
        container.style.setProperty('--grid-box-font-size', size.fontSize);
    }
}

function toggleGridDropdown(event) {
    if (event) event.stopPropagation();
    const menu = document.getElementById("grid-dropdown-menu");
    if (!menu) return;
    if (menu.style.display === "block") {
        menu.style.display = "none";
    } else {
        menu.style.display = "block";
    }
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        const gridMenu = document.getElementById("grid-dropdown-menu");
        if (gridMenu && gridMenu.style.display === "block") {
            gridMenu.style.display = "none";
        }
        document.querySelectorAll('.slide-tag-dropdown').forEach(el => el.remove());
        if (typeof closePresetContextMenu === "function") closePresetContextMenu();
    }
});

async function selectGridMode(mode, event) {
    if (event) event.stopPropagation();

    // 🎯 PREVENT ROW MODE WHEN PPT IS ACTIVE
    const isPPTActive = currentSongTitle.startsWith("📊 PPT:");

    if (mode === 'row' && isPPTActive) {
        showToast("⚠️ PPT mode requires BOX grid layout", "error", 1000);
        // Force back to box mode
        currentGridMode = 'box';
        // Update button UI to show box is selected
        const boxBtn = document.querySelector('[onclick*="selectGridMode(\'box\'"]');
        const rowBtn = document.querySelector('[onclick*="selectGridMode(\'row\'"]');
        if (boxBtn) boxBtn.classList.add('active');
        if (rowBtn) rowBtn.classList.remove('active');
        return;
    }

    currentGridMode = mode;

    const menu = document.getElementById("grid-dropdown-menu");
    if (menu) menu.style.display = "none";

    applyGridModeAndSize();
    updateGridLyricTexts();

    // Save to server app_settings.json
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                song_grid_mode: currentGridMode
            })
        });
    } catch (err) {
        console.warn("Failed to save grid mode setting:", err);
    }
}

async function toggleGridGrouping(event) {
    if (event) event.stopPropagation();
    currentGridGrouping = !currentGridGrouping;

    const chk = document.getElementById("chk-grid-grouping");
    if (chk) chk.checked = currentGridGrouping;

    const item = document.getElementById("item-grid-grouping");
    if (item) {
        if (currentGridGrouping) {
            item.classList.add("active");
        } else {
            item.classList.remove("active");
        }
    }

    renderGrid();

    // Save to server app_settings.json
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                song_grid_grouping: currentGridGrouping
            })
        });
    } catch (err) {
        console.warn("Failed to save grid grouping setting:", err);
    }
}

async function adjustGridBoxSize(direction) {
    let nextIndex = currentGridBoxSizeIndex + direction;
    if (nextIndex >= 0 && nextIndex < gridBoxSizes.length) {
        currentGridBoxSizeIndex = nextIndex;
        applyGridModeAndSize();

        // Save to server app_settings.json
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    song_grid_zoom_level: currentGridBoxSizeIndex
                })
            });
        } catch (err) {
            console.warn("Failed to save grid zoom setting:", err);
        }
    }
}

async function initGridSettings() {
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const settings = await res.json();
            if (settings.song_grid_mode) {
                currentGridMode = settings.song_grid_mode;
            }
            if (settings.song_grid_zoom_level !== undefined) {
                currentGridBoxSizeIndex = parseInt(settings.song_grid_zoom_level);
            }
            if (settings.song_grid_grouping !== undefined) {
                currentGridGrouping = settings.song_grid_grouping === true || settings.song_grid_grouping === 'true';
            }
        }
    } catch (err) {
        console.warn("Failed to load grid settings:", err);
    }
    applyGridModeAndSize();

    // Click outside handler for custom grid mode dropdown
    window.addEventListener('click', (e) => {
        const menu = document.getElementById("grid-dropdown-menu");
        const btn = document.getElementById("grid-dropdown-btn");
        if (menu && btn && !btn.contains(e.target) && !menu.contains(e.target)) {
            menu.style.display = "none";
        }
    });
}

function renderGrid() {
    // 🚀 FIX: Safely exit PPT Remote Mode if active when forcing local song
    const container = document.getElementById("grid-container");
    if (container && container.classList.contains("ppt-remote-active")) {
        if (typeof window.exitPPTRemoteMode === 'function') {
            window.exitPPTRemoteMode();
        } else {
            container.classList.remove("ppt-remote-active");
        }
        if (typeof setSidebarMode === 'function') {
            setSidebarMode('local');
        }
    }

    container.innerHTML = "";
    applyGridModeAndSize();

    // 🎯 LOGIKA DROP KE AREA KOSONG
    container.ondragover = (e) => { e.preventDefault(); };
    container.ondrop = (e) => {
        e.preventDefault();
        if (e.target === container) {
            try {
                const data = JSON.parse(e.dataTransfer.getData("text/plain"));
                if (data.action === "apply_media" && data.id) {
                    if (data.category === 'presentation') {
                        loadPPTToGrid(data.id, data.name);
                        return;
                    }
                    lyricsData.push({
                        id: Date.now(), text: "", type: data.category,
                        bg_id: data.id, bg_type: data.category, bg_name: data.name, bg_behavior: "loop"
                    });
                    renderGrid(); markSongUnsaved();
                }
                else if (data.action === "reorder_slide") {
                    const sourceIndex = data.index;
                    if (sourceIndex !== undefined && sourceIndex < lyricsData.length) {
                        const movedItem = lyricsData.splice(sourceIndex, 1)[0];
                        lyricsData.push(movedItem);
                        if (currentIndex === sourceIndex) currentIndex = lyricsData.length - 1;
                        else if (currentIndex > sourceIndex) currentIndex--;
                        renderGrid(); markSongUnsaved();
                    }
                }
            } catch (err) { }
        }
    };

    function createBoxElement(item, idx) {
        const box = document.createElement("div");
        let typeClass = "", typeLabel = (idx + 1).toString();

        if (item.type === 'video') { typeClass = "tag-video"; typeLabel = "🎞️ VID"; }
        else if (item.type === 'audio') { typeClass = "tag-audio"; typeLabel = "🎵 AUD"; }
        else if (item.type === 'photo') { typeClass = "tag-photo"; typeLabel = "📷 PHT"; }
        else if (item.type === 'scripture') { typeClass = "tag-scripture"; typeLabel = `AYAT ${item.verse}`; }
        else if (item.type === 'verse') { typeClass = "tag-verse"; typeLabel = "VERSE"; }
        else if (item.type === 'verse2') { typeClass = "tag-verse2"; typeLabel = "VERSE 2"; }
        else if (item.type === 'chorus') { typeClass = "tag-chorus"; typeLabel = "CHORUS"; }
        else if (item.type === 'chorus2') { typeClass = "tag-chorus2"; typeLabel = "CHORUS 2"; }
        else if (item.type === 'pre') { typeClass = "tag-pre"; typeLabel = "PRE-CH"; }
        else if (item.type === 'bridge') { typeClass = "tag-bridge"; typeLabel = "BRIDGE"; }
        else if (item.type === 'tag') { typeClass = "tag-tag"; typeLabel = "TAG"; }
        else if (item.type === 'presentation_slide') { typeClass = "tag-photo"; typeLabel = "📊 PPT"; }
        else if (item.type === 'remote_ppt_slide') { typeClass = "tag-photo"; typeLabel = "🌐 REMOTE"; }

        if (item.bg_name) {
            let shortName = item.bg_name.length > 12 ? item.bg_name.substring(0, 12) + ".." : item.bg_name;
            typeLabel = `${typeLabel} | ${shortName}`;
        }

        box.className = `lyric-box ${typeClass}`;
        box.id = `box-${idx}`;
        box.draggable = true;
        box.ondragstart = (e) => {
            e.dataTransfer.setData("text/plain", JSON.stringify({ action: "reorder_slide", index: idx }));
            box.style.opacity = "0.4";
        };
        box.ondragend = () => box.style.opacity = "1";

        let thumbHtml = "";
        if (item.bg_id) {
            let cat = item.bg_type || 'video';
            if (cat === 'audio') {
                thumbHtml = `<div class="grid-audio-layer">🎵</div>`;
            } else if (item.type === 'presentation_slide') {
                let thumbUrl = `/api/media/presentation/${item.bg_id}/slide/${item.slide_num}?thumb=true&t=${item.bg_id}`;
                thumbHtml = `<img src="${thumbUrl}" class="grid-thumb-layer" onerror="this.style.display='none'">`;
            } else if (item.type === 'remote_ppt_slide') {
                let baseUrl = currentSender.public_url && currentSender.public_url !== "None"
                    ? currentSender.public_url
                    : `http://${currentSender.ip}:${currentSender.ws_port}`;
                let thumbUrl = `${baseUrl}/thumbs/${item.thumb}?t=${Date.now()}`;
                thumbHtml = `<img src="${thumbUrl}" class="grid-thumb-layer" onerror="this.style.display='none'">`;
            } else {
                let thumbUrl = `/api/media/thumb/${cat}/${item.bg_id}`;
                if (window.freshThumbs && window.freshThumbs.has(item.bg_id)) {
                    thumbUrl += `?t=${Date.now()}`;
                }
                thumbHtml = `<img src="${thumbUrl}" data-thumb-id="${item.bg_id}" class="grid-thumb-layer" style="transition: opacity 0.3s ease-in-out;" onerror="this.style.display='none'">`;
            }
        }

        const isStandalone = ['video', 'audio', 'photo', 'presentation_slide'].includes(item.type);
        if (isStandalone) {
            let badgeClass = item.type === 'video' ? 'badge-video' : (item.type === 'audio' ? 'badge-audio' : 'badge-photo');
            box.innerHTML = `
                ${thumbHtml}
                <div class="tag-badge badge-standalone ${badgeClass}">${typeLabel}</div>
            `;
        } else {
            let preview = item.text;
            if (currentGridMode === 'box') {
                preview = item.text.length > 35 ? item.text.substring(0, 35) + "..." : item.text;
            }
            let safeText = document.createElement('div'); safeText.textContent = preview;
            // Store the full (untruncated) text for live switching
            const safeFullText = document.createElement('div'); safeFullText.textContent = item.text;

            let inlineClearBtn = "";
            if (item.type === 'scripture') {
                inlineClearBtn = `<button class="btn-inline-clear" onclick="event.stopPropagation(); clearScriptureLive();" title="Matikan Ayat">✖ CLEAR</button>`;
            }

            const escapedFullText = safeFullText.innerHTML.replace(/"/g, '&quot;');

            let displayText = safeText.innerHTML;
            if (currentGridMode === 'row') {
                displayText = displayText.replace(/\r?\n/g, '<br>');
            }

            box.innerHTML = `
                ${thumbHtml}
                ${inlineClearBtn}
                <div class="tag-badge">${typeLabel}</div>
                <div class="grid-lyric-text" data-full-text="${escapedFullText}">${displayText}</div>
            `;
        }

        box.onclick = () => {
            const isScreenCleared = !isShowing || clearStates.lyrics;
            if (isScreenCleared) {
                fireLyric(idx, false);
            } else {
                fireLyric(idx, true);
            }
        };
        box.oncontextmenu = (e) => showGridContextMenu(e, idx);

        let cachedRect = null;
        box.ondragenter = (e) => {
            cachedRect = box.getBoundingClientRect();
        };

        box.ondragover = (e) => {
            e.preventDefault();
            if (!cachedRect) cachedRect = box.getBoundingClientRect();
            const isLeftEdge = (e.clientX - cachedRect.left) < (cachedRect.width / 4);
            const isRightEdge = (e.clientX - cachedRect.left) > (cachedRect.width * 0.75);

            box.classList.remove("drag-insert-left", "drag-insert-right", "drag-insert-center");
            if (isLeftEdge) box.classList.add("drag-insert-left");
            else if (isRightEdge) box.classList.add("drag-insert-right");
            else box.classList.add("drag-insert-center");
        };

        box.ondragleave = (e) => {
            cachedRect = null;
            box.classList.remove("drag-insert-left", "drag-insert-right", "drag-insert-center");
        };

        box.ondrop = (e) => {
            cachedRect = null;
            box.classList.remove("drag-insert-left", "drag-insert-right", "drag-insert-center");
            handleSlideDrop(e, idx);
        };

        return box;
    }

    if (currentGridGrouping && lyricsData.length > 0) {
        let groups = [];
        let currentGroup = null;
        let activeType = 'normal';
        let activeVerse = null;
        const groupableTypes = ['verse', 'verse2', 'pre', 'chorus', 'chorus2', 'bridge', 'scripture', 'video', 'audio', 'photo', 'presentation_slide', 'remote_ppt_slide'];

        lyricsData.forEach((item, idx) => {
            const isGroupable = groupableTypes.includes(item.type);

            const isGroupStart = (
                idx === 0 ||
                (isGroupable && item.type !== activeType)
            );

            if (isGroupStart) {
                activeType = isGroupable ? item.type : 'normal';
                activeVerse = isGroupable && item.type === 'scripture' ? item.verse : null;
                currentGroup = {
                    type: activeType,
                    verse: activeVerse,
                    items: []
                };
                groups.push(currentGroup);
            }
            currentGroup.items.push({ item, idx });
        });

        groups.forEach(group => {
            const groupBox = document.createElement("div");
            groupBox.className = "grid-group";

            let groupColor = "#888888";
            let groupTitleText = "LYRICS";

            if (group.type === 'verse') { groupColor = "#06b6d4"; groupTitleText = "VERSE 1"; }
            else if (group.type === 'verse2') { groupColor = "#8b5cf6"; groupTitleText = "VERSE 2"; }
            else if (group.type === 'pre') { groupColor = "#f59e0b"; groupTitleText = "PRE-CHORUS"; }
            else if (group.type === 'chorus') { groupColor = "#ef4444"; groupTitleText = "CHORUS 1"; }
            else if (group.type === 'chorus2') { groupColor = "#ec4899"; groupTitleText = "CHORUS 2"; }
            else if (group.type === 'bridge') { groupColor = "#10b981"; groupTitleText = "BRIDGE"; }
            else if (group.type === 'tag') { groupColor = "#f97316"; groupTitleText = "TAG"; }
            else if (group.type === 'video') { groupColor = "#00e5ff"; groupTitleText = "VIDEO"; }
            else if (group.type === 'audio') { groupColor = "#ffaa00"; groupTitleText = "AUDIO"; }
            else if (group.type === 'photo') { groupColor = "#ff00aa"; groupTitleText = "PHOTO"; }
            else if (group.type === 'presentation_slide') { groupColor = "#ff00aa"; groupTitleText = "PRESENTATION"; }
            else if (group.type === 'remote_ppt_slide') { groupColor = "#ff00aa"; groupTitleText = "REMOTE PPT"; }
            else if (group.type === 'scripture') { groupColor = "#10b981"; groupTitleText = `SCRIPTURE (AYAT ${group.verse || ''})`; }

            groupBox.style.setProperty("--group-color", groupColor);

            if (group.type !== 'normal') {
                const groupHeader = document.createElement("div");
                groupHeader.className = "grid-group-header";
                groupHeader.innerText = groupTitleText;
                groupBox.appendChild(groupHeader);
            }

            const groupContent = document.createElement("div");
            groupContent.className = "grid-group-content";

            group.items.forEach(({ item, idx }) => {
                const box = createBoxElement(item, idx);
                groupContent.appendChild(box);
            });

            groupBox.appendChild(groupContent);
            container.appendChild(groupBox);
        });
    } else {
        lyricsData.forEach((item, idx) => {
            const box = createBoxElement(item, idx);
            container.appendChild(box);
        });
    }

    if (currentIndex >= 0 && isShowing) highlightBox(currentIndex);
}

// 🎯 FUNGSI BARU: Khusus mematikan Scripture tanpa menyentuh tombol Clear Lyrics Global
window.clearScriptureLive = function () {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "update_scripture", payload: { show_display: false, show_lt: false } }));
    }
    // Hapus status LIVE dari ayat (hilangkan tombol ✖ DISABLE), status selected tetap aman
    document.querySelectorAll(".scr-verse-box.scr-verse-active").forEach(b => b.classList.remove("scr-verse-active"));
};

async function loadLibrary() {
    const response = await fetch("/songs");
    const songs = await response.json();
    const list = document.getElementById("song-list");
    list.innerHTML = "";

    songs.forEach(song => {
        const li = document.createElement("li");
        li.className = "song-item";
        li.onclick = () => loadSong(song);

        // Tombol Delete Kecil di kanan
        li.innerHTML = `
                    <span>${song.replace('.json', '')}</span>
                    <span class="delete-btn" onclick="deleteSong(event, '${song}')">🗑️</span>
                `;
        list.appendChild(li);
    });
}
async function quickEdit(idx) {
    const oldText = lyricsData[idx].text;
    const newText = await showCustomDialog("prompt", "Quick Edit Lyric:", oldText);

    // Cek user klik Cancel atau OK
    if (newText !== null) {
        // 1. LOGIC HAPUS (Jika teks kosong)
        if (newText.trim() === "") {
            const isOk = await showCustomDialog("confirm", "Delete this lyric slide?");
            if (isOk) {
                // Hapus dari array data
                lyricsData.splice(idx, 1);

                // Kalau slide yang dihapus lagi tayang, matikan layar (Clear)
                if (idx === currentIndex && isShowing) {
                    toggleClear();
                }

                // Reset current index biar aman
                if (idx === currentIndex) currentIndex = -1;
                // Kalau index yang dihapus di atas current, geser current mundur 1
                else if (idx < currentIndex) currentIndex--;

                renderGrid();
                markSongUnsaved();
                // Update text area sumber biar sinkron
                document.getElementById("raw-input").value = lyricsData.map(d => d.text).join("\n");
            }
        }
        // 2. LOGIC UPDATE (Jika teks diubah tapi tidak kosong)
        else if (newText !== oldText) {
            lyricsData[idx].text = newText;
            renderGrid();
            // Update layar live kalau slide ini lagi tayang
            if (idx === currentIndex && isShowing) sendUpdate(newText);
            document.getElementById("raw-input").value = lyricsData.map(d => d.text).join("\n");
            markSongUnsaved();
        }
    }
}

window.lastTriggeredBehavior = "loop"; // Tambahan memori
window.currentlyPlayingBg = null;
window.currentBgBehavior = null; // Tambahan memori

window.currentVisId = null; window.currentVisType = null;
window.currentAudId = null; window.currentSlideNum = null;

function fireLyric(idx, forceShow = false) {
    if (typeof setNavigationTarget === 'function') setNavigationTarget('lyrics');
    currentIndex = idx;
    const currentSlide = lyricsData[idx] || {};
    const currentSlideBgType = currentSlide.bg_type || (['video', 'audio', 'photo'].includes(currentSlide.type) ? currentSlide.type : (currentSlide.bg_id ? 'video' : null));
    const shouldReplayAssignedVideo = !!currentSlide.bg_id && currentSlideBgType === 'video';

    let wasCleared = (!isShowing || clearStates.video || clearStates.photo || clearStates.presentation || clearStates.audio);

    // Track if we need to clear presentation before destroying cache memory
    const isPPT = lyricsData[idx] && lyricsData[idx].type === 'presentation_slide';
    const needClearPPT = (window.currentVisType === 'presentation_slide') && !isPPT;

    // 🚨 HANCURKAN CACHE MEMORI! 🚨
    // Hancurkan cache jika slide memiliki MEDIA spesifik, baik saat diklik (forceShow=true) 
    // ATAUPUN saat dinavigasi pakai keyboard next/prev (forceShow=false).
    if (wasCleared || (lyricsData[idx] && lyricsData[idx].bg_id)) {
        window.currentVisId = null;
        window.currentVisType = null;
        window.currentAudId = null;
        window.currentSlideNum = null;
    }

    // 🎯 FIX 1: FORCE SHOW SAPU JAGAT
    if (forceShow) {
        // 1. Buka gembok global (Blackout / Clear Lyrics)
        isShowing = true;
        isVideoCleared = false;
        if (typeof updateClearButtonsUI === "function") updateClearButtonsUI();

        // 2. Buka gembok tombol kecil ProPresenter
        clearStates.lyrics = false;
        clearStates.video = false;
        clearStates.photo = false;
        clearStates.presentation = false;

        // 4. Nyalakan ulang indikator tombol Clear kecil di UI Controller
        ['lyrics', 'video', 'photo', 'presentation'].forEach(layer => {
            const btn = document.getElementById('btn-clr-' + layer);
            if (btn) btn.classList.remove('btn-clr-dim');
        });
    }

    highlightBox(idx);

    // 1. CEK APAKAH INI SLIDE PPT
    // (isPPT already computed above)

    // 2. CARI MEDIA BACKGROUND (VIDEO/FOTO/AUDIO) MUNDUR KE ATAS
    let activeVisId = null, activeVisType = null, activeVisBehav = "loop", activeVisName = null;
    let activeAudId = null, activeAudBehav = "loop";

    for (let i = idx; i >= 0; i--) {
        let s = lyricsData[i];
        if (s.bg_id) {
            let type = s.bg_type || 'video';
            if ((type === 'video' || type === 'photo') && !activeVisId) {
                activeVisId = s.bg_id; activeVisType = type; activeVisBehav = s.bg_behavior || "loop"; activeVisName = s.bg_name || "";
            }
            if (type === 'audio' && !activeAudId) {
                activeAudId = s.bg_id; activeAudBehav = s.bg_behavior || "loop";
            }
        }

        // 🚀 OPTIMASI REM DARURAT: Kalau Visual & Audio udah dapet, berhenti nyari ke atas!
        if (activeVisId && activeAudId) break;
    }

    // 3. 🎯 TEMBAK VISUAL (PPT vs VIDEO/FOTO)
    if (typeof checkAndClearLiveMediaController === 'function') {
        checkAndClearLiveMediaController(!!activeVisId || isPPT);
    }
    if (lyricsData[idx] && lyricsData[idx].type === 'remote_ppt_slide') {
        const p = lyricsData[idx];
        if (senderWs && senderWs.readyState === WebSocket.OPEN) {
            senderWs.send(JSON.stringify({ action: "goto_slide", index: p.slide_num }));
        }
        return;
    }

    if (isPPT) {
        let p = lyricsData[idx];
        if (window.currentVisId !== p.bg_id || window.currentSlideNum !== p.slide_num) {
            window.currentVisId = p.bg_id;
            window.currentVisType = 'presentation_slide';
            window.currentSlideNum = p.slide_num;

            if (!clearStates.presentation) {
                ws.send(JSON.stringify({ action: "update_presentation", payload: { url: `/api/media/presentation/${p.bg_id}/slide/${p.slide_num}`, name: p.bg_name || "" } }));
            }

            // Matikan visual lain biar PPT ga ketutupan
            window.activeSenderMedia = window.activeSenderMedia || { video: false, photo: false, audio: false };
            window.activeSenderMedia.video = false;
            window.activeSenderMedia.photo = false;
            if (typeof window.resetExternalFtb === 'function') window.resetExternalFtb();
            if (window.masterBgAudio && !window.masterBgAudio.paused) {
                window.masterBgAudio.pause();
            }
            if (!window.activeLibraryPlayers?.video) ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
            if (!window.activeLibraryPlayers?.photo) ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } }));
        }
    } else {
        // Matikan PPT karena slide ini bukan PPT
        if (needClearPPT || window.currentVisType === 'presentation_slide') {
            ws.send(JSON.stringify({ action: "update_presentation", payload: { url: "" } }));
            window.currentSlideNum = null;
            window.currentVisType = null;
        }

        // --- LOGIKA VIDEO & PHOTO BIASA ---
        if (activeVisType === 'video') {
            if (window.currentVisId !== activeVisId || window.currentVisType !== activeVisType) {
                window.currentVisId = activeVisId; window.currentVisType = activeVisType;
                window.currentSongHasLocalBg = true;
                window.activeSenderMedia = window.activeSenderMedia || { video: false, photo: false, audio: false };
                window.activeSenderMedia.video = false;
                window.activeSenderMedia.photo = false;
                if (typeof window.resetExternalFtb === 'function') window.resetExternalFtb();
                if (window.masterBgAudio && !window.masterBgAudio.paused) {
                    window.masterBgAudio.pause();
                }

                // 🎯 CATAT INGATAN: Simpan antrean video biar toggleBlackout tau harus nge-play apa nanti
                window.lastTriggeredBg = activeVisId;
                window.lastTriggeredBehavior = activeVisBehav;
                if (!window.activeLibraryPlayers?.video) window._localBgVolume = 1.0;
                if (typeof window.markLocalMediaTookOver === 'function') window.markLocalMediaTookOver('video');

                // 🎯 STEALTH FIX: Jangan berani-berani nembak video kalau layar lagi di-BLACKOUT (!isVideoCleared)
                if (!clearStates.video && !isVideoCleared && !window.activeLibraryPlayers?.video) {
                    const videoUrl = `/api/stream_video/${activeVisId}`;
                    ws.send(JSON.stringify({
                        action: "update_background",
                        payload: {
                            url: videoUrl,
                            behavior: activeVisBehav,
                            muted: true, // [FIX] Display selalu muted — audio diputar masterBgAudio di control.html
                            name: activeVisName,
                            forceReplay: shouldReplayAssignedVideo
                        }
                    }));
                    if (shouldReplayAssignedVideo) {
                        ws.send(JSON.stringify({
                            action: "bg_control",
                            payload: { target: "video", command: "replay", url: videoUrl }
                        }));
                    }
                }
                if (!window.activeLibraryPlayers?.photo) ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } }));
            }
        } else if (activeVisType === 'photo') {
            if (window.currentVisId !== activeVisId || window.currentVisType !== activeVisType) {
                window.currentVisId = activeVisId; window.currentVisType = activeVisType;
                window.currentSongHasLocalBg = true;
                window.activeSenderMedia = window.activeSenderMedia || { video: false, photo: false, audio: false };
                window.activeSenderMedia.video = false;
                window.activeSenderMedia.photo = false;
                if (typeof window.resetExternalFtb === 'function') window.resetExternalFtb();
                if (window.masterBgAudio && !window.masterBgAudio.paused) {
                    window.masterBgAudio.pause();
                }

                window.lastTriggeredBg = activeVisId; // Catat ingatan
                if (typeof window.markLocalMediaTookOver === 'function') window.markLocalMediaTookOver('photo');

                // 🎯 STEALTH FIX: Berlaku juga untuk Foto
                if (!clearStates.photo && !isVideoCleared && !window.activeLibraryPlayers?.photo) {
                    ws.send(JSON.stringify({ action: "update_photo", payload: { url: `/api/stream_photo/${activeVisId}`, name: activeVisName } }));
                }
                if (!window.activeLibraryPlayers?.video) ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
            }
        } else {
            // TIDAK ADA MEDIA LOKAL DI SLIDE INI
            window.currentVisId = null; window.currentVisType = null;
            // Jika Media Sender sedang aktif, JANGAN matikan background / photo!
            window.activeSenderMedia = window.activeSenderMedia || { video: false, photo: false, audio: false };
            if (!window.activeLibraryPlayers?.video && !window.activeSenderMedia.video) {
                ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
            }
            if (!window.activeLibraryPlayers?.photo && !window.activeSenderMedia.photo) {
                ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } }));
            }
        }
    }

    // 4. 🎯 TEMBAK AUDIO (Sistem Prioritas Library)
    if (window.currentAudId !== activeAudId) {
        window.currentAudId = activeAudId;
        if (activeAudId && !clearStates.audio && !window.activeLibraryPlayers?.audio) {
            window._localSfxVolume = 1.0;
            if (typeof window.markLocalMediaTookOver === 'function') window.markLocalMediaTookOver('audio');
        }
        // HANYA TEMBAK JIKA LIBRARY AUDIO TIDAK SEDANG PLAY
        if (!clearStates.audio && !window.activeLibraryPlayers?.audio) {
            ws.send(JSON.stringify({ action: "update_audio", payload: { url: activeAudId ? `/api/stream_audio/${activeAudId}` : "" } }));
        }
    }

    // 5. 🎯 TEMBAK LIRIK
    if (lyricsData[idx]) {
        let item = lyricsData[idx];

        if (isPPT) {
            sendUpdate("");
            // Matikan layar scripture kalau lagi main PPT
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: "update_scripture", payload: { show_display: false, show_lt: false } }));
            }
        }
        else if (item.type === 'scripture') {
            sendUpdate("");
            let isScreenCleared = !isShowing || clearStates.lyrics;

            // 🎯 BUG 5 FIX: Sinkronkan nomor ayat di UI saat ayat bergeser
            const verseInput = document.getElementById("bible-verse");
            if (verseInput) verseInput.value = item.verse;

            const targetLang = document.getElementById('scr-title-lang')?.value || 'id';
            const finalBookName = translateBookName(item.book, targetLang);

            const searchInput = document.getElementById("bible-search-input");
            if (searchInput) {
                searchInput.value = `${finalBookName} ${item.chapter}:${item.verse}`;
            }

            if (!isScreenCleared) {
                const showDisp = document.getElementById('scr-disp-enable')?.checked ?? true;
                const showLt = document.getElementById('scr-lt-enable')?.checked ?? true;

                const payload = {
                    show_display: showDisp, // Tembak flag khusus Display
                    show_lt: showLt,        // Tembak flag khusus LT
                    book: finalBookName,
                    chapter: item.chapter,
                    verse: item.verse,
                    text1: item.text1,
                    text2: item.text2,
                    v1_name: item.v1_name || "",
                    v2_name: item.v2_name || ""
                };

                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ action: "update_scripture", payload: payload }));
                }
            }
            // 🎯 BUG 3 FIX: Menghapus updateLoadedDisplay("scripture") yang bikin error misterius!
            if (typeof foldbackWS !== 'undefined' && foldbackWS && foldbackWS.readyState === WebSocket.OPEN) {
                foldbackWS.send(JSON.stringify({ action: "update_foldback_lyric", payload: { type: 'scripture', text1: item.text1, text2: item.text2, reference: `${item.book} ${item.chapter}:${item.verse}` } }));
            }
        }
        else {
            // 🎯 JALUR B: LIRIK NORMAL (Kembali ke versi stabil)
            // Matikan layar scripture (scripture.html) karena kita mau nampilin lirik
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: "update_scripture", payload: { show_display: false, show_lt: false } }));
            }

            // Tembak lirik normal ke display.html
            if (clearStates.lyrics || !isShowing) {
                sendUpdate("");
            } else {
                sendUpdate(item.text);
            }
        }
    }
}


function highlightBox(idx) { document.querySelectorAll(".lyric-box").forEach(b => { b.classList.remove("live-active"); b.classList.remove("selected"); }); const el = document.getElementById(`box-${idx}`); if (el) { el.classList.add("live-active"); el.classList.add("selected"); el.scrollIntoView({ behavior: "smooth", block: "center" }); } }

function assignLabel(idx, type) {
    if (idx >= 0 && idx < lyricsData.length) {
        // 🎯 GEMBOK: Tolak mentah-mentah kalau ini slide standalone!
        const isStandalone = ['video', 'audio', 'photo'].includes(lyricsData[idx].type);
        if (isStandalone) return;

        lyricsData[idx].type = type;
        renderGrid();
        const el = document.getElementById(`box-${idx}`);
        if (el) el.classList.add("selected");
        markSongUnsaved();
    }
}

function jumpToType(type) {
    let targetIdx = -1;

    // 🎯 SMART REVEAL LOGIC: 
    // Kalau layar lagi Blackout/Clear, dan VJ kebetulan lagi menyorot kotak slide dengan tipe yang sama,
    // maka tombol V/C/B/P HANYA menyalakan (un-clear) slide tersebut tanpa melompat ke slide lain!
    const isScreenCleared = !isShowing || clearStates.lyrics || isVideoCleared;

    if (isScreenCleared && currentIndex >= 0 && lyricsData[currentIndex] && lyricsData[currentIndex].type === type) {
        targetIdx = currentIndex;
    } else {
        // Normal Jump Logic (Cari ke depan, kalau mentok balik ke awal)
        for (let i = currentIndex + 1; i < lyricsData.length; i++) { if (lyricsData[i].type === type) { targetIdx = i; break; } }
        if (targetIdx === -1) { for (let i = 0; i <= currentIndex; i++) { if (lyricsData[i].type === type) { targetIdx = i; break; } } }
    }

    if (targetIdx !== -1) fireLyric(targetIdx, true); // Jump selalu Force Show
}
// 🚀 OPTIMASI: Variabel rem tangan untuk WebSocket
let wsThrottleTimer = null;
let wsThrottlePayload = null;

// ==========================================
// 🎛️ MESIN CLEAR SCREEN (LYRICS, VIDEO, BLACKOUT)
// ==========================================
let isVideoCleared = false;

function updateClearButtonsUI() {
    const btnLy = document.getElementById("btn-clear-lyrics");
    const btnVid = document.getElementById("btn-clear-video");
    const btnBlk = document.getElementById("btn-clear-black");
    if (!btnLy || !btnVid || !btnBlk) return;

    // 1. LYRICS BUTTON (Kedip kalau teks disembunyikan)
    if (!isShowing) {
        btnLy.classList.add("btn-red", "btn-flash-active");
        btnLy.style.opacity = "1";
    } else {
        btnLy.classList.remove("btn-red", "btn-flash-active");
        btnLy.style.background = "#444"; btnLy.style.opacity = "0.8";
    }

    // 2. VIDEO BUTTON (Kedip kalau video disembunyikan)
    if (isVideoCleared) {
        btnVid.classList.add("btn-red", "btn-flash-active");
        btnVid.style.opacity = "1";
    } else {
        btnVid.classList.remove("btn-red", "btn-flash-active");
        btnVid.style.background = "#444"; btnVid.style.opacity = "0.8";
    }

    // 3. BLACKOUT BUTTON (Kedip kalau DUA-DUANYA mati)
    if (!isShowing && isVideoCleared) {
        btnBlk.classList.add("btn-red", "btn-flash-active");
        btnBlk.style.opacity = "1";
    } else {
        btnBlk.classList.remove("btn-red", "btn-flash-active");
        btnBlk.style.background = "#444"; btnBlk.style.opacity = "0.8";
    }
}

function toggleLyricsOnly() {
    isShowing = !isShowing;
    updateClearButtonsUI();
    if (isShowing) {
        if (currentIndex >= 0 && lyricsData[currentIndex]) {
            sendUpdate(lyricsData[currentIndex].text);
            highlightBox(currentIndex);
        } else {
            sendUpdate("");
        }
    } else {
        sendUpdate("");
        document.querySelectorAll(".lyric-box").forEach(b => b.classList.remove("live-active"));
    }
}

function toggleVideoOnly() {
    isVideoCleared = !isVideoCleared;
    updateClearButtonsUI();

    if (isVideoCleared) {
        window.currentlyPlayingBg = null;
        window.currentBgBehavior = null; // Reset memori
        ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
    } else {
        window.currentlyPlayingBg = window.lastTriggeredBg;
        window.currentBgBehavior = window.lastTriggeredBehavior;
        const url = window.lastTriggeredBg ? `/api/stream_video/${window.lastTriggeredBg}` : "";
        ws.send(JSON.stringify({
            action: "update_background",
            payload: { url: url, behavior: window.lastTriggeredBehavior || "loop", muted: true } // [FIX] Display muted
        }));
    }

    // UDAH GINI DOANG. GAK USAH ADA SHOWTOAST LAGI BIAR INSTAN!
}

function toggleBlackout() {
    const isAllCleared = (!isShowing && isVideoCleared);

    if (isAllCleared) {
        isShowing = true; isVideoCleared = false; // Restore Semua
    } else {
        isShowing = false; isVideoCleared = true; // Matikan Semua
    }

    updateClearButtonsUI();

    // Tembak Lirik
    if (isShowing) {
        if (currentIndex >= 0 && lyricsData[currentIndex]) {
            sendUpdate(lyricsData[currentIndex].text);
            highlightBox(currentIndex);
        } else { sendUpdate(""); }
    } else {
        sendUpdate("");
        document.querySelectorAll(".lyric-box").forEach(b => b.classList.remove("live-active"));
    }

    // Tembak Video
    if (isVideoCleared) {
        window.currentlyPlayingBg = null;
        ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
    } else {
        window.currentlyPlayingBg = window.lastTriggeredBg;
        const url = window.lastTriggeredBg ? `/api/stream_video/${window.lastTriggeredBg}` : "";
        ws.send(JSON.stringify({ action: "update_background", payload: { url: url, muted: true } })); // [FIX] Display muted
    }
}

function updateSettings() {
    markSongUnsaved();
    const currentFont = document.getElementById("font-select").value || 'Cinzel';
    injectFont(currentFont);

    // 1. AMBIL SEMUA DATA PAKE HELPER
    const payload = getDisplayConfigFromUI();
    payload.show = isShowing;

    // 2. TEMBAK KE LAYAR PAKE THROTTLER DENGAN TRAILING EDGE (ANTI-DDOS & ANTI-LOST)
    if (wsThrottleTimer) {
        wsThrottlePayload = payload;
    } else {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "update_display", payload: payload }));
        }

        const runThrottle = () => {
            wsThrottleTimer = setTimeout(() => {
                if (wsThrottlePayload) {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ action: "update_display", payload: wsThrottlePayload }));
                    }
                    wsThrottlePayload = null;
                    runThrottle();
                } else {
                    wsThrottleTimer = null;
                }
            }, 150);
        };
        runThrottle();
    }

    // 3. SIMPAN SETTINGAN BILINGUAL (termasuk B/I/U dan font)
    const subPayload = {
        color: payload.sub_color,
        size: payload.sub_size,
        bold: payload.sub_bold,
        italic: payload.sub_italic,
        underline: payload.sub_underline,
        font: payload.sub_font
    };
    fetch('/api/global_sub_settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subPayload)
    });
}

function sendUpdate(textOverride) {
    let nextTextVal = "";
    if (lyricsData.length > 0 && currentIndex >= 0 && currentIndex < lyricsData.length - 1) {
        nextTextVal = lyricsData[currentIndex + 1].text.substring(0, 50) + "..."; // Ambil 50 huruf aja
    } else {
        // Cari lagu berikutnya di scheduleList jika lagu sudah di posisi slide terakhir
        let nextSongTitle = "";
        if (typeof scheduleList !== 'undefined' && scheduleList && scheduleList.length > 0) {
            let currentSchedIdx = -1;
            if (typeof window.activeScheduleIndex === 'number' && window.activeScheduleIndex >= 0 && window.activeScheduleIndex < scheduleList.length) {
                const activeItem = scheduleList[window.activeScheduleIndex];
                const activeTitle = typeof activeItem === 'string' ? activeItem : (activeItem.title || activeItem.name || "");
                if (activeTitle === currentSongTitle) {
                    currentSchedIdx = window.activeScheduleIndex;
                }
            }
            if (currentSchedIdx === -1 && currentSongTitle) {
                currentSchedIdx = scheduleList.findIndex(item => {
                    const t = typeof item === 'string' ? item : (item.title || item.name || "");
                    return t === currentSongTitle;
                });
            }
            if (currentSchedIdx !== -1 && currentSchedIdx < scheduleList.length - 1) {
                const nextItem = scheduleList[currentSchedIdx + 1];
                nextSongTitle = typeof nextItem === 'string' ? nextItem : (nextItem.title || nextItem.name || "");
            }
        }

        if (nextSongTitle) {
            nextTextVal = "NEXT: " + nextSongTitle;
        } else {
            nextTextVal = "(End of Song)";
        }
    }

    // AMBIL SEMUA DATA CONFIG DARI UI
    const payload = getDisplayConfigFromUI();
    payload.show = isShowing;
    payload.next_text = nextTextVal;

    if (textOverride !== null && textOverride !== undefined) {
        payload.text = textOverride;
    } else {
        const activeSlide = document.querySelector(".lyric-box.live-active");
        const txt = activeSlide ? lyricsData[currentIndex].text : "";
        payload.text = txt;
    }
    ws.send(JSON.stringify({ action: "update_display", payload: payload }));
}
// TANGKAP SHORTCUT KEYBOARD BARU (DYNAMIC CONFIG)
document.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement.tagName;
    if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

    // 1. Emergency Clears
    if (matchShortcut(e, 'clear_lyrics')) { e.preventDefault(); clearLayer('lyrics'); return; }
    if (matchShortcut(e, 'clear_video')) { e.preventDefault(); clearLayer('video'); return; }
    if (matchShortcut(e, 'clear_audio')) { e.preventDefault(); clearLayer('audio'); return; }
    if (matchShortcut(e, 'clear_photo')) { e.preventDefault(); clearLayer('photo'); return; }
    if (matchShortcut(e, 'clear_presentation')) { e.preventDefault(); clearLayer('presentation'); return; }

    // 🎯 SCRIPTURE KEYBOARD NAVIGATION (EXCLUSIVE)
    if (typeof isScriptureNavActive === 'function' && isScriptureNavActive()) {
        if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.code === "Space") {
            e.preventDefault();
            navigateScripture('next');
            return;
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            navigateScripture('prev');
            return;
        }
        // Nonaktifkan jump shortcut dan angka 1-9 lirik saat scripture aktif
        return;
    }

    // 2. Jump Live Shortcuts
    if (matchShortcut(e, 'jump_verse')) { e.preventDefault(); jumpToType('verse'); return; }
    if (matchShortcut(e, 'jump_verse2')) { e.preventDefault(); jumpToType('verse2'); return; }
    if (matchShortcut(e, 'jump_pre')) { e.preventDefault(); jumpToType('pre'); return; }
    if (matchShortcut(e, 'jump_chorus')) { e.preventDefault(); jumpToType('chorus'); return; }
    if (matchShortcut(e, 'jump_chorus2')) { e.preventDefault(); jumpToType('chorus2'); return; }
    if (matchShortcut(e, 'jump_bridge')) { e.preventDefault(); jumpToType('bridge'); return; }
    if (matchShortcut(e, 'jump_tag')) { e.preventDefault(); jumpToType('tag'); return; }

    // 3. Assign Label Shortcuts (Gak ngaruh ke layar)
    if (currentIndex >= 0 && lyricsData[currentIndex]) {
        // CEGAH JIKA INI MEDIA SLIDE, PPT, ATAU SCRIPTURE
        const isMedia = ['video', 'audio', 'photo', 'presentation_slide', 'scripture'].includes(lyricsData[currentIndex].type);

        let targetType = null;
        let isAssignAction = false;

        if (matchShortcut(e, 'assign_verse')) { targetType = 'verse'; isAssignAction = true; }
        else if (matchShortcut(e, 'assign_verse2')) { targetType = 'verse2'; isAssignAction = true; }
        else if (matchShortcut(e, 'assign_pre')) { targetType = 'pre'; isAssignAction = true; }
        else if (matchShortcut(e, 'assign_chorus')) { targetType = 'chorus'; isAssignAction = true; }
        else if (matchShortcut(e, 'assign_chorus2')) { targetType = 'chorus2'; isAssignAction = true; }
        else if (matchShortcut(e, 'assign_bridge')) { targetType = 'bridge'; isAssignAction = true; }
        else if (matchShortcut(e, 'assign_tag')) { targetType = 'tag'; isAssignAction = true; }
        else if (matchShortcut(e, 'assign_unassign')) { targetType = 'normal'; isAssignAction = true; }

        if (isAssignAction) {
            e.preventDefault();
            if (isMedia) {
                showToast("Media slides/PPT/Scripture cannot be labeled!", "error", 2000);
                return;
            }
            if (targetType === 'normal') {
                delete lyricsData[currentIndex].type;
            } else {
                lyricsData[currentIndex].type = targetType;
            }
            renderGrid();
            markSongUnsaved();
            return;
        }
    }

    // 4. Default Navigation & Numbers
    if (!e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const key = e.key.toUpperCase();

        // PPT REMOTE MODE: Arrow keys control slide navigation
        if (pptRemoteMode) {
            if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.code === "Space") {
                e.preventDefault();
                sendRemotePPTAction('next_slide');
                return;
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
                e.preventDefault();
                sendRemotePPTAction('prev_slide');
                return;
            }
        }

        // B. NUMBER SHORTCUTS -> FORCE SHOW = TRUE (Darurat)
        if (key >= '1' && key <= '9') {
            const idx = parseInt(key) - 1;
            if (idx < lyricsData.length) fireLyric(idx, true);
        }

        // C. ARROW KEYS -> FORCE SHOW = FALSE (Cuma geser kursor)
        if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.code === "Space") {
            e.preventDefault();
            if (currentIndex < lyricsData.length - 1) fireLyric(currentIndex + 1, false); // Gak maksa nyala
        }
        if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
            e.preventDefault();
            if (currentIndex > 0) fireLyric(currentIndex - 1, false); // Gak maksa nyala
        }
    }
});
// --- TEXT FORMATTER ---
function openAddSongModal() {
    document.getElementById("new-song-title").value = "";
    editorSlides = [{ text: "", type: "normal" }];
    editorHistory = [];
    renderEditor("add");
    enterModalIframeMode('add-song-modal', () => {
        document.getElementById("add-song-modal").style.display = "flex";
        setTimeout(() => { const el = document.getElementById("add-input-0"); if (el) el.focus(); }, 100);
    });
}

function formatNewSongText() {
    const input = document.getElementById("new-song-text");
    if (!input.value) return;
    let text = input.value;
    text = text.toUpperCase();
    text = text.replace(/[.,]/g, "");
    text = text.replace(/  +/g, ' ');
    input.value = text;
}

async function saveAndLoadNewSong() {
    if (currentActiveTab === 'scripture') return;
    const title = document.getElementById("new-song-title").value.trim();
    if (!title) { showToast("Title is required!", "error", 3000); return; }

    let newData = [];
    let idCounter = 0;
    editorSlides.forEach(slide => {
        const isStandalone = ['video', 'audio', 'photo'].includes(slide.type);

        if (slide.text.trim() !== "" || isStandalone) {
            newData.push({
                id: idCounter++,
                text: slide.text.trim(),
                type: slide.type,
                bg_id: slide.bg_id,
                bg_type: slide.bg_type,
                bg_behavior: slide.bg_behavior,
                bg_name: slide.bg_name           // 🎯 PASTIKAN INI MASUK!
            });
        }
    });

    if (newData.length === 0) { showToast("No valid lyrics in editor.", "error", 3000); return; }

    let finalCustomSettings = currentSongCustomSettings;
    if (document.getElementById("current-disp-mode").value === 'custom') {
        finalCustomSettings = getDisplayConfigFromUI();
    }

    const currentSettings = {
        mode: document.getElementById("current-disp-mode").value,
        preset_name: document.getElementById("song-preset-select").value,
        custom: finalCustomSettings
    };
    const payload = { title: title, data: newData, settings: currentSettings };

    // 🚀 MUNCULIN LOADING
    showToast("Saving new song...", "loading");

    const res = await fetch('/api/songs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (res.ok) {
        currentSongTitle = title;
        lyricsData = newData;
        renderGrid();

        // Cache cleaned search fields for the newly added song
        payload.cleanTitle = cleanText(payload.title);
        payload.cleanLyrics = payload.data ? payload.data.map(slide => cleanText(slide.text)).join(" ") : "";
        allSongs.push(payload);
        allSongs.sort((a, b) => a.title.localeCompare(b.title));
        renderLibrary(allSongs);

        isFormDirty = false;
        closeAddSongModal();

        // 🚀 UBAH JADI SUCCESS
        showToast(`Song "${title}" added!`, "success", 2500);
    } else {
        showToast("Failed to save song.", "error", 3000);
    }
}


// ==========================================
// --- IFRAME LIFECYCLE (control preview vs modal) ---
// ==========================================
const IFRAME_MANAGED_MODALS = new Set([
    'text-edit-modal',
    'alert-modal',
    'lt-modal',
    'fb-modal',
    'scripture-settings-modal',
    'add-song-modal',
    'full-edit-modal'
]);

const MODAL_OUTPUT_PREVIEW_IDS = new Set(['alert-modal', 'lt-modal', 'fb-modal']);

let activeIframeModalId = null;

function destroyIframeEl(iframe) {
    if (!iframe) return;
    try {
        iframe.contentWindow?.stop?.();
    } catch (e) { /* cross-origin */ }
    iframe.removeAttribute('src');
    iframe.src = 'about:blank';
    iframe.style.display = 'none';
    iframe.className = 'obsolete-iframe';
    iframe.removeAttribute('id');
    iframe.remove();
}

function clearIframeContainer(container) {
    if (!container) return;
    container.querySelectorAll('iframe').forEach(iframe => {
        try {
            iframe.contentWindow?.stop?.();
        } catch (e) { }
        iframe.removeAttribute('src');
        iframe.src = 'about:blank';
        iframe.remove();
    });
    while (container.firstChild) {
        container.removeChild(container.firstChild);
    }
}

function createControlIframe(src, id, className) {
    const iframe = document.createElement('iframe');
    if (id) iframe.id = id;
    if (className) iframe.className = className;
    iframe.setAttribute('scrolling', 'no');
    const sep = src.includes('?') ? '&' : '?';
    iframe.src = `${src}${sep}_t=${Date.now()}`;
    return iframe;
}

function suspendMainPreview() {
    // [USER REQUEST] Tidak perlu pause/freeze preview saat modal dibuka
    // Do nothing so preview stays active
}

let currentPreviewMode = 'main';

async function restoreMainPreview() {
    const wrapper = document.getElementById('preview-wrapper');
    if (!wrapper) return;

    // Destroy existing preview frame if it exists to prevent leak
    const existingFrame = document.getElementById('preview-frame');
    if (existingFrame) {
        destroyIframeEl(existingFrame);
    }
    clearIframeContainer(wrapper);

    // Load from settings JSON
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const settings = await res.json();
            if (settings.last_preview_mode) {
                currentPreviewMode = settings.last_preview_mode;
            }
        }
    } catch (e) {
        console.warn("Failed to load preview settings:", e);
    }

    // Update dropdown selection
    const select = document.getElementById('preview-mode-select');
    if (select) {
        select.value = currentPreviewMode;
    }

    // Determine path
    let src = '/display';
    if (currentPreviewMode === 'lt') {
        src = '/lowerthird';
    } else if (currentPreviewMode === 'fb') {
        src = '/foldback';
    }

    wrapper.classList.remove('preview-suspended');
    const iframe = createControlIframe(src, 'preview-frame', 'preview-frame');
    wrapper.appendChild(iframe);
    requestAnimationFrame(() => resizePreview());
}

async function changePreviewMode() {
    const select = document.getElementById('preview-mode-select');
    if (!select) return;
    const mode = select.value;
    if (mode === currentPreviewMode) return;

    currentPreviewMode = mode;

    // Destroy previous iframe to prevent RAM/GPU leaks
    const wrapper = document.getElementById('preview-wrapper');
    if (wrapper) {
        const existingFrame = document.getElementById('preview-frame');
        if (existingFrame) {
            destroyIframeEl(existingFrame);
        }
        clearIframeContainer(wrapper);

        // Load new iframe ONLY when selected (no loading in background!)
        let src = '/display';
        if (mode === 'lt') {
            src = '/lowerthird';
        } else if (mode === 'fb') {
            src = '/foldback';
        }

        const iframe = createControlIframe(src, 'preview-frame', 'preview-frame');
        wrapper.appendChild(iframe);
        requestAnimationFrame(() => resizePreview());
    }

    // Save to settings JSON on the server
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ last_preview_mode: mode })
        });
    } catch (e) {
        console.error("Failed to save preview mode settings:", e);
    }
}

window.changePreviewMode = changePreviewMode;

function releaseModalIframeResources(modalId) {
    if (MODAL_OUTPUT_PREVIEW_IDS.has(modalId)) {
        destroyModalOutputPreview(modalId);
    }
    if (modalId === 'text-edit-modal') {
        destroyTextEditPreview();
    }
    if (modalId === 'scripture-settings-modal') {
        destroyScriptureMiniIframes();
    }
}

function exitModalIframeMode(modalId, onDestroy) {
    if (activeIframeModalId && activeIframeModalId !== modalId) {
        if (typeof onDestroy === 'function') onDestroy();
        return;
    }
    releaseModalIframeResources(modalId);
    if (typeof onDestroy === 'function') onDestroy();
    if (activeIframeModalId === modalId) {
        activeIframeModalId = null;
    }
    // [USER REQUEST] Do not destroy/restore LIVE PREVIEW when a modal is closed.
}

function enterModalIframeMode(modalId, onMount) {
    const wasNull = !activeIframeModalId;
    if (activeIframeModalId && activeIframeModalId !== modalId) {
        releaseModalIframeResources(activeIframeModalId);
        activeIframeModalId = null;
    }
    activeIframeModalId = modalId;
    if (wasNull) {
        suspendMainPreview();
    }
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (activeIframeModalId !== modalId) return; // Cancel mounting if mode was cleared or changed
            if (typeof onMount === 'function') onMount();
        });
    });
}

function mountTextEditPreview() {
    const wrapper = document.getElementById('modal-preview-wrapper');
    if (!wrapper) return;

    // Fix: Forcefully remove existing frame or children if they somehow got stuck
    clearIframeContainer(wrapper);

    const iframe = createControlIframe('/preview_display', 'modal-preview-frame', 'te-preview-frame');
    wrapper.appendChild(iframe);
    attachTextEditPreviewScaler();
}

function destroyTextEditPreview() {
    detachTextEditPreviewScaler();
    clearIframeContainer(document.getElementById('modal-preview-wrapper'));
}

let scrMiniResizeObserver = null;

function scaleScriptureMiniIframes() {
    const items = [
        { mount: document.getElementById('scr-mini-display-mount'), frame: document.getElementById('scr-mini-display') },
        { mount: document.getElementById('scr-mini-lt-mount'), frame: document.getElementById('scr-mini-lt') }
    ];
    items.forEach(({ mount, frame }) => {
        if (mount && frame) {
            const width = mount.offsetWidth;
            if (width > 0) {
                frame.style.transform = `scale(${width / 1920})`;
            }
        }
    });
}

function attachScriptureMiniScaler() {
    detachScriptureMiniScaler();
    const dispMount = document.getElementById('scr-mini-display-mount');
    const ltMount = document.getElementById('scr-mini-lt-mount');
    if (!dispMount && !ltMount) return;

    scrMiniResizeObserver = new ResizeObserver(() => {
        scaleScriptureMiniIframes();
    });
    if (dispMount) scrMiniResizeObserver.observe(dispMount);
    if (ltMount) scrMiniResizeObserver.observe(ltMount);
    scaleScriptureMiniIframes();
    requestAnimationFrame(scaleScriptureMiniIframes);
}

function detachScriptureMiniScaler() {
    if (scrMiniResizeObserver) {
        scrMiniResizeObserver.disconnect();
        scrMiniResizeObserver = null;
    }
}

function mountScriptureMiniIframes() {
    const dispMount = document.getElementById('scr-mini-display-mount');
    const ltMount = document.getElementById('scr-mini-lt-mount');
    if (dispMount) {
        clearIframeContainer(dispMount);
        dispMount.appendChild(createControlIframe('/scripture', 'scr-mini-display', 'scr-mini-iframe'));
    }
    if (ltMount) {
        clearIframeContainer(ltMount);
        ltMount.appendChild(createControlIframe('/scripture-lt', 'scr-mini-lt', 'scr-mini-iframe'));
    }
    attachScriptureMiniScaler();
}

function destroyScriptureMiniIframes() {
    detachScriptureMiniScaler();
    clearIframeContainer(document.getElementById('scr-mini-display-mount'));
    clearIframeContainer(document.getElementById('scr-mini-lt-mount'));
}

// --- AUTO SCALE PREVIEW ---
let previewResizeScheduled = false;
function resizePreview() {
    if (previewResizeScheduled) return;
    previewResizeScheduled = true;
    window.requestAnimationFrame(() => {
        const wrapper = document.getElementById("preview-wrapper");
        if (wrapper && !wrapper.classList.contains('preview-suspended')) {
            const frame = document.getElementById("preview-frame");
            if (frame) {
                const wrapperWidth = wrapper.offsetWidth;
                const scale = wrapperWidth / 1920;
                frame.style.transform = `scale(${scale})`;
            }
        }
        previewResizeScheduled = false;
    });
}

window.addEventListener("resize", resizePreview);
window.addEventListener("load", () => restoreMainPreview());
setTimeout(() => { if (!activeIframeModalId) resizePreview(); }, 500);
setTimeout(() => { if (!activeIframeModalId) resizePreview(); }, 2000);

// --- MASS IMPORT FUNCTION ---
// --- MASS IMPORT FUNCTION (BATCH UPLOAD ENGINE) ---
// --- MASS IMPORT FUNCTION (BATCH UPLOAD ENGINE + PROGRESS BAR) ---
async function uploadFiles(input) {
    if (input.files.length === 0) return;

    const totalFiles = input.files.length;
    const CHUNK_SIZE = 300;
    let successCount = 0;

    // 1. Tampilkan Modal Progress
    const modal = document.getElementById("import-progress-modal");
    const statusText = document.getElementById("import-status-text");
    const progressBar = document.getElementById("import-progress-bar");
    const countText = document.getElementById("import-count-text");

    modal.style.display = "flex";
    statusText.innerText = "Sending data to server...";
    progressBar.style.width = "0%";
    countText.innerText = `0 / ${totalFiles}`;

    // 2. Proses nyicil kirim data (Looping per 100 file)
    for (let i = 0; i < totalFiles; i += CHUNK_SIZE) {
        const chunk = Array.from(input.files).slice(i, i + CHUNK_SIZE);
        const formData = new FormData();
        for (let f of chunk) formData.append("files", f);

        try {
            const res = await fetch("/import_songs", { method: "POST", body: formData });
            const data = await res.json();
            if (data.status === "success") {
                successCount += data.count;
            }
        } catch (e) {
            console.error("Batch upload error:", e);
        }

        // 3. Update Animasi Loading Bar
        const currentProgress = Math.min(i + CHUNK_SIZE, totalFiles);
        const percent = (currentProgress / totalFiles) * 100;

        progressBar.style.width = `${percent}%`;
        countText.innerText = `${currentProgress} / ${totalFiles}`;
    }

    // 4. Selesai & Tutup Modal
    statusText.innerText = "Processing complete!";
    statusText.style.color = "#28a745";

    setTimeout(() => {
        modal.style.display = "none";
        statusText.style.color = "#ccc"; // balikin warna buat next import
        showToast("Successfully imported " + successCount + " songs!", "success", 2500);
        fetchLibrary(); // Refresh urutan A-Z Library
        input.value = ""; // Reset input
    }, 600); // Kasih jeda setengah detik biar user sempet liat bar-nya 100%
}
// --- LOWER THIRD CONFIG LOGIC ---

function openLTConfig() {
    enterModalIframeMode('lt-modal', () => {
        document.getElementById('lt-modal').style.display = 'flex';
        loadModalOutputPreview('lt-modal', '/preview_lt', 'LOWER THIRD OUTPUT', 'left');
        captureOutputModalSnapshot('lt');
        ensureOutputModalFooter('lt-modal', 'saveLTModal', 'cancelLTModal');
        movePresetPanelToPreview('lt-modal', 'lt-preset-select');
        wireOutputModalClose('lt-modal', 'cancelLTModal');
        sendLTConfig();
    });
}


function setLTPreset(pos) {
    document.getElementById('lt-pos-mode').value = pos;

    // Default margins for presets
    if (pos === 'bottom') document.getElementById('lt-margin').value = 80;
    if (pos === 'top') document.getElementById('lt-margin').value = 80;
    if (pos === 'center') document.getElementById('lt-margin').value = 0; // 0 offset from center

    sendLTConfig();
}

function nudgeLT(amount) {
    const el = document.getElementById('lt-margin');
    let val = parseInt(el.value) || 0;
    const mode = document.getElementById('lt-pos-mode').value;

    if (mode === 'bottom') val += amount;
    else if (mode === 'top') val -= amount;
    else if (mode === 'center') val -= amount;

    el.value = val;
    markLtCustom();
    sendLTConfig();
}

function sendLTConfig() {
    const payload = {
        position: document.getElementById('lt-pos-mode').value,
        margin_y: parseInt(document.getElementById('lt-margin').value),
        size: parseInt(document.getElementById('lt-size').value),
        color: document.getElementById('lt-color').value,
        shadow_x: parseInt(document.getElementById('lt-shadow-x').value),
        shadow_y: parseInt(document.getElementById('lt-shadow-y').value),
        shadow_color: document.getElementById('lt-shadow-color').value,
        font: document.getElementById("lt-font-select").value, // Bisa ditambah dropdown font nanti
    };

    ws.send(JSON.stringify({
        action: "update_lowerthird",
        payload: payload
    }));
}

let ltPresetsData = {};
let ltPresetsInitialized = false;

async function fetchLTPresets() {
    const res = await fetch('/api/lt_presets');
    const data = await res.json();
    ltPresetsData = data.presets || {};
    const defaultName = data.default || "";

    const select = document.getElementById("lt-preset-select");
    const prevVal = select.value;
    select.innerHTML = '<option value="">-- Select Preset --</option>';
    for (const name in ltPresetsData) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.innerText = name;
        if (name === defaultName) opt.innerText += " (Default)";
        select.appendChild(opt);
    }

    document.getElementById("lt-default-status").innerText = defaultName ? `Default: ${defaultName}` : "Default: None";

    if (!ltPresetsInitialized) {
        ltPresetsInitialized = true;
        if (defaultName && ltPresetsData[defaultName]) {
            loadPresetByName(defaultName);
            select.value = defaultName;
            currentActiveLTPreset = "DEFAULT - " + defaultName;
            updateLTBadge();
        }
    } else {
        const activeName = currentActiveLTPreset
            .replace(/^DEFAULT - /, "")
            .replace(/ \(EDITED\)$/, "");
        const restoreVal = activeName && ltPresetsData[activeName]
            ? activeName
            : (prevVal && ltPresetsData[prevVal] ? prevVal : "");
        select.value = restoreVal;
    }
}

// ==========================================
// --- LOWER THIRD PRESET ENGINE (MODERN) ---
// ==========================================

// 1. OVERWRITE PRESET (SAVE)
async function overwriteLTPreset() {
    const name = document.getElementById("lt-preset-select").value;
    if (!name) return showToast("Select a preset first to update!", "error", 3000);

    const isOk = await showCustomDialog("confirm", `Update Lower Third preset <br><b style="color:#00e5ff;">"${name}"</b><br> with current settings?`);
    if (!isOk) return;

    showToast("Saving preset...", "loading");
    const config = getLTConfigFromUI();

    const res = await fetch('/api/lt_presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, config: config })
    });

    if (res.ok) {
        showToast(`Preset "${name}" updated!`, "success", 2000);
        currentActiveLTPreset = name;
        updateLTBadge();
        fetchLTPresets();
        safeCloseModal('lt-modal');
    } else {
        showToast("Failed to update preset", "error", 3000);
    }
}

// 2. BIKIN PRESET BARU (SAVE AS)
async function saveAsLTPreset() {
    const name = await showCustomDialog("prompt", "Enter New Lower Third Preset Name:");
    if (!name) return;

    showToast("Creating new preset...", "loading");
    const config = getLTConfigFromUI();

    const res = await fetch('/api/lt_presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, config: config })
    });

    if (res.ok) {
        showToast(`Preset "${name}" saved!`, "success", 2000);
        currentActiveLTPreset = name;
        updateLTBadge();
        await fetchLTPresets();
        document.getElementById("lt-preset-select").value = name; // Auto pilih yg baru
        safeCloseModal('lt-modal');
    } else {
        showToast("Failed to create preset", "error", 3000);
    }
}

// 3. DELETE PRESET
async function deleteLTPreset() {
    const name = document.getElementById("lt-preset-select").value;
    if (!name) return showToast("Select a preset to delete!", "error", 3000);

    const isOk = await showCustomDialog("confirm", `Are you sure you want to delete Lower Third preset <br><b style="color:#ff4444;">"${name}"</b>?`);
    if (!isOk) return;

    showToast("Deleting...", "loading");
    const res = await fetch(`/api/lt_presets/${encodeURIComponent(name)}`, { method: 'DELETE' });

    if (res.ok) {
        showToast("Preset deleted!", "success", 2000);
        if (currentActiveLTPreset === name) {
            currentActiveLTPreset = "- Custom / Unsaved -";
            updateLTBadge();
        }
        fetchLTPresets();
    } else {
        showToast("Failed to delete", "error", 3000);
    }
}

// 4. SET DEFAULT
async function setLTDefault() {
    const name = document.getElementById("lt-preset-select").value;
    if (!name) return showToast("Select a preset to set as default!", "error", 3000);

    showToast("Setting default...", "loading");
    const res = await fetch(`/api/lt_presets/default/${encodeURIComponent(name)}`, { method: 'POST' });

    if (res.ok) {
        showToast(`"${name}" is now Default! ⭐`, "success", 2500);
        fetchLTPresets();
    } else {
        showToast("Failed to set default", "error", 3000);
    }
}

function loadSelectedLTPreset() {
    const name = document.getElementById("lt-preset-select").value;
    if (name) loadPresetByName(name);
}

function setElementDisabled(el, isDisabled) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;

    if (isDisabled) {
        el.style.opacity = '0.4';
        el.style.pointerEvents = 'none';
        el.style.cursor = 'not-allowed';
        el.style.userSelect = 'none';
        const inputs = el.querySelectorAll('input, select, button');
        inputs.forEach(input => input.disabled = true);
        if (['INPUT', 'SELECT', 'BUTTON'].includes(el.tagName)) el.disabled = true;
    } else {
        el.style.opacity = '1';
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'default';
        el.style.userSelect = 'auto';
        const inputs = el.querySelectorAll('input, select, button');
        inputs.forEach(input => input.disabled = false);
        if (['INPUT', 'SELECT', 'BUTTON'].includes(el.tagName)) el.disabled = false;
    }
}
window.setElementDisabled = setElementDisabled;

function updateLTAlignUI(align) {
    document.getElementById("btn-lt-align-left").style.background = (align === 'left') ? '#007bff' : 'transparent';
    document.getElementById("btn-lt-align-left").style.color = (align === 'left') ? '#fff' : '#aaa';

    document.getElementById("btn-lt-align-center").style.background = (align === 'center') ? '#007bff' : 'transparent';
    document.getElementById("btn-lt-align-center").style.color = (align === 'center') ? '#fff' : '#aaa';

    document.getElementById("btn-lt-align-right").style.background = (align === 'right') ? '#007bff' : 'transparent';
    document.getElementById("btn-lt-align-right").style.color = (align === 'right') ? '#fff' : '#aaa';

    setElementDisabled('lt-pad-x-container', align === 'center');
}

function setLTAlign(align) {
    document.getElementById('lt-align').value = align;
    updateLTAlignUI(align);
    markLtCustom();
    sendLTConfig();
}

function toggleLtBannerUI() {
    const mode = document.getElementById("lt-banner-mode").value;
    const widthContainer = document.getElementById("lt-banner-width-container");
    const paddingRow = document.getElementById("lt-banner-padding-row");

    const isNone = (mode === "none");
    setElementDisabled('lt-banner-color-container', isNone);
    setElementDisabled('lt-banner-opacity-container', isNone);

    if (mode === "none") {
        if (widthContainer) widthContainer.style.display = "none";
        if (paddingRow) paddingRow.style.display = "none";
    } else if (mode === "custom") {
        if (widthContainer) widthContainer.style.display = "block";
        if (paddingRow) paddingRow.style.display = "flex";
    } else { // text, full
        if (widthContainer) widthContainer.style.display = "none";
        if (paddingRow) paddingRow.style.display = "flex";
    }
}

window.setLTAlign = setLTAlign;
window.toggleLtBannerUI = toggleLtBannerUI;

let ltConfigDebounceTimer = null;

function updateLtLineHeightUI(val) {
    const el = document.getElementById('lt-line-height-val');
    if (el) {
        const num = parseFloat(val);
        el.innerText = isNaN(num) ? "1.20" : num.toFixed(2);
    }
}

function handleLTLineHeightInput(val) {
    updateLtLineHeightUI(val);
    markLtCustom();
    if (ltConfigDebounceTimer) clearTimeout(ltConfigDebounceTimer);
    ltConfigDebounceTimer = setTimeout(() => {
        sendLTConfig();
        ltConfigDebounceTimer = null;
    }, 50);
}

function handleLTLineHeightChange(val) {
    updateLtLineHeightUI(val);
    markLtCustom();
    if (ltConfigDebounceTimer) {
        clearTimeout(ltConfigDebounceTimer);
        ltConfigDebounceTimer = null;
    }
    sendLTConfig();
}

window.handleLTLineHeightInput = handleLTLineHeightInput;
window.handleLTLineHeightChange = handleLTLineHeightChange;
window.updateLtLineHeightUI = updateLtLineHeightUI;

function loadPresetByName(name) {
    const config = ltPresetsData[name];
    if (!config) return;

    document.getElementById('lt-pos-mode').value = config.position;
    document.getElementById('lt-margin').value = config.margin_y;
    document.getElementById('lt-size').value = config.size;
    document.getElementById('lt-color').value = config.color;
    document.getElementById('lt-shadow-x').value = config.shadow_x;
    document.getElementById('lt-shadow-y').value = config.shadow_y;
    document.getElementById('lt-shadow-blur').value = config.shadow_blur !== undefined ? config.shadow_blur : 0;
    document.getElementById('lt-shadow-color').value = config.shadow_color;
    document.getElementById('lt-stroke-size').value = config.stroke_size !== undefined ? config.stroke_size : 0;
    document.getElementById('lt-stroke-color').value = config.stroke_color || '#000000';
    document.getElementById('lt-font-select').value = config.font || 'Montserrat';

    // Line Height
    const lh = config.line_height !== undefined ? parseFloat(config.line_height) : 1.2;
    const lhInput = document.getElementById('lt-line-height');
    if (lhInput) lhInput.value = lh;
    updateLtLineHeightUI(lh);

    // New alignment & padding inputs
    const align = config.align || 'center';
    document.getElementById('lt-align').value = align;
    document.getElementById('lt-pad-x').value = config.pad_x !== undefined ? config.pad_x : 50;
    if (document.getElementById('lt-text-transform')) {
        document.getElementById('lt-text-transform').value = config.text_transform || 'none';
    }
    updateLTAlignUI(align);

    // New banner inputs
    document.getElementById('lt-banner-mode').value = config.banner_mode || 'none';
    document.getElementById('lt-banner-width').value = config.banner_width !== undefined ? config.banner_width : 80;
    document.getElementById('lt-banner-color').value = config.banner_color || '#000000';
    document.getElementById('lt-banner-opacity').value = config.banner_opacity !== undefined ? config.banner_opacity : 50;
    document.getElementById('lt-banner-pad-y').value = config.banner_pad_y !== undefined ? config.banner_pad_y : 10;
    document.getElementById('lt-banner-pad-x').value = config.banner_pad_x !== undefined ? config.banner_pad_x : 20;
    document.getElementById('lt-banner-radius').value = config.banner_radius !== undefined ? config.banner_radius : 8;
    toggleLtBannerUI();

    // Ganti status UI
    updateLTPosUI(config.position);
    currentActiveLTPreset = name;
    updateLTBadge();

    sendLTConfig();
}

function getLTConfigFromUI() {
    return {
        position: document.getElementById('lt-pos-mode').value,
        margin_y: parseInt(document.getElementById('lt-margin').value),
        size: parseInt(document.getElementById('lt-size').value),
        line_height: (() => {
            const el = document.getElementById('lt-line-height');
            return el ? parseFloat(el.value) || 1.2 : 1.2;
        })(),
        color: document.getElementById('lt-color').value,
        shadow_x: parseInt(document.getElementById('lt-shadow-x').value),
        shadow_y: parseInt(document.getElementById('lt-shadow-y').value),
        shadow_blur: parseInt(document.getElementById('lt-shadow-blur').value) || 0,
        shadow_color: document.getElementById('lt-shadow-color').value,
        stroke_size: parseInt(document.getElementById('lt-stroke-size').value) || 0,
        stroke_color: document.getElementById('lt-stroke-color').value,
        font: document.getElementById("lt-font-select").value,
        // New alignment & padding fields
        align: document.getElementById('lt-align').value,
        pad_x: parseInt(document.getElementById('lt-pad-x').value) || 0,
        text_transform: document.getElementById('lt-text-transform') ? document.getElementById('lt-text-transform').value : 'none',
        // New banner fields
        banner_mode: document.getElementById('lt-banner-mode').value,
        banner_width: parseInt(document.getElementById('lt-banner-width').value) || 80,
        banner_color: document.getElementById('lt-banner-color').value,
        banner_opacity: parseInt(document.getElementById('lt-banner-opacity').value) || 0,
        banner_pad_y: parseInt(document.getElementById('lt-banner-pad-y').value) || 0,
        banner_pad_x: parseInt(document.getElementById('lt-banner-pad-x').value) || 0,
        banner_radius: parseInt(document.getElementById('lt-banner-radius').value) || 0,
    };
}

// UPDATE fungsi sendLTConfig yang lama biar pake getLTConfigFromUI
function sendLTConfig() {
    const payload = getLTConfigFromUI();
    ws.send(JSON.stringify({ action: "update_lowerthird", payload: payload }));
}

async function fetchDisplayPresets() {
    const res = await fetch('/api/display_presets');
    const data = await res.json();
    dispPresetsData = data.presets || {};
    const defaultName = data.default || "";
    currentGlobalDefaultName = defaultName;

    const globalSelect = document.getElementById("global-preset-select"); // Skrg hidden
    const songSelect = document.getElementById("song-preset-select");
    const visualContainer = document.getElementById("visual-preset-container");

    songSelect.innerHTML = '<option value="">-- No Preset --</option>';
    visualContainer.innerHTML = ''; // Bersihin grid kartu

    for (const name in dispPresetsData) {
        const config = dispPresetsData[name];

        // 1. Masukin ke dropdown Song Preset (Yang ini biarin bentuk dropdown)
        const opt2 = document.createElement("option");
        opt2.value = name; opt2.innerText = name;
        songSelect.appendChild(opt2);

        // 2. Bikin Kartu Visual buat Global Preset
        const card = document.createElement("div");
        card.className = "preset-card";
        card.id = `preset-card-${name.replace(/\s+/g, '-')}`; // Hapus spasi buat ID
        card.onclick = () => selectVisualPreset(name);

        card.oncontextmenu = (e) => { e.preventDefault(); showPresetContextMenu(e, name); };

        // Inject font biar kartunya bisa pake font asli!
        injectFont(config.font);

        // Kasih lencana bintang kalo dia default
        // Lencana Default yang Gede, ditaruh di pojok kanan atas kotak
        let isDefault = name === defaultName ? '<div style="position:absolute; top:0; right:0; background:#ffc107; color:#000; font-size:10px; font-weight:bold; padding:2px 5px; border-bottom-left-radius:6px; z-index: 2; letter-spacing:0.5px;">★ DEFAULT</div>' : '';
        // Gambar UI Kartunya (Model Horizontal Kapsul)
        card.innerHTML = `
                    ${isDefault}
                    <div class="preset-preview" style="font-family: '${config.font || 'Cinzel'}'; color: ${config.color || '#fff'};">Aa</div>
                    <div class="preset-name" title="${name}">${name}</div>
                `;
        visualContainer.appendChild(card);
    }

    document.getElementById("disp-default-status").innerText = defaultName ? `Default: ${defaultName}` : "Default: None";

    // Logika Startup & Restore Pemilihan
    if (defaultName) {
        if (!sessionStorage.getItem("disp_loaded")) {
            document.getElementById("force-global").checked = true;
            sessionStorage.setItem("disp_loaded", "true");
        }
        selectVisualPreset(defaultName);
    } else if (globalSelect.value) {
        selectVisualPreset(globalSelect.value); // Balikin kartu yang lagi kepilih pas hbs save/delete
    }
}

async function overwriteDisplayPreset() {
    // Cek apakah VJ lagi bener-bener ada di mode Preset (Bukan Custom)
    const dispMode = document.getElementById("current-disp-mode").value;
    if (dispMode !== 'preset') {
        return showToast("⚠️ Change song style to 'PRESET' mode to overwrite/update!", "error", 4000);
    }

    // Ambil nama preset langsung dari dropdown Song Link (Bukan dari Active Global)
    const name = document.getElementById("song-preset-select").value;
    if (!name) return showToast("Select a preset from Song Style dropdown first!", "error", 3000);

    const isOk = await showCustomDialog("confirm", `Update preset <br><b style="color:#00e5ff;">"${name}"</b><br> with current slider settings?`);
    if (!isOk) return;

    showToast("Saving preset...", "loading");
    const config = getDisplayConfigFromUI();

    const res = await fetch('/api/display_presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, config: config }) });
    if (res.ok) {
        showToast(`Preset "${name}" updated!`, "success", 2000);
        await fetchDisplayPresets();
    } else {
        showToast("Failed to save preset", "error", 3000);
    }
}

async function saveAsDisplayPreset() {
    const name = await showCustomDialog("prompt", "Enter New Display Preset Name:");
    if (!name) return;

    showToast("Creating new preset...", "loading");
    const config = getDisplayConfigFromUI();

    const res = await fetch('/api/display_presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, config: config }) });
    if (res.ok) {
        showToast(`Preset "${name}" saved!`, "success", 2000);
        await fetchDisplayPresets();

        // OTOMATIS PINDAH KE MODE PRESET & PILIH YANG BARU DISAVE
        document.getElementById("current-disp-mode").value = 'preset';
        updateStyleButtonsUI('preset');
        document.getElementById("song-preset-select").value = name;
        selectVisualPreset(name); // Highlight kartunya
    } else {
        showToast("Failed to create preset", "error", 3000);
    }
}

// 3. DELETE PRESET
async function deleteDisplayPreset() {
    const name = document.getElementById("global-preset-select").value;
    if (!name) return showToast("Click a preset card to delete!", "error", 3000);

    const isOk = await showCustomDialog("confirm", `Are you sure you want to delete preset <br><b style="color:#ff4444;">"${name}"</b>?`);
    if (!isOk) return;

    showToast("Deleting...", "loading");
    const res = await fetch(`/api/display_presets/${encodeURIComponent(name)}`, { method: 'DELETE' });

    if (res.ok) {
        showToast(`Preset deleted!`, "success", 2000);
        document.getElementById("global-preset-select").value = "";
        document.getElementById("selected-preset-label").innerText = "- No Preset -";
        await fetchDisplayPresets();
    } else {
        showToast("Failed to delete preset", "error", 3000);
    }
}

async function setDefaultDisplayPreset() {
    const name = document.getElementById("global-preset-select").value;
    if (!name) return showToast("Click a preset card to set as default!", "error", 3000);

    showToast("Setting default...", "loading");
    const res = await fetch(`/api/display_presets/default/${encodeURIComponent(name)}`, { method: 'POST' });

    if (res.ok) {
        showToast(`"${name}" is now Default! ⭐`, "success", 2500);
        fetchDisplayPresets();
    } else {
        showToast("Failed to set default", "error", 3000);
    }
}

function loadSelectedDisplayPreset() {
    const name = document.getElementById("disp-preset-select").value;
    if (name && dispPresetsData[name]) {
        applyDisplayPresetToUI(dispPresetsData[name]);
        updateSettings(); // Kirim ke layar
    }
}

function applyDisplayPresetToUI(config) {
    if (!config) return;
    document.getElementById("theme-input").value = config.theme || 'default';
    document.getElementById("color-input").value = config.color || '#ffffff';

    // --- UPDATE SLIDER GLOW & TEKSNYA ---
    const glowVal = config.glow !== undefined ? config.glow : 50;
    document.getElementById("glow-input").value = glowVal;
    document.getElementById("val-glow").innerText = glowVal + '%';

    // --- UPDATE SLIDER FADE & TEKSNYA ---
    const fadeVal = config.fade !== undefined ? config.fade : 0.5;
    document.getElementById("fade-input").value = fadeVal;
    document.getElementById("val-fade").innerText = fadeVal + 's';

    document.getElementById("trans-input").value = config.trans || 'fade';
    document.getElementById("speed-input").value = config.speed || '30s';
    document.getElementById("zoom-input").value = config.zoom || 'stay';
    document.getElementById("motion-input").value = getSafeMotionValue(config.motion || 'none');
    document.getElementById("align-input").value = config.align || 'center';

    // --- UPDATE SLIDER PADDING & TEKSNYA ---
    const marginXVal = config.margin_x !== undefined ? config.margin_x : (config.pad_x !== undefined ? config.pad_x : 10);
    const textWrapVal = config.text_wrap !== undefined ? config.text_wrap : (config.pad_x !== undefined ? (100 - 2 * config.pad_x) : 80);
    document.getElementById("margin-x-input").value = marginXVal;
    document.getElementById("val-margin-x").innerText = marginXVal + '%';
    document.getElementById("text-wrap-input").value = textWrapVal;
    document.getElementById("val-text-wrap").innerText = textWrapVal + '%';

    let fontSizeVal = config.font_size !== undefined ? config.font_size : 96;
    if (fontSizeVal <= 15) {
        fontSizeVal = Math.round(fontSizeVal * 19.2);
    }
    document.getElementById("font-size-input").value = fontSizeVal;
    document.getElementById("val-font-size").innerText = fontSizeVal + 'px';

    // LINE HEIGHT
    const lineHeightPreset = config.line_height !== undefined ? config.line_height : 1.0;
    if (document.getElementById("line-height-input")) {
        document.getElementById("line-height-input").value = lineHeightPreset;
        document.getElementById("val-line-height").innerText = parseFloat(lineHeightPreset).toFixed(2).replace(/0$/, '');
    }

    document.getElementById("shadow-int-input").value = config.shadow_int !== undefined ? config.shadow_int : 0;
    document.getElementById("shadow-color-input").value = config.shadow_color || '#000000';

    const strokeVal = config.stroke_size !== undefined ? config.stroke_size : 0;
    document.getElementById("stroke-size-input").value = strokeVal;
    document.getElementById("val-stroke").innerText = strokeVal + 'px';

    document.getElementById("stroke-color-input").value = config.stroke_color || '#000000';

    // =========================================================
    // --- TAMBAHAN BARU: RESET FORMATTING & GRADIENT PRESET ---
    // =========================================================
    document.getElementById("transform-input").value = config.text_transform || 'none';

    textState.bold = config.font_weight === 'bold';
    textState.italic = config.font_style === 'italic';
    textState.underline = config.text_decoration === 'underline';

    // Loop buat update status tombol UI
    ['bold', 'italic', 'underline'].forEach(type => {
        const btn = document.getElementById('btn-' + type);
        if (btn) {
            if (textState[type]) btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
    document.getElementById("color-type-input").value = config.color_type || 'solid';
    document.getElementById("color-input").value = config.color || '#ffffff';
    document.getElementById("color2-input").value = config.color_2 || '#00e5ff';
    document.getElementById("color-angle-input").value = config.color_angle !== undefined ? config.color_angle : 90;

    document.getElementById("glow-type-input").value = config.glow_type || 'text';
    document.getElementById("glow-c1-input").value = config.glow_color_1 || config.color || '#ffffff';
    document.getElementById("glow-c2-input").value = config.glow_color_2 || '#ff00ff';
    document.getElementById("glow-angle-input").value = config.glow_angle !== undefined ? config.glow_angle : 90;

    document.getElementById("motion-input").value = getSafeMotionValue(config.motion || 'none');
    document.getElementById("align-input").value = config.align || 'center';

    // --- UPDATE VERTICAL ALIGN UI ---
    const vAlignMode = config.v_align || 'center';
    const vMarginVal = config.v_margin !== undefined ? config.v_margin : 5;

    const teValign = document.getElementById("te-valign");
    if (teValign) {
        teValign.value = vAlignMode;
        document.getElementById('te-valign-val').innerText = teValign.options[teValign.selectedIndex].text.split(' ')[0];
    }
    if (document.getElementById("te-vmargin")) {
        document.getElementById("te-vmargin").value = vMarginVal;
    }

    // Trigger update UI (biar form gradasinya muncul/sembunyi sesuai data)
    toggleColorUI();
    toggleGlowUI();
    // =========================================================


    const savedFont = config.font || 'Cinzel';
    document.getElementById("font-select").value = savedFont;
    injectFont(savedFont);

    updateTextPreview(false);
}


// --- FOLDBACK CONFIG LOGIC ---
function openFBConfig() {
    enterModalIframeMode('fb-modal', () => {
        document.getElementById('fb-modal').style.display = 'flex';
        loadModalOutputPreview('fb-modal', '/foldback', 'STAGE / FOLDBACK OUTPUT', 'left');
        captureOutputModalSnapshot('fb');
        ensureOutputModalFooter('fb-modal', 'saveFBModal', 'cancelFBModal');
        movePresetPanelToPreview('fb-modal', 'fb-preset-select');
        wireOutputModalClose('fb-modal', 'cancelFBModal');
        sendFBConfig();
    });
}

function setFBLayout(mode) {
    document.getElementById('fb-layout').value = mode;
    markFbCustom();
    sendFBConfig();
}

function sendFBConfig() {
    const payload = {
        layout: document.getElementById('fb-layout').value,
        curr_size: parseInt(document.getElementById('fb-curr-size').value),
        curr_color: document.getElementById('fb-curr-color').value,
        next_size: parseInt(document.getElementById('fb-next-size').value),
        next_color: document.getElementById('fb-next-color').value,
        bg_color: document.getElementById('fb-bg-color').value
    };
    ws.send(JSON.stringify({ action: "update_foldback", payload: payload }));
}
let fbPresetsData = {};
let fbPresetsInitialized = false;

async function fetchFBPresets() {
    const res = await fetch('/api/fb_presets');
    const data = await res.json();
    fbPresetsData = data.presets || {};
    const defaultName = data.default || "";

    const select = document.getElementById("fb-preset-select");
    const prevVal = select.value;
    select.innerHTML = '<option value="">-- Select Preset --</option>';
    for (const name in fbPresetsData) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.innerText = name;
        if (name === defaultName) opt.innerText += " (Default)";
        select.appendChild(opt);
    }
    document.getElementById("fb-default-status").innerText = defaultName ? `Default: ${defaultName}` : "Default: None";

    if (!fbPresetsInitialized) {
        fbPresetsInitialized = true;
        if (defaultName && fbPresetsData[defaultName]) {
            applyFBPresetToUI(fbPresetsData[defaultName]);
            sendFBConfig();
            select.value = defaultName;
            currentActiveFBPreset = "DEFAULT - " + defaultName;
            updateFBBadge();
        }
    } else {
        const activeName = currentActiveFBPreset
            .replace(/^DEFAULT - /, "")
            .replace(/ \(EDITED\)$/, "");
        const restoreVal = activeName && fbPresetsData[activeName]
            ? activeName
            : (prevVal && fbPresetsData[prevVal] ? prevVal : "");
        select.value = restoreVal;
    }
}

// ==========================================
// --- STAGE/FOLDBACK PRESET ENGINE (MODERN) ---
// ==========================================

// 1. OVERWRITE PRESET (SAVE)
async function overwriteFBPreset() {
    const name = document.getElementById("fb-preset-select").value;
    if (!name) return showToast("Select a preset first to update!", "error", 3000);

    const isOk = await showCustomDialog("confirm", `Update Stage/Foldback preset <br><b style="color:#00e5ff;">"${name}"</b><br> with current settings?`);
    if (!isOk) return;

    showToast("Saving preset...", "loading");
    const config = getFBConfigFromUI();

    const res = await fetch('/api/fb_presets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, config: config, is_default: false })
    });

    if (res.ok) {
        showToast(`Preset "${name}" updated!`, "success", 2000);
        currentActiveFBPreset = name;
        updateFBBadge();
        fetchFBPresets();
        safeCloseModal('fb-modal');
    } else {
        showToast("Failed to update preset", "error", 3000);
    }
}

// 2. BIKIN PRESET BARU (SAVE AS)
async function saveAsFBPreset() {
    const name = await showCustomDialog("prompt", "Enter New Stage/Foldback Preset Name:");
    if (!name) return;

    showToast("Creating new preset...", "loading");
    const config = getFBConfigFromUI();

    const res = await fetch('/api/fb_presets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, config: config, is_default: false })
    });

    if (res.ok) {
        showToast(`Preset "${name}" saved!`, "success", 2000);
        currentActiveFBPreset = name;
        updateFBBadge();
        await fetchFBPresets();
        document.getElementById("fb-preset-select").value = name; // Auto pilih yg baru
        safeCloseModal('fb-modal');
    } else {
        showToast("Failed to create preset", "error", 3000);
    }
}

// 3. DELETE PRESET
async function deleteFBPreset() {
    const name = document.getElementById("fb-preset-select").value;
    if (!name) return showToast("Select a preset to delete!", "error", 3000);

    const isOk = await showCustomDialog("confirm", `Are you sure you want to delete Stage preset <br><b style="color:#ff4444;">"${name}"</b>?`);
    if (!isOk) return;

    showToast("Deleting...", "loading");
    const res = await fetch(`/api/fb_presets/${encodeURIComponent(name)}`, { method: 'DELETE' });

    if (res.ok) {
        showToast("Preset deleted!", "success", 2000);
        if (currentActiveFBPreset === name) {
            currentActiveFBPreset = "- Custom / Unsaved -";
            updateFBBadge();
        }
        fetchFBPresets();
    } else {
        showToast("Failed to delete", "error", 3000);
    }
}

// 4. SET DEFAULT
async function setDefaultFBPreset() {
    const name = document.getElementById("fb-preset-select").value;
    if (!name) return showToast("Select a preset to set as default!", "error", 3000);

    showToast("Setting default...", "loading");
    const res = await fetch(`/api/fb_presets/default/${encodeURIComponent(name)}`, { method: 'POST' });

    if (res.ok) {
        showToast(`"${name}" is now Default! ⭐`, "success", 2500);
        fetchFBPresets();
    } else {
        showToast("Failed to set default", "error", 3000);
    }
}

function loadSelectedFBPreset() {
    const name = document.getElementById("fb-preset-select").value;
    if (name && fbPresetsData[name]) {
        applyFBPresetToUI(fbPresetsData[name]);
        currentActiveFBPreset = name;
        updateFBBadge();
        sendFBConfig(); // Kirim ke layar
    }
}

function toggleFBAutoUI() {
    const currAuto = document.getElementById('fb-curr-auto');
    const nextAuto = document.getElementById('fb-next-auto');
    if (currAuto) setElementDisabled('fb-curr-size-container', currAuto.checked);
    if (nextAuto) setElementDisabled('fb-next-size-container', nextAuto.checked);
}
window.toggleFBAutoUI = toggleFBAutoUI;

function applyFBPresetToUI(c) {
    if (!c) return;
    document.getElementById('fb-layout').value = c.layout;
    document.getElementById('fb-curr-size').value = c.curr_size;
    document.getElementById('fb-curr-color').value = c.curr_color;
    document.getElementById('fb-next-size').value = c.next_size;
    document.getElementById('fb-next-color').value = c.next_color;
    document.getElementById('fb-bg-color').value = c.bg_color;
    if (document.getElementById('fb-text-transform')) {
        document.getElementById('fb-text-transform').value = c.text_transform || 'none';
    }
    if (document.getElementById('fb-curr-auto')) {
        document.getElementById('fb-curr-auto').checked = c.curr_auto !== undefined ? c.curr_auto : true;
    }
    if (document.getElementById('fb-next-auto')) {
        document.getElementById('fb-next-auto').checked = c.next_auto !== undefined ? c.next_auto : true;
    }
    toggleFBAutoUI();
}

function getFBConfigFromUI() {
    return {
        layout: document.getElementById('fb-layout').value,
        curr_size: parseInt(document.getElementById('fb-curr-size').value),
        curr_color: document.getElementById('fb-curr-color').value,
        next_size: parseInt(document.getElementById('fb-next-size').value),
        next_color: document.getElementById('fb-next-color').value,
        bg_color: document.getElementById('fb-bg-color').value,
        text_transform: document.getElementById('fb-text-transform') ? document.getElementById('fb-text-transform').value : 'none',
        curr_auto: document.getElementById('fb-curr-auto') ? document.getElementById('fb-curr-auto').checked : true,
        next_auto: document.getElementById('fb-next-auto') ? document.getElementById('fb-next-auto').checked : true
    };
}

// UPDATE fungsi sendFBConfig biar pake getFBConfigFromUI
function sendFBConfig() {
    const payload = getFBConfigFromUI();
    ws.send(JSON.stringify({ action: "update_foldback", payload: payload }));
}

// --- ALERT SYSTEM ---
// --- ALERT SYSTEM ---
function toggleAlert() {
    isAlertOn = !isAlertOn;
    const btn = document.getElementById("btn-toggle-alert");

    const text = document.getElementById("alert-input").value;
    let targets = [];
    if (document.getElementById("chk-main").checked) targets.push('main');
    if (document.getElementById("chk-lt").checked) targets.push('lt');

    if (isAlertOn) {
        btn.innerHTML = "🛑 HIDE ALERT";
        btn.style.background = "#dc3545";
    } else {
        btn.innerHTML = "📢 SHOW ALERT";
        btn.style.background = "#28a745";
    }

    updateNavBlinker();

    // TAMBAHIN SPEED, FONT, SIZE, COLOR DI PAYLOAD
    const payload = {
        text: text,
        show: isAlertOn,
        targets: targets,
        position: document.getElementById("alert-pos").value,
        color: document.getElementById("alert-color").value,
        speed: parseInt(document.getElementById("alert-speed").value) || 15,
        font: document.getElementById("alert-font-select").value,
        size: parseInt(document.getElementById("alert-font-size").value) || 28,
        text_color: document.getElementById("alert-text-color").value
    };
    ws.send(JSON.stringify({ action: "alert", payload: payload }));
}

function updateLiveAlert() {
    // Cuma nembak kalau alert lagi nyala di layar
    if (!isAlertOn) return;

    const text = document.getElementById("alert-input").value;
    let targets = [];
    if (document.getElementById("chk-main").checked) targets.push('main');
    if (document.getElementById("chk-lt").checked) targets.push('lt');

    const payload = {
        text: text,
        show: true,
        targets: targets,
        position: document.getElementById("alert-pos").value,
        color: document.getElementById("alert-color").value,
        speed: parseInt(document.getElementById("alert-speed").value) || 15,
        font: document.getElementById("alert-font-select").value,
        size: parseInt(document.getElementById("alert-font-size").value) || 28,
        text_color: document.getElementById("alert-text-color").value
    };
    ws.send(JSON.stringify({ action: "alert", payload: payload }));
}

function toggleStageMsg(show) {
    const text = document.getElementById("stage-input").value;
    const flash = document.getElementById("chk-flash").checked;
    ws.send(JSON.stringify({
        action: "stage_msg",
        payload: { text: text, show: show, flash: flash }
    }));
}

function quickStageMsg(text) {
    document.getElementById("stage-input").value = text;
    toggleStageMsg(true);
}

// --- STAGE TIMER ---
// ==========================================
// --- STAGE TIMER ENGINE ---
// ==========================================
let isStageTimerRunning = false;
let stageTimerInterval = null;
let stageTimeLeft = 0;

function toggleStageTimer() {
    const btn = document.getElementById("btn-toggle-timer");
    const btnText = document.getElementById("timer-btn-text");
    const display = document.getElementById("controller-timer-display");
    const minInput = document.getElementById("timer-min");

    if (isStageTimerRunning) {
        // LOGIKA STOP
        ws.send(JSON.stringify({ action: "stage_countdown", payload: { action: 'stop' } }));
        clearInterval(stageTimerInterval);
        isStageTimerRunning = false;

        // Balikin UI ke mode awal
        btn.style.background = "#28a745"; // Hijau
        btnText.innerText = "▶ START";
        display.style.display = "none";
        display.classList.remove("nav-blink-alert"); // Matiin kedip kalau ada
        minInput.disabled = false; // Buka kunci input menit

    } else {
        // LOGIKA START
        const min = parseInt(minInput.value) || 5;
        stageTimeLeft = min * 60;

        // Tembak ke layar panggung
        ws.send(JSON.stringify({ action: "stage_countdown", payload: { action: 'start', seconds: stageTimeLeft } }));
        isStageTimerRunning = true;

        // Ganti UI ke mode lagi jalan
        btn.style.background = "#dc3545"; // Merah
        btnText.innerText = "⏹ STOP";
        display.style.display = "inline-block";
        display.style.color = "#fff";
        minInput.disabled = true; // Kunci input menit biar ga diganti pas lagi jalan

        updateTimerDisplayUI(); // Render angka pertama kali biar ga nunggu 1 detik

        // Mulai hitung mundur lokal di Controller VJ
        stageTimerInterval = setInterval(() => {
            stageTimeLeft--;
            updateTimerDisplayUI();

            // Kalau waktunya habis (00:00)
            if (stageTimeLeft <= 0) {
                clearInterval(stageTimerInterval);
                display.style.color = "#ff9999";
                display.classList.add("nav-blink-alert"); // Bikin angka kedip-kedip ngingetin VJ
            }
        }, 1000);
    }
}

// Helper buat ngerubah detik jadi format 00:00
function updateTimerDisplayUI() {
    const display = document.getElementById("controller-timer-display");
    const safeTime = stageTimeLeft < 0 ? 0 : stageTimeLeft; // Biar ga nampilin minus
    const m = Math.floor(safeTime / 60).toString().padStart(2, '0');
    const s = (safeTime % 60).toString().padStart(2, '0');
    display.innerText = `${m}:${s}`;
}

function openAlertModal() {
    enterModalIframeMode('alert-modal', () => {
        document.getElementById('alert-modal').style.display = 'flex';
        loadModalOutputPreview('alert-modal', '/foldback', 'STAGE OUTPUT PREVIEW', 'right');
        fetchAlertPresets();
    });
}

// --- ALERT PRESET LOGIC ---
let alertPresetsData = {};

async function fetchAlertPresets() {
    const res = await fetch('/api/alert_presets');
    const data = await res.json();
    alertPresetsData = data.presets || {};

    const select = document.getElementById("alert-preset-select");
    select.innerHTML = '<option value="">-- Select --</option>';
    for (const name in alertPresetsData) {
        const opt = document.createElement("option");
        opt.value = name; opt.innerText = name;
        select.appendChild(opt);
    }
}

async function overwriteAlertPreset() {
    const name = document.getElementById("alert-preset-select").value;
    if (!name) return showToast("Select a preset first to update!", "error", 3000);

    const isOk = await showCustomDialog("confirm", `Update alert preset <br><b style="color:#00e5ff;">"${name}"</b><br> with current text and settings?`);
    if (!isOk) return;

    showToast("Saving preset...", "loading");

    let targets = [];
    if (document.getElementById("chk-main").checked) targets.push('main');
    if (document.getElementById("chk-lt").checked) targets.push('lt');

    const config = {
        text: document.getElementById("alert-input").value,
        targets: targets,
        position: document.getElementById("alert-pos").value,
        color: document.getElementById("alert-color").value,
        speed: parseInt(document.getElementById("alert-speed").value) || 15,
        font: document.getElementById("alert-font-select").value,
        size: parseInt(document.getElementById("alert-font-size").value) || 28,
        text_color: document.getElementById("alert-text-color").value
    };

    const res = await fetch('/api/alert_presets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, config: config })
    });

    if (res.ok) {
        showToast(`Preset "${name}" updated!`, "success", 2000);
        fetchAlertPresets();
    } else {
        showToast("Failed to update preset", "error", 3000);
    }
}

async function saveAsAlertPreset() {
    const name = await showCustomDialog("prompt", "Enter New Alert Preset Name:");
    if (!name) return;

    showToast("Creating new preset...", "loading");

    let targets = [];
    if (document.getElementById("chk-main").checked) targets.push('main');
    if (document.getElementById("chk-lt").checked) targets.push('lt');

    const config = {
        text: document.getElementById("alert-input").value,
        targets: targets,
        position: document.getElementById("alert-pos").value,
        color: document.getElementById("alert-color").value,
        speed: parseInt(document.getElementById("alert-speed").value) || 15,
        font: document.getElementById("alert-font-select").value,
        size: parseInt(document.getElementById("alert-font-size").value) || 28,
        text_color: document.getElementById("alert-text-color").value
    };

    const res = await fetch('/api/alert_presets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name, config: config })
    });

    if (res.ok) {
        showToast(`Preset "${name}" saved!`, "success", 2000);
        await fetchAlertPresets();
        document.getElementById("alert-preset-select").value = name; // Auto pilih yg baru
    } else {
        showToast("Failed to create preset", "error", 3000);
    }
}

// 3. DELETE PRESET
async function deleteAlertPreset() {
    const name = document.getElementById("alert-preset-select").value;
    if (!name) return showToast("Select a preset to delete!", "error", 3000);

    const isOk = await showCustomDialog("confirm", `Are you sure you want to delete Alert preset <br><b style="color:#ff4444;">"${name}"</b>?`);
    if (!isOk) return;

    showToast("Deleting...", "loading");
    const res = await fetch(`/api/alert_presets/${encodeURIComponent(name)}`, { method: 'DELETE' });

    if (res.ok) {
        showToast("Preset deleted!", "success", 2000);
        fetchAlertPresets();
    } else {
        showToast("Failed to delete", "error", 3000);
    }
}

function loadSelectedAlertPreset() {
    const name = document.getElementById("alert-preset-select").value;
    if (name && alertPresetsData[name]) {
        const c = alertPresetsData[name];
        document.getElementById("alert-input").value = c.text || "";
        document.getElementById("alert-pos").value = c.position || "top";
        document.getElementById("alert-color").value = c.color || "#8b0000";

        // --- UPDATE SLIDER SPEED ALERT & TEKSNYA ---
        if (document.getElementById("alert-speed")) {
            const spd = c.speed || 15;
            document.getElementById("alert-speed").value = spd;
            document.getElementById("val-alert-speed").innerText = spd + 's';
        }

        document.getElementById("chk-main").checked = c.targets && c.targets.includes('main');
        document.getElementById("chk-lt").checked = c.targets && c.targets.includes('lt');

        // New fields for alert settings
        document.getElementById("alert-font-select").value = c.font || "";
        document.getElementById("alert-font-size").value = c.size || 28;
        document.getElementById("alert-text-color").value = c.text_color || "#ffffff";
    }
}

// --- ELECTRON MODERN LOGIC ---

// State Tracker
// ==========================================
// --- ELECTRON MODERN LOGIC ---
// ==========================================

// State Tracker (Ambil dari memori browser biar gak lupa pas ganti halaman)
let electronState = {
    main: sessionStorage.getItem('win_main') === 'true',
    lt: sessionStorage.getItem('win_lt') === 'true',
    fb: sessionStorage.getItem('win_fb') === 'true'
};

const isElectron = window.electronAPI !== undefined;

if (isElectron) {
    const wrapper = document.getElementById("electron-wrapper");
    if (wrapper) {
        wrapper.classList.remove("te-hidden");
    }
    initElectronDisplays();

    // Sync tampilan UI awal pas halaman dimuat
    updateBtnVisual('main');
    updateBtnVisual('lt');
    updateBtnVisual('fb');

    // Listener kalau window ketutup manual (Alt+F4)
    window.electronAPI.onProjectionClosed((type) => {
        electronState[type] = false;
        sessionStorage.setItem(`win_${type}`, 'false'); // Simpan kalau udah mati
        updateBtnVisual(type);
    });
}


async function initElectronDisplays(displays) {
    const selectIds = ['main', 'lt', 'fb'];
    const appSettings = { display_mapping: {} };

    selectIds.forEach(type => {
        const select = document.getElementById(`disp-${type}`);
        if (!select) return;
        select.innerHTML = '<option value="">Loading displays...</option>';
        select.disabled = true;
    });

    try {
        const res = await fetch("/api/settings");
        const json = await res.json();
        if (json && json.display_mapping) appSettings.display_mapping = json.display_mapping;
    } catch (e) {
        console.error("Error loading settings:", e);
    }

    let displayList = Array.isArray(displays) ? displays : [];
    if (!displayList || displayList.length === 0) {
        if (window.electronAPI && typeof window.electronAPI.getDisplays === 'function') {
            try {
                displayList = await window.electronAPI.getDisplays();
            } catch (e) {
                console.error("Failed to retrieve displays from Electron:", e);
                displayList = [];
            }
        }
    }

    if (!Array.isArray(displayList)) displayList = [];

    selectIds.forEach(type => {
        const select = document.getElementById(`disp-${type}`);
        if (!select) return;
        select.innerHTML = "";

        if (displayList.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.innerText = "No displays found";
            select.appendChild(opt);
            select.disabled = true;
            select.onchange = null;
            return;
        }

        select.disabled = false;
        displayList.forEach(d => {
            const opt = document.createElement("option");
            opt.value = d.id;
            opt.innerText = d.label;
            select.appendChild(opt);
        });

        const prefKey = `disp_pref_${type}`;
        const savedDisp = appSettings.display_mapping[prefKey];
        const isValid = savedDisp && displayList.some(d => d.id.toString() === savedDisp);

        if (savedDisp && isValid) {
            select.value = savedDisp;
        } else {
            if (type === 'main' && displayList.length > 1) select.selectedIndex = 1;
            else if (type === 'lt' && displayList.length > 2) select.selectedIndex = 2;
            else select.selectedIndex = 0;

            fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ display_mapping: { [prefKey]: select.value } })
            }).catch(e => console.warn("Failed to save default display mapping:", e));
        }

        select.onchange = function () {
            fetch("/api/settings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ display_mapping: { [prefKey]: this.value } })
            }).catch(e => console.warn("Failed to save display mapping:", e));
        };
    });
}

function toggleElectronBtn(type) {
    if (!window.electronAPI) {
        console.warn("Electron API is not available.");
        return;
    }

    // 1. Flip State & Simpan ke Memori
    electronState[type] = !electronState[type];
    sessionStorage.setItem(`win_${type}`, electronState[type].toString());

    const action = electronState[type] ? 'start' : 'stop';

    // 2. Update Visual Tombol
    updateBtnVisual(type);

    // 3. Kirim Perintah ke Electron
    const select = document.getElementById(`disp-${type}`);
    let displayId = null;
    if (select) {
        const rawValue = select.value;
        const parsed = parseInt(rawValue);
        if (!Number.isNaN(parsed)) {
            displayId = parsed;
        } else {
            const fallbackOpt = select.querySelector('option[value]:not([disabled])');
            if (fallbackOpt) {
                const fallback = parseInt(fallbackOpt.value);
                if (!Number.isNaN(fallback)) displayId = fallback;
            }
        }
    }

    let targetPath = "/display";
    if (type === 'lt') targetPath = "/lowerthird";
    if (type === 'fb') targetPath = "/foldback";
    const fullUrl = window.location.origin + targetPath;

    const payload = {
        type: type,
        action: action,
        url: fullUrl
    };
    if (displayId !== null) payload.displayId = displayId;

    window.electronAPI.toggleProjection(payload);
}

function updateBtnVisual(type) {
    const btn = document.getElementById(`btn-out-${type}`);
    if (!btn) return;

    const isActive = electronState[type];

    // Remove all active classes first
    btn.classList.remove('active-main', 'active-lt', 'active-fb');

    if (isActive) {
        // Add specific active class
        btn.classList.add(`active-${type}`);
    }
}

function toggleConfigPanel() {
    const panel = document.getElementById("electron-config");
    if (panel.style.display === "block") {
        panel.style.display = "none";
    } else {
        panel.style.display = "block";
    }
}

// --- FITUR ANTI-LUPA SAVE (DIRTY CHECK) ---
let isFormDirty = false;

// Deteksi otomatis kalau ada ketikan/perubahan di dalam Pop-up (Modal)
document.addEventListener('input', (e) => {
    if (e.target.closest('.modal-box')) {
        isFormDirty = true;
    }
});

// ==========================================
// --- SMART CLOSE MODAL (CUSTOM UI) ---
// ==========================================
async function safeCloseModal(modalId) {
    // Cek apakah modal yang ditutup adalah modal editor yang punya data "kotor" (belum disave)
    if ((modalId === 'add-song-modal' || modalId === 'full-edit-modal') && isFormDirty) {

        // Panggil Custom Dialog yang elegan (bukan confirm bawaan browser)
        const isOk = await showCustomDialog(
            "confirm",
            "⚠️ <span style='color: #ffc107;'>WARNING</span><br><br>You have unsaved changes.<br>Are you sure you want to discard them?"
        );

        // Kalau VJ klik "Batal" atau "No", hentikan fungsi (modal ga jadi nutup)
        if (!isOk) return;
    }

    // Reset status dirty dan tutup modalnya dengan transisi (kalau mau dikasih animasi fade out)
    isFormDirty = false;
    const modalEl = document.getElementById(modalId);

    if (modalEl) {
        if (IFRAME_MANAGED_MODALS.has(modalId)) {
            exitModalIframeMode(modalId);
        } else {
            destroyModalOutputPreview(modalId);
        }
        modalEl.style.opacity = "0";
        setTimeout(() => {
            modalEl.style.display = "none";
            modalEl.style.opacity = "1";
        }, 200);
    }
}

function loadModalOutputPreview(modalId, path, label, side = 'left') {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const box = modal.querySelector('.modal-box');
    if (!box) return;

    if (modalId === 'lt-modal') {
        const configPanel = Array.from(box.children).find(child =>
            !child.classList.contains('modal-header') &&
            !child.classList.contains('modal-output-preview') &&
            !child.classList.contains('modal-sticky-footer')
        );
        if (configPanel) configPanel.classList.add('modal-config-panel');
    }

    if (modalId === 'fb-modal' && !box.querySelector('.modal-config-panel')) {
        const configPanel = document.createElement('div');
        configPanel.className = 'modal-config-panel';
        const movable = Array.from(box.children).filter(child =>
            !child.classList.contains('modal-header') &&
            !child.classList.contains('modal-output-preview')
        );
        movable.forEach(child => configPanel.appendChild(child));
        box.appendChild(configPanel);
    }

    let preview = modal.querySelector('.modal-output-preview');
    if (!preview) {
        preview = document.createElement('div');
        preview.className = `modal-output-preview preview-${side}`;
        preview.innerHTML = `
            <div class="modal-output-preview-header">
                <span class="modal-output-preview-dot"></span>
                <span class="modal-output-preview-title"></span>
            </div>
            <div class="modal-output-frame-shell"></div>
        `;

        if (modalId === 'alert-modal') {
            const stagePanel = modal.querySelector('.alert-panel.stage');
            if (stagePanel) stagePanel.appendChild(preview);
        } else {
            const header = box.querySelector('.modal-header');
            if (header && header.nextSibling) box.insertBefore(preview, header.nextSibling);
            else box.prepend(preview);
        }
    }

    const title = preview.querySelector('.modal-output-preview-title');
    const shell = preview.querySelector('.modal-output-frame-shell');
    if (title) title.textContent = label;
    if (!shell) return;

    shell.innerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.className = 'modal-output-frame';
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('title', label);
    iframe.src = `${path}?preview=${Date.now()}`;
    iframe.style.width = '1920px';
    iframe.style.height = '1080px';
    iframe.style.transformOrigin = 'top left';
    shell.appendChild(iframe);

    const scalePreview = () => {
        const width = shell.clientWidth;
        if (width <= 0) return;
        iframe.style.transform = `scale(${width / 1920})`;
    };
    scalePreview();
    requestAnimationFrame(scalePreview);

    if (!window.modalOutputPreviewObservers) window.modalOutputPreviewObservers = {};
    if (window.modalOutputPreviewObservers[modalId]) {
        window.modalOutputPreviewObservers[modalId].disconnect();
    }
    window.modalOutputPreviewObservers[modalId] = new ResizeObserver(scalePreview);
    window.modalOutputPreviewObservers[modalId].observe(shell);

    modal.classList.add('has-output-preview');
}

const outputModalSnapshots = {};

function captureOutputModalSnapshot(type) {
    if (type === 'lt') {
        outputModalSnapshots.lt = {
            preset: document.getElementById('lt-preset-select')?.value || '',
            config: getLTConfigFromUI(),
            activePreset: currentActiveLTPreset
        };
    } else if (type === 'fb') {
        outputModalSnapshots.fb = {
            preset: document.getElementById('fb-preset-select')?.value || '',
            config: getFBConfigFromUI(),
            activePreset: currentActiveFBPreset
        };
    }
}

function applyOutputModalSnapshot(type) {
    const snapshot = outputModalSnapshots[type];
    if (!snapshot) return;

    if (type === 'lt') {
        const select = document.getElementById('lt-preset-select');
        if (select) select.value = snapshot.preset || '';
        applyLTConfigToUI(snapshot.config);
        currentActiveLTPreset = snapshot.activePreset || "- Custom / Unsaved -";
        updateLTBadge();
        sendLTConfig();
    } else if (type === 'fb') {
        const select = document.getElementById('fb-preset-select');
        if (select) select.value = snapshot.preset || '';
        applyFBPresetToUI(snapshot.config);
        currentActiveFBPreset = snapshot.activePreset || "- Custom / Unsaved -";
        updateFBBadge();
        sendFBConfig();
    }
}

function ensureOutputModalFooter(modalId, saveFnName, cancelFnName) {
    const box = document.querySelector(`#${modalId} .modal-box`);
    if (!box || box.querySelector('.modal-sticky-footer')) return;

    const footer = document.createElement('div');
    footer.className = 'modal-sticky-footer';
    footer.innerHTML = `
        <button class="modal-footer-btn modal-footer-cancel" onclick="${cancelFnName}()">CANCEL</button>
        <button class="modal-footer-btn modal-footer-save" onclick="${saveFnName}()">SAVE PRESET</button>
    `;
    box.appendChild(footer);
}

function wireOutputModalClose(modalId, cancelFnName) {
    const btn = document.querySelector(`#${modalId} .close-btn`);
    if (btn) btn.setAttribute('onclick', `${cancelFnName}()`);
}

function movePresetPanelToPreview(modalId, selectId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const select = document.getElementById(selectId);
    const preview = modal.querySelector('.modal-output-preview');
    if (!select || !preview) return;

    const panel = select.closest('.preset-action-panel');
    if (!panel || panel.parentElement === preview) return;

    panel.classList.add('modal-preview-preset-panel');
    preview.appendChild(panel);
}

function applyLTConfigToUI(config) {
    if (!config) return;
    document.getElementById('lt-pos-mode').value = config.position || 'bottom';
    document.getElementById('lt-margin').value = config.margin_y ?? 80;
    document.getElementById('lt-size').value = config.size ?? 60;
    document.getElementById('lt-color').value = config.color || '#ffffff';
    document.getElementById('lt-shadow-x').value = config.shadow_x ?? 3;
    document.getElementById('lt-shadow-y').value = config.shadow_y ?? 3;
    document.getElementById('lt-shadow-blur').value = config.shadow_blur ?? 0;
    document.getElementById('lt-shadow-color').value = config.shadow_color || '#000000';
    document.getElementById('lt-stroke-size').value = config.stroke_size ?? 0;
    document.getElementById('lt-stroke-color').value = config.stroke_color || '#000000';
    document.getElementById('lt-font-select').value = config.font || 'Montserrat';

    // Line Height
    const lh = config.line_height !== undefined ? parseFloat(config.line_height) : 1.2;
    const lhInput = document.getElementById('lt-line-height');
    if (lhInput) lhInput.value = lh;
    updateLtLineHeightUI(lh);

    // Alignment & Padding
    const align = config.align || 'center';
    document.getElementById('lt-align').value = align;
    document.getElementById('lt-pad-x').value = config.pad_x !== undefined ? config.pad_x : 50;
    if (document.getElementById('lt-text-transform')) {
        document.getElementById('lt-text-transform').value = config.text_transform || 'none';
    }
    updateLTAlignUI(align);

    // Banner
    document.getElementById('lt-banner-mode').value = config.banner_mode || 'none';
    document.getElementById('lt-banner-width').value = config.banner_width !== undefined ? config.banner_width : 80;
    document.getElementById('lt-banner-color').value = config.banner_color || '#000000';
    document.getElementById('lt-banner-opacity').value = config.banner_opacity !== undefined ? config.banner_opacity : 50;
    document.getElementById('lt-banner-pad-y').value = config.banner_pad_y !== undefined ? config.banner_pad_y : 10;
    document.getElementById('lt-banner-pad-x').value = config.banner_pad_x !== undefined ? config.banner_pad_x : 20;
    document.getElementById('lt-banner-radius').value = config.banner_radius !== undefined ? config.banner_radius : 8;
    toggleLtBannerUI();

    updateLTPosUI(config.position || 'bottom');
}

async function saveOutputPreset(type) {
    if (type === 'lt') {
        const select = document.getElementById("lt-preset-select");
        let name = select?.value || "";
        if (!name) {
            name = await showCustomDialog("prompt", "Enter New Lower Third Preset Name:");
            if (!name) return;
        }

        const payload = { name: name, config: getLTConfigFromUI() };
        showToast("Saving preset...", "loading");
        const res = await fetch('/api/lt_presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            await fetchLTPresets();
            if (select) select.value = name;
            currentActiveLTPreset = name;
            updateLTBadge();
            captureOutputModalSnapshot('lt');
            showToast(`Preset "${name}" saved!`, "success", 1800);
            safeCloseModal('lt-modal');
        } else {
            showToast("Failed to save preset", "error", 3000);
        }
    } else if (type === 'fb') {
        const select = document.getElementById("fb-preset-select");
        let name = select?.value || "";
        if (!name) {
            name = await showCustomDialog("prompt", "Enter New Stage/Foldback Preset Name:");
            if (!name) return;
        }

        const payload = { name: name, config: getFBConfigFromUI() };
        showToast("Saving preset...", "loading");
        const res = await fetch('/api/fb_presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            await fetchFBPresets();
            if (select) select.value = name;
            currentActiveFBPreset = name;
            updateFBBadge();
            captureOutputModalSnapshot('fb');
            showToast(`Preset "${name}" saved!`, "success", 1800);
            safeCloseModal('fb-modal');
        } else {
            showToast("Failed to save preset", "error", 3000);
        }
    }
}

async function saveLTModal() {
    await saveOutputPreset('lt');
}

async function saveFBModal() {
    await saveOutputPreset('fb');
}

function cancelLTModal() {
    applyOutputModalSnapshot('lt');
    safeCloseModal('lt-modal');
}

function cancelFBModal() {
    applyOutputModalSnapshot('fb');
    safeCloseModal('fb-modal');
}

function destroyModalOutputPreview(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const preview = modal.querySelector('.modal-output-preview');
    if (!preview) return;

    const shell = preview.querySelector('.modal-output-frame-shell');
    const iframe = preview.querySelector('iframe');
    if (window.modalOutputPreviewObservers && window.modalOutputPreviewObservers[modalId]) {
        window.modalOutputPreviewObservers[modalId].disconnect();
        delete window.modalOutputPreviewObservers[modalId];
    }
    if (iframe) {
        destroyIframeEl(iframe);
    }
    if (shell) {
        Array.from(shell.children).forEach(child => {
            if (!child.classList.contains('obsolete-iframe')) {
                child.remove();
            }
        });
    }
    modal.classList.remove('has-output-preview');
}

// Kalau ada script yang masih manggil fungsi lama, kita arahin ke fungsi baru biar aman
function closeAddSongModal() { safeCloseModal("add-song-modal"); }
function closeLTConfig() { safeCloseModal("lt-modal"); }
function closeFBConfig() { safeCloseModal("fb-modal"); }
function closeAlertModal() { safeCloseModal("alert-modal"); }

// ==========================================
// --- FITUR FULL EDIT SONG (v1.15) ---
// ==========================================
function openFullEditModal() {
    if (currentActiveTab === 'scripture') {
        showToast("Edit disabled in Scripture mode!", "error", 2000);
        return;
    }
    if (lyricsData.length > 0 && lyricsData[0].type === 'presentation_slide') {
        showToast("PPT slide text cannot be edited!", "error", 2000);
        return;
    }

    if (!currentSongTitle) {
        showToast("Load a song first!", "error", 1500);
        return;
    }
    document.getElementById("edit-song-title").value = currentSongTitle;
    editorSlides = lyricsData.length > 0 ? JSON.parse(JSON.stringify(lyricsData)) : [{ text: "", type: "normal" }];
    editorHistory = [];
    renderEditor("edit");
    enterModalIframeMode('full-edit-modal', () => {
        document.getElementById("full-edit-modal").style.display = "flex";
    });
}

function formatEditSongText() {
    const input = document.getElementById("edit-song-text");
    if (!input.value) return;
    let text = input.value;
    text = text.toUpperCase();
    text = text.replace(/[.,]/g, ""); // Hapus titik koma
    text = text.replace(/  +/g, ' '); // Bersihkan spasi dobel
    input.value = text;
    isFormDirty = true; // Tandai belum disave
}

async function saveFullEdit() {
    const oldTitle = currentSongTitle;
    const newTitle = document.getElementById("edit-song-title").value.trim();

    if (!newTitle) { showToast("Song title cannot be empty!", "error", 3000); return; }

    let newData = [];
    let idCounter = 0;
    editorSlides.forEach(slide => {
        // 🎯 FIX: Kenali semua jenis standalone (Video, Audio, Photo)
        const isStandalone = ['video', 'audio', 'photo'].includes(slide.type);

        if (slide.text.trim() !== "" || isStandalone) {
            newData.push({
                id: idCounter++,
                text: slide.text.trim(),
                type: slide.type,
                bg_id: slide.bg_id,
                bg_type: slide.bg_type,
                bg_behavior: slide.bg_behavior,
                bg_name: slide.bg_name           // 🎯 PASTIKAN INI MASUK!
            });
        }
    });

    if (newData.length === 0) { showToast("No valid lyrics in editor.", "error", 3000); return; }

    const currentSongData = allSongs.find(s => s.title === oldTitle);
    const savedSettings = currentSongData && currentSongData.settings
        ? { ...currentSongData.settings, motion: getSafeMotionValue((currentSongData.settings || {}).motion || 'none') }
        : { font: getCurrentFont(), theme: document.getElementById("theme-input").value, color: document.getElementById("color-input").value, zoom: document.getElementById("zoom-input").value, speed: document.getElementById("speed-input").value, glow: parseInt(document.getElementById("glow-input").value), fade: parseFloat(document.getElementById("fade-input").value), trans: document.getElementById("trans-input").value, motion: getSafeMotionValue(document.getElementById("motion-input").value), align: document.getElementById("align-input").value, pad_x: parseInt(document.getElementById("margin-x-input").value), margin_x: parseInt(document.getElementById("margin-x-input").value), text_wrap: parseInt(document.getElementById("text-wrap-input").value) };

    const payload = { title: newTitle, data: newData, settings: savedSettings };

    // 🚀 MUNCULIN LOADING
    showToast("Updating data...", "loading");

    if (newTitle !== oldTitle) {
        await fetch(`/api/songs/${oldTitle}`, { method: 'DELETE' });
        let schedUpdated = false;
        scheduleList.forEach(item => {
            if (item.title === oldTitle) { item.title = newTitle; schedUpdated = true; }
        });
        if (schedUpdated) await saveActiveSchedule();
    }

    const res = await fetch('/api/songs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    if (res.ok) {
        isFormDirty = false;
        document.getElementById("full-edit-modal").style.display = "none";

        if (newTitle !== oldTitle) {
            allSongs = allSongs.filter(s => s.title !== oldTitle);
            allSongs.push(payload);
            allSongs.sort((a, b) => a.title.localeCompare(b.title));
            renderLibrary(allSongs);
        } else {
            const idx = allSongs.findIndex(s => s.title === newTitle);
            if (idx !== -1) allSongs[idx] = payload;
        }

        if (newTitle !== oldTitle) renderSchedule();
        loadSong(newTitle);

        // 🚀 UBAH JADI SUCCESS
        showToast(`Song "${newTitle}" updated!`, "success", 2500);
    } else {
        showToast("Failed to update song.", "error", 3000);
    }
}

// ==========================================
// --- SMART ROW EDITOR & MULTILINE (v1.16) ---
// ==========================================
let editorSlides = []; // Menyimpan data sementara saat ngedit

// Update fungsi Buka Modal (Timpa yg lama)
function openAddSongModal() {
    document.getElementById("new-song-title").value = "";
    editorSlides = [{ text: "", type: "normal" }]; // 1 slide kosong
    renderEditor("add");
    document.getElementById("add-song-modal").style.display = "flex";
    setTimeout(() => document.getElementById("add-input-0").focus(), 100);
}

// Mesin Render Row
// Mesin Render Row
function renderEditor(mode) {
    const container = document.getElementById(`${mode}-editor-rows`);
    if (!container) return;
    container.innerHTML = "";

    // 1. Group slides logically
    let groups = [];
    let currentGroup = null;

    editorSlides.forEach((slide, idx) => {
        const isStandalone = ['video', 'audio', 'photo'].includes(slide.type);
        const prevSlide = idx > 0 ? editorSlides[idx - 1] : null;
        const prevIsStandalone = prevSlide ? ['video', 'audio', 'photo'].includes(prevSlide.type) : false;

        // A new group starts if:
        // - First slide
        // - Non-normal slide type
        // - Standalone slide
        // - Previous slide was standalone
        const isGroupStart = (
            idx === 0 ||
            (!isStandalone && slide.type !== 'normal') ||
            isStandalone ||
            prevIsStandalone
        );

        if (isGroupStart) {
            currentGroup = {
                type: slide.type,
                isStandalone: isStandalone,
                startIndex: idx,
                slides: []
            };
            groups.push(currentGroup);
        }

        currentGroup.slides.push({
            slide: slide,
            globalIndex: idx
        });
    });

    // 2. Render each group
    groups.forEach((group) => {
        const groupBox = document.createElement("div");
        groupBox.className = "editor-group-box";

        // Assign visual custom properties and accent transparent background
        let groupColor = "#444";
        let groupGlow = "rgba(255, 255, 255, 0.05)";
        let groupTitleText = "NORMAL SLIDES";
        let bgOpacity = "0.015";

        if (group.isStandalone) {
            if (group.type === 'video') { groupColor = "#00e5ff"; groupTitleText = "VIDEO STANDALONE SLIDE"; }
            else if (group.type === 'audio') { groupColor = "#ffaa00"; groupTitleText = "AUDIO STANDALONE SLIDE"; }
            else if (group.type === 'photo') { groupColor = "#ff00aa"; groupTitleText = "PHOTO STANDALONE SLIDE"; }
            groupGlow = `rgba(${hexToRgb(groupColor)}, 0.2)`;
            bgOpacity = "0.04";
        } else {
            if (group.type === 'verse') { groupColor = "var(--color-verse)"; groupTitleText = "VERSE 1 SECTION"; }
            else if (group.type === 'verse2') { groupColor = "var(--color-verse2)"; groupTitleText = "VERSE 2 SECTION"; }
            else if (group.type === 'pre') { groupColor = "var(--color-pre)"; groupTitleText = "PRE-CHORUS SECTION"; }
            else if (group.type === 'chorus') { groupColor = "var(--color-chorus)"; groupTitleText = "CHORUS 1 SECTION"; }
            else if (group.type === 'chorus2') { groupColor = "var(--color-chorus2)"; groupTitleText = "CHORUS 2 SECTION"; }
            else if (group.type === 'bridge') { groupColor = "var(--color-bridge)"; groupTitleText = "BRIDGE SECTION"; }
            else if (group.type === 'tag') { groupColor = "var(--color-tag)"; groupTitleText = "TAG SECTION"; }

            if (group.type !== 'normal') {
                groupGlow = `rgba(${group.type === 'verse' ? '6,182,212' : group.type === 'verse2' ? '139,92,246' : group.type === 'pre' ? '245,158,11' : group.type === 'chorus' ? '239,68,68' : group.type === 'chorus2' ? '236,72,153' : group.type === 'bridge' ? '16,185,129' : '249,115,22'}, 0.2)`;
                bgOpacity = "0.03";
            }
        }

        groupBox.style.setProperty("--group-color", groupColor);
        groupBox.style.setProperty("--group-glow", groupGlow);
        groupBox.style.background = `rgba(${group.type === 'verse' ? '6,182,212' : group.type === 'verse2' ? '139,92,246' : group.type === 'pre' ? '245,158,11' : group.type === 'chorus' ? '239,68,68' : group.type === 'chorus2' ? '236,72,153' : group.type === 'bridge' ? '16,185,129' : group.type === 'tag' ? '249,115,22' : '255,255,255'}, ${bgOpacity})`;

        // Group Header
        const groupHeader = document.createElement("div");
        groupHeader.className = "editor-group-header";
        groupHeader.innerHTML = `
            <div class="editor-group-title">
                <span style="font-size: 1.1em;">📂</span> ${groupTitleText}
            </div>
            <div class="editor-group-badge">
                ${group.slides.length} ${group.slides.length === 1 ? 'Slide' : 'Slides'}
            </div>
        `;
        groupBox.appendChild(groupHeader);

        // Group Slides Grid
        group.slides.forEach((item) => {
            const slide = item.slide;
            const idx = item.globalIndex;

            const row = document.createElement("div");
            row.className = "slide-row";
            row.style.setProperty("--group-color", groupColor);
            row.style.setProperty("--group-glow", groupGlow);

            const isStandalone = ['video', 'audio', 'photo'].includes(slide.type);

            // Get current tag visual metadata
            let tagText = "NORMAL";
            let tagColor = "#555";
            let tagDot = "⚪";

            if (slide.type === 'verse') { tagText = "VERSE 1"; tagColor = "var(--color-verse)"; tagDot = "🔵"; }
            else if (slide.type === 'verse2') { tagText = "VERSE 2"; tagColor = "var(--color-verse2)"; tagDot = "🟣"; }
            else if (slide.type === 'pre') { tagText = "PRE-CHORUS"; tagColor = "var(--color-pre)"; tagDot = "🟡"; }
            else if (slide.type === 'chorus') { tagText = "CHORUS 1"; tagColor = "var(--color-chorus)"; tagDot = "🔴"; }
            else if (slide.type === 'chorus2') { tagText = "CHORUS 2"; tagColor = "var(--color-chorus2)"; tagDot = "💗"; }
            else if (slide.type === 'bridge') { tagText = "BRIDGE"; tagColor = "var(--color-bridge)"; tagDot = "🟢"; }
            else if (slide.type === 'tag') { tagText = "TAG"; tagColor = "var(--color-tag)"; tagDot = "🟠"; }

            if (isStandalone) {
                let mediaLabel = slide.type.toUpperCase();
                let mediaDot = "🎞️";
                if (slide.type === 'audio') { mediaLabel = "AUDIO"; mediaDot = "🎵"; }
                else if (slide.type === 'photo') { mediaLabel = "PHOTO"; mediaDot = "📷"; }

                row.innerHTML = `
                    <div class="slide-row-header">
                        <div class="slide-tag-badge active-tag" style="--tag-badge-color: ${groupColor}; cursor: default;">
                            <span>${mediaDot} ${mediaLabel}</span>
                        </div>
                        <span class="slide-row-index">SLIDE #${idx + 1}</span>
                        <button class="slide-del-btn" onclick="deleteEditorRow(${idx}, '${mode}')">✖</button>
                    </div>
                    <textarea rows="1" class="slide-input input-disabled tag-text-${slide.type}" id="${mode}-input-${idx}" disabled>[ STANDALONE ${slide.type.toUpperCase()} SLIDE - NOT EDITABLE ]</textarea>
                `;
            } else {
                row.innerHTML = `
                    <div class="slide-row-header">
                        <div class="slide-tag-badge active-tag" id="${mode}-tag-badge-${idx}" style="--tag-badge-color: ${tagColor};" onclick="toggleTagDropdown(${idx}, '${mode}', this)">
                            <span>${tagDot} ${tagText}</span>
                        </div>
                        <span class="slide-row-index">SLIDE #${idx + 1}</span>
                        <button class="slide-del-btn" onclick="deleteEditorRow(${idx}, '${mode}')">✖</button>
                    </div>
                    <textarea rows="3" class="slide-input" id="${mode}-input-${idx}" placeholder="Enter lyrics...">${slide.text}</textarea>
                `;
            }

            groupBox.appendChild(row);

            // Add Textarea Listeners
            if (!isStandalone) {
                const textarea = row.querySelector("textarea");

                textarea.addEventListener("focus", () => saveEditorState());

                textarea.addEventListener("input", (e) => {
                    editorSlides[idx].text = e.target.value;
                    isFormDirty = true;
                });

                textarea.addEventListener("keydown", (e) => {
                    // ↩️ UNDO (CTRL+Z / CMD+Z)
                    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
                        e.preventDefault();
                        undoEditorState(mode);
                        return;
                    }

                    // DYNAMIC SHORTCUTS TAG MATCHING
                    const actionMap = {
                        assign_verse: 'verse',
                        assign_verse2: 'verse2',
                        assign_pre: 'pre',
                        assign_chorus: 'chorus',
                        assign_chorus2: 'chorus2',
                        assign_bridge: 'bridge',
                        assign_tag: 'tag',
                        assign_unassign: 'normal'
                    };

                    let matchedType = null;
                    for (const action in actionMap) {
                        if (matchShortcut(e, action)) {
                            matchedType = actionMap[action];
                            break;
                        }
                    }

                    if (matchedType) {
                        e.preventDefault();
                        saveEditorState();
                        editorSlides[idx].type = matchedType;
                        renderEditor(mode);
                        setTimeout(() => {
                            const el = document.getElementById(`${mode}-input-${idx}`);
                            if (el) el.focus();
                        }, 10);
                    }

                    // SPLIT CURSOR (CTRL/CMD + ENTER)
                    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                        e.preventDefault();
                        saveEditorState();
                        const cursorPos = textarea.selectionStart;
                        const textBefore = textarea.value.substring(0, cursorPos).trim();
                        const textAfter = textarea.value.substring(cursorPos).trim();

                        editorSlides[idx].text = textBefore;
                        editorSlides.splice(idx + 1, 0, { text: textAfter, type: 'normal' });
                        renderEditor(mode);
                        setTimeout(() => {
                            const nextInput = document.getElementById(`${mode}-input-${idx + 1}`);
                            if (nextInput) {
                                nextInput.focus();
                                nextInput.setSelectionRange(0, 0);
                            }
                        }, 10);
                    }

                    // BACKSPACE DELETION
                    if (e.key === "Backspace" && e.target.value === "" && editorSlides.length > 1) {
                        e.preventDefault();
                        saveEditorState();
                        deleteEditorRow(idx, mode);
                        const prevIdx = idx > 0 ? idx - 1 : 0;
                        setTimeout(() => {
                            const prevInput = document.getElementById(`${mode}-input-${prevIdx}`);
                            if (prevInput) prevInput.focus();
                        }, 10);
                    }
                });
            }
        });

        container.appendChild(groupBox);
    });
}

function toggleTagDropdown(idx, mode, badgeEl) {
    // Remove other dropdowns first
    const wasOpen = badgeEl.dataset.dropdownOpen === 'true';
    document.querySelectorAll('.slide-tag-dropdown').forEach(el => el.remove());
    document.querySelectorAll('[data-dropdown-open="true"]').forEach(el => {
        el.dataset.dropdownOpen = 'false';
    });

    if (wasOpen) {
        return;
    }

    badgeEl.dataset.dropdownOpen = 'true';

    // Create fixed-positioned portal dropdown on document.body (tidak pernah terpotong modal scroll)
    const dropdown = document.createElement('div');
    dropdown.className = 'slide-tag-dropdown';
    dropdown.style.position = 'fixed';
    dropdown.style.zIndex = '100500';
    dropdown.style.visibility = 'hidden';

    const types = [
        { type: 'normal', name: 'NORMAL', label: 'Default (D)', color: '#555' },
        { type: 'verse', name: 'VERSE 1', label: 'Verse 1 (V)', color: 'var(--color-verse)' },
        { type: 'verse2', name: 'VERSE 2', label: 'Verse 2 (I)', color: 'var(--color-verse2)' },
        { type: 'pre', name: 'PRE-CHORUS', label: 'Pre-Chorus (P)', color: 'var(--color-pre)' },
        { type: 'chorus', name: 'CHORUS 1', label: 'Chorus 1 (C)', color: 'var(--color-chorus)' },
        { type: 'chorus2', name: 'CHORUS 2', label: 'Chorus 2 (X)', color: 'var(--color-chorus2)' },
        { type: 'bridge', name: 'BRIDGE', label: 'Bridge (B)', color: 'var(--color-bridge)' },
        { type: 'tag', name: 'TAG', label: 'Tag (T)', color: 'var(--color-tag)' }
    ];

    const cleanupDropdown = () => {
        dropdown.remove();
        badgeEl.dataset.dropdownOpen = 'false';
        document.removeEventListener('click', outsideClickListener);
        document.removeEventListener('keydown', escListener);
        window.removeEventListener('scroll', scrollCloseListener, true);
        window.removeEventListener('resize', scrollCloseListener);
    };

    types.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.innerHTML = `
            <span class="dropdown-item-dot" style="background: ${opt.color}"></span>
            <span>${opt.label}</span>
        `;
        item.onclick = (e) => {
            e.stopPropagation();
            cleanupDropdown();
            saveEditorState();
            editorSlides[idx].type = opt.type;
            renderEditor(mode);
            isFormDirty = true;
            setTimeout(() => {
                const el = document.getElementById(`${mode}-input-${idx}`);
                if (el) el.focus();
            }, 10);
        };
        dropdown.appendChild(item);
    });

    document.body.appendChild(dropdown);

    // Hitung koordinat viewport — flip ke atas jika melewati batas bawah layar
    const rect = badgeEl.getBoundingClientRect();
    const ddRect = dropdown.getBoundingClientRect();
    let top = rect.bottom + 6;
    if (top + ddRect.height > window.innerHeight - 10) {
        top = Math.max(10, rect.top - ddRect.height - 6);
    }
    let left = rect.left;
    if (left + ddRect.width > window.innerWidth - 10) {
        left = Math.max(10, window.innerWidth - ddRect.width - 10);
    }
    dropdown.style.top = `${top}px`;
    dropdown.style.left = `${left}px`;
    dropdown.style.visibility = 'visible';

    const outsideClickListener = (e) => {
        if (!badgeEl.contains(e.target) && !dropdown.contains(e.target)) {
            cleanupDropdown();
        }
    };
    const escListener = (e) => {
        if (e.key === 'Escape') cleanupDropdown();
    };
    const scrollCloseListener = () => {
        cleanupDropdown();
    };

    setTimeout(() => {
        document.addEventListener('click', outsideClickListener);
        document.addEventListener('keydown', escListener);
        window.addEventListener('scroll', scrollCloseListener, true);
        window.addEventListener('resize', scrollCloseListener);
    }, 10);
}

function hexToRgb(hex) {
    if (hex.startsWith('var(')) {
        if (hex.includes('color-verse2')) return '139,92,246';
        if (hex.includes('color-verse')) return '6,182,212';
        if (hex.includes('color-pre')) return '245,158,11';
        if (hex.includes('color-chorus2')) return '236,72,153';
        if (hex.includes('color-chorus')) return '239,68,68';
        if (hex.includes('color-bridge')) return '16,185,129';
        if (hex.includes('color-tag')) return '249,115,22';
    }

    let c = hex.substring(1);
    if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
    }
    let num = parseInt(c, 16);
    return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

function addEditorRow(mode) {
    saveEditorState(); // 📸 BACKUP
    editorSlides.push({ text: "", type: "normal" });
    renderEditor(mode);
    setTimeout(() => {
        const el = document.getElementById(`${mode}-input-${editorSlides.length - 1}`);
        if (el) el.focus();
    }, 10);
}

function deleteEditorRow(idx, mode) {
    saveEditorState(); // 📸 BACKUP
    editorSlides.splice(idx, 1);
    if (editorSlides.length === 0) editorSlides = [{ text: "", type: "normal" }];
    renderEditor(mode);
    isFormDirty = true;
}

function cycleTag(idx, mode) {
    saveEditorState(); // 📸 BACKUP
    const types = ['normal', 'verse', 'verse2', 'chorus', 'chorus2', 'pre', 'bridge', 'tag'];
    let current = types.indexOf(editorSlides[idx].type);
    editorSlides[idx].type = types[(current + 1) % types.length];
    renderEditor(mode);
    isFormDirty = true;
}

// FITUR PASTE PINTAR (Bisa mendeteksi spasi antar bait)
function parseSectionLabel(line, isStandaloneBlock) {
    const clean = line.trim().toLowerCase();
    // Remove enclosing brackets, parentheses, colons, and hyphens
    const unwrapped = clean.replace(/^\[|\]$|^\(|\)$/g, '').replace(/[:\-]/g, ' ').replace(/\s+/g, ' ').trim();

    // Explicit mappings
    if (unwrapped === 'verse 2' || unwrapped === 'v2') return 'verse2';
    if (unwrapped === 'verse' || unwrapped === 'verse 1' || unwrapped === 'v1') return 'verse';
    if (unwrapped === 'chorus 2' || unwrapped === 'c2' || unwrapped === 'reff 2') return 'chorus2';
    if (unwrapped === 'chorus' || unwrapped === 'chorus 1' || unwrapped === 'c1' || unwrapped === 'refrain' || unwrapped === 'reff' || unwrapped === 'ref') return 'chorus';
    if (unwrapped === 'pre chorus' || unwrapped === 'prechorus' || unwrapped === 'pre' || unwrapped === 'pc') return 'pre';
    if (unwrapped === 'bridge' || unwrapped === 'br') return 'bridge';
    if (unwrapped === 'outro' || unwrapped === 'tag' || unwrapped === 'ending') return 'tag';

    // Standalone or structured labels support short symbols
    const hasStructure = (clean.startsWith('[') && clean.endsWith(']')) || clean.endsWith(':') || (clean.startsWith('(') && clean.endsWith(')'));
    if (isStandaloneBlock || hasStructure) {
        if (unwrapped === 'v') return 'verse';
        if (unwrapped === 'c') return 'chorus';
        if (unwrapped === 'b') return 'bridge';
        if (unwrapped === 't' || unwrapped === 'o') return 'tag';
    }

    return null;
}

// FITUR PASTE PINTAR (Bisa mendeteksi spasi antar bait & label bagian)
async function smartBulkPaste(mode) {
    let text = "";
    try {
        if (navigator.clipboard && typeof navigator.clipboard.readText === "function") {
            text = await navigator.clipboard.readText();
        } else {
            throw new Error("Clipboard API not available or blocked");
        }
    } catch (err) {
        console.warn("Navigator clipboard read failed, falling back to manual paste dialog:", err);
        text = await showCustomDialog("textarea", "Clipboard access blocked or not supported by browser.<br>Please paste your lyrics below:", "");
    }

    if (text === null || text.trim() === "") return;

    saveEditorState(); // 📸 BACKUP

    // Normalize line endings
    text = text.trim().replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const lines = text.split('\n');
    const newSlides = [];
    let pendingType = 'normal';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;

        // Check if the line is a section label (e.g. verse, chorus)
        const detectedType = parseSectionLabel(line, true);
        if (detectedType) {
            pendingType = detectedType;
            continue;
        }

        // Add line as a separate slide
        newSlides.push({ text: line, type: pendingType });
        pendingType = 'normal'; // Reset back to default for the next slides
    }

    if (newSlides.length > 0) {
        editorSlides = newSlides;
        renderEditor(mode);
        isFormDirty = true;
    }
}

// ==========================================
// --- SMART SCHEDULE MANAGER (v1.17) ---
// ==========================================

// 1. BIKIN SCHEDULE BARU (KOSONGAN)
async function newSchedule() {
    if (scheduleList.length > 0) {
        const isOk = await showCustomDialog("confirm", "Create new schedule?<br>The current running order will be cleared.");
        if (!isOk) return;
    }
    scheduleList = [];
    document.getElementById("saved-sched-select").value = ""; // Reset dropdown
    lastSelectedSched = "";
    renderSchedule();
    await saveActiveSchedule();
}

// 2. SAVE SCHEDULE (BISA OVERWRITE ATAU BIKIN BARU)
async function saveCurrentSchedule() {
    let name = document.getElementById("saved-sched-select").value;

    // Kalau belum milih dari dropdown (bikin baru) atau sedang pilih __SHOW_ALL__
    if (!name || name === '__SHOW_ALL__') {
        if (scheduleList.length === 0) {
            showToast("Running Order is empty!", "error", 1500);
            return;
        }
        name = await showCustomDialog("prompt", "Name your new schedule<br><small>(e.g. Sunday Morning)</small>:");
        if (!name) return;
    } else {
        // Kalau udah milih, pastikan mau ditimpa
        const isOk = await showCustomDialog("confirm", `Update schedule <b>"${name}"</b> with the current running order?`);
        if (!isOk) return;
    }

    const payload = { name: name, items: scheduleList };
    await fetch('/api/schedules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

    showToast(`Schedule "${name}" saved!`, "success", 1500);

    // Refresh list dan otomatis pilih nama yang barusan disave
    await fetchSavedSchedules();
    const select = document.getElementById("saved-sched-select");
    if (select) {
        select.value = name;
        lastSelectedSched = name;
    }
}

// 3. LOAD SCHEDULE
async function loadSavedSchedule(targetName = null) {
    const name = targetName || document.getElementById("saved-sched-select").value;
    if (!name || name === '__SHOW_ALL__') { showToast("Select a schedule from the dropdown!", "error", 1500); return; }
    const isOk = await showCustomDialog("confirm", `Load running order <b>"${name}"</b>?`);
    if (!isOk) return;

    // Pastikan data lama mendukung backward compatibility (ubah ke format notes v1.15 jika perlu)
    const rawData = savedSchedules[name];
    const items = (rawData && typeof rawData === 'object' && !Array.isArray(rawData) && Array.isArray(rawData.items)) ? rawData.items : (Array.isArray(rawData) ? rawData : []);
    scheduleList = items.map(item => typeof item === 'string' ? { title: item, note: '' } : item);

    renderSchedule();
    await saveActiveSchedule();

    const select = document.getElementById("saved-sched-select");
    if (select && savedSchedules[name]) {
        select.value = name;
        lastSelectedSched = name;
    }
}

// 4. DELETE SCHEDULE
async function deleteSavedSchedule(targetName = null) {
    const name = targetName || document.getElementById("saved-sched-select").value;
    if (!name || name === '__SHOW_ALL__') { showToast("Select a schedule to delete!", "error", 1500); return; }
    const isOk = await showCustomDialog("confirm", `Delete schedule <b>"${name}"</b> permanently?`);
    if (!isOk) return;

    await fetch(`/api/schedules/${encodeURIComponent(name)}`, { method: 'DELETE' });
    delete savedSchedules[name];
    showToast(`Schedule "${name}" deleted!`, "success", 1500);
    await fetchSavedSchedules();

    const select = document.getElementById("saved-sched-select");
    if (select && select.value === name) {
        select.value = "";
        lastSelectedSched = "";
    }
}

// ==========================================
// --- ALL SAVED SCHEDULES MODAL FUNCTIONS ---
// ==========================================
let modalSchedulesFilterQuery = "";

function handleSavedSchedChange(el) {
    if (!el) return;
    if (el.value === "__SHOW_ALL__") {
        el.value = (lastSelectedSched && lastSelectedSched !== '__SHOW_ALL__') ? lastSelectedSched : "";
        openAllSchedulesModal();
    } else {
        lastSelectedSched = el.value;
    }
}

function formatScheduleDate(dateStr) {
    if (!dateStr) return "-";
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        const day = String(d.getDate()).padStart(2, '0');
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const month = months[d.getMonth()];
        const year = d.getFullYear();
        const hours = String(d.getHours()).padStart(2, '0');
        const mins = String(d.getMinutes()).padStart(2, '0');
        return `${day} ${month} ${year}, ${hours}:${mins}`;
    } catch (e) {
        return dateStr || "-";
    }
}

function openAllSchedulesModal() {
    const modal = document.getElementById("all-schedules-modal");
    if (!modal) return;
    const searchInput = document.getElementById("modal-sched-search");
    if (searchInput) {
        searchInput.value = "";
        modalSchedulesFilterQuery = "";
    }
    renderModalSchedules();
    modal.style.display = "flex";
    modal.style.opacity = "1";
    setTimeout(() => { if (searchInput) searchInput.focus(); }, 100);
}

function closeAllSchedulesModal() {
    safeCloseModal("all-schedules-modal");
}

function filterModalSchedules(query) {
    modalSchedulesFilterQuery = (query || "").trim().toLowerCase();
    renderModalSchedules();
}

function renderModalSchedules() {
    const container = document.getElementById("modal-sched-list");
    const countEl = document.getElementById("modal-sched-count");
    if (!container) return;

    container.innerHTML = "";

    let allKeys = Object.keys(savedSchedules || {});
    // Sort by updated_at descending if available, else keep order
    allKeys.sort((a, b) => {
        const dataA = savedSchedules[a];
        const dataB = savedSchedules[b];
        const dateA = (dataA && typeof dataA === 'object' && !Array.isArray(dataA) && dataA.updated_at) ? new Date(dataA.updated_at).getTime() : 0;
        const dateB = (dataB && typeof dataB === 'object' && !Array.isArray(dataB) && dataB.updated_at) ? new Date(dataB.updated_at).getTime() : 0;
        if (dateA && dateB) return dateB - dateA;
        if (dateA) return -1;
        if (dateB) return 1;
        return 0;
    });

    const filteredKeys = modalSchedulesFilterQuery 
        ? allKeys.filter(name => name.toLowerCase().includes(modalSchedulesFilterQuery))
        : allKeys;

    if (countEl) {
        countEl.innerText = `Total: ${allKeys.length} schedules${modalSchedulesFilterQuery ? ` (${filteredKeys.length} filtered)` : ''}`;
    }

    if (filteredKeys.length === 0) {
        const emptyDiv = document.createElement("div");
        emptyDiv.className = "modal-sched-empty";
        if (allKeys.length === 0) {
            emptyDiv.innerHTML = '<span style="font-size: 2em;">📭</span><div>No saved schedules found yet.<br><small style="color: #666;">Create and save schedules from the Running Order sidebar.</small></div>';
        } else {
            const safeQuery = modalSchedulesFilterQuery.replace(/</g, "&lt;").replace(/>/g, "&gt;");
            emptyDiv.innerHTML = `<span style="font-size: 2em;">🔍</span><div>No schedules match "<b>${safeQuery}</b>"</div>`;
        }
        container.appendChild(emptyDiv);
        return;
    }

    filteredKeys.forEach(name => {
        const rawData = savedSchedules[name];
        const items = (rawData && typeof rawData === 'object' && !Array.isArray(rawData) && Array.isArray(rawData.items)) ? rawData.items : (Array.isArray(rawData) ? rawData : []);
        const updatedAt = (rawData && typeof rawData === 'object' && !Array.isArray(rawData)) ? rawData.updated_at : null;
        const dateFormatted = formatScheduleDate(updatedAt);

        const itemEl = document.createElement("div");
        itemEl.className = "modal-sched-item";

        const infoDiv = document.createElement("div");
        infoDiv.className = "modal-sched-info";

        const titleDiv = document.createElement("div");
        titleDiv.className = "modal-sched-title";
        titleDiv.innerText = name;
        titleDiv.title = name;

        const metaDiv = document.createElement("div");
        metaDiv.className = "modal-sched-meta";

        const timeSpan = document.createElement("span");
        timeSpan.innerText = `🕒 ${dateFormatted}`;

        const badgeSpan = document.createElement("span");
        badgeSpan.className = "modal-sched-badge";
        badgeSpan.innerText = `${items.length} items`;

        metaDiv.appendChild(timeSpan);
        metaDiv.appendChild(badgeSpan);
        infoDiv.appendChild(titleDiv);
        infoDiv.appendChild(metaDiv);

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "modal-sched-actions";

        const loadBtn = document.createElement("button");
        loadBtn.className = "btn-mini btn-load";
        loadBtn.innerText = "📂 LOAD";
        loadBtn.title = `Load "${name}"`;
        loadBtn.addEventListener("click", () => loadScheduleFromModal(name));

        const delBtn = document.createElement("button");
        delBtn.className = "btn-mini btn-del";
        delBtn.innerText = "🗑️";
        delBtn.title = `Delete "${name}"`;
        delBtn.addEventListener("click", () => deleteScheduleFromModal(name));

        actionsDiv.appendChild(loadBtn);
        actionsDiv.appendChild(delBtn);

        itemEl.appendChild(infoDiv);
        itemEl.appendChild(actionsDiv);
        container.appendChild(itemEl);
    });
}

async function loadScheduleFromModal(name) {
    if (!name || !savedSchedules[name]) return;
    const isOk = await showCustomDialog("confirm", `Load running order <b>"${name}"</b>?`);
    if (!isOk) return;

    const rawData = savedSchedules[name];
    const items = (rawData && typeof rawData === 'object' && !Array.isArray(rawData) && Array.isArray(rawData.items)) ? rawData.items : (Array.isArray(rawData) ? rawData : []);
    scheduleList = items.map(item => typeof item === 'string' ? { title: item, note: '' } : item);

    renderSchedule();
    await saveActiveSchedule();

    const select = document.getElementById("saved-sched-select");
    if (select) {
        select.value = name;
        lastSelectedSched = name;
    }

    closeAllSchedulesModal();
    showToast(`Schedule "${name}" loaded!`, "success", 1500);
}

async function deleteScheduleFromModal(name) {
    if (!name || !savedSchedules[name]) return;
    const isOk = await showCustomDialog("confirm", `Delete schedule <b>"${name}"</b> permanently?`);
    if (!isOk) return;

    // Optimistic UI update: remove item from modal immediately
    delete savedSchedules[name];
    renderModalSchedules();

    try {
        await fetch(`/api/schedules/${encodeURIComponent(name)}`, { method: 'DELETE' });
    } catch (e) {
        console.error("Failed to delete schedule on backend:", e);
    }

    showToast(`Schedule "${name}" deleted!`, "success", 1500);

    // Refresh main dropdown in background
    await fetchSavedSchedules();

    const select = document.getElementById("saved-sched-select");
    if (select && select.value === name) {
        select.value = "";
        lastSelectedSched = "";
    }
}

function toggleGlobalMode() {
    const isForce = document.getElementById("force-global").checked;
    if (isForce) {
        const name = document.getElementById("global-preset-select").value;
        if (name && dispPresetsData[name]) {
            applyDisplayPresetToUI(dispPresetsData[name]);
            updateSettings();
        }
    } else {
        // Balik ke DNA lagu asli
        if (currentSongTitle) loadSong(currentSongTitle);
    }
}

function updateStyleButtonsUI(mode) {
    const btnCustom = document.getElementById("btn-mode-custom");
    const btnPreset = document.getElementById("btn-mode-preset");
    const presetControls = document.getElementById("song-preset-controls");
    const textEditorBlock = document.getElementById("text-editor-block");

    if (mode === 'custom') {
        btnCustom.style.background = "#00e5ff"; btnCustom.style.color = "#000";
        btnPreset.style.background = "#222"; btnPreset.style.color = "#aaa";
        presetControls.style.display = "none";
        if (textEditorBlock) textEditorBlock.style.display = "block";
    } else {
        btnPreset.style.background = "#00e5ff"; btnPreset.style.color = "#000";
        btnCustom.style.background = "#222"; btnCustom.style.color = "#aaa";
        presetControls.style.display = "block";
        if (textEditorBlock) textEditorBlock.style.display = "none";
    }
}

function updateOutputLinks() {
    const host = window.location.hostname || 'localhost';
    const port = window.location.port ? `${window.location.port}` : '';
    const prefix = `${window.location.protocol}//${host}${port ? ':' + port : ''}`;

    const links = [
        { id: 'output-link-display', path: '/display', label: 'DISPLAY' },
        { id: 'output-link-lowerthird', path: '/lowerthird', label: 'LOWERTHIRD' },
        { id: 'output-link-foldback', path: '/foldback', label: 'FOLDBACK' }
    ];

    links.forEach(link => {
        const el = document.getElementById(link.id);
        if (!el) return;
        const url = `${prefix}${link.path}`;
        el.href = url;
        el.innerText = `${link.label}: ${url}`;
    });
}

function setSongStyleMode(mode) {
    const oldMode = document.getElementById("current-disp-mode").value;
    // Kalau pindah dari Custom ke Preset, simpan dulu editan custom-nya
    if (oldMode === 'custom' && mode === 'preset') currentSongCustomSettings = getDisplayConfigFromUI();

    document.getElementById("current-disp-mode").value = mode;
    updateStyleButtonsUI(mode);

    // Sesi Override (Walaupun Global ON, pas tombol ini diklik, layar ikut berubah)
    if (mode === 'custom') { applyDisplayPresetToUI(currentSongCustomSettings); }
    else {
        const pName = document.getElementById("song-preset-select").value;
        if (pName && dispPresetsData[pName]) applyDisplayPresetToUI(dispPresetsData[pName]);
    }
    updateSettings();
}
function applySongStyle() {
    const pName = document.getElementById("song-preset-select").value;
    if (pName && dispPresetsData[pName]) {
        applyDisplayPresetToUI(dispPresetsData[pName]);
        updateSettings();
    }
}

// ==========================================
// --- CUSTOM DIALOG ENGINE (UPGRADED + DROPDOWN) ---
// ==========================================
function showCustomDialog(type, message, defaultValue = "", currentSelected = "") {
    // Hide progress/toast modal if open, so it doesn't block the dialog
    const toastModal = document.getElementById("save-progress-modal");
    if (toastModal) {
        toastModal.style.display = "none";
    }

    return new Promise((resolve) => {
        const overlay = document.getElementById("dialog-overlay");
        const title = document.getElementById("dialog-title");
        const msg = document.getElementById("dialog-msg");
        const input = document.getElementById("dialog-input");
        const btnOk = document.getElementById("dialog-btn-ok");
        const btnCancel = document.getElementById("dialog-btn-cancel");

        msg.innerHTML = message;
        overlay.style.display = "flex";

        btnCancel.style.display = ""; // Restore default display style

        // Bersihkan select/dropdown lama kalau ada
        let existingSelect = document.getElementById("dialog-select-dynamic");
        if (existingSelect) existingSelect.remove();

        let existingTextarea = document.getElementById("dialog-textarea-dynamic");
        if (existingTextarea) existingTextarea.remove();

        let selectEl = null;
        let textareaEl = null;

        if (type === "alert") {
            title.innerText = "ℹ️ INFORMATION";
            title.style.color = "#00e5ff";
            overlay.querySelector('.modal-box').style.borderColor = "#00e5ff";
            btnOk.style.background = "#00e5ff"; btnOk.style.color = "#000";
            input.style.display = "none";
            btnCancel.style.display = "none";

        } else if (type === "prompt") {
            title.innerText = "📝 INPUT";
            title.style.color = "#ffc107";
            overlay.querySelector('.modal-box').style.borderColor = "#ffc107";
            btnOk.style.background = "#ffc107"; btnOk.style.color = "#000";
            input.style.display = "block";
            input.value = defaultValue;
            setTimeout(() => input.focus(), 100);

        } else if (type === "confirm") {
            title.innerText = "⚠️ CONFIRMATION";
            title.style.color = "#dc3545";
            overlay.querySelector('.modal-box').style.borderColor = "#dc3545";
            btnOk.style.background = "#dc3545"; btnOk.style.color = "#fff";
            input.style.display = "none";

        } else if (type === "select") {
            // 🎯 TIPE BARU: DROPDOWN MENU
            title.innerText = "📁 SELECT FOLDER";
            title.style.color = "#00e5ff";
            overlay.querySelector('.modal-box').style.borderColor = "#00e5ff";
            btnOk.style.background = "#00e5ff"; btnOk.style.color = "#000";
            input.style.display = "none";

            // Cetak elemen dropdown secara on-the-fly
            selectEl = document.createElement("select");
            selectEl.id = "dialog-select-dynamic";
            selectEl.className = "compact-input";
            selectEl.style.width = "100%";
            selectEl.style.marginTop = "15px";
            selectEl.style.padding = "10px";
            selectEl.style.fontSize = "1em";
            selectEl.style.cursor = "pointer";

            // Masukin pilihan (options) ke dalem dropdown
            defaultValue.forEach(opt => {
                const option = document.createElement("option");
                option.value = opt.value;
                option.innerHTML = opt.label;

                // 🎯 FIX BUG 2: TAMPILIN YANG LAGI KEPILIH
                if (opt.value === currentSelected) option.selected = true;

                selectEl.appendChild(option);
            });
            msg.appendChild(selectEl);
            setTimeout(() => selectEl.focus(), 100)

        } else if (type === "textarea") {
            // 🎯 TIPE BARU: TEXTAREA
            title.innerText = "📋 PASTE LYRICS";
            title.style.color = "#00e5ff";
            overlay.querySelector('.modal-box').style.borderColor = "#00e5ff";
            btnOk.style.background = "#00e5ff"; btnOk.style.color = "#000";
            input.style.display = "none";

            textareaEl = document.createElement("textarea");
            textareaEl.id = "dialog-textarea-dynamic";
            textareaEl.className = "compact-input";
            textareaEl.placeholder = defaultValue || "Paste your lyrics here (Ctrl+V)...";
            textareaEl.style.width = "100%";
            textareaEl.style.height = "180px";
            textareaEl.style.marginTop = "15px";
            textareaEl.style.padding = "10px";
            textareaEl.style.fontSize = "1.05em";
            textareaEl.style.background = "#222";
            textareaEl.style.color = "#fff";
            textareaEl.style.border = "1px solid #444";
            textareaEl.style.borderRadius = "4px";
            textareaEl.style.resize = "vertical";

            msg.appendChild(textareaEl);
            setTimeout(() => textareaEl.focus(), 100);
        }

        const cleanup = () => {
            overlay.style.display = "none";
            btnOk.onclick = null;
            btnCancel.onclick = null;
            input.onkeydown = null;
            if (selectEl) selectEl.remove();
            if (textareaEl) textareaEl.remove();
        };

        btnOk.onclick = () => {
            cleanup();
            if (type === "prompt") resolve(input.value);
            else if (type === "select") resolve(selectEl.value);
            else if (type === "textarea") resolve(textareaEl.value);
            else resolve(true);
        };
        btnCancel.onclick = () => {
            cleanup();
            resolve(type === "prompt" || type === "select" || type === "textarea" ? null : false);
        };

        input.onkeydown = (e) => {
            if (e.key === "Enter") btnOk.click();
            if (e.key === "Escape") btnCancel.click();
        };
        if (selectEl) {
            selectEl.onkeydown = (e) => {
                if (e.key === "Enter") btnOk.click();
                if (e.key === "Escape") btnCancel.click();
            };
        }
        if (textareaEl) {
            textareaEl.onkeydown = (e) => {
                if (e.key === "Escape") btnCancel.click();
            };
        }
    });
}

// ==========================================
// --- WINDOWS LOCAL FONT MATCHER ---
// ==========================================
async function loadWindowsFonts() {
    const datalistMain = document.getElementById("font-datalist");
    const datalistLt = document.getElementById("lt-font-datalist"); // <--- Tambahan buat LT
    const datalistAlert = document.getElementById("alert-font-datalist"); // <--- Tambahan buat Alert
    const datalistScr = document.getElementById("scr-font-datalist"); // <--- Tambahan buat Scripture
    const datalistSub = document.getElementById("sub-font-datalist"); // <--- JOB 3: Bilingual sub font
    const datalistPlugin = document.getElementById("plugin-font-datalist"); // <--- Tambahan buat Plugin

    try {
        const availableFonts = await window.queryLocalFonts();

        const fontFamilies = new Set();
        availableFonts.forEach(font => fontFamilies.add(font.family));

        datalistMain.innerHTML = "";
        if (datalistLt) datalistLt.innerHTML = "";
        if (datalistAlert) datalistAlert.innerHTML = "";
        if (datalistScr) datalistScr.innerHTML = "";
        if (datalistSub) datalistSub.innerHTML = "";
        if (datalistPlugin) datalistPlugin.innerHTML = "";

        const sortedFonts = Array.from(fontFamilies).sort();

        sortedFonts.forEach(family => {
            const opt1 = document.createElement("option"); opt1.value = family;
            datalistMain.appendChild(opt1);

            if (datalistLt) {
                const opt2 = document.createElement("option"); opt2.value = family;
                datalistLt.appendChild(opt2);
            }
            if (datalistAlert) {
                const opt3 = document.createElement("option"); opt3.value = family;
                datalistAlert.appendChild(opt3);
            }
            if (datalistScr) {
                const opt4 = document.createElement("option"); opt4.value = family;
                datalistScr.appendChild(opt4);
            }
            if (datalistSub) {
                const opt5 = document.createElement("option"); opt5.value = family;
                datalistSub.appendChild(opt5);
            }
            if (datalistPlugin) {
                const opt6 = document.createElement("option"); opt6.value = family;
                datalistPlugin.appendChild(opt6);
            }
        });

        console.log(`✅ Loaded ${sortedFonts.length} fonts from Windows for Lyrics, LT, Alert, Scripture, Sub & Plugin!`);
    } catch (err) {
        console.error("Failed to load Windows fonts:", err);
        const fallbackFonts = ["Arial", "Calibri", "Cambria", "Comic Sans MS", "Consolas", "Courier New", "Georgia", "Impact", "Segoe UI", "Tahoma", "Times New Roman", "Trebuchet MS", "Verdana"];
        fallbackFonts.forEach(family => {
            const opt1 = document.createElement("option"); opt1.value = family;
            datalistMain.appendChild(opt1);
            if (datalistLt) {
                const opt2 = document.createElement("option"); opt2.value = family;
                datalistLt.appendChild(opt2);
            }
            if (datalistAlert) {
                const opt3 = document.createElement("option"); opt3.value = family;
                datalistAlert.appendChild(opt3);
            }
            if (datalistScr) {
                const opt4 = document.createElement("option"); opt4.value = family;
                datalistScr.appendChild(opt4);
            }
            if (datalistSub) {
                const opt5 = document.createElement("option"); opt5.value = family;
                datalistSub.appendChild(opt5);
            }
        });
    }
}
// ==========================================
// --- AUTO-INJECT FONT (GOOGLE + LOCAL) ---
// ==========================================
function injectFont(fontName) {
    if (!fontName) return;
    const linkId = "font-link-" + fontName.replace(/\s+/g, '-').toLowerCase();
    if (document.getElementById(linkId)) return;

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}&display=swap`;
    link.onerror = () => { console.log(`ℹ️ Font "${fontName}" is using local Windows version.`); };
    document.head.appendChild(link);
}

// ==========================================
// --- ALERT & MESSAGE TOGGLE ENGINE ---
// ==========================================
let isAlertOn = false;
let isMessageOn = false;



function toggleMessage() {
    isMessageOn = !isMessageOn; // Balik statenya
    const btn = document.getElementById("btn-toggle-msg");

    // 1. Ambil Data UI
    const text = document.getElementById("stage-input").value;
    const flash = document.getElementById("chk-flash").checked;

    // 2. Ubah Tampilan Tombol
    if (isMessageOn) {
        btn.innerHTML = "🛑 HIDE MESSAGE";
        btn.style.background = "#dc3545"; // Merah
    } else {
        btn.innerHTML = "💬 SHOW MESSAGE";
        btn.style.background = "#28a745"; // Hijau
    }

    // 3. Update Kedip NAV
    updateNavBlinker();

    // 4. Kirim ke Layar Panggung via WebSocket
    ws.send(JSON.stringify({
        action: "stage_msg",
        payload: { text: text, show: isMessageOn, flash: flash }
    }));
}

function quickStageMsg(text) {
    document.getElementById("stage-input").value = text;
    if (!isMessageOn) {
        toggleMessage(); // Kalau lagi mati, nyalain otomatis
    } else {
        // Kalau udah nyala, tembak pesannya aja biar ke-update
        ws.send(JSON.stringify({
            action: "stage_msg",
            payload: { text: text, show: true, flash: document.getElementById("chk-flash").checked }
        }));
    }
}

function updateNavBlinker() {
    const navBtn = document.getElementById("nav-btn-alert");
    if (!navBtn) return;

    // Bersihin semua class kedip dulu
    navBtn.classList.remove("nav-blink-alert", "nav-blink-msg", "nav-blink-both");

    // Pasang class sesuai kondisi
    if (isAlertOn && isMessageOn) {
        navBtn.classList.add("nav-blink-both"); // Kedip Merah-Kuning
    } else if (isAlertOn) {
        navBtn.classList.add("nav-blink-alert"); // Kedip Merah-Abu
    } else if (isMessageOn) {
        navBtn.classList.add("nav-blink-msg"); // Kedip Kuning-Abu
    } else {
        // Normal
        navBtn.style.background = "";
        navBtn.style.color = "";
    }
}
let editorHistory = []; // Memori Penyimpanan Undo

// Fungsi Memfoto State (Backup)
function saveEditorState() {
    const currentState = JSON.stringify(editorSlides);
    const lastState = editorHistory.length > 0 ? JSON.stringify(editorHistory[editorHistory.length - 1]) : "";
    // Jangan simpan kalau datanya sama persis
    if (currentState !== lastState) {
        editorHistory.push(JSON.parse(currentState));
        if (editorHistory.length > 30) editorHistory.shift(); // Maksimal nyimpen 30 riwayat biar RAM enteng
    }
}

// Fungsi Mundur ke Masa Lalu (Ctrl+Z)
function undoEditorState(mode) {
    if (editorHistory.length > 0) {
        editorSlides = editorHistory.pop();
        renderEditor(mode);
        isFormDirty = true;
    }
}

let currentActiveLTPreset = "- Custom / Unsaved -";

function updateLTBadge() {
    const badge = document.getElementById("lt-active-badge");
    if (badge) badge.innerText = currentActiveLTPreset;
}

// Fungsi kalau user iseng ganti angka manual, statusnya jadi Custom
function markLtCustom() {
    let base = currentActiveLTPreset;
    if (base.startsWith("DEFAULT - ")) {
        base = base.replace("DEFAULT - ", "");
    }
    if (base !== "- Custom / Unsaved -" && base !== "- Custom (Edited) -" && !base.endsWith(" (EDITED)")) {
        currentActiveLTPreset = base + " (EDITED)";
    } else if (base === "- Custom / Unsaved -") {
        currentActiveLTPreset = "- Custom (Edited) -";
    }
    updateLTBadge();
}

let currentActiveFBPreset = "- Custom / Unsaved -";

function updateFBBadge() {
    const badge = document.getElementById("fb-active-badge");
    if (badge) badge.innerText = currentActiveFBPreset;
}

function markFbCustom() {
    let base = currentActiveFBPreset;
    if (base.startsWith("DEFAULT - ")) {
        base = base.replace("DEFAULT - ", "");
    }
    if (base !== "- Custom / Unsaved -" && base !== "- Custom (Edited) -" && !base.endsWith(" (EDITED)")) {
        currentActiveFBPreset = base + " (EDITED)";
    } else if (base === "- Custom / Unsaved -") {
        currentActiveFBPreset = "- Custom (Edited) -";
    }
    updateFBBadge();
}

function updateLTPosUI(pos) {
    document.getElementById("btn-lt-top").style.background = (pos === 'top') ? '#007bff' : 'transparent';
    document.getElementById("btn-lt-top").style.color = (pos === 'top') ? '#fff' : '#aaa';

    document.getElementById("btn-lt-center").style.background = (pos === 'center') ? '#007bff' : 'transparent';
    document.getElementById("btn-lt-center").style.color = (pos === 'center') ? '#fff' : '#aaa';

    document.getElementById("btn-lt-bottom").style.background = (pos === 'bottom') ? '#007bff' : 'transparent';
    document.getElementById("btn-lt-bottom").style.color = (pos === 'bottom') ? '#fff' : '#aaa';
}

function setLTPresetUI(pos) {
    document.getElementById('lt-pos-mode').value = pos;

    if (pos === 'bottom') document.getElementById('lt-margin').value = 80;
    if (pos === 'top') document.getElementById('lt-margin').value = 80;
    if (pos === 'center') document.getElementById('lt-margin').value = 0;

    updateLTPosUI(pos);
    markLtCustom();
    sendLTConfig();
}

function selectVisualPreset(name) {
    // Update Data Tersembunyi
    document.getElementById("global-preset-select").value = name;
    document.getElementById("selected-preset-label").innerText = name;

    // Update Visual Stabilo Kartu (Emas/Kuning)
    document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));
    const activeCard = document.getElementById(`preset-card-${name.replace(/\s+/g, '-')}`);
    if (activeCard) activeCard.classList.add('active');

    // Kalau switch Global lagi ON, langsung ganti baju layarnya!
    if (document.getElementById("force-global").checked) {
        applyDisplayPresetToUI(dispPresetsData[name]);
        updateSettings(); // Tembak ke proyektor
    }
}

// ==========================================
// --- SCHEDULE BUNDLER LOGIC ---

async function exportSchedule() {
    const schedName = document.getElementById("saved-sched-select").value;

    if (!schedName) {
        showToast("Select a schedule from the dropdown first!", "error", 1500);
        return;
    }

    showMiniToast("📦 Processing export schedule...", "loading", 0, "export-zip-toast");

    try {
        if (typeof window.electronAPI !== "undefined" && typeof window.electronAPI.exportScheduleElectron === "function") {
            const result = await window.electronAPI.exportScheduleElectron(schedName);
            if (result.status === "success") {
                showMiniToast("✅ Export completed successfully!", "success", 3000, "export-zip-toast");
            } else if (result.status === "canceled") {
                const toast = document.getElementById("export-zip-toast");
                if (toast) toast.remove();
            } else {
                throw new Error(result.message || "Failed to save file");
            }
        } else {
            const res = await fetch(`/api/export_bundle/${schedName}`);
            if (!res.ok) throw new Error("HTTP error " + res.status);

            const blob = await res.blob();

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${schedName}_bundle.zip`;
            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);

            showMiniToast("✅ Export completed successfully!", "success", 3000, "export-zip-toast");
        }
    } catch (e) {
        console.error("Export error:", e);
        showMiniToast("❌ Export failed!", "error", 4000, "export-zip-toast");
    }
}

async function importBundle(input) {
    if (input.files.length === 0) return;
    const file = input.files[0];

    if (!file.name.endsWith('.zip')) {
        showToast("File must be in .zip format!", "error", 1500);
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    const labelBtn = document.querySelector("label[for='import-bundle']");
    const originalText = labelBtn.innerHTML;
    labelBtn.innerHTML = "⏳";

    showMiniToast("📥 Processing import schedule...", "loading", 0, "import-zip-toast");

    try {
        const res = await fetch("/api/import_bundle", { method: "POST", body: formData });
        const data = await res.json();

        if (data.status === "success") {
            showMiniToast("✅ Import completed successfully!", "success", 3000, "import-zip-toast");
            setTimeout(() => {
                window.location.reload();
            }, 1200);
        } else {
            showMiniToast("❌ Import failed: " + data.message, "error", 4000, "import-zip-toast");
        }
    } catch (e) {
        console.error("Bundle import error:", e);
        showMiniToast("❌ Import failed!", "error", 4000, "import-zip-toast");
    }

    labelBtn.innerHTML = originalText;
    input.value = "";
}

// --- SMART SAVE BUTTON (DIRTY CHECKER) ---
// ==========================================
function markSongUnsaved() {
    if (!currentSongTitle) return; // Kalau gaada lagu yg diload, diamkan
    const btn = document.querySelector(".tool-btn.save");
    if (btn) {
        btn.classList.add("btn-unsaved");
        btn.querySelector("span").innerText = "⚠️ SAVE EDIT";
    }
}

function markSongSaved() {
    const btn = document.querySelector(".tool-btn.save");
    if (btn) {
        btn.classList.remove("btn-unsaved");
        btn.querySelector("span").innerText = "SAVE EDIT";
    }
}

// ==========================================
// --- CONSOLE.LOG INTERCEPTOR (PENYADAP) ---
// ==========================================
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

// Ambil nama file saat ini biar tau log-nya dari mana (misal: "resolume" atau "display")
const pageSource = window.location.pathname.replace('/', '') || 'index';

function sendLogToServer(level, args) {
    try {
        // Ubah object/array jadi string biar bisa dikirim
        const msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: "frontend_log",
                payload: { source: pageSource, level: level, message: msg }
            }));
        }
    } catch (e) { } // Abaikan kalau gagal ngirim (biar ga error loop)
}

console.log = function () {
    originalLog.apply(console, arguments);
    sendLogToServer("INFO", arguments);
};
console.warn = function () {
    originalWarn.apply(console, arguments);
    sendLogToServer("WARN", arguments);
};
console.error = function () {
    originalError.apply(console, arguments);
    sendLogToServer("ERROR", arguments);
};
// ==========================================

function updateTextPreview(triggerLiveSync = true) {
    document.getElementById('val-font-size').innerText = document.getElementById("font-size-input").value + 'px';
    if (document.getElementById("text-wrap-input")) {
        document.getElementById('val-text-wrap').innerText = document.getElementById("text-wrap-input").value + '%';
    }
    if (document.getElementById("margin-x-input")) {
        document.getElementById('val-margin-x').innerText = document.getElementById("margin-x-input").value + '%';
    }
    if (document.getElementById("line-height-input")) {
        const lhVal = parseFloat(document.getElementById("line-height-input").value);
        document.getElementById('val-line-height').innerText = lhVal.toFixed(2).replace(/0$/, '');
    }
    document.getElementById('val-glow').innerText = document.getElementById("glow-input").value;
    document.getElementById('val-stroke').innerText = document.getElementById("stroke-size-input").value + 'px';
    document.getElementById('val-shadow').innerText = document.getElementById("shadow-int-input").value;

    const zoomInput = document.getElementById("zoom-input");
    const speedInput = document.getElementById("speed-input");
    if (zoomInput && speedInput) {
        if (zoomInput.value === 'stay') {
            speedInput.disabled = true;
            speedInput.style.opacity = '0.5';
            speedInput.style.pointerEvents = 'none';
        } else {
            speedInput.disabled = false;
            speedInput.style.opacity = '1';
            speedInput.style.pointerEvents = 'auto';
        }
    }

    if (triggerLiveSync) updateSettings();
}
let modalPreviewResizeScheduled = false;
function scaleModalPreview() {
    if (modalPreviewResizeScheduled) return;
    modalPreviewResizeScheduled = true;
    window.requestAnimationFrame(() => {
        const wrapper = document.getElementById("modal-preview-wrapper");
        const frame = document.getElementById("modal-preview-frame");
        if (wrapper && frame && activeIframeModalId === 'text-edit-modal') {
            frame.style.transform = `scale(${wrapper.offsetWidth / 1920})`;
        }
        modalPreviewResizeScheduled = false;
    });
}
window.addEventListener("resize", scaleModalPreview);

let textState = { bold: false, italic: false, underline: false };

// JOB 3: Sub-lang style state (B/I/U + font)
let subTextState = { bold: false, italic: true, underline: false };

function toggleFormat(type) {
    textState[type] = !textState[type];
    const btn = document.getElementById('btn-' + type);
    if (btn) {
        if (textState[type]) btn.classList.add('active');
        else btn.classList.remove('active');
    }
    updateTextPreview();
}

// JOB 3: Toggle sub-lang bold/italic/underline
function toggleSubFormat(type) {
    subTextState[type] = !subTextState[type];
    const btn = document.getElementById('sub-btn-' + type);
    if (btn) {
        if (subTextState[type]) btn.classList.add('active');
        else btn.classList.remove('active');
    }
    updateSettings();
}

// FIX: External handler for sub-size range input (no inline JS logic)
function onSubSizeInput(el) {
    const span = document.getElementById('val-sub-size');
    if (span) span.innerText = el.value + 'em';
    updateSettings();
}

// FIX: Handle Follow Main Font checkbox toggle
function handleSubFontFollowChange() {
    const chk = document.getElementById('sub-font-follow');
    const inp = document.getElementById('sub-font-input');
    if (!chk || !inp) return;
    inp.disabled = chk.checked;
    if (chk.checked) inp.value = '';
    updateSettings();
}

// JOB 1: Handle transition change — disable Fade Speed when CUT is selected
function handleTransitionChange() {
    const trans = document.getElementById('trans-input');
    const fadeSlider = document.getElementById('fade-input');
    const fadeLabel = document.getElementById('val-fade');
    const fadeControl = fadeSlider ? fadeSlider.closest('.te-control') : null;
    if (!trans || !fadeSlider) return;
    const isCut = trans.value === 'cut';
    fadeSlider.disabled = isCut;
    if (fadeControl) {
        fadeControl.classList.toggle('te-control-disabled', isCut);
    }
    updateTextPreview();
}

function toggleColorUI() {
    const type = document.getElementById("color-type-input").value;
    document.getElementById("color2-input").style.display = (type === 'gradient') ? 'block' : 'none';
    document.getElementById("color-angle-input").style.display = (type === 'gradient') ? 'block' : 'none';
}

function toggleGlowUI() {
    const type = document.getElementById("glow-type-input").value;
    const wrap = document.getElementById("glow-colors-wrap");
    const c2 = document.getElementById("glow-c2-input");
    const ang = document.getElementById("glow-angle-input");

    if (type === 'text') { wrap.style.display = 'none'; }
    else if (type === 'solid') { wrap.style.display = 'flex'; c2.style.display = 'none'; ang.style.display = 'none'; }
    else { wrap.style.display = 'flex'; c2.style.display = 'block'; ang.style.display = 'block'; }
}

function applyThemePreset() {
    const theme = document.getElementById("theme-input").value;
    const presets = THEME_DEFAULTS[theme] || THEME_DEFAULTS["_fallback"];

    // FORCE RESET SEMUA SLIDER DI MODAL TYPOGRAPHY
    document.getElementById("glow-input").value = presets.glow;
    document.getElementById("val-glow").innerText = presets.glow;

    document.getElementById("shadow-int-input").value = presets.shadow_int;
    document.getElementById("val-shadow").innerText = presets.shadow_int;

    document.getElementById("stroke-size-input").value = presets.stroke_size;
    document.getElementById("val-stroke").innerText = presets.stroke_size + 'px';

    if (presets.color_type) {
        document.getElementById("color-type-input").value = presets.color_type;
        toggleColorUI();
    }
    if (presets.glow_type) {
        document.getElementById("glow-type-input").value = presets.glow_type;
        toggleGlowUI();
    }

    // SETELAH DIRESET, TEMBAK KE PROYEKTOR
    updateSettings();
}
// ==========================================
// --- FORCE CLOSE TOAST (ON CLICK) ---
// ==========================================
function forceCloseToast(event) {
    const modal = document.getElementById("save-progress-modal");
    if (!modal) return;

    const titleEl = document.getElementById("save-title");
    const titleText = titleEl ? titleEl.innerText : "";

    // SAFETY LOCK: Jangan izinkan tutup kalau masih proses Saving / Processing
    if (titleText !== "SAVING DATA" && titleText !== "PROCESSING") {
        clearTimeout(toastTimeout);
        modal.style.display = "none";
    }
}

// Fungsi nangkep video yang di-drop ke kotak lirik
function handleSlideDrop(event, targetIndex) {
    event.preventDefault();
    event.stopPropagation();
    try {
        const data = JSON.parse(event.dataTransfer.getData("text/plain"));

        // 🎯 BERSIHKAN KELAS DRAG
        const box = document.getElementById(`box-${targetIndex}`);
        if (box) {
            box.classList.remove("drag-insert-left", "drag-insert-right", "drag-insert-center");
        }

        const rect = box.getBoundingClientRect();
        const isLeftEdge = (event.clientX - rect.left) < (rect.width / 4);
        const isRightEdge = (event.clientX - rect.left) > (rect.width * 0.75);

        if (data.action === "apply_media" && data.id) {
            if (data.category === 'presentation') {
                showToast("PPTX/PDF files cannot be added to lyric slides!", "error", 3000);
                return;
            }

            if (isLeftEdge || isRightEdge) {
                const newSlide = { id: Date.now(), text: "", type: data.category, bg_id: data.id, bg_type: data.category, bg_name: data.name, bg_behavior: "loop" };
                const insertPos = isLeftEdge ? targetIndex : targetIndex + 1;
                lyricsData.splice(insertPos, 0, newSlide);
                if (currentIndex >= insertPos) currentIndex++;
            } else {
                lyricsData[targetIndex].bg_id = data.id;
                lyricsData[targetIndex].bg_type = data.category;
                lyricsData[targetIndex].bg_name = data.name;
            }

            renderGrid(); markSongUnsaved();
        }
        else if (data.action === "reorder_slide") {
            const sourceIndex = data.index;
            if (sourceIndex !== targetIndex && sourceIndex !== undefined) {
                let insertPos = isRightEdge ? targetIndex + 1 : targetIndex;
                if (sourceIndex < insertPos) insertPos--;

                const movedItem = lyricsData.splice(sourceIndex, 1)[0];
                lyricsData.splice(insertPos, 0, movedItem);

                if (currentIndex === sourceIndex) currentIndex = insertPos;
                else if (currentIndex > sourceIndex && currentIndex <= insertPos) currentIndex--;
                else if (currentIndex < sourceIndex && currentIndex >= insertPos) currentIndex++;

                renderGrid(); markSongUnsaved();
            }
        }
    } catch (e) { console.error("Drop Error:", e); }
}

// Fungsi ngehapus background dari slide
function removeBgFromSlide(e, idx) {
    if (e) e.stopPropagation();
    lyricsData[idx].bg_id = null;
    lyricsData[idx].bg_type = null;
    lyricsData[idx].bg_name = null; // 🎯 Hapus namanya juga
    renderGrid();
    markSongUnsaved();
}
// ==========================================
// ⚙️ MENU KLIK KANAN SONG GRID (TAMBAH OPSI MUTE)
// ==========================================
function positionContextMenu(menu, x, y) {
    const margin = 10;
    const vH = window.innerHeight;
    const vW = window.innerWidth;

    // 1. Sembunyikan dan batasi tinggi awal agar tidak melebihi layar
    menu.style.visibility = "hidden";
    menu.style.display = "block";
    menu.style.maxHeight = `${vH - (margin * 2)}px`;
    menu.style.overflowY = "auto";

    // Reset properties
    menu.style.left = "0px";
    menu.style.top = "0px";
    menu.style.bottom = "auto";
    menu.style.right = "auto";

    // 2. Tunggu satu frame agar browser selesai menghitung dimensi asli (layout pass)
    requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect();

        // Horizontal Check: Jika menabrak kanan, geser ke kiri pakai right margin
        if (x + rect.width > vW - margin) {
            menu.style.left = "auto";
            menu.style.right = margin + "px";
        } else {
            menu.style.left = Math.max(margin, x) + "px";
            menu.style.right = "auto";
        }

        // Vertical Check: Jika menabrak bawah, geser ke atas pakai bottom margin (PASTI GAK KE POTONG!)
        if (y + rect.height > vH - margin) {
            menu.style.top = "auto";
            menu.style.bottom = margin + "px";
        } else {
            menu.style.top = Math.max(margin, y) + "px";
            menu.style.bottom = "auto";
        }

        menu.style.visibility = "visible";
    });
}

function showGridContextMenu(e, idx) {
    if (lyricsData[idx] && lyricsData[idx].type === 'presentation_slide') {
        return;
    }

    if (currentActiveTab === 'scripture') return;

    e.preventDefault();
    const isStandalone = ['video', 'audio', 'photo'].includes(lyricsData[idx].type);
    if (!lyricsData[idx].bg_id && !isStandalone) { quickEdit(idx); return; }

    const oldMenu = document.getElementById("custom-grid-menu");
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement("div");
    menu.id = "custom-grid-menu";
    menu.className = "grid-context-menu";
    document.body.appendChild(menu);

    const bgType = lyricsData[idx].bg_type || 'video';
    if (lyricsData[idx].bg_id && (bgType === 'video' || bgType === 'audio')) {
        const btnBehavior = document.createElement("div");
        btnBehavior.innerHTML = "⚙️ Playback Behavior";
        btnBehavior.className = "grid-context-menu-item";
        btnBehavior.onclick = () => { menu.remove(); setBgBehavior(idx); };
        menu.appendChild(btnBehavior);

        // 🎯 OPSI MUTE KHUSUS VIDEO
        if (bgType === 'video') {
            const btnMute = document.createElement("div");
            const isMuted = lyricsData[idx].bg_muted === true; // Default: Unmuted
            btnMute.innerHTML = isMuted ? "🔊 Unmute Video" : "🔇 Mute Video";
            btnMute.className = "grid-context-menu-item";
            btnMute.onclick = () => {
                menu.remove();
                lyricsData[idx].bg_muted = !isMuted;
                markSongUnsaved();
                // 🎯 FIX 2: MUTE INSTAN TANPA REPLAY (Kirim perintah langsung ke background)
                if (currentIndex === idx) {
                    ws.send(JSON.stringify({ action: "bg_control", payload: { command: "mute_toggle", value: !isMuted, target: "video" } }));
                }
            };
            menu.appendChild(btnMute);
        }
    }

    if (!isStandalone) {
        const btnEdit = document.createElement("div");
        btnEdit.innerHTML = "✏️ Quick Edit";
        btnEdit.className = "grid-context-menu-item";
        btnEdit.onclick = () => { menu.remove(); quickEdit(idx); };
        menu.appendChild(btnEdit);
    }

    const btnDelBg = document.createElement("div");
    btnDelBg.className = "grid-context-menu-item grid-context-menu-danger";
    if (isStandalone) {
        btnDelBg.innerHTML = `🗑️ Delete ${lyricsData[idx].type.toUpperCase()} Slide`;
        btnDelBg.onclick = () => {
            menu.remove();
            lyricsData.splice(idx, 1);
            if (currentIndex === idx) { currentIndex = -1; if (isShowing) sendUpdate(""); }
            else if (currentIndex > idx) currentIndex--;
            renderGrid(); markSongUnsaved();
        };
    } else {
        btnDelBg.innerHTML = "🗑️ Remove Media Layer";
        btnDelBg.onclick = (event) => { menu.remove(); removeBgFromSlide(event, idx); };
    }

    menu.appendChild(btnDelBg);
    document.body.appendChild(menu);
    positionContextMenu(menu, e.clientX, e.clientY);
    setTimeout(() => { document.addEventListener("click", function closeMenu(ev) { const cm = document.getElementById("custom-grid-menu"); if (cm && !cm.contains(ev.target)) cm.remove(); document.removeEventListener("click", closeMenu); }); }, 10);
}

async function setBgBehavior(idx) {
    const options = [
        { value: "loop", label: "🔄 Looping" },
        { value: "once_clear", label: "⏹ Play Once & Clear" },
        { value: "once_hold", label: "⏸ Play Once & Hold" }
    ];

    // Ambil data yang ada di lagu sekarang (kalo kosong, default loop)
    const currentBehavior = lyricsData[idx].bg_behavior || "loop";

    // Kirim currentBehavior ke dialog biar ditampilin!
    const result = await showCustomDialog("select", "Select Video Behavior:", options, currentBehavior);

    if (result) {
        lyricsData[idx].bg_behavior = result;
        markSongUnsaved(); // Nyalain tombol Save Edit
        showToast("Behavior updated! Don't forget to SAVE", "success", 2000);

        // 🚀 HOT-SWAP BEHAVIOR: Ganti mode video on the fly tanpa perlu di-klik ulang!
        if (window.lastTriggeredBg === lyricsData[idx].bg_id) {
            if (typeof activeVisBehav !== 'undefined') activeVisBehav = result;
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    action: "bg_control",
                    payload: { target: "video", command: "update_behavior", value: result }
                }));
            }
        }
    }
}

// ==========================================
// 🎛️ DIRECT PLAY & MEDIA PLAYER ENGINE (ANTI ZOMBIE V2)
// ==========================================
let isMediaPlaying = true;
let isMediaLooping = true;
let activeMediaName = "";

// ==========================================
// 🎛️ MULTI-PLAYER ENGINE (DARI LIBRARY SAJA)
// ==========================================
let activePlayers = {};

function fireDirectLiveMedia(mediaId, mediaName, category) {
    if (typeof window.markLocalMediaTookOver === 'function') window.markLocalMediaTookOver(category);

    if (category === 'video' || category === 'photo') {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "update_scripture", payload: { show_display: false, show_lt: false } }));
        }
    }

    if (category === 'video') {
        ws.send(JSON.stringify({ action: "update_background", payload: { url: `/api/stream_video/${mediaId}`, behavior: "loop", muted: true } })); // [FIX] Audio hanya dari masterBgAudio di control.html
        ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } }));
    } else if (category === 'photo') {
        ws.send(JSON.stringify({ action: "update_photo", payload: { url: `/api/stream_photo/${mediaId}` } }));
        ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
    } else if (category === 'audio') {
        ws.send(JSON.stringify({ action: "update_audio", payload: { url: `/api/stream_audio/${mediaId}` } }));
    }

    createOrUpdateFloatingPlayer(category, mediaName);
}
function sendBgControl(cmd, val) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "bg_control", payload: { command: cmd, value: val } }));
    }
}

function createOrUpdateFloatingPlayer(category, mediaName) {
    const container = document.getElementById("multi-player-container");
    let playerId = `fp-${category}`;
    let playerDiv = document.getElementById(playerId);

    // 🎯 KUNCI SONG GRID (PRIORITAS LIBRARY ON)
    window.activeLibraryPlayers[category] = true;
    if (category === 'video') window._localBgVolume = 1.0;
    else if (category === 'audio') window._localSfxVolume = 1.0;

    if (category === 'video') {
        const photoPlayer = document.getElementById('fp-photo');
        if (photoPlayer) closeFloatingPlayer('photo', 'fp-photo');
    } else if (category === 'photo') {
        const videoPlayer = document.getElementById('fp-video');
        if (videoPlayer) closeFloatingPlayer('video', 'fp-video');
    }

    activePlayers[category] = { playing: true, looping: true };
    let themeClass = category === 'video' ? 'fp-theme-video' : (category === 'audio' ? 'fp-theme-audio' : 'fp-theme-photo');

    if (!playerDiv) {
        playerDiv = document.createElement("div");
        playerDiv.id = playerId;
        playerDiv.className = `fp-dynamic ${themeClass}`;
        container.appendChild(playerDiv);
    }

    let controlHtml = "";
    if (category !== 'photo') {
        controlHtml = `
            <div class="fp-dynamic-controls">
                <button onclick="sendMediaControl('${category}', 'replay')" class="fp-dynamic-btn fp-dynamic-btn-replay">⏮️</button>
                <button id="btn-play-${category}" onclick="toggleMediaPlayState('${category}')" class="fp-dynamic-btn fp-dynamic-btn-play">⏸️ PAUSE</button>
                <button id="btn-loop-${category}" onclick="toggleMediaLoopState('${category}')" class="fp-dynamic-btn fp-dynamic-btn-loop">🔁</button>
            </div>
            <div class="fp-dynamic-vol-wrap">
                <span>🔊</span><input type="range" class="fp-dynamic-vol-slider" min="0" max="1" step="0.05" value="1" oninput="sendMediaControl('${category}', 'volume', this.value)">
            </div>
        `;
    }

    playerDiv.innerHTML = `
        <div class="fp-dynamic-header">
            <span class="fp-dynamic-title">🔴 ${category} LIVE</span>
            <span class="fp-collapsed-text">Playing: ${mediaName}</span>
            <div class="fp-dynamic-header-btns">
                <button onclick="toggleCollapsePlayer('${playerId}')" class="fp-dynamic-close">➖</button>
                <button onclick="closeFloatingPlayer('${category}', '${playerId}')" class="fp-dynamic-close">✖</button>
            </div>
        </div>
        <div class="fp-dynamic-name">${mediaName}</div>
        ${controlHtml}
    `;
}

// 🎯 FUNGSI BARU: COLLAPSE
window.toggleCollapsePlayer = function (playerId) {
    const player = document.getElementById(playerId);
    if (player) player.classList.toggle('fp-collapsed');
};

// 🎯 FUNGSI BARU: CLOSE & MATIKAN OUTPUT
window.closeFloatingPlayer = function (category, playerId) {
    // 1. LEPASKAN KUNCI SONG GRID (PRIORITAS LIBRARY OFF)
    window.activeLibraryPlayers[category] = false;

    // 2. Tembak layar biar kosong / mati
    if (category === 'video') { ws.send(JSON.stringify({ action: "update_background", payload: { url: "", clear_type: "force_close" } })); }
    else if (category === 'audio') { ws.send(JSON.stringify({ action: "update_audio", payload: { url: "" } })); }
    else if (category === 'photo') { ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } })); }

    // 3. Hapus UI Playernya
    const player = document.getElementById(playerId);
    if (player) player.remove();

    // 4. KEMBALIKAN HAK KE SONG GRID (Auto-resume slide yang lagi nyala)
    if (typeof fireLyric === "function" && typeof currentIndex !== "undefined" && currentIndex >= 0) {
        // Reset ingatan cache biar song grid ngerasa butuh nembak ulang
        if (category === 'video' || category === 'photo') { window.currentVisId = null; window.currentVisType = null; }
        if (category === 'audio') { window.currentAudId = null; }

        // Panggil ulang medianya dari lirik
        fireLyric(currentIndex, false);
    }
};

function toggleMediaPlayState(cat) {
    activePlayers[cat].playing = !activePlayers[cat].playing;
    const btn = document.getElementById(`btn-play-${cat}`);
    if (activePlayers[cat].playing) {
        btn.innerHTML = "⏸️ PAUSE";
        btn.className = "fp-dynamic-btn fp-dynamic-btn-play";
        sendMediaControl(cat, "play");
    } else {
        btn.innerHTML = "▶️ PLAY";
        btn.className = "fp-dynamic-btn fp-dynamic-btn-pause";
        sendMediaControl(cat, "pause");
    }
}

function toggleMediaLoopState(cat) {
    activePlayers[cat].looping = !activePlayers[cat].looping;
    const btn = document.getElementById(`btn-loop-${cat}`);
    btn.className = activePlayers[cat].looping ? "fp-dynamic-btn fp-dynamic-btn-loop" : "fp-dynamic-btn fp-dynamic-btn-loop-off";
    sendMediaControl(cat, "loop", activePlayers[cat].looping);
}
// ==========================================
// 📉 MEDIA PLAYER UI CONTROLLER (COLLAPSE/CLOSE)
// ==========================================

function expandMediaPlayer() {
    document.getElementById('fp-normal-mode').style.display = 'block';
    document.getElementById('fp-mini-mode').style.display = 'none';

    // Balikin ukuran aslinya
    const player = document.getElementById('floating-media-player');
    player.style.width = '280px';
    player.style.padding = '15px';
    player.style.borderRadius = '10px';
}

// 🚀 FUNGSI TUTUP MURNI (NO TOAST & NO UI CLEAR)
function closeMediaPlayer() {
    document.getElementById('floating-media-player').style.display = "none";

    window.lastTriggeredBg = null;
    window.currentlyPlayingBg = null;
    activeMediaName = "";

    // Langsung tembak ke proyektor buat kosongin layer video secara "Gaib"
    // Tanpa harus nge-trigger tombol UI Clear Video di laptop lu
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
    }
}

// Contoh kalau VJ nge-play video (Panggil ini dari tombol play lagu lu)
function playMediaOnController(fileName, fileUrl) {
    activeMediaName = fileName;

    const panel = document.getElementById("media-player-panel");
    const titleText = document.getElementById("media-title-text");
    const vid = document.getElementById("media-preview");

    // Munculkan panel
    panel.classList.remove("media-panel-hide");

    // Update teks sesuai state
    if (isMediaCollapsed) {
        titleText.innerText = "Playing : " + activeMediaName;
    } else {
        titleText.innerText = "MEDIA PLAYER - " + activeMediaName;
    }

    // Play preview
    if (vid) {
        vid.src = fileUrl;
        vid.play();
    }
}

function toggleCollapseMedia() {
    const normal = document.getElementById('fp-normal-mode');
    const mini = document.getElementById('fp-mini-mode');
    const player = document.getElementById("floating-media-player");

    if (normal.style.display !== 'none') {
        normal.style.display = 'none';
        mini.style.display = 'flex';
        player.classList.add("floating-player-zero-pad");
        document.getElementById("mini-media-title").innerText = "Playing : " + activeMediaName;
    } else {
        normal.style.display = 'block';
        mini.style.display = 'none';
        player.classList.remove("floating-player-zero-pad");
    }
}

// ==========================================
// 🚨 CLEAR ENGINE (PROPRESENTER STYLE)
// ==========================================
let clearStates = { lyrics: false, video: false, audio: false, photo: false, presentation: false, plugin: false };

function clearLayer(layer) {
    clearStates[layer] = !clearStates[layer];
    const btn = document.getElementById('btn-clr-' + layer);

    if (clearStates[layer]) {
        if (btn) btn.classList.add('btn-clr-dim'); // Dim Visualnya (Mati)
        if (layer === 'lyrics') {
            sendUpdate("");
        }
        else if (layer === 'video') {
            if (!window._liveMediaActive) window.currentVisId = null;
            if (window.activeSenderMedia) window.activeSenderMedia.video = false;
            if (window.masterBgAudio && !window.masterBgAudio.paused) {
                window.masterBgAudio.pause();
            }
            ws.send(JSON.stringify({ action: "update_background", payload: { url: "", clear_type: "clearlayer" } }));
            if (window._liveMediaActive && window.activeMediaScheduledItem && window.activeMediaScheduledItem.resolved_category === 'video') {
                stopLiveMonitor();
            }
        }
        else if (layer === 'audio') {
            if (!window._liveMediaActive) window.currentAudId = null;
            if (window.activeSenderMedia) window.activeSenderMedia.audio = false;
            if (window.masterBgAudio && !window.masterBgAudio.paused) {
                window.masterBgAudio.pause();
            }
            if (window.masterSfxAudio && !window.masterSfxAudio.paused) {
                window.masterSfxAudio.pause();
            }
            ws.send(JSON.stringify({ action: "update_audio", payload: { url: "" } }));
            if (window._liveMediaActive && window.activeMediaScheduledItem && window.activeMediaScheduledItem.resolved_category === 'audio') {
                stopLiveMonitor();
            }
        }
        else if (layer === 'photo') {
            if (!window._liveMediaActive) window.currentVisId = null;
            if (window.activeSenderMedia) window.activeSenderMedia.photo = false;
            ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } }));
        }
        else if (layer === 'presentation') {
            window.currentSlideNum = null;
            if (window.activeSenderMedia) {
                window.activeSenderMedia.video = false;
                window.activeSenderMedia.photo = false;
            }
            ws.send(JSON.stringify({ action: "update_presentation", payload: { url: "" } }));
        }
        else if (layer === 'plugin') {
            if (typeof clearAllActivePlugins === 'function') {
                clearAllActivePlugins();
            }
        }
    } else {
        if (btn) btn.classList.remove('btn-clr-dim'); // Nyala lagi

        if (layer === 'presentation') window.currentSlideNum = null;
        if (!window._liveMediaActive) {
            if (layer === 'video' || layer === 'photo') window.currentVisId = null;
            if (layer === 'audio') window.currentAudId = null;
        }

        // If live media is active, restore/replay it if its layer is uncleared!
        if (window._liveMediaActive && window.activeMediaScheduledItem) {
            const item = window.activeMediaScheduledItem;
            const category = item.resolved_category;

            if (layer === category) {
                sendMediaToLiveDisplay(category, item.resolved_id, item.resolved_name);
            }
        } else {
            // Standard song slide behavior
            if (layer === 'lyrics' && currentIndex >= 0) {
                if (lyricsData[currentIndex] && lyricsData[currentIndex].type === 'scripture') {
                    fireLyric(currentIndex, false);
                } else {
                    sendUpdate(lyricsData[currentIndex].text);
                }
            }
            else if (currentIndex >= 0) {
                fireLyric(currentIndex, false);
            }
        }
    }
}

function sendMediaControl(category, cmd, val) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "bg_control", payload: { command: cmd, value: val, target: category } }));
    }
}

// ==========================================
// 📊 ENGINE POWERPOINT / PDF (FINAL)
// ==========================================
let pptPreviewId = null;
let pptPreviewCurrent = 1;
let pptPreviewTotal = 0;

window.openPPTPreview = async function (mediaId, mediaName) {
    pptPreviewId = mediaId;
    document.getElementById('ppt-preview-title').innerText = "Preview: " + mediaName;
    try {
        const res = await fetch(`/api/media/presentation/${mediaId}/slides`);
        const data = await res.json();
        pptPreviewTotal = data.count || 0;

        if (pptPreviewTotal === 0) { showToast("PPT not processed/empty", "error", 2000); return; }

        pptPreviewCurrent = 1; window.updatePPTPreviewImg();
        document.getElementById('ppt-preview-modal').classList.add('show-flex');
    } catch (e) { }
};
window.closePPTPreview = () => {
    document.getElementById('ppt-preview-modal').classList.remove('show-flex');
    const imgEl = document.getElementById('ppt-preview-img');
    if (imgEl) {
        // Set to 1x1 transparent GIF to force browser/Chromium to unload the big image texture
        imgEl.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        imgEl.removeAttribute('src');
    }
    pptPreviewId = null;
    pptPreviewCurrent = 1;
    pptPreviewTotal = 0;
};
window.prevPPTPreview = () => { if (pptPreviewCurrent > 1) { pptPreviewCurrent--; window.updatePPTPreviewImg(); } };
window.nextPPTPreview = () => { if (pptPreviewCurrent < pptPreviewTotal) { pptPreviewCurrent++; window.updatePPTPreviewImg(); } };
window.updatePPTPreviewImg = () => {
    document.getElementById('ppt-preview-img').src = `/api/media/presentation/${pptPreviewId}/slide/${pptPreviewCurrent}`;
    document.getElementById('ppt-preview-counter').innerText = `Slide ${pptPreviewCurrent} / ${pptPreviewTotal}`;
};

window.loadPPTToGrid = async function (mediaId, mediaName) {
    const overlay = document.getElementById('ppt-grid-overlay');
    const overlayText = document.getElementById('ppt-overlay-text');
    let safeOverlay = mediaName.length > 20 ? mediaName.substring(0, 20) + "..." : mediaName;
    if (overlay) {
        overlayText.innerHTML = `<span style="font-size:1.1em; font-weight:600; color:#00e5ff; margin-bottom:8px;">📊 Opening Presentation</span><br><span style="font-size:0.9em; color:#ccc;">${safeOverlay}</span>`;
        overlay.classList.add('show-flex');
    }

    try {
        const res = await fetch(`/api/media/presentation/${mediaId}/slides`);
        const data = await res.json();
        const count = data.count || 0;

        if (count === 0) {
            // PowerPoint belum selesai diekstrak di background! 
            // Ubah overlay menjadi spinner pemrosesan real-time dan pasang watcher
            if (overlay) {
                overlayText.innerHTML = `
                    <div class="ppt-extract-spinner" style="width: 32px; height: 32px; border: 3px solid rgba(0, 229, 255, 0.1); border-top-color: #00e5ff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 12px auto;"></div>
                    <span style="font-size:1.1em; font-weight:600; color:#ff9800; margin-bottom:8px;">📊 Converting PowerPoint</span><br>
                    <span style="font-size:0.9em; color:#ccc; display:inline-block; margin-bottom:4px;">Extracting slides to crisp 1080p...</span><br>
                    <span style="font-size:0.8em; color:#888; font-style:italic;">Please wait a moment...</span>
                `;
            }
            window.waitingForPPTId = mediaId;
            window.waitingForPPTName = mediaName;
            return;
        }

        // Reset state jika berhasil diload
        window.waitingForPPTId = null;
        window.waitingForPPTName = null;

        // 🚨 FORCE CLEAR LAGU DAN TIMPA PAKAI SLIDE PPT!
        lyricsData = [];
        for (let i = 1; i <= count; i++) {
            lyricsData.push({
                id: Date.now() + i, text: "", type: "presentation_slide",
                bg_id: mediaId, bg_type: "presentation", bg_name: `${mediaName} (Slide ${i})`, slide_num: i
            });
        }

        // Ganti indikator UI bahwa sekarang yg aktif adalah PPT
        currentSongTitle = `📊 PPT: ${mediaName}`;
        const loadedLabel = document.getElementById("now-loaded-text");
        if (loadedLabel) {
            let displayTitle = currentSongTitle;
            if (displayTitle.length > 30) displayTitle = displayTitle.substring(0, 30) + "...";

            loadedLabel.innerText = displayTitle;
            loadedLabel.classList.remove("now-loaded-cyan");
            loadedLabel.classList.add("now-loaded-ppt"); // Pakai Class, NO INLINE!
        }

        currentIndex = -1; renderGrid();
    } catch (err) {
        showToast("Failed to load PPT", "error", 3000);
    }

    // Hanya hilangkan overlay jika data count > 0 (tidak sedang menunggu konversi)
    if (!window.waitingForPPTId && overlay) {
        overlay.classList.remove('show-flex');
    }
};

window.addPPTToSchedule = async function (mediaId, mediaName, insertIndex = -1) {
    try {
        const res = await fetch(`/api/media/presentation/${mediaId}/slides`);
        const data = await res.json();
        const count = data.count || 0;

        if (count === 0) return showToast("PPT empty/not processed!", "error", 3000);

        let pptSlides = [];
        for (let i = 1; i <= count; i++) {
            pptSlides.push({
                id: Date.now() + i, text: "", type: "presentation_slide",
                bg_id: mediaId, bg_type: "presentation", bg_name: `${mediaName} (Slide ${i})`, slide_num: i
            });
        }

        const title = `📊 PPT: ${mediaName}`;
        const payload = { title: title, data: pptSlides, settings: {} };

        await fetch('/api/songs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });

        // Bikin Objek Schedule Baru
        const newItem = { title: title, note: "Presentation Slide" };

        // Masukkan sesuai lokasi Drop! (Bisa nyelip di tengah atau tambah di bawah)
        if (insertIndex !== -1) {
            scheduleList.splice(insertIndex, 0, newItem);
        } else {
            scheduleList.push(newItem);
        }

        renderSchedule();
        await saveActiveSchedule();
        fetchLibrary();
    } catch (e) { showToast("Failed to add PPT to Schedule", "error", 3000); }
};

window.addMediaToSchedule = async function (category, mediaId, mediaName, insertIndex = -1) {
    const icon = category === 'video' ? '🎬' : (category === 'photo' ? '📷' : '🎵');
    const labelPrefix = category === 'video' ? 'VIDEO' : (category === 'photo' ? 'PHOTO' : 'AUDIO');
    const title = `${icon} ${labelPrefix}: ${mediaName}`;
    const newItem = {
        title: title,
        note: `${category.charAt(0).toUpperCase() + category.slice(1)} Media`,
        type: "media",
        media_category: category,
        media_id: mediaId,
        media_name: mediaName
    };

    if (insertIndex !== -1 && insertIndex >= 0 && insertIndex <= scheduleList.length) {
        scheduleList.splice(insertIndex, 0, newItem);
    } else {
        scheduleList.push(newItem);
    }

    renderSchedule();
    await saveActiveSchedule();
};

window.scheduleList = scheduleList;
window.renderSchedule = renderSchedule;
window.saveActiveSchedule = saveActiveSchedule;

async function openSettingsModal() {
    document.getElementById('settings-modal').style.display = 'flex';
    updateOutputLinks();
    loadLicenseStatus();
    // Load audio routing settings
    await loadSavedAudioSettings();
    await loadAudioDevices();
}

// Pisahkan logika license ke fungsi sendiri agar bisa dipanggil ulang (polling)
async function loadLicenseStatus(retryCount = 0) {
    const card = document.getElementById('license-card-container');
    if (!card) return;

    // Hanya tampilkan "Checking..." pada percobaan pertama
    if (retryCount === 0) {
        card.innerHTML = `<p style="color:#aaa; text-align:center; padding: 10px;">⏳ Checking license status...</p>`;
    }

    try {
        // FIX: Tambahkan AbortController dengan timeout 8 detik
        // Jika backend masih hang, fetch tidak akan menunggu selamanya.
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        const res = await fetch('/api/license/status', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await res.json();

        // FIX: Handle status "checking" — backend masih memvalidasi lisensi di background
        if (data.status === "checking") {
            if (retryCount < 8) {
                // Retry setiap 1.5 detik, maksimal 8x (total ~12 detik tunggu)
                card.innerHTML = `<p style="color:#aaa; text-align:center; padding: 10px;">⏳ Validating license... <small style="color:#666;">(${retryCount + 1}/8)</small></p>`;
                setTimeout(() => loadLicenseStatus(retryCount + 1), 1500);
            } else {
                // Timeout habis, anggap tidak aktif
                card.innerHTML = `
                    <label class="license-label">🔑 LICENSE ACTIVATION</label>
                    <p class="license-desc">Enter your License Key to activate full features or transfer the license to this device.</p>
                    <input type="text" id="license-key-input" class="compact-input license-input" placeholder="SHOWLYRICS026">
                    <button class="btn-action btn-activate" onclick="activateShowLyrics()">ACTIVATE DEVICE</button>
                `;
            }
            return;
        }

        if (data.status === "active") {
            card.innerHTML = `
                <label class="license-registered-label">✅ DEVICE REGISTERED</label>
                <div class="license-info-box">
                    <p class="license-info-title">License Key</p>
                    <h3 class="license-info-value">${data.key}</h3>
                    <p class="license-info-title">Valid Until</p>
                    <h4 class="license-info-exp">${data.expiryDate}</h4>
                </div>
                <button class="btn-action btn-deactivate" onclick="deactivateLicense()">SIGN OUT</button>
                <span class="license-note">Release this license if you want to use it on another computer.</span>
            `;
        } else {
            card.innerHTML = `
                <label class="license-label">🔑 LICENSE ACTIVATION</label>
                <p class="license-desc">Enter your License Key to activate full features or transfer the license to this device.</p>
                <input type="text" id="license-key-input" class="compact-input license-input" placeholder="SHOWLYRICS026">
                <button class="btn-action btn-activate" onclick="activateShowLyrics()">ACTIVATE DEVICE</button>
            `;
        }
    } catch (e) {
        if (e.name === 'AbortError') {
            // Fetch di-abort karena timeout
            if (retryCount < 3) {
                card.innerHTML = `<p style="color:#aaa; text-align:center; padding: 10px;">⏳ Server still loading... retrying...</p>`;
                setTimeout(() => loadLicenseStatus(retryCount + 1), 2000);
            } else {
                card.innerHTML = `<p style="color:#e07b39; text-align:center; padding: 10px;">⚠️ Server response timeout. Try reopening settings.</p>`;
            }
        } else {
            card.innerHTML = `<p style="color:red; text-align:center; padding: 10px;">❌ Failed to connect to local server.</p>`;
        }
    }
}

// FUNGSI BARU BUAT TOMBOL RELEASE
async function deactivateLicense() {
    const isOk = await showCustomDialog("confirm", "Are you sure you want to release the license from this PC?<br><small style='color:#888;'>Internet connection is required.</small>");
    if (!isOk) return;

    showToast("Releasing license from server...", "loading");
    const res = await fetch('/api/license/deactivate', { method: 'POST' });
    const data = await res.json();

    if (data.status === "success") {
        showToast("License released successfully!", "success", 2000);
        setTimeout(() => {
            if (window.electronAPI) window.electronAPI.relaunchApp();
            else window.location.reload();
        }, 2000);
    } else {
        showToast(data.message, "error", 4000);
    }
}

async function activateShowLyrics() {
    const key = document.getElementById("license-key-input").value.trim().toUpperCase();

    if (!key) {
        showToast("License Key cannot be empty!", "error", 3000);
        return;
    }

    // Validasi format License (mencegah XSS via input)
    const regex = /^[A-Z0-9-]+$/;
    if (!regex.test(key)) {
        showToast("Invalid License Key format!", "error", 3000);
        return;
    }

    // Manfaatin UI showCustomDialog lo buat konfirmasi elegan!
    const isOk = await showCustomDialog(
        "confirm",
        `Activate this computer with license <br><b style="color:#00e5ff; font-size:1.2em;">${key}</b> ?<br><br><small style="color:#888;">The application will restart automatically if successful.</small>`
    );

    if (!isOk) return;

    // Tutup modal Settings biar fokus ke loading
    safeCloseModal('settings-modal');

    // Panggil Animasi Loading Toast buatan lo
    showToast("Validating license with server...", "loading");

    try {
        // Tembak ke API backend yang udah kita konsep sebelumnya
        const res = await fetch('/api/license/activate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ license_key: key })
        });

        const data = await res.json();

        if (data.status === "success") {
            showToast("Activation Successful! Restarting application...", "success", 2000);

            // Kasih jeda 2 detik biar user baca pesannya, baru restart
            setTimeout(() => {
                // Panggil Electron untuk Hard-Restart
                if (window.electronAPI) {
                    window.electronAPI.relaunchApp();
                } else {
                    // Fallback kalau kebetulan dibuka di browser biasa
                    window.location.reload();
                }
            }, 2000);
        } else {
            showToast(data.message, "error", 4000);
        }
    } catch (e) {
        console.error("License Error:", e);
        showToast("Network error. Ensure you are connected to the internet.", "error", 4000);
    }
}

// ==========================================
// --- PREVIEW NAVIGATION WRAPPER (FOR EDITOR) ---
// ==========================================
function editorNextSlide() {
    // Cek biar ga bablas lewat dari jumlah lirik
    if (lyricsData && currentIndex < lyricsData.length - 1) {
        // Samakan flow dengan klik grid song:
        // - Kalau layar sedang clear/blackout => hanya antre (silent queue)
        // - Kalau layar aktif => trigger force show biar transisi/visual ikut jalan normal
        const isScreenCleared = !isShowing || clearStates.lyrics;
        fireLyric(currentIndex + 1, !isScreenCleared);

        // Update UI modal editor tanpa memicu sync redundant (triggerLiveSync = false)
        updateTextPreview(false);
    }
}

function editorPrevSlide() {
    // Cek biar ga mundur sampai index minus
    if (currentIndex > 0) {
        const isScreenCleared = !isShowing || clearStates.lyrics;
        fireLyric(currentIndex - 1, !isScreenCleared);

        // Update UI modal editor tanpa memicu sync redundant (triggerLiveSync = false)
        updateTextPreview(false);
    }
}

// ==========================================
// --- JS MAGIC: 1080p Iframe Compression (REAL-TIME ENGINE) ---
// ==========================================
let iframeScaleObserver = null;

function attachTextEditPreviewScaler() {
    detachTextEditPreviewScaler();
    window._lastIframeScaleWidth = 0; // Reset cache so that the first ResizeObserver callback always runs!
    const wrapper = document.getElementById('modal-preview-wrapper');
    const iframe = document.getElementById('modal-preview-frame');
    if (!wrapper || !iframe) return;

    iframe.style.width = "1920px";
    iframe.style.height = "1080px";
    iframe.style.position = "absolute";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.transformOrigin = "top left";
    iframe.style.border = "none";

    iframeScaleObserver = new ResizeObserver(entries => {
        const frame = document.getElementById('modal-preview-frame');
        if (!frame) return;
        const currentWidth = entries[0].contentRect.width;
        if (currentWidth > 0 && Math.abs((window._lastIframeScaleWidth || 0) - currentWidth) > 1) {
            window._lastIframeScaleWidth = currentWidth;
            frame.style.transform = `scale(${currentWidth / 1920})`;
        }
    });
    iframeScaleObserver.observe(wrapper);
}

function detachTextEditPreviewScaler() {
    if (iframeScaleObserver) {
        iframeScaleObserver.disconnect();
        iframeScaleObserver = null;
    }
    window._lastIframeScaleWidth = 0; // Reset cache on detach as well
}


// ==========================================
// --- CORE FUNCTION: TEXT EDITOR MODAL ---
// ==========================================
// ==========================================
// --- CORE FUNCTION: TEXT EDITOR MODAL ---
// ==========================================
let backupEditorConfig = null; // Memori perlindungan Draft (Snapshot)

function openTextEditModal(mode = 'current') {
    // 🔒 GEMBOK SCRIPTURE: Jangan biarkan VJ ngedit ayat alkitab jadi lirik!
    if (currentActiveTab === 'scripture') {
        showToast("Edit disabled in Scripture mode!", "error", 1300);
        return;
    }

    const modal = document.getElementById('text-edit-modal');
    const title = document.getElementById('te-modal-title');
    const actCustom = document.getElementById('te-actions-custom');
    const actPreset = document.getElementById('te-actions-preset');

    // 🎯 FIX MUTLAK: Gunakan 'currentMode' untuk mencegah bentrok dengan parameter 'mode'
    let currentMode = mode;
    if (currentMode === 'current') {
        currentMode = document.getElementById("current-disp-mode").value;
    }

    modal.dataset.activeMode = currentMode; // Simpan tracker mode ke dalam modal
    backupEditorConfig = getDisplayConfigFromUI(); // Snapshot anti-draft

    if (currentMode === 'global') {
        // NYAWA 3: KLIK KANAN DARI GLOBAL PRESET
        title.innerText = "🛠️ GLOBAL PRESET EDITOR";
        actCustom.classList.add('te-hidden');
        actPreset.classList.remove('te-hidden');

        populateModalPresetSelect(globalEditTarget); // Langsung pilih preset yg di-klik kanan
        if (globalEditTarget && dispPresetsData[globalEditTarget]) {
            applyDisplayPresetToUI(dispPresetsData[globalEditTarget]);
        }
    } else if (currentMode === 'preset') {
        // NYAWA 2: EDIT DARI SONG PRESET
        title.innerText = "🛠️ PRESET EDITOR";
        actCustom.classList.add('te-hidden');
        actPreset.classList.remove('te-hidden');

        const currentPreset = document.getElementById("song-preset-select").value;
        populateModalPresetSelect(currentPreset);

        if (currentPreset && dispPresetsData[currentPreset]) {
            applyDisplayPresetToUI(dispPresetsData[currentPreset]);
        }
    } else {
        // NYAWA 1: EDIT CUSTOM DNA LAGU
        title.innerText = "🛠️ TEXT EDITOR & STYLE PRESET";
        actCustom.classList.remove('te-hidden');
        actPreset.classList.add('te-hidden');
        applyDisplayPresetToUI(currentSongCustomSettings);
    }

    enterModalIframeMode('text-edit-modal', () => {
        if (modal) modal.classList.add('modal-active');
        mountTextEditPreview();
        // Saat baru buka modal, TIDAK PERLU broadcast ulang (menghindari CPU Spike massal di semua layar)
        updateTextPreview(false);
    });
}

function closeTextEditModal(isCancel = false) {
    if (isCancel && backupEditorConfig) {
        applyDisplayPresetToUI(backupEditorConfig);
        updateSettings();
    }

    const modal = document.getElementById('text-edit-modal');
    exitModalIframeMode('text-edit-modal', () => {
        if (modal) {
            modal.classList.remove('modal-active');
            delete modal.dataset.activeMode;
        }
    });
}

async function applyAndCloseEditor() {
    const modal = document.getElementById('text-edit-modal');
    const mode = modal.dataset.activeMode || document.getElementById("current-disp-mode").value;

    if (mode === 'preset' || mode === 'global') {
        const name = document.getElementById("te-modal-preset-select").value;
        if (!name) return showToast("Please select a preset to save!", "error", 3000);

        const config = getDisplayConfigFromUI();
        await fetch('/api/display_presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name, config: config })
        });

        await fetchDisplayPresets(); // Refresh kartu UI

        if (mode === 'preset') {
            document.getElementById("song-preset-select").value = name;
            await saveCurrentGrid(); // Save ke lagu saat ini
        } else {
            // Kalau diedit dari Klik Kanan Global, sorot langsung kartunya setelah disave
            selectVisualPreset(name);
        }
    } else {
        // Mode Custom
        currentSongCustomSettings = getDisplayConfigFromUI();
        await saveCurrentGrid();
    }

    updateSettings(); // Tembak langsung ke proyektor
    closeTextEditModal(false);
}

function populateModalPresetSelect(activeName) {
    const select = document.getElementById("te-modal-preset-select");
    select.innerHTML = '<option value="">-- Select Preset --</option>';
    for (const name in dispPresetsData) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.innerText = name;
        select.appendChild(opt);
    }
    if (activeName) select.value = activeName;
}

function loadModalPreset() {
    const name = document.getElementById("te-modal-preset-select").value;
    if (name && dispPresetsData[name]) {
        applyDisplayPresetToUI(dispPresetsData[name]);
        updateTextPreview(true);
    }
}

async function overwriteModalPreset() {
    const name = document.getElementById("te-modal-preset-select").value;
    if (!name) return showToast("Please select a preset from the dropdown first!", "error", 3000);

    const isOk = await showCustomDialog("confirm", `Update preset <br><b style="color:#00e5ff;">"${name}"</b><br> with current settings?`);
    if (!isOk) return;

    showToast("Saving preset...", "loading");
    const config = getDisplayConfigFromUI();

    const res = await fetch('/api/display_presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, config: config }) });
    if (res.ok) {
        showToast(`Preset "${name}" updated!`, "success", 2000);
        await fetchDisplayPresets();
        populateModalPresetSelect(name);
    } else { showToast("Failed to update preset", "error", 3000); }
}

async function saveAsModalPreset() {
    const name = await showCustomDialog("prompt", "Enter New Preset Name:");
    if (!name) return;

    showToast("Creating new preset...", "loading");
    const config = getDisplayConfigFromUI();

    const res = await fetch('/api/display_presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name, config: config }) });
    if (res.ok) {
        showToast(`Preset "${name}" saved!`, "success", 2000);
        await fetchDisplayPresets();
        populateModalPresetSelect(name);
        document.getElementById("song-preset-select").value = name; // Update UI Luar
    } else { showToast("Failed to create preset", "error", 3000); }
}

async function deleteModalPreset() {
    const name = document.getElementById("te-modal-preset-select").value;
    if (!name) return showToast("Please select a preset!", "error", 3000);

    const isOk = await showCustomDialog("confirm", `Permanently delete preset <br><b style="color:#ff4444;">"${name}"</b>?`);
    if (!isOk) return;

    showToast("Deleting...", "loading");
    const res = await fetch(`/api/display_presets/${encodeURIComponent(name)}`, { method: 'DELETE' });

    if (res.ok) {
        showToast(`Preset deleted!`, "success", 2000);
        await fetchDisplayPresets();
        populateModalPresetSelect(""); // Reset select dropdown
    } else { showToast("Failed to delete preset", "error", 3000); }
}

// ==========================================
// --- CONTEXT MENU ENGINE (KLIK KANAN) ---
// ==========================================
let globalEditTarget = null; // Memori nyimpen nama preset yg di-klik kanan

function showPresetContextMenu(e, name) {
    e.preventDefault(); // Matiin klik kanan bawaan browser / macOS Ctrl+Click
    e.stopPropagation();
    globalEditTarget = name;

    const menu = document.getElementById("preset-context-menu");
    menu.classList.remove("te-hidden");
    menu.style.left = e.clientX + "px";
    menu.style.top = e.clientY + "px";
    positionContextMenu(menu, e.clientX, e.clientY);
}

function closePresetContextMenu() {
    const menu = document.getElementById("preset-context-menu");
    if (menu) menu.classList.add("te-hidden");
}

// Otomatis nutup context menu kalau user klik sembarang tempat
document.addEventListener("click", () => closePresetContextMenu());

function openGlobalPresetEditor() {
    closePresetContextMenu();
    openTextEditModal('global'); // Panggil logic nyawa ke-3
}

async function deleteGlobalPresetContext() {
    closePresetContextMenu();
    const name = globalEditTarget;
    if (!name) return;

    const isOk = await showCustomDialog("confirm", `Are you sure you want to delete preset <br><b style="color:#ff4444;">"${name}"</b>?`);
    if (!isOk) return;

    showToast("Deleting...", "loading");
    const res = await fetch(`/api/display_presets/${encodeURIComponent(name)}`, { method: 'DELETE' });

    if (res.ok) {
        showToast(`Preset deleted!`, "success", 2000);
        if (document.getElementById("global-preset-select").value === name) {
            document.getElementById("global-preset-select").value = "";
            document.getElementById("selected-preset-label").innerText = "- No Preset -";
        }
        await fetchDisplayPresets();
    } else {
        showToast("Failed to delete preset", "error", 3000);
    }
}

// ==========================================
// 📖 SCRIPTURE ENGINE LOGIC
// ==========================================

function importBible() {
    document.getElementById("bible-upload-input").click();
}

async function handleBibleUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    showToast("Importing Bible XML...", "loading");
    try {
        const res = await fetch("/api/scripture/import", { method: "POST", body: formData });
        const data = await res.json();
        if (data.status === "success") {
            showToast(data.message, "success", 1000);
            loadBibleTranslations(); // Refresh dropdown
        } else {
            showToast(data.message, "error", 1300);
        }
    } catch (e) {
        showToast("Failed to import file", "error", 1300);
    }
    event.target.value = ""; // Reset input
}

async function loadBibleTranslations() {
    try {
        loadScriptureHistory();
        const res = await fetch("/api/scripture/translations");
        const data = await res.json();

        const container = document.getElementById("bible-translation-list");
        if (!container) return;
        container.innerHTML = "";

        if (!data.translations || data.translations.length === 0) {
            container.innerHTML = `<div style="color:#666; font-size:0.8em;">No Bible XML imported yet.</div>`;
            return;
        }

        const selectedList = (Array.isArray(data.selected) && data.selected.length > 0)
            ? data.selected
            : [data.translations[0]];

        data.translations.forEach((t) => {
            const isChecked = selectedList.includes(t) ? "checked" : "";
            container.innerHTML += `
                <label class="translation-item" oncontextmenu="showTranslationContextMenu(event, '${t.replace(/'/g, "\\'")}')">
                    <input type="checkbox" class="bible-version-cb" value="${t}" ${isChecked} onchange="handleTranslationCheck(event, true)">
                    ${t}
                </label>
            `;
        });

        handleTranslationCheck(null, false); // Jalankan pengaman otomatis tanpa save ulang
    } catch (e) { console.error("Failed to load translations", e); }
}

// 🎯 MESIN PENGAMAN MAKSIMAL 2 CHECKBOX & PERSISTENSI KE SERVER PYTHON
window.handleTranslationCheck = function (e, shouldPersist = true) {
    const checkboxes = document.querySelectorAll(".bible-version-cb");
    let checked = document.querySelectorAll(".bible-version-cb:checked");

    if (checked.length === 0 && e && e.target) {
        showToast("At least 1 translation must be active!", "warning", 1500);
        e.target.checked = true;
        checked = document.querySelectorAll(".bible-version-cb:checked");
    }

    const maxAllowed = 2; // Maksimal 2 terjemahan

    if (checked.length > maxAllowed && e && e.target) {
        showToast(`Maximum ${maxAllowed} translations!`, "warning", 1500);
        e.target.checked = false;
        checked = document.querySelectorAll(".bible-version-cb:checked");
    }

    checkboxes.forEach(cb => {
        if (!cb.checked && checked.length >= maxAllowed) {
            cb.disabled = true; cb.parentElement.style.opacity = "0.4";
        } else {
            cb.disabled = false; cb.parentElement.style.opacity = "1";
        }
    });

    const activeVersions = Array.from(checked).map(cb => cb.value);

    // Kirim pilihan ke server Python jika diubah oleh user (bukan inisialisasi awal)
    if (shouldPersist && activeVersions.length > 0) {
        fetch("/api/scripture/selected_translations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ selected: activeVersions })
        }).catch(err => console.error("Failed to save selected translations to server:", err));
    }

    if (checked.length > 0) loadBibleBooks(checked[0].value);

    const searchInput = document.getElementById("bible-search-input");
    if (searchInput && searchInput.value.trim()) {
        const parsed = parseScriptureReference(searchInput.value.trim());
        if (parsed.valid) {
            const bInput = document.getElementById("bible-book");
            const cInput = document.getElementById("bible-chapter");
            const vInput = document.getElementById("bible-verse");
            if (bInput) bInput.value = parsed.bookEng;
            if (cInput) cInput.value = parsed.chapter;
            if (vInput) vInput.value = parsed.verse;
        }
    }
    const book = document.getElementById("bible-book") ? document.getElementById("bible-book").value : "";
    const chap = document.getElementById("bible-chapter") ? document.getElementById("bible-chapter").value : "";
    const isScriptureVisible = (typeof currentMediaCategory !== 'undefined' && currentMediaCategory === 'scripture') ||
                               (typeof currentActiveTab !== 'undefined' && currentActiveTab === 'scripture');
    if (book && chap && isScriptureVisible) {
        searchScripture(true);
    }
};

// 🎯 FIX ERROR SETTINGS: Placeholder untuk Fase 4

async function loadBibleBooks(version) {
    try {
        const res = await fetch(`/api/scripture/books?version=${encodeURIComponent(version)}`);
        const data = await res.json();
        if (data && Array.isArray(data.books) && data.books.length > 0) {
            populateBibleDatalist(data.books);
        } else {
            populateBibleDatalist();
        }
    } catch (e) {
        console.error("Error loading Bible books:", e);
        populateBibleDatalist();
    }
}

function populateBibleDatalist(availableBooks = null) {
    const lang = document.getElementById('scr-global-lang')?.value || document.getElementById('scr-title-lang')?.value || 'id';
    const datalist = document.getElementById("bible-books-list");
    const inputBook = document.getElementById("bible-book");
    const searchInput = document.getElementById("bible-search-input");
    if (!datalist) return;

    datalist.innerHTML = "";
    const map = getBibleBooksMap(); // Panggil dengan aman

    const booksToUse = Array.isArray(availableBooks) ? availableBooks : Object.keys(map);

    booksToUse.forEach(b => {
        const translated = translateBookName(b, lang);
        datalist.innerHTML += `<option value="${translated}">`;
    });

    const ph = lang === 'en' ? "e.g. John 3:16, 1Pet 2 10..." : "Cth: Mat 1:1, 1Pet 2 10...";
    if (searchInput) searchInput.placeholder = ph;
    if (inputBook) inputBook.placeholder = lang === 'en' ? "Book (e.g. John)" : "Kitab (Cth: Yohanes)";
}

function handleLanguageChange() {
    const checked = document.querySelectorAll(".bible-version-cb:checked");
    if (checked.length > 0) {
        loadBibleBooks(checked[0].value);
    } else {
        populateBibleDatalist();
    }
    renderScriptureHistory();
}

// ==========================================
// 🕒 SCRIPTURE HISTORY SYSTEM
// ==========================================
let scriptureHistory = [];

async function loadScriptureHistory() {
    try {
        const res = await fetch('/api/scripture/history');
        const data = await res.json();
        if (data && data.status === 'success' && Array.isArray(data.history)) {
            scriptureHistory = data.history;
        } else {
            scriptureHistory = [];
        }
        renderScriptureHistory();
    } catch (e) {
        console.error("Error loading scripture history:", e);
        scriptureHistory = [];
        renderScriptureHistory();
    }
}

function renderScriptureHistory() {
    const listEl = document.getElementById("scr-history-list");
    const clearBtn = document.getElementById("btn-clear-scr-history");
    if (!listEl) return;

    if (!scriptureHistory || scriptureHistory.length === 0) {
        listEl.innerHTML = `<div class="scr-history-empty">Belum ada riwayat hari ini</div>`;
        if (clearBtn) clearBtn.style.display = "none";
        return;
    }

    if (clearBtn) clearBtn.style.display = "inline-flex";

    const targetLang = document.getElementById('scr-title-lang')?.value || document.getElementById('scr-global-lang')?.value || 'id';

    let html = "";
    scriptureHistory.forEach(item => {
        const canonicalBook = item.book || "";
        const finalBookName = typeof translateBookName === 'function' ? translateBookName(canonicalBook, targetLang) : canonicalBook;
        const refLabel = `${finalBookName} ${item.chapter}:${item.verse}`;
        const timeLabel = item.time || "";

        const safeBook = canonicalBook.replace(/'/g, "\\'");
        const safeChap = String(item.chapter).replace(/'/g, "\\'");
        const safeVerse = String(item.verse).replace(/'/g, "\\'");

        html += `
            <div class="scr-history-item" onclick="clickScriptureHistoryItem('${safeBook}', '${safeChap}', '${safeVerse}')" title="${refLabel} (${timeLabel})">
                <span class="scr-history-text">${refLabel}</span>
                <span class="scr-history-time">${timeLabel}</span>
            </div>
        `;
    });

    listEl.innerHTML = html;
}

async function recordScriptureHistory(book, chapter, verse) {
    if (!book) return;
    const chapStr = String(chapter || "1").trim();
    const verseStr = String(verse || "1").trim();
    const canonicalBook = typeof translateBookName === 'function' ? translateBookName(book, 'en') : book;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;

    // Instant local update (dedup & unshift)
    scriptureHistory = scriptureHistory.filter(item =>
        !(item.book.toLowerCase() === canonicalBook.toLowerCase() &&
            String(item.chapter) === chapStr &&
            String(item.verse) === verseStr)
    );
    scriptureHistory.unshift({
        book: canonicalBook,
        chapter: chapStr,
        verse: verseStr,
        time: timeStr
    });
    if (scriptureHistory.length > 50) scriptureHistory = scriptureHistory.slice(0, 50);

    renderScriptureHistory();

    // Persist to backend
    try {
        await fetch('/api/scripture/history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                book: canonicalBook,
                chapter: chapStr,
                verse: verseStr,
                time: timeStr
            })
        });
    } catch (e) {
        console.error("Error saving scripture history to backend:", e);
    }
}

async function clickScriptureHistoryItem(book, chapter, verse) {
    const bookInput = document.getElementById("bible-book");
    const chapInput = document.getElementById("bible-chapter");
    const verseInput = document.getElementById("bible-verse");
    const searchInput = document.getElementById("bible-search-input");

    const targetLang = document.getElementById('scr-title-lang')?.value || document.getElementById('scr-global-lang')?.value || 'id';
    const finalBookName = typeof translateBookName === 'function' ? translateBookName(book, targetLang) : book;

    if (bookInput) bookInput.value = book;
    if (chapInput) chapInput.value = chapter;
    if (verseInput) verseInput.value = verse;
    if (searchInput) searchInput.value = `${finalBookName} ${chapter}:${verse}`;

    // Jalankan pencarian dan otomatis fire ayat tersebut ke layar proyektor & LT
    await searchScripture(false);
}

async function clearScriptureHistory() {
    const isOk = await showCustomDialog(
        "confirm",
        'Are you sure you want to clear scripture history?<br><small style="color:#888;">Riwayat ayat hari ini akan dihapus permanen.</small>'
    );
    if (!isOk) return;

    scriptureHistory = [];
    renderScriptureHistory();

    try {
        await fetch('/api/scripture/history', { method: 'DELETE' });
        if (typeof showToast === 'function') {
            showToast("Scripture history cleared", "success", 1000);
        }
    } catch (e) {
        console.error("Error clearing scripture history:", e);
    }
}

// Auto-init scripture history
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadScriptureHistory);
} else {
    loadScriptureHistory();
}

// 🎯 FIX MUTLAK: Pastikan ada (silent = false) agar tidak error saat dipanggil dari checkbox
// ==========================================
// WIRE SCRIPTURE — SISTEM MANDIRI PENUH
// Tidak terhubung ke lyricsData / currentIndex / fireLyric
// ==========================================

// 🎯 NAVIGATION TARGET MANAGEMENT (SCRIPTURE vs LYRICS)
window.activeNavTarget = 'lyrics';

window.setNavigationTarget = function (target) {
    window.activeNavTarget = (target === 'scripture') ? 'scripture' : 'lyrics';
};

window.isScriptureNavActive = function () {
    if (window.activeNavTarget !== 'scripture') return false;
    const scrPanel = document.getElementById("scr-lib-panel");
    const bgContent = document.getElementById("bg-library-content");
    const isScrVisible = scrPanel && scrPanel.style.display !== "none" &&
                         bgContent && bgContent.style.display !== "none";
    return !!(isScrVisible && Array.isArray(scriptureData) && scriptureData.length > 0);
};

window.navigateScripture = function (direction) {
    if (!Array.isArray(scriptureData) || scriptureData.length === 0) return;

    if (direction === 'next') {
        if (currentScrIndex === -1) {
            fireScriptureVerse(0);
        } else if (currentScrIndex < scriptureData.length - 1) {
            fireScriptureVerse(currentScrIndex + 1);
        }
    } else if (direction === 'prev') {
        if (currentScrIndex === -1) {
            fireScriptureVerse(0);
        } else if (currentScrIndex > 0) {
            fireScriptureVerse(currentScrIndex - 1);
        }
    }
};

let scriptureData = [];     // Array ayat terpisah dari lyricsData
let currentScrIndex = -1;  // Index ayat aktif di scripture grid

async function searchScripture(silent = false) {
    const checked = document.querySelectorAll(".bible-version-cb:checked");
    if (checked.length === 0) {
        if (!silent) showToast("Select at least 1 Bible translation!", "error", 1300);
        return;
    }

    const v1 = checked[0].value;
    const v2 = checked.length > 1 ? checked[1].value : "";

    const searchInput = document.getElementById("bible-search-input");
    const bookInput = document.getElementById("bible-book");
    const chapInput = document.getElementById("bible-chapter");
    const verseInput = document.getElementById("bible-verse");

    let shouldAutoFire = true;

    if (searchInput && searchInput.value.trim()) {
        const parsed = parseScriptureReference(searchInput.value.trim());
        if (!parsed.valid) {
            if (!silent) showToast("Format referensi tidak dikenali. Contoh: Mat 1:1 atau 1Pet 2 10", "error", 1300);
            return;
        }
        if (bookInput) bookInput.value = parsed.bookEng;
        if (chapInput) chapInput.value = parsed.chapter;
        if (verseInput) verseInput.value = parsed.verse;
        shouldAutoFire = parsed.isSingleVerse;
    }

    const rawBook = bookInput ? bookInput.value : "";
    if (!rawBook) {
        if (!silent) showToast("Book is required!", "error", 1300);
        return;
    }

    if (chapInput && !chapInput.value) chapInput.value = "1";
    if (verseInput && !verseInput.value) verseInput.value = "1";

    const chapter = chapInput ? chapInput.value : "1";
    const engBook = translateBookName(rawBook, 'en');

    try {
        const res = await fetch(`/api/scripture/chapter?v1=${encodeURIComponent(v1)}&book=${encodeURIComponent(engBook)}&chapter=${encodeURIComponent(chapter)}&v2=${encodeURIComponent(v2)}`);
        const data = await res.json();

        if (data.status === "success") {
            const targetLang = document.getElementById('scr-title-lang')?.value || 'id';
            const canonicalBookName = data.book_name || engBook;
            const finalBookName = translateBookName(canonicalBookName, targetLang);

            // Update label "current loaded" — tanpa mengganggu currentSongTitle
            const loadedLabel = document.getElementById("now-loaded-text");
            if (loadedLabel) {
                loadedLabel.innerText = `📖 ${finalBookName} ${chapter}`;
                loadedLabel.classList.remove("now-loaded-cyan", "now-loaded-ppt");
                loadedLabel.classList.add("now-loaded-scripture");
            }

            // Populate scriptureData — BUKAN lyricsData
            scriptureData = data.data.map(item => ({
                verse: item.verse,
                book: canonicalBookName,
                chapter: chapter,
                text1: item.text1,
                text2: item.text2 || "",
                v1_name: v1,
                v2_name: v2
            }));

            currentScrIndex = -1;
            renderScriptureGrid();

            // Auto-fire atau sorot ayat target
            const targetVerse = verseInput ? verseInput.value : "1";
            let targetIdx = 0;
            if (targetVerse) {
                const found = scriptureData.findIndex(item => parseInt(item.verse) === parseInt(targetVerse));
                if (found !== -1) targetIdx = found;
            }

            if (shouldAutoFire) {
                fireScriptureVerse(targetIdx);
            } else {
                selectScriptureVersePreview(targetIdx);
            }

            setNavigationTarget('scripture');
            if (searchInput) searchInput.blur();

        } else {
            if (!silent) showToast(data.message, "error", 1300);
        }
    } catch (e) {
        console.error("Scripture Error Detail:", e);
        if (!silent) showToast("Network / system error", "error", 1300);
    }
}

// Sorot ayat di Verse List tanpa broadcast live ke proyektor
function selectScriptureVersePreview(idx) {
    if (!scriptureData || idx < 0 || idx >= scriptureData.length) return;
    setNavigationTarget('scripture');

    const item = scriptureData[idx];
    currentScrIndex = idx;
    highlightScriptureBox(idx, false);

    const verseInput = document.getElementById("bible-verse");
    if (verseInput) verseInput.value = item.verse;

    const targetLang = document.getElementById('scr-title-lang')?.value || 'id';
    const finalBookName = translateBookName(item.book, targetLang);
    const searchInput = document.getElementById("bible-search-input");
    if (searchInput) {
        searchInput.value = `${finalBookName} ${item.chapter}:${item.verse}`;
    }
}

// Kirim ayat langsung ke display via WebSocket — tanpa fireLyric(), tanpa lyricsData
function fireScriptureVerse(idx) {
    if (!scriptureData || idx < 0 || idx >= scriptureData.length) return;
    setNavigationTarget('scripture');

    const item = scriptureData[idx];
    currentScrIndex = idx;
    highlightScriptureBox(idx, true);

    // Rekam ke history scripture harian
    if (item && item.book && item.chapter && item.verse) {
        recordScriptureHistory(item.book, item.chapter, item.verse);
    }

    // Sinkronkan input verse di panel kiri
    const verseInput = document.getElementById("bible-verse");
    if (verseInput) verseInput.value = item.verse;

    const targetLang = document.getElementById('scr-title-lang')?.value || 'id';
    const finalBookName = translateBookName(item.book, targetLang);

    // Sinkronkan teks input utama
    const searchInput = document.getElementById("bible-search-input");
    if (searchInput) {
        searchInput.value = `${finalBookName} ${item.chapter}:${item.verse}`;
    }

    // Kirim ke display & LT via WebSocket — wire mandiri
    const showDisp = document.getElementById('scr-disp-enable')?.checked ?? true;
    const showLt = document.getElementById('scr-lt-enable')?.checked ?? true;

    const payload = {
        show_display: showDisp,
        show_lt: showLt,
        book: finalBookName,
        chapter: item.chapter,
        verse: item.verse,
        text1: item.text1,
        text2: item.text2,
        v1_name: item.v1_name || "",
        v2_name: item.v2_name || ""
    };

    if (typeof ws !== 'undefined' && ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "update_scripture", payload }));
    }

    if (typeof foldbackWS !== 'undefined' && foldbackWS && foldbackWS.readyState === WebSocket.OPEN) {
        foldbackWS.send(JSON.stringify({
            action: "update_foldback_lyric",
            payload: { type: 'scripture', text1: item.text1, text2: item.text2, reference: `${finalBookName} ${item.chapter}:${item.verse}` }
        }));
    }
}

function renderScriptureGrid() {
    const container = document.getElementById("scripture-grid-container");
    if (!container) return;
    container.innerHTML = "";
    currentScrIndex = -1;

    if (!scriptureData || scriptureData.length === 0) return;

    scriptureData.forEach((item, idx) => {
        const box = document.createElement("div");
        box.className = "scr-verse-box";
        box.id = `scr-box-${idx}`;

        // Nomor verse — bold, kiri
        const label = document.createElement("div");
        label.className = "scr-verse-label";
        label.textContent = item.verse;

        // Separator vertikal
        const divider = document.createElement("div");
        divider.className = "scr-verse-divider";

        // Wrapper teks kanan
        const content = document.createElement("div");
        content.className = "scr-verse-content";

        const text = document.createElement("div");
        text.className = "scr-verse-text";
        text.textContent = item.text1 || "";
        content.appendChild(text);

        if (item.text2) {
            const text2 = document.createElement("div");
            text2.className = "scr-verse-text2";
            text2.textContent = item.text2;
            content.appendChild(text2);
        }

        box.appendChild(label);
        box.appendChild(divider);
        box.appendChild(content);

        // Tombol MATIKAN (hanya muncul saat ayat LIVE)
        const killBtn = document.createElement("button");
        killBtn.className = "btn-scr-kill";
        killBtn.textContent = "✖ DISABLE";
        killBtn.title = "Clear verse from screen";
        killBtn.onclick = (e) => {
            e.stopPropagation();
            clearScriptureLive();
            box.classList.remove("scr-verse-active");
        };
        box.appendChild(killBtn);

        // Klik untuk tampilkan ayat — wire scripture mandiri
        box.onclick = () => {
            setNavigationTarget('scripture');
            fireScriptureVerse(idx);
        };

        container.appendChild(box);
    });
}

function highlightScriptureBox(idx, isLive = false) {
    document.querySelectorAll(".scr-verse-box").forEach(b => {
        b.classList.remove("scr-verse-active", "scr-verse-selected");
    });
    const el = document.getElementById(`scr-box-${idx}`);
    if (el) {
        el.classList.add("scr-verse-selected");
        if (isLive) {
            el.classList.add("scr-verse-active");
        }
        el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
}



document.addEventListener("DOMContentLoaded", () => {
    loadBibleTranslations(); fetchScripturePresets();

    const prevBox = document.getElementById('scr-preview-container');
    if (prevBox) previewObserver.observe(prevBox);

    populateBibleDatalist();

    // Dengarkan kalau VJ ganti bahasa di Modal
    const langSelect = document.getElementById('scr-title-lang');
    if (langSelect) langSelect.addEventListener('change', handleLanguageChange);

    const scrGridEl = document.getElementById("scripture-grid-container");
    if (scrGridEl) scrGridEl.addEventListener("click", () => setNavigationTarget('scripture'));
    const lyricGridEl = document.getElementById("grid-container");
    if (lyricGridEl) lyricGridEl.addEventListener("click", () => setNavigationTarget('lyrics'));
});

// ==========================================
// 🎨 SCRIPTURE SETTINGS MODAL LOGIC
// ==========================================

function openScriptureSettings() {
    const modal = document.getElementById('scripture-settings-modal');
    enterModalIframeMode('scripture-settings-modal', () => {
        if (modal) {
            modal.classList.add('modal-active');
            modal.classList.remove('te-hidden');
            mountScriptureMiniIframes();
            updateScrLayoutUI();
        }
    });
}

function closeScriptureSettings() {
    const modal = document.getElementById('scripture-settings-modal');
    exitModalIframeMode('scripture-settings-modal', () => {
        if (modal) {
            modal.classList.remove('modal-active');
            modal.classList.add('te-hidden');
        }
    });
}

function toggleScrLayoutMode() {
    const mode = document.getElementById('scr-mode').value;
    const overlayCard = document.getElementById('scr-card-overlay');
    const opacityInput = document.getElementById('scr-bg-opacity'); // Slider opacity

    if (overlayCard) {
        if (mode === 'overlay') overlayCard.classList.remove('te-hidden');
        else overlayCard.classList.add('te-hidden');
    }

    // 🎯 Kunci UI slider opacity jadi redup & disabled kalau mode Fullscreen
    if (mode === 'fullscreen' && opacityInput) {
        opacityInput.disabled = true;
        opacityInput.style.opacity = '0.4';
    } else if (opacityInput) {
        opacityInput.disabled = false;
        opacityInput.style.opacity = '1';
    }

    // 🎯 FIX BUG: Kode pembatas 1 terjemahan (checkedBoxes.length > 1) 
    // TELAH DIHAPUS TOTAL DARI SINI AGAR LOWERTHIRD BISA 2 TERJEMAHAN!

    applyScriptureSettings();
}

function toggleScrBgType() {
    const bgType = document.getElementById('scr-bg-type').value;
    const rowColor = document.getElementById('scr-row-bg-color');
    const rowMedia = document.getElementById('scr-row-bg-media');

    // Sembunyikan semua dulu
    if (rowColor) rowColor.classList.add('te-hidden');
    if (rowMedia) rowMedia.classList.add('te-hidden');

    // Tampilkan sesuai pilihan VJ
    if (bgType === 'color' && rowColor) {
        rowColor.classList.remove('te-hidden');
    } else if (bgType === 'media' && rowMedia) {
        rowMedia.classList.remove('te-hidden');
    }
}

window.toggleScrStyle = function (pfx, section, style) {
    const btn = document.getElementById(`scr-${pfx}-${section}-${style}`);
    if (!btn) return;
    btn.classList.toggle('active');

    const isFollow = document.getElementById('scr-lt-follow')?.checked;
    if (isFollow && pfx === 'disp') {
        const ltBtn = document.getElementById(`scr-lt-${section}-${style}`);
        if (ltBtn) {
            ltBtn.classList.toggle('active', btn.classList.contains('active'));
        }
    }

    clearTimeout(scrDebounceTimer);
    scrDebounceTimer = setTimeout(() => {
        applyScriptureSettings();
    }, 100);
};

function getScrIntVal(id, fallback) {
    const raw = document.getElementById(id)?.value;
    if (raw === undefined || raw === null || raw === '') return fallback;
    const parsed = parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getScrFloatVal(id, fallback) {
    const raw = document.getElementById(id)?.value;
    if (raw === undefined || raw === null || raw === '') return fallback;
    const parsed = parseFloat(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function setScrFullscreenPosUI(pfx, pos) {
    const validPos = (pos === 'center' || pos === 'bottom') ? pos : 'top';
    ['top', 'center', 'bottom'].forEach(p => {
        const btn = document.getElementById(`scr-${pfx}-fs-pos-${p}`);
        if (btn) btn.classList.toggle('active', p === validPos);
    });
}

function getScrFullscreenPosUI(pfx) {
    for (const p of ['top', 'center', 'bottom']) {
        if (document.getElementById(`scr-${pfx}-fs-pos-${p}`)?.classList.contains('active')) {
            return p;
        }
    }
    return 'top';
}

window.setScrFullscreenPos = function (pfx, pos) {
    setScrFullscreenPosUI(pfx, pos);
    const isFollow = document.getElementById('scr-lt-follow')?.checked;
    if (isFollow && pfx === 'disp') {
        setScrFullscreenPosUI('lt', pos);
    }
    clearTimeout(scrDebounceTimer);
    scrDebounceTimer = setTimeout(() => {
        applyScriptureSettings();
    }, 100);
};

function getScrConfig(pfx) {
    // 🎯 FIX: Pastikan parsing angka yang benar (PX), bukan VW, serta pertahankan nilai 0
    return {
        mode: document.getElementById(`scr-${pfx}-mode`)?.value || 'overlay',
        bg_type: document.getElementById(`scr-${pfx}-bg-type`)?.value || 'transparent',
        bg_color: document.getElementById(`scr-${pfx}-bg-color`)?.value || '#000000',
        bg_opacity: getScrFloatVal(`scr-${pfx}-bg-opacity`, 0.8),
        bg_blur: getScrIntVal(`scr-${pfx}-bg-blur`, 0),

        // 🎯 Parsing persentase ke angka bulat
        fullscreen_pos: getScrFullscreenPosUI(pfx),
        overlay_height: getScrIntVal(`scr-${pfx}-overlay-height`, 35),
        overlay_pos: document.getElementById(`scr-${pfx}-overlay-pos`)?.value || 'bottom',
        overlay_radius: getScrIntVal(`scr-${pfx}-overlay-radius`, 15),

        title_pos: document.getElementById(`scr-${pfx}-title-pos`)?.value || 'top',
        title_font: document.getElementById(`scr-${pfx}-title-font`)?.value || 'Montserrat',
        title_size: getScrIntVal(`scr-${pfx}-title-size`, 28),
        title_color: document.getElementById(`scr-${pfx}-title-color`)?.value || '#00e5ff',
        title_align: document.getElementById(`scr-${pfx}-title-align`)?.value || 'left',
        title_bold: document.getElementById(`scr-${pfx}-title-bold`)?.classList.contains('active') || false,
        title_italic: document.getElementById(`scr-${pfx}-title-italic`)?.classList.contains('active') || false,
        title_underline: document.getElementById(`scr-${pfx}-title-underline`)?.classList.contains('active') || false,

        // 🎯 Padding PX EXPLISIT
        title_pad_t: getScrIntVal(`scr-${pfx}-title-pad-t`, 15),
        title_pad_b: getScrIntVal(`scr-${pfx}-title-pad-b`, 15),
        title_pad_l: getScrIntVal(`scr-${pfx}-title-pad-l`, 20),
        title_pad_r: getScrIntVal(`scr-${pfx}-title-pad-r`, 20),

        body_font: document.getElementById(`scr-${pfx}-body-font`)?.value || 'Montserrat',
        body_size: getScrIntVal(`scr-${pfx}-body-size`, 45),
        body_auto: document.getElementById(`scr-${pfx}-body-auto`)?.checked || false,
        body_color: document.getElementById(`scr-${pfx}-body-color`)?.value || '#ffffff',
        body_align: document.getElementById(`scr-${pfx}-body-align`)?.value || 'left',
        body_bold: document.getElementById(`scr-${pfx}-body-bold`)?.classList.contains('active') || false,
        body_italic: document.getElementById(`scr-${pfx}-body-italic`)?.classList.contains('active') || false,
        body_underline: document.getElementById(`scr-${pfx}-body-underline`)?.classList.contains('active') || false,

        // 🎯 Padding PX EXPLISIT
        body_pad_t: getScrIntVal(`scr-${pfx}-body-pad-t`, 20),
        body_pad_b: getScrIntVal(`scr-${pfx}-body-pad-b`, 20),
        body_pad_l: getScrIntVal(`scr-${pfx}-body-pad-l`, 30),
        body_pad_r: getScrIntVal(`scr-${pfx}-body-pad-r`, 30)
    };
}
function setScrConfigToUI(pfx, config) {
    if (!config) return;
    if (document.getElementById(`scr-${pfx}-mode`)) document.getElementById(`scr-${pfx}-mode`).value = config.mode || 'overlay';
    if (document.getElementById(`scr-${pfx}-bg-type`)) document.getElementById(`scr-${pfx}-bg-type`).value = config.bg_type || 'transparent';
    if (document.getElementById(`scr-${pfx}-bg-color`)) document.getElementById(`scr-${pfx}-bg-color`).value = config.bg_color || '#000000';
    if (document.getElementById(`scr-${pfx}-bg-opacity`)) document.getElementById(`scr-${pfx}-bg-opacity`).value = config.bg_opacity ?? 0.8;
    if (document.getElementById(`scr-${pfx}-bg-blur`)) document.getElementById(`scr-${pfx}-bg-blur`).value = config.bg_blur ?? 0;
    setScrFullscreenPosUI(pfx, config.fullscreen_pos || 'top');
    if (document.getElementById(`scr-${pfx}-overlay-height`)) document.getElementById(`scr-${pfx}-overlay-height`).value = config.overlay_height ?? 35;
    if (document.getElementById(`scr-${pfx}-overlay-pos`)) document.getElementById(`scr-${pfx}-overlay-pos`).value = config.overlay_pos || 'bottom';
    if (document.getElementById(`scr-${pfx}-overlay-radius`)) document.getElementById(`scr-${pfx}-overlay-radius`).value = config.overlay_radius ?? 15;

    if (document.getElementById(`scr-${pfx}-title-pos`)) document.getElementById(`scr-${pfx}-title-pos`).value = config.title_pos || 'top';
    if (document.getElementById(`scr-${pfx}-title-font`)) document.getElementById(`scr-${pfx}-title-font`).value = config.title_font || 'Montserrat';
    if (document.getElementById(`scr-${pfx}-title-size`)) document.getElementById(`scr-${pfx}-title-size`).value = config.title_size ?? 28;
    if (document.getElementById(`scr-${pfx}-title-color`)) document.getElementById(`scr-${pfx}-title-color`).value = config.title_color || '#00e5ff';
    if (document.getElementById(`scr-${pfx}-title-align`)) document.getElementById(`scr-${pfx}-title-align`).value = config.title_align || 'left';
    const tBold = document.getElementById(`scr-${pfx}-title-bold`);
    const tItalic = document.getElementById(`scr-${pfx}-title-italic`);
    const tUnderline = document.getElementById(`scr-${pfx}-title-underline`);
    if (tBold) tBold.classList.toggle('active', !!config.title_bold);
    if (tItalic) tItalic.classList.toggle('active', !!config.title_italic);
    if (tUnderline) tUnderline.classList.toggle('active', !!config.title_underline);

    // 🎯 Padding PX EXPLISIT
    if (document.getElementById(`scr-${pfx}-title-pad-t`)) document.getElementById(`scr-${pfx}-title-pad-t`).value = config.title_pad_t ?? 15;
    if (document.getElementById(`scr-${pfx}-title-pad-b`)) document.getElementById(`scr-${pfx}-title-pad-b`).value = config.title_pad_b ?? 15;
    if (document.getElementById(`scr-${pfx}-title-pad-l`)) document.getElementById(`scr-${pfx}-title-pad-l`).value = config.title_pad_l ?? 20;
    if (document.getElementById(`scr-${pfx}-title-pad-r`)) document.getElementById(`scr-${pfx}-title-pad-r`).value = config.title_pad_r ?? 20;

    if (document.getElementById(`scr-${pfx}-body-font`)) document.getElementById(`scr-${pfx}-body-font`).value = config.body_font || 'Montserrat';
    if (document.getElementById(`scr-${pfx}-body-size`)) document.getElementById(`scr-${pfx}-body-size`).value = config.body_size ?? 45;
    if (document.getElementById(`scr-${pfx}-body-auto`)) document.getElementById(`scr-${pfx}-body-auto`).checked = config.body_auto || false;
    if (document.getElementById(`scr-${pfx}-body-color`)) document.getElementById(`scr-${pfx}-body-color`).value = config.body_color || '#ffffff';
    if (document.getElementById(`scr-${pfx}-body-align`)) document.getElementById(`scr-${pfx}-body-align`).value = config.body_align || 'left';
    const bBold = document.getElementById(`scr-${pfx}-body-bold`);
    const bItalic = document.getElementById(`scr-${pfx}-body-italic`);
    const bUnderline = document.getElementById(`scr-${pfx}-body-underline`);
    if (bBold) bBold.classList.toggle('active', !!config.body_bold);
    if (bItalic) bItalic.classList.toggle('active', !!config.body_italic);
    if (bUnderline) bUnderline.classList.toggle('active', !!config.body_underline);

    // 🎯 Padding PX EXPLISIT
    if (document.getElementById(`scr-${pfx}-body-pad-t`)) document.getElementById(`scr-${pfx}-body-pad-t`).value = config.body_pad_t ?? 20;
    if (document.getElementById(`scr-${pfx}-body-pad-b`)) document.getElementById(`scr-${pfx}-body-pad-b`).value = config.body_pad_b ?? 20;
    if (document.getElementById(`scr-${pfx}-body-pad-l`)) document.getElementById(`scr-${pfx}-body-pad-l`).value = config.body_pad_l ?? 30;
    if (document.getElementById(`scr-${pfx}-body-pad-r`)) document.getElementById(`scr-${pfx}-body-pad-r`).value = config.body_pad_r ?? 30;

    // 🎯 UPDATE UI STATE (Disabled inputs, dsb)
    updateScrLayoutUI();
}

let scrDebounceTimer;
function setupScrRealtime() {
    const modal = document.getElementById('scripture-settings-modal');
    if (!modal || modal.dataset.scrRealtimeInit === '1') return;
    modal.dataset.scrRealtimeInit = '1';

    const inputs = modal.querySelectorAll('.scr-input, .scr-color-picker, input[type="range"], input[type="checkbox"]');
    inputs.forEach(input => {
        input.addEventListener('input', handleRealtimeSync);
        input.addEventListener('change', handleRealtimeSync);
    });

    function handleRealtimeSync(e) {
        const input = e.target;
        const isFollow = document.getElementById('scr-lt-follow')?.checked;

        if (isFollow && input.id.startsWith('scr-disp-')) {
            const ltId = input.id.replace('scr-disp-', 'scr-lt-');
            const ltInput = document.getElementById(ltId);
            if (ltInput) {
                if (input.type === 'checkbox') ltInput.checked = input.checked;
                else ltInput.value = input.value;
            }
        }

        updateScrLayoutUI();

        // Debounce: Tahan 100ms agar WebSocket tidak jebol/LAG
        clearTimeout(scrDebounceTimer);
        scrDebounceTimer = setTimeout(() => {
            applyScriptureSettings();
        }, 100);
    }
}

function applyScriptureSettings() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        // Tembak dua config berbeda ke dua rute WebSocket yang berbeda (Display & LT)
        ws.send(JSON.stringify({ action: "update_scripture_config", payload: getScrConfig('disp') }));
        ws.send(JSON.stringify({ action: "update_scripture_lt_config", payload: getScrConfig('lt') }));
    }

    // Opsional: Matikan showToast di sini jika dirasa terlalu spam saat geser-geser slider
    // showToast("Pengaturan Dikirim ke Proyektor!", "success", 1000); 
}
// Dihapus notifikasi "Pengaturan Dikirim" agar tidak spam saat user menggeser slider
``

async function saveScrPreset(pfx) {
    const selectEl = document.getElementById(`scr-${pfx}-preset-select`);
    if (!selectEl) return;

    const name = selectEl.value;
    if (!name) {
        await saveAsScrPreset(pfx);
        return;
    }
    await performSaveScrPreset(pfx, name);
}

async function saveAsScrPreset(pfx) {
    const name = await showCustomDialog("prompt", "Enter new preset name:");
    if (!name) return; // Batal atau kosong
    await performSaveScrPreset(pfx, name);
}

// 🎯 FUNGSI BARU UNTUK TOMBOL MASTER SAVE DI BAWAH
async function saveAllScrPresets() {
    await saveScrPreset('disp');
    await saveScrPreset('lt');
    showToast("All settings saved!", "success");
    closeScriptureSettings(); // Tutup modal setelah disave
}

async function deleteScrPreset(pfx) {
    const selectEl = document.getElementById(`scr-${pfx}-preset-select`);
    if (!selectEl || !selectEl.value) return showToast("Select a preset from the dropdown first!", "warning", 1500);

    const name = selectEl.value;

    const isOk = await showCustomDialog("confirm", `Are you sure you want to delete preset <br><b style="color:#ff4444;">"${name}"</b>?`);
    if (!isOk) return; // Batal hapus

    showToast("Deleting...", "loading");
    await fetch(`/api/scripture_presets/${encodeURIComponent(name)}`, { method: 'DELETE' });
    showToast("Deleted!", "success", 1000);

    await fetchScripturePresets();
    selectEl.value = ""; // Reset tampilan dropdown
}

async function setDefaultScrPreset(pfx) {
    const selectEl = document.getElementById(`scr-${pfx}-preset-select`);
    if (!selectEl || !selectEl.value) return showToast("Select a preset from the dropdown first!", "warning", 1500);

    showToast("Setting default...", "loading");
    await fetch(`/api/scripture_presets/default/${encodeURIComponent(pfx)}/${encodeURIComponent(selectEl.value)}`, { method: 'POST' });
    showToast(`Successfully set as Default!`, "success", 1000);

    fetchScripturePresets();
}

window.handleScrLanguageChange = function () {
    handleLanguageChange();
    applyScriptureSettings();
}

// 🎯 CANCEL / RESET
function cancelScrEdit() {
    ['disp', 'lt'].forEach(pfx => {
        const selectEl = document.getElementById(`scr-${pfx}-preset-select`);
        if (selectEl && selectEl.value) loadScrPreset(pfx, selectEl.value);
        else setScrConfigToUI(pfx, getFallbackScrConfig(pfx)); // Kembalikan ke fallback jika custom
    });
    closeScriptureSettings(); // Tutup Modal
}



function loadScrPreset(pfx, overrideName = null) {
    const selectEl = document.getElementById(`scr-${pfx}-preset-select`);
    if (!selectEl) return;

    const name = overrideName !== null ? overrideName : selectEl.value;

    if (name && scripturePresetsDb[name]) {
        const data = scripturePresetsDb[name];

        // 🎯 LINTAS PRESET LOGIC: 
        // Jika sedang loading LT, tapi dipaket tsb tidak ada data .lt, 
        // maka coba ambil data .disp (atau data root format lama)
        let visualConfig = data[pfx];

        if (!visualConfig || Object.keys(visualConfig).length === 0) {
            const otherPfx = (pfx === 'disp' ? 'lt' : 'disp');
            visualConfig = data[otherPfx] || data; // Fallback ke slot lain atau format root
        }

        // Pastikan config valid (punya mode)
        if (visualConfig && visualConfig.mode) {
            setScrConfigToUI(pfx, visualConfig);
        } else {
            setScrConfigToUI(pfx, getFallbackScrConfig(pfx));
        }

        if (overrideName !== null) selectEl.value = name;
    }

    applyScriptureSettings();
}
let scripturePresetsData = {};

let currentDispPresetName = "";
let currentLtPresetName = "";
let scripturePresetsDb = {}; //Database di JS


async function fetchScripturePresets() {
    try {
        const res = await fetch('/api/scripture_presets');
        const data = await res.json();
        scripturePresetsDb = data.presets || {};

        const defaultDisp = data.default_disp || data.default || "";
        const defaultLt = data.default_lt || data.default || "";

        ['disp', 'lt'].forEach(pfx => {
            const selectEl = document.getElementById(`scr-${pfx}-preset-select`);
            const labelEl = document.getElementById(`${pfx}-default-label`);
            if (!selectEl) return;

            const currentVal = selectEl.value;
            const currentDefault = (pfx === 'disp') ? defaultDisp : defaultLt;

            selectEl.innerHTML = '<option value="">-- Custom / Unsaved --</option>';

            for (const name in scripturePresetsDb) {
                const isDef = (name === currentDefault) ? " (Default)" : "";
                selectEl.innerHTML += `<option value="${name}">${name}${isDef}</option>`;
            }

            if (labelEl) labelEl.innerText = `Startup Default: ${currentDefault || "Not Set"}`;

            if (currentVal && scripturePresetsDb[currentVal]) {
                selectEl.value = currentVal;
            } else if (currentDefault && scripturePresetsDb[currentDefault]) {
                loadScrPreset(pfx, currentDefault);
            } else {
                setScrConfigToUI(pfx, getFallbackScrConfig(pfx)); // 🎯 FIX: Default bawaan VJ Baru
            }
        });

        setupScrRealtime(); // Wajib Panggil Disini
        if (typeof applyScriptureSettings === "function") {
            applyScriptureSettings();
        }
    } catch (e) { console.error(e); showToast("Failed to load presets", "error"); }
}

function updateDefaultScrLabel(defName) {
    const lbl = document.getElementById("default-preset-label");
    if (lbl) lbl.innerText = `Default: ${defName || "Not Set"}`;
}

// Duplicate removed

function toggleScrAutoFit() {
    const isAuto = document.getElementById('scr-body-auto').checked;
    const sizeInput = document.getElementById('scr-body-size');
    if (sizeInput) {
        sizeInput.disabled = isAuto;
        sizeInput.style.opacity = isAuto ? '0.4' : '1';
    }
    applyScriptureSettings(); // Tembak real-time
}

// 🎯 FUNGSI BATAL: Kembalikan kondisi layar seperti semula (sebelum diedit)

// Tambahkan flag guard agar tidak double-fire dalam satu rAF tick
let _scrPreviewResizeScheduled = false;
function scaleModalPreviewScr() {
    if (_scrPreviewResizeScheduled) return;
    _scrPreviewResizeScheduled = true;
    window.requestAnimationFrame(() => {
        const wrapper = document.getElementById("scr-preview-box");
        const frame = document.getElementById("scr-preview-iframe");
        if (wrapper && frame) {
            frame.style.transform = `scale(${wrapper.offsetWidth / 1920})`;
        }
        _scrPreviewResizeScheduled = false;
    });
}

let iframeScaleObserverScr = null; // Deklarasi di luar agar tidak terjadi duplikasi

function attachIframeScalerScr() {
    const wrapper = document.getElementById('scr-preview-box');
    const iframe = document.getElementById('scr-preview-iframe');

    if (!wrapper || !iframe) return;

    // 1. KUNCI FORMAT OUTPUT: Memaksa iframe membaca diri sebagai layar 1080p utuh.
    iframe.style.width = "1920px";
    iframe.style.height = "1080px";
    iframe.style.position = "absolute";
    iframe.style.top = "0";
    iframe.style.left = "0";
    iframe.style.transformOrigin = "top left";
    iframe.style.border = "none";

    // 2. ENGINE PENGINTAI: Memantau ukuran wrapper secara real-time.
    // Saat modal dibuka, browser otomatis mendeteksi lebar valid dan langsung mengecilkan iframe.
    if (!iframeScaleObserverScr) {
        iframeScaleObserverScr = new ResizeObserver(entries => {
            const currentWidth = entries[0].contentRect.width;
            // Threshold 1px: skip micro-changes, konsisten dengan attachTextEditPreviewScaler
            if (currentWidth > 0 && Math.abs((window._lastScrIframeWidth || 0) - currentWidth) > 1) {
                window._lastScrIframeWidth = currentWidth;
                const scaleValue = currentWidth / 1920;
                iframe.style.transform = `scale(${scaleValue})`;
            }
        });
        iframeScaleObserverScr.observe(wrapper); // Hanya memantau kotak preview
    }
}
attachIframeScalerScr();

// ==========================================
// 📖 CANONICAL BIBLE BOOKS & ALIAS SYSTEM
// ==========================================
const BIBLE_BOOKS_MASTER = [
    { num: 1, en: "Genesis", id: "Kejadian", idAbbr: "Kej", enAbbr: "Gen", aliases: ["gen", "kej"] },
    { num: 2, en: "Exodus", id: "Keluaran", idAbbr: "Kel", enAbbr: "Ex", aliases: ["kel", "ex", "exo", "exod"] },
    { num: 3, en: "Leviticus", id: "Imamat", idAbbr: "Im", enAbbr: "Lev", aliases: ["im", "ima", "imam", "imamat", "lev", "leviticus"] },
    { num: 4, en: "Numbers", id: "Bilangan", idAbbr: "Bil", enAbbr: "Num", aliases: ["bil", "num"] },
    { num: 5, en: "Deuteronomy", id: "Ulangan", idAbbr: "Ul", enAbbr: "Deut", aliases: ["ul", "ula", "deut", "deu", "dt"] },
    { num: 6, en: "Joshua", id: "Yosua", idAbbr: "Yos", enAbbr: "Josh", aliases: ["yos", "josh", "jos"] },
    { num: 7, en: "Judges", id: "Hakim-Hakim", idAbbr: "Hak", enAbbr: "Judg", aliases: ["hak", "hakim", "hakimhakim", "judg", "jdg", "jud"] },
    { num: 8, en: "Ruth", id: "Rut", idAbbr: "Rut", enAbbr: "Ruth", aliases: ["rut", "ruth", "rth"] },
    { num: 9, en: "1 Samuel", id: "1 Samuel", idAbbr: "1 Sam", enAbbr: "1 Sam", aliases: ["1sam", "1sa", "1s"] },
    { num: 10, en: "2 Samuel", id: "2 Samuel", idAbbr: "2 Sam", enAbbr: "2 Sam", aliases: ["2sam", "2sa", "2s"] },
    { num: 11, en: "1 Kings", id: "1 Raja-Raja", idAbbr: "1 Raj", enAbbr: "1 Kgs", aliases: ["1raj", "1raja", "1rajaraja", "1rr", "1kgs", "1kg", "1ki", "1king", "1kings"] },
    { num: 12, en: "2 Kings", id: "2 Raja-Raja", idAbbr: "2 Raj", enAbbr: "2 Kgs", aliases: ["2raj", "2raja", "2rajaraja", "2rr", "2kgs", "2kg", "2ki", "2king", "2kings"] },
    { num: 13, en: "1 Chronicles", id: "1 Tawarikh", idAbbr: "1 Taw", enAbbr: "1 Chr", aliases: ["1taw", "1t", "1chr", "1ch"] },
    { num: 14, en: "2 Chronicles", id: "2 Tawarikh", idAbbr: "2 Taw", enAbbr: "2 Chr", aliases: ["2taw", "2t", "2chr", "2ch"] },
    { num: 15, en: "Ezra", id: "Ezra", idAbbr: "Ezr", enAbbr: "Ezra", aliases: ["ezr", "ezra"] },
    { num: 16, en: "Nehemiah", id: "Nehemia", idAbbr: "Neh", enAbbr: "Neh", aliases: ["neh", "nehem"] },
    { num: 17, en: "Esther", id: "Ester", idAbbr: "Est", enAbbr: "Esth", aliases: ["est", "esth"] },
    { num: 18, en: "Job", id: "Ayub", idAbbr: "Ayb", enAbbr: "Job", aliases: ["ayb", "job", "ayub"] },
    { num: 19, en: "Psalms", id: "Mazmur", idAbbr: "Mzm", enAbbr: "Ps", aliases: ["mzm", "maz", "ps", "psa", "psm", "psalm"] },
    { num: 20, en: "Proverbs", id: "Amsal", idAbbr: "Ams", enAbbr: "Prov", aliases: ["ams", "prov", "pro"] },
    { num: 21, en: "Ecclesiastes", id: "Pengkhotbah", idAbbr: "Pkh", enAbbr: "Eccl", aliases: ["pkh", "peng", "eccl", "ecc"] },
    { num: 22, en: "Song of Solomon", id: "Kidung Agung", idAbbr: "Kid", enAbbr: "Song", aliases: ["kid", "ka", "song", "sol", "kidungagung", "songofsolomon"] },
    { num: 23, en: "Isaiah", id: "Yesaya", idAbbr: "Yes", enAbbr: "Isa", aliases: ["yes", "isa"] },
    { num: 24, en: "Jeremiah", id: "Yeremia", idAbbr: "Yer", enAbbr: "Jer", aliases: ["yer", "jer"] },
    { num: 25, en: "Lamentations", id: "Ratapan", idAbbr: "Rat", enAbbr: "Lam", aliases: ["rat", "lam"] },
    { num: 26, en: "Ezekiel", id: "Yehezkiel", idAbbr: "Yeh", enAbbr: "Ezek", aliases: ["yeh", "yehez", "ezek", "eze"] },
    { num: 27, en: "Daniel", id: "Daniel", idAbbr: "Dan", enAbbr: "Dan", aliases: ["dan"] },
    { num: 28, en: "Hosea", id: "Hosea", idAbbr: "Hos", enAbbr: "Hosea", aliases: ["hos", "hosea"] },
    { num: 29, en: "Joel", id: "Yoel", idAbbr: "Yl", enAbbr: "Joel", aliases: ["yl", "yoe", "yoel", "joe", "joel"] },
    { num: 30, en: "Amos", id: "Amos", idAbbr: "Am", enAbbr: "Amos", aliases: ["am", "amo"] },
    { num: 31, en: "Obadiah", id: "Obaja", idAbbr: "Ob", enAbbr: "Obad", aliases: ["ob", "obad", "oba", "obd"] },
    { num: 32, en: "Jonah", id: "Yunus", idAbbr: "Yun", enAbbr: "Jonah", aliases: ["yun", "jon", "jonah"] },
    { num: 33, en: "Micah", id: "Mikha", idAbbr: "Mi", enAbbr: "Micah", aliases: ["mi", "mic", "mik"] },
    { num: 34, en: "Nahum", id: "Nahum", idAbbr: "Nah", enAbbr: "Nahum", aliases: ["nah"] },
    { num: 35, en: "Habakkuk", id: "Habakuk", idAbbr: "Hab", enAbbr: "Hab", aliases: ["hab"] },
    { num: 36, en: "Zephaniah", id: "Zefanya", idAbbr: "Zef", enAbbr: "Zeph", aliases: ["zef", "zeph", "zep"] },
    { num: 37, en: "Haggai", id: "Hagai", idAbbr: "Hag", enAbbr: "Hag", aliases: ["hag"] },
    { num: 38, en: "Zechariah", id: "Zakharia", idAbbr: "Za", enAbbr: "Zech", aliases: ["za", "zech", "zec", "zak"] },
    { num: 39, en: "Malachi", id: "Maleakhi", idAbbr: "Mal", enAbbr: "Mal", aliases: ["mal"] },

    // Perjanjian Baru (New Testament)
    { num: 40, en: "Matthew", id: "Matius", idAbbr: "Mat", enAbbr: "Matt", aliases: ["mat", "matt"] },
    { num: 41, en: "Mark", id: "Markus", idAbbr: "Mrk", enAbbr: "Mark", aliases: ["mrk", "mar", "mk", "mark"] },
    { num: 42, en: "Luke", id: "Lukas", idAbbr: "Luk", enAbbr: "Luke", aliases: ["luk", "luke", "lk"] },
    { num: 43, en: "John", id: "Yohanes", idAbbr: "Yoh", enAbbr: "John", aliases: ["yoh", "joh", "john", "jn"] },
    { num: 44, en: "Acts", id: "Kisah Para Rasul", idAbbr: "Kis", enAbbr: "Acts", aliases: ["kis", "act", "acts", "kisah", "kisahpararasul"] },
    { num: 45, en: "Romans", id: "Roma", idAbbr: "Rm", enAbbr: "Rom", aliases: ["rm", "rom"] },
    { num: 46, en: "1 Corinthians", id: "1 Korintus", idAbbr: "1 Kor", enAbbr: "1 Cor", aliases: ["1kor", "1cor", "1co", "1k"] },
    { num: 47, en: "2 Corinthians", id: "2 Korintus", idAbbr: "2 Kor", enAbbr: "2 Cor", aliases: ["2kor", "2cor", "2co", "2k"] },
    { num: 48, en: "Galatians", id: "Galatia", idAbbr: "Gal", enAbbr: "Gal", aliases: ["gal"] },
    { num: 49, en: "Ephesians", id: "Efesus", idAbbr: "Ef", enAbbr: "Eph", aliases: ["ef", "efe", "eph"] },
    { num: 50, en: "Philippians", id: "Filipi", idAbbr: "Flp", enAbbr: "Philip", aliases: ["flp", "fil", "phil", "phi", "php", "philip"] },
    { num: 51, en: "Colossians", id: "Kolose", idAbbr: "Kol", enAbbr: "Col", aliases: ["kol", "col"] },
    { num: 52, en: "1 Thessalonians", id: "1 Tesalonika", idAbbr: "1 Tes", enAbbr: "1 Thes", aliases: ["1tes", "1thes", "1the", "1th", "1tess"] },
    { num: 53, en: "2 Thessalonians", id: "2 Tesalonika", idAbbr: "2 Tes", enAbbr: "2 Thes", aliases: ["2tes", "2thes", "2the", "2th", "2tess"] },
    { num: 54, en: "1 Timothy", id: "1 Timotius", idAbbr: "1 Tim", enAbbr: "1 Tim", aliases: ["1tim", "1ti"] },
    { num: 55, en: "2 Timothy", id: "2 Timotius", idAbbr: "2 Tim", enAbbr: "2 Tim", aliases: ["2tim", "2ti"] },
    { num: 56, en: "Titus", id: "Titus", idAbbr: "Tit", enAbbr: "Titus", aliases: ["tit"] },
    { num: 57, en: "Philemon", id: "Filemon", idAbbr: "Flm", enAbbr: "Philem", aliases: ["flm", "phm", "filem", "philem"] },
    { num: 58, en: "Hebrews", id: "Ibrani", idAbbr: "Ibr", enAbbr: "Heb", aliases: ["ibr", "ib", "ibra", "ibrani", "heb", "hebrews"] },
    { num: 59, en: "James", id: "Yakobus", idAbbr: "Yak", enAbbr: "James", aliases: ["yak", "yk", "jas", "jam"] },
    { num: 60, en: "1 Peter", id: "1 Petrus", idAbbr: "1 Ptr", enAbbr: "1 Pet", aliases: ["1ptr", "1pet", "1pe", "1petr"] },
    { num: 61, en: "2 Peter", id: "2 Petrus", idAbbr: "2 Ptr", enAbbr: "2 Pet", aliases: ["2ptr", "2pet", "2pe", "2petr"] },
    { num: 62, en: "1 John", id: "1 Yohanes", idAbbr: "1 Yoh", enAbbr: "1 Jn", aliases: ["1yoh", "1joh", "1jo", "1jn"] },
    { num: 63, en: "2 John", id: "2 Yohanes", idAbbr: "2 Yoh", enAbbr: "2 Jn", aliases: ["2yoh", "2joh", "2jo", "2jn"] },
    { num: 64, en: "3 John", id: "3 Yohanes", idAbbr: "3 Yoh", enAbbr: "3 Jn", aliases: ["3yoh", "3joh", "3jo", "3jn"] },
    { num: 65, en: "Jude", id: "Yudas", idAbbr: "Yud", enAbbr: "Jude", aliases: ["yud", "jud"] },
    { num: 66, en: "Revelation", id: "Wahyu", idAbbr: "Why", enAbbr: "Rev", aliases: ["why", "rev", "wah"] }
];

function normalizeBookKey(s) {
    if (!s) return "";
    let str = String(s).toLowerCase();
    str = str.replace(/[\s\.\,\-\_\:\/]/g, "");
    return str;
}

function resolveBibleBook(rawBookName) {
    if (!rawBookName) return null;
    const norm = normalizeBookKey(rawBookName);
    if (!norm) return null;

    // Prioritas 1: Singkatan resmi persis (idAbbr & enAbbr)
    for (const b of BIBLE_BOOKS_MASTER) {
        if (normalizeBookKey(b.idAbbr) === norm || normalizeBookKey(b.enAbbr) === norm) {
            return b;
        }
    }

    // Prioritas 2: Nama lengkap / alias persis
    for (const b of BIBLE_BOOKS_MASTER) {
        if (normalizeBookKey(b.en) === norm || normalizeBookKey(b.id) === norm) {
            return b;
        }
        for (const a of b.aliases) {
            if (normalizeBookKey(a) === norm) {
                return b;
            }
        }
    }

    // Prioritas 3: Awalan (prefix) berdasarkan urutan kanonikal (1 - 66)
    for (const b of BIBLE_BOOKS_MASTER) {
        if (normalizeBookKey(b.en).startsWith(norm) || normalizeBookKey(b.id).startsWith(norm)) {
            return b;
        }
        if (normalizeBookKey(b.idAbbr).startsWith(norm) || normalizeBookKey(b.enAbbr).startsWith(norm)) {
            return b;
        }
        for (const a of b.aliases) {
            if (normalizeBookKey(a).startsWith(norm)) {
                return b;
            }
        }
    }

    return null;
}

function parseScriptureReference(inputStr) {
    if (!inputStr || typeof inputStr !== 'string') {
        return { valid: false };
    }
    let s = inputStr.trim();
    if (!s) return { valid: false };

    // 1. Ekstrak bookPrefix jika ada digit 1, 2, atau 3 (cth: "1 Samuel", "1Sam")
    let leadingNum = "";
    let afterPrefix = s;

    const mDigit = s.match(/^([123])\s*/);
    if (mDigit) {
        leadingNum = mDigit[1];
        afterPrefix = s.slice(mDigit[0].length);
    }

    // 2. Cari di mana angka pasal dimulai
    let digitIdx = afterPrefix.search(/\d/);
    let rawBookStr = "";
    let numPart = "";

    if (digitIdx === -1) {
        rawBookStr = (leadingNum ? leadingNum + " " : "") + afterPrefix.trim();
        numPart = "";
    } else {
        let bookLetters = afterPrefix.slice(0, digitIdx).trim();
        numPart = afterPrefix.slice(digitIdx).trim();
        rawBookStr = (leadingNum ? leadingNum + " " : "") + bookLetters;
    }

    const resolved = resolveBibleBook(rawBookStr);
    if (!resolved) {
        return { valid: false, rawBook: rawBookStr };
    }

    let chapter = "1";
    let verse = "1";
    let isSingleVerse = false;

    if (!numPart) {
        chapter = "1";
        verse = "1";
        isSingleVerse = false;
    } else {
        let mChap = numPart.match(/^(\d+)(.*)$/);
        if (mChap) {
            chapter = mChap[1];
            let restNum = mChap[2] || "";
            let mVerse = restNum.match(/^[\s:.\-\/,]+(\d+)(.*)$/);
            if (mVerse) {
                verse = mVerse[1];
                let remainder = mVerse[2] ? mVerse[2].trim() : "";
                if (/\d/.test(remainder)) {
                    isSingleVerse = false;
                } else {
                    isSingleVerse = true;
                }
            } else {
                verse = "1";
                isSingleVerse = false;
            }
        }
    }

    return {
        valid: true,
        bookNum: resolved.num,
        bookEng: resolved.en,
        bookId: resolved.id,
        chapter: String(parseInt(chapter, 10) || 1),
        verse: String(parseInt(verse, 10) || 1),
        isSingleVerse: isSingleVerse
    };
}

function getBibleBooksMap() {
    const map = {};
    for (const b of BIBLE_BOOKS_MASTER) {
        map[b.en] = b.id;
    }
    return map;
}

function translateBookName(bookName, targetLang) {
    if (!bookName) return "";
    const resolved = resolveBibleBook(bookName);
    if (resolved) {
        return targetLang === 'en' ? resolved.en : resolved.id;
    }
    const map = getBibleBooksMap();
    let engName = bookName;
    for (const [en, id] of Object.entries(map)) {
        if (bookName.toLowerCase() === id.toLowerCase() || bookName.toLowerCase() === en.toLowerCase()) {
            engName = en; break;
        }
    }
    return targetLang === 'en' ? engName : (map[engName] || bookName);
}


function handleScrFollowDisplay() {
    const isFollow = document.getElementById('scr-lt-follow').checked;
    const ltPanel = document.getElementById('scr-lt-settings-wrapper');

    if (isFollow) {
        ltPanel.classList.add('disabled-panel');
        // Kopi nilai dari display ke LT
        const dispConf = getScrConfig('disp');
        setScrConfigToUI('lt', dispConf); // Buat fungsi set ini sama seperti setScrConfigToUI yang lama tapi dinamis
    } else {
        ltPanel.classList.remove('disabled-panel');
    }
    applyScriptureSettings();
}


function renderScripturePresetList(pfx) {
    const listEl = document.getElementById(`scr-${pfx}-preset-list`);
    if (!listEl) return;

    listEl.innerHTML = "";
    const currentName = pfx === 'disp' ? currentDispPresetName : currentLtPresetName;

    // Tampilkan preset default kosong
    let emptyActive = !currentName ? 'active' : '';
    listEl.innerHTML += `<button class="preset-item-btn ${emptyActive}" onclick="loadScrPreset('${pfx}', '')">-- Custom / Unsaved --</button>`;

    for (const name in scripturePresetsDb) {
        let active = (currentName === name) ? 'active' : '';
        listEl.innerHTML += `<button class="preset-item-btn ${active}" onclick="loadScrPreset('${pfx}', '${name}')">${name}</button>`;
    }
}

async function performSaveScrPreset(pfx, name) {
    const config = getScrConfig(pfx);

    // Ambil data lama dari memori (agar saat save LT, Disp tidak ikut terhapus)
    let payload = scripturePresetsDb[name] ? JSON.parse(JSON.stringify(scripturePresetsDb[name])) : { disp: {}, lt: {} };

    // Jika formatnya masih jadul, ubah jadi format baru dulu
    if (!payload.disp && payload.mode) {
        payload = { disp: payload, lt: {} };
    }

    // Timpa hanya bagian yang sedang diedit (disp atau lt)
    payload[pfx] = config;

    showToast("Saving...", "loading");
    const res = await fetch(`/api/scripture_presets/${encodeURIComponent(name)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
    });

    if ((await res.json()).status === "success") {
        showToast(`Preset '${name}' saved!`, "success", 2000);
        await fetchScripturePresets(); // Refresh data dari server
        const selectEl = document.getElementById(`scr-${pfx}-preset-select`);
        if (selectEl) selectEl.value = name;
    }
}
function handleEnableToggle(pfx) {
    const chk = document.getElementById(`scr-${pfx}-enable`);
    const toggle = document.getElementById(`${pfx}-enable-toggle`);
    const text = document.getElementById(`${pfx}-enable-text`);
    const editor = document.getElementById(`scr-${pfx}-settings-wrapper`);
    const monitor = document.getElementById(`scr-mini-${pfx === 'disp' ? 'display' : 'lt'}`);

    if (chk.checked) {
        toggle.classList.add('active'); text.innerText = 'ENABLED';
        if (editor && pfx === 'disp') editor.classList.remove('disabled-panel');
        // Jika Disp enable, LT follow chk dibiarkan
        if (pfx === 'disp') document.getElementById('scr-lt-follow')?.parentElement.classList.remove('disabled-panel');
        if (monitor) monitor.parentElement.style.opacity = '1';
    } else {
        toggle.classList.remove('active'); text.innerText = 'DISABLED';
        if (editor && pfx === 'disp') editor.classList.add('disabled-panel');
        // Jika Disp disable, paksa LT follow disable
        if (pfx === 'disp') document.getElementById('scr-lt-follow')?.parentElement.classList.add('disabled-panel');
        if (monitor) monitor.parentElement.style.opacity = '0.3';
    }

    // Khusus LT, jika Enabled dinyalakan/dimatikan, panggil ulang Follow check
    if (pfx === 'lt') handleScrFollowDisplay();

    applyScriptureSettings();

    // Jika VJ sedang tayang, tembak websocket ulang agar proyektor update
    if (currentIndex >= 0 && lyricsData[currentIndex]?.type === 'scripture') {
        fireLyric(currentIndex, true);
    }
}

function handleScrFollowDisplay() {
    const isFollow = document.getElementById('scr-lt-follow')?.checked;
    const isDispEnabled = document.getElementById('scr-disp-enable')?.checked;
    const followToggle = document.getElementById('lt-follow-toggle');
    const ltEditor = document.getElementById('scr-lt-settings-wrapper');
    const ltPresetArea = document.getElementById('lt-preset-full-area');
    const ltEnableWrapper = document.getElementById('lt-enable-toggle'); // wrapper toggle LT

    // Pengaman: Jika Disp disabled, paksa Follow disabled
    if (!isDispEnabled && isFollow) {
        document.getElementById('scr-lt-follow').checked = false;
        handleScrFollowDisplay(); return;
    }

    if (isFollow) {
        followToggle.classList.add('follow-active');
        document.getElementById('lt-follow-text').innerText = '🔗 FOLLOW ON';
        ltEditor?.classList.add('disabled-panel');
        ltPresetArea?.classList.add('disabled-panel');
        ltEnableWrapper?.classList.add('disabled-panel'); // LT Enable Chk gabisa diubah

        // Paksa samakan data (set config disp ke UI LT)
        setScrConfigToUI('lt', getScrConfig('disp'));
    } else {
        followToggle.classList.remove('follow-active');
        document.getElementById('lt-follow-text').innerText = '🔗 FOLLOW OFF';
        ltEditor?.classList.remove('disabled-panel');
        ltPresetArea?.classList.remove('disabled-panel');
        ltEnableWrapper?.classList.remove('disabled-panel'); // LT Enable Chk bisa diubah

        // 🎯 FALLBACK KE PRESET LOWER THIRD YANG TERAKHIR / DEFAULT
        const selectLt = document.getElementById('scr-lt-preset-select');
        if (selectLt && selectLt.value) {
            loadScrPreset('lt', selectLt.value);
        } else {
            let defaultPresetName = "";
            if (selectLt) {
                for (let i = 0; i < selectLt.options.length; i++) {
                    const opt = selectLt.options[i];
                    if (opt.text && opt.text.includes("(Default)")) {
                        defaultPresetName = opt.value;
                        break;
                    }
                }
            }
            if (defaultPresetName) {
                loadScrPreset('lt', defaultPresetName);
            } else {
                setScrConfigToUI('lt', getFallbackScrConfig('lt'));
            }
        }
    }

    applyScriptureSettings();
}

function updateScrLayoutUI() {
    ['disp', 'lt'].forEach(pfx => {
        const modeEl = document.getElementById(`scr-${pfx}-mode`);
        const opacityInput = document.getElementById(`scr-${pfx}-bg-opacity`);
        const overlayPosEl = document.getElementById(`scr-${pfx}-overlay-pos`);
        const overlayHeightEl = document.getElementById(`scr-${pfx}-overlay-height`);
        const overlayPosRow = document.getElementById(`scr-${pfx}-overlay-pos-row`);
        const fsPosRow = document.getElementById(`scr-${pfx}-fs-pos-row`);
        const bodyAutoChk = document.getElementById(`scr-${pfx}-body-auto`);
        const bodySizeInput = document.getElementById(`scr-${pfx}-body-size`);

        // Handle Background Opacity & Position controls based on Mode
        if (modeEl) {
            const isFullscreen = modeEl.value === 'fullscreen';
            if (opacityInput) {
                opacityInput.disabled = isFullscreen;
                opacityInput.style.opacity = isFullscreen ? '0.4' : '1';
            }
            if (overlayPosEl) overlayPosEl.disabled = isFullscreen;
            if (overlayHeightEl) overlayHeightEl.disabled = isFullscreen;
            if (overlayPosRow) overlayPosRow.classList.toggle('scr-row-disabled', isFullscreen);

            if (fsPosRow) fsPosRow.classList.toggle('scr-row-disabled', !isFullscreen);
            ['top', 'center', 'bottom'].forEach(p => {
                const btn = document.getElementById(`scr-${pfx}-fs-pos-${p}`);
                if (btn) btn.disabled = !isFullscreen;
            });
        }

        // 🎯 Handle Body Size Grid state based on AUTO toggle
        if (bodyAutoChk && bodySizeInput) {
            bodySizeInput.disabled = bodyAutoChk.checked;
            bodySizeInput.style.opacity = bodyAutoChk.checked ? '0.4' : '1';
        }
    });
}


// Default bawaan murni kalau VJ belum punya preset sama sekali
function getFallbackScrConfig(pfx) {
    return {
        mode: pfx === 'disp' ? 'fullscreen' : 'overlay', bg_type: 'transparent', bg_color: '#000000', bg_opacity: 0.8, bg_blur: 0,
        fullscreen_pos: 'top',
        overlay_height: 35, overlay_pos: 'bottom', overlay_radius: 15,
        title_pos: 'top',
        title_font: 'Montserrat', title_size: 28, title_color: '#00e5ff', title_align: 'left',
        title_bold: false, title_italic: false, title_underline: false,
        title_pad_t: 15, title_pad_b: 15, title_pad_l: 20, title_pad_r: 20,
        body_font: 'Montserrat', body_size: 45, body_auto: true, body_color: '#ffffff', body_align: 'left',
        body_bold: false, body_italic: false, body_underline: false,
        body_pad_t: 20, body_pad_b: 20, body_pad_l: 30, body_pad_r: 30
    };
}
// --- REMOTE PPT SENDER ENGINE ---
let pptRemoteMode = false;
let senderWs = null;
let currentSender = null;
let lastSenderInfo = null;

window.enterPPTRemoteMode = function (sender) {
    pptRemoteMode = true;
    currentSender = sender;

    // Ensure presentation layer is NOT cleared/dimmed when entering remote mode
    if (typeof clearStates !== 'undefined' && clearStates['presentation']) {
        clearLayer('presentation');
    }

    // UI Update Title
    currentSongTitle = `🌐 REMOTE PPT: ${sender.device_name}`;
    const loadedLabel = document.getElementById("now-loaded-text");
    if (loadedLabel) {
        let displayTitle = currentSongTitle;
        if (displayTitle.length > 30) displayTitle = displayTitle.substring(0, 30) + "...";
        loadedLabel.innerText = displayTitle;
        loadedLabel.className = "now-loaded-ppt";
    }

    // Tentukan Base URL & WS URL
    let baseUrl = `http://${sender.ip}:${sender.ws_port}`;
    const tokenParam = sender.token ? `?auth=${sender.token}` : '';
    let wsUrl = `ws://${sender.ip}:${sender.ws_port}/ws${tokenParam}`;

    // Fix Layout: Completely reset grid-container styling for PPT remote mode
    const container = document.getElementById("grid-container");
    if (container) {
        container.classList.add("ppt-remote-active");
        // Force inline styles to override any specificity from .grid-container, .grid-mode-row etc.
        container.style.cssText = "display:flex !important; flex-direction:column !important; height:100% !important; width:100% !important; overflow:hidden !important; padding:0 !important; margin:0 !important; grid-template-columns:none !important; align-content:stretch !important;";
        container.innerHTML = `<div class="ppt-remote-loading">
            <div class="spinner"></div>
            <div id="ppt-remote-loading-text">CONNECTING TO DESKTOP...</div>
        </div>`;
    }

    showToast(`Connecting to ${sender.device_name}...`, "info", 2000);

    // Connect WebSocket ke Sender PC
    if (senderWs) {
        try { senderWs.close(); } catch (e) { }
    }

    senderWs = new WebSocket(wsUrl);

    senderWs.onopen = () => {
        console.log("[REMOTE] Connected to sender WS:", wsUrl);
        senderWs.send(JSON.stringify({ action: "get_slides" }));
    };

    senderWs.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === "slides_list") {
                renderRemotePPTGrid(data.payload.slides);
            } else if (data.type === "ppt_exporting") {
                const container = document.getElementById("grid-container");
                if (container && data.payload.status) {
                    container.innerHTML = `<div class="ppt-remote-loading">
                        <div class="spinner"></div>
                        <div id="ppt-remote-loading-text">EXPORTING PPT SLIDES... PLEASE WAIT</div>
                    </div>`;
                }
            } else if (data.type === "ppt_info") {
                // Auto-refresh thumbnails if presentation changed
                if (lastSenderInfo && lastSenderInfo.name !== data.payload.name) {
                    console.log("[REMOTE] Presentation changed, refreshing slides...");
                    senderWs.send(JSON.stringify({ action: "get_slides" }));
                }

                lastSenderInfo = data.payload;
                updateRemotePPTUI();

                // Sync ke Output Display (KOMP B)
                // Send regardless of is_running - exported thumbnails are always available
                if (pptRemoteMode && lastSenderInfo.current_slide > 0) {
                    const thumbUrl = `/api/senders/proxy/${currentSender.ip}/${currentSender.ws_port}/hd_thumbs/slide_${lastSenderInfo.current_slide}`;
                    ws.send(JSON.stringify({
                        action: "update_presentation",
                        payload: { url: thumbUrl, name: `Slide ${lastSenderInfo.current_slide}` }
                    }));
                }
            }
        } catch (err) { console.error("[REMOTE] WS Parse Error:", err); }
    };

    senderWs.onclose = () => {
        console.warn("[REMOTE] Sender WS Closed");
        const statusEl = document.getElementById("ppt-remote-status");
        if (statusEl) {
            statusEl.innerText = "Connection Lost / Disconnected";
            statusEl.classList.remove("connected");
            statusEl.classList.add("disconnected");
        }
        if (pptRemoteMode) {
            showToast("Sender Connection Lost!", "error", 3000);
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    action: "update_presentation",
                    payload: { url: "" }
                }));
            }
        }
    };
}

window.exitPPTRemoteMode = function () {
    if (!pptRemoteMode) return;

    console.log("[REMOTE] Exiting PPT Remote Mode");
    pptRemoteMode = false;

    if (senderWs) {
        try { senderWs.close(); } catch (e) { }
        senderWs = null;
    }

    const container = document.getElementById("grid-container");
    if (container) {
        container.classList.remove("ppt-remote-active");
        container.style.cssText = ""; // Restore to CSS class defaults
        container.innerHTML = '<div id="lyrics-display" class="lyrics-display"></div>';
    }

    const loadedLabel = document.getElementById("now-loaded-text");
    if (loadedLabel) {
        loadedLabel.innerText = "NO SONG LOADED";
        loadedLabel.className = "";
    }

    currentSongTitle = "";
}

// No blob cache needed - use direct image loading instead
window.loadRemoteImage = function (url, imgElement) {
    if (!url || !imgElement) return;
    // Direct image loading - backend returns Content-Disposition: inline
    // This prevents IDM from triggering
    imgElement.src = url;
};

function renderRemotePPTGrid(slides) {
    const container = document.getElementById("grid-container");
    if (!container) return;
    container.innerHTML = "";

    const layout = document.createElement("div");
    layout.className = "ppt-remote-layout";

    // LEFT COLUMN: PREVIEW + NOTES
    const previewCol = document.createElement("div");
    previewCol.className = "ppt-remote-sidebar"; // Existing class, used as left col

    const previewBox = document.createElement("div");
    previewBox.className = "ppt-remote-preview";
    const previewImg = document.createElement("img");
    previewImg.id = "ppt-remote-live-preview";
    previewBox.appendChild(previewImg);

    // Speaker Notes Overlay
    const notesBox = document.createElement("div");
    notesBox.id = "ppt-remote-notes";
    notesBox.className = "ppt-remote-notes-overlay";
    notesBox.innerHTML = "No notes available";
    previewBox.appendChild(notesBox);

    previewCol.appendChild(previewBox);

    // RIGHT COLUMN: CONTROLS + GRID
    const controlsCol = document.createElement("div");
    controlsCol.className = "ppt-remote-controls-col";

    const nav = document.createElement("div");
    nav.className = "ppt-remote-nav";
    nav.innerHTML = `
        <button class="ppt-remote-btn" onclick="sendRemotePPTAction('prev_slide')">PREVIOUS</button>
        <button class="ppt-remote-btn primary" onclick="sendRemotePPTAction('next_slide')">NEXT SLIDE</button>
    `;

    const info = document.createElement("div");
    info.className = "ppt-remote-info-card";
    info.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div>
                <div id="ppt-remote-status" class="ppt-remote-status-text connected">
                    Connected to <b>${currentSender.device_name}</b>
                </div>
                <div id="ppt-slide-counter" style="font-size: 0.65em; color: #666; margin-top: 4px;">Syncing slides...</div>
            </div>
            <button class="ppt-remote-btn" style="padding: 6px 12px; font-size: 0.7em; background: #ff3333; color: white; border: none; margin: 0; min-width: 0;" onclick="exitPPTRemoteMode(); setSidebarMode('local'); document.getElementById('grid-container').innerHTML = '';">DISCONNECT</button>
        </div>
    `;

    const gridArea = document.createElement("div");
    gridArea.className = "ppt-remote-grid-area";

    // Use direct remote URL without proxy to avoid IDM detection
    const baseUrl = `http://${currentSender.ip}:${currentSender.ws_port}`;
    const tokenParam = currentSender.token ? `&auth=${currentSender.token}` : '';

    slides.forEach((s, i) => {
        const num = i + 1;
        const thumb = document.createElement("div");
        thumb.className = "ppt-remote-thumb";
        thumb.id = `remote-thumb-${num}`;
        thumb.onclick = () => jumpToRemoteSlide(num);

        const img = document.createElement("img");
        img.loading = "lazy";

        const baseS = s.split('.')[0];
        // Use direct remote URL like bg.js does - not proxy
        const thumbUrl = `${baseUrl}/thumbs/${baseS}?t=${Date.now()}${tokenParam}`;
        img.src = thumbUrl;

        thumb.appendChild(img);
        const span = document.createElement("span");
        span.className = "ppt-remote-idx";
        span.innerText = num;
        thumb.appendChild(span);

        gridArea.appendChild(thumb);
    });

    controlsCol.appendChild(nav);
    controlsCol.appendChild(info);
    controlsCol.appendChild(gridArea);

    layout.appendChild(previewCol);
    layout.appendChild(controlsCol);
    container.appendChild(layout);

    if (lastSenderInfo) updateRemotePPTUI();
}

window.sendRemotePPTAction = function (action) {
    if (!senderWs || senderWs.readyState !== WebSocket.OPEN || !lastSenderInfo) return;

    senderWs.send(JSON.stringify({ action: action }));

    // Optimistic UI Update for zero perceived delay
    let nextIdx = lastSenderInfo.current_slide;
    if (action === 'next_slide' && nextIdx < lastSenderInfo.slide_count) nextIdx++;
    if (action === 'prev_slide' && nextIdx > 1) nextIdx--;

    if (nextIdx !== lastSenderInfo.current_slide) {
        lastSenderInfo.current_slide = nextIdx;
        updateRemotePPTUI();

        // Use proxy URL served from localhost to avoid IDM intercepting
        const thumbUrl = `/api/senders/proxy/${currentSender.ip}/${currentSender.ws_port}/hd_thumbs/slide_${nextIdx}`;
        ws.send(JSON.stringify({
            action: "update_presentation",
            payload: { url: thumbUrl, name: `Slide ${nextIdx}` }
        }));
    }
};

window.jumpToRemoteSlide = function (num) {
    if (!senderWs || senderWs.readyState !== WebSocket.OPEN || !lastSenderInfo) return;

    senderWs.send(JSON.stringify({ action: "goto_slide", index: num }));

    // Optimistic UI Update for zero perceived delay
    if (num !== lastSenderInfo.current_slide) {
        lastSenderInfo.current_slide = num;
        updateRemotePPTUI();

        // Use proxy URL served from localhost to avoid IDM intercepting
        const thumbUrl = `/api/senders/proxy/${currentSender.ip}/${currentSender.ws_port}/hd_thumbs/slide_${num}`;
        ws.send(JSON.stringify({
            action: "update_presentation",
            payload: { url: thumbUrl, name: `Slide ${num}` }
        }));
    }
};

function updateRemotePPTUI() {
    if (!currentSender || !lastSenderInfo) return;
    const previewImg = document.getElementById("ppt-remote-live-preview");
    const statusText = document.getElementById("ppt-slide-counter");
    const notesBox = document.getElementById("ppt-remote-notes");

    if (previewImg) {
        // Use direct remote URL without proxy to avoid IDM detection
        const baseUrl = `http://${currentSender.ip}:${currentSender.ws_port}`;
        const tokenParam = currentSender.token ? `&auth=${currentSender.token}` : '';
        const thumbUrl = `${baseUrl}/thumbs/slide_${lastSenderInfo.current_slide}?t=${Date.now()}${tokenParam}`;
        previewImg.src = thumbUrl;

        if (statusText) {
            statusText.innerText = `Slide ${lastSenderInfo.current_slide} of ${lastSenderInfo.slide_count}`;
        }

        if (notesBox) {
            notesBox.innerText = lastSenderInfo.notes || "No speaker notes for this slide";
            notesBox.style.display = lastSenderInfo.notes ? "block" : "none";
        }

        document.querySelectorAll(".ppt-remote-thumb").forEach(el => el.classList.remove("active"));
        const activeThumb = document.getElementById(`remote-thumb-${lastSenderInfo.current_slide}`);
        if (activeThumb) {
            activeThumb.classList.add("active");
            activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }
}

// ==========================================
// 🎹 KEYBOARD SHORTCUT EDITOR ENGINE (DYNAMIC CONFIG)
// ==========================================
let tempShortcuts = {};
let recordingAction = null;
let recordingListener = null;

function openShortcutEditorModal() {
    // Clone appShortcuts into tempShortcuts so changes are temporary until saved
    tempShortcuts = JSON.parse(JSON.stringify(appShortcuts));

    // Hide settings modal to avoid visual clutter
    safeCloseModal('settings-modal');

    // Populate list and open modal
    renderShortcutList();
    document.getElementById("shortcut-editor-modal").style.display = "flex";
}

function closeShortcutEditorModal() {
    cancelRecording();
    document.getElementById("shortcut-editor-modal").style.display = "none";
}

function renderShortcutList() {
    const container = document.getElementById("shortcut-list-container");
    if (!container) return;
    container.innerHTML = "";

    for (const action in tempShortcuts) {
        const label = shortcutActionLabels[action] || action;
        const s = tempShortcuts[action];

        const row = document.createElement("div");
        row.className = "shortcut-item-row";
        row.innerHTML = `
            <span class="shortcut-action-name">${label}</span>
            <div class="shortcut-badge-container">
                <span class="shortcut-key-badge" id="badge-${action}">${s.display || 'None'}</span>
                <button class="shortcut-btn-record" id="btn-record-${action}" onclick="recordShortcutKey('${action}')">Record Key</button>
            </div>
        `;
        container.appendChild(row);
    }
}

function recordShortcutKey(action) {
    if (recordingAction) {
        cancelRecording();
    }

    recordingAction = action;
    const btn = document.getElementById(`btn-record-${action}`);
    if (btn) {
        btn.innerText = "Listening...";
        btn.style.background = "#dc3545";
        btn.style.color = "#fff";
        btn.style.borderColor = "#dc3545";
    }

    recordingListener = function (e) {
        // Ignore standalone modifier key presses
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        // Count modifier keys (treat Cmd/metaKey equivalently to Ctrl on macOS)
        let modifiers = 0;
        const ctrl = !!(e.ctrlKey || e.metaKey);
        const shift = !!e.shiftKey;
        const alt = !!e.altKey;
        if (ctrl) modifiers++;
        if (shift) modifiers++;
        if (alt) modifiers++;

        if (modifiers > 2) {
            showToast("Maksimal 2 modifier key (CTRL, SHIFT, ALT)!", "error", 2000);
            return;
        }

        // Capture character key
        let key = e.key.toUpperCase();

        // Allow arrows, enter, escape, backspace, tab, space
        const allowedSpecialKeys = ['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'ENTER', 'ESCAPE', 'BACKSPACE', 'TAB', 'SPACE'];
        if (e.code === "Space") key = "SPACE";

        const isSpecialKey = allowedSpecialKeys.includes(key);
        if (key.length > 1 && !isSpecialKey) {
            // Ignore other standalone function keys
            return;
        }

        // Update temporary clone
        tempShortcuts[action] = {
            ctrlKey: ctrl,
            shiftKey: shift,
            altKey: alt,
            key: key === "SPACE" ? " " : key,
            display: (ctrl ? 'CTRL + ' : '') + (shift ? 'SHIFT + ' : '') + (alt ? 'ALT + ' : '') + key
        };

        cancelRecording();
        renderShortcutList();
    };

    window.addEventListener('keydown', recordingListener, true);
}

function cancelRecording() {
    if (recordingAction && recordingListener) {
        window.removeEventListener('keydown', recordingListener, true);
        const btn = document.getElementById(`btn-record-${recordingAction}`);
        if (btn) {
            btn.innerText = "Record Key";
            btn.style.background = "#222";
            btn.style.color = "#ccc";
            btn.style.borderColor = "#444";
        }
        recordingAction = null;
        recordingListener = null;
    }
}

async function saveEditedShortcuts() {
    // Apply temporary shortcuts globally
    appShortcuts = JSON.parse(JSON.stringify(tempShortcuts));

    // Save to server app_settings.json
    showToast("Saving shortcuts...", "loading");
    try {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shortcuts: appShortcuts })
        });

        if (res.ok) {
            showToast("Shortcuts saved successfully!", "success", 2000);
            closeShortcutEditorModal();
        } else {
            showToast("Failed to save shortcuts on server.", "error", 3000);
        }
    } catch (err) {
        console.error("Save shortcuts error:", err);
        showToast("Error connecting to server.", "error", 3000);
    }
}

// Expose editor and shortcut functions to the window object so they are globally defined in obfuscated environments
window.addEditorRow = addEditorRow;
window.deleteEditorRow = deleteEditorRow;
window.cycleTag = cycleTag;
window.toggleTagDropdown = toggleTagDropdown;
window.openShortcutEditorModal = openShortcutEditorModal;
window.closeShortcutEditorModal = closeShortcutEditorModal;
window.recordShortcutKey = recordShortcutKey;
window.saveEditedShortcuts = saveEditedShortcuts;
window.undoEditorState = undoEditorState;
window.smartBulkPaste = smartBulkPaste;
window.transformText = transformText;
window.saveFullEdit = saveFullEdit;
window.saveAndLoadNewSong = saveAndLoadNewSong;
window.openFullEditModal = openFullEditModal;
window.toggleGridDropdown = toggleGridDropdown;
window.selectGridMode = selectGridMode;
window.adjustGridBoxSize = adjustGridBoxSize;
window.toggleGridGrouping = toggleGridGrouping;

// ============================================================
// ADVANCED OUTPUT: Custom Resolution & QR Code
// ============================================================

// Current resolution mode per output type
const _advResModes = { main: 'default', lt: 'default', fb: 'default' };

// Path mapping for each output type
const _outputPathMap = { main: '/display', lt: '/lowerthird', fb: '/foldback' };

/**
 * Draw a QR code inside a container div using the qrcodejs library.
 * The container's id is passed (replaces canvas elements).
 * Falls back to a text message if the library is not available.
 */
function _drawQRCode(containerId, urlText) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear previous QR code
    container.innerHTML = '';

    if (typeof QRCode === 'undefined') {
        container.innerHTML = '<div style="width:140px;height:140px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;border-radius:6px;color:#555;font-size:10px;text-align:center;padding:10px;">QR library<br>not loaded</div>';
        return;
    }

    try {
        new QRCode(container, {
            text: urlText,
            width: 120,
            height: 120,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
        // Style the generated canvas/img
        const generated = container.querySelector('canvas, img');
        if (generated) {
            generated.style.borderRadius = '6px';
            generated.style.display = 'block';
        }
    } catch (e) {
        console.error('[QR Draw Error]', e);
        container.innerHTML = '<div style="width:140px;height:140px;background:#1a1a2e;display:flex;align-items:center;justify-content:center;border-radius:6px;color:#ef4444;font-size:10px;">QR Error</div>';
    }
}


/**
 * Open the Advanced Output modal, fetch local IP, draw QR codes,
 * and load saved resolution settings.
 */
async function openAdvancedOutputModal() {
    const modal = document.getElementById('advanced-output-modal');
    if (!modal) return;

    modal.style.display = 'flex';

    // 1. Fetch local IP from backend
    let localIP = '127.0.0.1';
    try {
        const res = await fetch('/api/local_ip');
        if (res.ok) {
            const data = await res.json();
            localIP = data.ip || '127.0.0.1';
        }
    } catch (e) {
        console.warn('[AdvOutput] Could not fetch local IP:', e);
    }

    const PORT = 18888;
    const outputDefs = [
        { key: 'main', canvasId: 'qr-main', urlElId: 'qr-url-main', path: '/display' },
        { key: 'lt', canvasId: 'qr-lt', urlElId: 'qr-url-lt', path: '/lowerthird' },
        { key: 'fb', canvasId: 'qr-fb', urlElId: 'qr-url-fb', path: '/foldback' },
    ];

    // 2. Generate QR codes for each output
    for (const def of outputDefs) {
        const url = `http://${localIP}:${PORT}${def.path}`;
        const urlEl = document.getElementById(def.urlElId);
        if (urlEl) urlEl.textContent = url;
        _drawQRCode(def.canvasId, url);
    }

    // 3. Load saved resolution settings
    try {
        const res = await fetch('/api/output_resolution');
        if (res.ok) {
            const saved = await res.json();
            for (const key of ['main', 'lt', 'fb']) {
                if (!saved[key]) continue;
                const mode = saved[key].mode || 'default';
                _advResModes[key] = mode;

                // Update mode buttons
                const defBtn = document.getElementById(`res-btn-default-${key}`);
                const cusBtn = document.getElementById(`res-btn-custom-${key}`);
                const inputRow = document.getElementById(`res-custom-inputs-${key}`);
                const presetRow = document.getElementById(`res-presets-${key}`);
                if (defBtn) defBtn.classList.toggle('active', mode === 'default');
                if (cusBtn) cusBtn.classList.toggle('active', mode === 'custom');
                if (inputRow) inputRow.style.display = mode === 'custom' ? 'flex' : 'none';
                if (presetRow) presetRow.style.display = mode === 'custom' ? 'flex' : 'none';

                if (mode === 'custom') {
                    const wEl = document.getElementById(`res-w-${key}`);
                    const hEl = document.getElementById(`res-h-${key}`);
                    if (wEl) wEl.value = saved[key].width || 1920;
                    if (hEl) hEl.value = saved[key].height || 1080;
                }

                // Show current status
                const statusEl = document.getElementById(`res-status-${key}`);
                if (statusEl) {
                    if (mode === 'custom') {
                        statusEl.textContent = `Active: ${saved[key].width}x${saved[key].height}`;
                        statusEl.style.color = '#00e5ff';
                    } else {
                        statusEl.textContent = 'Active: Default (auto)';
                        statusEl.style.color = '#666';
                    }
                }
            }
        }
    } catch (e) {
        console.warn('[AdvOutput] Could not load resolution settings:', e);
    }
}

/**
 * Toggle resolution mode between 'default' and 'custom' for a given output type.
 */
function setResMode(type, mode) {
    _advResModes[type] = mode;

    const defBtn = document.getElementById(`res-btn-default-${type}`);
    const cusBtn = document.getElementById(`res-btn-custom-${type}`);
    const inputRow = document.getElementById(`res-custom-inputs-${type}`);
    const presetRow = document.getElementById(`res-presets-${type}`);

    if (defBtn) defBtn.classList.toggle('active', mode === 'default');
    if (cusBtn) cusBtn.classList.toggle('active', mode === 'custom');
    if (inputRow) inputRow.style.display = mode === 'custom' ? 'flex' : 'none';
    if (presetRow) presetRow.style.display = mode === 'custom' ? 'flex' : 'none';
}

/**
 * Fill in width/height inputs from a common preset button.
 */
function applyResPreset(type, w, h) {
    const wEl = document.getElementById(`res-w-${type}`);
    const hEl = document.getElementById(`res-h-${type}`);
    if (wEl) wEl.value = w;
    if (hEl) hEl.value = h;
}

/**
 * Apply resolution settings for an output: save to backend and send IPC to Electron.
 */
async function applyOutputResolution(type) {
    const mode = _advResModes[type] || 'default';
    const wEl = document.getElementById(`res-w-${type}`);
    const hEl = document.getElementById(`res-h-${type}`);
    const statusEl = document.getElementById(`res-status-${type}`);

    const width = wEl ? parseInt(wEl.value) : 1920;
    const height = hEl ? parseInt(hEl.value) : 1080;

    if (mode === 'custom' && (isNaN(width) || isNaN(height) || width < 640 || height < 360)) {
        if (statusEl) { statusEl.textContent = 'Invalid resolution!'; statusEl.style.color = '#ef4444'; }
        return;
    }

    const payload = { [type]: { mode, width, height } };

    // 1. Save to backend
    try {
        await fetch('/api/output_resolution', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    } catch (e) {
        console.error('[AdvOutput] Failed to save resolution:', e);
    }

    // 2. Send to Electron IPC (only applies to already-open projector windows)
    if (window.electronAPI && typeof window.electronAPI.setOutputResolution === 'function') {
        window.electronAPI.setOutputResolution({ type, mode, width, height });
    }

    // 3. Update status display
    if (statusEl) {
        if (mode === 'custom') {
            statusEl.textContent = `Applied: ${width}x${height}`;
            statusEl.style.color = '#00e5ff';
        } else {
            statusEl.textContent = 'Applied: Default (auto)';
            statusEl.style.color = '#888';
        }
    }


}

// Expose Advanced Output functions globally
window.openAdvancedOutputModal = openAdvancedOutputModal;
window.setResMode = setResMode;
window.applyResPreset = applyResPreset;
window.applyOutputResolution = applyOutputResolution;

/**
 * Copy the URL text to clipboard and show a toast notification.
 */
async function copyOutputUrl(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const text = el.textContent || el.innerText;
    if (!text || text === 'Loading...') return;

    try {
        await navigator.clipboard.writeText(text);
        if (typeof showToast === 'function') {
            showToast("Link output berhasil disalin!", "success", 2000);
        }
    } catch (e) {
        console.error('[AdvOutput] Clipboard API failed, trying fallback:', e);
        // Fallback for non-HTTPS or older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            if (typeof showToast === 'function') {
                showToast("Link output berhasil disalin!", "success", 2000);
            }
        } catch (err) {
            console.error('[AdvOutput] Fallback copy failed:', err);
            if (typeof showToast === 'function') {
                showToast("Gagal menyalin link!", "error", 2000);
            }
        }
        document.body.removeChild(textarea);
    }
}
window.copyOutputUrl = copyOutputUrl;


// License Expiration Notification
document.addEventListener("DOMContentLoaded", function () {
    if (sessionStorage.getItem('license_toast_shown')) return;

    setTimeout(async () => {
        try {
            const res = await fetch('/api/license/status');
            const data = await res.json();

            if (data.status === 'active' && data.expiryDate) {
                const expDate = new Date(data.expiryDate);
                const now = new Date();

                // Normalize time to compare accurate days
                expDate.setHours(0, 0, 0, 0);
                now.setHours(0, 0, 0, 0);

                const diffTime = expDate.getTime() - now.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays >= 0 && diffDays <= 7) {
                    sessionStorage.setItem('license_toast_shown', 'true');

                    let msg = diffDays === 0
                        ? "<h3 style='color:#dc3545;margin-bottom:10px;'>Your license expires TODAY!</h3>Please renew your license to continue using ShowLyrics."
                        : `<h3 style='color:#ffc107;margin-bottom:10px;'>Your license will expire in ${diffDays} day(s)!</h3>Please renew your license soon to avoid interruptions.`;

                    if (typeof showCustomDialog === 'function') {
                        const btnOk = document.getElementById("dialog-btn-ok");
                        const btnCancel = document.getElementById("dialog-btn-cancel");

                        let origOkText = btnOk ? btnOk.innerText : "OK";
                        let origCancelText = btnCancel ? btnCancel.innerText : "CANCEL";

                        if (btnOk) btnOk.innerText = "RENEW NOW";
                        if (btnCancel) btnCancel.innerText = "CLOSE";

                        const isOk = await showCustomDialog("confirm", msg);

                        if (btnOk) btnOk.innerText = origOkText;
                        if (btnCancel) btnCancel.innerText = origCancelText;

                        if (isOk) {
                            if (window.electronAPI && window.electronAPI.openExternal) {
                                window.electronAPI.openExternal("https://showlyrics-app.web.app");
                            } else {
                                window.open("https://showlyrics-app.web.app", "_blank");
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Failed to check license expiration:", e);
        }
    }, 2500); // Wait 2.5 seconds to ensure the main UI is fully ready
});

// ==========================================
// 📚 BIBLE TRANSLATION CONTEXT MENU
// ==========================================
let selectedTranslationCtx = null;

window.showTranslationContextMenu = function (e, dbName) {
    e.preventDefault();
    selectedTranslationCtx = dbName;

    const menu = document.getElementById("scr-translation-ctx-menu");
    if (!menu) return;

    menu.style.display = "flex";

    // Position logic to avoid clipping
    let x = e.clientX;
    let y = e.clientY;

    // Fallback if width/height is not computed correctly because display:none before flex
    const menuWidth = menu.offsetWidth || 150;
    const menuHeight = menu.offsetHeight || 80;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (x + menuWidth > windowWidth) {
        x = windowWidth - menuWidth - 5;
    }

    if (y + menuHeight > windowHeight) {
        y = windowHeight - menuHeight - 5;
    }

    menu.style.left = x + "px";
    menu.style.top = y + "px";
};

document.addEventListener("click", function (e) {
    const menu = document.getElementById("scr-translation-ctx-menu");
    if (menu && menu.style.display !== "none") {
        menu.style.display = "none";
    }
});

window.renameTranslationAction = async function () {
    if (!selectedTranslationCtx) return;
    const dbName = selectedTranslationCtx;

    const newName = await showCustomDialog("prompt", `Rename Translation '<b>${dbName}</b>' to:`, dbName);
    if (newName !== null && newName !== false) {
        const trimmedName = newName.trim();
        if (trimmedName && trimmedName !== dbName) {
            try {
                const res = await fetch(`/api/scripture/translations/${encodeURIComponent(dbName)}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ new_name: trimmedName })
                });
                const data = await res.json();
                if (data.status === 'success') {
                    showToast(data.message, 'success', 1000);
                    loadBibleTranslations(); // Refresh list
                } else {
                    showToast(data.message, 'error', 1300);
                }
            } catch (err) {
                console.error(err);
                showToast('Failed to rename', 'error', 1300);
            }
        }
    }
};

window.deleteTranslationAction = async function () {
    if (!selectedTranslationCtx) return;
    const dbName = selectedTranslationCtx;

    const confirmed = await showCustomDialog("confirm", `Are you sure you want to delete the '<b>${dbName}</b>' translation?`);
    if (confirmed) {
        try {
            const res = await fetch(`/api/scripture/translations/${encodeURIComponent(dbName)}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.status === 'success') {
                showToast(data.message, 'success', 1000);
                loadBibleTranslations(); // Refresh list
            } else {
                showToast(data.message, 'error', 1300);
            }
        } catch (err) {
            console.error(err);
            showToast('Failed to delete', 'error', 1300);
        }
    }
};

// ------------------------------------------------------------------
// SHOWLYRICS BACKUP & RESTORE DATA HANDLERS
// ------------------------------------------------------------------
window.pendingImportFile = null;

window.exportShowLyricsData = function () {
    window.location.href = '/api/backup/export';
};

window.importShowLyricsData = function (event) {
    const file = event.target.files[0];
    if (!file) return;
    window.pendingImportFile = file;
    document.getElementById('import-confirm-modal').style.display = 'flex';
};

window.closeImportConfirmModal = function () {
    window.pendingImportFile = null;
    document.getElementById('import-confirm-modal').style.display = 'none';
};

window.closeReplaceConfirmModal = function () {
    document.getElementById('import-replace-confirm-input').value = '';
    document.getElementById('import-replace-confirm-modal').style.display = 'none';
};

window.executeImport = async function (mode) {
    if (mode === 'replace') {
        // Close the first confirm modal
        document.getElementById('import-confirm-modal').style.display = 'none';
        // Clear confirm input and show safety replace modal
        document.getElementById('import-replace-confirm-input').value = '';
        document.getElementById('import-replace-confirm-modal').style.display = 'flex';
        return;
    }

    // Normal append mode execution
    const file = window.pendingImportFile;
    if (!file) return;

    // Close modal
    window.closeImportConfirmModal();

    // Start import process
    await performImportAPI(file, 'append');
};

window.executeReplaceImport = async function () {
    const confirmVal = document.getElementById('import-replace-confirm-input').value;
    if (confirmVal !== 'REPLACE') {
        showToast("Please type REPLACE to confirm!", "error", 2000);
        return;
    }

    const file = window.pendingImportFile;
    if (!file) return;

    // Close safety replace modal
    window.closeReplaceConfirmModal();
    window.pendingImportFile = null;

    // Start import process
    await performImportAPI(file, 'replace');
};

async function performImportAPI(file, mode) {
    showToast("Importing backup...", "loading");

    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`/api/backup/import?mode=${mode}`, {
            method: 'POST',
            body: formData
        });

        const result = await response.json();
        if (result.status === 'success') {
            showToast("Backup imported successfully! Reloading...", "success", 2000);
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } else {
            showToast("Import failed: " + (result.message || "Unknown error"), "error", 4000);
        }
    } catch (error) {
        console.error("Backup import error:", error);
        showToast("Backup import error occurred.", "error", 4000);
    }
}


// =============================================================================
// 🌐 NETWORK GUARD UI — CDN Strike Modal & Toast System
// =============================================================================

/**
 * Handle pesan network_strike dari backend.
 *   Strike 1 → Toast ringan di pojok kanan bawah (auto-dismiss 8s)
 *   Strike 2 → Modal dismissible, app berjalan normal
 *   Strike 3 → Modal BLOCKING (tidak bisa dismiss), watermark aktif
 *
 * @param {object} data — payload dari backend:
 *   { level, max, dismissible, block_app, title, message, internet_score }
 */
function _handleNetworkStrike(data) {
    const level = data.level || 1;
    const max = data.max || 3;
    const dismissible = data.dismissible !== false;
    const title = data.title || "⚠️ Server Tidak Terjangkau";
    const message = data.message || "";
    const inetScore = data.internet_score || "?/4";

    // Hapus modal lama jika ada
    const old = document.getElementById("modal-net-strike");
    if (old) old.remove();

    if (level === 1) {
        // Strike 1: toast ringan saja — tidak perlu modal penuh
        _showNetworkToast(message, "warning");
        return;
    }

    // Strike 2 & 3: Modal
    const isBlocking = level >= 3;
    const accentColor = isBlocking ? "#ef4444" : "#f59e0b";
    const glowColor = isBlocking ? "#ef444420" : "#f59e0b15";
    const borderColor = isBlocking ? "#ef444440" : "#f59e0b40";

    // Inject CSS animation sekali saja
    if (!document.getElementById("net-guard-css")) {
        const s = document.createElement("style");
        s.id = "net-guard-css";
        s.textContent = [
            "@keyframes netModalIn{from{opacity:0;transform:scale(.93)}to{opacity:1;transform:scale(1)}}",
            "@keyframes slideInNetToast{from{transform:translateX(120%);opacity:0}to{transform:translateX(0);opacity:1}}",
        ].join("");
        document.head.appendChild(s);
    }

    // Progress dots (strike indicator)
    const dots = [1, 2, 3].map(i =>
        `<div style="width:26px;height:5px;border-radius:3px;
             background:${i <= level ? accentColor : "#3f3f46"};
             transition:background .3s;"></div>`
    ).join("");

    const modal = document.createElement("div");
    modal.id = "modal-net-strike";
    modal.style.cssText = [
        "position:fixed;inset:0;z-index:99999;",
        "background:rgba(0,0,0,0.93);",  // Sedikit lebih opaque sebagai kompensasi tanpa blur
        "display:flex;align-items:center;justify-content:center;",
        // backdrop-filter removed: GPU-heavy, not needed for security modal clarity
    ].join("");

    modal.innerHTML = `
    <div style="background:#18181b;border:1px solid ${borderColor};
                border-radius:18px;padding:40px 36px;max-width:480px;
                width:90%;text-align:center;
                box-shadow:0 0 80px ${glowColor},0 0 0 1px ${borderColor};
                animation:netModalIn .25s ease;">

        <div style="font-size:2.8rem;margin-bottom:12px;">
            ${isBlocking ? "🚫" : "⚠️"}
        </div>

        <h2 style="color:${accentColor};margin:0 0 10px;font-size:1.2rem;
                   font-weight:600;letter-spacing:-0.01em;">
            ${title}
        </h2>

        <!-- Strike progress dots -->
        <div style="display:flex;gap:6px;justify-content:center;margin-bottom:18px;">
            ${dots}
        </div>

        <p style="color:#a1a1aa;line-height:1.65;margin:0 0 8px;font-size:0.92em;">
            ${message}
        </p>

        <!-- Diagnostic info -->
        <div style="background:#09090b;border:1px solid #27272a;border-radius:8px;
                    padding:10px 14px;margin:14px 0 20px;font-size:0.8em;
                    color:#52525b;text-align:left;line-height:1.8;">
            🌐 Internet:
            <strong style="color:#22c55e;">${inetScore} server OK</strong>
            &nbsp;|&nbsp;
            📡 CDN ShowLyrics:
            <strong style="color:#ef4444;">Tidak terjangkau</strong>
        </div>

        <!-- Tombol aksi -->
        <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
            <button id="btn-net-retry"
                    style="background:#3b82f6;color:#fff;border:none;
                           padding:10px 22px;border-radius:8px;cursor:pointer;
                           font-size:0.9em;font-weight:500;transition:opacity .2s;">
                🔄 Coba Lagi
            </button>

            ${dismissible ? `
            <button onclick="document.getElementById('modal-net-strike').remove()"
                    style="background:#27272a;color:#a1a1aa;border:1px solid #3f3f46;
                           padding:10px 22px;border-radius:8px;cursor:pointer;
                           font-size:0.9em;transition:background .2s;">
                Tutup
            </button>` : ""}

            <button onclick="window.close()"
                    style="background:#1c1c1e;color:#71717a;border:1px solid #27272a;
                           padding:10px 22px;border-radius:8px;cursor:pointer;
                           font-size:0.9em;">
                Keluar
            </button>
        </div>

        <p style="color:#3f3f46;font-size:0.75em;margin-top:14px;margin-bottom:0;">
            Hubungi support jika masalah berlanjut.
        </p>
    </div>`;

    document.body.appendChild(modal);

    document.getElementById("btn-net-retry").addEventListener("click", function () {
        _retryNetworkCheck(modal);
    });
}


/**
 * Panggil endpoint /api/network/retry-check ke backend.
 * Backend akan evaluate ulang (CDN first, 3 retry) dan broadcast hasilnya.
 * Jika CDN pulih → backend broadcast "network_restored" → modal dihapus via _dismissNetworkModals.
 * Jika masih gagal → tampilkan toast error.
 */
function _retryNetworkCheck(modal) {
    const btn = document.getElementById("btn-net-retry");
    if (!btn) return;
    btn.disabled = true;
    btn.textContent = "⏳ Mengecek...";
    btn.style.opacity = "0.6";

    fetch("/api/network/retry-check", { method: "POST" })
        .then(r => r.json())
        .then(data => {
            if (data.cdn_ok) {
                // CDN pulih — backend sudah broadcast "network_restored"
                // Modal akan dihapus oleh _dismissNetworkModals() via WS handler
                // Tapi untuk jaga-jaga, hapus manual juga
                if (modal && modal.parentNode) modal.remove();
                _showNetworkToast("Server ShowLyrics kembali dapat dijangkau.", "success");
            } else {
                btn.disabled = false;
                btn.textContent = "🔄 Coba Lagi";
                btn.style.opacity = "1";
                _showNetworkToast("Server masih tidak bisa dijangkau. Coba lagi nanti.", "error");
            }
        })
        .catch(() => {
            btn.disabled = false;
            btn.textContent = "🔄 Coba Lagi";
            btn.style.opacity = "1";
        });
}


/**
 * Tampilkan toast kecil di pojok kanan bawah.
 * Auto-dismiss setelah 8 detik. Bisa diklik untuk dismiss lebih cepat.
 *
 * @param {string} msg
 * @param {"warning"|"error"|"success"} type
 */
function _showNetworkToast(msg, type) {
    const old = document.getElementById("toast-network");
    if (old) old.remove();

    const colorMap = { warning: "#f59e0b", error: "#ef4444", success: "#22c55e" };
    const iconMap = { warning: "⚠️", error: "❌", success: "✅" };
    const labelMap = { warning: "Peringatan Jaringan", error: "Gagal Terhubung", success: "Koneksi Pulih" };

    const color = colorMap[type] || colorMap.warning;
    const icon = iconMap[type] || iconMap.warning;
    const label = labelMap[type] || labelMap.warning;

    const toast = document.createElement("div");
    toast.id = "toast-network";
    toast.style.cssText = [
        "position:fixed;bottom:24px;right:24px;z-index:99998;",
        `background:#18181b;border:1px solid ${color}40;`,
        "border-radius:12px;padding:14px 18px;max-width:360px;",
        `box-shadow:0 4px 24px ${color}20;`,
        "font-size:0.88em;color:#d4d4d8;line-height:1.55;",
        "animation:slideInNetToast .25s ease;",
        "cursor:pointer;user-select:none;",
    ].join("");

    toast.innerHTML = `
        <div style="display:flex;align-items:flex-start;gap:8px;">
            <span style="font-size:1.1em;flex-shrink:0;">${icon}</span>
            <div>
                <div style="font-weight:600;color:${color};margin-bottom:3px;">${label}</div>
                <div>${msg}</div>
            </div>
        </div>`;

    toast.addEventListener("click", () => toast.remove());
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 8000);
}


/**
 * Dismiss semua modal/toast network.
 * Dipanggil saat CDN pulih (action: "network_restored" dari backend).
 */
function _dismissNetworkModals() {
    ["modal-net-strike", "toast-network"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// UI SCALE SYSTEM
// ═════════════════════════════════════════════════════════════════════════════

const _UI_SCALE_KEY = 'ui_scale';
const _UI_SCALE_DEFAULT = 1.0;
let _currentUIScale = _UI_SCALE_DEFAULT;
let _uiScaleSaveTimer = null;

/**
 * Terapkan scale ke controller window.
 *
 * Di Electron: gunakan IPC -> main process -> webContents.setZoomFactor().
 * Di browser biasa (fallback): CSS transform pada <html> root.
 */
function applyUIScale(scale) {
    scale = parseFloat(scale) || _UI_SCALE_DEFAULT;
    scale = Math.min(Math.max(scale, 0.60), 1.50);
    _currentUIScale = scale;

    if (window.electronAPI && typeof window.electronAPI.setControllerZoom === 'function') {
        window.electronAPI.setControllerZoom(scale);
    } else {
        var html = document.documentElement;
        if (Math.abs(scale - 1.0) < 0.001) {
            html.style.transform = '';
            html.style.width = '';
            html.style.height = '';
        } else {
            var pct = (100 / scale).toFixed(4) + '%';
            html.style.transformOrigin = 'top left';
            html.style.transform = 'scale(' + scale + ')';
            html.style.width = pct;
            html.style.height = pct;
        }
    }

    var sel = document.getElementById('ui-scale-select');
    if (sel) { sel.value = Math.round(scale * 100) / 100; }
}

/**
 * Muat UI scale dari app_settings.json saat startup.
 */
async function loadAndApplyUIScale() {
    try {
        var res = await fetch('/api/settings');
        if (!res.ok) return;
        var data = await res.json();
        var saved = parseFloat(data[_UI_SCALE_KEY]);
        if (!isNaN(saved) && saved >= 0.60 && saved <= 1.50) {
            applyUIScale(saved);
        }
    } catch (_) { }
}

/**
 * Simpan scale ke app_settings.json.
 */
function saveUIScale(scale) {
    clearTimeout(_uiScaleSaveTimer);
    _uiScaleSaveTimer = setTimeout(function () {
        fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ [_UI_SCALE_KEY]: scale })
        }).catch(function () { });
    }, 500);
}

function onUIScaleChange(val) {
    var scale = parseFloat(val);
    if (isNaN(scale)) return;
    applyUIScale(scale);
    saveUIScale(scale);
}

function resetUIScale() {
    applyUIScale(_UI_SCALE_DEFAULT);
    saveUIScale(_UI_SCALE_DEFAULT);
}

// requestIdleCallback = tidak mengganggu startup rendering.
(function _initSettings() {
    function _run() {
        if (window.requestIdleCallback) {
            requestIdleCallback(loadAndApplyUIScale, { timeout: 2000 });
            requestIdleCallback(loadAndApplyWindowBgColor, { timeout: 2000 });
        } else {
            setTimeout(loadAndApplyUIScale, 150);
            setTimeout(loadAndApplyWindowBgColor, 150);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _run);
    } else {
        _run();
    }
})();

// ─────────────────────────────────────────────────────────────────────────────
// OUTPUT BACKGROUND COLOR MANAGEMENT (Main Display & Lower Third)
// ─────────────────────────────────────────────────────────────────────────────
var _WIN_BG_COLOR_KEY = 'window_bg_color';
var _WIN_BG_COLOR_DEFAULT = '#000000';

// Store state on window so obfuscator cannot rename these variables
window._outputBgColors = window._outputBgColors || { main: '#000000', lt: '#000000' };
window._currentBgTarget = window._currentBgTarget || 'main';
window._outputBgColorSaveTimers = window._outputBgColorSaveTimers || {};

function onBgTargetChange(target) {
    if (!target || (target !== 'main' && target !== 'lt')) target = 'main';
    if (!window._outputBgColors) window._outputBgColors = { main: '#000000', lt: '#000000' };
    window._currentBgTarget = target;

    var selectEl = document.getElementById('bg-target-select');
    if (selectEl && selectEl.value !== target) selectEl.value = target;

    var badgeEl = document.getElementById('bg-target-badge');
    if (badgeEl) badgeEl.textContent = (target === 'lt') ? '📺 LOWER THIRD' : '🖥️ MAIN DISPLAY';

    var targetColor = (window._outputBgColors[target]) || _WIN_BG_COLOR_DEFAULT;

    var activePicker = document.getElementById('active-bg-color-picker');
    var activeHex = document.getElementById('active-bg-color-hex');
    var hexBadge = document.getElementById('bg-current-hex-badge');

    if (activePicker) activePicker.value = targetColor;
    if (activeHex) activeHex.value = targetColor;
    if (hexBadge) hexBadge.textContent = targetColor;

    triggerOutputBgColorIPC(target, targetColor);
}

function onActiveBgColorInput(val, immediate) {
    if (!val || typeof val !== 'string') return;
    var color = val.trim().toUpperCase();
    if (!color.startsWith('#')) color = '#' + color;
    if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(color)) return;
    if (!window._outputBgColors) window._outputBgColors = { main: '#000000', lt: '#000000' };
    var target = window._currentBgTarget || 'main';
    if (target !== 'main' && target !== 'lt') target = 'main';
    window._outputBgColors[target] = color;

    var activePicker = document.getElementById('active-bg-color-picker');
    var activeHex = document.getElementById('active-bg-color-hex');
    var hexBadge = document.getElementById('bg-current-hex-badge');

    if (activePicker) activePicker.value = color;
    if (activeHex && document.activeElement !== activeHex) activeHex.value = color;
    if (hexBadge) hexBadge.textContent = color;

    var hiddenPicker = document.getElementById(target + '-bg-color-picker');
    var hiddenHex = document.getElementById(target + '-bg-color-hex');
    if (hiddenPicker) hiddenPicker.value = color;
    if (hiddenHex) hiddenHex.value = color;

    triggerOutputBgColorIPC(target, color);
    saveOutputBgColor(target, color);
}

function triggerOutputBgColorIPC(target, color) {
    if (!color || typeof color !== 'string') return;
    color = color.trim().toUpperCase();
    if (!/^#([0-9A-F]{3}){1,2}$/i.test(color)) return;

    if (window.electronAPI) {
        try {
            if (typeof window.electronAPI.setOutputBackgroundColor === 'function') {
                window.electronAPI.setOutputBackgroundColor({ target: target, color: color });
            } else if (typeof window.electronAPI.setWindowBackgroundColor === 'function') {
                window.electronAPI.setWindowBackgroundColor({ target: target, color: color });
            }
        } catch (e) {
            console.error('[OUTPUT BG COLOR] IPC error:', e);
        }
    }
}

function saveOutputBgColor(target, color) {
    if (!window._outputBgColorSaveTimers) window._outputBgColorSaveTimers = {};
    var timerKey = target + '_save';
    clearTimeout(window._outputBgColorSaveTimers[timerKey]);
    window._outputBgColorSaveTimers[timerKey] = setTimeout(function () {
        var payload = {};
        if (target === 'lt') {
            payload['lt_bg_color'] = color;
        } else {
            payload['main_bg_color'] = color;
            payload[_WIN_BG_COLOR_KEY] = color;
        }
        fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(function () { });
    }, 400);
}

function onOutputBgColorInput(target, val, immediate) {
    if (!target || (target !== 'main' && target !== 'lt')) target = 'main';
    if (!val || typeof val !== 'string') return;
    var color = val.trim().toUpperCase();
    if (!color.startsWith('#')) color = '#' + color;
    if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(color)) return;
    if (!window._outputBgColors) window._outputBgColors = { main: '#000000', lt: '#000000' };
    window._outputBgColors[target] = color;
    if (target === (window._currentBgTarget || 'main')) {
        onActiveBgColorInput(color, immediate);
    } else {
        triggerOutputBgColorIPC(target, color);
        saveOutputBgColor(target, color);
    }
}

function onWindowBgColorInput(val, immediate) {
    onActiveBgColorInput(val, immediate);
}

function resetOutputBgColor(target) {
    target = target || window._currentBgTarget || 'main';
    onOutputBgColorInput(target, _WIN_BG_COLOR_DEFAULT, true);
}

function resetWindowBgColor(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    onOutputBgColorInput('main', _WIN_BG_COLOR_DEFAULT, true);
    onOutputBgColorInput('lt', _WIN_BG_COLOR_DEFAULT, true);
}

function applyOutputBgColorUI(target, color) {
    if (!color || typeof color !== 'string') return;
    color = color.trim().toUpperCase();
    if (!color.startsWith('#')) color = '#' + color;
    if (!/^#([0-9A-Fa-f]{3}){1,2}$/.test(color)) return;
    if (!window._outputBgColors) window._outputBgColors = { main: '#000000', lt: '#000000' };
    if (target === 'main' || target === 'all' || !target) window._outputBgColors.main = color;
    if (target === 'lt' || target === 'all' || !target) window._outputBgColors.lt = color;
    onBgTargetChange(window._currentBgTarget || 'main');
}

async function loadAndApplyOutputBgColor() {
    try {
        var res = await fetch('/api/settings');
        if (!res.ok) return;
        var data = await res.json();
        if (!window._outputBgColors) window._outputBgColors = { main: '#000000', lt: '#000000' };
        var mainColor = data.main_bg_color || data[_WIN_BG_COLOR_KEY] || _WIN_BG_COLOR_DEFAULT;
        var ltColor = data.lt_bg_color || _WIN_BG_COLOR_DEFAULT;
        if (mainColor && /^#([0-9A-Fa-f]{3}){1,2}$/.test(mainColor)) {
            window._outputBgColors.main = mainColor.trim().toUpperCase();
            triggerOutputBgColorIPC('main', window._outputBgColors.main);
        }
        if (ltColor && /^#([0-9A-Fa-f]{3}){1,2}$/.test(ltColor)) {
            window._outputBgColors.lt = ltColor.trim().toUpperCase();
            triggerOutputBgColorIPC('lt', window._outputBgColors.lt);
        }
        onBgTargetChange(window._currentBgTarget || 'main');
    } catch (e) {
        console.error('[OUTPUT BG COLOR] Load error:', e);
    }
}

async function loadAndApplyWindowBgColor() {
    await loadAndApplyOutputBgColor();
}

// Expose functions globally for HTML inline event handlers
window.onBgTargetChange = onBgTargetChange;
window.onActiveBgColorInput = onActiveBgColorInput;
window.resetOutputBgColor = resetOutputBgColor;
window.onOutputBgColorInput = onOutputBgColorInput;
window.loadAndApplyOutputBgColor = loadAndApplyOutputBgColor;
window.applyOutputBgColorUI = applyOutputBgColorUI;
window.triggerOutputBgColorIPC = triggerOutputBgColorIPC;
window.saveOutputBgColor = saveOutputBgColor;

window.resetWindowBgColor = resetWindowBgColor;
window.onWindowBgColorInput = onWindowBgColorInput;
window.loadAndApplyWindowBgColor = loadAndApplyWindowBgColor;



// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE & COMPATIBILITY — V.1.35.4
// GPU Compatibility Mode + Force GPU Compositing Layer toggles
// ─────────────────────────────────────────────────────────────────────────────

async function loadCompatibilitySettings() {
    try {
        var res = await fetch('/api/settings');
        if (!res.ok) return;
        var data = await res.json();
        var gpuToggle = document.getElementById('toggle-gpu-compat-mode');
        var isGpuOn = data.gpu_compatibility_mode === true;
        if (gpuToggle) {
            gpuToggle.checked = isGpuOn;
            var warn = document.getElementById('compat-restart-warn');
            if (warn) warn.style.display = isGpuOn ? 'flex' : 'none';
        }
        var compToggle = document.getElementById('toggle-force-compositing');
        if (compToggle) {
            compToggle.checked = data.force_gpu_compositing_layer === true;
        }
    } catch (_) { }
}

async function onGpuCompatModeChange(checked) {
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gpu_compatibility_mode: checked })
        });
        var warn = document.getElementById('compat-restart-warn');
        if (warn) warn.style.display = checked ? 'flex' : 'none';
        await fetch('/api/settings/apply-gpu-mode', { method: 'POST' });
        if (typeof showToast === 'function') {
            showToast(
                checked ? '⚡ GPU Compatibility Mode enabled — restart required'
                    : '⚡ GPU Compatibility Mode disabled — restart required',
                'warning', 3500
            );
        }
    } catch (e) { console.error('[COMPAT] onGpuCompatModeChange error:', e); }
}

async function onForceCompositingChange(checked) {
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ force_gpu_compositing_layer: checked })
        });
        if (window.electronAPI && typeof window.electronAPI.applyCompositingCSS === 'function') {
            await window.electronAPI.applyCompositingCSS(checked);
        }
        if (typeof showToast === 'function') {
            showToast(
                checked ? '🔳 Force GPU Compositing Layer enabled — active live'
                    : '🔳 Force GPU Compositing Layer disabled',
                'success', 2500
            );
        }
    } catch (e) { console.error('[COMPAT] onForceCompositingChange error:', e); }
}

function doCompatRestart() {
    if (window.electronAPI && typeof window.electronAPI.restartApp === 'function') {
        window.electronAPI.restartApp();
    } else {
        alert('Please restart ShowLyrics to apply GPU changes.');
    }
}

(function _initCompatSettings() {
    function _run() {
        if (window.requestIdleCallback) {
            requestIdleCallback(function () {
                loadCompatibilitySettings();
                loadAndApplyOutputBgColor();
            }, { timeout: 3000 });
        } else {
            setTimeout(function () {
                loadCompatibilitySettings();
                loadAndApplyOutputBgColor();
            }, 300);
        }
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _run);
    } else {
        _run();
    }
})();

window.onGpuCompatModeChange = onGpuCompatModeChange;
window.onForceCompositingChange = onForceCompositingChange;
window.doCompatRestart = doCompatRestart;
window.loadCompatibilitySettings = loadCompatibilitySettings;
