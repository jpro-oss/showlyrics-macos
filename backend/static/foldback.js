
function loadImageDirect(url, imgElement) {
    if (!url) {
        if (imgElement) {
            imgElement.src = "";
            imgElement.dataset.broken = "false";
        }
        return;
    }
    // Direct image loading - no fetch/blob to avoid IDM detection
    imgElement.onerror = function () {
        console.warn("[FOLDBACK] Image failed to load:", url);
        imgElement.dataset.broken = "true";
        imgElement.style.display = "none";
    };
    imgElement.onload = function () {
        imgElement.dataset.broken = "false";
    };
    imgElement.dataset.broken = "false";
    imgElement.src = url;
}

function injectFont(fontName) {
    if (!fontName) return;
    const linkId = "font-link-" + fontName.replace(/\s+/g, '-').toLowerCase();
    if (document.getElementById(linkId)) return;
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}&display=swap`;
    document.head.appendChild(link);
}

let globalSubColor = "#ffc107";
let globalSubSize = 0.6;

// Ambil warna terjemahan pas proyektor pertama nyala
fetch('/api/global_sub_settings')
    .then(res => res.json())
    .then(data => {
        if (data.color) globalSubColor = data.color;
        if (data.size) globalSubSize = data.size;
    }).catch(e => console.log("Gagal load global sub settings"));

const currEl = document.getElementById("curr-txt");
const nextEl = document.getElementById("next-txt");
const topSec = document.getElementById("top-section");
const botSec = document.getElementById("bottom-section");
const clockEl = document.getElementById("clock");

// Simpan Config Terakhir
let activeConfig = {
    curr_size: 300,
    next_size: 100
};
let countdownInterval;

// JAM DIGITAL
setInterval(() => {
    const now = new Date();
    clockEl.innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}, 1000);

function sanitizeHTML(str) {
    if (!str) return "";
    // Cukup halangi tag kurung siku (< dan >) aja.
    // Biarkan tanda petik ('), kutip ("), dan dan (&) tampil normal.
    return str.replace(/[<>]/g, function (tag) {
        const charsToReplace = { '<': '&lt;', '>': '&gt;' };
        return charsToReplace[tag] || tag;
    });
}

// --- MAGIC ENGINE BUAT FOLDBACK ---
function processBilingual(rawText) {
    if (!rawText) return "";

    // 🚀 1. CUCI TEKS DARI SCRIPT JAHAT (Anti-XSS)
    let cleanText = sanitizeHTML(rawText);

    // 🚀 2. FIX BUG PEMENGGALAN KATA (-), sama kayak di display
    let safeText = cleanText.replace(/-/g, '\u2011');

    let lines = safeText.split('\n');
    let formattedLines = lines.map(line => {
        // Proses bilingual format lama (//)
        if (line.includes("//")) {
            let parts = line.split("//");
            let mainText = parts[0].trim();
            let subText = parts.slice(1).join("//").trim();
            return `${mainText}<span style="color:${globalSubColor}; font-size:${globalSubSize}em; font-style:italic; opacity:0.9; line-height: 1.2; display:block; margin-top:-5px;">${subText}</span>`;
        }
        // Proses bilingual format baru: Haleluya (Hallelujah)
        let startIdx = line.indexOf('(');
        let endIdx = line.lastIndexOf(')');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            let mainText = line.substring(0, startIdx).trim();
            let subText = line.substring(startIdx + 1, endIdx).trim();
            return `${mainText}<span style="color:${globalSubColor}; font-size:${globalSubSize}em; font-style:italic; opacity:0.9; line-height: 1.2; display:block; margin-top:-5px;">${subText}</span>`;
        }

        return line;
    });
    return formattedLines.join("<br>");
}

// ==========================================
// --- MEDIA STATE ENGINE ---
// ==========================================
let hasLyrics = false;
let isScriptureMode = false;
let currentBgUrl = "";
let currentBgName = "";
let currentPhotoUrl = "";
let currentPhotoName = "";
let currentPptUrl = "";
const VIDEO_TIMELINE_SNAPSHOT_KEY = "showlyrics_video_timeline_snapshot";
const fbVideoEl = document.getElementById('fb-video');

function applyFoldbackSyncTime(rawTime) {
    const t = parseFloat(rawTime);
    if (!Number.isFinite(t) || !fbVideoEl.src) return;
    const diff = Math.abs(fbVideoEl.currentTime - t);
    if (diff > 0.35) fbVideoEl.currentTime = t;
    else if (diff > 0.08) fbVideoEl.currentTime += (t - fbVideoEl.currentTime) * 0.3;
}

function applyFoldbackSnapshotIfMatch() {
    try {
        const raw = localStorage.getItem(VIDEO_TIMELINE_SNAPSHOT_KEY);
        if (!raw || !currentBgUrl || !fbVideoEl.src) return;
        const snap = JSON.parse(raw);
        if (!snap || !snap.activeVideoUrl) return;
        const currentUrl = new URL(fbVideoEl.currentSrc || fbVideoEl.src, window.location.origin).href;
        const snapUrl = new URL(snap.activeVideoUrl, window.location.origin).href;
        if (currentUrl !== snapUrl) return;
        const elapsed = Math.max(0, (Date.now() - Number(snap.sentAt || Date.now())) / 1000);
        const target = Number(snap.currentTime || 0) + (snap.isPlaying ? elapsed : 0);
        applyFoldbackSyncTime(target);
    } catch (_) { }
}

function updateMediaVisibility() {
    const fbVideo = document.getElementById('fb-video');
    const fbPhoto = document.getElementById('fb-photo');
    const fbPpt = document.getElementById('fb-ppt');
    const fbLabel = document.getElementById('fb-media-label');

    if (currentPptUrl) {
        if (fbPpt.dataset.originalSrc !== currentPptUrl) {
            fbPpt.dataset.originalSrc = currentPptUrl;
            fbPpt.onerror = function () {
                console.warn("[FOLDBACK PPT] PPT image failed to load:", currentPptUrl);
                fbPpt.dataset.broken = "true";
                fbPpt.style.display = "none";
            };
            fbPpt.onload = function () {
                fbPpt.dataset.broken = "false";
            };
            loadImageDirect(currentPptUrl + "?t=" + Date.now(), fbPpt);
        }
        fbPpt.style.display = 'block';
        fbVideo.style.display = 'none';
        fbPhoto.style.display = 'none';
        fbLabel.style.display = 'none';
    } else {
        fbPpt.style.display = 'none';

        // Jika ada lirik ATAU ayat alkitab yg lagi tayang -> Tulis Label Saja
        if (hasLyrics || isScriptureMode) {
            fbVideo.style.display = 'none';
            fbPhoto.style.display = 'none';

            let labelText = "";
            if (currentBgUrl && currentBgName) {
                labelText = "🎥 " + currentBgName;
            } else if (currentPhotoUrl && currentPhotoName) {
                labelText = "🖼️ " + currentPhotoName;
            }

            if (labelText) {
                fbLabel.innerText = labelText;
                fbLabel.style.display = 'block';
            } else {
                fbLabel.style.display = 'none';
            }
        } else {
            // KOSONG TANPA LIRIK (Tampilkan video / foto full screen)
            fbLabel.style.display = 'none';

            if (currentBgUrl) {
                fbVideo.onerror = function () {
                    console.warn("[FOLDBACK VIDEO] Video failed to load:", currentBgUrl);
                    fbVideo.dataset.broken = "true";
                    fbVideo.style.display = "none";
                };
                fbVideo.onloadedmetadata = function () {
                    fbVideo.dataset.broken = "false";
                };
                if (fbVideo.src !== window.location.origin + currentBgUrl && fbVideo.src !== currentBgUrl) fbVideo.src = currentBgUrl;
                fbVideo.style.display = 'block';
                fbPhoto.style.display = 'none';
            } else if (currentPhotoUrl) {
                fbPhoto.onerror = function () {
                    console.warn("[FOLDBACK PHOTO] Photo failed to load:", currentPhotoUrl);
                    fbPhoto.dataset.broken = "true";
                    fbPhoto.style.display = "none";
                };
                fbPhoto.onload = function () {
                    fbPhoto.dataset.broken = "false";
                };
                if (fbPhoto.src !== window.location.origin + currentPhotoUrl && fbPhoto.src !== currentPhotoUrl) fbPhoto.src = currentPhotoUrl;
                fbPhoto.style.display = 'block';
                fbVideo.style.display = 'none';
            } else {
                fbVideo.style.display = 'none';
                fbPhoto.style.display = 'none';
            }
        }
    }
    if (typeof updateRundownLayout === "function") {
        updateRundownLayout();
    }
}

// ==========================================
// --- AUTO-RECONNECT WEBSOCKET ENGINE ---
// ==========================================
let ws;
let reconnectTimer;
let isWebSocketConnected = false;



function connectWebSocket() {
    if (ws) {
        try {
            ws.onopen = null;
            ws.onclose = null;
            ws.onerror = null;
            ws.onmessage = null;
            ws.close();
        } catch (e) { }
    }
    // Bikin koneksi baru
    ws = new WebSocket("ws://" + window.location.host + "/ws");

    // 1. SENSOR KONEK: Kalau sukses nyambung, matikan timer reconnect
    ws.onopen = function () {
        console.log("✅ WebSocket Connected!");
        clearTimeout(reconnectTimer);
        isWebSocketConnected = true;        // 👈 Track connection status

        _WEShield.onConnect();
    };

    // 2. SENSOR MATI: Kalau server mati / kabel putus, otomatis jalanin ini
    ws.onclose = function (e) {
        console.warn("❌ WebSocket Terputus! Mencoba nyambung lagi dalam 2 detik...");
        isWebSocketConnected = false;  // 👈 Connection status = false

        _WEShield.onDisconnect();

        reconnectTimer = setTimeout(connectWebSocket, 2000);
    };

    // 3. SENSOR ERROR: Kalau nge-glitch, paksa tutup biar masuk ke onclose
    ws.onerror = function (err) {
        console.error("⚠️ WebSocket Error, menutup koneksi...", err);
        ws.close();
    };

    // 4. ENGINE UTAMA LIRIK (Pindahan dari kode lama)
    ws.onmessage = function (event) {
        const data = JSON.parse(event.data);
        if (_WEShield.handleMessage(data)) return;


        // 1. UPDATE TEKS
        if (data.type === "update_state") {

            const s = data.state;
            isScriptureMode = false;

            // Update memori warna kalo slider digeser
            if (s.sub_color) globalSubColor = s.sub_color;
            if (s.sub_size) globalSubSize = s.sub_size;

            if (s.show) {
                currEl.innerHTML = processBilingual(s.text || "");
                nextEl.innerHTML = processBilingual(s.next_text || "");
                currEl.style.opacity = 1;
                // Cek lirik yang eksis untuk rendering background
                hasLyrics = !!(s.text && s.text.trim());
            } else {
                currEl.style.opacity = 0.3;
                hasLyrics = false;
            }
            updateMediaVisibility();
            // Trigger Auto Fit setiap ganti slide
            fitText();
        }

        if (data.action === "update_scripture" || data.type === "update_scripture") {
            const p = data.payload;
            if (p.show_display && p.text1) {
                let combined = p.text1 + (p.text2 ? "\n(" + p.text2 + ")" : "");
                let ref = (p.book || "") + " " + (p.chapter || "") + ":" + (p.verse || "");
                let textToShow = combined + "\n[" + ref.trim() + "]";

                currEl.innerHTML = processBilingual(textToShow);
                nextEl.innerHTML = "";
                currEl.style.opacity = 1;
                isScriptureMode = true;

                updateMediaVisibility();
                fitText();
            }
        }

        if (data.action === "update_background" || data.type === "update_background") {
            currentBgUrl = data.payload.url || "";
            currentBgName = data.payload.name || "";
            updateMediaVisibility();
            applyFoldbackSnapshotIfMatch();
        }
        if ((data.action === "bg_control" || data.type === "bg_control") && data.payload?.target === "video" && data.payload?.command === "sync_time") {
            applyFoldbackSyncTime(data.payload.value);
        }

        if (data.action === "update_photo" || data.type === "update_photo") {
            currentPhotoUrl = data.payload.url || "";
            currentPhotoName = data.payload.name || "";
            updateMediaVisibility();
        }

        if (data.action === "update_presentation" || data.type === "update_presentation") {
            currentPptUrl = data.payload.url || "";
            updateMediaVisibility();
        }

        // 2. UPDATE CONFIG
        if (data.type === "update_fb_config") {
            const c = data.config;
            activeConfig = c; // Update memori lokal

            document.body.style.backgroundColor = c.bg_color;
            currEl.style.color = c.curr_color;
            nextEl.style.color = c.next_color;

            if (c.layout === 'full') {
                botSec.style.display = 'none';
                topSec.style.height = '100vh';
            } else {
                botSec.style.display = 'flex';
                topSec.style.height = 'auto';
            }
            // Trigger Auto Fit saat config berubah
            fitText();
        }
        if (data.type === "alert") {
            const d = data.data;
            const bar = document.getElementById("fb-alert-bar");
            const txt = document.getElementById("fb-alert-text");
            if (d && d.show && d.text) {
                txt.innerText = d.text;
                bar.style.backgroundColor = d.color || '#8b0000';

                // Apply Font if provided
                if (d.font) {
                    injectFont(d.font);
                    bar.style.fontFamily = d.font;
                } else {
                    bar.style.fontFamily = 'sans-serif';
                }

                // Apply Text Color if provided
                if (d.text_color) {
                    bar.style.color = d.text_color;
                } else {
                    bar.style.color = '#ffffff';
                }

                bar.style.display = "block";
            } else {
                bar.style.display = "none";
            }
        }

        if (data.type === "stage_msg") {
            const d = data.data;
            const box = document.getElementById("stage-msg-box");
            if (d.show && d.text) {
                box.innerText = d.text;
                box.style.display = "block";
                if (d.flash) box.classList.add("flash"); else box.classList.remove("flash");
            } else {
                box.style.display = "none";
            }
        }

        // 2. STAGE COUNTDOWN (Timer)
        if (data.type === "stage_countdown") {
            const d = data.data;
            const box = document.getElementById("stage-countdown-box");

            if (d.action === 'stop') {
                clearInterval(countdownInterval);
                box.style.display = "none";
                return;
            }

            if (d.action === 'start') {
                clearInterval(countdownInterval);
                box.style.display = "block";

                let timeLeft = d.seconds;

                // Update function
                const updateTimer = () => {
                    const m = Math.floor(timeLeft / 60).toString().padStart(2, '0');
                    const s = (timeLeft % 60).toString().padStart(2, '0');
                    box.innerText = `${m}:${s}`;

                    if (timeLeft <= 0) {
                        clearInterval(countdownInterval);
                        box.style.color = "red"; // Warnain merah pas abis
                        box.classList.add("flash"); // Kedip-kedip
                    }
                    timeLeft--;
                };

                updateTimer(); // Run once immediately
                countdownInterval = setInterval(updateTimer, 1000);
            }
        }

        if (data.type === "stage_rundown") {
            const d = data.data;
            if (d) {
                handleIncomingFoldbackRundown(d);
            }
        }
    };

    // --- LOGIC AUTO FIT ---
    function fitText() {
        // 1. Fit Current Text
        resizeElement(currEl, topSec, activeConfig.curr_size || 300, 0, activeConfig.curr_auto !== false);

        // 2. Fit Next Text (Biar dia juga muat kalau kepanjangan)
        if (botSec.style.display !== 'none') {
            // Kurangi dikit max-height botSec buat label "NEXT:"
            resizeElement(nextEl, botSec, activeConfig.next_size || 100, 40, activeConfig.next_auto !== false);
        }
    }
    window.fitText = fitText;

    function resizeElement(el, container, maxSize, heightPadding = 0, isAuto = true) {
        if (!el.innerText) return;

        const style = window.getComputedStyle(container);
        const paddingTop = parseFloat(style.paddingTop) || 0;
        const paddingBottom = parseFloat(style.paddingBottom) || 0;
        const usableHeight = container.clientHeight - paddingTop - paddingBottom - heightPadding;
        const usableWidth = container.clientWidth;

        if (!isAuto) {
            el.style.fontSize = maxSize + "px";
            return;
        }

        let low = 20;
        let high = maxSize;
        let optimalSize = low;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            el.style.fontSize = mid + "px";

            if (el.scrollHeight <= usableHeight && el.scrollWidth <= usableWidth) {
                optimalSize = mid;
                low = mid + 1; // Try larger
            } else {
                high = mid - 1; // Try smaller
            }
        }
        el.style.fontSize = optimalSize + "px";
    }

    // Fit ulang kalau window di-resize
    window.addEventListener('resize', fitText);


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
}

// --- STAGE RUNDOWN DISPLAY ENGINE ---
let fbRundownState = null;
let fbRundownInterval = null;

function hexToRgba(hex, alpha) {
    alpha = alpha !== undefined ? alpha : 0.85;
    let c;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split('');
        if (c.length === 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = '0x' + c.join('');
        return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
    }
    return hex;
}

// Auto-fit using binary search to find the perfect font size within both width and height constraints
function autoFitFontSizeBounds(textEl, minSize, maxSize, maxWidthPx, maxHeightPx) {
    if (!textEl || !maxWidthPx) return;

    textEl.style.whiteSpace = 'nowrap';
    textEl.style.overflow   = 'visible';
    textEl.style.display    = 'inline-block';

    let low = minSize;
    let high = maxSize;
    let bestSize = minSize;

    while (low <= high) {
        let mid = Math.floor((low + high) / 2);
        textEl.style.fontSize = mid + 'px';
        void textEl.offsetWidth; // force reflow

        let fitsWidth = textEl.scrollWidth <= maxWidthPx;
        let fitsHeight = !maxHeightPx || textEl.scrollHeight <= maxHeightPx;

        if (fitsWidth && fitsHeight) {
            bestSize = mid;
            low = mid + 1; // Try bigger
        } else {
            high = mid - 1; // Too big, go smaller
        }
    }

    textEl.style.fontSize = bestSize + 'px';
    void textEl.offsetWidth;
}

// Apply all style settings (font sizes) to the rundown box based on current mode.
// Called whenever mode changes OR new state arrives.
function applyRundownStyles() {
    if (!fbRundownState || fbRundownState.activeIndex === -1) return;

    const box     = document.getElementById('fb-rundown-box');
    const titleEl = document.getElementById('fb-rundown-title');
    const timerEl = document.getElementById('fb-rundown-timer');
    if (!box || !titleEl || !timerEl) return;

    const isMini = box.classList.contains('small-mode');
    const state  = fbRundownState;

    if (isMini) {
        // --- MINI TOAST MODE ---
        const timerSize = (state.miniTimerSize !== undefined) ? state.miniTimerSize : 110;
        let titleSize = (state.miniTitleSize !== undefined) ? state.miniTitleSize : 80;
        const titleAuto = (state.miniTitleAuto !== undefined) ? state.miniTitleAuto : true;

        // Set timer font size directly (user-controlled px)
        timerEl.style.fontSize  = timerSize + 'px';
        timerEl.style.whiteSpace = 'nowrap';
        timerEl.style.overflow   = 'visible';
        void timerEl.offsetWidth; // force reflow

        // Set title
        titleEl.style.whiteSpace   = 'nowrap';
        titleEl.style.overflow     = 'visible';
        titleEl.style.textOverflow = 'clip';
        titleEl.style.display      = 'inline-block';
        titleEl.style.maxWidth     = '';

        if (titleAuto) {
            const clockEl = document.getElementById('clock');
            let maxW = window.innerWidth * 0.6; // fallback
            
            // Calculate max width from the left edge of title to the left edge of the clock
            const titleRect = titleEl.getBoundingClientRect();
            if (clockEl && titleRect.left > 0) {
                const clockRect = clockEl.getBoundingClientRect();
                maxW = clockRect.left - titleRect.left - 40; // 40px safe buffer
            }
            if (maxW < 50) maxW = 50;

            // "yang di utamakan adalah persamaan font antara timer dengan title.. 
            // baru ketika title sudah terlalu panjang ... dikecilkan"
            // So the maximum size for the title is the timer's size.
            const absoluteMax = timerSize; 
            
            autoFitFontSizeBounds(titleEl, 12, absoluteMax, maxW, null);
        } else {
            titleEl.style.fontSize = titleSize + 'px';
        }

    } else {
        // --- FULL TOAST MODE ---
        const timerSize = (state.fullTimerSize !== undefined) ? state.fullTimerSize : 190;
        const titleSize = (state.fullTitleSize !== undefined) ? state.fullTitleSize : 190;
        const titleAuto = (state.fullTitleAuto !== undefined) ? state.fullTitleAuto : true;

        // Set timer font size
        timerEl.style.fontSize  = timerSize + 'px';
        timerEl.style.whiteSpace = 'nowrap';
        timerEl.style.overflow   = 'visible';
        void timerEl.offsetWidth;

        // Set title
        titleEl.style.whiteSpace   = 'nowrap';
        titleEl.style.overflow     = 'visible';
        titleEl.style.textOverflow = 'clip';
        titleEl.style.display      = 'inline-block';
        titleEl.style.maxWidth     = '';

        if (titleAuto) {
            // Fit within window inner width (with padding buffer)
            const availW = window.innerWidth - 100;
            // "menyesuaikan agar title tidak terlalu panjang dan terlalu besar dari ukuran font timer"
            // So cap maxSize at timerSize
            const capSize = Math.min(titleSize, timerSize);
            autoFitFontSizeBounds(titleEl, 12, capSize, availW, null);
        } else {
            titleEl.style.fontSize = titleSize + 'px';
        }
    }

    // After styles are applied, update CSS variable with actual box height
    // so top-section padding-top tracks the mini toast height dynamically.
    requestAnimationFrame(function() {
        const currentBox = document.getElementById('fb-rundown-box');
        if (currentBox && currentBox.classList.contains('small-mode') && currentBox.style.display !== 'none') {
            const boxH = currentBox.offsetHeight;
            const extraPx = 16; // gap between box bottom and lyrics top
            document.documentElement.style.setProperty('--rundown-box-height', (boxH + extraPx) + 'px');
        } else {
            // Reset when not in mini mode
            document.documentElement.style.removeProperty('--rundown-box-height');
        }

        // Trigger fitText so lyrics re-adapt to new available space
        if (typeof window.fitText === 'function') {
            window.fitText();
        }
    });
}

function updateRundownLayout() {
    const box = document.getElementById('fb-rundown-box');
    if (!box) return;

    // Use file-level global variables (defined at top of foldback.js around line 110-116)
    const currTxtEl = document.getElementById('curr-txt');
    const currentLyrics = currTxtEl ? currTxtEl.innerText.trim() : '';

    const isVisualContentActive = !!(
        currentLyrics.length > 0 ||
        isScriptureMode ||
        currentPptUrl ||
        (currentBgUrl    && document.getElementById('fb-video')?.style.display !== 'none') ||
        (currentPhotoUrl && document.getElementById('fb-photo')?.style.display !== 'none')
    );

    const isRundownVisible = box.style.display !== 'none';
    const topSecEl = document.getElementById('top-section');

    if (isVisualContentActive) {
        box.classList.remove('fullscreen-mode');
        box.classList.add('small-mode');
        if (topSecEl) {
            if (isRundownVisible) {
                topSecEl.classList.add('shift-down');
            } else {
                topSecEl.classList.remove('shift-down');
                document.documentElement.style.removeProperty('--rundown-box-height');
            }
        }
    } else {
        box.classList.remove('small-mode');
        box.classList.add('fullscreen-mode');
        if (topSecEl) topSecEl.classList.remove('shift-down');
        document.documentElement.style.removeProperty('--rundown-box-height');
    }

    // Re-apply styles after mode switch — double rAF ensures the DOM has repainted
    // so clientWidth/scrollWidth/offsetHeight measurements are accurate.
    if (isRundownVisible) {
        requestAnimationFrame(function() {
            requestAnimationFrame(function() {
                applyRundownStyles();
            });
        });
    }
}

function handleIncomingFoldbackRundown(state) {
    fbRundownState = state;

    const box = document.getElementById('fb-rundown-box');
    if (!box) return;

    if (state.activeIndex === -1 || !state.items || state.items.length === 0) {
        box.style.display = 'none';
        clearInterval(fbRundownInterval);
        fbRundownInterval = null;
        updateRundownLayout();
        return;
    }

    box.style.display = 'flex';

    const titleEl = document.getElementById('fb-rundown-title');
    if (titleEl) {
        titleEl.innerText = state.items[state.activeIndex].name;
    }

    // Determine layout mode, then apply styles
    updateRundownLayout();

    if (state.status === 'running' || state.status === 'overtime') {
        if (!fbRundownInterval) {
            fbRundownInterval = setInterval(tickFoldbackRundown, 1000);
        }
    } else {
        clearInterval(fbRundownInterval);
        fbRundownInterval = null;
    }
    updateFoldbackRundownDisplay();
}

function tickFoldbackRundown() {
    updateFoldbackRundownDisplay();
}

function getFoldbackRundownTimeValues() {
    if (!fbRundownState || fbRundownState.activeIndex === -1 || !fbRundownState.items || fbRundownState.items.length === 0) {
        return { remaining: 0, overtime: 0 };
    }
    const item = fbRundownState.items[fbRundownState.activeIndex];
    const offset = fbRundownState.activeOffset || 0;

    if (item.mode === "duration") {
        const total = item.value * 60;
        if (fbRundownState.status === "running") {
            const elapsed = Math.floor((Date.now() - fbRundownState.startedAt) / 1000);
            const remaining = total - elapsed + offset;
            return { remaining, overtime: remaining < 0 ? -remaining : 0 };
        } else if (fbRundownState.status === "paused") {
            const remaining = fbRundownState.pausedRemaining + offset;
            return { remaining, overtime: remaining < 0 ? -remaining : 0 };
        } else if (fbRundownState.status === "overtime") {
            const elapsedOvertime = Math.floor((Date.now() - fbRundownState.overtimeStartedAt) / 1000);
            return { remaining: -elapsedOvertime, overtime: elapsedOvertime };
        } else {
            return { remaining: total, overtime: 0 };
        }
    } else if (item.mode === "clock") {
        const [h, m] = item.value.split(':').map(Number);
        const targetDate = new Date();
        targetDate.setHours(h, m, 0, 0);

        const now = Date.now();
        let remaining = Math.floor((targetDate.getTime() - now) / 1000) + offset;

        if (fbRundownState.status === "running") {
            return { remaining, overtime: remaining < 0 ? -remaining : 0 };
        } else if (fbRundownState.status === "paused") {
            const remainingPaused = fbRundownState.pausedRemaining + offset;
            return { remaining: remainingPaused, overtime: remainingPaused < 0 ? -remainingPaused : 0 };
        } else if (fbRundownState.status === "overtime") {
            const elapsedOvertime = Math.floor((Date.now() - fbRundownState.overtimeStartedAt) / 1000);
            return { remaining: -elapsedOvertime, overtime: elapsedOvertime };
        } else {
            return { remaining, overtime: 0 };
        }
    }
    return { remaining: 0, overtime: 0 };
}

function updateFoldbackRundownDisplay() {
    const timerEl = document.getElementById("fb-rundown-timer");
    const box = document.getElementById("fb-rundown-box");
    if (!timerEl || !fbRundownState || !box) return;

    const { remaining, overtime } = getFoldbackRundownTimeValues();
    const isOvertime = fbRundownState.status === "overtime" || remaining < 0;

    if (isOvertime) {
        const secs = overtime;
        const h = Math.floor(secs / 3600).toString().padStart(2, '0');
        const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        timerEl.innerText = `+${h}:${m}:${s}`;

        const flashEnabled = fbRundownState.overtimeFlash !== false;
        const flashColor = fbRundownState.overtimeColor || "#ff4081";
        const flashSpeed = fbRundownState.overtimeSpeed !== undefined ? fbRundownState.overtimeSpeed : 1.0;

        timerEl.style.color = flashColor;

        if (flashEnabled) {
            box.classList.add("flash");
            box.style.setProperty('--flash-bg', hexToRgba(flashColor, 0.9));
            box.style.animationDuration = `${flashSpeed}s`;
        } else {
            box.classList.remove("flash");
            box.style.removeProperty('--flash-bg');
            box.style.animationDuration = "";
        }
    } else {
        const secs = Math.max(0, remaining);
        const h = Math.floor(secs / 3600).toString().padStart(2, '0');
        const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0');
        const s = (secs % 60).toString().padStart(2, '0');
        timerEl.innerText = `${h}:${m}:${s}`;
        timerEl.style.color = "#00e5ff";
        
        box.classList.remove("flash");
        box.style.removeProperty('--flash-bg');
        box.style.animationDuration = "";
    }
}

// Jalankan koneksi pertama kali saat layar dibuka
connectWebSocket();
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") applyFoldbackSnapshotIfMatch();
});
// ==========================================
