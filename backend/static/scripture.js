// ========================================================
// 🎯 FIX SCALING ENGINE V3 (Hardcoded Canvas 1920)
// ========================================================
let scriptureResizeScheduled = false;
let lastScriptureScale = null;
function scaleScriptureLayer() {
    if (scriptureResizeScheduled) return;
    scriptureResizeScheduled = true;
    window.requestAnimationFrame(() => {
        const wrapper = document.getElementById('scr-wrapper');
        if (wrapper) {
            const htmlWidth = parseFloat(window.getComputedStyle(document.documentElement).width);
            const htmlHeight = parseFloat(window.getComputedStyle(document.documentElement).height);
            const layoutWidth = (htmlWidth && htmlWidth > 0) ? htmlWidth : window.innerWidth;
            const layoutHeight = (htmlHeight && htmlHeight > 0) ? htmlHeight : window.innerHeight;
            const scale = Math.min(layoutWidth / 1920, layoutHeight / 1080);
            if (scale !== lastScriptureScale) {
                wrapper.style.transform = `scale(${scale})`;
                lastScriptureScale = scale;
            }
        }
        scriptureResizeScheduled = false;
    });
}
window.addEventListener('resize', scaleScriptureLayer);
scaleScriptureLayer();

// Observe CSS injection on html tag (for custom Electron resolution scaling recalculation)
try {
    const scriptureStyleObserver = new ResizeObserver(() => {
        scaleScriptureLayer();
    });
    scriptureStyleObserver.observe(document.documentElement);
} catch (e) {
    console.warn("Failed to initialize scripture resolution observer", e);
}

// ========================================================
// 🎯 WEBSOCKET & RENDERING ENGINE
// ========================================================
let ws;
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = function () {
        if (window._WEShield && typeof window._WEShield.attachSocket === 'function') {
            window._WEShield.attachSocket(ws);
        }
    };

    ws.onmessage = function (event) {
        if (window._WEShield && typeof window._WEShield.dispatch === 'function') {
            window._WEShield.dispatch(event.data, handleScriptureMsg);
        } else {
            try { handleScriptureMsg(JSON.parse(event.data)); } catch (_) {}
        }
    };

    function handleScriptureMsg(data) {
        if (data.action === "update_scripture") {
            const payload = data.payload;
            const layer = document.getElementById("scripture-layer");
            const fullBg = document.getElementById("scr-full-bg");

            if (payload.show_display === false) {
                layer.classList.remove("show");
                fullBg.classList.remove("show");
            } else if (payload.show_display === true) {
                document.getElementById("scr-title").innerText = `${payload.book} ${payload.chapter}:${payload.verse}`;

                const labelV1 = payload.v1_name ? `<span class="scr-version-label" style="color:var(--scr-title-color);">${payload.v1_name}</span> ` : "";
                const labelV2 = payload.v2_name ? `<span class="scr-version-label" style="color:var(--scr-title-color);">${payload.v2_name}</span> ` : "";

                document.getElementById("scr-v1").innerHTML = `${labelV1}${payload.text1}`;

                const v2El = document.getElementById("scr-v2");
                if (payload.text2) {
                    v2El.innerHTML = `${labelV2}${payload.text2}`;
                    v2El.classList.remove("te-hidden");
                } else {
                    v2El.innerHTML = "";
                    v2El.classList.add("te-hidden");
                }

                layer.classList.add("show");
                fullBg.classList.add("show");

                autoFitVerse();
                setTimeout(autoFitVerse, 60);
            }
        } else if (data.action === "update_scripture_config") {
            applyConfig(data.payload);
            autoFitVerse();
            setTimeout(autoFitVerse, 60);
        }
    }
    ws.onclose = (ev) => {
        if (ev && ev.code === 4001) {
            if (window.top === window.self) setTimeout(() => window.location.reload(), 150);
            return;
        }
        setTimeout(connectWebSocket, 1000);
    };
    ws.onerror = () => {
        try { ws.close(); } catch (_) {}
    };
}
connectWebSocket();

