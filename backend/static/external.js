/* ==========================================================================
   ShowLyrics External Sources & Pure Receiver Logic
   Dual-Platform: WIN VER & MAC VER
   ========================================================================== */

(function () {
    "use strict";

    // --- State Variables ---
    let currentExtSource = "media-sender"; // 'media-sender' or 'ppt-remote'
    let activeExternalSender = null;
    let externalSenderWs = null;
    let externalReconnectTimer = null;
    let externalReconnectAttempts = 0;
    let isExternalFtbActive = false;
    let lastActiveMediaPayload = null;
    let discoveredExternalSenders = [];
    let discoveredPptSenders = [];
    // FTB pause/resume bookkeeping: remember which master players were playing so FTB OFF resumes at the exact timestamp
    let ftbAppliedState = false;
    let ftbResumeState = { bg: false, sfx: false };
    // Dedup for the multiple WS messages one Take Live generates (xxx_live + media_stream_event)
    let lastLiveKey = "";
    let lastLiveAt = 0;
    let takePromptTimer = null;
    let dropResumeState = null;

    // --- Audio Optimization, Fade Protection & 3-Tier Adaptive Sync State ---
    let bgFadeTimer = null;
    let sfxFadeTimer = null;
    let bgTargetVolume = 1.0;
    let sfxTargetVolume = 1.0;
    let bgAudioSessionId = 0;
    let sfxAudioSessionId = 0;
    const lastHardSeekAt = { bg: 0, sfx: 0 };
    let lastRemoteVideoSyncSentAt = 0;
    let localBgVideoPos = { currentTime: 0, paused: true, playbackRate: 1.0, updatedAt: 0 };
    let syncBroadcastChannel = null;

    function hasActiveAudioSrc(audioEl) {
        if (!audioEl) return false;
        const attr = audioEl.getAttribute ? audioEl.getAttribute("src") : "";
        if (!attr || attr.trim() === "") return false;
        const src = audioEl.currentSrc || audioEl.src || "";
        if (!src || src === window.location.href || src.endsWith("/control")) return false;
        return true;
    }

    function clearBgFadeTimer() {
        if (bgFadeTimer) {
            clearInterval(bgFadeTimer);
            bgFadeTimer = null;
        }
    }

    function clearSfxFadeTimer() {
        if (sfxFadeTimer) {
            clearInterval(sfxFadeTimer);
            sfxFadeTimer = null;
        }
    }

    function getLocalDefaultVolume(channel) {
        try {
            if (typeof window.getEffectiveLocalVolume === "function") {
                return window.getEffectiveLocalVolume(channel === "bg" ? "video" : "audio");
            }
            const fallback = channel === "bg" ? window._localBgVolume : window._localSfxVolume;
            if (Number.isFinite(fallback)) return Math.max(0, Math.min(1, fallback));
        } catch (_) { }
        return 1.0;
    }

    function restoreLocalAudioDefaults(audioEl, channel) {
        if (!audioEl) return;
        try { audioEl.playbackRate = 1.0; } catch (_) { }
        audioEl.muted = false;
        audioEl.volume = getLocalDefaultVolume(channel);
    }

    window.cancelExternalAudioFade = function (channel) {
        if (!channel || channel === "bg" || channel === "video") {
            bgAudioSessionId++;
            clearBgFadeTimer();
        }
        if (!channel || channel === "sfx" || channel === "audio") {
            sfxAudioSessionId++;
            clearSfxFadeTimer();
        }
    };

    function ensurePitchPreservation(audioEl) {
        if (!audioEl) return;
        try {
            if ("preservesPitch" in audioEl) audioEl.preservesPitch = true;
            else if ("webkitPreservesPitch" in audioEl) audioEl.webkitPreservesPitch = true;
            else if ("mozPreservesPitch" in audioEl) audioEl.mozPreservesPitch = true;
        } catch (_) { }
    }

    function startSmoothFadeIn(audioEl, targetVol, key, durationMs) {
        if (!audioEl) return;
        const clampedTarget = Math.max(0, Math.min(1, Number.isFinite(targetVol) ? targetVol : 1));
        if (key === "bg") {
            clearBgFadeTimer();
            bgTargetVolume = clampedTarget;
        } else {
            clearSfxFadeTimer();
            sfxTargetVolume = clampedTarget;
        }
        const totalSteps = Math.max(4, Math.round((durationMs || 180) / 20));
        const startVol = Math.max(0, Math.min(clampedTarget, Number(audioEl.volume) || 0));
        const step = (clampedTarget - startVol) / totalSteps;
        if (step <= 0.001) {
            audioEl.volume = clampedTarget;
            return;
        }
        let cur = startVol;
        const timer = setInterval(() => {
            cur += step;
            if (cur >= clampedTarget) {
                audioEl.volume = clampedTarget;
                if (key === "bg") clearBgFadeTimer();
                else clearSfxFadeTimer();
            } else {
                audioEl.volume = cur;
            }
        }, 20);
        if (key === "bg") bgFadeTimer = timer;
        else sfxFadeTimer = timer;
    }

    function attachNonDestructiveStallRecovery(audioEl, key) {
        if (!audioEl || audioEl._stallRecoveryAttached) return;
        audioEl._stallRecoveryAttached = true;
        ensurePitchPreservation(audioEl);

        const onStallOrWait = () => {
            // Reset rate to 1.0 while refilling buffer so catch-up rate does not starve decoder
            try {
                if (audioEl.playbackRate !== 1.0) audioEl.playbackRate = 1.0;
            } catch (_) { }
        };

        const onBufferReady = () => {
            try {
                const flags = window.activeSenderMedia || {};
                const ownsChannel = (key === "bg" && flags.video) || (key === "sfx" && flags.audio);
                if (!ownsChannel || isExternalFtbActive) return;
                if (audioEl._intendedPlaying && audioEl.paused && hasActiveAudioSrc(audioEl)) {
                    audioEl.play().catch(() => { });
                }
            } catch (_) { }
        };

        audioEl.addEventListener("waiting", onStallOrWait);
        audioEl.addEventListener("stalled", onStallOrWait);
        audioEl.addEventListener("canplay", onBufferReady);
        audioEl.addEventListener("canplaythrough", onBufferReady);
    }

    /**
     * 3-Tier Adaptive Audio Sync (Decisions Q1, Q2, Q10):
     * - Tier 1 (< 0.35s): Ignore micro-drift (never flush PCM buffer); restore playbackRate to 1.0 when < 0.12s.
     * - Tier 2 (0.35s - 1.5s): Smooth catch-up / slow-down via playbackRate (0.975x - 1.025x) with pitch preservation.
     * - Tier 3 (> 1.5s or manual seek): Hard-seek with anti-pop micro-fade and 2000ms cooldown.
     */
    function applyAdaptiveAudioSync(audioEl, rawTargetTime, options) {
        if (!hasActiveAudioSrc(audioEl)) return;
        let targetTime = Number(rawTargetTime);
        if (!Number.isFinite(targetTime) || targetTime < 0) return;

        const opts = options || {};
        const key = opts.key || (audioEl === window.masterBgAudio ? "bg" : "sfx");
        const isForce = Boolean(opts.force);

        if (audioEl.paused && !isForce) return;

        ensurePitchPreservation(audioEl);

        const dur = Number(audioEl.duration);
        const hasValidDur = Number.isFinite(dur) && dur > 1.0;
        if (hasValidDur && audioEl.loop) {
            targetTime = targetTime % dur;
        }

        const currTime = Number(audioEl.currentTime) || 0;
        let drift = currTime - targetTime;

        // Guard against false drift spikes right at loop wrap-around boundary (e.g. 29.9s vs 0.1s)
        if (hasValidDur && audioEl.loop && !isForce) {
            if (drift > dur * 0.65) {
                drift -= dur;
            } else if (drift < -dur * 0.65) {
                drift += dur;
            }
        }

        const absDrift = Math.abs(drift);
        const microIgnore = opts.microIgnore || 0.35;
        const mediumLimit = opts.mediumLimit || 1.5;
        const hardSeekLimit = opts.hardSeekLimit || 1.5;

        // Tier 1: Micro-drift -> do not touch currentTime, restore normal rate when aligned
        if (!isForce && absDrift < microIgnore) {
            if (absDrift < 0.12 && audioEl.playbackRate !== 1.0) {
                try { audioEl.playbackRate = 1.0; } catch (_) { }
            }
            return;
        }

        // Tier 2: Medium drift -> smooth playbackRate catch-up without flushing decoded audio buffer
        if (!isForce && absDrift <= mediumLimit) {
            if (audioEl.readyState < 3) {
                if (audioEl.playbackRate !== 1.0) {
                    try { audioEl.playbackRate = 1.0; } catch (_) { }
                }
                return;
            }
            let newRate = 1.0;
            if (drift < 0) {
                // Audio is behind target -> gently speed up
                newRate = absDrift > 0.75 ? 1.028 : 1.016;
            } else if (drift > 0.12) {
                // Audio is ahead of target -> gently slow down
                newRate = absDrift > 0.75 ? 0.972 : 0.984;
            }
            if (Math.abs((audioEl.playbackRate || 1.0) - newRate) > 0.003) {
                try { audioEl.playbackRate = newRate; } catch (_) { }
            }
            return;
        }

        // Tier 3: Large drift (> 1.5s) or explicit manual seek -> Anti-pop seek with cooldown
        if (!isForce && absDrift <= hardSeekLimit) return;
        const now = performance.now();
        if (!isForce) {
            if (audioEl.readyState < 2) return;
            if (now - (lastHardSeekAt[key] || 0) < 2000) return;
        }
        lastHardSeekAt[key] = now;

        try {
            if (audioEl.playbackRate !== 1.0) audioEl.playbackRate = 1.0;
            const targetVol = key === "bg" ? bgTargetVolume : sfxTargetVolume;
            if (!audioEl.muted && targetVol > 0.05 && !audioEl.paused) {
                audioEl.volume = Math.max(0, targetVol * 0.25);
                audioEl.currentTime = Math.max(0, targetTime);
                startSmoothFadeIn(audioEl, targetVol, key, 80);
            } else {
                audioEl.currentTime = Math.max(0, targetTime);
            }
        } catch (_) { }
    }

    // Dual-Layer Video Lip-Sync via BroadcastChannel (Decision Q2)
    try {
        syncBroadcastChannel = new BroadcastChannel("showlyrics_sync_channel");
        syncBroadcastChannel.onmessage = function (ev) {
            const msg = ev && ev.data;
            if (!msg || msg.type !== "bg_video_pos" || !Number.isFinite(msg.currentTime)) return;
            localBgVideoPos = {
                currentTime: Number(msg.currentTime),
                paused: Boolean(msg.paused),
                playbackRate: Number(msg.playbackRate) || 1.0,
                updatedAt: performance.now()
            };
            if (
                window.activeSenderMedia &&
                window.activeSenderMedia.video &&
                !isExternalFtbActive &&
                window.masterBgAudio &&
                !window.masterBgAudio.paused &&
                !localBgVideoPos.paused
            ) {
                applyAdaptiveAudioSync(window.masterBgAudio, localBgVideoPos.currentTime, {
                    key: "bg",
                    force: false,
                    microIgnore: 0.22,
                    mediumLimit: 1.5,
                    hardSeekLimit: 1.5
                });
            }
        };
    } catch (_) { }

    // --- UI Helpers ---
    function updateTabStatus(status) {
        // status: 'connected' | 'interrupted' | 'disconnected' | 'ftb'
        const catBtn = document.getElementById("media-cat-btn-external");
        const dotMS = document.getElementById("ext-ms-status-dot");
        if (!catBtn) return;

        catBtn.classList.remove("connected", "interrupted", "ftb-active");
        if (dotMS) {
            dotMS.className = "ext-status-dot";
            dotMS.style.backgroundColor = "";
        }

        if (status === "connected") {
            catBtn.classList.add("connected");
            catBtn.innerHTML = `🌐 EXTERNAL`;
            catBtn.title = "Media Sender: Connected";
            if (dotMS) dotMS.classList.add("online");
        } else if (status === "ftb") {
            catBtn.classList.add("connected", "ftb-active");
            catBtn.innerHTML = `🌐 EXTERNAL <span class="ext-ftb-tag" title="FTB aktif">FTB</span>`;
            catBtn.title = "Media Sender: FTB Active (Output Black)";
            if (dotMS) {
                dotMS.classList.add("online");
                dotMS.style.backgroundColor = "#ef4444";
            }
        } else if (status === "interrupted") {
            catBtn.classList.add("connected", "interrupted");
            catBtn.innerHTML = `🌐 EXTERNAL`;
            catBtn.title = "Media Sender: Connection Interrupted";
            if (dotMS) dotMS.classList.add("interrupted");
        } else {
            catBtn.innerHTML = `🌐 EXTERNAL`;
            catBtn.title = "Media Sender: Disconnected";
        }
    }

    function resolveSenderUrl(rawUrl) {
        if (!rawUrl) return "";
        if (!activeExternalSender || !activeExternalSender.ip) return rawUrl;
        try {
            const u = new URL(rawUrl, window.location.origin);
            u.hostname = activeExternalSender.ip;
            if (!u.port) {
                u.port = activeExternalSender.ws_port || "18889";
            }
            if (activeExternalSender.token && !u.searchParams.has("auth")) {
                u.searchParams.set("auth", activeExternalSender.token);
            }
            return u.href;
        } catch (_) {
            let res = rawUrl.replace(/127\.0\.0\.1|localhost|0\.0\.0\.0/, activeExternalSender.ip);
            if (activeExternalSender.token && !res.includes("auth=")) {
                res += (res.includes("?") ? "&" : "?") + "auth=" + encodeURIComponent(activeExternalSender.token);
            }
            return res;
        }
    }

    function getMainWs() {
        if (typeof window.ws !== "undefined" && window.ws && window.ws.readyState === WebSocket.OPEN) {
            return window.ws;
        }
        return null;
    }

    const pendingMainWsMessages = [];
    function sendToMainWs(msgObj) {
        const socket = getMainWs();
        if (socket) {
            while (pendingMainWsMessages.length > 0) {
                const queued = pendingMainWsMessages.shift();
                try {
                    socket.send(JSON.stringify(queued));
                } catch (e) {
                    console.warn("[EXTERNAL] Failed to flush queued message:", e);
                }
            }
            try {
                socket.send(JSON.stringify(msgObj));
            } catch (e) {
                console.warn("[EXTERNAL] Failed to send message to main WS:", e);
            }
        } else {
            console.warn("[EXTERNAL] Main WS not open yet. Queuing message:", msgObj.action);
            pendingMainWsMessages.push(msgObj);
            const retryInterval = setInterval(() => {
                const s = getMainWs();
                if (s) {
                    clearInterval(retryInterval);
                    while (pendingMainWsMessages.length > 0) {
                        const queued = pendingMainWsMessages.shift();
                        try {
                            s.send(JSON.stringify(queued));
                        } catch (_) {}
                    }
                }
            }, 300);
            setTimeout(() => clearInterval(retryInterval), 5000);
        }
    }

    // --- Tab / View Switching ---
    window.selectExternalSource = function (sourceKey) {
        currentExtSource = sourceKey;

        const itemMS = document.getElementById("ext-source-media-sender");
        const itemPPT = document.getElementById("ext-source-ppt-remote");
        const viewMS = document.getElementById("ext-view-media-sender");
        const viewPPT = document.getElementById("ext-view-ppt-remote");

        if (sourceKey === "media-sender") {
            if (itemMS) itemMS.classList.add("active");
            if (itemPPT) itemPPT.classList.remove("active");
            if (viewMS) viewMS.style.display = "flex";
            if (viewPPT) viewPPT.style.display = "none";
            refreshExternalSenders();
        } else {
            if (itemMS) itemMS.classList.remove("active");
            if (itemPPT) itemPPT.classList.add("active");
            if (viewMS) viewMS.style.display = "none";
            if (viewPPT) viewPPT.style.display = "flex";
            refreshPPTSenders();
        }
    };

    // --- Media Sender: Discovery & Polling ---
    window.refreshExternalSenders = async function () {
        const listEl = document.getElementById("ext-sender-device-list");
        if (!listEl) return;

        if (!activeExternalSender) {
            listEl.innerHTML = `<div class="ext-empty-placeholder">Scanning local network for ShowLyrics Media Senders...</div>`;
        }

        try {
            const res = await fetch("/api/senders/list");
            const senders = await res.json();
            discoveredExternalSenders = Array.isArray(senders) ? senders : [];
            renderExternalSenderList();
        } catch (e) {
            console.warn("[EXTERNAL] Failed to fetch senders:", e);
            if (!activeExternalSender) {
                listEl.innerHTML = `<div class="ext-empty-placeholder" style="color: #ef4444;">Failed to scan network. Check connection.</div>`;
            }
        }
    };

    function renderExternalSenderList() {
        const listEl = document.getElementById("ext-sender-device-list");
        if (!listEl) return;

        if (discoveredExternalSenders.length === 0 && !activeExternalSender) {
            listEl.innerHTML = `<div class="ext-empty-placeholder">No sender devices found</div>`;
            return;
        }

        listEl.innerHTML = "";

        // Combine active connected sender with discovered senders if not present
        let displayList = [...discoveredExternalSenders];
        if (activeExternalSender && !displayList.some(s => s.ip === activeExternalSender.ip)) {
            displayList.unshift(activeExternalSender);
        }

        displayList.forEach(sender => {
            const isConnected = activeExternalSender && activeExternalSender.ip === sender.ip;
            const card = document.createElement("div");
            card.className = `ext-device-card ${isConnected ? "connected" : ""}`;

            let liveBadge = "";
            if (isConnected) {
                if (isExternalFtbActive) {
                    liveBadge = `<span class="ext-meta-badge ftb" title="FTB aktif (output blackout)" style="background:#ef4444; color:#fff; font-weight:bold; font-size:9px; padding:1px 6px; border-radius:999px;">FTB</span>`;
                } else if (lastActiveMediaPayload && lastActiveMediaPayload.name) {
                    const icon = lastActiveMediaPayload.media_type === "photo" ? "🖼️" : (lastActiveMediaPayload.media_type === "audio" ? "🎵" : "🎬");
                    liveBadge = `<span class="ext-meta-badge live">${icon} LIVE: ${lastActiveMediaPayload.name}</span>`;
                } else {
                    liveBadge = `<span class="ext-meta-badge online">● STANDBY</span>`;
                }
            } else {
                liveBadge = `<span class="ext-meta-badge online">● Online</span>`;
            }

            card.innerHTML = `
                <div class="ext-card-left">
                    <div class="ext-card-avatar">📡</div>
                    <div class="ext-card-info">
                        <div class="ext-card-name">${sender.device_name || "Media Sender"}</div>
                        <div class="ext-card-meta">
                            <span>🌐 ${sender.ip}:${sender.ws_port || 18889}</span>
                            ${liveBadge}
                        </div>
                    </div>
                </div>
                <div class="ext-card-actions">
                    ${isConnected ? `
                        <button class="btn-ext-disconnect" onclick="disconnectExternalSender()">DISCONNECT</button>
                    ` : `
                        <button class="btn-ext-connect" onclick="connectToExternalSender(${JSON.stringify(sender).replace(/"/g, '&quot;')})">CONNECT</button>
                    `}
                </div>
            `;
            listEl.appendChild(card);
        });
    }

    // --- Connect / Disconnect Handlers ---
    window.connectToExternalSender = async function (sender) {
        if (typeof showToast === "function") {
            showToast(`Connecting to ${sender.device_name || sender.ip}...`, "loading");
        }

        try {
            const res = await fetch("/api/senders/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ip: sender.ip, port: sender.ws_port || 18889 })
            });
            const data = await res.json();

            if (data.status === "success" || data.sender) {
                const verifiedSender = data.sender || sender;
                openExternalWebSocket(verifiedSender);
            } else {
                if (typeof showToast === "function") showToast(data.message || "Connection refused", "error", 3000);
            }
        } catch (e) {
            console.error("[EXTERNAL] Connect error:", e);
            if (typeof showToast === "function") showToast("Failed to connect to sender", "error", 3000);
        }
    };

    window.connectManualExternalSender = async function () {
        const input = document.getElementById("manual-ext-sender-ip");
        const raw = input ? input.value.trim() : "";
        if (!raw) {
            if (typeof showToast === "function") showToast("Please enter an IP address", "error", 2000);
            return;
        }

        let ip = raw;
        let port = 18889;
        if (raw.includes(":")) {
            const parts = raw.split(":");
            ip = parts[0];
            port = parseInt(parts[1], 10) || 18889;
        }

        await connectToExternalSender({ ip: ip, ws_port: port, device_name: `Sender (${ip})` });
        if (input) input.value = "";
    };

    window.disconnectExternalSender = function () {
        if (externalReconnectTimer) {
            clearTimeout(externalReconnectTimer);
            externalReconnectTimer = null;
        }

        if (externalSenderWs) {
            try {
                externalSenderWs.close();
            } catch (_) { }
            externalSenderWs = null;
        }

        // Clean up ONLY audio & visual channels currently owned by Media Sender
        const ownedVideo = Boolean(window.activeSenderMedia && window.activeSenderMedia.video);
        const ownedPhoto = Boolean(window.activeSenderMedia && window.activeSenderMedia.photo);
        const ownedAudio = Boolean(window.activeSenderMedia && window.activeSenderMedia.audio);
        if (window.activeSenderMedia) {
            window.activeSenderMedia.video = false;
            window.activeSenderMedia.photo = false;
            window.activeSenderMedia.audio = false;
        }
        if (ownedVideo) {
            stopMasterBgAudio();
            sendToMainWs({
                action: "update_background",
                payload: { url: "", source: "remote_sender" }
            });
        }
        if (ownedPhoto) {
            sendToMainWs({
                action: "update_photo",
                payload: { url: "", source: "remote_sender" }
            });
        }
        if (ownedAudio) {
            stopMasterSfxAudio();
            sendToMainWs({
                action: "update_audio",
                payload: { url: "", source: "remote_sender" }
            });
        }

        const disconnectedIp = activeExternalSender ? activeExternalSender.ip : null;
        activeExternalSender = null;
        if (isExternalFtbActive) {
            isExternalFtbActive = false;
            sendToMainWs({
                action: "bg_control",
                payload: { target: "video", command: "ftb", value: false, source: "remote_sender" }
            });
            sendToMainWs({
                action: "ftb",
                payload: { enabled: false, value: false, active: false, source: "remote_sender" }
            });
        }
        lastActiveMediaPayload = null;
        externalReconnectAttempts = 0;

        try {
            localStorage.removeItem("showlyrics_last_media_sender");
        } catch (_) {}

        updateTabStatus("disconnected");
        renderExternalSenderList();

        if (disconnectedIp) {
            fetch("/api/senders/disconnect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ip: disconnectedIp })
            }).catch(() => { });
        }

        if (typeof showToast === "function") {
            showToast("Disconnected from Media Sender", "info", 2000);
        }
    };

    // --- WebSocket Stream Pipeline ---
    function openExternalWebSocket(sender) {
        if (externalSenderWs) {
            try { externalSenderWs.close(); } catch (_) { }
            externalSenderWs = null;
        }

        const tokenParam = sender.token ? `?auth=${sender.token}` : "";
        const wsUrl = `ws://${sender.ip}:${sender.ws_port || 18889}/ws${tokenParam}`;

        console.log(`[EXTERNAL] Opening WebSocket to ${wsUrl}`);
        const ws = new WebSocket(wsUrl);

        ws.onopen = function () {
            console.log(`[EXTERNAL] WebSocket connected to ${sender.device_name || sender.ip}`);
            activeExternalSender = sender;
            externalSenderWs = ws;
            externalReconnectAttempts = 0;
            try {
                localStorage.setItem("showlyrics_last_media_sender", JSON.stringify({
                    ip: sender.ip,
                    ws_port: sender.ws_port || 18889,
                    device_name: sender.device_name || sender.ip,
                    token: sender.token || ""
                }));
            } catch (_) {}
            updateTabStatus(isExternalFtbActive ? "ftb" : "connected");
            // Resume what was playing before the drop (exact position), unless FTB is holding the output
            if (dropResumeState && !isExternalFtbActive && senderOwnsOutput()) {
                if (dropResumeState.bg) resumeMasterBgAudio();
                if (dropResumeState.sfx) resumeMasterSfxAudio();
            }
            dropResumeState = null;
            renderExternalSenderList();
            if (typeof showToast === "function") {
                showToast(`Connected to ${sender.device_name || sender.ip}`, "success", 2000);
            }
        };

        ws.onmessage = function (event) {
            try {
                const msg = JSON.parse(event.data);
                handleExternalStreamEvent(msg);
            } catch (err) {
                console.warn("[EXTERNAL] Failed to parse message:", event.data, err);
            }
        };

        ws.onerror = function (err) {
            console.error("[EXTERNAL] WebSocket error:", err);
        };

        ws.onclose = function () {
            console.warn(`[EXTERNAL] WebSocket closed from ${sender.ip}`);
            if (activeExternalSender && activeExternalSender.ip === sender.ip) {
                handleConnectionDrop();
            }
        };
    }

    function handleConnectionDrop() {
        // Failover policy: Freeze on last frame, do not instantly clear to black!
        console.log("[EXTERNAL] WiFi drop detected. Freezing on last frame and attempting reconnect...");
        const _b = window.masterBgAudio, _s = window.masterSfxAudio;
        if (!dropResumeState) {
            dropResumeState = {
                bg: Boolean(window.activeSenderMedia && window.activeSenderMedia.video && _b && !_b.paused && hasActiveAudioSrc(_b)),
                sfx: Boolean(window.activeSenderMedia && window.activeSenderMedia.audio && _s && !_s.paused && hasActiveAudioSrc(_s))
            };
        }
        if (senderOwnsOutput()) {
            pauseMasterBgAudio();
            pauseMasterSfxAudio();
        }
        updateTabStatus("interrupted");

        if (externalReconnectAttempts < 3) {
            externalReconnectAttempts++;
            if (typeof showToast === "function") {
                showToast(`Connection interrupted. Reconnecting (${externalReconnectAttempts}/3)...`, "warning", 2000);
            }
            externalReconnectTimer = setTimeout(() => {
                if (activeExternalSender) {
                    openExternalWebSocket(activeExternalSender);
                }
            }, 2000);
        } else {
            // Reconnect timeout exceeded (5+ seconds) -> Fade out to black cleanly
            console.log("[EXTERNAL] Reconnect attempts exhausted. Cleaning up stream to black.");
            if (typeof showToast === "function") {
                showToast("Connection to Media Sender lost", "error", 3000);
            }
            disconnectExternalSender();
        }
    }

    // --- Media Stream Event Dispatcher ---
    function handleExternalStreamEvent(msg) {
        const type = msg.type || msg.action;
        const mediaType = msg.media_type;
        const action = msg.action;
        const payload = msg.payload || {};

        console.log(`[EXTERNAL EVENT] type=${type}, mediaType=${mediaType}, action=${action}`, payload);

        // FTB / Blackout Event
        if (action === "ftb" || type === "ftb") {
            const enabled = payload.enabled ?? (payload.value !== undefined ? payload.value : (payload.active !== undefined ? payload.active : (msg.value ?? msg.enabled)));
            handleFtbToggle(Boolean(enabled));
            return;
        }

        // Control Events (Play, Pause, Seek, Volume, Sync Time)
        // Must be evaluated BEFORE live take checks to prevent sync_time from triggering live take
        if (action === "control" || type === "media_control" || action === "control_video" || type === "video_control" || action === "control_audio" || type === "audio_control" || action === "control_photo" || type === "photo_control") {
            if (payload.command === "ftb" || msg.command === "ftb") {
                const enabled = payload.value !== undefined ? payload.value : (payload.enabled !== undefined ? payload.enabled : (msg.value ?? msg.enabled));
                handleFtbToggle(Boolean(enabled));
                return;
            }
            const controlTarget = (action === "control_video" || type === "video_control" || mediaType === "video") ? "video"
                : (action === "control_audio" || type === "audio_control" || mediaType === "audio") ? "audio"
                : (action === "control_photo" || type === "photo_control" || mediaType === "photo") ? "photo"
                : "";
            handleMediaControl(payload, controlTarget);
            return;
        }

        // Stop Event — only stop channels actively owned by Media Sender
        if (action === "stop") {
            const ownedVideo = Boolean(window.activeSenderMedia && window.activeSenderMedia.video);
            const ownedPhoto = Boolean(window.activeSenderMedia && window.activeSenderMedia.photo);
            const ownedAudio = Boolean(window.activeSenderMedia && window.activeSenderMedia.audio);
            if (window.activeSenderMedia) {
                window.activeSenderMedia.video = false;
                window.activeSenderMedia.photo = false;
                window.activeSenderMedia.audio = false;
            }
            if (ownedVideo) {
                stopMasterBgAudio();
                sendToMainWs({
                    action: "update_background",
                    payload: { url: "", source: "remote_sender" }
                });
            }
            if (ownedPhoto) {
                sendToMainWs({
                    action: "update_photo",
                    payload: { url: "", source: "remote_sender" }
                });
            }
            if (ownedAudio) {
                stopMasterSfxAudio();
                sendToMainWs({
                    action: "update_audio",
                    payload: { url: "", source: "remote_sender" }
                });
            }
            ftbResumeState = { bg: false, sfx: false };
            lastLiveKey = "";
            lastActiveMediaPayload = null;
            renderExternalSenderList();
            return;
        }

        // Live Stream Events
        const isLiveAction = (action === "live" || action === "take_video" || action === "take_photo" || action === "take_audio" || action === "take_live");
        const isLiveType = (type === "video_live" || type === "photo_live" || type === "audio_live" || type === "take_live");
        const isLiveStreamEvent = (type === "media_stream_event" && (action === "live" || !action));

        if (isLiveAction || isLiveType || isLiveStreamEvent) {
            // One Take Live fans out into several WS messages (xxx_live, media_stream_event, ...). Process only once.
            const _kind = (mediaType === "video" || type === "video_live" || action === "take_video" || (!mediaType && payload.video)) ? "video"
                : (mediaType === "photo" || type === "photo_live" || action === "take_photo" || (!mediaType && payload.photo)) ? "photo"
                : (mediaType === "audio" || type === "audio_live" || action === "take_audio" || (!mediaType && payload.audio)) ? "audio" : "other";
            const _id = payload.id || (payload.video && payload.video.id) || (payload.photo && payload.photo.id) || (payload.audio && payload.audio.id) || payload.url || "";
            const _key = `${_kind}:${_id}`;
            const _now = Date.now();
            if (_kind !== "other" && _key === lastLiveKey && (_now - lastLiveAt) < 600) {
                return;
            }
            lastLiveKey = _key;
            lastLiveAt = _now;
            // FTB remains active if already ON, staging new media silently in the background

            if (mediaType === "video" || type === "video_live" || action === "take_video" || (!mediaType && payload.video)) {
                const rawUrl = payload.stream_url || payload.url || payload.playback_url || (payload.video ? `${payload.baseUrl || ''}/api/videos/file/${payload.video.id}` : "");
                const vName = payload.name || (payload.video && payload.video.name) || payload.title || "Video";
                const vidData = {
                    ...(payload.video || {}),
                    ...(payload.controls || {}),
                    ...payload,
                    name: vName,
                    url: rawUrl
                };
                handleLiveVideo(vidData);
            } else if (mediaType === "photo" || type === "photo_live" || action === "take_photo" || (!mediaType && payload.photo)) {
                const pData = payload.photo ? { ...payload.photo, url: payload.baseUrl ? `${payload.baseUrl}/api/photos/file/${payload.photo.id}` : payload.url, keep_audio: payload.keep_audio } : payload;
                handleLivePhoto(pData);
            } else if (mediaType === "audio" || type === "audio_live" || action === "take_audio" || (!mediaType && payload.audio)) {
                const aData = payload.audio ? { ...payload.controls, ...payload.audio, url: payload.baseUrl ? `${payload.baseUrl}/api/audio/file/${payload.audio.id}` : payload.url } : payload;
                handleLiveAudio(aData);
            } else if (payload.url && payload.url.includes("/api/videos/")) {
                handleLiveVideo(payload);
            } else if (payload.url && payload.url.includes("/api/photos/")) {
                handleLivePhoto(payload);
            } else if (payload.url && payload.url.includes("/api/audio/")) {
                handleLiveAudio(payload);
            }
            renderExternalSenderList();
            return;
        }
    }

    // --- Local vs Remote Priority & Prompt Banner System ---
    function dismissAllLocalMediaPlayers() {
        try {
            // closeMediaPlayer() throws when legacy #floating-media-player is absent; isolate so the cleanup below always runs
            if (typeof window.closeMediaPlayer === "function") {
                try { window.closeMediaPlayer(); } catch (_) { }
            } else if (typeof closeMediaPlayer === "function") {
                try { closeMediaPlayer(); } catch (_) { }
            }
            if (window.activeLibraryPlayers) {
                window.activeLibraryPlayers.video = false;
                window.activeLibraryPlayers.audio = false;
                window.activeLibraryPlayers.photo = false;
            }
            const fp = document.getElementById('floating-media-player');
            if (fp) fp.style.display = 'none';
            document.querySelectorAll('.fp-dynamic').forEach(el => el.remove());
            // Local scheduled/"Show Now" media is replaced by the Sender: release its live flag so it is not seen as local anymore
            if (window._liveMediaActive && typeof checkAndClearLiveMediaController === "function") {
                checkAndClearLiveMediaController(true);
            }
            window._liveMediaActive = false;
            window.currentSongHasLocalBg = false;
        } catch (e) {
            console.warn("[EXTERNAL] dismissAllLocalMediaPlayers error:", e);
        }
    }

    function cleanResetAudioPipeline(target) {
        try {
            // Unlock AudioContext if suspended
            if (window.AudioContext || window.webkitAudioContext) {
                const ctx = window._sharedAudioContext || (window._sharedAudioContext = new (window.AudioContext || window.webkitAudioContext)());
                if (ctx && ctx.state === 'suspended') {
                    ctx.resume().catch(() => {});
                }
            }
            if (target === "audio" && window.masterSfxAudio) {
                window.masterSfxAudio.muted = false;
                if (window._audioOutputDeviceId && typeof window.masterSfxAudio.setSinkId === 'function') {
                    window.masterSfxAudio.setSinkId(window._audioOutputDeviceId).catch(() => {});
                }
            }
            if (target === "video" && window.masterBgAudio) {
                window.masterBgAudio.muted = false;
                if (window._audioOutputDeviceId && typeof window.masterBgAudio.setSinkId === 'function') {
                    window.masterBgAudio.setSinkId(window._audioOutputDeviceId).catch(() => {});
                }
            }
        } catch (e) {
            console.warn("[AUDIO PIPELINE] cleanResetAudioPipeline warning:", e);
        }
    }

    function isLocalMediaCurrentlyActive() {
        // NOTE: stale activeSenderMedia flags must NOT short-circuit this check. Flags are cleared by
        // markLocalMediaTookOver() whenever local media starts, so the checks below reflect the real owner.
        const flags = window.activeSenderMedia || {};

        const hasLocalBg = Boolean(window.currentSongHasLocalBg);
        const hasLocalLibraryPlayer = Boolean(
            window.activeLibraryPlayers &&
            (window.activeLibraryPlayers.video || window.activeLibraryPlayers.photo || window.activeLibraryPlayers.audio)
        );
        const hasScheduledMedia = Boolean(window._liveMediaActive && window.activeMediaScheduledItem);
        const fpEl = document.getElementById('floating-media-player');
        const hasFloatingPlayer = Boolean(
            (fpEl && window.getComputedStyle(fpEl).display !== 'none') ||
            document.querySelector('.fp-dynamic')
        );
        // Local audio that is genuinely playing (slide audio / library audio) and not owned by the Sender
        const sfx = window.masterSfxAudio;
        const hasLocalAudio = Boolean(sfx && !sfx.paused && hasActiveAudioSrc(sfx) && !flags.audio);
        const bg = window.masterBgAudio;
        const hasLocalVideoSound = Boolean(bg && !bg.paused && hasActiveAudioSrc(bg) && !flags.video);

        return Boolean(hasLocalBg || hasLocalLibraryPlayer || hasScheduledMedia || hasFloatingPlayer || hasLocalAudio || hasLocalVideoSound);
    }

    // Called by script.js whenever LOCAL media starts: the operator owns the output now, so any previous
    // Media Sender ownership (and its pending toast / FTB blackout) must be released.
    window.markLocalMediaTookOver = function (category) {
        try {
            const f = window.activeSenderMedia = window.activeSenderMedia || { video: false, photo: false, audio: false };
            bgAudioSessionId++;
            sfxAudioSessionId++;
            clearBgFadeTimer();
            clearSfxFadeTimer();
            if (category === "video") {
                // Local video replaces everything from the Sender (mutual exclusive with audio/photo)
                if (f.video) stopMasterBgAudio();
                if (f.audio) stopMasterSfxAudio();
                if (window.masterBgAudio) {
                    window.masterBgAudio.onerror = null;
                    window.masterBgAudio.onloadedmetadata = null;
                    window.masterBgAudio.onended = null;
                    restoreLocalAudioDefaults(window.masterBgAudio, "bg");
                }
                f.video = false; f.photo = false; f.audio = false;
            } else if (category === "photo") {
                if (f.video) stopMasterBgAudio();
                f.photo = false; f.video = false;
            } else if (category === "audio") {
                if (f.video) stopMasterBgAudio();
                if (f.audio) stopMasterSfxAudio();
                if (window.masterSfxAudio) {
                    window.masterSfxAudio.onerror = null;
                    window.masterSfxAudio.onloadedmetadata = null;
                    window.masterSfxAudio.onended = null;
                    restoreLocalAudioDefaults(window.masterSfxAudio, "sfx");
                }
                f.audio = false; f.video = false;
            } else {
                if (f.video) stopMasterBgAudio();
                if (f.audio) stopMasterSfxAudio();
                f.video = false; f.photo = false; f.audio = false;
            }
            lastActiveMediaPayload = null;
            lastLiveKey = "";
            ftbResumeState = { bg: false, sfx: false };
            ftbAppliedState = false;
            if (takePromptTimer) { clearTimeout(takePromptTimer); takePromptTimer = null; }
            const banner = document.getElementById("sender-take-live-banner");
            if (banner) banner.remove();
            if (isExternalFtbActive && typeof window.resetExternalFtb === "function") window.resetExternalFtb();
        } catch (e) {
            console.warn("[EXTERNAL] markLocalMediaTookOver error:", e);
        }
    };

    // True while the Media Sender owns the output (media from the Sender is on screen)
    function senderOwnsOutput() {
        const f = window.activeSenderMedia;
        return Boolean(f && (f.video || f.photo || f.audio));
    }

    function showTakeLivePrompt(mediaName, mediaType, onConfirm, onIgnore) {
        let existingBanner = document.getElementById("sender-take-live-banner");
        if (existingBanner) existingBanner.remove();

        const banner = document.createElement("div");
        banner.id = "sender-take-live-banner";
        banner.style.cssText = `
            position: fixed;
            top: 16px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(20, 24, 33, 0.96);
            border: 1px solid rgba(255, 170, 0, 0.6);
            box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 15px rgba(255,170,0,0.25);
            color: #fff;
            padding: 10px 18px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            gap: 16px;
            z-index: 999999;
            font-family: inherit;
            font-size: 13px;
            backdrop-filter: blur(8px);
        `;

        const icon = mediaType === 'video' ? '🎬' : (mediaType === 'photo' ? '🖼️' : '🎵');
        const safeName = (mediaName || mediaType).replace(/</g, "&lt;").replace(/>/g, "&gt;");
        banner.innerHTML = `
            <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-size: 16px;">${icon}</span>
                <span>Media Sender mengirim: <strong>${safeName}</strong></span>
            </div>
            <div style="display:flex; gap:8px;">
                <button id="btn-banner-switch" style="background:#2563eb; color:white; border:none; padding:5px 12px; border-radius:6px; font-weight:600; cursor:pointer; font-size:12px;">Beralih</button>
                <button id="btn-banner-ignore" style="background:rgba(255,255,255,0.1); color:#ccc; border:1px solid rgba(255,255,255,0.2); padding:5px 12px; border-radius:6px; cursor:pointer; font-size:12px;">Abaikan</button>
            </div>
        `;

        document.body.appendChild(banner);

        const btnSwitch = banner.querySelector("#btn-banner-switch");
        const btnIgnore = banner.querySelector("#btn-banner-ignore");

        if (takePromptTimer) clearTimeout(takePromptTimer);
        let timer = takePromptTimer = setTimeout(() => {
            if (banner.parentNode) banner.remove();
            if (typeof onIgnore === 'function') onIgnore();
        }, 15000);

        btnSwitch.onclick = () => {
            clearTimeout(timer);
            banner.remove();
            dismissAllLocalMediaPlayers(); // Decision Q8: Auto-dismiss local media player toast on switch
            if (typeof onConfirm === 'function') onConfirm();
        };

        btnIgnore.onclick = () => {
            clearTimeout(timer);
            banner.remove();
            if (typeof onIgnore === 'function') onIgnore();
        };
    }

    // --- Visual & Audio Dispatchers ---
    function handleLiveVideo(payload) {
        const vName = payload.name || (payload.video && payload.video.name) || payload.title || "Video";
        if (isLocalMediaCurrentlyActive()) {
            showTakeLivePrompt(vName, "video", () => {
                executeLiveVideo(payload);
            });
            return;
        }
        executeLiveVideo(payload);
    }

    function executeLiveVideo(payload) {
        const vName = payload.name || (payload.video && payload.video.name) || payload.title || "Video";
        const senderHost = activeExternalSender ? activeExternalSender.ip : "127.0.0.1";
        const vId = payload.id || payload.video_id || (payload.video && payload.video.id) || "";
        const rawUrl = payload.stream_url || payload.url || payload.playback_url || (vId ? `http://${senderHost}:18890/api/stream_video/${vId}` : "");
        
        // Safeguard: Do NOT process or dispatch if rawUrl is empty and vId is empty
        if (!rawUrl && !vId) {
            console.warn("[EXTERNAL] handleLiveVideo called with empty URL and ID. Ignored.");
            return;
        }

        const fallbackRawUrl = payload.fallback_url || (vId ? `http://${senderHost}:18889/api/videos/file/${vId}` : "");
        const streamUrl = resolveSenderUrl(rawUrl);
        const fallbackUrl = resolveSenderUrl(fallbackRawUrl);

        // Safeguard: Don't re-trigger full video live take if already playing this exact video URL
        if (lastActiveMediaPayload && lastActiveMediaPayload.media_type === "video" && lastActiveMediaPayload.id === vId && lastActiveMediaPayload.url === streamUrl) {
            console.log("[EXTERNAL] Video already live, skipping redundant reload:", vId);
            return;
        }

        const controls = payload.controls || {};
        const loopBehavior = payload.behavior || "loop";

        // Stop any previous video audio AND any conflicting pure audio track FIRST before setting up the new video
        stopMasterSfxAudio();
        stopMasterBgAudio();

        dismissAllLocalMediaPlayers();
        cleanResetAudioPipeline("video");

        window.activeSenderMedia = window.activeSenderMedia || { video: false, photo: false, audio: false };
        window.activeSenderMedia.video = true;
        window.activeSenderMedia.photo = false;
        window.activeSenderMedia.audio = false;
        window.currentSongHasLocalBg = false;

        lastActiveMediaPayload = {
            ...payload,
            id: vId,
            name: vName,
            media_type: "video",
            url: streamUrl,
            fallback_url: fallbackUrl
        };

        // 1. Clear conflicting photo and audio layers cleanly
        sendToMainWs({
            action: "update_photo",
            payload: { url: "", source: "remote_sender" }
        });
        sendToMainWs({
            action: "update_audio",
            payload: { url: "", source: "remote_sender" }
        });

        // Dispatch visual stream to ShowLyrics main WebSocket (display.html & lowerthird.html)
        sendToMainWs({
            action: "update_background",
            payload: {
                url: streamUrl,
                fallback_url: fallbackUrl,
                behavior: loopBehavior,
                type: "video",
                source: "remote_sender",
                sender_id: senderHost,
                video_id: vId,
                name: vName,
                duration: payload.duration || (controls && controls.duration) || 0,
                id: vId,
                controls: controls
            }
        });

        // If FTB is currently active, ensure external visual remains completely blacked out
        if (isExternalFtbActive) {
            sendToMainWs({
                action: "bg_control",
                payload: { target: "video", command: "ftb", value: true, source: "remote_sender" }
            });
            sendToMainWs({
                action: "ftb",
                payload: { enabled: true, source: "remote_sender" }
            });
        }

        // 2. Play audio locally in control.html ONLY (masterBgAudio)
        const masterAudio = window.masterBgAudio;
        if (masterAudio) {
            const myBgSessionId = ++bgAudioSessionId;
            clearBgFadeTimer();
            attachNonDestructiveStallRecovery(masterAudio, "bg");
            masterAudio.pause();
            try { masterAudio.playbackRate = 1.0; } catch (_) { }
            masterAudio.preload = "auto";

            // Hybrid Audio-Only Track (.m4a) to save >90% Wi-Fi bandwidth, with automatic fallback to local Go proxy
            const rawAudioOnlyUrl = payload.audio_url || (vId ? `http://${senderHost}:18889/api/videos/audio/${vId}` : "");
            const audioOnlyUrl = resolveSenderUrl(rawAudioOnlyUrl);
            const localAudioUrl = window.location.protocol + "//" + window.location.hostname + `:18899/api/stream_video/sender_${vId}`;

            masterAudio.dataset.fallbackTriggered = "false";
            masterAudio.src = audioOnlyUrl || localAudioUrl;
            masterAudio.loop = (loopBehavior === "loop");
            masterAudio.dataset.behavior = loopBehavior;

            masterAudio.onerror = function () {
                if (myBgSessionId !== bgAudioSessionId) return;
                if (!window.activeSenderMedia || !window.activeSenderMedia.video) return;
                if (!hasActiveAudioSrc(masterAudio)) return;
                if (masterAudio.dataset.fallbackTriggered !== "true" && localAudioUrl && masterAudio.src !== localAudioUrl) {
                    console.warn("[EXTERNAL AUDIO] Audio-only endpoint unavailable, falling back to video stream proxy:", localAudioUrl);
                    masterAudio.dataset.fallbackTriggered = "true";
                    const resumePos = Number(masterAudio.currentTime) || Number(controls.currentTime) || 0;
                    masterAudio.src = localAudioUrl;
                    try { masterAudio.currentTime = resumePos; } catch (_) { }
                    if (masterAudio._intendedPlaying && !isExternalFtbActive) {
                        masterAudio.play().then(() => {
                            if (myBgSessionId !== bgAudioSessionId) return;
                            if (!window.activeSenderMedia || !window.activeSenderMedia.video) {
                                stopMasterBgAudio();
                                return;
                            }
                            startSmoothFadeIn(masterAudio, bgTargetVolume, "bg", 140);
                        }).catch(() => { });
                    }
                }
            };

            // Callback when duration metadata becomes available
            masterAudio.onloadedmetadata = function () {
                if (myBgSessionId !== bgAudioSessionId) return;
                if (!window.activeSenderMedia || !window.activeSenderMedia.video) return;
                if (masterAudio.duration && Number.isFinite(masterAudio.duration) && masterAudio.duration > 0) {
                    sendToMainWs({
                        action: "bg_control",
                        payload: {
                            target: "video",
                            command: "update_duration",
                            duration: masterAudio.duration,
                            media_id: `sender_${vId}`,
                            source: "remote_sender"
                        }
                    });
                }
            };

            const rawVol = controls.volume !== undefined ? controls.volume : 100;
            const targetVol = Math.max(0, Math.min(1, rawVol > 1 ? rawVol / 100 : rawVol));
            const isMuted = Boolean(controls.muted);

            bgTargetVolume = targetVol;
            masterAudio.muted = isMuted;
            masterAudio.volume = 0;
            masterAudio.currentTime = Number(controls.currentTime) || 0;

            if (!isMuted && controls.playing !== false && !isExternalFtbActive) {
                masterAudio._intendedPlaying = true;
                masterAudio.play().then(() => {
                    if (myBgSessionId !== bgAudioSessionId) return;
                    if (!window.activeSenderMedia || !window.activeSenderMedia.video) {
                        stopMasterBgAudio();
                        return;
                    }
                    startSmoothFadeIn(masterAudio, bgTargetVolume, "bg", 180);
                }).catch(() => { });
            } else if (isMuted && controls.playing !== false && !isExternalFtbActive) {
                masterAudio._intendedPlaying = true;
                masterAudio.volume = bgTargetVolume;
                masterAudio.play().catch(() => { });
            } else if (isExternalFtbActive && controls.playing !== false) {
                // Staged under FTB: stay paused, resume automatically when FTB turns OFF
                masterAudio._intendedPlaying = false;
                masterAudio.volume = bgTargetVolume;
                ftbResumeState.bg = true;
            } else {
                masterAudio._intendedPlaying = false;
                masterAudio.volume = bgTargetVolume;
            }
        }
    }

    function handleLivePhoto(payload) {
        const pName = payload.name || (payload.photo && payload.photo.name) || payload.title || "Photo";
        if (isLocalMediaCurrentlyActive()) {
            showTakeLivePrompt(pName, "photo", () => {
                executeLivePhoto(payload);
            });
            return;
        }
        executeLivePhoto(payload);
    }

    function executeLivePhoto(payload) {
        window.activeSenderMedia = window.activeSenderMedia || { video: false, photo: false, audio: false };
        window.activeSenderMedia.photo = true;
        window.activeSenderMedia.video = false;
        window.currentSongHasLocalBg = false;

        lastActiveMediaPayload = { ...payload, media_type: "photo" };

        const senderHost = activeExternalSender ? activeExternalSender.ip : "127.0.0.1";
        const pId = payload.id || (payload.photo && payload.photo.id) || "";
        const rawUrl = payload.url || (pId ? `http://${senderHost}:18889/api/photos/file/${pId}` : "");
        const resolvedUrl = resolveSenderUrl(rawUrl);

        // 1. Stop and release video audio synchronously first, then clear background video and dispatch photo
        stopMasterBgAudio();
        dismissAllLocalMediaPlayers();
        sendToMainWs({
            action: "update_background",
            payload: { url: "", source: "remote_sender" }
        });
        sendToMainWs({
            action: "update_photo",
            payload: {
                url: resolvedUrl,
                source: "remote_sender",
                sender_id: senderHost,
                id: pId
            }
        });

        // If FTB is currently active, ensure photo layer remains completely blacked out
        if (isExternalFtbActive) {
            sendToMainWs({
                action: "ftb",
                payload: { enabled: true, value: true, active: true, target: "photo", source: "remote_sender" }
            });
        }
        const _flags = window.activeSenderMedia;
        if (!payload.keep_audio && _flags.audio) {
            // Sender has no audio any more -> release it
            stopMasterSfxAudio();
            _flags.audio = false;
            sendToMainWs({
                action: "update_audio",
                payload: { url: "", source: "remote_sender" }
            });
        }
    }

    function handleLiveAudio(payload) {
        const aName = payload.name || (payload.audio && payload.audio.name) || payload.title || "Audio";
        if (isLocalMediaCurrentlyActive()) {
            showTakeLivePrompt(aName, "audio", () => {
                executeLiveAudio(payload);
            });
            return;
        }
        executeLiveAudio(payload);
    }

    function executeLiveAudio(payload) {
        window.activeSenderMedia = window.activeSenderMedia || { video: false, photo: false, audio: false };
        const _senderHost = activeExternalSender ? activeExternalSender.ip : "127.0.0.1";
        const _aId = payload.id || (payload.audio && payload.audio.id) || "";
        const _rawUrl = payload.url || (_aId ? `http://${_senderHost}:18889/api/audio/file/${_aId}` : "");
        const _resolved = resolveSenderUrl(_rawUrl);

        // Always stop any playing video audio first when transitioning to audio
        window.activeSenderMedia.video = false;
        stopMasterBgAudio();
        sendToMainWs({
            action: "update_background",
            payload: { url: "", source: "remote_sender" }
        });

        // Same song already loaded & owned by the Sender -> ignore (never restart a playing/held song)
        try {
            const cur = window.masterSfxAudio;
            if (cur && window.activeSenderMedia.audio && hasActiveAudioSrc(cur) && _resolved &&
                cur.src === new URL(_resolved, window.location.href).href) {
                console.log("[EXTERNAL] Audio already live, ignoring re-take:", _aId);
                return;
            }
        } catch (_) { }

        // Photo + Audio run independently: a new song must keep the live photo (combine), and Sender video is released
        const keepPhoto = Boolean(payload.combine || window.activeSenderMedia.photo);
        window.activeSenderMedia.audio = true;
        window.activeSenderMedia.video = false;

        lastActiveMediaPayload = { ...payload, media_type: "audio" };

        const senderHost = _senderHost;
        const aId = _aId;
        const resolvedUrl = _resolved;
        const controls = payload.controls || {};

        // If not combine mode, clear visual to black
        if (!keepPhoto) {
            clearRemoteDisplayVisuals();
        }

        // Stop any previous SFX audio track cleanly before loading the new track
        stopMasterSfxAudio();
        dismissAllLocalMediaPlayers();
        cleanResetAudioPipeline("audio");

        // Play audio locally on masterSfxAudio in control.html
        const sfxAudio = window.masterSfxAudio;
        if (sfxAudio) {
            const mySfxSessionId = ++sfxAudioSessionId;
            clearSfxFadeTimer();
            attachNonDestructiveStallRecovery(sfxAudio, "sfx");
            sfxAudio.pause();
            try { sfxAudio.playbackRate = 1.0; } catch (_) { }
            sfxAudio.preload = "auto";
            sfxAudio.src = resolvedUrl;
            const isLoop = (payload.loop !== false && payload.behavior !== "once");
            sfxAudio.loop = isLoop;
            sfxAudio.dataset.behavior = payload.behavior || (isLoop ? "loop" : "once");

            sfxAudio.onended = function () {
                if (mySfxSessionId !== sfxAudioSessionId) return;
                if (sfxAudio.dataset.behavior === "once") {
                    sfxAudio._intendedPlaying = false;
                    sfxAudio.pause();
                    if (sfxAudio.duration > 0.05) {
                        try { sfxAudio.currentTime = sfxAudio.duration - 0.05; } catch (_) {}
                    }
                }
            };

            sfxAudio.onerror = function (e) {
                if (mySfxSessionId !== sfxAudioSessionId) return;
                if (!window.activeSenderMedia || !window.activeSenderMedia.audio) return;
                if (!hasActiveAudioSrc(sfxAudio)) return;
                console.error("[EXTERNAL AUDIO] Playback error:", e);
                if (typeof showToast === "function") {
                    showToast(`Gagal memutar audio: ${payload.name || 'File korup/tidak didukung'}`, "error", 4000);
                }
            };

            const rawVol = controls.volume !== undefined ? controls.volume : 100;
            const targetVol = Math.max(0, Math.min(1, rawVol > 1 ? rawVol / 100 : rawVol));
            sfxTargetVolume = targetVol;
            sfxAudio.muted = Boolean(controls.muted);
            sfxAudio.volume = 0;
            sfxAudio.currentTime = Number(controls.currentTime) || 0;

            if (!controls.muted && controls.playing !== false && !isExternalFtbActive) {
                sfxAudio._intendedPlaying = true;
                sfxAudio.play().then(() => {
                    if (mySfxSessionId !== sfxAudioSessionId) return;
                    if (!window.activeSenderMedia || !window.activeSenderMedia.audio) {
                        stopMasterSfxAudio();
                        return;
                    }
                    startSmoothFadeIn(sfxAudio, sfxTargetVolume, "sfx", 140);
                }).catch(() => { });
            } else if (controls.muted && controls.playing !== false && !isExternalFtbActive) {
                sfxAudio._intendedPlaying = true;
                sfxAudio.volume = sfxTargetVolume;
                sfxAudio.play().catch(() => { });
            } else if (isExternalFtbActive && controls.playing !== false) {
                // Staged under FTB: stay paused, resume automatically when FTB turns OFF
                sfxAudio._intendedPlaying = false;
                sfxAudio.volume = sfxTargetVolume;
                ftbResumeState.sfx = true;
            } else {
                sfxAudio._intendedPlaying = false;
                sfxAudio.volume = sfxTargetVolume;
            }
        }

        // Broadcast to main WebSocket so audio.html and app state are synchronized
        sendToMainWs({
            action: "update_audio",
            payload: {
                url: resolvedUrl,
                source: "remote_sender",
                sender_id: senderHost,
                id: aId
            }
        });
    }

    function handleMediaControl(payload, controlTarget) {
        const cmd = payload.command;
        const val = payload.value;
        const masterAudio = window.masterBgAudio;
        const isVideoActive = Boolean(window.activeSenderMedia && window.activeSenderMedia.video);
        const isAudioActive = Boolean(window.activeSenderMedia && window.activeSenderMedia.audio);

        // Channel-specific STOP only applies when Media Sender actually owns that channel
        if (cmd === "stop") {
            if (controlTarget === "video") {
                if (!isVideoActive) return;
                if (window.activeSenderMedia) window.activeSenderMedia.video = false;
                stopMasterBgAudio();
                if (lastActiveMediaPayload && lastActiveMediaPayload.media_type === "video") {
                    lastActiveMediaPayload = null;
                    lastLiveKey = "";
                }
                sendToMainWs({
                    action: "bg_control",
                    payload: { target: "video", command: "stop", source: "remote_sender" }
                });
                sendToMainWs({
                    action: "update_background",
                    payload: { url: "", source: "remote_sender" }
                });
                return;
            }
            if (controlTarget === "audio") {
                if (!isAudioActive) return;
                if (window.activeSenderMedia) window.activeSenderMedia.audio = false;
                stopMasterSfxAudio();
                if (lastActiveMediaPayload && lastActiveMediaPayload.media_type === "audio") {
                    lastActiveMediaPayload = null;
                    lastLiveKey = "";
                }
                sendToMainWs({
                    action: "bg_control",
                    payload: { target: "audio", command: "stop", source: "remote_sender" }
                });
                sendToMainWs({
                    action: "update_audio",
                    payload: { url: "", source: "remote_sender" }
                });
                return;
            }
            if (controlTarget === "photo") {
                const isPhotoActive = Boolean(window.activeSenderMedia && window.activeSenderMedia.photo);
                if (!isPhotoActive) return;
                if (window.activeSenderMedia) window.activeSenderMedia.photo = false;
                if (lastActiveMediaPayload && lastActiveMediaPayload.media_type === "photo") {
                    lastActiveMediaPayload = null;
                    lastLiveKey = "";
                }
                sendToMainWs({
                    action: "update_photo",
                    payload: { url: "", source: "remote_sender" }
                });
                return;
            }
            if (isAudioActive) {
                if (window.activeSenderMedia) window.activeSenderMedia.audio = false;
                stopMasterSfxAudio();
                sendToMainWs({
                    action: "bg_control",
                    payload: { target: "audio", command: "stop", source: "remote_sender" }
                });
                sendToMainWs({
                    action: "update_audio",
                    payload: { url: "", source: "remote_sender" }
                });
            }
            if (isVideoActive) {
                if (window.activeSenderMedia) window.activeSenderMedia.video = false;
                stopMasterBgAudio();
                sendToMainWs({
                    action: "bg_control",
                    payload: { target: "video", command: "stop", source: "remote_sender" }
                });
                sendToMainWs({
                    action: "update_background",
                    payload: { url: "", source: "remote_sender" }
                });
            }
            return;
        }

        // Sender control/heartbeat events only apply while the Sender actually owns the output.
        // If local media (or nothing from the Sender) is on air, ignore them (no silent take-over, no toast).
        if (!senderOwnsOutput()) return;

        // Ignore stale control events for a channel that is no longer active
        if (controlTarget === "video" && !isVideoActive) return;
        if (controlTarget === "audio" && !isAudioActive) return;

        const targetIsAudio = (controlTarget === "audio") ? true : (controlTarget === "video" ? false : isAudioActive);

        // Under FTB the output stays paused; remember that playback is wanted so FTB OFF resumes it.
        if (isExternalFtbActive && (cmd === "play" || cmd === "replay" || cmd === "restart")) {
            if (targetIsAudio) ftbResumeState.sfx = true; else ftbResumeState.bg = true;
            return;
        }

        if (cmd === "pause") {
            if (targetIsAudio) {
                pauseMasterSfxAudio();
            } else {
                pauseMasterBgAudio();
            }
            sendToMainWs({
                action: "bg_control",
                payload: { target: targetIsAudio ? "audio" : "video", command: "pause", source: "remote_sender" }
            });
        } else if (cmd === "play") {
            if (targetIsAudio) {
                resumeMasterSfxAudio();
            } else {
                resumeMasterBgAudio();
            }
            sendToMainWs({
                action: "bg_control",
                payload: { target: targetIsAudio ? "audio" : "video", command: "play", source: "remote_sender" }
            });
        } else if (cmd === "replay" || cmd === "restart") {
            if (targetIsAudio && window.masterSfxAudio) {
                window.masterSfxAudio._intendedPlaying = true;
                try { window.masterSfxAudio.playbackRate = 1.0; } catch (_) {}
                window.masterSfxAudio.currentTime = 0;
                window.masterSfxAudio.play().catch(() => {});
            } else if (!targetIsAudio && masterAudio) {
                masterAudio._intendedPlaying = true;
                try { masterAudio.playbackRate = 1.0; } catch (_) {}
                masterAudio.currentTime = 0;
                masterAudio.play().catch(() => {});
            }
            sendToMainWs({
                action: "bg_control",
                payload: { target: targetIsAudio ? "audio" : "video", command: "replay", value: 0, source: "remote_sender" }
            });
        } else if (cmd === "sync_time" || cmd === "seek") {
            const seekTime = Number(val);
            if (!Number.isFinite(seekTime)) return;
            const isManualSeek = (cmd === "seek" || payload.manual === true || payload.force === true);

            if (targetIsAudio) {
                if (window.masterSfxAudio) {
                    applyAdaptiveAudioSync(window.masterSfxAudio, seekTime, {
                        key: "sfx",
                        force: isManualSeek
                    });
                }
                if (isManualSeek) {
                    sendToMainWs({
                        action: "bg_control",
                        payload: {
                            target: "audio",
                            command: "seek",
                            value: seekTime,
                            force: true,
                            manual: true,
                            source: "remote_sender"
                        }
                    });
                }
            } else {
                // Video mode: Dual-Layer Sync (Decisions Q1 & Q2)
                if (isManualSeek) {
                    if (masterAudio) {
                        applyAdaptiveAudioSync(masterAudio, seekTime, { key: "bg", force: true });
                    }
                    lastRemoteVideoSyncSentAt = performance.now();
                    sendToMainWs({
                        action: "bg_control",
                        payload: {
                            target: "video",
                            command: "seek",
                            value: seekTime,
                            force: true,
                            manual: true,
                            source: "remote_sender"
                        }
                    });
                } else {
                    const nowPerf = performance.now();
                    const hasActiveLocalVideoClock = (nowPerf - localBgVideoPos.updatedAt) < 2500 && !localBgVideoPos.paused;

                    // If projector display (background.html) is not actively broadcasting its local clock,
                    // sync masterBgAudio directly to Sender's heartbeat via 3-Tier Adaptive Sync
                    if (!hasActiveLocalVideoClock && masterAudio) {
                        applyAdaptiveAudioSync(masterAudio, seekTime, { key: "bg", force: false });
                    }

                    // Only forward periodic sync_time to Receiver's Go Engine / background.html if macro drift > 0.8s
                    const refPos = hasActiveLocalVideoClock
                        ? localBgVideoPos.currentTime
                        : (masterAudio && Number.isFinite(masterAudio.currentTime) ? masterAudio.currentTime : seekTime);
                    const dur = masterAudio && Number.isFinite(masterAudio.duration) && masterAudio.duration > 1.0 ? masterAudio.duration : 0;
                    let targetVal = (dur > 0 && masterAudio && masterAudio.loop) ? (seekTime % dur) : seekTime;
                    let macroDrift = Math.abs(refPos - targetVal);
                    if (dur > 0 && masterAudio && masterAudio.loop && macroDrift > dur * 0.65) {
                        macroDrift = Math.abs(macroDrift - dur);
                    }

                    if (macroDrift > 0.8 && (nowPerf - lastRemoteVideoSyncSentAt) > 2000) {
                        lastRemoteVideoSyncSentAt = nowPerf;
                        if (masterAudio) {
                            applyAdaptiveAudioSync(masterAudio, targetVal, { key: "bg", force: false });
                        }
                        sendToMainWs({
                            action: "bg_control",
                            payload: {
                                target: "video",
                                command: "sync_time",
                                value: targetVal,
                                force: false,
                                manual: false,
                                source: "remote_sender"
                            }
                        });
                    }
                }
            }
        } else if (cmd === "volume") {
            const rawVol = Number(val);
            const targetVol = Math.max(0, Math.min(1, rawVol > 1 ? rawVol / 100 : rawVol));
            if (targetIsAudio) {
                clearSfxFadeTimer();
                sfxTargetVolume = targetVol;
                if (window.masterSfxAudio) {
                    window.masterSfxAudio.volume = targetVol;
                    window.masterSfxAudio.muted = false;
                }
            } else {
                clearBgFadeTimer();
                bgTargetVolume = targetVol;
                if (masterAudio) {
                    masterAudio.volume = targetVol;
                    masterAudio.muted = false;
                }
            }
            sendToMainWs({
                action: "bg_control",
                payload: { target: targetIsAudio ? "audio" : "video", command: "volume", value: targetVol, source: "remote_sender" }
            });
        } else if (cmd === "unmute") {
            if (targetIsAudio) {
                if (window.masterSfxAudio) window.masterSfxAudio.muted = false;
            } else {
                if (masterAudio) masterAudio.muted = false;
            }
            sendToMainWs({
                action: "bg_control",
                payload: { target: targetIsAudio ? "audio" : "video", command: "unmute", value: false, source: "remote_sender" }
            });
            // Decision Q1: Auto-resume audio immediately if paused during unmute
            if (!isExternalFtbActive) {
                if (targetIsAudio && window.masterSfxAudio && window.masterSfxAudio.paused && hasActiveAudioSrc(window.masterSfxAudio)) {
                    window.masterSfxAudio._intendedPlaying = true;
                    window.masterSfxAudio.play().catch(() => {});
                } else if (!targetIsAudio && masterAudio && masterAudio.paused && hasActiveAudioSrc(masterAudio)) {
                    masterAudio._intendedPlaying = true;
                    masterAudio.play().catch(() => {});
                }
            }
        } else if (cmd === "mute" || cmd === "mute_toggle") {
            const isMuted = Boolean(val);
            if (targetIsAudio) {
                if (window.masterSfxAudio) window.masterSfxAudio.muted = isMuted;
            } else {
                if (masterAudio) masterAudio.muted = isMuted;
            }
            sendToMainWs({
                action: "bg_control",
                payload: { target: targetIsAudio ? "audio" : "video", command: isMuted ? "mute" : "unmute", value: isMuted, source: "remote_sender" }
            });
            if (!isMuted && !isExternalFtbActive) {
                if (targetIsAudio && window.masterSfxAudio && window.masterSfxAudio.paused && hasActiveAudioSrc(window.masterSfxAudio)) {
                    window.masterSfxAudio._intendedPlaying = true;
                    window.masterSfxAudio.play().catch(() => {});
                } else if (!targetIsAudio && masterAudio && masterAudio.paused && hasActiveAudioSrc(masterAudio)) {
                    masterAudio._intendedPlaying = true;
                    masterAudio.play().catch(() => {});
                }
            }
        } else if (cmd === "loop" || cmd === "update_behavior") {
            const isLoop = (val === "loop" || val === true);
            const behaviorStr = isLoop ? "loop" : "once";
            if (targetIsAudio && window.masterSfxAudio) {
                window.masterSfxAudio.loop = isLoop;
                window.masterSfxAudio.dataset.behavior = behaviorStr;
            } else if (!targetIsAudio && masterAudio) {
                masterAudio.loop = isLoop;
                masterAudio.dataset.behavior = behaviorStr;
            }
            sendToMainWs({
                action: "bg_control",
                payload: { target: targetIsAudio ? "audio" : "video", command: "loop", value: isLoop, behavior: behaviorStr, source: "remote_sender" }
            });
        }
    }

    function handleFtbToggle(enable) {
        isExternalFtbActive = enable;
        updateTabStatus(enable ? "ftb" : "connected");

        // The Sender fans one FTB toggle out into several WS messages. Apply it only once, otherwise the second
        // ON would overwrite the 'was playing' bookkeeping with paused state and FTB OFF would not resume.
        if (enable === ftbAppliedState) {
            renderExternalSenderList();
            return;
        }
        ftbAppliedState = enable;

        // Determine which remote media is active
        const isVideoActive = Boolean(window.activeSenderMedia && window.activeSenderMedia.video);
        const isPhotoActive = Boolean(window.activeSenderMedia && window.activeSenderMedia.photo);
        const isAudioActive = Boolean(window.activeSenderMedia && window.activeSenderMedia.audio);

        // If no Sender media is active on ShowLyrics App, or if local media is currently active:
        // Sender FTB should NOT affect ShowLyrics App! (Decisions Q3, Q14)
        if (!isVideoActive && !isPhotoActive && !isAudioActive) {
            console.log("[EXTERNAL] FTB toggled on Sender but no remote sender media active in ShowLyrics App. Ignored.");
            renderExternalSenderList();
            return;
        }

        if (enable) {
            console.log("[EXTERNAL] Selective FTB Enabled: video=", isVideoActive, "photo=", isPhotoActive, "audio=", isAudioActive);
            // Remember what was really playing so FTB OFF resumes exactly there (pause only, never restart)
            const _bg = window.masterBgAudio, _sfx = window.masterSfxAudio;
            ftbResumeState.bg = Boolean(isVideoActive && _bg && !_bg.paused && hasActiveAudioSrc(_bg));
            ftbResumeState.sfx = Boolean(isAudioActive && _sfx && !_sfx.paused && hasActiveAudioSrc(_sfx));
            if (isVideoActive) {
                pauseMasterBgAudio();
                sendToMainWs({
                    action: "bg_control",
                    payload: { target: "video", command: "ftb", value: true, source: "remote_sender" }
                });
                sendToMainWs({
                    action: "ftb",
                    payload: { enabled: true, value: true, active: true, target: "video", source: "remote_sender" }
                });
            }
            if (isPhotoActive) {
                sendToMainWs({
                    action: "ftb",
                    payload: { enabled: true, value: true, active: true, target: "photo", source: "remote_sender" }
                });
            }
            if (isAudioActive) {
                pauseMasterSfxAudio();
                sendToMainWs({
                    action: "ftb",
                    payload: { enabled: true, value: true, active: true, target: "audio", source: "remote_sender" }
                });
            }
        } else {
            console.log("[EXTERNAL] Selective FTB Disabled: resuming remote media");
            if (isVideoActive) {
                sendToMainWs({
                    action: "bg_control",
                    payload: { target: "video", command: "ftb", value: false, source: "remote_sender" }
                });
                sendToMainWs({
                    action: "ftb",
                    payload: { enabled: false, value: false, active: false, target: "video", source: "remote_sender" }
                });
                if (ftbResumeState.bg) {
                    resumeMasterBgAudio();
                    sendToMainWs({
                        action: "bg_control",
                        payload: { target: "video", command: "play", source: "remote_sender" }
                    });
                }
            }
            if (isPhotoActive) {
                sendToMainWs({
                    action: "ftb",
                    payload: { enabled: false, value: false, active: false, target: "photo", source: "remote_sender" }
                });
            }
            if (isAudioActive) {
                if (ftbResumeState.sfx) resumeMasterSfxAudio();
                sendToMainWs({
                    action: "ftb",
                    payload: { enabled: false, value: false, active: false, target: "audio", source: "remote_sender" }
                });
            }
            ftbResumeState = { bg: false, sfx: false };
        }
        renderExternalSenderList();
    }

    // Expose local override function for ShowLyrics App operators (Decision Q10)
    window.resetExternalFtb = function() {
        if (isExternalFtbActive) {
            console.log("[EXTERNAL] Local operator override -> Resetting FTB state to inactive");
            isExternalFtbActive = false;
            ftbAppliedState = false;
            updateTabStatus(activeExternalSender ? "connected" : "disconnected");
            sendToMainWs({
                action: "bg_control",
                payload: { target: "video", command: "ftb", value: false, source: "local_override" }
            });
            sendToMainWs({
                action: "ftb",
                payload: { enabled: false, value: false, active: false, source: "local_override" }
            });
        }
    };

    function clearRemoteDisplayVisuals() {
        if (window.activeSenderMedia) {
            window.activeSenderMedia.video = false;
            window.activeSenderMedia.photo = false;
        }
        sendToMainWs({
            action: "update_background",
            payload: { url: "", source: "remote_sender" }
        });
        sendToMainWs({
            action: "update_photo",
            payload: { url: "", source: "remote_sender" }
        });
    }

    function pauseMasterBgAudio() {
        clearBgFadeTimer();
        if (window.masterBgAudio) {
            window.masterBgAudio._intendedPlaying = false;
            try { window.masterBgAudio.playbackRate = 1.0; } catch (_) { }
            if (!window.masterBgAudio.paused) {
                window.masterBgAudio.pause();
            }
        }
    }

    function resumeMasterBgAudio() {
        if (window.activeSenderMedia && window.activeSenderMedia.video && window.masterBgAudio && window.masterBgAudio.paused && hasActiveAudioSrc(window.masterBgAudio)) {
            const myBgSessionId = bgAudioSessionId;
            window.masterBgAudio._intendedPlaying = true;
            window.masterBgAudio.volume = 0;
            window.masterBgAudio.play().then(() => {
                if (myBgSessionId !== bgAudioSessionId) return;
                if (!window.activeSenderMedia || !window.activeSenderMedia.video) {
                    stopMasterBgAudio();
                    return;
                }
                startSmoothFadeIn(window.masterBgAudio, bgTargetVolume, "bg", 120);
            }).catch(() => { });
        }
    }

    function stopMasterBgAudio() {
        bgAudioSessionId++;
        clearBgFadeTimer();
        ftbResumeState.bg = false;
        if (window.masterBgAudio) {
            const bg = window.masterBgAudio;
            bg._intendedPlaying = false;
            bg.dataset.fallbackTriggered = "true";
            bg.onerror = null;
            bg.onloadedmetadata = null;
            bg.onended = null;
            try { bg.playbackRate = 1.0; } catch (_) { }
            try { bg.pause(); } catch (_) { }
            try { bg.currentTime = 0; } catch (_) { }
            try { bg.removeAttribute("src"); } catch (_) { }
            try { bg.load(); } catch (_) { }
            restoreLocalAudioDefaults(bg, "bg");
        }
        if (window.monitorBgAudio) {
            try {
                window.monitorBgAudio.pause();
                window.monitorBgAudio.removeAttribute("src");
                window.monitorBgAudio.load();
            } catch (_) { }
        }
    }

    function pauseMasterSfxAudio() {
        clearSfxFadeTimer();
        if (window.masterSfxAudio) {
            window.masterSfxAudio._intendedPlaying = false;
            try { window.masterSfxAudio.playbackRate = 1.0; } catch (_) { }
            if (!window.masterSfxAudio.paused) {
                window.masterSfxAudio.pause();
            }
        }
    }

    function resumeMasterSfxAudio() {
        if (window.activeSenderMedia && window.activeSenderMedia.audio && window.masterSfxAudio && window.masterSfxAudio.paused && hasActiveAudioSrc(window.masterSfxAudio)) {
            const mySfxSessionId = sfxAudioSessionId;
            window.masterSfxAudio._intendedPlaying = true;
            window.masterSfxAudio.volume = 0;
            window.masterSfxAudio.play().then(() => {
                if (mySfxSessionId !== sfxAudioSessionId) return;
                if (!window.activeSenderMedia || !window.activeSenderMedia.audio) {
                    stopMasterSfxAudio();
                    return;
                }
                startSmoothFadeIn(window.masterSfxAudio, sfxTargetVolume, "sfx", 120);
            }).catch(() => { });
        }
    }

    function stopMasterSfxAudio() {
        sfxAudioSessionId++;
        clearSfxFadeTimer();
        ftbResumeState.sfx = false;
        if (window.masterSfxAudio) {
            const sfx = window.masterSfxAudio;
            sfx._intendedPlaying = false;
            sfx.onerror = null;
            sfx.onloadedmetadata = null;
            sfx.onended = null;
            try { sfx.playbackRate = 1.0; } catch (_) { }
            try { sfx.pause(); } catch (_) { }
            try { sfx.currentTime = 0; } catch (_) { }
            try { sfx.removeAttribute("src"); } catch (_) { }
            try { sfx.load(); } catch (_) { }
            restoreLocalAudioDefaults(sfx, "sfx");
        }
        if (window.monitorSfxAudio) {
            try {
                window.monitorSfxAudio.pause();
                window.monitorSfxAudio.removeAttribute("src");
                window.monitorSfxAudio.load();
            } catch (_) { }
        }
    }

    // --- PPT Remote Integration (100% Untouched PPT Architecture) ---
    window.refreshPPTSenders = async function () {
        const listEl = document.getElementById("ext-ppt-device-list");
        if (!listEl) return;

        listEl.innerHTML = `<div class="ext-empty-placeholder">Scanning for PowerPoint Senders...</div>`;

        try {
            const res = await fetch("/api/senders/list");
            const senders = await res.json();
            const list = Array.isArray(senders) ? senders : [];
            discoveredPptSenders = list.filter(s => !s.media_types || s.media_types.includes("ppt"));
            renderPPTSenderList();
        } catch (e) {
            listEl.innerHTML = `<div class="ext-empty-placeholder" style="color: #ef4444;">Failed to scan PPT senders.</div>`;
        }
    };

    function renderPPTSenderList() {
        const listEl = document.getElementById("ext-ppt-device-list");
        if (!listEl) return;

        if (discoveredPptSenders.length === 0) {
            listEl.innerHTML = `<div class="ext-empty-placeholder">No sender devices found</div>`;
            return;
        }

        listEl.innerHTML = "";
        discoveredPptSenders.forEach(sender => {
            const card = document.createElement("div");
            card.className = "ext-device-card";
            card.innerHTML = `
                <div class="ext-card-left">
                    <div class="ext-card-avatar">📊</div>
                    <div class="ext-card-info">
                        <div class="ext-card-name">${sender.device_name || "PPT Sender"}</div>
                        <div class="ext-card-meta">
                            <span>🌐 ${sender.ip}:${sender.ws_port || 18889}</span>
                            <span class="ext-meta-badge online">● Online</span>
                        </div>
                    </div>
                </div>
                <div class="ext-card-actions">
                    <button class="btn-ext-connect" onclick="connectToPPTSender(${JSON.stringify(sender).replace(/"/g, '&quot;')})">CONNECT</button>
                </div>
            `;
            listEl.appendChild(card);
        });
    }

    window.connectToPPTSender = function (sender) {
        if (typeof window.enterPPTRemoteMode === "function") {
            window.enterPPTRemoteMode(sender);
            const dotPPT = document.getElementById("ext-ppt-status-dot");
            if (dotPPT) dotPPT.className = "ext-status-dot online";
        } else {
            console.error("[EXTERNAL] enterPPTRemoteMode is not available");
        }
    };

    window.connectManualPPTSender = async function () {
        const input = document.getElementById("manual-ppt-sender-ip");
        const raw = input ? input.value.trim() : "";
        if (!raw) return;

        let ip = raw;
        let port = 18889;
        if (raw.includes(":")) {
            const parts = raw.split(":");
            ip = parts[0];
            port = parseInt(parts[1], 10) || 18889;
        }

        try {
            const res = await fetch("/api/senders/connect", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ip: ip, port: port })
            });
            const data = await res.json();
            if (data.status === "success" && data.sender) {
                connectToPPTSender(data.sender);
            } else {
                connectToPPTSender({ ip: ip, ws_port: port, device_name: `PPT (${ip})` });
            }
        } catch (_) {
            connectToPPTSender({ ip: ip, ws_port: port, device_name: `PPT (${ip})` });
        }
        if (input) input.value = "";
    };

    // Auto-init on load
    window.initExternalPanel = function () {
        if (currentExtSource === "media-sender") {
            refreshExternalSenders();
        } else {
            refreshPPTSenders();
        }
    };

    // Auto-reconnect to last connected Media Sender if available
    try {
        const savedSender = localStorage.getItem("showlyrics_last_media_sender");
        if (savedSender) {
            const parsed = JSON.parse(savedSender);
            if (parsed && parsed.ip) {
                console.log("[EXTERNAL] Found cached Media Sender session for:", parsed.ip);
                setTimeout(() => {
                    if (!activeExternalSender) {
                        connectToExternalSender(parsed);
                    }
                }, 1000);
            }
        }
    } catch (_) {}

    // Export API
    window.externalMediaReceiver = {
        getActiveSender: () => activeExternalSender,
        isFtbActive: () => isExternalFtbActive,
        getLastMedia: () => lastActiveMediaPayload
    };

})();
