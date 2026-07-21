
// 🎯 MESIN SKALA 1920 KHUSUS LT
let scriptureLtResizeScheduled = false;
function scaleScriptureLayer() {
    if (scriptureLtResizeScheduled) return;
    scriptureLtResizeScheduled = true;
    window.requestAnimationFrame(() => {
        const wrapper = document.getElementById('scr-wrapper');
        if (wrapper) {
            const htmlWidth = parseFloat(window.getComputedStyle(document.documentElement).width);
            const htmlHeight = parseFloat(window.getComputedStyle(document.documentElement).height);
            const layoutWidth = (htmlWidth && htmlWidth > 0) ? htmlWidth : window.innerWidth;
            const layoutHeight = (htmlHeight && htmlHeight > 0) ? htmlHeight : window.innerHeight;
            const scale = Math.min(layoutWidth / 1920, layoutHeight / 1080);
            wrapper.style.transform = `scale(${scale})`;
        }
        scriptureLtResizeScheduled = false;
    });
}
window.addEventListener('resize', scaleScriptureLayer);
scaleScriptureLayer();

// Observe CSS injection on html tag (for custom Electron resolution scaling recalculation)
try {
    const scriptureLtStyleObserver = new ResizeObserver(() => {
        scaleScriptureLayer();
    });
    scriptureLtStyleObserver.observe(document.documentElement);
} catch (e) {
    console.warn("Failed to initialize scripture-lt resolution observer", e);
}

// 🎯 KONEKSI WEBSOCKET KHUSUS LT
let ws;
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);

        if (data.action === "update_scripture") {
            const payload = data.payload;
            const layer = document.getElementById("scripture-layer");
            const fullBg = document.getElementById("scr-full-bg");

            if (payload.show_lt === false) {
                layer.classList.remove("show"); fullBg.classList.remove("show");
            } else if (payload.show_lt === true) {
                document.getElementById("scr-title").innerText = `${payload.book} ${payload.chapter}:${payload.verse}`;

                const labelV1 = payload.v1_name ? `<span class="scr-version-label" style="color:var(--scr-title-color);">${payload.v1_name}</span> ` : "";
                const labelV2 = payload.v2_name ? `<span class="scr-version-label" style="color:var(--scr-title-color);">${payload.v2_name}</span> ` : "";

                document.getElementById("scr-v1").innerHTML = `${labelV1}${payload.text1}`;

                const v2El = document.getElementById("scr-v2");
                if (payload.text2) {
                    v2El.innerHTML = `${labelV2}${payload.text2}`;
                    v2El.classList.remove("te-hidden");
                } else {
                    v2El.classList.add("te-hidden");
                }

                layer.classList.add("show"); fullBg.classList.add("show");

                // 🎯 TRIGGER AUTO-FIT BERTAHAP
                autoFitVerse();
                setTimeout(autoFitVerse, 50);
                setTimeout(autoFitVerse, 200);
            }
        }
        else if (data.action === "update_scripture_lt_config") {
            applyConfig(data.payload);
            autoFitVerse();
            setTimeout(autoFitVerse, 50);
        }
    };
    ws.onclose = () => setTimeout(connectWebSocket, 1000);
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
    link.onerror = () => { console.log(`ℹ️ Font "${fontName}" is using local Windows version.`); };
    document.head.appendChild(link);
}

