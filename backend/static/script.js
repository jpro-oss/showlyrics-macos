let currentActiveTab = 'library'; // Lacak tab apa yang lagi dibuka

window.activeLibraryPlayers = { video: false, audio: false, photo: false };
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

const ws = new WebSocket("ws://" + window.location.host + "/ws");
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
const VIDEO_TIMELINE_SNAPSHOT_KEY = "showlyrics_video_timeline_snapshot";

function normalizeMediaVolume(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 1;
    return Math.max(0, Math.min(1, num > 1 ? num / 100 : num));
}

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

    const currentTime = Number.isFinite(targetPlayer.currentTime) ? targetPlayer.currentTime : 0;
    const drift = Math.abs(currentTime - targetTime);
    const threshold = options.force ? 0.05 : 0.65;
    if (drift < threshold) return;

    try {
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
        if (!masterSfxAudio.paused && masterSfxAudio.readyState > 0) {
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
    try {
        const data = JSON.parse(event.data);
        const action = data.action || data.type;
        const payload = data.payload || {};

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

        // --- 🎯 TANGKAP MASTER AUDIO ---
        if (action === "update_background") {
            if (payload.url) {
                const isSameVideo = (masterBgAudio.currentSrc || masterBgAudio.src || "").includes(payload.url);
                if (!isSameVideo || payload.forceReplay) masterBgAudio.src = payload.url;
                masterBgAudio.loop = (payload.behavior === "loop" || payload.behavior === undefined);
                masterBgAudio.dataset.behavior = payload.behavior || "loop";
                masterBgAudio.muted = (payload.muted !== undefined) ? payload.muted : true;
                if (payload.forceReplay) {
                    try { masterBgAudio.currentTime = 0; } catch (_) { }
                }
                masterBgAudio.play().catch(e => console.warn(e));
                const snapshotExtra = { activeVideoUrl: payload.url, isPlaying: true };
                if (payload.forceReplay) snapshotExtra.currentTime = 0;
                saveVideoTimelineSnapshot(snapshotExtra);
            } else {
                masterBgAudio.pause();
                masterBgAudio.removeAttribute('src');
                saveVideoTimelineSnapshot({ activeVideoUrl: "", isPlaying: false, currentTime: 0 });
            }
        }
        else if (action === "update_audio") {
            if (payload.url) {
                masterSfxAudio.src = payload.url;
                masterSfxAudio.play().catch(e => console.warn(e));
            } else {
                masterSfxAudio.pause();
                masterSfxAudio.removeAttribute('src');
            }
        }
        else if (action === "bg_control") {
            const cmd = payload.command;
            const targetPlayer = (payload.target === "video") ? masterBgAudio : masterSfxAudio;
            if (cmd === "play") targetPlayer.play();
            else if (cmd === "pause") targetPlayer.pause();
            else if (cmd === "replay") {
                const expectedUrl = payload.url || "";
                const currentUrl = targetPlayer.currentSrc || targetPlayer.src || "";
                if (!expectedUrl || currentUrl.includes(expectedUrl)) {
                    targetPlayer.currentTime = 0;
                    targetPlayer.play();
                }
            }
            else if (cmd === "volume") { targetPlayer.volume = normalizeMediaVolume(payload.value); }
            else if (cmd === "loop") { targetPlayer.loop = (payload.value === true || payload.value === "loop"); }
            else if (cmd === "mute_toggle" || cmd === "mute") { targetPlayer.muted = payload.value; }
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

        // 🎯 TANGKAP NOTIFIKASI PPT/PDF BERHASIL EKSTRAK DI BACKEND
        if (action === "presentation_ready") {
            if (typeof markThumbAsReadyRealtime === "function") {
                markThumbAsReadyRealtime("presentation", data.id);
            }
            if (typeof window.loadMediaData === "function") {
                window.loadMediaData("presentation");
            }
            if (window.waitingForPPTId && window.waitingForPPTId === data.id) {
                showToast("PowerPoint slides converted successfully!", "success", 2000);
                window.loadPPTToGrid(window.waitingForPPTId, window.waitingForPPTName);
            }
        }

        if (action === "presentation_failed") {
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
    } catch (e) {
        console.error("Settings sync failed:", e);
    }
});

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
        pad_x: parseInt(document.getElementById("pad-input").value),
        font_size: parseFloat(document.getElementById("font-size-input").value),
        sub_color: document.getElementById("sub-color-input").value,
        sub_size: parseFloat(document.getElementById("sub-size-input").value),

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
           !!e.ctrlKey === !!s.ctrlKey &&
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
let allSongs = []; let scheduleList = []; let savedSchedules = {};
let dispPresetsData = {};
let globalDefaultDisplayConfig = null;

window.onload = async function () {
    await loadAppShortcutsFromServer();
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
    } catch (e) { }

    // fetchActiveSchedule() dimatikan biar schedule selalu kosong pas awal buka
    fetchLibrary(); renderSchedule(); fetchSavedSchedules();
    fetchLTPresets(); fetchDisplayPresets(); fetchFBPresets(); loadWindowsFonts();
};

let toastTimeout;
function showToast(message, type = "info", duration = 0) {
    const modal = document.getElementById("save-progress-modal");
    const box = modal.querySelector('.modal-box');
    const icon = document.getElementById("save-icon");
    const title = document.getElementById("save-title");
    const msgBox = document.getElementById("save-message");

    clearTimeout(toastTimeout); // Reset timer

    // Munculkan modal overlay (layar belakang otomatis jadi gelap karena class modal-overlay)
    modal.style.display = "flex";
    msgBox.innerText = message;

    // Ganti tema warna & icon sesuai status
    if (type === "loading") {
        box.style.borderColor = "#ffc107"; // Kuning
        title.style.color = "#ffc107";
        title.innerText = "SAVING DATA";
        icon.innerText = "⏳";
        icon.style.animation = "pulseIcon 1s infinite ease-in-out"; // Kasih animasi detak
    } else if (type === "success") {
        box.style.borderColor = "#28a745"; // Hijau
        title.style.color = "#28a745";
        title.innerText = "SUCCESS";
        icon.innerText = "✅";
        icon.style.animation = "none"; // Matikan animasi
    } else if (type === "error") {
        box.style.borderColor = "#dc3545"; // Merah
        title.style.color = "#dc3545";
        title.innerText = "ERROR";
        icon.innerText = "❌";
        icon.style.animation = "none";
    }

    // Auto-tutup modalnya setelah durasi habis
    if (duration > 0) {
        toastTimeout = setTimeout(() => {
            modal.style.display = "none";
        }, duration);
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

function renderSchedule() {
    const container = document.getElementById("schedule-list");
    container.innerHTML = "";

    // 🎯 BISA DROP PPT KE AREA KOSONG SCHEDULE (Paling Bawah)
    container.ondragover = (e) => { e.preventDefault(); };
    container.ondrop = async (e) => {
        e.preventDefault();
        e.stopPropagation(); // 🎯 FIX 1: GEMBOK ANTI DOBEL
        try {
            const dataStr = e.dataTransfer.getData("text/plain");
            if (dataStr) {
                const data = JSON.parse(dataStr);
                if (data.action === "apply_media" && data.category === "presentation") {
                    window.addPPTToSchedule(data.id, data.name);
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
            e.stopPropagation(); // 🎯 FIX 1: GEMBOK ANTI BUBBLING (BOCOR KE BAWAH)
            div.classList.remove('over');

            try {
                const dataStr = e.dataTransfer.getData("text/plain");
                if (dataStr) {
                    const data = JSON.parse(dataStr);
                    if (data.action === "apply_media" && data.category === "presentation") {
                        window.addPPTToSchedule(data.id, data.name, index);
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

        // 🎯 CLICK DI FULL KOTAK UNTUK LOAD SONG
        div.onclick = (e) => {
            // Jangan load song kalau klik di note
            if (e.target.classList.contains('sched-note-text')) {
                return;
            }
            // Load song dengan klik di area manapun (tapi bukan note)
            loadSong(item.title);
        };

        // 🎯 RIGHT-CLICK CONTEXT MENU
        div.oncontextmenu = (e) => {
            showScheduleContextMenu(e, index, item.title);
        };

        // 🎯 FIX 2: POTONG TEKS KEPANJANGAN
        let safeTitle = item.title.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        let displayTitle = item.title;
        // Kalau panjang judul lebih dari 25 karakter, potong dan kasih titik-titik!
        if (displayTitle.length > 25) {
            displayTitle = displayTitle.substring(0, 25) + "...";
        }

        const noteText = item.note ? item.note : "+ add note...";
        const noteClass = item.note ? "sched-note-active" : "sched-note-empty";

        const isPPT = item.title.startsWith("📊 PPT:");
        const titleClass = isPPT ? "sched-title-text sched-title-ppt" : "sched-title-text";

        div.innerHTML = `
                    <div class="drag-handle" title="Drag to reorder">☰</div>
                    <div class="sched-item-wrap">
                        <div class="${titleClass}" title="${safeTitle}">${index + 1}. ${displayTitle}</div>
                        <div class="sched-note-text ${noteClass}">${noteText}</div>
                    </div>
                `;
        
        // 🎯 ATTACH EDIT NOTE HANDLER KE NOTE TEXT SAJA
        const noteElement = div.querySelector('.sched-note-text');
        if (noteElement) {
            noteElement.onclick = (e) => {
                e.stopPropagation(); // Jangan propagate ke parent (yang load song)
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
    const res = await fetch('/api/schedules'); 
    savedSchedules = await res.json(); 
    const select = document.getElementById("saved-sched-select"); 
    select.innerHTML = '<option value="">-- Select Saved --</option>'; 
    
    // 🎯 GET ALL SCHEDULE NAMES & SORT - MOST RECENT FIRST (MAX 10)
    let scheduleNames = Object.keys(savedSchedules);
    
    // Sort by name in reverse order (most recent first - assuming last added is last in iteration)
    // For proper chronological sorting, backend should return timestamps
    scheduleNames = scheduleNames.reverse().slice(0, 10);
    
    scheduleNames.forEach(name => {
        const opt = document.createElement("option"); 
        opt.value = name; 
        opt.innerText = name; 
        select.appendChild(opt); 
    }); 
}

async function saveCurrentGrid() {
    if (currentActiveTab === 'scripture') {
        showToast("Cannot save song in Scripture mode!", "error", 2000);
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
    if (typeof window.exitPPTRemoteMode === 'function') window.exitPPTRemoteMode();
    const song = allSongs.find(s => s.title === title);
    if (song) {
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
            currentSongCustomSettings = { font: 'Cinzel', theme: 'default', color: '#ffffff', glow: 50, fade: 0.5, trans: 'fade', speed: '30s', zoom: 'stay', motion: 'none', align: 'center', pad_x: 10 };
        } else {
            // Kalau lagu lama, ambil DNA aslinya
            currentSongCustomSettings = s.custom || {};
            if (!s.custom && s.theme) { currentSongCustomSettings = { font: s.font, theme: s.theme, color: s.color, glow: s.glow, fade: s.fade, trans: s.trans, speed: s.speed, zoom: s.zoom, motion: s.motion, align: s.align, pad_x: s.pad_x }; }
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
    if (!confirm(`Delete "${title}" from library?`)) return;
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
            const tmp = document.createElement('div');
            tmp.innerHTML = fullText;
            const plain = tmp.innerText;
            const truncated = plain.length > 35 ? plain.substring(0, 35) + '...' : plain;
            const safe = document.createElement('div');
            safe.innerText = truncated;
            span.innerHTML = safe.innerHTML;
        } else {
            // ROW mode: show full untruncated text
            span.innerHTML = fullText;
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
                let thumbUrl = `/api/media/presentation/${item.bg_id}/slide/${item.slide_num}?t=${item.bg_id}`;
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
            let safeText = document.createElement('div'); safeText.innerText = preview;
            // Store the full (untruncated) text for live switching
            const safeFullText = document.createElement('div'); safeFullText.innerText = item.text;

            let inlineClearBtn = "";
            if (item.type === 'scripture') {
                inlineClearBtn = `<button class="btn-inline-clear" onclick="event.stopPropagation(); clearScriptureLive();" title="Matikan Ayat">✖ CLEAR</button>`;
            }

            box.innerHTML = `
                ${thumbHtml}
                ${inlineClearBtn}
                <div class="tag-badge">${typeLabel}</div>
                <span class="grid-lyric-text" data-full-text="${safeFullText.innerHTML}">${safeText.innerHTML}</span>
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
            if (confirm("Delete this lyric slide?")) {
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
    currentIndex = idx;
    const currentSlide = lyricsData[idx] || {};
    const currentSlideBgType = currentSlide.bg_type || (['video', 'audio', 'photo'].includes(currentSlide.type) ? currentSlide.type : (currentSlide.bg_id ? 'video' : null));
    const shouldReplayAssignedVideo = !!currentSlide.bg_id && currentSlideBgType === 'video';

    let wasCleared = (!isShowing || clearStates.video || clearStates.photo || clearStates.presentation || clearStates.audio);

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
    let isPPT = lyricsData[idx] && lyricsData[idx].type === 'presentation_slide';

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
            if (!window.activeLibraryPlayers?.video) ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
            if (!window.activeLibraryPlayers?.photo) ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } }));
        }
    } else {
        // Matikan PPT karena slide ini bukan PPT
        if (window.currentVisType === 'presentation_slide') {
            ws.send(JSON.stringify({ action: "update_presentation", payload: { url: "" } }));
            window.currentSlideNum = null;
        }

        // --- LOGIKA VIDEO & PHOTO BIASA ---
        if (activeVisType === 'video') {
            if (window.currentVisId !== activeVisId || window.currentVisType !== activeVisType) {
                window.currentVisId = activeVisId; window.currentVisType = activeVisType;

                // 🎯 CATAT INGATAN: Simpan antrean video biar toggleBlackout tau harus nge-play apa nanti
                window.lastTriggeredBg = activeVisId;
                window.lastTriggeredBehavior = activeVisBehav;

                // 🎯 STEALTH FIX: Jangan berani-berani nembak video kalau layar lagi di-BLACKOUT (!isVideoCleared)
                if (!clearStates.video && !isVideoCleared && !window.activeLibraryPlayers?.video) {
                    const isMuted = lyricsData[idx].bg_muted !== false;
                    const videoUrl = `/api/stream_video/${activeVisId}`;
                    ws.send(JSON.stringify({
                        action: "update_background",
                        payload: {
                            url: videoUrl,
                            behavior: activeVisBehav,
                            muted: isMuted,
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

                window.lastTriggeredBg = activeVisId; // Catat ingatan

                // 🎯 STEALTH FIX: Berlaku juga untuk Foto
                if (!clearStates.photo && !isVideoCleared && !window.activeLibraryPlayers?.photo) {
                    ws.send(JSON.stringify({ action: "update_photo", payload: { url: `/api/stream_photo/${activeVisId}`, name: activeVisName } }));
                }
                if (!window.activeLibraryPlayers?.video) ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
            }
        } else {
            window.currentVisId = null; window.currentVisType = null;
            if (!window.activeLibraryPlayers?.video) ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } }));
            if (!window.activeLibraryPlayers?.photo) ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } }));
        }
    }

    // 4. 🎯 TEMBAK AUDIO (Sistem Prioritas Library)
    if (window.currentAudId !== activeAudId) {
        window.currentAudId = activeAudId;
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

            if (!isScreenCleared) {
                const targetLang = document.getElementById('scr-title-lang')?.value || 'id';
                const finalBookName = translateBookName(item.book, targetLang);

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
            payload: { url: url, behavior: window.lastTriggeredBehavior || "loop" }
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
        ws.send(JSON.stringify({ action: "update_background", payload: { url: url } }));
    }
}

function updateSettings() {
    markSongUnsaved();
    const currentFont = document.getElementById("font-select").value || 'Cinzel';
    injectFont(currentFont);

    // 1. AMBIL SEMUA DATA PAKE HELPER
    const payload = getDisplayConfigFromUI();
    payload.show = isShowing;

    // 2. TEMBAK KE LAYAR PAKE THROTTLER (ANTI-DDOS SERVER)
    // Cuma boleh ngirim maksimal 1 kali setiap 40ms (~25 FPS). 
    // Dijamin server santai, layar preview lancar, dan browser ga patah-patah!
    if (!wsThrottleTimer) {
        wsThrottleTimer = setTimeout(() => {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ action: "update_display", payload: payload }));
            }
            wsThrottleTimer = null; // Lepas rem
        }, 150); // 150ms throttle untuk mencegah CPU spike di layar utama saat drag slider
    }

    // 3. SIMPAN SETTINGAN BILINGUAL
    const subPayload = { color: payload.sub_color, size: payload.sub_size };
    fetch('/api/global_sub_settings', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subPayload)
    });
}

function sendUpdate(textOverride) {
    let nextTextVal = "";
    if (lyricsData.length > 0 && currentIndex >= 0 && currentIndex < lyricsData.length - 1) {
        nextTextVal = lyricsData[currentIndex + 1].text.substring(0, 50) + "..."; // Ambil 50 huruf aja
    } else {
        nextTextVal = "(End of Song)";
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
    if (!e.shiftKey && !e.ctrlKey && !e.altKey) {
        const key = e.key.toUpperCase();
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
    iframe.src = 'about:blank';
    iframe.remove();
}

function clearIframeContainer(container) {
    if (!container) return;
    container.querySelectorAll('iframe').forEach(destroyIframeEl);
    container.innerHTML = '';
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

function restoreMainPreview() {
    // [USER REQUEST] Tidak perlu restore karena preview tidak di-pause
    // BUT we still need to create it initially if it doesn't exist!
    const wrapper = document.getElementById('preview-wrapper');
    if (!wrapper || document.getElementById('preview-frame')) return;
    
    wrapper.classList.remove('preview-suspended');
    const iframe = createControlIframe('/display', 'preview-frame', 'preview-frame');
    wrapper.appendChild(iframe);
    requestAnimationFrame(() => resizePreview());
}

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
    if (typeof onDestroy === 'function') onDestroy();
    if (activeIframeModalId === modalId) {
        activeIframeModalId = null;
    }
    requestAnimationFrame(() => restoreMainPreview());
}

function enterModalIframeMode(modalId, onMount) {
    if (activeIframeModalId && activeIframeModalId !== modalId) {
        releaseModalIframeResources(activeIframeModalId);
        activeIframeModalId = null;
    }
    if (!activeIframeModalId) {
        suspendMainPreview();
    }
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            activeIframeModalId = modalId;
            if (typeof onMount === 'function') onMount();
        });
    });
}

function mountTextEditPreview() {
    const wrapper = document.getElementById('modal-preview-wrapper');
    if (!wrapper || document.getElementById('modal-preview-frame')) return;
    const iframe = createControlIframe('/preview_display', 'modal-preview-frame', 'te-preview-frame');
    wrapper.appendChild(iframe);
    attachTextEditPreviewScaler();
}

function destroyTextEditPreview() {
    detachTextEditPreviewScaler();
    clearIframeContainer(document.getElementById('modal-preview-wrapper'));
}

function mountScriptureMiniIframes() {
    const dispMount = document.getElementById('scr-mini-display-mount');
    const ltMount = document.getElementById('scr-mini-lt-mount');
    if (dispMount && !document.getElementById('scr-mini-display')) {
        dispMount.appendChild(createControlIframe('/scripture', 'scr-mini-display', 'scr-mini-iframe'));
    }
    if (ltMount && !document.getElementById('scr-mini-lt')) {
        ltMount.appendChild(createControlIframe('/scripture-lt', 'scr-mini-lt', 'scr-mini-iframe'));
    }
}

function destroyScriptureMiniIframes() {
    clearIframeContainer(document.getElementById('scr-mini-display-mount'));
    clearIframeContainer(document.getElementById('scr-mini-lt-mount'));
}

// --- AUTO SCALE PREVIEW ---
function resizePreview() {
    const wrapper = document.getElementById("preview-wrapper");
    if (!wrapper || wrapper.classList.contains('preview-suspended')) return;
    const frame = document.getElementById("preview-frame");
    if (!wrapper || !frame) return;

    const wrapperWidth = wrapper.offsetWidth;
    const scale = wrapperWidth / 1920;
    frame.style.transform = `scale(${scale})`;
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

async function fetchLTPresets() {
    const res = await fetch('/api/lt_presets');
    const data = await res.json();
    ltPresetsData = data.presets || {};
    const defaultName = data.default || "";

    const select = document.getElementById("lt-preset-select");
    select.innerHTML = '<option value="">-- Select Preset --</option>';
    for (const name in ltPresetsData) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.innerText = name;
        if (name === defaultName) opt.innerText += " (Default)";
        select.appendChild(opt);
    }

    document.getElementById("lt-default-status").innerText = defaultName ? `Default: ${defaultName}` : "Default: None";

    if (defaultName && !sessionStorage.getItem("lt_loaded")) {
        loadPresetByName(defaultName);
        sessionStorage.setItem("lt_loaded", "true");
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
    const res = await fetch(`/api/lt_presets/${name}`, { method: 'DELETE' });

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
    const res = await fetch(`/api/lt_presets/default/${name}`, { method: 'POST' });

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
        color: document.getElementById('lt-color').value,
        shadow_x: parseInt(document.getElementById('lt-shadow-x').value),
        shadow_y: parseInt(document.getElementById('lt-shadow-y').value),
        shadow_blur: parseInt(document.getElementById('lt-shadow-blur').value) || 0,
        shadow_color: document.getElementById('lt-shadow-color').value,
        stroke_size: parseInt(document.getElementById('lt-stroke-size').value) || 0,
        stroke_color: document.getElementById('lt-stroke-color').value,
        font: document.getElementById("lt-font-select").value,
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
        let isDefault = name === defaultName ? '<div style="position:absolute; top:0; right:0; background:#ffc107; color:#000; font-size:10px; font-weight:bold; padding:2px 5px; border-bottom-left-radius:6px; z-index: 2; letter-spacing:0.5px; box-shadow: -2px 2px 5px rgba(0,0,0,0.5);">★ DEFAULT</div>' : '';
        // Gambar UI Kartunya (Model Horizontal Kapsul)
        card.innerHTML = `
                    ${isDefault}
                    <div class="preset-preview" style="font-family: '${config.font || 'Cinzel'}'; color: ${config.color || '#fff'}; text-shadow: 0 0 5px ${config.color || '#fff'};">Aa</div>
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
    const res = await fetch(`/api/display_presets/${name}`, { method: 'DELETE' });

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
    const res = await fetch(`/api/display_presets/default/${name}`, { method: 'POST' });

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
    const padVal = config.pad_x !== undefined ? config.pad_x : 10;
    document.getElementById("pad-input").value = padVal;
    document.getElementById("val-pad").innerText = padVal + '%';

    const fontSizeVal = config.font_size !== undefined ? config.font_size : 5;
    document.getElementById("font-size-input").value = fontSizeVal;
    document.getElementById("val-font-size").innerText = fontSizeVal + 'vw';

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

async function fetchFBPresets() {
    const res = await fetch('/api/fb_presets');
    const data = await res.json();
    fbPresetsData = data.presets || {};
    const defaultName = data.default || "";

    const select = document.getElementById("fb-preset-select");
    select.innerHTML = '<option value="">-- Select Preset --</option>';
    for (const name in fbPresetsData) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.innerText = name;
        if (name === defaultName) opt.innerText += " (Default)";
        select.appendChild(opt);
    }
    document.getElementById("fb-default-status").innerText = defaultName ? `Default: ${defaultName}` : "Default: None";

    // UI Auto-load
    if (defaultName && !sessionStorage.getItem("fb_loaded")) {
        applyFBPresetToUI(fbPresetsData[defaultName]);
        sessionStorage.setItem("fb_loaded", "true");
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
        fetchFBPresets();
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
        await fetchFBPresets();
        document.getElementById("fb-preset-select").value = name; // Auto pilih yg baru
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
    const res = await fetch(`/api/fb_presets/${name}`, { method: 'DELETE' });

    if (res.ok) {
        showToast("Preset deleted!", "success", 2000);
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
    const res = await fetch(`/api/fb_presets/default/${name}`, { method: 'POST' });

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
        sendFBConfig(); // Kirim ke layar
    }
}

function applyFBPresetToUI(c) {
    if (!c) return;
    document.getElementById('fb-layout').value = c.layout;
    document.getElementById('fb-curr-size').value = c.curr_size;
    document.getElementById('fb-curr-color').value = c.curr_color;
    document.getElementById('fb-next-size').value = c.next_size;
    document.getElementById('fb-next-color').value = c.next_color;
    document.getElementById('fb-bg-color').value = c.bg_color;
}

function getFBConfigFromUI() {
    return {
        layout: document.getElementById('fb-layout').value,
        curr_size: parseInt(document.getElementById('fb-curr-size').value),
        curr_color: document.getElementById('fb-curr-color').value,
        next_size: parseInt(document.getElementById('fb-next-size').value),
        next_color: document.getElementById('fb-next-color').value,
        bg_color: document.getElementById('fb-bg-color').value
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

    // TAMBAHIN SPEED DI PAYLOAD
    const payload = {
        text: text,
        show: isAlertOn,
        targets: targets,
        position: document.getElementById("alert-pos").value,
        color: document.getElementById("alert-color").value,
        speed: parseInt(document.getElementById("alert-speed").value) || 15
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
        speed: parseInt(document.getElementById("alert-speed").value) || 15
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
        speed: parseInt(document.getElementById("alert-speed").value) || 15
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
        speed: parseInt(document.getElementById("alert-speed").value) || 15
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
    const res = await fetch(`/api/alert_presets/${name}`, { method: 'DELETE' });

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
    const fullUrl = "http://localhost:18888" + targetPath;

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
            exitModalIframeMode(modalId, () => releaseModalIframeResources(modalId));
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
            config: getLTConfigFromUI()
        };
    } else if (type === 'fb') {
        outputModalSnapshots.fb = {
            preset: document.getElementById('fb-preset-select')?.value || '',
            config: getFBConfigFromUI()
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
        sendLTConfig();
    } else if (type === 'fb') {
        const select = document.getElementById('fb-preset-select');
        if (select) select.value = snapshot.preset || '';
        applyFBPresetToUI(snapshot.config);
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
            captureOutputModalSnapshot('fb');
            showToast(`Preset "${name}" saved!`, "success", 1800);
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
    if (shell) shell.innerHTML = '';
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

    if (!currentSongTitle) return alert("Load a song first!");
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
        : { font: getCurrentFont(), theme: document.getElementById("theme-input").value, color: document.getElementById("color-input").value, zoom: document.getElementById("zoom-input").value, speed: document.getElementById("speed-input").value, glow: parseInt(document.getElementById("glow-input").value), fade: parseFloat(document.getElementById("fade-input").value), trans: document.getElementById("trans-input").value, motion: getSafeMotionValue(document.getElementById("motion-input").value), align: document.getElementById("align-input").value, pad_x: parseInt(document.getElementById("pad-input").value) };

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
                    // ↩️ UNDO (CTRL+Z)
                    if (e.ctrlKey && e.key.toLowerCase() === "z") {
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

                    // SPLIT CURSOR (CTRL + ENTER)
                    if (e.ctrlKey && e.key === "Enter") {
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
    document.querySelectorAll('.slide-tag-dropdown').forEach(el => el.remove());
    
    // Check if we are already showing it
    if (badgeEl.dataset.dropdownOpen === 'true') {
        badgeEl.dataset.dropdownOpen = 'false';
        return;
    }
    
    // Mark as open
    badgeEl.dataset.dropdownOpen = 'true';
    
    // Create the dropdown menu
    const dropdown = document.createElement('div');
    dropdown.className = 'slide-tag-dropdown';
    
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
    
    types.forEach(opt => {
        const item = document.createElement('div');
        item.className = 'dropdown-item';
        item.innerHTML = `
            <span class="dropdown-item-dot" style="background: ${opt.color}"></span>
            <span>${opt.label}</span>
        `;
        item.onclick = (e) => {
            e.stopPropagation();
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
    
    badgeEl.parentElement.appendChild(dropdown);
    
    const outsideClickListener = (e) => {
        if (!badgeEl.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.remove();
            badgeEl.dataset.dropdownOpen = 'false';
            document.removeEventListener('click', outsideClickListener);
        }
    };
    
    setTimeout(() => {
        document.addEventListener('click', outsideClickListener);
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
    if(c.length === 3){
        c = c[0]+c[0]+c[1]+c[1]+c[2]+c[2];
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

    let blocks = [];
    if (text.includes('\n\n')) {
        // split by double or more newlines (paragraphs/stanzas)
        blocks = text.split(/\n\n+/);
    } else {
        // split by single newlines
        blocks = text.split(/\n+/);
    }

    const newSlides = [];
    let pendingType = 'normal';

    for (let i = 0; i < blocks.length; i++) {
        const block = blocks[i].trim();
        if (block === "") continue;

        const lines = block.split('\n');
        
        // Check if the block is a standalone section header
        if (lines.length === 1) {
            const detectedType = parseSectionLabel(lines[0], true);
            if (detectedType) {
                pendingType = detectedType;
                continue;
            }
        }

        // Check if the first line of the block is a section header
        let slideText = block;
        let slideType = pendingType;
        pendingType = 'normal'; // reset

        const detectedType = parseSectionLabel(lines[0], false);
        if (detectedType) {
            slideType = detectedType;
            // Remove the first line
            slideText = lines.slice(1).join('\n').trim();
        }

        if (slideText !== "") {
            newSlides.push({ text: slideText, type: slideType });
        }
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
    renderSchedule();
    await saveActiveSchedule();
}

// 2. SAVE SCHEDULE (BISA OVERWRITE ATAU BIKIN BARU)
async function saveCurrentSchedule() {
    let name = document.getElementById("saved-sched-select").value;

    // Kalau belum milih dari dropdown (bikin baru)
    if (!name) {
        if (scheduleList.length === 0) {
            alert("Running Order is empty!");
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

    alert(`Schedule "${name}" saved!`);

    // Refresh list dan otomatis pilih nama yang barusan disave
    await fetchSavedSchedules();
    document.getElementById("saved-sched-select").value = name;
}

// 3. LOAD SCHEDULE
async function loadSavedSchedule() {
    const name = document.getElementById("saved-sched-select").value;
    if (!name) { alert("Select a schedule from the dropdown!"); return; }
    const isOk = await showCustomDialog("confirm", `Load running order <b>"${name}"</b>?`);
    if (!isOk) return;

    // Pastikan data lama mendukung backward compatibility (ubah ke format notes v1.15 jika perlu)
    const rawData = savedSchedules[name];
    scheduleList = rawData.map(item => typeof item === 'string' ? { title: item, note: '' } : item);

    renderSchedule();
    await saveActiveSchedule();
}

// 4. DELETE SCHEDULE
async function deleteSavedSchedule() {
    const name = document.getElementById("saved-sched-select").value;
    if (!name) { alert("Select a schedule to delete!"); return; }
    const isOk = await showCustomDialog("confirm", `Delete schedule <b>"${name}"</b> permanently?`);
    if (!isOk) return;

    await fetch(`/api/schedules/${name}`, { method: 'DELETE' });
    await fetchSavedSchedules();

    document.getElementById("saved-sched-select").value = "";
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
    return new Promise((resolve) => {
        const overlay = document.getElementById("dialog-overlay");
        const title = document.getElementById("dialog-title");
        const msg = document.getElementById("dialog-msg");
        const input = document.getElementById("dialog-input");
        const btnOk = document.getElementById("dialog-btn-ok");
        const btnCancel = document.getElementById("dialog-btn-cancel");

        msg.innerHTML = message;
        overlay.style.display = "flex";

        // Bersihkan select/dropdown lama kalau ada
        let existingSelect = document.getElementById("dialog-select-dynamic");
        if (existingSelect) existingSelect.remove();

        let existingTextarea = document.getElementById("dialog-textarea-dynamic");
        if (existingTextarea) existingTextarea.remove();

        let selectEl = null;
        let textareaEl = null;

        if (type === "prompt") {
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

    try {
        const availableFonts = await window.queryLocalFonts();

        const fontFamilies = new Set();
        availableFonts.forEach(font => fontFamilies.add(font.family));

        datalistMain.innerHTML = "";
        if (datalistLt) datalistLt.innerHTML = "";

        const sortedFonts = Array.from(fontFamilies).sort();

        sortedFonts.forEach(family => {
            const opt1 = document.createElement("option"); opt1.value = family;
            datalistMain.appendChild(opt1);

            if (datalistLt) {
                const opt2 = document.createElement("option"); opt2.value = family;
                datalistLt.appendChild(opt2);
            }
        });

        console.log(`✅ Loaded ${sortedFonts.length} fonts from Windows for Lyrics & LT!`);
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

function toggleAlert() {
    isAlertOn = !isAlertOn; // Balik statenya
    const btn = document.getElementById("btn-toggle-alert");

    // 1. Ambil Settingan dari UI
    const text = document.getElementById("alert-input").value;
    let targets = [];
    if (document.getElementById("chk-main").checked) targets.push('main');
    if (document.getElementById("chk-lt").checked) targets.push('lt');

    // 2. Ubah Tampilan Tombol
    if (isAlertOn) {
        btn.innerHTML = "🛑 HIDE ALERT";
        btn.style.background = "#dc3545"; // Merah
    } else {
        btn.innerHTML = "📢 SHOW ALERT";
        btn.style.background = "#28a745"; // Balik hijau
    }

    // 3. Update Kedip di NAV
    updateNavBlinker();

    // 4. Kirim ke Server/Layar via WebSocket
    const payload = {
        text: text,
        show: isAlertOn, // Pake status nyala/mati yg baru
        targets: targets,
        position: document.getElementById("alert-pos").value,
        color: document.getElementById("alert-color").value
    };
    ws.send(JSON.stringify({ action: "alert", payload: payload }));
}

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
    currentActiveLTPreset = "- Custom (Edited) -";
    updateLTBadge();
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
// ==========================================

function exportSchedule() {
    // Ganti ID-nya jadi saved-sched-select biar sinkron sama HTML lu
    const schedName = document.getElementById("saved-sched-select").value;

    if (!schedName) {
        alert("Select an exported schedule from the dropdown first!");
        return;
    }

    // Langsung panggil link download dari backend
    window.location.href = `/api/export_bundle/${schedName}`;
}

async function importBundle(input) {
    if (input.files.length === 0) return;
    const file = input.files[0];

    if (!file.name.endsWith('.zip')) {
        alert("File must be in .zip format!");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    // Bikin teks label berubah jadi loading biar VJ tau lagi proses
    const labelBtn = document.querySelector("label[for='import-bundle']");
    const originalText = labelBtn.innerHTML;
    labelBtn.innerHTML = "⏳";

    try {
        const res = await fetch("/api/import_bundle", { method: "POST", body: formData });
        const data = await res.json();

        if (data.status === "success") {
            alert(data.message);

            // REFRESH TOTAL: Biar Library dan Dropdown Schedule otomatis narik data terbaru dari server
            window.location.reload();

        } else {
            alert("Import failed: " + data.message);
        }
    } catch (e) {
        console.error("Bundle import error:", e);
        alert("An error occurred during import!");
    }

    // Balikin UI dan reset input
    labelBtn.innerHTML = originalText;
    input.value = "";
}

// ==========================================
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
    document.getElementById('val-font-size').innerText = document.getElementById("font-size-input").value + 'vw';
    document.getElementById('val-pad').innerText = document.getElementById("pad-input").value + '%';
    document.getElementById('val-glow').innerText = document.getElementById("glow-input").value;
    document.getElementById('val-stroke').innerText = document.getElementById("stroke-size-input").value + 'px';
    document.getElementById('val-shadow').innerText = document.getElementById("shadow-int-input").value;
    if (triggerLiveSync) updateSettings();
}
function scaleModalPreview() {
    const wrapper = document.getElementById("modal-preview-wrapper");
    const frame = document.getElementById("modal-preview-frame");
    if (wrapper && frame && activeIframeModalId === 'text-edit-modal') {
        frame.style.transform = `scale(${wrapper.offsetWidth / 1920})`;
    }
}
window.addEventListener("resize", scaleModalPreview);

let textState = { bold: false, italic: false, underline: false };

function toggleFormat(type) {
    textState[type] = !textState[type];
    const btn = document.getElementById('btn-' + type);
    if (btn) {
        if (textState[type]) btn.classList.add('active');
        else btn.classList.remove('active');
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

    // 1. Cek apakah yang diklik murni background gelapnya (bukan tulisan/kotaknya)
    if (event.target === modal) {
        const titleText = document.getElementById("save-title").innerText;

        // 2. SAFETY LOCK: Jangan izinkan tutup kalau masih proses Saving!
        if (titleText !== "SAVING DATA" && titleText !== "PROCESSING") {
            clearTimeout(toastTimeout); // Bunuh timer otomatisnya
            modal.style.display = "none"; // Hilangkan layarnya detik itu juga
        }
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
            const isMuted = lyricsData[idx].bg_muted !== false; // Default: Muted
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

    if (category === 'video' || category === 'photo') {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "update_scripture", payload: { show_display: false, show_lt: false } }));
        }
    }

    if (category === 'video') {
        ws.send(JSON.stringify({ action: "update_background", payload: { url: `/api/stream_video/${mediaId}`, behavior: "loop", muted: false } }));
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
    if (category === 'video') { ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } })); }
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
let clearStates = { lyrics: false, video: false, audio: false, photo: false, presentation: false };

function clearLayer(layer) {
    clearStates[layer] = !clearStates[layer];
    const btn = document.getElementById('btn-clr-' + layer);

    if (clearStates[layer]) {
        btn.classList.add('btn-clr-dim'); // Dim Visualnya (Mati)
        if (layer === 'lyrics') {
            sendUpdate("");
        }
        else if (layer === 'video') { window.currentVisId = null; ws.send(JSON.stringify({ action: "update_background", payload: { url: "" } })); }
        else if (layer === 'audio') { window.currentAudId = null; ws.send(JSON.stringify({ action: "update_audio", payload: { url: "" } })); }
        else if (layer === 'photo') { window.currentVisId = null; ws.send(JSON.stringify({ action: "update_photo", payload: { url: "" } })); }
        else if (layer === 'presentation') {
            window.currentSlideNum = null;
            ws.send(JSON.stringify({ action: "update_presentation", payload: { url: "" } }));
        }
    } else {
        btn.classList.remove('btn-clr-dim'); // Nyala lagi

        if (layer === 'presentation') window.currentSlideNum = null;
        if (layer === 'video' || layer === 'photo') window.currentVisId = null;
        if (layer === 'audio') window.currentAudId = null;

        // 🎯 BUG 1 FIX: Filter rute data agar tidak bocor ke HTML lirik
        if (layer === 'lyrics' && currentIndex >= 0) {
            if (lyricsData[currentIndex] && lyricsData[currentIndex].type === 'scripture') {
                fireLyric(currentIndex, false); // Kembalikan ke jalur tertutup scripture
            } else {
                sendUpdate(lyricsData[currentIndex].text); // Jalur lirik normal
            }
        }
        else if (currentIndex >= 0) { fireLyric(currentIndex, false); }
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
window.closePPTPreview = () => document.getElementById('ppt-preview-modal').classList.remove('show-flex');
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
    showToast("Preparing PPT for Schedule...", "loading");
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

        showToast(`"${mediaName}" added to Schedule!`, "success", 2000);
    } catch (e) { showToast("Failed to add PPT to Schedule", "error", 3000); }
};

async function openSettingsModal() {
    document.getElementById('settings-modal').style.display = 'flex';
    updateOutputLinks();
    loadLicenseStatus();
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
        showToast("Edit disabled in Scripture mode!", "error", 2000);
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
        mountTextEditPreview();
        if (modal) modal.classList.add('modal-active');
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
    const res = await fetch(`/api/display_presets/${name}`, { method: 'DELETE' });

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
    e.preventDefault(); // Matiin klik kanan bawaan browser
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
    const res = await fetch(`/api/display_presets/${name}`, { method: 'DELETE' });

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
            showToast(data.message, "success", 3000);
            loadBibleTranslations(); // Refresh dropdown
        } else {
            showToast(data.message, "error", 4000);
        }
    } catch (e) {
        showToast("Failed to import file", "error");
    }
    event.target.value = ""; // Reset input
}

async function loadBibleTranslations() {
    try {
        const res = await fetch("/api/scripture/translations");
        const data = await res.json();

        const container = document.getElementById("bible-translation-list");
        container.innerHTML = "";

        if (data.translations.length === 0) {
            container.innerHTML = `<div style="color:#666; font-size:0.8em;">No Bible XML imported yet.</div>`;
            return;
        }

        data.translations.forEach((t, index) => {
            const isChecked = index === 0 ? "checked" : ""; // Default: centang yang pertama aja
            container.innerHTML += `
                <label class="translation-item">
                    <input type="checkbox" class="bible-version-cb" value="${t}" ${isChecked} onchange="handleTranslationCheck()">
                    ${t}
                </label>
            `;
        });

        handleTranslationCheck(); // Jalankan pengaman otomatis
    } catch (e) { console.error("Failed to load translations"); }
}

// 🎯 MESIN PENGAMAN MAKSIMAL 2 CHECKBOX
window.handleTranslationCheck = function (e) {
    const checkboxes = document.querySelectorAll(".bible-version-cb");
    let checked = document.querySelectorAll(".bible-version-cb:checked");

    if (checked.length === 0 && e && e.target) {
        showToast("At least 1 translation must be active!", "warning");
        e.target.checked = true;
        checked = document.querySelectorAll(".bible-version-cb:checked");
    }

    const maxAllowed = 2; // 🎯 UPDATE 1 FIX: Sekarang selalu diizinkan maksimal 2!

    if (checked.length > maxAllowed && e && e.target) {
        showToast(`Maximum ${maxAllowed} translations!`, "warning");
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

    if (checked.length > 0) loadBibleBooks(checked[0].value);

    const book = document.getElementById("bible-book").value;
    const chap = document.getElementById("bible-chapter").value;
    if (book && chap && typeof currentMediaCategory !== 'undefined' && currentMediaCategory === 'scripture') {
        searchScripture(true);
    }
};

// 🎯 FIX ERROR SETTINGS: Placeholder untuk Fase 4

async function loadBibleBooks(version) {
    populateBibleDatalist(); // Bypass API server, kita pakai standar global 66 Kitab
}

function populateBibleDatalist() {
    const lang = document.getElementById('scr-global-lang')?.value || 'id';
    const datalist = document.getElementById("bible-books-list");
    const inputBook = document.getElementById("bible-book");
    if (!datalist) return;

    datalist.innerHTML = "";
    const map = getBibleBooksMap(); // Panggil dengan aman

    const books = lang === 'en' ? Object.keys(map) : Object.values(map);
    books.forEach(b => {
        datalist.innerHTML += `<option value="${b}">`;
    });

    if (inputBook) inputBook.placeholder = lang === 'en' ? "Book (e.g. John)" : "Kitab (Cth: Yohanes)";
}
// 🎯 FIX MUTLAK: Pastikan ada (silent = false) agar tidak error saat dipanggil dari checkbox
// ==========================================
// WIRE SCRIPTURE — SISTEM MANDIRI PENUH
// Tidak terhubung ke lyricsData / currentIndex / fireLyric
// ==========================================

let scriptureData = [];     // Array ayat terpisah dari lyricsData
let currentScrIndex = -1;  // Index ayat aktif di scripture grid

async function searchScripture(silent = false) {
    const checked = document.querySelectorAll(".bible-version-cb:checked");
    if (checked.length === 0) {
        if (!silent) showToast("Select at least 1 Bible translation!", "error");
        return;
    }

    const v1 = checked[0].value;
    const v2 = checked.length > 1 ? checked[1].value : "";

    const rawBook = document.getElementById("bible-book").value;
    const chapInput = document.getElementById("bible-chapter");
    const verseInput = document.getElementById("bible-verse");

    if (!rawBook) {
        if (!silent) showToast("Book is required!", "error");
        return;
    }

    if (!chapInput.value) chapInput.value = "1";
    if (!verseInput.value) verseInput.value = "1";

    const chapter = chapInput.value;
    const engBook = translateBookName(rawBook, 'en');

    try {
        const res = await fetch(`/api/scripture/chapter?v1=${encodeURIComponent(v1)}&book=${encodeURIComponent(engBook)}&chapter=${encodeURIComponent(chapter)}&v2=${encodeURIComponent(v2)}`);
        const data = await res.json();

        if (data.status === "success") {
            const targetLang = document.getElementById('scr-title-lang')?.value || 'id';
            const finalBookName = translateBookName(engBook, targetLang);

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
                book: finalBookName,
                chapter: chapter,
                text1: item.text1,
                text2: item.text2 || "",
                v1_name: v1,
                v2_name: v2
            }));

            currentScrIndex = -1;
            renderScriptureGrid();

            // Auto-fire ayat target (tanpa sentuh song grid)
            const targetVerse = document.getElementById("bible-verse").value;
            let targetIdx = 0;
            if (targetVerse) {
                const found = scriptureData.findIndex(item => parseInt(item.verse) === parseInt(targetVerse));
                if (found !== -1) targetIdx = found;
            }
            fireScriptureVerse(targetIdx);

        } else {
            if (!silent) showToast(data.message, "error");
        }
    } catch (e) {
        console.error("Scripture Error Detail:", e);
        if (!silent) showToast("Network / system error", "error");
    }
}

// Kirim ayat langsung ke display via WebSocket — tanpa fireLyric(), tanpa lyricsData
function fireScriptureVerse(idx) {
    if (!scriptureData || idx < 0 || idx >= scriptureData.length) return;

    const item = scriptureData[idx];
    currentScrIndex = idx;
    highlightScriptureBox(idx);

    // Sinkronkan input verse di panel kiri
    const verseInput = document.getElementById("bible-verse");
    if (verseInput) verseInput.value = item.verse;

    // Kirim ke display & LT via WebSocket — wire mandiri
    const targetLang = document.getElementById('scr-title-lang')?.value || 'id';
    const finalBookName = translateBookName(item.book, targetLang);
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

        const label = document.createElement("div");
        label.className = "scr-verse-label";
        label.textContent = `VERSE ${item.verse}`;

        const text = document.createElement("div");
        text.className = "scr-verse-text";
        text.textContent = item.text1 || "";

        box.appendChild(label);
        box.appendChild(text);

        if (item.text2) {
            const text2 = document.createElement("div");
            text2.className = "scr-verse-text2";
            text2.textContent = item.text2;
            box.appendChild(text2);
        }

        // Tombol MATIKAN (muncul saat ayat aktif)
        const killBtn = document.createElement("button");
        killBtn.className = "btn-scr-kill";
        killBtn.textContent = "✖ DISABLE";
        killBtn.title = "Clear verse from screen";
        killBtn.onclick = (e) => {
            e.stopPropagation();
            clearScriptureLive();
            document.querySelectorAll(".scr-verse-box").forEach(b => b.classList.remove("scr-verse-active"));
            currentScrIndex = -1;
        };
        box.appendChild(killBtn);

        // Klik untuk tampilkan ayat — wire scripture mandiri
        box.onclick = () => fireScriptureVerse(idx);

        container.appendChild(box);
    });
}

function highlightScriptureBox(idx) {
    document.querySelectorAll(".scr-verse-box").forEach(b => b.classList.remove("scr-verse-active"));
    const el = document.getElementById(`scr-box-${idx}`);
    if (el) {
        el.classList.add("scr-verse-active");
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
}



document.addEventListener("DOMContentLoaded", () => {
    loadBibleTranslations(); fetchScripturePresets();

    const prevBox = document.getElementById('scr-preview-container');
    if (prevBox) previewObserver.observe(prevBox);

    populateBibleDatalist();

    // Dengarkan kalau VJ ganti bahasa di Modal
    const langSelect = document.getElementById('scr-title-lang');
    if (langSelect) langSelect.addEventListener('change', populateBibleDatalist);
});

// ==========================================
// 🎨 SCRIPTURE SETTINGS MODAL LOGIC
// ==========================================

function openScriptureSettings() {
    const modal = document.getElementById('scripture-settings-modal');
    enterModalIframeMode('scripture-settings-modal', () => {
        mountScriptureMiniIframes();
        if (modal) {
            modal.classList.add('modal-active');
            modal.classList.remove('te-hidden');
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

function getScrConfig(pfx) {
    // 🎯 FIX: Pastikan parsing angka yang benar (PX), bukan VW
    return {
        mode: document.getElementById(`scr-${pfx}-mode`)?.value || 'overlay',
        bg_type: document.getElementById(`scr-${pfx}-bg-type`)?.value || 'transparent',
        bg_color: document.getElementById(`scr-${pfx}-bg-color`)?.value || '#000000',
        bg_opacity: parseFloat(document.getElementById(`scr-${pfx}-bg-opacity`)?.value || 0.8),
        bg_blur: parseInt(document.getElementById(`scr-${pfx}-bg-blur`)?.value || 0),

        // 🎯 Parsing persentase ke angka bulat
        overlay_height: parseInt(document.getElementById(`scr-${pfx}-overlay-height`)?.value || 35),
        overlay_pos: document.getElementById(`scr-${pfx}-overlay-pos`)?.value || 'bottom',
        overlay_radius: parseInt(document.getElementById(`scr-${pfx}-overlay-radius`)?.value || 15),

        title_font: document.getElementById(`scr-${pfx}-title-font`)?.value || 'Montserrat',
        title_size: parseInt(document.getElementById(`scr-${pfx}-title-size`)?.value || 28),
        title_color: document.getElementById(`scr-${pfx}-title-color`)?.value || '#00e5ff',
        title_align: document.getElementById(`scr-${pfx}-title-align`)?.value || 'left',

        // 🎯 Padding PX EXPLISIT
        title_pad_t: parseInt(document.getElementById(`scr-${pfx}-title-pad-t`)?.value || 15),
        title_pad_b: parseInt(document.getElementById(`scr-${pfx}-title-pad-b`)?.value || 15),
        title_pad_l: parseInt(document.getElementById(`scr-${pfx}-title-pad-l`)?.value || 20),
        title_pad_r: parseInt(document.getElementById(`scr-${pfx}-title-pad-r`)?.value || 20),

        body_font: document.getElementById(`scr-${pfx}-body-font`)?.value || 'Montserrat',
        body_size: parseInt(document.getElementById(`scr-${pfx}-body-size`)?.value || 45),
        body_auto: document.getElementById(`scr-${pfx}-body-auto`)?.checked || false,
        body_color: document.getElementById(`scr-${pfx}-body-color`)?.value || '#ffffff',
        body_align: document.getElementById(`scr-${pfx}-body-align`)?.value || 'left',

        // 🎯 Padding PX EXPLISIT
        body_pad_t: parseInt(document.getElementById(`scr-${pfx}-body-pad-t`)?.value || 20),
        body_pad_b: parseInt(document.getElementById(`scr-${pfx}-body-pad-b`)?.value || 20),
        body_pad_l: parseInt(document.getElementById(`scr-${pfx}-body-pad-l`)?.value || 30),
        body_pad_r: parseInt(document.getElementById(`scr-${pfx}-body-pad-r`)?.value || 30)
    };
}
function setScrConfigToUI(pfx, config) {
    if (!config) return;
    if (document.getElementById(`scr-${pfx}-mode`)) document.getElementById(`scr-${pfx}-mode`).value = config.mode || 'overlay';
    if (document.getElementById(`scr-${pfx}-bg-type`)) document.getElementById(`scr-${pfx}-bg-type`).value = config.bg_type || 'transparent';
    if (document.getElementById(`scr-${pfx}-bg-color`)) document.getElementById(`scr-${pfx}-bg-color`).value = config.bg_color || '#000000';
    if (document.getElementById(`scr-${pfx}-bg-opacity`)) document.getElementById(`scr-${pfx}-bg-opacity`).value = config.bg_opacity || 0.8;
    if (document.getElementById(`scr-${pfx}-bg-blur`)) document.getElementById(`scr-${pfx}-bg-blur`).value = config.bg_blur || 0;
    if (document.getElementById(`scr-${pfx}-overlay-height`)) document.getElementById(`scr-${pfx}-overlay-height`).value = config.overlay_height || 35;
    if (document.getElementById(`scr-${pfx}-overlay-pos`)) document.getElementById(`scr-${pfx}-overlay-pos`).value = config.overlay_pos || 'bottom';
    if (document.getElementById(`scr-${pfx}-overlay-radius`)) document.getElementById(`scr-${pfx}-overlay-radius`).value = config.overlay_radius || 15;

    if (document.getElementById(`scr-${pfx}-title-font`)) document.getElementById(`scr-${pfx}-title-font`).value = config.title_font || 'Montserrat';
    if (document.getElementById(`scr-${pfx}-title-size`)) document.getElementById(`scr-${pfx}-title-size`).value = config.title_size || 28;
    if (document.getElementById(`scr-${pfx}-title-color`)) document.getElementById(`scr-${pfx}-title-color`).value = config.title_color || '#00e5ff';
    if (document.getElementById(`scr-${pfx}-title-align`)) document.getElementById(`scr-${pfx}-title-align`).value = config.title_align || 'left';

    // 🎯 Padding PX EXPLISIT
    if (document.getElementById(`scr-${pfx}-title-pad-t`)) document.getElementById(`scr-${pfx}-title-pad-t`).value = config.title_pad_t || 15;
    if (document.getElementById(`scr-${pfx}-title-pad-b`)) document.getElementById(`scr-${pfx}-title-pad-b`).value = config.title_pad_b || 15;
    if (document.getElementById(`scr-${pfx}-title-pad-l`)) document.getElementById(`scr-${pfx}-title-pad-l`).value = config.title_pad_l || 20;
    if (document.getElementById(`scr-${pfx}-title-pad-r`)) document.getElementById(`scr-${pfx}-title-pad-r`).value = config.title_pad_r || 20;

    if (document.getElementById(`scr-${pfx}-body-font`)) document.getElementById(`scr-${pfx}-body-font`).value = config.body_font || 'Montserrat';
    if (document.getElementById(`scr-${pfx}-body-size`)) document.getElementById(`scr-${pfx}-body-size`).value = config.body_size || 45;
    if (document.getElementById(`scr-${pfx}-body-auto`)) document.getElementById(`scr-${pfx}-body-auto`).checked = config.body_auto || false;
    if (document.getElementById(`scr-${pfx}-body-color`)) document.getElementById(`scr-${pfx}-body-color`).value = config.body_color || '#ffffff';
    if (document.getElementById(`scr-${pfx}-body-align`)) document.getElementById(`scr-${pfx}-body-align`).value = config.body_align || 'left';

    // 🎯 Padding PX EXPLISIT
    if (document.getElementById(`scr-${pfx}-body-pad-t`)) document.getElementById(`scr-${pfx}-body-pad-t`).value = config.body_pad_t || 20;
    if (document.getElementById(`scr-${pfx}-body-pad-b`)) document.getElementById(`scr-${pfx}-body-pad-b`).value = config.body_pad_b || 20;
    if (document.getElementById(`scr-${pfx}-body-pad-l`)) document.getElementById(`scr-${pfx}-body-pad-l`).value = config.body_pad_l || 30;
    if (document.getElementById(`scr-${pfx}-body-pad-r`)) document.getElementById(`scr-${pfx}-body-pad-r`).value = config.body_pad_r || 30;

    // 🎯 UPDATE UI STATE (Disabled inputs, dsb)
    updateScrLayoutUI();
}

let scrDebounceTimer;
function setupScrRealtime() {
    const modal = document.getElementById('scripture-settings-modal');
    if (!modal) return;

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
    if (!selectEl || !selectEl.value) return showToast("Select a preset from the dropdown first!", "warning", 3000);

    const name = selectEl.value;

    const isOk = await showCustomDialog("confirm", `Are you sure you want to delete preset <br><b style="color:#ff4444;">"${name}"</b>?`);
    if (!isOk) return; // Batal hapus

    showToast("Deleting...", "loading");
    await fetch(`/api/scripture_presets/${name}`, { method: 'DELETE' });
    showToast("Deleted!", "success", 1500);

    await fetchScripturePresets();
    selectEl.value = ""; // Reset tampilan dropdown
}

async function setDefaultScrPreset(pfx) {
    const selectEl = document.getElementById(`scr-${pfx}-preset-select`);
    if (!selectEl || !selectEl.value) return showToast("Select a preset from the dropdown first!", "warning", 3000);

    showToast("Setting default...", "loading");
    await fetch(`/api/scripture_presets/default/${pfx}/${selectEl.value}`, { method: 'POST' });
    showToast(`Successfully set as Default!`, "success", 1500);

    fetchScripturePresets();
}

window.handleScrLanguageChange = function () {
    populateBibleDatalist();
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

function scaleModalPreviewScr() {
    const wrapper = document.getElementById("scr-preview-box");
    const frame = document.getElementById("scr-preview-iframe");
    if (wrapper && frame) { frame.style.transform = `scale(${wrapper.offsetWidth / 1920})`; }
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
            if (currentWidth > 0) {
                const scaleValue = currentWidth / 1920;
                iframe.style.transform = `scale(${scaleValue})`;
            }
        });
        iframeScaleObserverScr.observe(wrapper); // Hanya memantau kotak preview
    }
}
attachIframeScalerScr();

function getBibleBooksMap() {
    return {
        "Genesis": "Kejadian", "Exodus": "Keluaran", "Leviticus": "Imamat", "Numbers": "Bilangan", "Deuteronomy": "Ulangan", "Joshua": "Yosua", "Judges": "Hakim-hakim", "Ruth": "Rut", "1 Samuel": "1 Samuel", "2 Samuel": "2 Samuel", "1 Kings": "1 Raja-raja", "2 Kings": "2 Raja-raja", "1 Chronicles": "1 Tawarikh", "2 Chronicles": "2 Tawarikh", "Ezra": "Ezra", "Nehemiah": "Nehemia", "Esther": "Ester", "Job": "Ayub", "Psalms": "Mazmur", "Proverbs": "Amsal", "Ecclesiastes": "Pengkhotbah", "Song of Solomon": "Kidung Agung", "Isaiah": "Yesaya", "Jeremiah": "Yeremia", "Lamentations": "Ratapan", "Ezekiel": "Yehezkiel", "Daniel": "Daniel", "Hosea": "Hosea", "Joel": "Yoel", "Amos": "Amos", "Obadiah": "Obaja", "Jonah": "Yunus", "Micah": "Mikha", "Nahum": "Nahum", "Habakkuk": "Habakuk", "Zephaniah": "Zefanya", "Haggai": "Hagai", "Zechariah": "Zakharia", "Malachi": "Maleakhi", "Matthew": "Matius", "Mark": "Markus", "Luke": "Lukas", "John": "Yohanes", "Acts": "Kisah Para Rasul", "Romans": "Roma", "1 Corinthians": "1 Korintus", "2 Corinthians": "2 Korintus", "Galatians": "Galatia", "Ephesians": "Efesus", "Philippians": "Filipi", "Colossians": "Kolose", "1 Thessalonians": "1 Tesalonika", "2 Thessalonians": "2 Tesalonika", "1 Timothy": "1 Timotius", "2 Timothy": "2 Timotius", "Titus": "Titus", "Philemon": "Filemon", "Hebrews": "Ibrani", "James": "Yakobus", "1 Peter": "1 Petrus", "2 Peter": "2 Petrus", "1 John": "1 Yohanes", "2 John": "2 Yohanes", "3 John": "3 Yohanes", "Jude": "Yudas", "Revelation": "Wahyu"
    };
}

function translateBookName(bookName, targetLang) {
    const map = getBibleBooksMap(); // Panggil dengan aman
    let engName = bookName;
    for (const [en, id] of Object.entries(map)) {
        if (bookName.toLowerCase() === id.toLowerCase() || bookName.toLowerCase() === en.toLowerCase()) {
            engName = en; break;
        }
    }
    return targetLang === 'en' ? engName : (map[engName] || bookName);
}

// 🎯 FIX BUG 4: Pastikan HTML mu memanggil dengan onchange="handleTranslationCheck(event)"
window.handleTranslationCheck = function (e) {
    const checkboxes = document.querySelectorAll(".bible-version-cb");
    let checked = document.querySelectorAll(".bible-version-cb:checked");

    // Tolak jika VJ mencoba mengosongkan semua centang
    if (checked.length === 0 && e && e.target) {
        showToast("At least 1 translation must be active!", "warning");
        e.target.checked = true; // Paksa centang kembali
        checked = document.querySelectorAll(".bible-version-cb:checked"); // Refresh data
    }

    // 🎯 FIX BUG 2: Bebaskan pilihan 2 terjemahan untuk SEMUA mode (Overlay / Fullscreen)
    const maxAllowed = 2;

    // Tolak jika melebihi batas 2
    if (checked.length > maxAllowed && e && e.target) {
        showToast(`Maximum ${maxAllowed} translations!`, "warning");
        e.target.checked = false; // Batal centang
        checked = document.querySelectorAll(".bible-version-cb:checked"); // Refresh data
    }

    // Kunci checkbox sisa jika sudah 2 yang dicentang
    checkboxes.forEach(cb => {
        if (!cb.checked && checked.length >= maxAllowed) {
            cb.disabled = true;
            cb.parentElement.style.opacity = "0.4";
        } else {
            cb.disabled = false;
            cb.parentElement.style.opacity = "1";
        }
    });

    if (checked.length > 0) loadBibleBooks(checked[0].value);

    // Auto-update layar jika Kitab & Pasal sudah terisi
    const book = document.getElementById("bible-book").value;
    const chap = document.getElementById("bible-chapter").value;
    if (book && chap && currentActiveTab === 'scripture') {
        searchScripture(true);
    }
};

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
    }

    applyScriptureSettings();
}

function updateScrLayoutUI() {
    ['disp', 'lt'].forEach(pfx => {
        const modeEl = document.getElementById(`scr-${pfx}-mode`);
        const opacityInput = document.getElementById(`scr-${pfx}-bg-opacity`);
        const bodyAutoChk = document.getElementById(`scr-${pfx}-body-auto`);
        const bodySizeInput = document.getElementById(`scr-${pfx}-body-size`);

        // Handle Background Opacity based on Mode
        if (modeEl && opacityInput) {
            if (modeEl.value === 'fullscreen') {
                opacityInput.disabled = true;
                opacityInput.style.opacity = '0.4';
            } else {
                opacityInput.disabled = false;
                opacityInput.style.opacity = '1';
            }
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
        overlay_height: 35, overlay_pos: 'bottom', overlay_radius: 15,
        title_font: 'Montserrat', title_size: 28, title_color: '#00e5ff', title_align: 'left',
        title_pad_t: 15, title_pad_b: 15, title_pad_l: 20, title_pad_r: 20,
        body_font: 'Montserrat', body_size: 45, body_auto: true, body_color: '#ffffff', body_align: 'left',
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
    let wsUrl = `ws://${sender.ip}:${sender.ws_port}/ws`;

    // Fix Layout: Ensure grid-container doesn't break our 2-column layout
    const container = document.getElementById("grid-container");
    if (container) {
        container.classList.add("ppt-remote-active");
        container.innerHTML = `<div class="ppt-remote-loading">
            <div class="spinner"></div>
            <div id="ppt-remote-loading-text">TRY TO CONNECTING DESKTOP...</div>
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
                if (pptRemoteMode && lastSenderInfo.is_running) {
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
window.loadRemoteImage = function(url, imgElement) {
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
        const thumbUrl = `${baseUrl}/thumbs/${baseS}?t=${Date.now()}`;
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

        // Use direct remote URL without proxy
        const baseUrl = `http://${currentSender.ip}:${currentSender.ws_port}`;
        const thumbUrl = `${baseUrl}/hd_thumbs/slide_${nextIdx}`;
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

        // Use direct remote URL without proxy
        const baseUrl = `http://${currentSender.ip}:${currentSender.ws_port}`;
        const thumbUrl = `${baseUrl}/hd_thumbs/slide_${num}`;
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
        const thumbUrl = `${baseUrl}/thumbs/slide_${lastSenderInfo.current_slide}?t=${Date.now()}`;
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
        
        // Count modifier keys
        let modifiers = 0;
        const ctrl = !!e.ctrlKey;
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
    } catch(e) {
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
    } catch(e) {
        console.warn('[AdvOutput] Could not fetch local IP:', e);
    }

    const PORT = 18888;
    const outputDefs = [
        { key: 'main', canvasId: 'qr-main', urlElId: 'qr-url-main', path: '/display' },
        { key: 'lt',   canvasId: 'qr-lt',   urlElId: 'qr-url-lt',   path: '/lowerthird' },
        { key: 'fb',   canvasId: 'qr-fb',   urlElId: 'qr-url-fb',   path: '/foldback'  },
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
    } catch(e) {
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
    } catch(e) {
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

