let bgDatabase = { folders: [], videos: {} };
let currentActiveFolder = "ALL";
let currentActiveSender = null;
window.remoteLivePhotoId = null;
window.activeRemoteSenderIp = null;

// ==========================================
// 📦 MULTI-SELECT MEDIA STATE & HELPERS
// ==========================================
window.selectedMediaIds = new Set();
window.lastSelectedMediaId = null;

function clearMediaSelection() {
    if (!window.selectedMediaIds) window.selectedMediaIds = new Set();
    window.selectedMediaIds.clear();
    window.lastSelectedMediaId = null;
    const grid = document.getElementById("bg-grid-container");
    if (grid) {
        grid.classList.remove("has-selection");
        grid.classList.remove("multi-selection");
        grid.querySelectorAll(".bg-media-card").forEach(card => {
            card.classList.remove("selected");
            card.draggable = true;
        });
        grid.querySelectorAll(".bg-media-select-btn.active").forEach(btn => {
            btn.classList.remove("active");
            btn.innerText = "";
        });
    }
}
window.clearMediaSelection = clearMediaSelection;

function updateMediaSelectionUI() {
    const grid = document.getElementById("bg-grid-container");
    if (!grid) return;
    const count = window.selectedMediaIds.size;
    const isMulti = count > 1;
    if (count > 0) {
        grid.classList.add("has-selection");
    } else {
        grid.classList.remove("has-selection");
        window.lastSelectedMediaId = null;
    }
    if (isMulti) {
        grid.classList.add("multi-selection");
    } else {
        grid.classList.remove("multi-selection");
    }
    grid.querySelectorAll(".bg-media-card").forEach(card => {
        const id = card.getAttribute("data-media-id");
        const btn = card.querySelector(".bg-media-select-btn");
        card.draggable = !isMulti;
        if (id && window.selectedMediaIds.has(id)) {
            card.classList.add("selected");
            if (btn) {
                btn.classList.add("active");
                btn.innerText = "✓";
            }
        } else {
            card.classList.remove("selected");
            if (btn) {
                btn.classList.remove("active");
                btn.innerText = "";
            }
        }
    });
}
window.updateMediaSelectionUI = updateMediaSelectionUI;

function rangeSelectMedia(targetId, itemsList) {
    if (!itemsList || itemsList.length === 0) return;
    if (!window.lastSelectedMediaId) {
        window.selectedMediaIds.add(targetId);
        window.lastSelectedMediaId = targetId;
        updateMediaSelectionUI();
        return;
    }
    const ids = itemsList.map(item => item.id);
    const startIdx = ids.indexOf(window.lastSelectedMediaId);
    const endIdx = ids.indexOf(targetId);
    if (startIdx === -1 || endIdx === -1) {
        window.selectedMediaIds.add(targetId);
        window.lastSelectedMediaId = targetId;
        updateMediaSelectionUI();
        return;
    }
    const min = Math.min(startIdx, endIdx);
    const max = Math.max(startIdx, endIdx);
    for (let i = min; i <= max; i++) {
        window.selectedMediaIds.add(ids[i]);
    }
    window.lastSelectedMediaId = targetId;
    updateMediaSelectionUI();
}
window.rangeSelectMedia = rangeSelectMedia;

document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && window.selectedMediaIds && window.selectedMediaIds.size > 0) {
        clearMediaSelection();
    }
});


let mediaSortKey = localStorage.getItem("mediaSortKey") || "name";
let mediaSortOrder = localStorage.getItem("mediaSortOrder") || "asc";

function changeMediaSort(val) {
    const parts = val.split('_');
    mediaSortKey = parts[0];
    mediaSortOrder = parts[1];
    localStorage.setItem("mediaSortKey", mediaSortKey);
    localStorage.setItem("mediaSortOrder", mediaSortOrder);

    renderMediaGrid();
    if (typeof bgDatabase !== 'undefined' && bgDatabase.videos && Object.keys(bgDatabase.videos).length > 0) {
        renderBgGrid(currentActiveFolder);
    }
}
window.changeMediaSort = changeMediaSort;

function toggleBgLibrary() {
    const content = document.getElementById("bg-library-content");
    const icon = document.getElementById("bg-toggle-icon");
    const resizer = document.getElementById("bg-library-resizer");
    const subBar = document.getElementById("bg-sub-toggle-bar");

    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "flex";
        if (resizer) resizer.style.display = "block";
        if (subBar) {
            const isMedia = ['video', 'audio', 'photo', 'presentation'].includes(currentMediaCategory);
            subBar.style.display = isMedia ? "flex" : "none";
        }
        icon.innerText = "▼ COLLAPSE";

        if (currentMediaCategory === 'scripture') {
            // Pastikan scripture panel terlihat saat expand
            const mediaPanel = document.getElementById("bg-media-panel");
            const scrPanel = document.getElementById("scr-lib-panel");
            if (mediaPanel) mediaPanel.style.display = "none";
            if (scrPanel) scrPanel.style.display = "flex";
            if (typeof loadBibleTranslations === 'function') loadBibleTranslations();
            if (typeof window.setNavigationTarget === 'function') window.setNavigationTarget('scripture');
        } else {
            // Load media biasa jika belum ada data
            if (!mediaDatabase.folders || mediaDatabase.folders.length === 0) {
                loadMediaData(currentMediaCategory);
            }
        }
    } else {
        content.style.display = "none";
        if (resizer) resizer.style.display = "none";
        if (subBar) subBar.style.display = "none";
        icon.innerText = "▲ EXPAND";
        if (typeof window.setNavigationTarget === 'function') window.setNavigationTarget('lyrics');
    }
}
window.toggleBgLibrary = toggleBgLibrary;

async function setupBgLibraryResizer() {
    const content = document.getElementById("bg-library-content");
    const resizer = document.getElementById("bg-library-resizer");
    if (!content || !resizer) return;

    // Dynamic bounds: Min 15% of screen height (at least 250px), Max 40% of screen height (at least 500px)
    const getBgBounds = () => ({
        min: Math.max(150, Math.round(window.innerHeight * 0.15)),
        max: Math.max(550, Math.round(window.innerHeight * 0.40))
    });

    const clampHeight = (val) => {
        const { min, max } = getBgBounds();
        return Math.min(Math.max(val, min), max);
    };

    // Load last saved height from settings
    try {
        const res = await fetch('/api/settings');
        if (res.ok) {
            const settings = await res.json();
            if (settings.bg_library_height) {
                const savedHeight = parseInt(settings.bg_library_height);
                content.style.height = `${clampHeight(savedHeight)}px`;
            } else {
                // Apply dynamic default (~20% of viewport)
                content.style.height = `${clampHeight(Math.round(window.innerHeight * 0.20))}px`;
            }
        }
    } catch (err) {
        console.warn("Failed to load bg library height:", err);
    }

    // Dragging logic
    let isDragging = false;
    let startY = 0;
    let startHeight = 0;
    let animationFrameId = null;

    resizer.addEventListener('mousedown', (e) => {
        // Double check display state
        if (content.style.display === "none" || content.style.display === "") return;
        e.preventDefault();
        isDragging = true;
        startY = e.clientY;
        startHeight = content.offsetHeight;
        document.body.classList.add('bg-library-resizing');
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        animationFrameId = requestAnimationFrame(() => {
            const newHeight = startHeight - (e.clientY - startY);
            content.style.height = `${clampHeight(newHeight)}px`;
        });
    });

    document.addEventListener('mouseup', async () => {
        if (!isDragging) return;
        isDragging = false;
        document.body.classList.remove('bg-library-resizing');

        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
        }

        // Save to settings
        const finalHeight = content.offsetHeight;
        try {
            await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bg_library_height: finalHeight })
            });
        } catch (err) {
            console.warn("Failed to save bg library height:", err);
        }
    });

    // Re-clamp on window resize
    window.addEventListener('resize', () => {
        const currentHeight = content.offsetHeight;
        const clamped = clampHeight(currentHeight);
        if (clamped !== currentHeight) {
            content.style.height = `${clamped}px`;
        }
    });
}


// Fungsi baru buat nembak API Tkinter di main.py
async function openNativeFolderPicker() {
    showToast("Opening Folder Dialog...", "loading"); // Kasih indikator biar VJ tau lagi loading

    try {
        const res = await fetch('/api/browse_folder_dialog');
        const data = await res.json();

        if (data.status === "success" && data.path) {
            // Kalau VJ udah milih folder dan klik OK
            if (currentMediaCategory === 'video' || currentMediaCategory === 'photo' || currentMediaCategory === 'audio' || currentMediaCategory === 'presentation') {
                addMediaFolderProcess(data.path);
            } else {
                addBgFolderProcess(data.path);
            }
        } else {
            // Kalau VJ klik Cancel / Silang di jendela Windows
            showToast("Folder selection canceled", "info", 1500);
        }
    } catch (err) {
        showToast("Failed to open folder dialog", "error", 2000);
    }
}

async function addBgFolderProcess(path) {
    showToast("Scanning & Generating Thumbnail...", "loading");
    try {
        const res = await fetch(`/api/backgrounds/add_folder?folder_path=${encodeURIComponent(path)}`, { method: 'POST' });
        const data = await res.json();

        if (data.status === "success") {
            showToast(data.message, "success", 3000);

            if (Array.isArray(data.created_ids) && data.created_ids.length > 0 && typeof window.startThumbRealtimeWatcher === "function") {
                window.startThumbRealtimeWatcher(data.created_ids, "video");
            }

            setTimeout(async () => {
                await loadMediaData(currentMediaCategory);
            }, 1000);

        } else {
            showToast(data.message, "error", 3000);
        }
    } catch (e) {
        showToast("Server error", "error", 3000);
    }
}

async function addMediaFolderProcess(path) {
    showToast("Scanning & Processing Folder...", "loading");
    try {
        const res = await fetch(`/api/media/${currentMediaCategory}/add_folder?folder_path=${encodeURIComponent(path)}`, { method: 'POST' });
        const data = await res.json();

        if (data.status === "success") {
            showToast(data.message, "success", 3000);

            if (Array.isArray(data.created_ids) && data.created_ids.length > 0 && typeof window.startThumbRealtimeWatcher === "function") {
                if (currentMediaCategory === 'video' || currentMediaCategory === 'photo') {
                    window.startThumbRealtimeWatcher(data.created_ids, currentMediaCategory);
                }
            }

            setTimeout(async () => {
                await loadMediaData(currentMediaCategory);
            }, 1000);

        } else {
            showToast(data.message, "error", 3000);
        }
    } catch (e) {
        showToast("Server error", "error", 3000);
    }
}

async function loadBgLibrary() {
    try {
        const res = await fetch('/api/backgrounds');
        bgDatabase = await res.json();
        if (!bgDatabase.folders) bgDatabase = { folders: [], videos: {} };

        renderFolderList();
        renderBgGrid(currentActiveFolder);
    } catch (e) { console.error("Failed to load background library", e); }
}

function renderFolderList() {
    const list = document.getElementById('bg-folder-list');
    list.innerHTML = "";
    list.innerHTML += `<div class="bg-folder-item ${currentActiveFolder === 'ALL' ? 'active' : ''}" onclick="filterBgGrid('ALL')">🌍 All Videos</div>`;

    bgDatabase.folders.forEach(folder => {
        const isActive = currentActiveFolder === folder ? 'active' : '';
        list.innerHTML += `<div class="bg-folder-item ${isActive}" onclick="filterBgGrid('${folder}')" oncontextmenu="showFolderContextMenu(event, '${folder}')" title="${folder}">📂 ${folder}</div>`;
    });
}

function filterBgGrid(folder) {
    currentActiveFolder = folder;
    const folderFilter = currentActiveFolder;
    const title = document.getElementById("bg-active-folder-name");
    title.innerText = folderFilter === "ALL" ? "🌍 All Videos" : `📂 ${folderFilter.split('/').pop()}`;

    renderBgGrid(folder);
    renderFolderList();
}

function renderBgGrid(folderFilter) {
    const grid = document.getElementById("bg-grid-container");
    const title = document.getElementById("bg-active-folder-name");
    if (!grid) return;
    grid.innerHTML = "";

    title.innerText = folderFilter === "ALL" ? "🌍 All Videos" : `📂 ${folderFilter.split('/').pop()}`;

    // Sync dropdown select value
    const sortSelect = document.getElementById("media-sort-select");
    if (sortSelect) {
        sortSelect.value = `${mediaSortKey}_${mediaSortOrder}`;
    }

    const itemsArray = [];
    for (const [id, bg] of Object.entries(bgDatabase.videos || {})) {
        if (folderFilter !== "ALL" && bg.folder !== folderFilter) continue;
        itemsArray.push({
            id: id,
            name: bg.name,
            folder: bg.folder,
            mtime: bg.mtime || 0
        });
    }

    // Sort itemsArray
    itemsArray.sort((a, b) => {
        let compare = 0;
        if (mediaSortKey === 'date') {
            compare = (a.mtime || 0) - (b.mtime || 0);
        } else {
            compare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
        }
        return mediaSortOrder === 'desc' ? -compare : compare;
    });

    itemsArray.forEach(bg => {
        const card = document.createElement("div");
        card.style.cssText = "background: #222; border: 1px solid #444; border-radius: 4px; overflow: hidden; cursor: grab; position: relative;";
        card.draggable = true;

        card.innerHTML = `
            <img src="/thumbs/${bg.id}" onerror="this.src='/static/logo.png'" style="width: 100%; height: 65px; object-fit: cover; display: block; pointer-events: none;">
            <div style="padding: 5px; font-size: 0.65em; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: #aaa;" title="${bg.name}">${bg.name}</div>
        `;

        card.oncontextmenu = (e) => showLibraryContextMenu(e, bg.id, bg.name, 'video');

        card.ondragstart = (e) => {
            e.dataTransfer.setData("text/plain", JSON.stringify({ action: "apply_bg", id: bg.id }));
            card.style.opacity = "0.5";
        };
        card.ondragend = () => card.style.opacity = "1";

        grid.appendChild(card);
    });
}

function previewBgVideo(id, name) {
    closeBgPreview(); // Force cleanup of any previous decoders first!
    document.getElementById("bg-preview-title").innerText = "Preview Video - " + name;
    const container = document.getElementById("bg-video-container");
    container.innerHTML = `<video id="bg-video-preview-el" src="/api/stream_video/${id}" style="max-height: 70vh; max-width: 90vw;" autoplay loop controls></video>`;
    document.getElementById("bg-preview-modal").style.display = "flex";

    const vidEl = document.getElementById("bg-video-preview-el");
    if (vidEl && typeof window.applyMonitorRouting === 'function') {
        window.applyMonitorRouting(vidEl);
    }
}

