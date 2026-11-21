
const img = document.getElementById("photo-viewer");
let ws;
let reconnectTimer = null;

// Base64 1x1 transparent GIF spacer to avoid broken image icons
const transparentSpacer = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

function fadeOutAndClearImage() {
    img.classList.remove("active");
    setTimeout(() => {
        if (!img.classList.contains('active')) {
            img.src = transparentSpacer;
            img.style.display = "none";
        }
    }, 800);
}

function handleImageError() {
    img.classList.remove("active");
    img.dataset.broken = "true";
    img.src = transparentSpacer;
    img.style.display = "none";
}

img.onerror = function () {
    console.warn("Photo image load failed, hiding broken element");
    handleImageError();
};

function connectWS() {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = function () {
        if (typeof _WEShield !== 'undefined' && typeof _WEShield.attachSocket === 'function') {
            _WEShield.attachSocket(ws);
        }
    };

    ws.onmessage = function (e) {
        if (typeof _WEShield !== 'undefined' && typeof _WEShield.dispatch === 'function') {
            _WEShield.dispatch(e.data, handlePhotoMessage);
        } else {
            try { handlePhotoMessage(JSON.parse(e.data)); } catch (_) {}
        }
    };

    function handlePhotoMessage(data) {
            try {
                // 1. Update Photo
                if (data.action === "update_photo" || data.type === "update_photo") {
                    const payload = data.payload || {};
                    const source = payload.source || 'local';
                    img.dataset.mediaSource = source;
                    if (source !== 'remote_sender') {
                        // Master Priority: Media lokal SHOWLYRICS APP paling prioritas, FTB otomatis mati
                        window._isFtbActive = false;
                    }
                    if (payload.url) {
                        // Pre-load to avoid flash
                        const temp = new Image();
                        temp.onload = () => {
                            img.dataset.broken = "false";
                            img.style.display = "block";
                            img.src = payload.url;
                            if (window._isFtbActive && img.dataset.mediaSource === 'remote_sender') {
                                img.style.transition = "opacity 0ms ease";
                                img.style.opacity = "0";
                                img.classList.remove("active");
                            } else {
                                img.style.transition = "opacity 350ms ease";
                                img.style.opacity = "1";
                                img.classList.add("active");
                            }
                        };
                        temp.onerror = () => {
                            console.error("Failed to preload photo:", payload.url);
                            handleImageError();
                        };
                        temp.src = payload.url;
                    } else {
                        fadeOutAndClearImage();
                    }
                }

                // 2. Background Config (Fit Mode)
                if (data.action === "update_bg_config" || data.type === "update_bg_config") {
                    const payload = data.payload || {};
                    if (payload.photo_fit) {
                        img.style.objectFit = payload.photo_fit;
                    }
                }

                // 3. FTB (Fade to Black) Handling - HANYA UNTUK MEDIA SENDER
                if (data.action === "ftb" || data.type === "ftb" || ((data.action === "bg_control" || data.type === "bg_control") && data.payload?.command === "ftb")) {
                    const payload = data.payload || {};
                    let isFtbActive = false;
                    if (payload.enabled !== undefined) {
                        isFtbActive = Boolean(payload.enabled);
                    } else if (payload.value !== undefined) {
                        if (typeof payload.value === "object" && payload.value !== null) {
                            isFtbActive = Boolean(payload.value.active);
                        } else {
                            isFtbActive = Boolean(payload.value);
                        }
                    }

                    const ftbSource = payload.source || data.source || 'remote_sender';
                    const target = payload.target || data.target || 'all';

                    // FTB dari Sender HANYA mempengaruhi media remote_sender!
                    // Jika media yang sedang aktif di photo viewer adalah lokal, abaikan FTB sama sekali!
                    if (img.dataset.mediaSource !== 'remote_sender' && ftbSource === 'remote_sender') {
                        return;
                    }

                    // Jika FTB ditargetkan khusus video atau audio, jangan sentuh foto
                    if (target !== 'all' && target !== 'photo') {
                        return;
                    }

                    window._isFtbActive = isFtbActive;
                    if (isFtbActive) {
                        img.style.transition = "opacity 0ms ease";
                        img.classList.remove("active");
                        img.style.opacity = "0";
                    } else {
                        img.style.transition = "opacity 350ms ease";
                        if (img.src && !img.src.includes("data:image") && img.style.display !== "none") {
                            img.classList.add("active");
                            img.style.opacity = "1";
                        }
                    }
                }
            } catch (err) {
                console.error("Photo Error:", err);
            }
    }

    ws.onclose = (ev) => {
        if (ev && ev.code === 4001) {
            if (window.top === window.self) setTimeout(() => window.location.reload(), 150);
            return;
        }
        console.warn("WebSocket disconnected. Retrying in 2 seconds...");
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(connectWS, 2000);
    };

    ws.onerror = (err) => {
        console.error("WebSocket error:", err);
        ws.close();
    };
}

connectWS();
