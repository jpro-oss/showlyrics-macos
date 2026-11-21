
const videoEl = document.getElementById('video-el');
let currentStream = null;
let currentDeviceId = null;
let currentFit = 'fill';
let isVisible = false;
let lastMaskImage = null;
let camWS = null;
let camPC = null;
let retryTimer = null;

const channel = 'audience'; // This is 'audience' for audience_cam.html

function connectWS() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
        let data;
        try {
            data = JSON.parse(event.data);
        } catch (_) {
            return;
        }
        if (data.action === 'beta_revoked') {
            ws._betaRevoked = true;
            stopStream();
            try { ws.close(4001, 'beta_revoked'); } catch (_) {}
            if (window.top === window.self) setTimeout(() => window.location.reload(), 150);
            return;
        }
        if (data.type === 'update_camera_state') {
            updateState(data.state[channel]);
        }
    };

    ws.onclose = (ev) => {
        if ((ev && ev.code === 4001) || ws._betaRevoked) {
            if (window.top === window.self) setTimeout(() => window.location.reload(), 150);
            return;
        }
        setTimeout(connectWS, 2000);
    };

    ws.onerror = () => {
        try { ws.close(); } catch (_) {}
    };
}

async function updateState(state) {
    if (!state) return;

    const {
        device_id, fit, show, x, y, zoom, opacity,
        saturation, hue, brightness, contrast,
        mask_image, mask_x, mask_y, mask_zoom, mask_fit
    } = state;

    // Update Transform (Position & Zoom)
    const tx = x || 0;
    const ty = y || 0;
    const sc = (zoom || 100) / 100;
    videoEl.style.transform = `translate(${tx}%, ${ty}%) scale(${sc})`;

    // Update Filters (Effects)
    const sat = saturation !== undefined ? saturation : 100;
    const h = hue !== undefined ? hue : 0;
    const br = brightness !== undefined ? brightness : 100;
    const con = contrast !== undefined ? contrast : 100;
    videoEl.style.filter = `saturate(${sat}%) hue-rotate(${h}deg) brightness(${br}%) contrast(${con}%)`;

    // Opacity
    videoEl.style.opacity = (opacity !== undefined ? opacity : 100) / 100;

    // Update Masking on Container (Independent)
    const camContainer = document.getElementById('cam-container');
    if (mask_image) {
        // ONLY reload the image if the path has changed
        if (lastMaskImage !== mask_image) {
            lastMaskImage = mask_image;
            let maskUrl = mask_image;
            if (!mask_image.startsWith('http') && !mask_image.startsWith('data:')) {
                // Use timestamp ONLY when the image file itself changes
                maskUrl = `/api/mask_stream?path=${encodeURIComponent(mask_image)}&v=${Date.now()}`;
            }
            camContainer.style.webkitMaskImage = `url("${maskUrl}")`;
            camContainer.style.maskImage = `url("${maskUrl}")`;
            camContainer.style.webkitMaskRepeat = "no-repeat";
            camContainer.style.maskRepeat = "no-repeat";
            camContainer.style.webkitMaskMode = "luminance";
            camContainer.style.maskMode = "luminance";
            camContainer.style.webkitMaskSourceType = "luminance";
        }

        // Position and Size can update independently without reloading image
        const mPos = `calc(50% + ${mask_x || 0}%) calc(50% + ${mask_y || 0}%)`;
        camContainer.style.webkitMaskPosition = mPos;
        camContainer.style.maskPosition = mPos;

        let mSize = "cover";
        if (mask_fit === 'fit') mSize = "contain";
        if (mask_fit === 'stretch') mSize = "100% 100%";
        if (mask_zoom && mask_zoom !== 100) mSize = `${mask_zoom}%`;

        camContainer.style.webkitMaskSize = mSize;
        camContainer.style.maskSize = mSize;
    } else {
        if (lastMaskImage !== null) {
            lastMaskImage = null;
            camContainer.style.webkitMaskImage = "none";
            camContainer.style.maskImage = "none";
        }
    }

    // Update Visibility
    if (show && device_id) {
        videoEl.classList.remove('hidden');
        isVisible = true;
    } else {
        videoEl.classList.add('hidden');
        isVisible = false;
        stopStream();
        currentDeviceId = null;
        return;
    }

    // Update Fit Mode
    videoEl.className = `fit-${fit}`;

    // Update Stream if device changed or stream missing
    if (device_id !== currentDeviceId || (show && !currentStream && !camPC)) {
        currentDeviceId = device_id;
        if (isVisible && device_id) {
            await startStream(device_id);
        }
    }
}