function previewBgAudio(id, name) {
    closeBgPreview(); // Force cleanup first
    document.getElementById("bg-preview-title").innerText = "Preview Audio - " + name;
    const container = document.getElementById("bg-video-container");
    container.innerHTML = `
        <div style="padding:40px; display:flex; flex-direction:column; align-items:center; gap:20px; background:#121218; width:450px; max-width:90vw; border-radius:10px;">
            <div style="font-size:4em; animation: audioDiscSpin 6s linear infinite;">🎵</div>
            <audio id="bg-audio-preview-el" src="/api/stream_audio/${id}" style="width:100%;" autoplay controls loop></audio>
        </div>`;
    document.getElementById("bg-preview-modal").style.display = "flex";

    // Route to monitor device if enabled
    const audioEl = document.getElementById("bg-audio-preview-el");
    if (audioEl && window._audioMonitorEnabled && window._audioMonitorDeviceId && window._audioMonitorDeviceId !== 'default') {
        if (audioEl.setSinkId) {
            audioEl.setSinkId(window._audioMonitorDeviceId).catch(() => {});
        }
    }
}
window.previewBgAudio = previewBgAudio;

// CSS animation style for spinning disc in preview modal
if (!document.getElementById("preview-audio-anim")) {
    const style = document.createElement("style");
    style.id = "preview-audio-anim";
    style.textContent = `
        @keyframes audioDiscSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(style);
}

function closeBgPreview() {
    document.getElementById("bg-preview-modal").style.display = "none";
    const container = document.getElementById("bg-video-container");

    const vid = container.querySelector('video');
    if (vid) {
        vid.pause();
        vid.src = ""; // Reset src to empty to stop active download/decode streams
        vid.removeAttribute('src');
        try {
            vid.load(); // Force browser to cancel pending loads and release GPU decoders
        } catch (_) {}
    }

    const aud = container.querySelector('audio');
    if (aud) {
        aud.pause();
        aud.src = "";
        aud.removeAttribute('src');
        try {
            aud.load();
        } catch (_) {}
    }

    container.innerHTML = "";
}

// ==========================================
// 📷 PHOTO PREVIEW MODAL (FULLSCREEN + ZOOM/PAN)
// ==========================================
let photoPreviewList = [];
let photoPreviewIndex = 0;
let photoZoomScale = 1;
let photoPanX = 0;
let photoPanY = 0;
let isPhotoDragging = false;
let photoDragMoved = false;
let photoDragStartX = 0;
let photoDragStartY = 0;
let photoPanOriginX = 0;
let photoPanOriginY = 0;
let photoSuppressBackdropClick = false;
let photoPreviewBound = false;

function isPhotoPreviewOpen() {
    const modal = document.getElementById("photo-preview-modal");
    return Boolean(modal && modal.classList.contains("show-flex"));
}

function clampPhotoPan(panX, panY, scale) {
    const stage = document.getElementById("photo-preview-stage");
    const img = document.getElementById("photo-preview-img");
    if (!stage || !img || scale <= 1) return { x: 0, y: 0 };

    const maxX = Math.max(0, (img.clientWidth * scale - stage.clientWidth) / 2);
    const maxY = Math.max(0, (img.clientHeight * scale - stage.clientHeight) / 2);
    return {
        x: Math.max(-maxX, Math.min(maxX, panX)),
        y: Math.max(-maxY, Math.min(maxY, panY))
    };
}

function applyPhotoTransform() {
    const img = document.getElementById("photo-preview-img");
    const label = document.getElementById("photo-zoom-label");
    if (img) {
        img.style.transform = `translate(${photoPanX}px, ${photoPanY}px) scale(${photoZoomScale})`;
        img.classList.toggle("is-zoomed", photoZoomScale > 1);
    }
    if (label) {
        label.innerText = `${Math.round(photoZoomScale * 100)}%`;
    }
}

window.resetPhotoZoom = function () {
    photoZoomScale = 1;
    photoPanX = 0;
    photoPanY = 0;
    applyPhotoTransform();
};

window.zoomPhotoPreview = function (delta) {
    const nextScale = Math.max(1, Math.min(5, Math.round((photoZoomScale + delta) * 100) / 100));
    photoZoomScale = nextScale;
    const clamped = clampPhotoPan(photoPanX, photoPanY, photoZoomScale);
    photoPanX = clamped.x;
    photoPanY = clamped.y;
    applyPhotoTransform();
};

function updatePhotoPreviewUI() {
    const item = photoPreviewList[photoPreviewIndex];
    if (!item) return;

    const titleEl = document.getElementById("photo-preview-title");
    const counterEl = document.getElementById("photo-preview-counter");
    const prevBtn = document.getElementById("photo-preview-prev");
    const nextBtn = document.getElementById("photo-preview-next");
    const imgEl = document.getElementById("photo-preview-img");

    if (titleEl) titleEl.innerText = "Preview: " + item.name;
    if (counterEl) counterEl.innerText = `Photo ${photoPreviewIndex + 1} / ${photoPreviewList.length}`;
    if (prevBtn) prevBtn.disabled = photoPreviewIndex <= 0;
    if (nextBtn) nextBtn.disabled = photoPreviewIndex >= photoPreviewList.length - 1;

    window.resetPhotoZoom();

    if (imgEl) {
        imgEl.onerror = () => {
            if (!imgEl.src.endsWith("/static/logo.png")) {
                imgEl.src = "/static/logo.png";
            }
        };
        imgEl.src = `/api/stream_photo/${item.id}`;
    }
}

function bindPhotoPreviewInteractions() {
    if (photoPreviewBound) return;
    photoPreviewBound = true;

    const stage = document.getElementById("photo-preview-stage");
    const img = document.getElementById("photo-preview-img");

    if (stage) {
        stage.addEventListener("wheel", (e) => {
            if (!isPhotoPreviewOpen()) return;
            e.preventDefault();
            window.zoomPhotoPreview(e.deltaY < 0 ? 0.25 : -0.25);
        }, { passive: false });
    }

    if (img) {
        img.addEventListener("dblclick", (e) => {
            if (!isPhotoPreviewOpen()) return;
            e.preventDefault();
            if (photoZoomScale > 1) {
                window.resetPhotoZoom();
            } else {
                photoZoomScale = 2;
                photoPanX = 0;
                photoPanY = 0;
                applyPhotoTransform();
            }
        });

        img.addEventListener("mousedown", (e) => {
            if (!isPhotoPreviewOpen() || photoZoomScale <= 1 || e.button !== 0) return;
            e.preventDefault();
            isPhotoDragging = true;
            photoDragMoved = false;
            photoDragStartX = e.clientX;
            photoDragStartY = e.clientY;
            photoPanOriginX = photoPanX;
            photoPanOriginY = photoPanY;
            img.classList.add("is-dragging");
        });
    }

    window.addEventListener("mousemove", (e) => {
        if (!isPhotoDragging) return;
        const dx = e.clientX - photoDragStartX;
        const dy = e.clientY - photoDragStartY;
        if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
            photoDragMoved = true;
        }
        const clamped = clampPhotoPan(photoPanOriginX + dx, photoPanOriginY + dy, photoZoomScale);
        photoPanX = clamped.x;
        photoPanY = clamped.y;
        applyPhotoTransform();
    });

    window.addEventListener("mouseup", () => {
        if (!isPhotoDragging) return;
        isPhotoDragging = false;
        const imgEl = document.getElementById("photo-preview-img");
        if (imgEl) imgEl.classList.remove("is-dragging");
        if (photoDragMoved) {
            photoSuppressBackdropClick = true;
            setTimeout(() => { photoSuppressBackdropClick = false; }, 0);
        }
    });

    // Capture phase prevents global lyric/scripture/selection handlers from reacting while modal is open
    window.addEventListener("keydown", (e) => {
        if (!isPhotoPreviewOpen()) return;

        if (e.key === "Escape") {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.closePhotoPreview();
        } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.prevPhotoPreview();
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.nextPhotoPreview();
        } else if (e.key === "+" || e.key === "=") {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.zoomPhotoPreview(0.25);
        } else if (e.key === "-" || e.key === "_") {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.zoomPhotoPreview(-0.25);
        } else if (e.key === "0") {
            e.preventDefault();
            e.stopImmediatePropagation();
            window.resetPhotoZoom();
        }
    }, true);
}

window.openPhotoPreview = function (mediaId, mediaName) {
    bindPhotoPreviewInteractions();

    const items = getFilteredSortedMediaItems();
    const idx = items.findIndex(item => item.id === mediaId);
    if (idx !== -1) {
        photoPreviewList = items.map(item => ({ id: item.id, name: item.name }));
        photoPreviewIndex = idx;
    } else {
        photoPreviewList = [{ id: mediaId, name: mediaName }];
        photoPreviewIndex = 0;
    }

    const modal = document.getElementById("photo-preview-modal");
    if (modal) modal.classList.add("show-flex");
    updatePhotoPreviewUI();
};

window.closePhotoPreview = function () {
    const modal = document.getElementById("photo-preview-modal");
    if (modal) modal.classList.remove("show-flex");

    isPhotoDragging = false;
    photoDragMoved = false;
    window.resetPhotoZoom();

    const imgEl = document.getElementById("photo-preview-img");
    if (imgEl) {
        imgEl.onerror = null;
        imgEl.classList.remove("is-dragging");
        imgEl.src = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        imgEl.removeAttribute("src");
    }

    photoPreviewList = [];
    photoPreviewIndex = 0;
};

window.prevPhotoPreview = function () {
    if (photoPreviewIndex > 0) {
        photoPreviewIndex--;
        updatePhotoPreviewUI();
    }
};

window.nextPhotoPreview = function () {
    if (photoPreviewIndex < photoPreviewList.length - 1) {
        photoPreviewIndex++;
        updatePhotoPreviewUI();
    }
};

window.handlePhotoPreviewBackdropClick = function (e) {
    if (photoSuppressBackdropClick) return;
    const modal = document.getElementById("photo-preview-modal");
    if (e.target === modal || (e.target && e.target.classList && e.target.classList.contains("photo-preview-content"))) {
        window.closePhotoPreview();
    }
};

function _updateAudioCardBtn(mediaId, isPlaying) {
    const btn = document.getElementById(`audio-prev-btn-${mediaId}`);
    if (!btn) return;
    btn.innerText = isPlaying ? '⏹' : '▶';
    btn.classList.toggle('playing', isPlaying);
}

async function createVirtualFolder() {
    const folderName = await showCustomDialog("prompt", `New ${currentMediaCategory.toUpperCase()} Folder Name:`);
    if (!folderName) return;

    try {
        const res = await fetch(`/api/media/${currentMediaCategory}/create_folder`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_name: folderName })
        });
        const data = await res.json();

        if (data.status === "success") {
            showToast(data.message, "success", 1500);
            loadMediaData(currentMediaCategory);
        } else {
            showToast(data.message, "error", 2000);
        }
    } catch (e) { console.error(e); }
}

async function openNativeFilePicker() {
    showToast(`Opening Windows Explorer...`, "loading");
    try {
        const res = await fetch(`/api/browse_file_dialog/${currentMediaCategory}`);
        const data = await res.json();

        if (data.status === "success" && data.files && data.files.length > 0) {
            addMediaFilesProcess(data.files);
        } else {
            showToast("File selection canceled", "info", 1500);
        }
    } catch (err) {
        showToast("Failed to open dialog", "error", 2000);
    }
}

async function addMediaFilesProcess(files) {
    showToast(`Importing ${files.length} files...`, "loading");

    const payload = {
        folder_name: currentActiveFolder,
        files: files
    };

    try {
        const res = await fetch(`/api/media/${currentMediaCategory}/add_files`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json();

        if (data.status === "success") {
            showToast(data.message, "success", 2000);

            if ((currentMediaCategory === "video" || currentMediaCategory === "photo") && Array.isArray(data.created_ids) && data.created_ids.length > 0 && typeof window.startThumbRealtimeWatcher === "function") {
                window.startThumbRealtimeWatcher(data.created_ids, currentMediaCategory);
            }

            loadMediaData(currentMediaCategory);
        } else {
            showToast(data.message, "error", 2000);
        }
    } catch (e) { console.error(e); }
}

function positionContextMenu(menu, x, y) {
    const margin = 10;
    const vH = window.innerHeight;
    const vW = window.innerWidth;

    menu.style.visibility = "hidden";
    menu.style.display = "block";
    menu.style.maxHeight = `${vH - (margin * 2)}px`;
    menu.style.overflowY = "auto";

    menu.style.left = "0px";
    menu.style.top = "0px";
    menu.style.bottom = "auto";
    menu.style.right = "auto";

    requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect();

        if (x + rect.width > vW - margin) {
            menu.style.left = "auto";
            menu.style.right = margin + "px";
        } else {
            menu.style.left = Math.max(margin, x) + "px";
            menu.style.right = "auto";
        }

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

function showFolderContextMenu(e, folderName) {
    if (folderName === "ALL") return;
    e.preventDefault();
    const oldMenu = document.getElementById("folder-context-menu");
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement("div");
    menu.id = "folder-context-menu";
    menu.className = "grid-context-menu";

    const btnRename = document.createElement("div");
    btnRename.id = "folder-ctx-rename";
    btnRename.className = "grid-context-menu-item";
    btnRename.innerHTML = "✏️ Rename Folder";
    btnRename.onclick = async () => {
        menu.remove();
        const newName = await showCustomDialog("prompt", "New folder name:", folderName);
        if (newName && newName !== folderName) {
            await fetch(`/api/media/${currentMediaCategory}/rename_folder`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ old_name: folderName, new_name: newName }) });
            loadMediaData(currentMediaCategory);
        }
    };
    menu.appendChild(btnRename);

    const btnDel = document.createElement("div");
    btnDel.id = "folder-ctx-delete";
    btnDel.className = "grid-context-menu-item grid-context-menu-danger";
    btnDel.innerHTML = "🗑️ Delete Folder";
    btnDel.onclick = async () => {
        menu.remove();
        const isOk = await showCustomDialog("confirm", `Delete folder ${folderName} and all its contents?`);
        if (isOk) {
            await fetch(`/api/media/${currentMediaCategory}/folder/${encodeURIComponent(folderName)}`, { method: 'DELETE' });
            currentActiveFolder = "ALL";
            loadMediaData(currentMediaCategory);
        }
    };
    menu.appendChild(btnDel);

    document.body.appendChild(menu);
    positionContextMenu(menu, e.clientX, e.clientY);
    setTimeout(() => { document.addEventListener("click", function close() { if (menu) menu.remove(); document.removeEventListener("click", close); }); }, 10);
}

function showLibraryContextMenu(e, mediaId, mediaName, category) {
    const oldMenu = document.getElementById("lib-context-menu");
    if (oldMenu) oldMenu.remove();

    const menu = document.createElement("div");
    menu.id = "lib-context-menu";
    menu.className = "grid-context-menu";

    if (category === 'presentation') {
        const btnLive = document.createElement("div");
        btnLive.id = "media-ctx-live";
        btnLive.className = "grid-context-menu-item grid-context-menu-live";
        btnLive.innerHTML = "📊 OPEN SLIDE SHOW (FORCE GRID)";
        btnLive.onclick = () => { menu.remove(); window.loadPPTToGrid(mediaId, mediaName); };
        menu.appendChild(btnLive);

        const btnPrev = document.createElement("div");
        btnPrev.className = "grid-context-menu-item";
        btnPrev.innerHTML = "👁️ Preview PPT";
        btnPrev.onclick = () => { menu.remove(); window.openPPTPreview(mediaId, mediaName); };
        menu.appendChild(btnPrev);

        const btnSched = document.createElement("div");
        btnSched.className = "grid-context-menu-item";
        btnSched.innerHTML = "📝 Add to Schedule";
        btnSched.onclick = () => { menu.remove(); window.addPPTToSchedule(mediaId, mediaName); };
        menu.appendChild(btnSched);
    }
    else {
        const btnLive = document.createElement("div");
        btnLive.id = "media-ctx-live";
        btnLive.className = "grid-context-menu-item grid-context-menu-live";
        const ikon = category === 'audio' ? '🎵' : (category === 'photo' ? '📷' : '🎬');
        btnLive.innerHTML = `${ikon} SHOW NOW`;
        btnLive.onclick = () => { menu.remove(); fireDirectLiveMedia(mediaId, mediaName, category); };
        menu.appendChild(btnLive);

        if (category === 'video') {
            const btnPreview = document.createElement("div");
            btnPreview.className = "grid-context-menu-item";
            btnPreview.innerHTML = "👁️ Preview Video";
            btnPreview.onclick = () => { menu.remove(); previewBgVideo(mediaId, mediaName); };
            menu.appendChild(btnPreview);
        }

        if (category === 'audio') {
            const btnAudioPrev = document.createElement("div");
            btnAudioPrev.className = "grid-context-menu-item";
            btnAudioPrev.innerHTML = "🎵 Preview Audio";
            btnAudioPrev.onclick = () => { menu.remove(); previewBgAudio(mediaId, mediaName); };
            menu.appendChild(btnAudioPrev);
        }

        if (category === 'photo') {
            const btnPhotoPrev = document.createElement("div");
            btnPhotoPrev.className = "grid-context-menu-item";
            btnPhotoPrev.innerHTML = "👁️ Preview Photo";
            btnPhotoPrev.onclick = () => { menu.remove(); window.openPhotoPreview(mediaId, mediaName); };
            menu.appendChild(btnPhotoPrev);
        }

        const btnSched = document.createElement("div");
        btnSched.className = "grid-context-menu-item";
        btnSched.innerHTML = "📝 Add to Schedule";
        btnSched.onclick = () => { menu.remove(); window.addMediaToSchedule(category, mediaId, mediaName); };
        menu.appendChild(btnSched);
    }

    const btnRename = document.createElement("div");
    btnRename.id = "media-ctx-rename";
    btnRename.className = "grid-context-menu-item";
    btnRename.innerHTML = "✏️ Rename File";
    btnRename.onclick = async () => {
        menu.remove();
        const newName = await showCustomDialog("prompt", "Enter new name:", mediaName);
        if (newName && newName !== mediaName) {
            const res = await fetch(`/api/media/${category}/rename_file/${mediaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_name: newName })
            });
            if (res.ok) {
                loadMediaData(category);
            }
        }
    };
    menu.appendChild(btnRename);

    const btnMove = document.createElement("div");
    btnMove.className = "grid-context-menu-item";
    btnMove.innerHTML = "📁 Move to Folder...";
    btnMove.onclick = async () => {
        menu.remove();
        const currentItem = mediaDatabase.items[mediaId];
        const currentFolder = (currentItem && currentItem.folder) ? currentItem.folder : "Uncategorized";
        let options = mediaDatabase.folders.map(f => ({ value: f, label: `📁 ${f}` }));
        options.unshift({ value: "Uncategorized", label: "🌍 Uncategorized (Remove from folder)" });

        const targetFolder = await showCustomDialog("select", `Move <b style="color:#00e5ff;">${mediaName}</b> to folder:`, options, currentFolder);
        if (targetFolder && targetFolder !== currentFolder) {
            showToast("Moving file...", "loading");
            const res = await fetch(`/api/media/${category}/move_file/${mediaId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_folder: targetFolder })
            });
            if (res.ok) {
                showToast("Moved successfully!", "success", 2000);
                loadMediaData(category);
            }
        }
    };
    menu.appendChild(btnMove);

    const btnDel = document.createElement("div");
    btnDel.id = "media-ctx-delete";
    btnDel.className = "grid-context-menu-item grid-context-menu-danger";
    btnDel.innerHTML = "🗑️ Delete File";
    btnDel.onclick = async () => {
        menu.remove();
        const isOk = await showCustomDialog("confirm", `Are you sure you want to delete file <br><b style="color:#ff4444;">${mediaName}</b>?`);
        if (isOk) {
            showToast("Deleting...", "loading");
            const res = await fetch(`/api/media/${category}/file/${mediaId}`, { method: 'DELETE' });
            if (res.ok) {
                showToast("Deleted successfully!", "success", 2000);
                loadMediaData(category);
            }
        }
    };
    menu.appendChild(btnDel);

    document.body.appendChild(menu);
    positionContextMenu(menu, e.clientX, e.clientY);
    setTimeout(() => { document.addEventListener("click", function close() { if (menu) menu.remove(); document.removeEventListener("click", close); }); }, 10);
}


function showBatchContextMenu(e, filteredItems) {
    const oldMenu = document.getElementById("lib-context-menu");
    if (oldMenu) oldMenu.remove();

    const count = window.selectedMediaIds ? window.selectedMediaIds.size : 0;
    if (count <= 1) return;

    const menu = document.createElement("div");
    menu.id = "lib-context-menu";
    menu.className = "grid-context-menu";

    const catLabel = currentMediaCategory === 'presentation' ? 'PPT' : currentMediaCategory.toUpperCase();
    const header = document.createElement("div");
    header.className = "grid-context-menu-header";
    header.innerHTML = `📦 <b>${count} ${catLabel} Selected</b>`;
    menu.appendChild(header);

    // 1. Add to Schedule
    const btnSched = document.createElement("div");
    btnSched.className = "grid-context-menu-item";
    btnSched.innerHTML = `📝 Add ${count} items to Schedule`;
    btnSched.onclick = () => {
        menu.remove();
        batchAddMediaToSchedule(filteredItems);
    };
    menu.appendChild(btnSched);

    // 2. Move / Add to Folder
    const btnMove = document.createElement("div");
    btnMove.className = "grid-context-menu-item";
    btnMove.innerHTML = `📁 Move / Add to Folder (${count})...`;
    btnMove.onclick = () => {
        menu.remove();
        batchMoveMediaToFolder();
    };
    menu.appendChild(btnMove);

    // 3. Delete Files
    const btnDel = document.createElement("div");
    btnDel.className = "grid-context-menu-item grid-context-menu-danger";
    btnDel.innerHTML = `🗑️ Delete ${count} Files`;
    btnDel.onclick = () => {
        menu.remove();
        batchDeleteMedia();
    };
    menu.appendChild(btnDel);

    // 4. Deselect All
    const btnClear = document.createElement("div");
    btnClear.className = "grid-context-menu-item";
    btnClear.innerHTML = `✕ Deselect All (Esc)`;
    btnClear.onclick = () => {
        menu.remove();
        clearMediaSelection();
    };
    menu.appendChild(btnClear);

    document.body.appendChild(menu);
    positionContextMenu(menu, e.clientX, e.clientY);
    setTimeout(() => {
        document.addEventListener("click", function close() {
            if (menu) menu.remove();
            document.removeEventListener("click", close);
        });
    }, 10);
}

async function batchAddMediaToSchedule(filteredItems) {
    if (!window.selectedMediaIds || window.selectedMediaIds.size === 0) return;
    const selectedIds = new Set(window.selectedMediaIds);
    const itemsToAdd = (filteredItems || []).filter(item => selectedIds.has(item.id));
    if (itemsToAdd.length === 0) return;

    try {
        if (currentMediaCategory === 'presentation') {
            for (const item of itemsToAdd) {
                const res = await fetch(`/api/media/presentation/${item.id}/slides`);
                const data = await res.json();
                const count = data.count || 0;
                if (count > 0) {
                    let pptSlides = [];
                    for (let i = 1; i <= count; i++) {
                        pptSlides.push({
                            id: Date.now() + i, text: "", type: "presentation_slide",
                            bg_id: item.id, bg_type: "presentation", bg_name: `${item.name} (Slide ${i})`, slide_num: i
                        });
                    }
                    const title = `📊 PPT: ${item.name}`;
                    const payload = { title: title, data: pptSlides, settings: {} };
                    await fetch('/api/songs', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    scheduleList.push({ title: title, note: "Presentation Slide" });
                }
            }
        } else {
            for (const item of itemsToAdd) {
                const icon = currentMediaCategory === 'video' ? '🎬' : (currentMediaCategory === 'photo' ? '📷' : '🎵');
                const labelPrefix = currentMediaCategory === 'video' ? 'VIDEO' : (currentMediaCategory === 'photo' ? 'PHOTO' : 'AUDIO');
                const title = `${icon} ${labelPrefix}: ${item.name}`;
                scheduleList.push({
                    title: title,
                    note: `${currentMediaCategory.charAt(0).toUpperCase() + currentMediaCategory.slice(1)} Media`,
                    type: "media",
                    media_category: currentMediaCategory,
                    media_id: item.id,
                    media_name: item.name
                });
            }
        }

        if (typeof renderSchedule === 'function') renderSchedule();
        if (typeof saveActiveSchedule === 'function') await saveActiveSchedule();

        clearMediaSelection();
    } catch (err) {
        console.error("batchAddMediaToSchedule error:", err);
        showToast("Failed to add items to schedule", "error", 3000);
    }
}

async function batchMoveMediaToFolder() {
    if (!window.selectedMediaIds || window.selectedMediaIds.size === 0) return;
    const selectedIds = Array.from(window.selectedMediaIds);
    if (selectedIds.length === 0) return;

    let options = (mediaDatabase.folders || []).filter(f => f !== "ALL").map(f => ({ value: f, label: `📁 ${f}` }));
    options.unshift({ value: "Uncategorized", label: "🌍 Uncategorized (Remove from folder)" });
    options.push({ value: "__NEW_FOLDER__", label: "➕ [Create New Folder...]" });

    let targetFolder = await showCustomDialog("select", `Move <b style="color:#00e5ff;">${selectedIds.length} items</b> to folder:`, options, "Uncategorized");
    if (!targetFolder) return;

    if (targetFolder === "__NEW_FOLDER__") {
        const newName = await showCustomDialog("prompt", "Enter new folder name:");
        if (!newName || !newName.trim()) return;
        targetFolder = newName.trim();
    }

    showToast(`Moving ${selectedIds.length} files...`, "loading");
    try {
        const res = await fetch(`/api/media/${currentMediaCategory}/batch_move`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_ids: selectedIds,
                new_folder: targetFolder
            })
        });
        const data = await res.json();
        if (data.status === "success") {
            showToast(`Moved ${data.count || selectedIds.length} files to "${targetFolder}"!`, "success", 2500);
            clearMediaSelection();
            loadMediaData(currentMediaCategory);
        } else {
            showToast(data.message || "Failed to move files", "error", 3000);
        }
    } catch (err) {
        console.error("batchMoveMediaToFolder error:", err);
        showToast("Error moving files", "error", 3000);
    }
}

async function batchDeleteMedia() {
    if (!window.selectedMediaIds || window.selectedMediaIds.size === 0) return;
    const selectedIds = Array.from(window.selectedMediaIds);
    if (selectedIds.length === 0) return;

    const isOk = await showCustomDialog("confirm", `Are you sure you want to delete <b style="color:#ff4444;">${selectedIds.length} selected files</b>?`);
    if (!isOk) return;

    showToast(`Deleting ${selectedIds.length} files...`, "loading");
    try {
        const res = await fetch(`/api/media/${currentMediaCategory}/batch_delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                item_ids: selectedIds
            })
        });
        const data = await res.json();
        if (data.status === "success") {
            showToast(`Deleted ${data.count || selectedIds.length} files successfully!`, "success", 2500);
            clearMediaSelection();
            loadMediaData(currentMediaCategory);
        } else {
            showToast(data.message || "Failed to delete files", "error", 3000);
        }
    } catch (err) {
        console.error("batchDeleteMedia error:", err);
        showToast("Error deleting files", "error", 3000);
    }
}

