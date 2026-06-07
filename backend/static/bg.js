let bgDatabase = { folders: [], videos: {} };
let currentActiveFolder = "ALL";
let currentActiveSender = null;
window.remoteLivePhotoId = null;
window.activeRemoteSenderIp = null;

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

    if (content.style.display === "none" || content.style.display === "") {
        content.style.display = "flex";
        if (resizer) resizer.style.display = "block";
        icon.innerText = "▼ COLLAPSE";

        if (currentMediaCategory === 'scripture') {
            // Pastikan scripture panel terlihat saat expand
            const mediaPanel = document.getElementById("bg-media-panel");
            const scrPanel = document.getElementById("scr-lib-panel");
            if (mediaPanel) mediaPanel.style.display = "none";
            if (scrPanel) scrPanel.style.display = "flex";
            if (typeof loadBibleTranslations === 'function') loadBibleTranslations();
        } else {
            // Load media biasa jika belum ada data
            if (!mediaDatabase.folders || mediaDatabase.folders.length === 0) {
                loadMediaData(currentMediaCategory);
            }
        }
    } else {
        content.style.display = "none";
        if (resizer) resizer.style.display = "none";
        icon.innerText = "▲ EXPAND";
    }
}

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
    document.getElementById("bg-preview-title").innerText = name;
    const container = document.getElementById("bg-video-container");
    container.innerHTML = `<video src="/api/stream_video/${id}" style="max-height: 70vh; max-width: 90vw;" autoplay loop controls></video>`;
    document.getElementById("bg-preview-modal").style.display = "flex";
}