function applyConfig(c) {
    const root = document.documentElement.style;
    const layer = document.getElementById("scripture-layer");
    const wrapper = document.getElementById("scr-wrapper");
    if (!layer || !wrapper) return;

    if (c.title_font) injectFont(c.title_font);
    if (c.body_font) injectFont(c.body_font);

    let rgbaColor = 'transparent';
    if (c.bg_type === "color") rgbaColor = hexToRgba(c.bg_color, c.mode === "fullscreen" ? 1.0 : c.bg_opacity);

    if (c.mode === "fullscreen") {
        root.setProperty('--scr-full-bg-color', rgbaColor); root.setProperty('--scr-full-bg-blur', c.bg_blur > 0 ? `blur(${c.bg_blur}px)` : 'none');
        root.setProperty('--scr-bg-color', 'transparent'); root.setProperty('--scr-bg-blur', 'none');
        root.setProperty('--scr-overlay-height', '1080px'); root.setProperty('--scr-overlay-radius', '0px');
        root.setProperty('--scr-margin-x', '0px'); root.setProperty('--scr-margin-y', '0px');
        layer.style.justifyContent = 'center'; wrapper.style.transformOrigin = 'center center';
    } else {
        root.setProperty('--scr-full-bg-color', 'transparent'); root.setProperty('--scr-full-bg-blur', 'none');
        root.setProperty('--scr-bg-color', rgbaColor); root.setProperty('--scr-bg-blur', c.bg_blur > 0 ? `blur(${c.bg_blur}px)` : 'none');
        const pxHeight = (parseInt(c.overlay_height) / 100) * 1080;
        root.setProperty('--scr-overlay-height', `${pxHeight}px`); root.setProperty('--scr-overlay-radius', `${c.overlay_radius}px`);
        root.setProperty('--scr-margin-x', '40px'); root.setProperty('--scr-margin-y', '40px');
        layer.style.justifyContent = c.overlay_pos === 'top' ? 'flex-start' : 'flex-end';
        wrapper.style.transformOrigin = c.overlay_pos === 'top' ? 'center top' : 'center bottom';
    }

    root.setProperty('--scr-title-font', `"${c.title_font}", sans-serif`); root.setProperty('--scr-title-size', `${c.title_size}px`);
    root.setProperty('--scr-title-color', c.title_color); root.setProperty('--scr-title-align', c.title_align);
    root.setProperty('--scr-title-pad', `${c.title_pad_t}px ${c.title_pad_r}px ${c.title_pad_b}px ${c.title_pad_l}px`);

    root.setProperty('--scr-body-font', `"${c.body_font}", sans-serif`); root.setProperty('--scr-body-size', `${c.body_size}px`);
    root.setProperty('--scr-body-color', c.body_color); root.setProperty('--scr-body-align', c.body_align);
    root.setProperty('--scr-body-pad', `${c.body_pad_t}px ${c.body_pad_r}px ${c.body_pad_b}px ${c.body_pad_l}px`);

    root.setProperty('--scr-body-auto', c.body_auto ? 'true' : 'false');
    if (!c.body_auto) {
        document.getElementById('scr-v1').style.fontSize = '';
        if (document.getElementById('scr-v2')) document.getElementById('scr-v2').style.fontSize = '';
    }
}

// 🎯 ENGINE AUTO-FIT YANG LEBIH CERDAS
let isFitting = false;
function autoFitVerse() {
    const root = document.documentElement.style;
    if (root.getPropertyValue('--scr-body-auto') !== 'true') return;
    if (isFitting) return;
    isFitting = true;

    const container = document.getElementById("scr-container");
    const v1Box = document.getElementById("scr-v1");
    const v2Box = document.getElementById("scr-v2");
    if (!container || !v1Box) { isFitting = false; return; }

    let maxSize = parseInt(root.getPropertyValue('--scr-body-size')) || 80;
    if (maxSize < 80) maxSize = 100;

    requestAnimationFrame(() => {
        let low = 12;
        let high = maxSize;
        let optimalSize = low;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            v1Box.style.fontSize = mid + "px";
            if (v2Box) v2Box.style.fontSize = mid + "px";

            if (container.scrollHeight <= container.clientHeight) {
                optimalSize = mid;
                low = mid + 1; // Try larger
            } else {
                high = mid - 1; // Try smaller
            }
        }

        v1Box.style.fontSize = optimalSize + "px";
        if (v2Box) v2Box.style.fontSize = optimalSize + "px";
        isFitting = false;
    });
}

const observer = new MutationObserver(() => {
    autoFitVerse();
});
const target = document.getElementById('scr-v1');
if (target) observer.observe(target, { childList: true, characterData: true, subtree: true });