function openSettingsModal() {
    document.getElementById('settings-modal').style.display = 'flex';
}

function updateBgConfigUI() {
    document.getElementById('val-bg-trans').innerText = document.getElementById('bg-trans-input').value + 's';
    sendBgConfig();
}

function sendBgConfig() {
    const payload = {
        transition: parseFloat(document.getElementById('bg-trans-input').value),
        fit: document.getElementById('bg-fit-input').value,
        photo_fit: document.getElementById('photo-fit-input').value
    };
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "update_bg_config", payload: payload }));
    }
}

let currentMediaCategory = "video";
let lastActiveMediaSubCategory = "video";
let mediaDatabase = { folders: [], items: {} };

function switchMediaCategory(event, category) {
    if (event) event.stopPropagation();

    // If 'media' parent clicked:
    if (category === 'media') {
        const isCurrentMedia = ['video', 'audio', 'photo', 'presentation'].includes(currentMediaCategory);
        const content = document.getElementById("bg-library-content");
        const isCollapsed = !content || content.style.display === "none" || content.style.display === "";

        if (isCurrentMedia) {
            // If collapsed, expand drawer
            if (isCollapsed) {
                toggleBgLibrary();
            }
            // If already open, do nothing (no-op as chosen in interview)
            return;
        } else {
            // Switching from scripture/camera/plugin to media: restore last sub-category
            category = lastActiveMediaSubCategory || "video";
        }
    }

    const isMediaCategory = ['video', 'audio', 'photo', 'presentation'].includes(category);
    if (isMediaCategory) {
        lastActiveMediaSubCategory = category;
    }

    if (currentMediaCategory === category) {
        // Ensure drawer is open if user clicks the category
        const content = document.getElementById("bg-library-content");
        if (content && (content.style.display === "none" || content.style.display === "")) {
            toggleBgLibrary();
        }
        return;
    }

    clearMediaSelection();
    currentMediaCategory = category;
    currentActiveFolder = "ALL";

    // Update parent media-cat-btn active states
    const btns = document.querySelectorAll(".media-cat-btn");
    btns.forEach(btn => { btn.classList.remove("active"); });

    if (isMediaCategory) {
        const parentBtn = document.getElementById("media-cat-btn-media");
        if (parentBtn) parentBtn.classList.add("active");
    } else {
        const activeBtn = event ? event.currentTarget : (document.getElementById(`media-cat-btn-${category}`) || document.querySelector(`.media-cat-btn[onclick*="'${category}'"]`));
        if (activeBtn) { activeBtn.classList.add("active"); }
    }

    // Update sub-media-btn active states
    const subBtns = document.querySelectorAll(".sub-media-btn");
    subBtns.forEach(btn => { btn.classList.remove("active"); });
    if (isMediaCategory) {
        const activeSubBtn = document.getElementById(`sub-media-btn-${category}`) || document.querySelector(`.sub-media-btn[onclick*="'${category}'"]`);
        if (activeSubBtn) activeSubBtn.classList.add("active");
    }

    // Ensure content drawer is open
    const content = document.getElementById("bg-library-content");
    const icon = document.getElementById("bg-toggle-icon");
    const resizer = document.getElementById("bg-library-resizer");
    if (content && (content.style.display === "none" || content.style.display === "")) {
        content.style.display = "flex";
        if (resizer) resizer.style.display = "block";
        if (icon) icon.innerText = "▼ COLLAPSE";
    }

    // Show/Hide sub-toggle bar based on media category
    const subBar = document.getElementById("bg-sub-toggle-bar");
    if (subBar) {
        subBar.style.display = isMediaCategory ? "flex" : "none";
    }

    const mediaPanel = document.getElementById("bg-media-panel");
    const scrPanel = document.getElementById("scr-lib-panel");
    const pluginPanel = document.getElementById("plugin-lib-panel");
    const extPanel = document.getElementById("ext-lib-panel");

    const sidebarTabs = document.getElementById("bg-sidebar-tabs");
    if (sidebarTabs) {
        sidebarTabs.style.display = "none";
    }

    if (category === 'scripture') {
        if (typeof window.setNavigationTarget === 'function') window.setNavigationTarget('scripture');
        if (mediaPanel) mediaPanel.style.display = "none";
        if (scrPanel) scrPanel.style.display = "flex";
        if (pluginPanel) pluginPanel.style.display = "none";
        if (extPanel) extPanel.style.display = "none";
        const camPanel = document.getElementById("cam-lib-panel");
        if (camPanel) camPanel.style.display = "none";
        if (typeof loadBibleTranslations === 'function') loadBibleTranslations();
    } else if (category === 'camera') {
        if (typeof window.setNavigationTarget === 'function') window.setNavigationTarget('lyrics');
        if (mediaPanel) mediaPanel.style.display = "none";
        if (scrPanel) scrPanel.style.display = "none";
        if (pluginPanel) pluginPanel.style.display = "none";
        if (extPanel) extPanel.style.display = "none";
        const camPanel = document.getElementById("cam-lib-panel");
        if (camPanel) camPanel.style.display = "flex";
        refreshCameraDevices();
        loadCameraSettings();
    } else if (category === 'plugin') {
        if (typeof window.setNavigationTarget === 'function') window.setNavigationTarget('lyrics');
        if (mediaPanel) mediaPanel.style.display = "none";
        if (scrPanel) scrPanel.style.display = "none";
        if (extPanel) extPanel.style.display = "none";
        const camPanel = document.getElementById("cam-lib-panel");
        if (camPanel) camPanel.style.display = "none";
        if (pluginPanel) pluginPanel.style.display = "flex";

        // Auto-expand drawer agar grid plugin lega (50vh) dan scroll mulus
        const content = document.getElementById("bg-library-content");
        if (content) {
            content.style.display = "flex";
            const curH = parseInt(content.style.height || "0", 10);
            if (!content.style.height || content.style.height === "20vh" || curH < 350) {
                content.style.height = "50vh";
            }
        }
        const resizer = document.getElementById("bg-library-resizer");
        if (resizer) resizer.style.display = "block";
        const icon = document.getElementById("bg-toggle-icon");
        if (icon) icon.innerText = "▼ COLLAPSE";

        if (typeof loadPluginLibrary === 'function') loadPluginLibrary();
    } else if (category === 'external') {
        if (typeof window.setNavigationTarget === 'function') window.setNavigationTarget('lyrics');
        if (mediaPanel) mediaPanel.style.display = "none";
        if (scrPanel) scrPanel.style.display = "none";
        if (pluginPanel) pluginPanel.style.display = "none";
        const camPanel = document.getElementById("cam-lib-panel");
        if (camPanel) camPanel.style.display = "none";
        if (extPanel) extPanel.style.display = "flex";

        // Auto-expand drawer agar panel external lega (50vh)
        const content = document.getElementById("bg-library-content");
        if (content) {
            content.style.display = "flex";
            const curH = parseInt(content.style.height || "0", 10);
            if (!content.style.height || content.style.height === "20vh" || curH < 350) {
                content.style.height = "50vh";
            }
        }
        const resizer = document.getElementById("bg-library-resizer");
        if (resizer) resizer.style.display = "block";
        const icon = document.getElementById("bg-toggle-icon");
        if (icon) icon.innerText = "▼ COLLAPSE";

        if (typeof window.initExternalPanel === 'function') window.initExternalPanel();
    } else {
        if (typeof window.setNavigationTarget === 'function') window.setNavigationTarget('lyrics');
        if (scrPanel) scrPanel.style.display = "none";
        if (pluginPanel) pluginPanel.style.display = "none";
        if (extPanel) extPanel.style.display = "none";
        const camPanel = document.getElementById("cam-lib-panel");
        if (camPanel) camPanel.style.display = "none";
        if (mediaPanel) mediaPanel.style.display = "flex";

        loadMediaData(category);
    }
}
window.switchMediaCategory = switchMediaCategory;