function normalizeCameraLabel(name) {
    return String(name || "")
        .toLowerCase()
        .replace(/\([^)]*\)/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function parseFFmpegCameraName(deviceId) {
    if (!deviceId || !deviceId.startsWith('ffmpeg:')) return null;
    const rawName = deviceId.split(':').slice(2).join(':');
    return rawName.replace(/\s*\([0-9a-fA-F]{4}:[0-9a-fA-F]{4}\)\s*$/, '').trim();
}

function scheduleRetry(deviceId) {
    if (retryTimer) clearTimeout(retryTimer);
    if (!isVisible || currentDeviceId !== deviceId) return;
    retryTimer = setTimeout(() => {
        retryTimer = null;
        if (isVisible && currentDeviceId === deviceId) {
            startStream(deviceId);
        }
    }, 3000);
}

function startWebRTCStream(deviceId, cameraName) {
    return new Promise((resolve, reject) => {
        const camHost = window.location.hostname || '127.0.0.1';
        const wsUrl = `ws://${camHost}:18901/ws/webrtc?channel=${encodeURIComponent(channel)}&camera=${encodeURIComponent(cameraName || '0')}`;
        const ws = new WebSocket(wsUrl);
        camWS = ws;

        let settled = false;
        const connTimeout = setTimeout(() => {
            if (!settled && ws === camWS && ws.readyState !== WebSocket.OPEN) {
                settled = true;
                reject(new Error('Camera service WebSocket timeout'));
            }
        }, 5000);

        ws.onopen = () => {
            clearTimeout(connTimeout);
            if (ws !== camWS) return;

            const pc = new RTCPeerConnection({
                iceServers: [],
                iceCandidatePoolSize: 0,
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            });
            camPC = pc;

            pc.ontrack = (event) => {
                if (pc !== camPC) return;
                if (event.streams && event.streams[0]) {
                    currentStream = event.streams[0];
                    videoEl.srcObject = currentStream;
                    videoEl.onloadedmetadata = () => {
                        videoEl.play().catch(e => console.error("Play error:", e));
                    };
                    if (!settled) {
                        settled = true;
                        resolve(true);
                    }
                }
            };

            pc.onconnectionstatechange = () => {
                if (pc !== camPC) return;
                if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
                    console.warn('[CAM] WebRTC state:', pc.connectionState);
                    stopStream();
                    scheduleRetry(deviceId);
                }
            };
        };

        ws.onmessage = async (event) => {
            try {
                if (ws !== camWS || !camPC) return;
                const offer = JSON.parse(event.data);
                if (offer.type === 'error') {
                    throw new Error(offer.message || 'Camera service error');
                }
                await camPC.setRemoteDescription(offer);
                const answer = await camPC.createAnswer();
                await camPC.setLocalDescription(answer);
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify(camPC.localDescription));
                }
            } catch (err) {
                if (!settled) {
                    settled = true;
                    reject(err);
                }
            }
        };

        ws.onerror = () => {
            clearTimeout(connTimeout);
            if (!settled) {
                settled = true;
                reject(new Error('Camera service WebSocket error'));
            }
        };

        ws.onclose = () => {
            clearTimeout(connTimeout);
            if (!settled) {
                settled = true;
                reject(new Error('Camera service WebSocket closed'));
            }
        };
    });
}

async function resolveBrowserDeviceId(ffmpegName) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return null;
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videos = devices.filter(d => d.kind === 'videoinput');
        const target = normalizeCameraLabel(ffmpegName);
        if (!target) return videos[0] ? videos[0].deviceId : null;
        const match = videos.find(d => {
            const lbl = normalizeCameraLabel(d.label);
            return lbl === target || (lbl && (lbl.includes(target) || target.includes(lbl)));
        });
        return match ? match.deviceId : (videos[0] ? videos[0].deviceId : null);
    } catch (_) {
        return null;
    }
}

async function startStream(deviceId) {
    if (!deviceId) return;
    if ((currentStream || camPC) && currentDeviceId === deviceId) return;

    stopStream();

    const ffmpegName = parseFFmpegCameraName(deviceId);
    if (ffmpegName !== null) {
        try {
            await startWebRTCStream(deviceId, ffmpegName);
            return;
        } catch (webrtcErr) {
            console.warn('[CAM] camera-service WebRTC failed, falling back to getUserMedia:', webrtcErr.message);
            cleanupWebRTC();
        }
    }

    try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('navigator.mediaDevices.getUserMedia unavailable');
        }
        let targetBrowserId = deviceId;
        if (ffmpegName !== null) {
            targetBrowserId = await resolveBrowserDeviceId(ffmpegName);
        }
        const videoConstraints = {
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        };
        if (targetBrowserId) {
            videoConstraints.deviceId = { exact: targetBrowserId };
        }
        currentStream = await navigator.mediaDevices.getUserMedia({ video: videoConstraints });
        videoEl.srcObject = currentStream;
        videoEl.onloadedmetadata = () => {
            videoEl.play().catch(e => console.error("Play error:", e));
        };
    } catch (err) {
        console.error("Error accessing camera:", err);
        scheduleRetry(deviceId);
    }
}

function cleanupWebRTC() {
    if (camWS) {
        camWS.onopen = null;
        camWS.onclose = null;
        camWS.onerror = null;
        camWS.onmessage = null;
        if (camWS.readyState === WebSocket.OPEN || camWS.readyState === WebSocket.CONNECTING) {
            camWS.close();
        }
        camWS = null;
    }
    if (camPC) {
        camPC.ontrack = null;
        camPC.onconnectionstatechange = null;
        camPC.close();
        camPC = null;
    }
}

function stopStream() {
    if (retryTimer) {
        clearTimeout(retryTimer);
        retryTimer = null;
    }
    cleanupWebRTC();
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    videoEl.srcObject = null;
}

// Fetch initial state
fetch('/api/camera/settings')
    .then(res => res.json())
    .then(state => updateState(state[channel]));

connectWS();