function closeBgPreview() {
    document.getElementById("bg-preview-modal").style.display = "none";
    const container = document.getElementById("bg-video-container");

    const vid = container.querySelector('video');
    if (vid) {
        vid.pause();
        vid.removeAttribute('src');
        vid.load();
    }
    container.innerHTML = "";
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
let mediaDatabase = { folders: [], items: {} };

function switchMediaCategory(event, category) {
    if (event) event.stopPropagation();
    if (currentMediaCategory === category) return;

    currentMediaCategory = category;
    currentActiveFolder = "ALL";

    const btns = document.querySelectorAll(".media-cat-btn");
    btns.forEach(btn => { btn.classList.remove("active"); });

    const activeBtn = event ? event.currentTarget : document.querySelector(`.media-cat-btn[onclick*="'${category}'"]`);
    if (activeBtn) { activeBtn.classList.add("active"); }

    const content = document.getElementById("bg-library-content");
    const icon = document.getElementById("bg-toggle-icon");
    const resizer = document.getElementById("bg-library-resizer");
    if (content && (content.style.display === "none" || content.style.display === "")) {
        content.style.display = "flex";
        if (resizer) resizer.style.display = "block";
        if (icon) icon.innerText = "▼ COLLAPSE";
    }

    const mediaPanel = document.getElementById("bg-media-panel");
    const scrPanel = document.getElementById("scr-lib-panel");

    const sidebarTabs = document.getElementById("bg-sidebar-tabs");
    if (sidebarTabs) {
        sidebarTabs.style.display = (category === 'presentation' || category === 'photo' || category === 'video') ? "flex" : "none";
    }

    if (category === 'scripture') {
        if (mediaPanel) mediaPanel.style.display = "none";
        if (scrPanel) scrPanel.style.display = "flex";
        const camPanel = document.getElementById("cam-lib-panel");
        if (camPanel) camPanel.style.display = "none";
        if (typeof loadBibleTranslations === 'function') loadBibleTranslations();
    } else if (category === 'camera') {
        if (mediaPanel) mediaPanel.style.display = "none";
        if (scrPanel) scrPanel.style.display = "none";
        const camPanel = document.getElementById("cam-lib-panel");
        if (camPanel) camPanel.style.display = "flex";
        refreshCameraDevices();
        loadCameraSettings();
    } else {
        if (scrPanel) scrPanel.style.display = "none";
        const camPanel = document.getElementById("cam-lib-panel");
        if (camPanel) camPanel.style.display = "none";
        if (mediaPanel) mediaPanel.style.display = "flex";

        // Reset sidebar mode to local when switching categories, but ONLY if we are not actively in a remote PPT session
        const isRemotePptActive = document.getElementById("ppt-remote-ui") && document.getElementById("ppt-remote-ui").style.display !== "none";
        if (!isRemotePptActive) {
            setSidebarMode('local');
        }
        loadMediaData(category);
    }
}

let currentSidebarMode = 'local';
let discoveredSenders = [];

function setSidebarMode(mode) {
    currentSidebarMode = mode;
    const tabs = document.querySelectorAll(".bg-sb-tab");
    tabs.forEach(t => {
        t.classList.toggle("active", t.getAttribute("onclick").includes(`'${mode}'`));
    });

    const localSection = document.getElementById("bg-local-section");
    const senderSection = document.getElementById("bg-sender-section");

    if (mode === 'local') {
        localSection.style.display = "flex";
        senderSection.style.display = "none";
    } else {
        localSection.style.display = "none";
        senderSection.style.display = "flex";
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

window.enterPhotoRemoteMode = async function (sender) {
    currentActiveSender = sender;
    currentActiveFolder = "ALL";
    const title = document.getElementById("bg-active-folder-name");
    if (title) title.innerText = `🌐 REMOTE PHOTO: ${sender.device_name}`;

    // Fetch photos from sender
    try {
        const res = await fetch(`http://${sender.ip}:${sender.ws_port}/api/photos`);
        const data = await res.json();

        // Handle dictionary structure from sender
        const photosArray = data.items ? Object.values(data.items) : (Array.isArray(data) ? data : Object.values(data));
        renderRemotePhotoGrid(photosArray, sender);
    } catch (e) {
        showToast("Failed to fetch remote photos", "error", 3000);
    }

    // Connect WebSocket
    const wsUrl = `ws://${sender.ip}:${sender.ws_port}/ws`;
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

                const fullUrl = `${baseUrl}/api/photos/file/${photo.id}`;

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
                    if (data.payload.value) {
                        ws.send(JSON.stringify({
                            action: "update_photo",
                            payload: {
                                url: "",
                                source: "remote_sender",
                                sender_id: sender.ip
                            }
                        }));
                    } else if (window.remoteLivePhotoId) {
                        const restoreBaseUrl = `http://${sender.ip}:${sender.ws_port}`;
                        const fullUrl = `${restoreBaseUrl}/api/photos/file/${window.remoteLivePhotoId}`;
                        ws.send(JSON.stringify({
                            action: "update_photo",
                            payload: {
                                url: fullUrl,
                                source: "remote_sender",
                                sender_id: sender.ip
                            }
                        }));
                    }
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

function renderMediaGrid() {
    const grid = document.getElementById("bg-grid-container");
    if (!grid) return;
    grid.innerHTML = "";

    // Sync dropdown select value
    const sortSelect = document.getElementById("media-sort-select");
    if (sortSelect) {
        sortSelect.value = `${mediaSortKey}_${mediaSortOrder}`;
    }

    const items = mediaDatabase.items || {};
    const itemsArray = Object.keys(items).map(key => {
        let obj = items[key];
        obj.id = obj.id || key;
        return obj;
    });

    const filteredItems = itemsArray.filter(item =>
        currentActiveFolder === "ALL" || item.folder === currentActiveFolder
    );

    if (filteredItems.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 20px; text-align: center; color: #666; font-style: italic;">No files in ${currentMediaCategory.toUpperCase()} category</div>`;
        return;
    }

    // Sort filteredItems
    filteredItems.sort((a, b) => {
        let compare = 0;
        if (mediaSortKey === 'date') {
            compare = (a.mtime || 0) - (b.mtime || 0);
        } else {
            compare = a.name.localeCompare(b.name, undefined, { sensitivity: 'base', numeric: true });
        }
        return mediaSortOrder === 'desc' ? -compare : compare;
    });

    filteredItems.forEach(item => {
        const box = document.createElement("div");
        box.className = "bg-media-card";

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

        box.innerHTML = `${thumbHtml}<div class="bg-media-label" title="${item.name}">${item.name}</div>`;
        box.draggable = true;
        box.ondragstart = (e) => {
            e.dataTransfer.setData("text/plain", JSON.stringify({
                action: "apply_media",
                id: item.id,
                category: currentMediaCategory,
                name: item.name
            }));
        };

        box.oncontextmenu = (e) => {
            e.preventDefault();
            showLibraryContextMenu(e, item.id, item.name, currentMediaCategory);
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
        // 🎯 CHECK IF RUNNING IN ELECTRON
        const isElectron = typeof window.electronAPI !== 'undefined';

        let videoDevices = [];

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
                    tempStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    console.log("getUserMedia successful, stream tracks:", tempStream.getTracks().length);
                    console.log("Stream tracks:", tempStream.getTracks().map(t => ({ kind: t.kind, label: t.label, enabled: t.enabled })));
                } catch (getUserMediaErr) {
                    console.error("getUserMedia failed:", getUserMediaErr);
                    console.error("getUserMedia error name:", getUserMediaErr.name);
                    console.error("getUserMedia error message:", getUserMediaErr.message);
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
                list.innerHTML = `<div style="padding:10px; color:#ff4444; font-size:0.7em;">❌ Error: ${electronErr.message}</div>`;
                return;
            }
        } else {
            console.log("🌐 Browser mode detected - using navigator.mediaDevices");
            videoDevices = await getCameraDevicesWeb();
        }

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
        await Promise.race([mediaPromise, timeoutPromise]);

        // After permission granted, enumerate devices
        const devices = await mediaDevices.enumerateDevices();
        return devices.filter(d => d.kind === 'videoinput');
    } catch (err) {
        console.error("Web camera API error:", err);

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

// Cache for successful constraints to speed up subsequent camera opens
let successfulConstraintCache = null;
let lastDeviceId = null;

async function selectCameraForPreview(deviceId, element) {
    document.querySelectorAll(".cam-device-item").forEach(el => el.classList.remove("active"));
    element.classList.add("active");
    if (currentCamStream) { currentCamStream.getTracks().forEach(track => track.stop()); }

    const video = document.getElementById("cam-local-preview");
    const noPreview = document.getElementById("cam-no-preview");

    try {
        console.log("🎬 Opening camera preview for device:", deviceId);

        // 🎯 CHECK IF RUNNING IN ELECTRON
        const isElectron = typeof window.electronAPI !== 'undefined';
        let stream;
        let lastError = null;

        // 🎯 Clear cache if switching to a different camera
        if (lastDeviceId && lastDeviceId !== deviceId) {
            console.log("🔄 Different camera selected, clearing cache");
            successfulConstraintCache = null;
        }
        lastDeviceId = deviceId;

        // 🎯 Helper function with timeout (increased to 10 seconds)
        const getUserMediaWithTimeout = async (constraints, timeout = 10000) => {
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("getUserMedia timeout")), timeout)
            );
            const mediaPromise = navigator.mediaDevices.getUserMedia(constraints);
            return await Promise.race([mediaPromise, timeoutPromise]);
        };

        // 🎯 Try cached successful constraint first (if available and same device)
        if (successfulConstraintCache && lastDeviceId === deviceId) {
            try {
                console.log("🎯 Trying cached successful constraint first");
                stream = await getUserMediaWithTimeout(successfulConstraintCache, 5000);
                console.log("✅ Success with cached constraint");
                currentCamStream = stream;
                video.srcObject = stream;
                video.style.opacity = "1";
                noPreview.style.display = "none";
                window.lastSelectedCamId = deviceId;
                console.log("Camera preview started successfully (cached)");
                return;
            } catch (err) {
                console.warn("❌ Cached constraint failed, trying other options:", err.message);
                successfulConstraintCache = null; // Clear cache if it fails
            }
        }

        // 🎯 OPTIMIZED CONSTRAINT TESTING - Fewer attempts with longer timeout
        // Start with most likely to work constraints first

        const constraintAttempts = [
            // Attempt 1: Exact device without resolution (most likely to work in Electron)
            { name: "Exact device (no resolution)", constraints: { video: { deviceId: { exact: deviceId } } } },
            // Attempt 2: Simplest - any camera (fallback)
            { name: "Simple (any camera)", constraints: { video: true } },
            // Attempt 3: Exact device with ideal resolution
            { name: "Exact device with ideal resolution", constraints: { video: { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } } } }
        ];

        for (const attempt of constraintAttempts) {
            try {
                console.log(`🎯 Attempting: ${attempt.name}`);

                stream = await getUserMediaWithTimeout(attempt.constraints, 10000);

                console.log(`✅ Success with: ${attempt.name}`);
                // Cache the successful constraint for future use
                successfulConstraintCache = attempt.constraints;
                lastError = null;
                break; // Success - exit loop
            } catch (err) {
                console.warn(`❌ Failed with ${attempt.name}:`, err.message);
                lastError = err;
                // Continue to next attempt
            }
        }

        if (!stream) {
            throw lastError || new Error("All constraint attempts failed");
        }

        console.log("Camera stream obtained successfully");
        currentCamStream = stream;
        video.srcObject = stream;
        video.style.opacity = "1";
        noPreview.style.display = "none";
        window.lastSelectedCamId = deviceId;
        console.log("Camera preview started successfully");
    } catch (e) {
        console.error("Failed to open camera preview:", e);
        console.error("Error name:", e.name);
        console.error("Error message:", e.message);
        showToast("Failed to open camera preview: " + e.message, "error", 2000);
    }
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
        const res = await fetch(`http://${sender.ip}:${sender.ws_port}/api/videos`);
        const data = await res.json();

        // Handle dictionary structure from sender
        const videosArray = data.items ? Object.values(data.items) : (Array.isArray(data) ? data : Object.values(data));
        renderRemoteVideoGrid(videosArray, sender);
    } catch (e) {
        showToast("Failed to fetch remote videos", "error", 3000);
    }

    // Connect WebSocket
    const wsUrl = `ws://${sender.ip}:${sender.ws_port}/ws`;
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

                const fullUrl = `${baseUrl}/api/videos/file/${videoItem.id}`;

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
                        if (val) {
                            ws.send(JSON.stringify({
                                action: "update_background",
                                payload: {
                                    url: "",
                                    source: "remote_sender",
                                    sender_id: sender.ip
                                }
                            }));
                        } else if (window.remoteLiveVideoId) {
                            const restoreBaseUrl = `http://${sender.ip}:${sender.ws_port}`;
                            ws.send(JSON.stringify({
                                action: "update_background",
                                payload: {
                                    url: `${restoreBaseUrl}/api/videos/file/${window.remoteLiveVideoId}`,
                                    behavior: "loop",
                                    source: "remote_sender",
                                    sender_id: sender.ip
                                }
                            }));
                        }
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

    const isDragDropAllowed = () => {
        return (
            typeof currentMediaCategory !== 'undefined' &&
            currentMediaCategory !== 'scripture' &&
            currentMediaCategory !== 'camera'
        );
    };

    dropZone.addEventListener("dragenter", (e) => {
        if (!isDragDropAllowed()) return;
        e.preventDefault();
        overlay.style.display = "flex";
    });

    dropZone.addEventListener("dragover", (e) => {
        if (!isDragDropAllowed()) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
    });

    dropZone.addEventListener("dragleave", (e) => {
        if (!isDragDropAllowed()) return;
        e.preventDefault();
        // If cursor moves into a child element inside dropZone, do not hide overlay
        if (e.relatedTarget && dropZone.contains(e.relatedTarget)) {
            return;
        }
        overlay.style.display = "none";
    });

    dropZone.addEventListener("drop", async (e) => {
        if (!isDragDropAllowed()) return;
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