let currentSidebarMode = 'local';
let discoveredSenders = [];

function setSidebarMode(mode) {
    currentSidebarMode = mode;
    const tabs = document.querySelectorAll(".bg-sb-tab");
    tabs.forEach(t => {
        const onclickAttr = t.getAttribute("onclick") || "";
        t.classList.toggle("active", onclickAttr.includes(`'${mode}'`));
    });

    const localSection = document.getElementById("bg-local-section");
    const senderSection = document.getElementById("bg-sender-section");

    if (localSection) localSection.style.display = (mode === 'local') ? "flex" : "none";
    if (senderSection) senderSection.style.display = (mode === 'local') ? "none" : "flex";
    if (mode !== 'local') {
        refreshMediaSenders();
    }
}

async function refreshMediaSenders() {
    const list = document.getElementById("bg-sender-list");
    list.innerHTML = `<div style="padding:15px; color:#aaa; font-size:0.7em; text-align:center;">Scanning Local Network...</div>`;

    try {
        const res = await fetch('/api/senders/list');
        const senders = await res.json();
        discoveredSenders = senders;
        renderSenderList();
    } catch (e) {
        list.innerHTML = `<div style="padding:15px; color:#ff4444; font-size:0.7em; text-align:center;">Failed to scan network</div>`;
    }
}

function renderSenderList() {
    const list = document.getElementById("bg-sender-list");
    list.innerHTML = "";

    let filterType = 'photo';
    if (currentMediaCategory === 'presentation') filterType = 'ppt';
    else if (currentMediaCategory === 'video') filterType = 'video';

    const filteredSenders = discoveredSenders.filter(s =>
        s.media_types && s.media_types.includes(filterType)
    );

    if (filteredSenders.length === 0) {
        list.innerHTML = `<div style="padding:15px; color:#666; font-size:0.7em; text-align:center;">No active ${currentMediaCategory} senders found</div>`;
        return;
    }

    filteredSenders.forEach(s => {
        const item = document.createElement("div");
        item.className = "bg-sender-item";
        item.innerHTML = `
            <div class="bg-sender-name">${s.device_name}</div>
            <div class="bg-sender-ip">${s.ip}:${s.ws_port}</div>
            <div class="bg-sender-status online">● Online</div>
        `;

        if (s.ip === window.activeRemoteSenderIp && (window.remoteLivePhotoId || window.remoteLiveVideoId)) {
            item.classList.add("live");
        }

        item.onclick = () => connectToMediaSender(s);
        list.appendChild(item);
    });
}

async function connectToMediaSender(sender) {
    showToast(`Connecting to ${sender.device_name}...`, "loading");

    try {
        const res = await fetch('/api/senders/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip: sender.ip, port: sender.ws_port })
        });
        const data = await res.json();

        if (data.status === "success") {
            showToast(`Connected to ${sender.device_name}`, "success", 2000);

            if (currentMediaCategory === 'presentation') {
                if (typeof window.enterPPTRemoteMode === 'function') {
                    window.enterPPTRemoteMode(sender);
                }
            } else if (currentMediaCategory === 'photo') {
                if (typeof enterPhotoRemoteMode === 'function') {
                    enterPhotoRemoteMode(sender);
                }
            } else if (currentMediaCategory === 'video') {
                if (typeof enterVideoRemoteMode === 'function') {
                    enterVideoRemoteMode(sender);
                }
            }
        } else {
            showToast(data.message, "error", 3000);
        }
    } catch (e) {
        showToast("Connection failed", "error", 3000);
    }
}

async function connectManualSender() {
    const ipInput = document.getElementById("manual-sender-ip");
    const ip = ipInput ? ipInput.value.trim() : "";
    if (!ip) {
        showToast("Please enter an IP address", "error", 2000);
        return;
    }
    
    let targetIp = ip;
    let targetPort = 18889;
    if (ip.includes(":")) {
        const parts = ip.split(":");
        targetIp = parts[0];
        targetPort = parseInt(parts[1]) || 18889;
    }
    
    showToast(`Connecting to ${targetIp}:${targetPort}...`, "loading");
    
    try {
        const res = await fetch('/api/senders/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip: targetIp, port: targetPort })
        });
        const data = await res.json();
        
        if (data.status === "success") {
            showToast(`Connected to ${data.sender.device_name}`, "success", 2000);
            
            const listRes = await fetch('/api/senders/list');
            discoveredSenders = await listRes.json();
            renderSenderList();
            
            const s = data.sender;
            if (currentMediaCategory === 'presentation') {
                if (typeof window.enterPPTRemoteMode === 'function') {
                    window.enterPPTRemoteMode(s);
                }
            } else if (currentMediaCategory === 'photo') {
                if (typeof enterPhotoRemoteMode === 'function') {
                    enterPhotoRemoteMode(s);
                }
            } else if (currentMediaCategory === 'video') {
                if (typeof enterVideoRemoteMode === 'function') {
                    enterVideoRemoteMode(s);
                }
            }
            if (ipInput) ipInput.value = "";
        } else {
            showToast(data.message, "error", 3000);
        }
    } catch (e) {
        showToast("Manual connection failed", "error", 3000);
    }
}
window.connectManualSender = connectManualSender;

window.enterPhotoRemoteMode = async function (sender) {
    currentActiveSender = sender;
    currentActiveFolder = "ALL";
    const title = document.getElementById("bg-active-folder-name");
    if (title) title.innerText = `🌐 REMOTE PHOTO: ${sender.device_name}`;

    // Fetch photos from sender
    try {
        const tokenParam = sender.token ? `?auth=${sender.token}` : '';
        const res = await fetch(`http://${sender.ip}:${sender.ws_port}/api/photos${tokenParam}`);
        const data = await res.json();

        // Handle dictionary structure from sender
        const photosArray = data.items ? Object.values(data.items) : (Array.isArray(data) ? data : Object.values(data));
        renderRemotePhotoGrid(photosArray, sender);
    } catch (e) {
        showToast("Failed to fetch remote photos", "error", 3000);
    }

    // Connect WebSocket
    const tokenParam = sender.token ? `?auth=${sender.token}` : '';
    const wsUrl = `ws://${sender.ip}:${sender.ws_port}/ws${tokenParam}`;
    if (window.senderWs) {
        try { window.senderWs.close(); } catch (e) { }
    }

    window.senderWs = new WebSocket(wsUrl);
    window.senderWs.onopen = () => {
        console.log("[PHOTO REMOTE] Connected to sender WS");
    };

    window.senderWs.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === "photo_live") {
                // If someone else (e.g. sender dashboard) took a photo live
                const photo = data.payload.photo;
                const baseUrl = data.payload.baseUrl;
                const senderIp = baseUrl.split('//')[1]?.split(':')[0] || "127.0.0.1";

                window.remoteLivePhotoId = photo.id;
                window.activeRemoteSenderIp = senderIp;

                const tokenParam = sender.token ? `?auth=${sender.token}` : '';
                const fullUrl = `${baseUrl}/api/photos/file/${photo.id}${tokenParam}`;

                // Update Main App State
                if (typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        action: "update_photo",
                        payload: {
                            url: fullUrl,
                            name: photo.name,
                            source: "remote_sender",
                            sender_id: senderIp
                        }
                    }));
                }
                if (typeof createOrUpdateFloatingPlayer === 'function') {
                    createOrUpdateFloatingPlayer('photo', photo.name || 'Remote Photo');
                }

                // Update UI immediately if we are in remote grid
                if (currentSidebarMode === 'sender') {
                    // Refresh grid to show the new "LIVE" badge
                    const currentSender = discoveredSenders.find(d => d.ip === senderIp);
                    if (currentSender) {
                        renderRemotePhotoGrid(window.lastRemotePhotos || [], currentSender);
                    }
                    renderSenderList();
                }
            } else if (data.type === "photo_control" && data.payload) {
                if (data.payload.command === "ftb" && typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN) {
                    const isFtb = Boolean(data.payload.value);
                    ws.send(JSON.stringify({
                        action: "ftb",
                        payload: {
                            enabled: isFtb,
                            value: isFtb,
                            active: isFtb,
                            source: "remote_sender"
                        }
                    }));
                }
            }
        } catch (err) {
            console.error("[PHOTO REMOTE] Error processing message:", err);
        }
    };
}

