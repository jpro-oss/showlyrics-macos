
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

    ws.onmessage = function (e) {
        try {
            const data = JSON.parse(e.data);

            // 1. Update Photo
            if (data.action === "update_photo" || data.type === "update_photo") {
                const payload = data.payload || {};
                if (payload.url) {
                    // Pre-load to avoid flash
                    const temp = new Image();
                    temp.onload = () => {
                        img.dataset.broken = "false";
                        img.style.display = "block";
                        img.src = payload.url;
                        img.classList.add("active");
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
        } catch (err) {
            console.error("Photo Error:", err);
        }
    };

    ws.onclose = () => {
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
