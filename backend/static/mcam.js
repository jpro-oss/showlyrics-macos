
const videoEl = document.getElementById('video-el');
let currentStream = null;
let currentDeviceId = null;
let currentFit = 'fill';
let isVisible = false;
let lastMaskImage = null;

const channel = 'main'; // This is 'main' for main_cam.html and 'audience' for audience_cam.html

function connectWS() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'update_camera_state') {
            updateState(data.state[channel]);
        }
    };

    ws.onclose = () => {
        setTimeout(connectWS, 2000);
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
    if (device_id !== currentDeviceId || (show && !currentStream)) {
        currentDeviceId = device_id;
        if (isVisible && device_id) {
            await startStream(device_id);
        }
    }
}

async function startStream(deviceId) {
    if (!deviceId) return;
    if (currentStream && currentDeviceId === deviceId) return;

    stopStream();

    try {
        const constraints = {
            video: {
                deviceId: { exact: deviceId },
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };
        currentStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoEl.srcObject = currentStream;
        videoEl.onloadedmetadata = () => {
            videoEl.play().catch(e => console.error("Play error:", e));
        };
    } catch (err) {
        console.error("Error accessing camera:", err);
        // Retry after delay if it failed while show is true
        if (isVisible) {
            setTimeout(() => startStream(deviceId), 3000);
        }
    }
}

function stopStream() {
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
        videoEl.srcObject = null;
    }
}

// Fetch initial state
fetch('/api/camera/settings')
    .then(res => res.json())
    .then(state => updateState(state[channel]));

connectWS();