function renderRemotePhotoGrid(photos, sender) {
    const grid = document.getElementById("bg-grid-container");
    if (!grid) return;
    grid.innerHTML = "";

    if (!photos || photos.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: #666; font-style: italic;">No photos found on ${sender.device_name}</div>`;
        return;
    }

    const baseUrl = `http://${sender.ip}:${sender.ws_port}`;

    // photos is now guaranteed to be an array
    photos.forEach(photo => {
        const box = document.createElement("div");
        box.className = "bg-media-card";

        const thumbUrl = `${baseUrl}/api/photos/thumb/${photo.id}`;
        const thumbHtml = `<div class="bg-media-thumb-wrap"><img src="${thumbUrl}" class="bg-media-thumb" onerror="this.src='/static/logo.png'"></div>`;

        if (window.remoteLivePhotoId === photo.id && sender.ip === window.activeRemoteSenderIp) {
            box.classList.add("live");
        }

        box.innerHTML = `${thumbHtml}<div class="bg-media-label" title="${photo.name}">${photo.name}</div>`;

        box.onclick = () => {
            // Send live to Main App Output
            applyRemotePhoto(photo, sender);
        };

        grid.appendChild(box);
    });
    window.lastRemotePhotos = photos; // Cache for re-renders
}

function applyRemotePhoto(photo, sender) {
    const baseUrl = `http://${sender.ip}:${sender.ws_port}`;
    const fullUrl = `${baseUrl}/api/photos/file/${photo.id}`;

    window.remoteLivePhotoId = photo.id;
    window.activeRemoteSenderIp = sender.ip;

    ws.send(JSON.stringify({
        action: "update_photo",
        payload: {
            url: fullUrl,
            name: photo.name,
            source: "remote_sender",
            sender_id: sender.ip
        }
    }));

    // Update UI
    renderRemotePhotoGrid(window.lastRemotePhotos || [], sender);
    renderSenderList();

    // 2. Sync to Sender's Backend (so sender dashboard shows 'LIVE' status)
    if (window.senderWs && window.senderWs.readyState === WebSocket.OPEN) {
        window.senderWs.send(JSON.stringify({
            action: "take_photo",
            photo: photo
        }));
    }
}

window.loadMediaData = loadMediaData;
async function loadMediaData(category) {
    try {
        const res = await fetch(`/api/media/${category}`);
        mediaDatabase = await res.json();
        renderMediaFolders();
        renderMediaGrid();
    } catch (e) {
        console.error(`Failed to load ${category} library:`, e);
    }
}

function renderMediaFolders() {
    const folderList = document.getElementById("bg-folder-list");
    if (!folderList) return;
    folderList.innerHTML = "";

    const createFolderItem = (folder) => {
        const div = document.createElement("div");
        div.className = `bg-folder-item ${folder === currentActiveFolder ? 'active' : ''}`;

        let icon = "📁";
        let displayName = folder;

        if (folder === "ALL") {
            if (currentMediaCategory === 'video') icon = "🌍";
            if (currentMediaCategory === 'audio') icon = "🎵";
            if (currentMediaCategory === 'photo') icon = "📷";
            if (currentMediaCategory === 'presentation') icon = "📊";
            displayName = `All ${currentMediaCategory.toUpperCase()}`;
        }

        div.innerHTML = `<span>${icon}</span><span style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${displayName}</span>`;

        div.onclick = () => {
            clearMediaSelection();
            currentActiveFolder = folder;
            const titleEl = document.getElementById("bg-active-folder-name");
            if (titleEl) titleEl.innerText = icon + " " + displayName;
            renderMediaFolders();
            renderMediaGrid();
        };

        div.oncontextmenu = (e) => showFolderContextMenu(e, folder);
        return div;
    };

    folderList.appendChild(createFolderItem("ALL"));
    if (document.getElementById("bg-active-folder-name")) {
        document.getElementById("bg-active-folder-name").innerText = currentActiveFolder === "ALL" ? `All ${currentMediaCategory.toUpperCase()}` : `📂 ${currentActiveFolder}`;
    }

    if (!mediaDatabase.folders) return;
    mediaDatabase.folders.forEach(folder => {
        if (folder === "ALL") return;
        folderList.appendChild(createFolderItem(folder));
    });
}

function getFilteredSortedMediaItems() {
    const items = mediaDatabase.items || {};
    const itemsArray = Object.keys(items).map(key => {
        let obj = items[key];
        obj.id = obj.id || key;
        return obj;
    });

    const filteredItems = itemsArray.filter(item =>
        currentActiveFolder === "ALL" || item.folder === currentActiveFolder
    );

    filteredItems.sort((a, b) => {
        let compare = 0;
        if (mediaSortKey === 'date') {
            compare = (a.mtime || 0) - (b.mtime || 0);
        } else {
            compare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
        }
        return mediaSortOrder === 'desc' ? -compare : compare;
    });

    return filteredItems;
}

function renderMediaGrid() {
    const grid = document.getElementById("bg-grid-container");
    if (!grid) return;
    grid.innerHTML = "";

    // Sync dropdown select value
    const sortSelect = document.getElementById("media-sort-select");
    if (sortSelect) {
        sortSelect.value = `${mediaSortKey}_${mediaSortOrder}`;
    }

    const filteredItems = getFilteredSortedMediaItems();

    if (filteredItems.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: #666; font-style: italic;">No files in ${currentMediaCategory.toUpperCase()} category</div>`;
        return;
    }

    // Deselect if user clicks on empty space in grid
    grid.onclick = (e) => {
        if (e.target === grid) {
            clearMediaSelection();
        }
    };

    const isMultiMode = window.selectedMediaIds && window.selectedMediaIds.size > 1;
    if (window.selectedMediaIds && window.selectedMediaIds.size > 0) {
        grid.classList.add("has-selection");
    } else {
        grid.classList.remove("has-selection");
    }
    if (isMultiMode) {
        grid.classList.add("multi-selection");
    } else {
        grid.classList.remove("multi-selection");
    }

    filteredItems.forEach(item => {
        const box = document.createElement("div");
        box.className = "bg-media-card";
        box.setAttribute("data-media-id", item.id);

        const isSelected = window.selectedMediaIds && window.selectedMediaIds.has(item.id);
        if (isSelected) {
            box.classList.add("selected");
        }

        // Small corner selection checkbox
        const selectBtn = document.createElement("div");
        selectBtn.className = "bg-media-select-btn" + (isSelected ? " active" : "");
        selectBtn.title = "Select (Shift+click for range)";
        selectBtn.innerText = isSelected ? "✓" : "";
        selectBtn.onclick = (e) => {
            e.stopPropagation();
            if (e.shiftKey && window.lastSelectedMediaId) {
                rangeSelectMedia(item.id, filteredItems);
            } else {
                if (window.selectedMediaIds.has(item.id)) {
                    window.selectedMediaIds.delete(item.id);
                    if (window.selectedMediaIds.size === 0) window.lastSelectedMediaId = null;
                } else {
                    window.selectedMediaIds.add(item.id);
                    window.lastSelectedMediaId = item.id;
                }
                updateMediaSelectionUI();
            }
        };
        box.appendChild(selectBtn);

        let thumbHtml = "";
        let thumbUrl = `/api/media/thumb/${currentMediaCategory}/${item.id}`;
        if (window.freshThumbs && window.freshThumbs.has(item.id)) {
            thumbUrl += `?t=${Date.now()}`;
        }

        if (currentMediaCategory === 'audio') {
            thumbHtml = `<div class="bg-media-thumb-wrap" style="display: flex; justify-content: center; align-items: center; font-size: 2.5em;">🎵</div>`;
        } else {
            thumbHtml = `<div class="bg-media-thumb-wrap"><img src="${thumbUrl}" class="bg-media-thumb" data-thumb-id="${item.id}" onerror="this.src='/static/logo.png'"></div>`;
        }

        const labelDiv = document.createElement("div");
        labelDiv.className = "bg-media-label";
        labelDiv.title = item.name;
        labelDiv.innerText = item.name;

        box.insertAdjacentHTML('beforeend', thumbHtml);
        box.appendChild(labelDiv);

        box.draggable = !isMultiMode;
        box.ondragstart = (e) => {
            if (window.selectedMediaIds && window.selectedMediaIds.size > 1) {
                e.preventDefault();
                return false;
            }
            e.dataTransfer.setData("text/plain", JSON.stringify({
                action: "apply_media",
                id: item.id,
                category: currentMediaCategory,
                name: item.name
            }));
        };

        // When selection mode is active (> 0 selected), clicking anywhere on card toggles / range-selects
        box.onclick = (e) => {
            if (window.selectedMediaIds && window.selectedMediaIds.size > 0) {
                if (e.shiftKey && window.lastSelectedMediaId) {
                    rangeSelectMedia(item.id, filteredItems);
                } else {
                    if (window.selectedMediaIds.has(item.id)) {
                        window.selectedMediaIds.delete(item.id);
                        if (window.selectedMediaIds.size === 0) window.lastSelectedMediaId = null;
                    } else {
                        window.selectedMediaIds.add(item.id);
                        window.lastSelectedMediaId = item.id;
                    }
                    updateMediaSelectionUI();
                }
            }
        };

        box.oncontextmenu = (e) => {
            e.preventDefault();
            if (window.selectedMediaIds && window.selectedMediaIds.size > 1 && window.selectedMediaIds.has(item.id)) {
                showBatchContextMenu(e, filteredItems);
            } else {
                if (window.selectedMediaIds && window.selectedMediaIds.size > 0 && !window.selectedMediaIds.has(item.id)) {
                    window.selectedMediaIds.clear();
                    window.selectedMediaIds.add(item.id);
                    window.lastSelectedMediaId = item.id;
                    updateMediaSelectionUI();
                }
                showLibraryContextMenu(e, item.id, item.name, currentMediaCategory);
            }
        };
        grid.appendChild(box);
    });
}

let currentCamStream = null;
let cameraSettings = {
    main: { device_id: "", res: "1280x720", fit: "fill", show: false, x: 0, y: 0, zoom: 100, opacity: 100, saturation: 100, hue: 0, brightness: 100, contrast: 100, mask_image: "", mask_x: 0, mask_y: 0, mask_zoom: 100, mask_fit: "fill" },
    audience: { device_id: "", res: "1280x720", fit: "fill", show: false, x: 0, y: 0, zoom: 100, opacity: 100, saturation: 100, hue: 0, brightness: 100, contrast: 100, mask_image: "", mask_x: 0, mask_y: 0, mask_zoom: 100, mask_fit: "fill" }
};

loadCameraSettings();