function hexToRgba(hex, opacity) {
    if (!hex) return 'transparent';
    hex = hex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function injectFont(fontName) {
    if (!fontName) return;
    const linkId = "font-link-" + fontName.replace(/\s+/g, '-').toLowerCase();
    if (document.getElementById(linkId)) return;

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}&display=swap`;
    link.onload = () => {
        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(() => autoFitVerse());
        } else {
            autoFitVerse();
        }
    };
    link.onerror = () => { console.log(`ℹ️ Font "${fontName}" is using local system version.`); };
    document.head.appendChild(link);
}

const FULLSCREEN_JUSTIFY_MAP = {
    top: 'flex-start',
    center: 'center',
    bottom: 'flex-end'
};

function applyConfig(c) {
    if (!c) return;
    const root = document.documentElement.style;
    const layer = document.getElementById("scripture-layer");
    const wrapper = document.getElementById("scr-wrapper");

    if (!layer || !wrapper) return;

    if (c.title_font) injectFont(c.title_font);
    if (c.body_font) injectFont(c.body_font);

    const bgOpacity = c.bg_opacity ?? 0.8;
    const bgBlur = c.bg_blur ?? 0;
    const overlayHeight = c.overlay_height ?? 35;
    const overlayRadius = c.overlay_radius ?? 15;

    let rgbaColor = 'transparent';
    if (c.bg_type === "color") {
        rgbaColor = hexToRgba(c.bg_color, c.mode === "fullscreen" ? 1.0 : bgOpacity);
    }

    // Background & 1-Block Position Logic
    if (c.mode === "fullscreen") {
        root.setProperty('--scr-full-bg-color', rgbaColor);
        root.setProperty('--scr-full-bg-blur', bgBlur > 0 ? `blur(${bgBlur}px)` : 'none');
        root.setProperty('--scr-bg-color', 'transparent');
        root.setProperty('--scr-bg-blur', 'none');

        root.setProperty('--scr-overlay-height', '1080px');
        root.setProperty('--scr-overlay-radius', '0px');
        root.setProperty('--scr-margin-x', '0px');
        root.setProperty('--scr-margin-y', '0px');
        root.setProperty('--scr-block-justify', FULLSCREEN_JUSTIFY_MAP[c.fullscreen_pos] || 'flex-start');

        layer.style.justifyContent = 'center';
        wrapper.style.transformOrigin = 'center center';
    } else {
        root.setProperty('--scr-full-bg-color', 'transparent');
        root.setProperty('--scr-full-bg-blur', 'none');
        root.setProperty('--scr-bg-color', rgbaColor);
        root.setProperty('--scr-bg-blur', bgBlur > 0 ? `blur(${bgBlur}px)` : 'none');

        const pxHeight = (parseInt(overlayHeight, 10) / 100) * 1080;
        root.setProperty('--scr-overlay-height', `${pxHeight}px`);
        root.setProperty('--scr-overlay-radius', `${overlayRadius}px`);
        root.setProperty('--scr-margin-x', '40px');
        root.setProperty('--scr-margin-y', '40px');
        root.setProperty('--scr-block-justify', 'flex-start');

        layer.style.justifyContent = c.overlay_pos === 'top' ? 'flex-start' : 'flex-end';
        wrapper.style.transformOrigin = c.overlay_pos === 'top' ? 'center top' : 'center bottom';
    }

    // Tipografi
    const titlePos = c.title_pos || 'top';
    root.setProperty('--scr-title-order', titlePos === 'bottom' ? '2' : '0');
    root.setProperty('--scr-body-order', '1');

    root.setProperty('--scr-title-font', `"${c.title_font || 'Montserrat'}", sans-serif`);
    root.setProperty('--scr-title-size', `${c.title_size ?? 28}px`);
    root.setProperty('--scr-title-color', c.title_color || '#00e5ff');
    root.setProperty('--scr-title-align', c.title_align || 'left');
    root.setProperty('--scr-title-weight', c.title_bold ? 'bold' : 'normal');
    root.setProperty('--scr-title-style', c.title_italic ? 'italic' : 'normal');
    root.setProperty('--scr-title-decoration', c.title_underline ? 'underline' : 'none');
    root.setProperty('--scr-title-pad', `${c.title_pad_t ?? 15}px ${c.title_pad_r ?? 20}px ${c.title_pad_b ?? 15}px ${c.title_pad_l ?? 20}px`);

    root.setProperty('--scr-body-font', `"${c.body_font || 'Montserrat'}", sans-serif`);
    root.setProperty('--scr-body-size', `${c.body_size ?? 45}px`);
    root.setProperty('--scr-body-color', c.body_color || '#ffffff');
    root.setProperty('--scr-body-align', c.body_align || 'left');
    root.setProperty('--scr-body-weight', c.body_bold ? 'bold' : 'normal');
    root.setProperty('--scr-body-style', c.body_italic ? 'italic' : 'normal');
    root.setProperty('--scr-body-decoration', c.body_underline ? 'underline' : 'none');
    root.setProperty('--scr-body-pad', `${c.body_pad_t ?? 20}px ${c.body_pad_r ?? 30}px ${c.body_pad_b ?? 20}px ${c.body_pad_l ?? 30}px`);

    root.setProperty('--scr-body-auto', c.body_auto ? 'true' : 'false');
    if (!c.body_auto) {
        const v1 = document.getElementById('scr-v1');
        const v2 = document.getElementById('scr-v2');
        if (v1) v1.style.fontSize = '';
        if (v2) v2.style.fontSize = '';
    }
}

// ========================================================
// 🎯 ENGINE AUTO-FIT BEBAS FLICKER
// ========================================================
let autoFitRafId = null;
function autoFitVerse() {
    const root = document.documentElement.style;
    if (root.getPropertyValue('--scr-body-auto') !== 'true') return;

    if (autoFitRafId !== null) {
        cancelAnimationFrame(autoFitRafId);
    }

    autoFitRafId = requestAnimationFrame(() => {
        autoFitRafId = null;
        if (root.getPropertyValue('--scr-body-auto') !== 'true') return;

        const container = document.getElementById("scr-container");
        const v1Box = document.getElementById("scr-v1");
        const v2Box = document.getElementById("scr-v2");
        if (!container || !v1Box) return;
        if (!v1Box.textContent.trim() && (!v2Box || v2Box.classList.contains('te-hidden'))) return;

        let maxSize = parseInt(root.getPropertyValue('--scr-body-size'), 10) || 80;
        if (maxSize < 80) maxSize = 100;

        let low = 12;
        let high = maxSize;
        let optimalSize = low;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const sizeStr = mid + "px";
            v1Box.style.fontSize = sizeStr;
            if (v2Box) v2Box.style.fontSize = sizeStr;

            if (container.scrollHeight <= container.clientHeight && container.scrollWidth <= container.clientWidth) {
                optimalSize = mid;
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        const finalStr = optimalSize + "px";
        if (v1Box.style.fontSize !== finalStr) v1Box.style.fontSize = finalStr;
        if (v2Box && v2Box.style.fontSize !== finalStr) v2Box.style.fontSize = finalStr;
    });
}

// 🎯 Pantau perubahan text pada title, v1, dan v2 secara otomatis
const observer = new MutationObserver(() => {
    autoFitVerse();
});
['scr-title', 'scr-v1', 'scr-v2'].forEach(id => {
    const el = document.getElementById(id);
    if (el) observer.observe(el, { childList: true, characterData: true, subtree: true });
});

if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => autoFitVerse());
}