async function refreshCameraDevices() {
    const list = document.getElementById("cam-device-list");
    if (!list) return;
    list.innerHTML = `<div style="padding:10px; color:#666; font-size:0.7em;">🔍 Scanning cameras...</div>`;

    try {
        ffmpegCameraNames = await loadCameraServiceDevices();
        deviceIdToNameMap = {};

        if (ffmpegCameraNames.length === 0) {
            // Camera-service tidak merespons sama sekali — tampilkan pesan retry
            list.innerHTML = `
                <div style="padding:10px; color:#ff9800; font-size:0.7em;">⚠️ Camera service belum siap.<br>Klik <b>🔄 REFRESH LIST</b> untuk coba lagi.</div>`;
            return;
        }

        const videoDevices = createCameraServiceDevices();
        renderCameraDeviceList(videoDevices, list);
    } catch (e) {
        console.error("Camera access error:", e);
        list.innerHTML = `<div style="padding:10px; color:#ff4444; font-size:0.7em;">❌ Error: ${e.message}</div>`;
    }
    return;


    try {
        // 🎯 CHECK IF RUNNING IN ELECTRON
        const isElectron = typeof window.electronAPI !== 'undefined';

        let videoDevices = [];
        if (videoDevices.length === 0 && ffmpegCameraNames.length > 0) {
            videoDevices = createCameraServiceDevices();
        }

        if (isElectron) {
            console.log("🎬 Electron detected - using navigator.mediaDevices directly");
            try {
                // Check if navigator.mediaDevices is available
                if (!navigator.mediaDevices) {
                    throw new Error("navigator.mediaDevices not available in Electron");
                }
                console.log("navigator.mediaDevices is available");

                // 🎯 Try enumerateDevices first to see what's available
                console.log("Attempting initial enumerateDevices...");
                const initialDevices = await navigator.mediaDevices.enumerateDevices();
                console.log("Initial devices enumerated:", initialDevices.length);
                console.log("Initial devices:", initialDevices.map(d => ({ kind: d.kind, label: d.label || '(no label)', deviceId: d.deviceId })));

                // 🎯 Call getUserMedia to trigger permission and get labels
                let tempStream = null;
                try {
                    console.log("Attempting getUserMedia with video constraint...");
                    tempStream = await Promise.race([
                        navigator.mediaDevices.getUserMedia({ video: true }),
                        new Promise((_, reject) => setTimeout(() => reject(new Error("getUserMedia timeout")), 3500))
                    ]);
                    console.log("getUserMedia successful, stream tracks:", tempStream.getTracks().length);
                    console.log("Stream tracks:", tempStream.getTracks().map(t => ({ kind: t.kind, label: t.label, enabled: t.enabled })));
                } catch (getUserMediaErr) {
                    console.warn("Browser camera permission check failed, using enumerate/FFmpeg fallback:", getUserMediaErr.message);
                    // Don't throw - try enumerateDevices anyway
                }

                // 🎯 Enumerate devices again after getUserMedia attempt
                console.log("Attempting enumerateDevices after getUserMedia...");
                const devices = await navigator.mediaDevices.enumerateDevices();
                console.log("Devices enumerated:", devices.length);
                console.log("All devices:", devices.map(d => ({ kind: d.kind, label: d.label || '(no label)', deviceId: d.deviceId })));

                // Filter for video input devices
                videoDevices = devices.filter(d => d.kind === 'videoinput');
                console.log("Video devices found:", videoDevices.length);
                console.log("Video devices:", videoDevices.map(d => ({ label: d.label || '(no label)', deviceId: d.deviceId })));

                // If still no video devices, try a different approach - check all devices
                if (videoDevices.length === 0) {
                    console.log("No videoinput devices found, checking all device kinds...");
                    const videoinput = devices.filter(d => d.kind === 'videoinput');
                    const audioinput = devices.filter(d => d.kind === 'audioinput');
                    const audiooutput = devices.filter(d => d.kind === 'audiooutput');
                    console.log("Device counts - videoinput:", videoinput.length, "audioinput:", audioinput.length, "audiooutput:", audiooutput.length);

                    // Try to use any device that might be a camera
                    if (devices.length > 0) {
                        console.log("Some devices found, but no videoinput. Using all devices as fallback.");
                        videoDevices = devices; // Use all devices as fallback
                    }
                }

                // Stop the temporary stream to release camera
                if (tempStream) {
                    tempStream.getTracks().forEach(track => track.stop());
                    console.log("Temp stream stopped");
                }
            } catch (electronErr) {
                console.error("Electron camera access failed:", electronErr);
                console.error("Error name:", electronErr.name);
                console.error("Error message:", electronErr.message);
                console.error("Error stack:", electronErr.stack);
                videoDevices = createCameraServiceDevices();
            }
        } else {
            console.log("🌐 Browser mode detected - using navigator.mediaDevices");
            videoDevices = await getCameraDevicesWeb();
        }

        ffmpegCameraNames = await loadCameraServiceDevices();
        deviceIdToNameMap = {};

        // 🎯 RENDER CAMERA LIST
        list.innerHTML = "";
        if (videoDevices.length === 0) {
            console.log("❌ No video devices found - showing error in UI");
            list.innerHTML = `<div style="padding:10px; color:#ff4444; font-size:0.7em;">❌ No cameras found</div>
                            <div style="padding:5px; color:#888; font-size:0.65em;">Check console for details</div>`;
            return;
        }

        videoDevices.forEach((dev, idx) => {
            const item = document.createElement("div");
            item.className = "cam-device-item";
            let assignmentBadge = "";
            if (cameraSettings.main.device_id === dev.deviceId && cameraSettings.main.show) {
                assignmentBadge += `<span class="cam-badge main">MAIN</span>`;
            }
            if (cameraSettings.audience.device_id === dev.deviceId && cameraSettings.audience.show) {
                assignmentBadge += `<span class="cam-badge audience">AUDIENCE</span>`;
            }

            // Get camera name, fallback to generic name if not available
            const cameraName = dev.label && dev.label.trim() ? dev.label : `Camera ${idx + 1}`;
            const ffmpegName = resolveCameraServiceName(cameraName, idx);
            deviceIdToNameMap[dev.deviceId] = ffmpegName;
            if (cameraSettings.main.device_id === dev.deviceId && !cameraSettings.main.device_name) {
                cameraSettings.main.device_name = ffmpegName;
            }
            if (cameraSettings.audience.device_id === dev.deviceId && !cameraSettings.audience.device_name) {
                cameraSettings.audience.device_name = ffmpegName;
            }

            item.innerHTML = `
                <div style="display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;">
                    <div style="flex:1; display:flex; flex-direction:column; min-width:0; gap:4px;">
                        <span style="overflow:hidden; text-overflow:ellipsis; font-weight:600; font-size:0.85em;">${cameraName}</span>
                        <span style="font-size:0.75em; color:#888; overflow:hidden; text-overflow:ellipsis;">${dev.deviceId.substring(0, 12)}...</span>
                    </div>
                </div>
                <div style="display:flex; gap:4px; flex-shrink:0;">${assignmentBadge}</div>
            `;
            item.onclick = () => selectCameraForPreview(dev.deviceId, item);
            list.appendChild(item);
        });
        updateCameraAssignmentLabels();
    } catch (e) {
        console.error("Camera access error:", e);
        list.innerHTML = `<div style="padding:10px; color:#ff4444; font-size:0.7em;">❌ Error: ${e.message}</div>`;
    }
}

// Fungsi dengan retry: camera-service mungkin belum siap saat halaman pertama dibuka
async function loadCameraServiceDevices(retries = 4, delayMs = 1500) {
    const camHost = window.location.hostname || '127.0.0.1';
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(`http://${camHost}:18901/api/camera/list`, { cache: 'no-store' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const cameras = Array.isArray(data) ? data : (data.cameras || []);
            if (cameras.length > 0) {
                console.log(`[CAM] camera-service ready (attempt ${attempt}), cameras:`, cameras);
                return cameras;
            }
            throw new Error('empty list');
        } catch (err) {
            console.warn(`[CAM] loadCameraServiceDevices attempt ${attempt}/${retries} failed:`, err.message);
            if (attempt < retries) {
                await new Promise(r => setTimeout(r, delayMs));
            }
        }
    }
    console.warn('[CAM] camera-service tidak merespons setelah semua retry.');
    return [];
}


function renderCameraDeviceList(videoDevices, list) {
    list.innerHTML = "";
    if (videoDevices.length === 0) {
        list.innerHTML = `<div style="padding:10px; color:#ff4444; font-size:0.7em;">❌ No cameras found</div>
                        <div style="padding:5px; color:#888; font-size:0.65em;">Camera service is running, but no video devices were reported.</div>`;
        return;
    }

    videoDevices.forEach((dev, idx) => {
        const item = document.createElement("div");
        item.className = "cam-device-item";
        let assignmentBadge = "";
        if (cameraSettings.main.device_id === dev.deviceId && cameraSettings.main.show) {
            assignmentBadge += `<span class="cam-badge main">MAIN</span>`;
        }
        if (cameraSettings.audience.device_id === dev.deviceId && cameraSettings.audience.show) {
            assignmentBadge += `<span class="cam-badge audience">AUDIENCE</span>`;
        }

        const cameraName = dev.label && dev.label.trim() ? dev.label : `Camera ${idx + 1}`;
        const ffmpegName = resolveCameraServiceName(cameraName, idx);
        deviceIdToNameMap[dev.deviceId] = ffmpegName;
        if (cameraSettings.main.device_id === dev.deviceId && !cameraSettings.main.device_name) {
            cameraSettings.main.device_name = ffmpegName;
        }
        if (cameraSettings.audience.device_id === dev.deviceId && !cameraSettings.audience.device_name) {
            cameraSettings.audience.device_name = ffmpegName;
        }

        item.innerHTML = `
            <div style="display:flex; align-items:center; gap:10px; flex:1; overflow:hidden;">
                <div style="flex:1; display:flex; flex-direction:column; min-width:0; gap:4px;">
                    <span style="overflow:hidden; text-overflow:ellipsis; font-weight:600; font-size:0.85em;">${cameraName}</span>
                    <span style="font-size:0.75em; color:#888; overflow:hidden; text-overflow:ellipsis;">${dev.deviceId.substring(0, 24)}...</span>
                </div>
            </div>
            <div style="display:flex; gap:4px; flex-shrink:0;">${assignmentBadge}</div>
        `;
        item.onclick = () => selectCameraForPreview(dev.deviceId, item);
        list.appendChild(item);
    });
    updateCameraAssignmentLabels();
}

function createCameraServiceDevices() {
    return ffmpegCameraNames.map((name, idx) => ({
        kind: "videoinput",
        label: name,
        deviceId: `ffmpeg:${idx}:${name}`
    }));
}

function normalizeCameraName(name) {
    return String(name || "")
        .toLowerCase()
        .replace(/\([^)]*\)/g, "")
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
}

function resolveCameraServiceName(browserName, idx) {
    if (!ffmpegCameraNames.length) return browserName || `${idx}`;

    const normalizedBrowser = normalizeCameraName(browserName);
    const exact = ffmpegCameraNames.find(name => normalizeCameraName(name) === normalizedBrowser);
    if (exact) return exact;

    const partial = ffmpegCameraNames.find(name => {
        const normalizedService = normalizeCameraName(name);
        return normalizedService && normalizedBrowser &&
            (normalizedBrowser.includes(normalizedService) || normalizedService.includes(normalizedBrowser));
    });
    return partial || ffmpegCameraNames[idx] || browserName || `${idx}`;
}

// 🎯 HELPER: Get cameras using web API (browser)
async function getCameraDevicesWeb() {
    try {
        // 🎯 CHECK IF RUNNING IN ELECTRON
        const isElectron = typeof window.electronAPI !== 'undefined';
        let mediaDevices = null;

        if (isElectron) {
            // Use navigator.mediaDevices directly in Electron
            mediaDevices = navigator.mediaDevices;
        } else {
            // Use standard navigator.mediaDevices
            mediaDevices = navigator.mediaDevices;
        }

        // Check if mediaDevices available
        if (!mediaDevices) {
            throw new Error("mediaDevices not supported");
        }

        // Request permission with timeout
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("getUserMedia timeout")), 5000)
        );

        const mediaPromise = mediaDevices.getUserMedia({ video: true });
        const stream = await Promise.race([mediaPromise, timeoutPromise]);
        if (stream && stream.getTracks) {
            stream.getTracks().forEach(track => track.stop());
        }

        // After permission granted, enumerate devices
        const devices = await mediaDevices.enumerateDevices();
        return devices.filter(d => d.kind === 'videoinput');
    } catch (err) {
        console.warn("Browser camera API unavailable, using FFmpeg camera-service fallback:", err.message);

        // Try enumerate without getUserMedia (might work if already granted)
        try {
            const isElectron = typeof window.electronAPI !== 'undefined';
            let mediaDevices = null;

            if (isElectron) {
                // Use navigator.mediaDevices directly in Electron
                mediaDevices = navigator.mediaDevices;
            } else {
                mediaDevices = navigator.mediaDevices;
            }

            if (!mediaDevices) throw new Error("mediaDevices not available");

            const devices = await mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === 'videoinput');
            if (videoDevices.length > 0) return videoDevices;
        } catch (e) {
            console.error("Fallback enumerate failed:", e);
        }

        return [];
    }
}

async function selectCameraForPreview(deviceId, element) {
    document.querySelectorAll(".cam-device-item").forEach(el => el.classList.remove("active"));
    element.classList.add("active");
    if (currentCamStream) {
        currentCamStream.getTracks().forEach(track => track.stop());
        currentCamStream = null;
    }

    const video = document.getElementById("cam-local-preview");
    const noPreview = document.getElementById("cam-no-preview");
    const cameraName = deviceIdToNameMap[deviceId] || "0";
    window.lastSelectedCamId = deviceId;

    // 🔍 DIAGNOSTIC LOG — cek nama kamera yang akan dikirim ke camera-service
    console.log('[CAM-DIAG] selectCameraForPreview called');
    console.log('[CAM-DIAG]   deviceId         :', deviceId);
    console.log('[CAM-DIAG]   deviceIdToNameMap :', JSON.stringify(deviceIdToNameMap));
    console.log('[CAM-DIAG]   cameraName (hasil):', cameraName);
    console.log('[CAM-DIAG]   ffmpegCameraNames :', JSON.stringify(ffmpegCameraNames));

    startPreviewWebRTC(video, noPreview, cameraName);
}


function startPreviewWebRTC(videoEl, noPreviewEl, cameraName) {
    stopPreviewWebRTC();

    // Safety net: strip hardware ID suffix yang mungkin muncul dari browser API
    // contoh: "Integrated Camera (13d3:56a6)" → "Integrated Camera"
    const cleanCameraName = cameraName
        .replace(/\s*\([0-9a-fA-F]{4}:[0-9a-fA-F]{4}\)\s*$/, '')
        .trim();

    const camHost = window.location.hostname || '127.0.0.1';
    const wsUrl = `ws://${camHost}:18901/ws/webrtc?channel=preview&camera=${encodeURIComponent(cleanCameraName)}`;
    // 🔍 DIAGNOSTIC LOG — cek URL WebSocket yang akan digunakan
    console.log('[CAM-DIAG] startPreviewWebRTC called');
    console.log('[CAM-DIAG]   cameraName (raw)  :', cameraName);
    console.log('[CAM-DIAG]   cameraName (clean):', cleanCameraName);
    console.log('[CAM-DIAG]   WebSocket URL:', wsUrl);

    const ws = new WebSocket(wsUrl);
    previewWS = ws;

    // Connection timeout — if WS doesn't open in 5 seconds, show error
    const connTimeout = setTimeout(() => {
        if (ws === previewWS && ws.readyState !== WebSocket.OPEN) {
            console.warn('[Preview] WebSocket connection timeout');
            showToast("Camera service connection timeout", "error", 1500);
            stopPreviewWebRTC();
        }
    }, 5000);

    ws.onopen = () => {
        clearTimeout(connTimeout);
        if (ws !== previewWS) return; // stale reference
        console.log('[CAM-DIAG] WebSocket OPEN — camera-service connected OK');

        previewPC = new RTCPeerConnection({
            iceServers: [],
            iceCandidatePoolSize: 0,
            bundlePolicy: 'max-bundle',
            rtcpMuxPolicy: 'require'
        });

        previewPC.ontrack = (event) => {
            if (event.streams && event.streams[0]) {
                videoEl.srcObject = event.streams[0];
                videoEl.onloadedmetadata = () => videoEl.play().catch(err => console.warn("Preview play failed:", err));
                videoEl.style.opacity = "1";
                noPreviewEl.style.display = "none";
            }
        };

        previewPC.onconnectionstatechange = () => {
            if (!previewPC) return;
            console.log('[CAM-DIAG] PeerConnection state:', previewPC.connectionState);
            if (previewPC.connectionState === "failed" || previewPC.connectionState === "disconnected") {
                console.warn("[Preview] Connection state:", previewPC.connectionState);
                stopPreviewWebRTC();
            }
        };
    };

    ws.onmessage = async (event) => {
        try {
            const offer = JSON.parse(event.data);
            if (offer.type === "error") {
                console.error('[CAM-DIAG] camera-service returned error:', offer.message);
                throw new Error(offer.message || "Camera service error");
            }
            if (!previewPC) {
                console.warn('[Preview] PeerConnection not ready yet');
                return;
            }
            await previewPC.setRemoteDescription(offer);
            const answer = await previewPC.createAnswer();
            await previewPC.setLocalDescription(answer);
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(previewPC.localDescription));
            }
        } catch (err) {
            console.error("Failed to start camera preview:", err);
            showToast("Failed to open camera preview: " + err.message, "error", 2000);
            stopPreviewWebRTC();
        }
    };

    ws.onerror = (event) => {
        clearTimeout(connTimeout);
        // 🔍 DIAGNOSTIC LOG — cek detail error WebSocket
        console.error('[CAM-DIAG] WebSocket ERROR on preview connection');
        console.error('[CAM-DIAG]   cameraName sent  :', cameraName);
        console.error('[CAM-DIAG]   WebSocket URL    :', wsUrl);
        console.error('[CAM-DIAG]   ws.readyState    :', ws.readyState, '(0=CONNECTING,1=OPEN,2=CLOSING,3=CLOSED)');
        console.error('[CAM-DIAG]   ffmpegCameraNames:', JSON.stringify(ffmpegCameraNames));
        console.error('[CAM-DIAG]   Full event       :', event);
        showToast("Camera service is not ready yet", "error", 1500);
        stopPreviewWebRTC();
    };
}

function stopPreviewWebRTC() {
    if (previewWS) {
        previewWS.onopen = null;
        previewWS.onclose = null;
        previewWS.onerror = null;
        previewWS.onmessage = null;
        if (previewWS.readyState === WebSocket.OPEN || previewWS.readyState === WebSocket.CONNECTING) {
            previewWS.close();
        }
        previewWS = null;
    }
    if (previewPC) {
        previewPC.ontrack = null;
        previewPC.onconnectionstatechange = null;
        previewPC.close();
        previewPC = null;
    }
    const video = document.getElementById("cam-local-preview");
    if (video) {
        // Stop all tracks before releasing srcObject to free GPU decoder
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(t => t.stop());
        }
        video.srcObject = null;
        video.load(); // reset decoder
        video.style.opacity = "0";
    }
    const noPreview = document.getElementById("cam-no-preview");
    if (noPreview) noPreview.style.display = "";
}

async function loadCameraSettings() {
    try {
        const res = await fetch('/api/camera/settings');
        cameraSettings = await res.json();

        // Update UI fits
        if (document.getElementById("cam-main-fit")) document.getElementById("cam-main-fit").value = cameraSettings.main.fit;
        if (document.getElementById("cam-audience-fit")) document.getElementById("cam-audience-fit").value = cameraSettings.audience.fit;

        // Update sliders & inputs
        ['main', 'audience'].forEach(type => {
            updateCameraControlUI(type);
        });

        // Update UI buttons
        updateCamToggleButton('main', cameraSettings.main.show);
        updateCamToggleButton('audience', cameraSettings.audience.show);

        // Refresh list to show badges if list is already rendered
        refreshCameraDevices();
    } catch (e) { console.error("Gagal load camera settings", e); }
}

function updateCamToggleButton(type, isShow) {
    const btn = document.getElementById(`btn-cam-${type}-toggle`);
    if (!btn) return;
    if (isShow) {
        btn.innerText = "⏹️ TURN OFF";
        btn.classList.add("active");
    } else {
        btn.innerText = "🔴 SHOW LIVE";
        btn.classList.remove("active");
    }

    updateCameraAssignmentLabels();
}

async function updateCameraAssignmentLabels() {
    // We need to find the label for the current deviceId
    const isElectron = typeof window.electronAPI !== 'undefined';
    let mediaDevices = null;

    if (isElectron) {
        // Use navigator.mediaDevices directly in Electron
        mediaDevices = navigator.mediaDevices;
    } else {
        mediaDevices = navigator.mediaDevices;
    }

    try {
        if (!mediaDevices) throw new Error("mediaDevices not available");

        const devices = await mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');

        ['main', 'audience'].forEach(type => {
            const span = document.getElementById(`cam-${type}-active-name`);
            if (!span) return;

            if (cameraSettings[type].show && cameraSettings[type].device_id) {
                const dev = videoDevices.find(d => d.deviceId === cameraSettings[type].device_id);
                const name = dev ? (dev.label || 'Camera ' + dev.deviceId.substring(0, 5)) : 'Selected Camera';
                span.innerText = `● ${name}`;
            } else {
                span.innerText = "";
            }
        });
    } catch (err) {
        console.error("Error updating camera labels:", err);
    }
}

async function updateCameraSettings(type) {
    const fit = document.getElementById(`cam-${type}-fit`).value;
    const x = parseFloat(document.getElementById(`cam-${type}-x`).value);
    const y = parseFloat(document.getElementById(`cam-${type}-y`).value);
    const zoom = parseFloat(document.getElementById(`cam-${type}-zoom`).value);
    const opacity = parseFloat(document.getElementById(`cam-${type}-opacity`).value);

    // Effects
    const saturation = parseFloat(document.getElementById(`cam-${type}-saturation`).value);
    const hue = parseFloat(document.getElementById(`cam-${type}-hue`).value);
    const brightness = parseFloat(document.getElementById(`cam-${type}-brightness`).value);
    const contrast = parseFloat(document.getElementById(`cam-${type}-contrast`).value);

    // Masking
    const mask_image = document.getElementById(`cam-${type}-mask-image`).value;
    const mask_x = parseFloat(document.getElementById(`cam-${type}-mask-x`).value);
    const mask_y = parseFloat(document.getElementById(`cam-${type}-mask-y`).value);
    const mask_zoom = parseFloat(document.getElementById(`cam-${type}-mask-zoom`).value);
    const mask_fit = document.getElementById(`cam-${type}-mask-fit`).value;

    cameraSettings[type].fit = fit;
    cameraSettings[type].x = x;
    cameraSettings[type].y = y;
    cameraSettings[type].zoom = zoom;
    cameraSettings[type].opacity = opacity;

    cameraSettings[type].saturation = saturation;
    cameraSettings[type].hue = hue;
    cameraSettings[type].brightness = brightness;
    cameraSettings[type].contrast = contrast;

    cameraSettings[type].mask_image = mask_image;
    cameraSettings[type].mask_x = mask_x;
    cameraSettings[type].mask_y = mask_y;
    cameraSettings[type].mask_zoom = mask_zoom;
    cameraSettings[type].mask_fit = mask_fit;

    updateCameraControlUI(type);
    await saveCameraSettingsToServer();
}

function updateCameraControlUI(type) {
    const s = cameraSettings[type];
    const fields = ['x', 'y', 'zoom', 'opacity', 'saturation', 'hue', 'brightness', 'contrast', 'mask_x', 'mask_y', 'mask_zoom'];

    fields.forEach(f => {
        // Standardize: state uses underscore, DOM uses hyphen
        const domId = f.replace('_', '-');
        const el = document.getElementById(`cam-${type}-${domId}`);
        const valEl = document.getElementById(`val-cam-${type}-${f}`);

        const val = s[f] !== undefined ? s[f] : (['zoom', 'opacity', 'saturation', 'brightness', 'contrast', 'mask_zoom'].includes(f) ? 100 : 0);

        if (el) {
            el.value = val;
        }
        if (valEl) {
            let unit = "%";
            if (f === 'hue') unit = "°";
            valEl.innerText = val + unit;
        }
    });

    const elMaskImage = document.getElementById(`cam-${type}-mask-image`);
    if (elMaskImage) elMaskImage.value = s.mask_image || "";

    const elMaskFit = document.getElementById(`cam-${type}-mask-fit`);
    if (elMaskFit) elMaskFit.value = s.mask_fit || "fill";
}

function stepCameraSetting(type, field, delta) {
    const current = cameraSettings[type][field] !== undefined ? cameraSettings[type][field] : (['zoom', 'opacity', 'saturation', 'brightness', 'contrast', 'mask_zoom'].includes(field) ? 100 : 0);
    let next = current + delta;

    // Clamp values
    if (field === 'zoom' || field === 'mask_zoom') {
        if (next < 10) next = 10;
        if (next > 1000) next = 1000;
    } else if (field === 'opacity' || field === 'saturation' || field === 'brightness' || field === 'contrast') {
        if (next < 0) next = 0;
        if (next > 200) next = 200;
    } else if (field === 'hue') {
        if (next < 0) next = 0;
        if (next > 360) next = 360;
    } else {
        if (next < -200) next = -200;
        if (next > 200) next = 200;
    }

    cameraSettings[type][field] = next;
    updateCameraControlUI(type);
    saveCameraSettingsToServer();
}

async function toggleCameraOutput(type) {
    if (!window.lastSelectedCamId && !cameraSettings[type].device_id) {
        showToast("Select a camera from the list first!", "info", 1000);
        return;
    }

    // Toggle state
    cameraSettings[type].show = !cameraSettings[type].show;

    // Jika menyalakan, ambil device ID yang baru dipilih
    if (cameraSettings[type].show && window.lastSelectedCamId) {
        cameraSettings[type].device_id = window.lastSelectedCamId;
    }

    await saveCameraSettingsToServer();
    updateCamToggleButton(type, cameraSettings[type].show);

    // Refresh list badges
    refreshCameraDevices();

}

async function saveCameraSettingsToServer() {
    try {
        await fetch('/api/camera/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(cameraSettings)
        });
    } catch (e) { showToast("Failed to save camera settings", "error", 1000); }
}

function toggleCamEditor(type) {
    const content = document.getElementById(`cam-${type}-editor-content`);
    const arrow = document.getElementById(`cam-${type}-editor-arrow`);
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        arrow.innerText = '▼';
    } else {
        content.classList.add('open');
        arrow.innerText = '▲';
    }
}

function toggleCamEffect(type) {
    const content = document.getElementById(`cam-${type}-effect-content`);
    const arrow = document.getElementById(`cam-${type}-effect-arrow`);
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        arrow.innerText = '▼';
    } else {
        content.classList.add('open');
        arrow.innerText = '▲';
    }
}

function toggleCamMask(type) {
    const content = document.getElementById(`cam-${type}-mask-content`);
    const arrow = document.getElementById(`cam-${type}-mask-arrow`);
    if (content.classList.contains('open')) {
        content.classList.remove('open');
        arrow.innerText = '▼';
    } else {
        content.classList.add('open');
        arrow.innerText = '▲';
    }
}

async function browseMaskFile(type) {
    try {
        const res = await fetch('/api/browse_file_dialog/photo');
        const data = await res.json();
        if (data.status === 'success' && data.files && data.files.length > 0) {
            cameraSettings[type].mask_image = data.files[0];
            updateCameraControlUI(type);
            saveCameraSettingsToServer();
        }
    } catch (e) {
        showToast("Failed to open file dialog", "error", 1000);
    }
}

function resetCameraSetting(type, field) {
    if (['zoom', 'opacity', 'saturation', 'brightness', 'contrast', 'mask_zoom'].includes(field)) {
        cameraSettings[type][field] = 100;
    } else if (['hue', 'x', 'y', 'mask_x', 'mask_y'].includes(field)) {
        cameraSettings[type][field] = 0;
    } else if (field === 'mask_image') {
        cameraSettings[type][field] = "";
    } else if (field === 'mask_fit') {
        cameraSettings[type][field] = "fill";
    }
    updateCameraControlUI(type);
    saveCameraSettingsToServer();
}

// 🌐 MAIN WS LISTENER FOR REMOTE SYNC
document.addEventListener('DOMContentLoaded', () => {
    setupDragDropImport();
    // Wait a bit to ensure ws is defined in script.js
    setTimeout(() => {
        if (typeof ws !== 'undefined') {
            ws.addEventListener('message', (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const action = data.action || data.type;
                    const payload = data.payload || {};

                    if (action === "update_photo") {
                        if (payload.source === "remote_sender") {
                            // Extract photo ID from URL if not provided directly
                            window.remoteLivePhotoId = payload.id || (payload.url ? payload.url.split('/').pop() : null);
                            window.activeRemoteSenderIp = payload.sender_id;
                        } else {
                            window.remoteLivePhotoId = null;
                            window.activeRemoteSenderIp = null;
                        }

                        // Force re-render if we are in remote grid
                        if (typeof currentSidebarMode !== 'undefined' && currentSidebarMode === 'sender' && typeof currentActiveSender !== 'undefined' && currentActiveSender) {
                            renderRemotePhotoGrid(window.lastRemotePhotos || [], currentActiveSender);
                            renderSenderList();
                        }
                    } else if (action === "update_background") {
                        if (payload.source === "remote_sender") {
                            // Extract video ID from URL if not provided directly
                            window.remoteLiveVideoId = payload.id || (payload.url ? payload.url.split('/').pop() : null);
                            window.activeRemoteSenderIp = payload.sender_id;
                        } else {
                            window.remoteLiveVideoId = null;
                            window.activeRemoteSenderIp = null;
                        }

                        // Force re-render if we are in remote grid
                        if (typeof currentSidebarMode !== 'undefined' && currentSidebarMode === 'sender' && typeof currentActiveSender !== 'undefined' && currentActiveSender) {
                            renderRemoteVideoGrid(window.lastRemoteVideos || [], currentActiveSender);
                            renderSenderList();
                        }
                    } else if (action === "bg_control" && payload.target === "video") {
                        if (payload.source !== "remote_sender" && typeof window.forwardRemoteVideoControlToSender === 'function') {
                            window.forwardRemoteVideoControlToSender(payload.command, payload.value);
                        }
                    }
                } catch (e) { }
            });
        }
    }, 500);
});

// --- VIDEO REMOTE SENDER INTEGRATION ---
window.remoteLiveVideoId = null;
window.lastRemoteVideos = [];

function normalizeRemoteVideoVolume(value) {
    const num = Number(value);
    if (!Number.isFinite(num)) return 100;
    return Math.max(0, Math.min(100, num <= 1 ? num * 100 : num));
}

window.forwardRemoteVideoControlToSender = function (command, value) {
    if (!window.senderWs || window.senderWs.readyState !== WebSocket.OPEN) return;
    if (!window.remoteLiveVideoId || !currentActiveSender || currentActiveSender.ip !== window.activeRemoteSenderIp) return;

    let senderCommand = command;
    let senderValue = value;
    if (command === "volume") senderValue = normalizeRemoteVideoVolume(value);
    if (command === "seek") senderCommand = "sync_time";

    window.senderWs.send(JSON.stringify({
        action: "control_video",
        command: senderCommand,
        value: senderValue
    }));
};

window.enterVideoRemoteMode = async function (sender) {
    currentActiveSender = sender;
    currentActiveFolder = "ALL";
    const title = document.getElementById("bg-active-folder-name");
    if (title) title.innerText = `🌐 REMOTE VIDEO: ${sender.device_name}`;

    // Fetch videos from sender
    try {
        const tokenParam = sender.token ? `?auth=${sender.token}` : '';
        const res = await fetch(`http://${sender.ip}:${sender.ws_port}/api/videos${tokenParam}`);
        const data = await res.json();

        // Handle dictionary structure from sender
        const videosArray = data.items ? Object.values(data.items) : (Array.isArray(data) ? data : Object.values(data));
        renderRemoteVideoGrid(videosArray, sender);
    } catch (e) {
        showToast("Failed to fetch remote videos", "error", 3000);
    }

    // Connect WebSocket
    const tokenParam = sender.token ? `?auth=${sender.token}` : '';
    const wsUrl = `ws://${sender.ip}:${sender.ws_port}/ws${tokenParam}`;
    if (window.senderWs) {
        try { window.senderWs.close(); } catch (e) { }
    }

    window.senderWs = new WebSocket(wsUrl);
    window.senderWs.onopen = () => {
        console.log("[VIDEO REMOTE] Connected to sender WS");
    };

    window.senderWs.onmessage = (e) => {
        try {
            const data = JSON.parse(e.data);
            if (data.type === "video_live") {
                // If someone else (e.g. sender dashboard) took a video live
                const videoItem = data.payload.video;
                const baseUrl = data.payload.baseUrl;
                const senderIp = baseUrl.split('//')[1]?.split(':')[0] || "127.0.0.1";

                window.remoteLiveVideoId = videoItem.id;
                window.activeRemoteSenderIp = senderIp;

                const tokenParam = sender.token ? `?auth=${sender.token}` : '';
                const fullUrl = `${baseUrl}/api/videos/file/${videoItem.id}${tokenParam}`;

                // Update Main App Background State
                if (typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({
                        action: "update_background",
                        payload: {
                            url: fullUrl,
                            behavior: "loop",
                            source: "remote_sender",
                            sender_id: senderIp
                        }
                    }));
                }

                // Update UI immediately if we are in remote grid
                if (currentSidebarMode === 'sender') {
                    const currentSender = discoveredSenders.find(d => d.ip === senderIp);
                    if (currentSender) {
                        renderRemoteVideoGrid(window.lastRemoteVideos || [], currentSender);
                    }
                    renderSenderList();
                }
            } else if (data.type === "video_control" && data.payload) {
                // Relay playback commands to Main App background video
                const cmd = data.payload.command;
                const val = data.payload.value;
                const isForcedSeek = data.payload.force === true;
                const isManualSeek = data.payload.manual === true;

                if (typeof ws !== 'undefined' && ws.readyState === WebSocket.OPEN) {
                    if (cmd === "ftb") {
                        const isFtb = Boolean(val);
                        ws.send(JSON.stringify({
                            action: "bg_control",
                            payload: {
                                target: "video",
                                command: "ftb",
                                value: isFtb,
                                source: "remote_sender"
                            }
                        }));
                        ws.send(JSON.stringify({
                            action: "ftb",
                            payload: {
                                enabled: isFtb,
                                value: isFtb,
                                active: isFtb,
                                source: "remote_sender"
                            }
                        }));
                    } else {
                        ws.send(JSON.stringify({
                            action: "bg_control",
                            payload: {
                                target: "video",
                                command: cmd,
                                value: cmd === "volume" ? normalizeRemoteVideoVolume(val) / 100 : (cmd === "loop" ? (val === "loop" || val === true) : val),
                                force: isForcedSeek,
                                manual: isManualSeek,
                                source: "remote_sender"
                            }
                        }));
                    }
                }
            }
        } catch (err) {
            console.error("[VIDEO REMOTE] Error processing message:", err);
        }
    };
};

function renderRemoteVideoGrid(videos, sender) {
    const grid = document.getElementById("bg-grid-container");
    if (!grid) return;
    grid.innerHTML = "";

    if (!videos || videos.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: #666; font-style: italic;">No videos found on ${sender.device_name}</div>`;
        return;
    }

    const baseUrl = `http://${sender.ip}:${sender.ws_port}`;

    videos.forEach(video => {
        const box = document.createElement("div");
        box.className = "bg-media-card";

        const thumbUrl = `${baseUrl}/api/videos/thumb/${video.id}`;
        const thumbHtml = `<div class="bg-media-thumb-wrap"><img src="${thumbUrl}" class="bg-media-thumb" onerror="this.src='/static/logo.png'"></div>`;

        if (window.remoteLiveVideoId === video.id && sender.ip === window.activeRemoteSenderIp) {
            box.classList.add("live");
        }

        box.innerHTML = `${thumbHtml}<div class="bg-media-label" title="${video.name}">${video.name}</div>`;

        box.onclick = () => {
            applyRemoteVideo(video, sender);
        };

        grid.appendChild(box);
    });
    window.lastRemoteVideos = videos; // Cache for re-renders
}

function applyRemoteVideo(videoItem, sender) {
    const baseUrl = `http://${sender.ip}:${sender.ws_port}`;
    const fullUrl = `${baseUrl}/api/videos/file/${videoItem.id}`;

    window.remoteLiveVideoId = videoItem.id;
    window.activeRemoteSenderIp = sender.ip;

    ws.send(JSON.stringify({
        action: "update_background",
        payload: {
            url: fullUrl,
            behavior: "loop",
            source: "remote_sender",
            sender_id: sender.ip
        }
    }));
    if (typeof createOrUpdateFloatingPlayer === 'function') {
        createOrUpdateFloatingPlayer('video', videoItem.name || 'Remote Video');
    }

    // Update UI
    renderRemoteVideoGrid(window.lastRemoteVideos || [], sender);
    renderSenderList();

    // Sync to Sender's Backend so sender dashboard shows 'LIVE' status
    if (window.senderWs && window.senderWs.readyState === WebSocket.OPEN) {
        window.senderWs.send(JSON.stringify({
            action: "take_video",
            video: videoItem
        }));
    }
}

// ==========================================
// --- DRAG & DROP MEDIA IMPORT SYSTEM ---
// ==========================================
function setupDragDropImport() {
    const dropZone = document.getElementById("bg-library-content");
    const overlay = document.getElementById("bg-drag-overlay");
    if (!dropZone || !overlay) return;

    window.isDraggingInternalMedia = false;

    window.addEventListener("dragstart", () => {
        window.isDraggingInternalMedia = true;
    });

    window.addEventListener("dragend", () => {
        window.isDraggingInternalMedia = false;
    });

    const isDragDropAllowed = (e) => {
        if (window.isDraggingInternalMedia) {
            return false;
        }
        if (!e || !e.dataTransfer || !e.dataTransfer.types) return false;
        const typesArr = Array.from(e.dataTransfer.types);
        if (!typesArr.includes("Files")) {
            return false;
        }

        return (
            typeof currentMediaCategory !== 'undefined' &&
            currentMediaCategory !== 'scripture' &&
            currentMediaCategory !== 'camera'
        );
    };

    dropZone.addEventListener("dragenter", (e) => {
        if (!isDragDropAllowed(e)) return;
        e.preventDefault();
        overlay.style.display = "flex";
    });

    dropZone.addEventListener("dragover", (e) => {
        if (!isDragDropAllowed(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    });

    dropZone.addEventListener("dragleave", (e) => {
        if (!isDragDropAllowed(e)) return;
        e.preventDefault();
        // If cursor moves into a child element inside dropZone, do not hide overlay
        if (e.relatedTarget && dropZone.contains(e.relatedTarget)) {
            return;
        }
        overlay.style.display = "none";
    });

    dropZone.addEventListener("drop", async (e) => {
        if (!isDragDropAllowed(e)) return;
        e.preventDefault();
        overlay.style.display = "none";

        const files = e.dataTransfer.files;
        if (!files || files.length === 0) return;

        const paths = [];
        for (let i = 0; i < files.length; i++) {
            // Priority 1: webUtils through preload
            // Priority 2: direct .path (if contextIsolation is false or we are in pywebview)
            let filePath = "";
            if (window.electronAPI && window.electronAPI.getFilePath) {
                filePath = window.electronAPI.getFilePath(files[i]);
            }
            if (!filePath && files[i].path) {
                filePath = files[i].path;
            }

            if (filePath) {
                paths.push(filePath);
            }
        }

        if (paths.length === 0) {
            showToast("Silakan jalankan aplikasi via Launcher/Desktop App agar bisa Import Drag & Drop", "error", 4000);
            return;
        }

        showToast("Inspecting dropped paths...", "loading");
        try {
            const res = await fetch("/api/media/inspect_paths", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ paths: paths })
            });
            const data = await res.json();

            if (data.status === "success") {
                const filesList = data.files || [];
                const foldersList = data.folders || [];

                // Process files
                if (filesList.length > 0) {
                    await importIndividualFiles(filesList);
                }

                // Process folders
                if (foldersList.length > 0) {
                    await importFolders(foldersList);
                }
            } else {
                showToast("Failed to inspect paths: " + data.message, "error", 3000);
            }
        } catch (err) {
            console.error("Error inspecting paths:", err);
            showToast("Failed to process drop", "error", 2000);
        }
    });
}

function getCategoryByExtension(filePath) {
    const ext = "." + filePath.split('.').pop().toLowerCase();

    // Check against category extensions
    const photoExts = [".jpg", ".jpeg", ".png", ".gif", ".webp"];
    const audioExts = [".mp3", ".wav", ".m4a", ".aac", ".ogg"];
    const presExts = [".pdf", ".pptx"];
    const videoExts = [".mp4"]; // Only .mp4 allowed per request

    if (photoExts.includes(ext)) return "photo";
    if (audioExts.includes(ext)) return "audio";
    if (presExts.includes(ext)) return "presentation";
    if (videoExts.includes(ext)) return "video";
    return null;
}

async function importIndividualFiles(files) {
    // Group files by category
    const grouped = {
        video: [],
        photo: [],
        presentation: [],
        audio: []
    };

    files.forEach(filePath => {
        const cat = getCategoryByExtension(filePath);
        if (cat) {
            grouped[cat].push(filePath);
        }
    });

    let totalImported = 0;
    const activeFolder = (typeof currentActiveFolder !== 'undefined' && currentActiveFolder !== 'ALL') ? currentActiveFolder : 'Uncategorized';

    // Import for each category that has files
    for (const [category, filePaths] of Object.entries(grouped)) {
        if (filePaths.length === 0) continue;

        showToast(`Importing ${filePaths.length} file(s) into ${category.toUpperCase()}...`, "loading");
        try {
            const res = await fetch(`/api/media/${category}/add_files`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    folder_name: activeFolder,
                    files: filePaths
                })
            });
            const data = await res.json();
            if (data.status === "success") {
                totalImported += filePaths.length;

                // Trigger watchers for thumbnails if needed
                if ((category === "video" || category === "photo") && Array.isArray(data.created_ids) && data.created_ids.length > 0 && typeof window.startThumbRealtimeWatcher === "function") {
                    window.startThumbRealtimeWatcher(data.created_ids, category);
                }
            } else {
                showToast(`Failed to import files to ${category}: ${data.message}`, "error", 3000);
            }
        } catch (e) {
            console.error(`Import error for category ${category}:`, e);
        }
    }

    if (totalImported > 0) {
        showToast(`Successfully imported ${totalImported} file(s)!`, "success", 2000);
        // Refresh active category library view
        loadMediaData(currentMediaCategory);
    }
}

async function importFolders(folders) {
    // Ask user via showCustomDialog
    const categoryName = currentMediaCategory.toUpperCase();
    const options = [
        { value: "all", label: `📁 Import All Files` },
        { value: "category", label: `📂 Import Only ${categoryName} files` }
    ];

    const decision = await showCustomDialog(
        "select",
        `You dropped folder(s). Select import mode:`,
        options,
        "category"
    );

    if (!decision) {
        showToast("Folder import cancelled", "info", 1500);
        return;
    }

    let foldersProcessed = 0;

    for (const folder of folders) {
        showToast(`Processing folder: ${folder.name}...`, "loading");

        const targetCategories = decision === "all" ? ["video", "photo", "presentation", "audio"] : [currentMediaCategory];

        for (const category of targetCategories) {
            try {
                const res = await fetch(`/api/media/${category}/add_folder?folder_path=${encodeURIComponent(folder.path)}`, {
                    method: 'POST'
                });
                const data = await res.json();

                if (data.status === "success") {
                    // Trigger watchers for thumbnails if needed
                    if ((category === "video" || category === "photo") && Array.isArray(data.created_ids) && data.created_ids.length > 0 && typeof window.startThumbRealtimeWatcher === "function") {
                        window.startThumbRealtimeWatcher(data.created_ids, category);
                    }
                }
            } catch (e) {
                console.error(`Error importing folder ${folder.path} for category ${category}:`, e);
            }
        }
        foldersProcessed++;
    }

    if (foldersProcessed > 0) {
        showToast(`Folder import completed!`, "success", 2500);
        // Refresh active category library view
        loadMediaData(currentMediaCategory);
    }
}

// === MEDIA SCHEDULE & DIRECT LIVE HELPER FUNCTIONS ===
function fireDirectLiveMedia(mediaId, mediaName, category) {
    const streamUrl = (category === 'video') ? `/api/stream_video/${mediaId}` :
                      (category === 'photo') ? `/api/stream_photo/${mediaId}` :
                      `/api/stream_audio/${mediaId}`;

    if (category === 'video' || category === 'photo') {
        if (typeof ws !== 'undefined' && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: "update_background",
                payload: { url: streamUrl, behavior: "loop", type: category }
            }));
        }
    } else if (category === 'audio') {
        if (typeof ws !== 'undefined' && ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: "play_audio",
                payload: { url: streamUrl, id: mediaId, name: mediaName }
            }));
        }
    }
    if (typeof createOrUpdateFloatingPlayer === 'function') {
        createOrUpdateFloatingPlayer(category, mediaName);
    }
}
window.fireDirectLiveMedia = fireDirectLiveMedia;

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

    const targetList = (typeof scheduleList !== 'undefined' ? scheduleList : (window.scheduleList || []));
    if (insertIndex !== -1 && insertIndex >= 0 && insertIndex <= targetList.length) {
        targetList.splice(insertIndex, 0, newItem);
    } else {
        targetList.push(newItem);
    }

    if (typeof renderSchedule === 'function') renderSchedule();
    if (typeof saveActiveSchedule === 'function') await saveActiveSchedule();
};
