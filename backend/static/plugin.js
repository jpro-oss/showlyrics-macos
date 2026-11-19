// plugin.js — ShowLyrics Plugin System Logic, Canvas Editor, and Library Management
(function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────
    // Global State
    // ─────────────────────────────────────────────────────────────────────────
    let pluginFolders = [];
    let pluginPresets = [];
    let activeFolderId = 'ALL';
    let searchQuery = '';
    let activePluginsMap = {}; // preset_id -> active info

    // Canvas Editor State
    let currentPreset = null;
    let initialPresetSnapshot = '';
    let selectedElementIds = new Set();
    let isInlineEditing = false;
    let activeInlineEditingElId = null;
    let canvasZoom = 0.5;
    let simulatedBg = 'checkerboard'; // 'checkerboard', 'solid', 'stage'
    let historyStack = [];
    let redoStack = [];
    let clipboardElements = null;

    // Interaction Drag & Selection State
    let isDraggingElement = false;
    let isResizingElement = false;
    let isMarqueeSelecting = false;
    let marqueeStartX = 0, marqueeStartY = 0;
    let resizeHandleType = null;
    let startMouseX = 0, startMouseY = 0;
    let startElPositions = {}; // id -> { x, y }
    let startElX = 0, startElY = 0, startElW = 0, startElH = 0, startFontSize = 24;
    let hasDraggedElement = false;
    let dragStartMouseX = 0, dragStartMouseY = 0;

    // Photo Library Picker State
    let photoLibraryData = { folders: ['ALL'], items: {} };
    let activePhotoFolder = 'ALL';
    let photoSearchQuery = '';
    let selectedPhotoId = null;

    // Helper: get first selected element id
    function getSelectedElementId() {
        if (selectedElementIds.size === 0) return null;
        return Array.from(selectedElementIds)[0];
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1. Library Fetch & Rendering
    // ─────────────────────────────────────────────────────────────────────────
    async function loadPluginLibrary() {
        try {
            const res = await fetch('/api/plugins');
            if (!res.ok) return;
            const data = await res.json();
            pluginFolders = data.folders || [];
            pluginPresets = data.presets || [];
            renderFolderList();
            renderPresetGrid();
        } catch (e) {
            console.error('[Plugin] Error loading plugins:', e);
        }
    }
    window.loadPluginLibrary = loadPluginLibrary;

    function renderFolderList() {
        const container = document.getElementById('plugin-folder-list');
        if (!container) return;
        container.innerHTML = '';

        // Hitung count per folder
        const counts = {};
        pluginPresets.forEach(p => {
            const f = p.folder || 'ALL';
            counts[f] = (counts[f] || 0) + 1;
        });
        counts['ALL'] = pluginPresets.length;

        pluginFolders.forEach(folder => {
            const item = document.createElement('div');
            item.className = `plugin-folder-item ${folder.id === activeFolderId ? 'active' : ''}`;
            item.onclick = () => switchPluginFolder(folder.id);
            item.oncontextmenu = (e) => showPluginFolderContextMenu(e, folder.id);

            const count = counts[folder.id] || 0;
            item.innerHTML = `
                <span>📁 ${escapeHtml(folder.name)}</span>
                <span class="plugin-folder-count">${count}</span>
            `;
            container.appendChild(item);
        });

        // Allow right clicking on empty sidebar space to create a new folder
        container.oncontextmenu = (e) => {
            if (e.target === container) {
                showPluginSidebarContextMenu(e);
            }
        };
    }

    function switchPluginFolder(folderId) {
        activeFolderId = folderId;
        renderFolderList();
        renderPresetGrid();
    }
    window.switchPluginFolder = switchPluginFolder;

    function filterPluginPresets(query) {
        searchQuery = (query || '').toLowerCase().trim();
        renderPresetGrid();
    }
    window.filterPluginPresets = filterPluginPresets;

    function renderPresetGrid() {
        const container = document.getElementById('plugin-grid-container');
        if (!container) return;
        container.innerHTML = '';

        let filtered = pluginPresets.filter(p => {
            const matchFolder = activeFolderId === 'ALL' || (p.folder || 'ALL') === activeFolderId;
            const matchSearch = !searchQuery || (p.name || '').toLowerCase().includes(searchQuery) || (p.category || '').toLowerCase().includes(searchQuery);
            return matchFolder && matchSearch;
        });

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #6b7280; padding: 40px; font-size: 0.85em;">
                    Tidak ada plugin dalam kategori ini.
                </div>
            `;
            return;
        }

        filtered.forEach(preset => {
            const card = document.createElement('div');
            const isLive = !!activePluginsMap[preset.id];
            card.className = `plugin-card ${isLive ? 'active-live' : ''}`;
            card.id = `plugin-card-${preset.id}`;
            card.oncontextmenu = (e) => showPluginPresetContextMenu(e, preset.id);

            // Thumbnail Preview (Uses snapshot image if available, otherwise scalable miniCanvas)
            const previewEl = document.createElement('div');
            previewEl.className = 'plugin-card-preview';

            if (preset.thumbnail) {
                const img = document.createElement('img');
                img.className = 'plugin-card-thumb-img';
                img.src = preset.thumbnail;
                img.alt = preset.name;
                img.loading = 'lazy';
                previewEl.appendChild(img);
            } else {
                const miniCanvas = document.createElement('div');
                miniCanvas.className = 'plugin-card-thumbnail-canvas';
                // Centered 16:9 proportional scaling
                const updateMiniCanvasScale = () => {
                    const w = previewEl.clientWidth || 300;
                    const s = w / 1920;
                    miniCanvas.style.transform = `translate(-50%, -50%) scale(${s})`;
                };
                requestAnimationFrame(updateMiniCanvasScale);

                (preset.elements || []).forEach(el => {
                    const elDiv = document.createElement('div');
                    elDiv.style.position = 'absolute';
                    elDiv.style.left = (el.x || 0) + 'px';
                    elDiv.style.top = (el.y || 0) + 'px';
                    elDiv.style.width = (el.width || 100) + 'px';
                    elDiv.style.height = (el.height || 50) + 'px';
                    elDiv.style.borderRadius = (el.borderRadius || 0) + 'px';
                    elDiv.style.zIndex = el.zIndex || 1;

                    if (el.type === 'shape') {
                        elDiv.style.backgroundColor = el.bgColor || '#333333';
                        elDiv.style.opacity = el.bgOpacity !== undefined ? el.bgOpacity : 1;
                        if (el.borderWidth) elDiv.style.border = `${el.borderWidth}px solid ${el.borderColor || 'transparent'}`;
                    } else if (el.type === 'text') {
                        elDiv.style.color = el.color || '#ffffff';
                        elDiv.style.fontSize = (el.fontSize || 24) + 'px';
                        elDiv.style.fontFamily = el.fontFamily || 'Montserrat';
                        elDiv.style.fontWeight = el.bold ? 'bold' : 'normal';
                        elDiv.style.textAlign = el.align || 'center';
                        elDiv.innerText = el.text || '';
                    } else if (el.type === 'timer' || el.type === 'stopwatch' || el.type === 'clock') {
                        elDiv.style.color = el.color || '#00e5ff';
                        elDiv.style.fontSize = (el.fontSize || 48) + 'px';
                        elDiv.style.fontFamily = el.fontFamily || 'Montserrat';
                        elDiv.style.fontWeight = 'bold';
                        elDiv.style.textAlign = el.align || 'center';
                        elDiv.innerText = '00:00:00';
                    } else if (el.type === 'image' && el.url) {
                        const imgEl = document.createElement('img');
                        imgEl.src = el.url;
                        imgEl.style.width = '100%';
                        imgEl.style.height = '100%';
                        imgEl.style.objectFit = el.fit || 'contain';
                        elDiv.appendChild(imgEl);
                    }
                    miniCanvas.appendChild(elDiv);
                });
                previewEl.appendChild(miniCanvas);
            }

            // Badges
            const badgesEl = document.createElement('div');
            badgesEl.className = 'plugin-card-badges';
            const catBadge = document.createElement('span');
            catBadge.className = 'badge-cat';
            catBadge.innerText = preset.category || 'CUSTOM';
            badgesEl.appendChild(catBadge);

            const targetBadge = document.createElement('span');
            targetBadge.className = 'badge-target';
            const targets = preset.targets || ['main'];
            targetBadge.innerText = targets.includes('main') && targets.includes('lt') ? 'MAIN & LT' : (targets.includes('lt') ? 'LT ONLY' : 'MAIN ONLY');
            badgesEl.appendChild(targetBadge);
            previewEl.appendChild(badgesEl);

            card.appendChild(previewEl);

            // Card Body
            const bodyEl = document.createElement('div');
            bodyEl.className = 'plugin-card-body';

            const titleRow = document.createElement('div');
            titleRow.className = 'plugin-card-title-row';

            const titleSpan = document.createElement('span');
            titleSpan.className = 'plugin-card-title';
            titleSpan.title = preset.name;
            titleSpan.innerText = preset.name;

            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'plugin-live-toggle';
            toggleBtn.innerHTML = isLive ? '● ON AIR' : '○ SHOW';
            toggleBtn.onclick = (e) => {
                e.stopPropagation();
                togglePluginLive(preset.id);
            };

            titleRow.appendChild(titleSpan);
            titleRow.appendChild(toggleBtn);
            bodyEl.appendChild(titleRow);

            // Timer / Stopwatch Mini Controls (Jika preset mengandung timer/stopwatch)
            const hasTimerOrSW = (preset.elements || []).some(el => el.type === 'timer' || el.type === 'stopwatch');
            if (hasTimerOrSW) {
                const timerBar = document.createElement('div');
                timerBar.className = 'plugin-timer-bar';

                const activeEntry = activePluginsMap[preset.id];
                const isLive = !!activeEntry;
                let isRunning = false;
                if (activeEntry && activeEntry.timers) {
                    isRunning = Object.values(activeEntry.timers).some(t => t.running);
                }

                // 1. Smart Toggle Button (Play / Pause)
                const playPauseBtn = document.createElement('button');
                playPauseBtn.className = `btn-timer-pill ${isRunning ? 'btn-timer-pause-toggle' : 'btn-timer-play-toggle'}`;
                playPauseBtn.innerHTML = isRunning ? '⏸ PAUSE' : '▶ PLAY';
                playPauseBtn.title = isRunning ? 'Pause Timer' : 'Play / Resume Timer';
                playPauseBtn.disabled = !isLive;
                playPauseBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (!isLive) return;
                    controlPluginTimer(preset.id, isRunning ? 'pause' : 'play');
                };

                // 2. Reset Button
                const resetBtn = document.createElement('button');
                resetBtn.className = 'btn-timer-pill btn-timer-reset-toggle';
                resetBtn.innerHTML = '↺ RESET';
                resetBtn.title = 'Reset Timer Duration';
                resetBtn.disabled = !isLive;
                resetBtn.onclick = (e) => {
                    e.stopPropagation();
                    if (!isLive) return;
                    controlPluginTimer(preset.id, 'reset');
                };

                timerBar.appendChild(playPauseBtn);
                timerBar.appendChild(resetBtn);
                bodyEl.appendChild(timerBar);
            }

            card.appendChild(bodyEl);
            container.appendChild(card);
        });
    }

    function filterPluginGrid(query) {
        searchQuery = query || '';
        renderPresetGrid();
    }
    window.filterPluginGrid = filterPluginGrid;

    // ─────────────────────────────────────────────────────────────────────────
    // 2. Live Toggle & Timer Control
    // ─────────────────────────────────────────────────────────────────────────
    function togglePluginLive(presetId) {
        const preset = pluginPresets.find(p => p.id === presetId);
        if (!preset) return;

        const sock = window.ws;
        if (!sock || sock.readyState !== WebSocket.OPEN) {
            console.warn('[Plugin] WebSocket not ready (state:', sock ? sock.readyState : 'null', ')');
            if (typeof showToast === 'function') {
                showToast('Plugin: WebSocket belum terhubung. Coba lagi sebentar.', 'warning', 2500);
            }
            return;
        }

        // Optimistic local state update for instant UI feedback
        if (activePluginsMap[presetId]) {
            delete activePluginsMap[presetId];
        } else {
            activePluginsMap[presetId] = { preset_id: presetId, activated_at: Date.now() / 1000 };
        }
        renderPresetGrid();

        sock.send(JSON.stringify({
            action: 'toggle_plugin',
            preset: preset
        }));
    }
    window.togglePluginLive = togglePluginLive;

    function controlPluginTimer(presetId, command, value) {
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            window.ws.send(JSON.stringify({
                action: 'timer_control',
                preset_id: presetId,
                command: command,
                value: value || 0
            }));
        }
    }
    window.controlPluginTimer = controlPluginTimer;

    function clearAllActivePlugins() {
        if (window.ws && window.ws.readyState === WebSocket.OPEN) {
            window.ws.send(JSON.stringify({ action: 'clear_all_plugins' }));
        }
    }
    window.clearAllActivePlugins = clearAllActivePlugins;

    // Listen to update_plugin_state from control.html WebSocket dispatcher
    window.handlePluginStateUpdate = function (activePlugins) {
        activePluginsMap = activePlugins || {};
        renderPresetGrid();
    };

    // ─────────────────────────────────────────────────────────────────────────
    // 3. Context Menus (Preset & Folder & Sidebar)
    // ─────────────────────────────────────────────────────────────────────────
    function showPluginPresetContextMenu(e, presetId) {
        e.preventDefault();
        e.stopPropagation();
        closeCustomContextMenu();

        const preset = pluginPresets.find(p => p.id === presetId);
        if (!preset) return;
        const isLive = !!activePluginsMap[presetId];

        const menu = document.createElement('div');
        menu.className = 'plugin-ctx-menu';
        menu.id = 'plugin-ctx-menu-inst';
        menu.style.left = `${Math.min(e.clientX, window.innerWidth - 190)}px`;
        menu.style.top = `${Math.min(e.clientY, window.innerHeight - 240)}px`;

        menu.innerHTML = `
            <div class="plugin-ctx-item" onclick="togglePluginLive('${presetId}'); closeCustomContextMenu();">
                <span>${isLive ? '⬛' : '👁️'}</span> ${isLive ? 'HIDE FROM SCREEN' : 'SHOW NOW'}
            </div>
            <div class="plugin-ctx-item" onclick="openEditPluginModal('${presetId}'); closeCustomContextMenu();">
                <span>✏️</span> EDIT CANVAS
            </div>
            <div class="plugin-ctx-item" onclick="renamePluginPresetUI('${presetId}'); closeCustomContextMenu();">
                <span>🏷️</span> RENAME
            </div>
            <div class="plugin-ctx-item" onclick="duplicatePluginPresetUI('${presetId}'); closeCustomContextMenu();">
                <span>📋</span> DUPLICATE
            </div>
            <div class="plugin-ctx-item" onclick="movePluginPresetUI('${presetId}'); closeCustomContextMenu();">
                <span>📁</span> MOVE TO FOLDER
            </div>
            <div style="height: 1px; background: rgba(255,255,255,0.08); margin: 3px 0;"></div>
            <div class="plugin-ctx-item ctx-danger" onclick="deletePluginPresetUI('${presetId}'); closeCustomContextMenu();">
                <span>🗑️</span> DELETE
            </div>
        `;

        document.body.appendChild(menu);
        setTimeout(() => {
            document.addEventListener('click', closeCustomContextMenu, { once: true });
        }, 10);
    }
    window.showPluginPresetContextMenu = showPluginPresetContextMenu;

    function showPluginFolderContextMenu(e, folderId) {
        e.preventDefault();
        e.stopPropagation();
        closeCustomContextMenu();

        const folder = pluginFolders.find(f => f.id === folderId);
        if (!folder) return;

        const menu = document.createElement('div');
        menu.className = 'plugin-ctx-menu';
        menu.id = 'plugin-ctx-menu-inst';
        menu.style.left = `${Math.min(e.clientX, window.innerWidth - 200)}px`;
        menu.style.top = `${Math.min(e.clientY, window.innerHeight - 150)}px`;

        let menuHtml = `
            <div class="plugin-ctx-item" onclick="openNewPluginInFolder('${folderId}'); closeCustomContextMenu();">
                <span>＋</span> CREATE PLUGIN IN FOLDER
            </div>
        `;

        if (!folder.is_default) {
            menuHtml += `
                <div class="plugin-ctx-item" onclick="renamePluginFolderUI('${folderId}'); closeCustomContextMenu();">
                    <span>✏️</span> RENAME FOLDER
                </div>
                <div style="height: 1px; background: rgba(255,255,255,0.08); margin: 3px 0;"></div>
                <div class="plugin-ctx-item ctx-danger" onclick="deletePluginFolderUI('${folderId}'); closeCustomContextMenu();">
                    <span>🗑️</span> DELETE FOLDER
                </div>
            `;
        } else {
            menuHtml += `
                <div class="plugin-ctx-item" onclick="switchPluginFolder('${folderId}'); closeCustomContextMenu();">
                    <span>📁</span> VIEW PRESETS
                </div>
            `;
        }

        menu.innerHTML = menuHtml;
        document.body.appendChild(menu);
        setTimeout(() => {
            document.addEventListener('click', closeCustomContextMenu, { once: true });
        }, 10);
    }
    window.showPluginFolderContextMenu = showPluginFolderContextMenu;

    function showPluginSidebarContextMenu(e) {
        e.preventDefault();
        e.stopPropagation();
        closeCustomContextMenu();

        const menu = document.createElement('div');
        menu.className = 'plugin-ctx-menu';
        menu.id = 'plugin-ctx-menu-inst';
        menu.style.left = `${Math.min(e.clientX, window.innerWidth - 180)}px`;
        menu.style.top = `${Math.min(e.clientY, window.innerHeight - 100)}px`;

        menu.innerHTML = `
            <div class="plugin-ctx-item" onclick="createPluginFolderUI(); closeCustomContextMenu();">
                <span>📁</span> NEW FOLDER
            </div>
            <div class="plugin-ctx-item" onclick="openNewPluginModal(); closeCustomContextMenu();">
                <span>＋</span> CREATE PLUGIN
            </div>
        `;
        document.body.appendChild(menu);
        setTimeout(() => {
            document.addEventListener('click', closeCustomContextMenu, { once: true });
        }, 10);
    }

    function closeCustomContextMenu() {
        const existing = document.getElementById('plugin-ctx-menu-inst');
        if (existing) existing.remove();
    }
    window.closeCustomContextMenu = closeCustomContextMenu;

    // ─────────────────────────────────────────────────────────────────────────
    // 4. Folder CRUD Actions
    // ─────────────────────────────────────────────────────────────────────────
    async function createPluginFolderUI() {
        const name = await showCustomDialog('prompt', 'Masukkan nama folder plugin baru:');
        if (!name || !name.trim()) return;

        try {
            const res = await fetch('/api/plugins/folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim() })
            });
            if (res.ok) {
                await loadPluginLibrary();
            } else {
                const err = await res.json();
                await showCustomDialog('alert', err.detail || 'Gagal membuat folder');
            }
        } catch (e) {
            console.error(e);
        }
    }
    window.createPluginFolderUI = createPluginFolderUI;

    async function renamePluginFolderUI(folderId) {
        const folder = pluginFolders.find(f => f.id === folderId);
        if (!folder) return;

        if (folder.name === 'ALL') {
            await showCustomDialog('alert', 'Folder <b>ALL</b> adalah folder sistem dan tidak dapat diubah namanya.');
            return;
        }

        const newName = await showCustomDialog('prompt', `Ganti nama folder "<b>${escapeHtml(folder.name)}</b>":`, folder.name);
        if (!newName || !newName.trim() || newName.trim() === folder.name) return;

        try {
            const res = await fetch(`/api/plugins/folder/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_id: folderId, new_name: newName.trim() })
            });
            if (res.ok) {
                await loadPluginLibrary();
            } else {
                const err = await res.json();
                await showCustomDialog('alert', err.detail || 'Gagal mengganti nama folder');
            }
        } catch (e) {
            console.error(e);
        }
    }
    window.renamePluginFolderUI = renamePluginFolderUI;

    async function deletePluginFolderUI(folderId) {
        const folder = pluginFolders.find(f => f.id === folderId);
        if (!folder) return;

        if (folder.name === 'ALL') {
            await showCustomDialog('alert', 'Folder <b>ALL</b> adalah folder sistem default dan tidak dapat dihapus.');
            return;
        }

        const isOk = await showCustomDialog('confirm', `Hapus folder <b>"${escapeHtml(folder.name)}"</b>?<br><span style="color:#ffc107; font-size:0.85em;">Semua preset di dalamnya akan dipindahkan ke folder ALL secara aman.</span>`);
        if (!isOk) return;

        try {
            const res = await fetch(`/api/plugins/folder/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_id: folderId, delete_contents: false })
            });
            if (res.ok) {
                if (activeFolderId === folderId) activeFolderId = 'ALL';
                await loadPluginLibrary();
            } else {
                const err = await res.json();
                await showCustomDialog('alert', err.detail || 'Gagal menghapus folder');
            }
        } catch (e) {
            console.error(e);
        }
    }
    window.deletePluginFolderUI = deletePluginFolderUI;

    // ─────────────────────────────────────────────────────────────────────────
    // 5. Preset CRUD Actions
    // ─────────────────────────────────────────────────────────────────────────
    async function renamePluginPresetUI(presetId) {
        const preset = pluginPresets.find(p => p.id === presetId);
        if (!preset) return;

        const newName = await showCustomDialog('prompt', `Ganti nama preset:`, preset.name);
        if (!newName || !newName.trim() || newName.trim() === preset.name) return;

        try {
            const res = await fetch(`/api/plugins/preset/${presetId}/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName.trim() })
            });
            if (res.ok) await loadPluginLibrary();
        } catch (e) {
            console.error(e);
        }
    }
    window.renamePluginPresetUI = renamePluginPresetUI;

    async function duplicatePluginPresetUI(presetId) {
        try {
            const res = await fetch(`/api/plugins/preset/${presetId}/duplicate`, { method: 'POST' });
            if (res.ok) await loadPluginLibrary();
        } catch (e) {
            console.error(e);
        }
    }
    window.duplicatePluginPresetUI = duplicatePluginPresetUI;

    async function movePluginPresetUI(presetId) {
        const preset = pluginPresets.find(p => p.id === presetId);
        if (!preset) return;

        const folderOptions = (pluginFolders || []).map(f => ({
            value: f.name,
            label: `📁 ${f.name}`
        }));

        const targetName = await showCustomDialog(
            'select',
            `Pilih folder tujuan untuk memindahkan <b>"${escapeHtml(preset.name)}"</b>:`,
            folderOptions,
            preset.folder
        );
        if (!targetName || targetName === preset.folder) return;

        const targetFolder = pluginFolders.find(f => f.name === targetName);
        if (!targetFolder) return;

        try {
            const res = await fetch(`/api/plugins/preset/${presetId}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ folder_id: targetFolder.id })
            });
            if (res.ok) await loadPluginLibrary();
        } catch (e) {
            console.error(e);
        }
    }
    window.movePluginPresetUI = movePluginPresetUI;

    async function deletePluginPresetUI(presetId) {
        const preset = pluginPresets.find(p => p.id === presetId);
        if (!preset) return;

        const isOk = await showCustomDialog('confirm', `Hapus preset <b><span style="color:#ff4444;">"${escapeHtml(preset.name)}"</span></b> secara permanen?`);
        if (!isOk) return;

        try {
            const res = await fetch(`/api/plugins/preset/${presetId}`, { method: 'DELETE' });
            if (res.ok) {
                if (activePluginsMap[presetId]) {
                    togglePluginLive(presetId); // Sembunyikan jika sedang live
                }
                await loadPluginLibrary();
            }
        } catch (e) {
            console.error(e);
        }
    }
    window.deletePluginPresetUI = deletePluginPresetUI;

    // ─────────────────────────────────────────────────────────────────────────
    // 6. Plugin Canvas Editor Modal
    // ─────────────────────────────────────────────────────────────────────────
    function openNewPluginModal() {
        openNewPluginInFolder(activeFolderId === 'ALL' ? 'TIMER' : activeFolderId);
    }
    window.openNewPluginModal = openNewPluginModal;

    function openNewPluginInFolder(folderId) {
        currentPreset = {
            id: `plugin-${Date.now().toString(36)}`,
            name: 'New Custom Plugin',
            category: (folderId === 'ALL' ? 'TIMER' : folderId),
            folder: folderId,
            targets: ['main', 'lt'],
            animation: { in: 'fade', out: 'fade', duration: 0.3 },
            elements: []
        };
        historyStack = [];
        redoStack = [];
        selectedElementIds.clear();
        showPluginModal();
    }
    window.openNewPluginInFolder = openNewPluginInFolder;

    function openEditPluginModal(presetId) {
        const p = pluginPresets.find(item => item.id === presetId);
        if (!p) return;

        // Deep copy
        currentPreset = JSON.parse(JSON.stringify(p));
        historyStack = [];
        redoStack = [];
        selectedElementIds.clear();
        showPluginModal();
    }
    window.openEditPluginModal = openEditPluginModal;

    function getCurrentEditorSnapshot() {
        const name = (document.getElementById('plugin-edit-name')?.value || '').trim();
        const targets = [];
        if (document.getElementById('target-cb-main')?.checked) targets.push('main');
        if (document.getElementById('target-cb-lt')?.checked) targets.push('lt');
        if (targets.length === 0) targets.push('main');
        return JSON.stringify({
            name: name,
            targets: targets.sort(),
            elements: currentPreset?.elements || []
        });
    }

    function showPluginModal() {
        const modal = document.getElementById('plugin-editor-modal');
        if (!modal) return;
        modal.style.display = 'flex';

        // Bind preset fields
        document.getElementById('plugin-edit-name').value = currentPreset.name || '';
        const targets = currentPreset.targets || ['main'];
        document.getElementById('target-cb-main').checked = targets.includes('main');
        document.getElementById('target-cb-lt').checked = targets.includes('lt');

        // Store initial snapshot for unsaved changes detection
        initialPresetSnapshot = getCurrentEditorSnapshot();

        fitCanvasZoom();
        renderCanvasElements();
        renderPaletteSavedList();
        updateInspectorPanel();
    }

    async function closePluginEditorModal(force = false) {
        if (!force && initialPresetSnapshot && currentPreset) {
            const currentSnapshot = getCurrentEditorSnapshot();
            if (currentSnapshot !== initialPresetSnapshot) {
                const isOk = await showCustomDialog('confirm', 'Perubahan pada plugin ini belum disimpan. Apakah Anda yakin ingin menutup editor tanpa menyimpan perubahan?');
                if (!isOk) return;
            }
        }
        const modal = document.getElementById('plugin-editor-modal');
        if (modal) modal.style.display = 'none';
        currentPreset = null;
        selectedElementIds.clear();
        isInlineEditing = false;
        activeInlineEditingElId = null;
        initialPresetSnapshot = '';
    }
    window.closePluginEditorModal = closePluginEditorModal;

    function fitCanvasZoom() {
        const viewport = document.getElementById('plugin-canvas-viewport');
        const wrapper = document.getElementById('plugin-canvas-wrapper');
        if (!viewport || !wrapper) return;

        // 24px safety margin all around so canvas never touches toolbar or bottom inspector
        const availW = Math.max(100, viewport.offsetWidth - 48);
        const availH = Math.max(100, viewport.offsetHeight - 48);

        const scaleW = availW / 1920;
        const scaleH = availH / 1080;
        canvasZoom = Math.min(scaleW, scaleH);

        wrapper.style.width = '1920px';
        wrapper.style.height = '1080px';
        wrapper.style.transformOrigin = 'top left';
        wrapper.style.transform = `scale(${canvasZoom})`;

        const scaledW = 1920 * canvasZoom;
        const scaledH = 1080 * canvasZoom;
        const leftOffset = Math.max(0, (viewport.offsetWidth - scaledW) / 2);
        const topOffset = Math.max(0, (viewport.offsetHeight - scaledH) / 2);
        wrapper.style.marginLeft = `${leftOffset}px`;
        wrapper.style.marginTop = `${topOffset}px`;

        const zoomLabel = document.getElementById('canvas-zoom-level');
        if (zoomLabel) zoomLabel.innerText = `${Math.round(canvasZoom * 100)}%`;
    }
    window.fitCanvasZoom = fitCanvasZoom;
    window.addEventListener('resize', () => {
        if (document.getElementById('plugin-editor-modal')?.style.display === 'flex') {
            fitCanvasZoom();
        }
    });

    function setCanvasSimulatedBg(mode) {
        simulatedBg = mode;
        const wrapper = document.getElementById('plugin-canvas-wrapper');
        if (!wrapper) return;

        wrapper.classList.remove('plugin-canvas-checkerboard', 'plugin-canvas-solid', 'plugin-canvas-stage');
        if (mode === 'checkerboard') wrapper.classList.add('plugin-canvas-checkerboard');
        else if (mode === 'solid') wrapper.classList.add('plugin-canvas-solid');
        else if (mode === 'stage') wrapper.classList.add('plugin-canvas-stage');

        const btns = document.querySelectorAll('.btn-sim-bg');
        btns.forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.btn-sim-bg[data-bg="${mode}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }
    window.setCanvasSimulatedBg = setCanvasSimulatedBg;

    // ─────────────────────────────────────────────────────────────────────────
    // 7. Canvas Elements Manipulation & Handles & Snapshot
    // ─────────────────────────────────────────────────────────────────────────
    function pushHistory() {
        if (!currentPreset) return;
        historyStack.push(JSON.stringify(currentPreset.elements));
        if (historyStack.length > 30) historyStack.shift();
        redoStack = [];
    }

    function undoCanvas() {
        if (historyStack.length === 0) return;
        redoStack.push(JSON.stringify(currentPreset.elements));
        currentPreset.elements = JSON.parse(historyStack.pop());
        renderCanvasElements();
        updateInspectorPanel();
    }
    window.undoCanvas = undoCanvas;

    function redoCanvas() {
        if (redoStack.length === 0) return;
        historyStack.push(JSON.stringify(currentPreset.elements));
        currentPreset.elements = JSON.parse(redoStack.pop());
        renderCanvasElements();
        updateInspectorPanel();
    }
    window.redoCanvas = redoCanvas;

    // Static Canvas Snapshot Generation (High Quality JPEG)
    async function generateCanvasSnapshot() {
        if (!currentPreset) return null;
        try {
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            const offscreen = document.createElement('canvas');
            offscreen.width = 1920;
            offscreen.height = 1080;
            const ctx = offscreen.getContext('2d');
            if (!ctx) return null;

            // Draw dark backdrop
            ctx.fillStyle = '#080a0f';
            ctx.fillRect(0, 0, 1920, 1080);

            const sorted = [...(currentPreset.elements || [])].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

            for (const el of sorted) {
                const x = el.x || 0;
                const y = el.y || 0;
                const w = el.width || 100;
                const h = el.height || 50;
                const r = el.borderRadius || 0;

                ctx.save();
                if (el.type === 'shape') {
                    ctx.globalAlpha = el.bgOpacity !== undefined ? el.bgOpacity : 1;
                    ctx.fillStyle = el.bgColor || '#000000';
                    drawRoundRect(ctx, x, y, w, h, r);
                    ctx.fill();

                    if (el.borderWidth && el.borderColor) {
                        ctx.lineWidth = el.borderWidth;
                        ctx.strokeStyle = el.borderColor;
                        drawRoundRect(ctx, x, y, w, h, r);
                        ctx.stroke();
                    }
                } else if (el.type === 'text') {
                    ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;
                    ctx.fillStyle = el.color || '#ffffff';
                    const weight = el.bold ? 'bold ' : '';
                    const style = el.italic ? 'italic ' : '';
                    const size = el.fontSize || 28;
                    const font = el.fontFamily || 'Montserrat';
                    ctx.font = `${style}${weight}${size}px "${font}", sans-serif`;
                    ctx.textAlign = el.align || 'center';
                    ctx.textBaseline = 'middle';

                    let tx = x + w / 2;
                    if (el.align === 'left') tx = x + 15;
                    else if (el.align === 'right') tx = x + w - 15;

                    const textToDraw = el.uppercase ? (el.text || '').toUpperCase() : (el.text || '');
                    ctx.fillText(textToDraw, tx, y + h / 2, w - 20);

                    if (el.underline) {
                        const metrics = ctx.measureText(textToDraw);
                        const textW = Math.min(metrics.width, w - 20);
                        let ulX = tx - textW / 2;
                        if (el.align === 'left') ulX = tx;
                        else if (el.align === 'right') ulX = tx - textW;
                        const ulY = y + h / 2 + size / 2;
                        ctx.strokeStyle = el.color || '#ffffff';
                        ctx.lineWidth = Math.max(1, Math.round(size / 15));
                        ctx.beginPath();
                        ctx.moveTo(ulX, ulY);
                        ctx.lineTo(ulX + textW, ulY);
                        ctx.stroke();
                    }
                } else if (el.type === 'timer' || el.type === 'stopwatch' || el.type === 'clock') {
                    ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;
                    ctx.fillStyle = el.color || '#00e5ff';
                    const size = el.fontSize || 48;
                    const font = el.fontFamily || 'Montserrat';
                    const weight = el.bold ? 'bold ' : '';
                    ctx.font = `${weight}${size}px "${font}", sans-serif`;
                    ctx.textAlign = el.align || 'center';
                    ctx.textBaseline = 'middle';
                    let tx = x + w / 2;
                    if (el.align === 'left') tx = x + 15;
                    else if (el.align === 'right') tx = x + w - 15;
                    ctx.fillText('00:00:00', tx, y + h / 2, w - 20);
                } else if (el.type === 'image' && el.url) {
                    ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;
                    const domImg = document.querySelector(`#canvas-el-${el.id} img`);
                    if (domImg && domImg.complete && domImg.naturalWidth > 0) {
                        ctx.drawImage(domImg, x, y, w, h);
                    }
                }
                ctx.restore();
            }

            return offscreen.toDataURL('image/jpeg', 0.85);
        } catch (e) {
            console.error('Error generating canvas snapshot:', e);
            return null;
        }
    }

    function drawRoundRect(ctx, x, y, w, h, r) {
        if (w < 2 * r) r = w / 2;
        if (h < 2 * r) r = h / 2;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function renderCanvasElements() {
        const wrapper = document.getElementById('plugin-canvas-wrapper');
        if (!wrapper || !currentPreset) return;
        wrapper.innerHTML = '';

        (currentPreset.elements || []).forEach(el => {
            const div = document.createElement('div');
            const isSel = selectedElementIds.has(el.id);
            div.className = `canvas-element ${isSel ? 'selected' : ''}`;
            div.id = `canvas-el-${el.id}`;
            div.style.left = (el.x || 0) + 'px';
            div.style.top = (el.y || 0) + 'px';
            div.style.width = (el.width || 100) + 'px';
            div.style.height = (el.height || 50) + 'px';
            div.style.zIndex = el.zIndex || 1;

            if (el.type === 'shape') {
                div.style.backgroundColor = el.bgColor || '#000000';
                div.style.opacity = el.bgOpacity !== undefined ? el.bgOpacity : 1;
                div.style.borderRadius = (el.borderRadius || 0) + 'px';
                if (el.borderWidth) div.style.border = `${el.borderWidth}px solid ${el.borderColor || 'transparent'}`;
                if (el.shadow) div.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
            } else if (el.type === 'text') {
                div.style.fontFamily = el.fontFamily || 'Montserrat';
                div.style.fontSize = (el.fontSize || 24) + 'px';
                div.style.color = el.color || '#ffffff';
                div.style.fontWeight = el.bold ? 'bold' : 'normal';
                div.style.fontStyle = el.italic ? 'italic' : 'normal';
                div.style.textDecoration = el.underline ? 'underline' : 'none';
                div.style.textTransform = el.uppercase ? 'uppercase' : 'none';
                div.style.opacity = el.opacity !== undefined ? el.opacity : 1;
                div.style.textAlign = el.align || 'center';
                div.style.justifyContent = el.align === 'left' ? 'flex-start' : (el.align === 'right' ? 'flex-end' : 'center');
                div.style.whiteSpace = 'pre-wrap';
                div.style.lineHeight = el.lineHeight || 1.3;
                if (el.shadow) div.style.textShadow = '0 2px 8px rgba(0,0,0,0.8)';
                div.innerText = el.text || '';

                // Double click to inline edit text directly on canvas
                div.ondblclick = (e) => {
                    e.stopPropagation();
                    startInlineTextEdit(el.id, div);
                };
            } else if (el.type === 'image') {
                const img = document.createElement('img');
                img.src = el.url || '';
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = el.fit || 'contain';
                img.style.opacity = el.opacity !== undefined ? el.opacity : 1;
                img.style.borderRadius = (el.borderRadius || 0) + 'px';
                img.draggable = false;
                img.style.userSelect = 'none';
                img.style.webkitUserDrag = 'none';
                img.style.pointerEvents = 'none';
                img.ondragstart = (e) => e.preventDefault();
                div.appendChild(img);
            } else if (el.type === 'timer' || el.type === 'stopwatch' || el.type === 'clock') {
                div.style.fontFamily = el.fontFamily || 'Montserrat';
                div.style.fontSize = (el.fontSize || 48) + 'px';
                div.style.color = el.color || '#ffffff';
                div.style.fontWeight = el.bold ? 'bold' : 'normal';
                div.style.textAlign = el.align || 'center';
                div.style.justifyContent = el.align === 'left' ? 'flex-start' : (el.align === 'right' ? 'flex-end' : 'center');
                if (el.shadow) div.style.textShadow = '0 2px 10px rgba(0,0,0,0.9)';
                div.innerText = '00:00:00';
            }

            // Selection & Drag Listeners
            div.onmousedown = (e) => startElementDrag(e, el.id);

            // 8 Handles if exactly this single element is selected
            if (isSel && selectedElementIds.size === 1) {
                ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'].forEach(hType => {
                    const handle = document.createElement('div');
                    handle.className = `resize-handle handle-${hType}`;
                    handle.onmousedown = (e) => startElementResize(e, el.id, hType);
                    div.appendChild(handle);
                });
            }

            wrapper.appendChild(div);
        });

        // Group Bounding Box when 2+ elements are selected
        if (selectedElementIds.size > 1) {
            renderGroupBoundingBox(wrapper);
        }
    }

    function renderGroupBoundingBox(wrapper) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selectedElementIds.forEach(id => {
            const el = currentPreset.elements.find(item => item.id === id);
            if (el) {
                minX = Math.min(minX, el.x);
                minY = Math.min(minY, el.y);
                maxX = Math.max(maxX, el.x + el.width);
                maxY = Math.max(maxY, el.y + el.height);
            }
        });

        if (minX !== Infinity) {
            const gBox = document.createElement('div');
            gBox.className = 'canvas-group-bounding-box';
            gBox.style.left = `${minX}px`;
            gBox.style.top = `${minY}px`;
            gBox.style.width = `${maxX - minX}px`;
            gBox.style.height = `${maxY - minY}px`;
            wrapper.appendChild(gBox);
        }
    }

    function selectCanvasElement(elId, isShift = false) {
        if (isShift) {
            if (selectedElementIds.has(elId)) {
                selectedElementIds.delete(elId);
            } else {
                selectedElementIds.add(elId);
            }
        } else {
            selectedElementIds.clear();
            if (elId) selectedElementIds.add(elId);
        }
        renderCanvasElements();
        updateInspectorPanel();
    }
    window.selectCanvasElement = selectCanvasElement;

    function deselectCanvasElement(e) {
        if (e.target.id === 'plugin-canvas-wrapper' || e.target.id === 'plugin-canvas-viewport') {
            if (!e.shiftKey) {
                selectedElementIds.clear();
                renderCanvasElements();
                updateInspectorPanel();
            }
        }
    }
    window.deselectCanvasElement = deselectCanvasElement;

    // ─────────────────────────────────────────────────────────────────────────
    // Direct Canvas Inline Text Editing
    // ─────────────────────────────────────────────────────────────────────────
    function startInlineTextEdit(elId, domEl) {
        const el = currentPreset?.elements?.find(item => item.id === elId);
        if (!el || el.type !== 'text') return;

        isInlineEditing = true;
        activeInlineEditingElId = elId;

        domEl.contentEditable = "true";
        domEl.classList.add('inline-editing');

        // Focus cursor at the end
        domEl.focus();
        try {
            const range = document.createRange();
            range.selectNodeContents(domEl);
            range.collapse(false);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } catch (err) {
            console.warn('Range select error:', err);
        }

        // Live synchronization with inspector text field
        domEl.oninput = () => {
            const val = domEl.innerText;
            el.text = val;
            const inspInput = document.getElementById(`insp-input-text-${elId}`);
            if (inspInput) inspInput.value = val;
        };

        domEl.onkeydown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                commitInlineTextEdit(elId, domEl);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelInlineTextEdit(elId, domEl, el.text);
            }
        };

        domEl.onblur = () => {
            commitInlineTextEdit(elId, domEl);
        };
    }

    function commitInlineTextEdit(elId, domEl) {
        if (!isInlineEditing || activeInlineEditingElId !== elId) return;
        const el = currentPreset?.elements?.find(item => item.id === elId);
        if (el) {
            pushHistory();
            el.text = domEl.innerText;
        }
        domEl.removeAttribute('contenteditable');
        domEl.classList.remove('inline-editing');
        domEl.oninput = null;
        isInlineEditing = false;
        activeInlineEditingElId = null;
        renderCanvasElements();
        updateInspectorPanel();
    }

    function cancelInlineTextEdit(elId, domEl, originalText) {
        const el = currentPreset?.elements?.find(item => item.id === elId);
        if (el) el.text = originalText;
        domEl.innerText = originalText;
        domEl.removeAttribute('contenteditable');
        domEl.classList.remove('inline-editing');
        domEl.oninput = null;
        isInlineEditing = false;
        activeInlineEditingElId = null;
        renderCanvasElements();
        updateInspectorPanel();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Multi-Drag & Marquee Selection
    // ─────────────────────────────────────────────────────────────────────────
    function startElementDrag(e, elId) {
        if (e.target.classList.contains('resize-handle')) return; // ignore handles
        if (isInlineEditing) return; // ignore if editing text
        e.stopPropagation();

        // Multi-select handling on drag start
        if (e.shiftKey) {
            selectCanvasElement(elId, true);
        } else if (!selectedElementIds.has(elId)) {
            selectCanvasElement(elId, false);
        }

        const el = currentPreset.elements.find(item => item.id === elId);
        if (!el) return;

        isDraggingElement = true;
        hasDraggedElement = false;
        dragStartMouseX = e.clientX;
        dragStartMouseY = e.clientY;
        startMouseX = e.clientX;
        startMouseY = e.clientY;
        startElX = el.x || 0;
        startElY = el.y || 0;

        // Record start positions for all selected elements
        startElPositions = {};
        selectedElementIds.forEach(id => {
            const item = currentPreset.elements.find(p => p.id === id);
            if (item) startElPositions[id] = { x: item.x || 0, y: item.y || 0 };
        });

        document.addEventListener('mousemove', onElementDragMove);
        document.addEventListener('mouseup', onElementDragUp);
    }

    function onElementDragMove(e) {
        if (!isDraggingElement || selectedElementIds.size === 0) return;

        const moveDist = Math.hypot(e.clientX - dragStartMouseX, e.clientY - dragStartMouseY);
        if (!hasDraggedElement) {
            if (moveDist < 4) return; // 4px drag movement threshold
            hasDraggedElement = true;
            pushHistory();
        }

        const deltaX = (e.clientX - startMouseX) / canvasZoom;
        const deltaY = (e.clientY - startMouseY) / canvasZoom;

        const primaryId = getSelectedElementId();
        const primaryEl = currentPreset.elements.find(item => item.id === primaryId);
        if (!primaryEl) return;

        let primaryNewX = Math.round(startElX + deltaX);
        let primaryNewY = Math.round(startElY + deltaY);

        // Magnetic Snapping to Center 1920 / 1080 for primary element
        const centerX = primaryNewX + (primaryEl.width / 2);
        const centerY = primaryNewY + (primaryEl.height / 2);

        removeGuideLines();
        if (Math.abs(centerX - 960) < 8) {
            primaryNewX = 960 - (primaryEl.width / 2);
            showGuideLineX(960);
        }
        if (Math.abs(centerY - 540) < 8) {
            primaryNewY = 540 - (primaryEl.height / 2);
            showGuideLineY(540);
        }

        const effectiveDeltaX = primaryNewX - startElX;
        const effectiveDeltaY = primaryNewY - startElY;

        // Apply shift to ALL selected elements
        selectedElementIds.forEach(id => {
            const el = currentPreset.elements.find(item => item.id === id);
            const startPos = startElPositions[id];
            if (el && startPos) {
                el.x = Math.round(startPos.x + effectiveDeltaX);
                el.y = Math.round(startPos.y + effectiveDeltaY);

                const domEl = document.getElementById(`canvas-el-${el.id}`);
                if (domEl) {
                    domEl.style.left = `${el.x}px`;
                    domEl.style.top = `${el.y}px`;
                }
            }
        });

        // Update group bounding box if multiple
        const wrapper = document.getElementById('plugin-canvas-wrapper');
        const oldGBox = wrapper?.querySelector('.canvas-group-bounding-box');
        if (oldGBox) oldGBox.remove();
        if (selectedElementIds.size > 1 && wrapper) renderGroupBoundingBox(wrapper);
    }

    function onElementDragUp() {
        isDraggingElement = false;
        removeGuideLines();
        document.removeEventListener('mousemove', onElementDragMove);
        document.removeEventListener('mouseup', onElementDragUp);

        if (hasDraggedElement) {
            renderCanvasElements();
            updateInspectorPanel();
        } else {
            // Keep existing DOM elements intact so double-click event fires reliably!
            const wrapper = document.getElementById('plugin-canvas-wrapper');
            if (wrapper) {
                (currentPreset?.elements || []).forEach(el => {
                    const dom = document.getElementById(`canvas-el-${el.id}`);
                    if (dom) {
                        dom.classList.toggle('selected', selectedElementIds.has(el.id));
                    }
                });
                const oldGBox = wrapper.querySelector('.canvas-group-bounding-box');
                if (oldGBox) oldGBox.remove();
                if (selectedElementIds.size > 1) renderGroupBoundingBox(wrapper);
            }
            updateInspectorPanel();
        }
    }

    // Marquee Drag Selection on Canvas Background
    function setupMarqueeSelection() {
        const viewport = document.getElementById('plugin-canvas-viewport');
        if (!viewport) return;

        viewport.onmousedown = (e) => {
            if (e.target.closest('.canvas-element') || e.target.closest('.resize-handle')) return;
            if (e.button !== 0) return; // Left button only

            const wrapper = document.getElementById('plugin-canvas-wrapper');
            if (!wrapper) return;
            const wrapRect = wrapper.getBoundingClientRect();

            isMarqueeSelecting = true;
            marqueeStartX = (e.clientX - wrapRect.left) / canvasZoom;
            marqueeStartY = (e.clientY - wrapRect.top) / canvasZoom;

            if (!e.shiftKey) {
                selectedElementIds.clear();
                renderCanvasElements();
            }

            let selBox = document.getElementById('canvas-marquee-box');
            if (!selBox) {
                selBox = document.createElement('div');
                selBox.id = 'canvas-marquee-box';
                selBox.className = 'canvas-selection-box';
                wrapper.appendChild(selBox);
            }
            selBox.style.left = `${marqueeStartX}px`;
            selBox.style.top = `${marqueeStartY}px`;
            selBox.style.width = '0px';
            selBox.style.height = '0px';
            selBox.style.display = 'block';

            function onMarqueeMove(me) {
                if (!isMarqueeSelecting) return;
                const curX = (me.clientX - wrapRect.left) / canvasZoom;
                const curY = (me.clientY - wrapRect.top) / canvasZoom;

                const l = Math.min(marqueeStartX, curX);
                const t = Math.min(marqueeStartY, curY);
                const w = Math.abs(curX - marqueeStartX);
                const h = Math.abs(curY - marqueeStartY);

                selBox.style.left = `${l}px`;
                selBox.style.top = `${t}px`;
                selBox.style.width = `${w}px`;
                selBox.style.height = `${h}px`;

                // Calculate intersections with preset elements
                (currentPreset?.elements || []).forEach(el => {
                    const elL = el.x || 0;
                    const elR = elL + (el.width || 100);
                    const elT = el.y || 0;
                    const elB = elT + (el.height || 50);

                    const intersects = !(elR < l || elL > l + w || elB < t || elT > t + h);
                    if (intersects) {
                        selectedElementIds.add(el.id);
                    } else if (!me.shiftKey) {
                        selectedElementIds.delete(el.id);
                    }
                });

                // Update selected outlines in DOM without full re-render
                (currentPreset?.elements || []).forEach(el => {
                    const d = document.getElementById(`canvas-el-${el.id}`);
                    if (d) d.classList.toggle('selected', selectedElementIds.has(el.id));
                });
            }

            function onMarqueeUp() {
                isMarqueeSelecting = false;
                if (selBox) selBox.remove();
                document.removeEventListener('mousemove', onMarqueeMove);
                document.removeEventListener('mouseup', onMarqueeUp);
                renderCanvasElements();
                updateInspectorPanel();
            }

            document.addEventListener('mousemove', onMarqueeMove);
            document.addEventListener('mouseup', onMarqueeUp);
        };
    }

    // Resize Handles
    function startElementResize(e, elId, handleType) {
        e.stopPropagation();
        pushHistory();

        const el = currentPreset.elements.find(item => item.id === elId);
        if (!el) return;

        isResizingElement = true;
        resizeHandleType = handleType;
        startMouseX = e.clientX;
        startMouseY = e.clientY;
        startElX = el.x || 0;
        startElY = el.y || 0;
        startElW = el.width || 100;
        startElH = el.height || 50;
        startFontSize = el.fontSize || 24;

        document.addEventListener('mousemove', onElementResizeMove);
        document.addEventListener('mouseup', onElementResizeUp);
    }

    function onElementResizeMove(e) {
        if (!isResizingElement || selectedElementIds.size === 0) return;

        const deltaX = (e.clientX - startMouseX) / canvasZoom;
        const deltaY = (e.clientY - startMouseY) / canvasZoom;

        const primaryId = getSelectedElementId();
        const el = currentPreset.elements.find(item => item.id === primaryId);
        if (!el) return;

        let newX = startElX;
        let newY = startElY;
        let newW = startElW;
        let newH = startElH;

        if (resizeHandleType.includes('e')) newW = Math.max(30, startElW + deltaX);
        if (resizeHandleType.includes('s')) newH = Math.max(20, startElH + deltaY);
        if (resizeHandleType.includes('w')) {
            const wDiff = Math.min(startElW - 30, deltaX);
            newW = startElW - wDiff;
            newX = startElX + wDiff;
        }
        if (resizeHandleType.includes('n')) {
            const hDiff = Math.min(startElH - 20, deltaY);
            newH = startElH - hDiff;
            newY = startElY + hDiff;
        }

        el.x = Math.round(newX);
        el.y = Math.round(newY);
        el.width = Math.round(newW);
        el.height = Math.round(newH);

        const domEl = document.getElementById(`canvas-el-${el.id}`);
        if (domEl) {
            domEl.style.left = `${el.x}px`;
            domEl.style.top = `${el.y}px`;
            domEl.style.width = `${el.width}px`;
            domEl.style.height = `${el.height}px`;
        }
    }

    function onElementResizeUp() {
        isResizingElement = false;
        document.removeEventListener('mousemove', onElementResizeMove);
        document.removeEventListener('mouseup', onElementResizeUp);
        renderCanvasElements();
        updateInspectorPanel();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 8. Element Addition & Photo Library Picker
    // ─────────────────────────────────────────────────────────────────────────
    function addPluginCanvasElement(type) {
        if (!currentPreset) return;
        pushHistory();

        const elId = `el-${type}-${Date.now().toString(36)}`;
        let newEl = null;

        if (type === 'text') {
            newEl = {
                id: elId,
                type: 'text',
                text: 'TEXT HEADING',
                x: 660, y: 490, width: 600, height: 70,
                fontFamily: 'Montserrat', fontSize: 44, color: '#ffffff',
                bold: true, italic: false, underline: false, uppercase: true,
                align: 'center', lineHeight: 1.3, shadow: true,
                zIndex: (currentPreset.elements.length + 1)
            };
        } else if (type === 'timer') {
            newEl = {
                id: elId,
                type: 'timer',
                duration: 300,
                finishAction: 'blink',
                x: 660, y: 440, width: 600, height: 160,
                fontFamily: 'Montserrat', fontSize: 130, color: '#ffffff',
                bold: true, align: 'center', shadow: true,
                zIndex: (currentPreset.elements.length + 1)
            };
        } else if (type === 'stopwatch') {
            newEl = {
                id: elId,
                type: 'stopwatch',
                x: 710, y: 470, width: 500, height: 100,
                fontFamily: 'Montserrat', fontSize: 64, color: '#00e5ff',
                bold: true, align: 'center', shadow: true,
                zIndex: (currentPreset.elements.length + 1)
            };
        } else if (type === 'clock') {
            newEl = {
                id: elId,
                type: 'clock',
                format: '24h',
                x: 760, y: 480, width: 400, height: 80,
                fontFamily: 'Montserrat', fontSize: 52, color: '#ffffff',
                bold: true, align: 'center', shadow: true,
                zIndex: (currentPreset.elements.length + 1)
            };
        } else if (type === 'shape') {
            newEl = {
                id: elId,
                type: 'shape',
                x: 560, y: 420, width: 800, height: 240,
                bgColor: '#080c14', bgOpacity: 0.90, borderRadius: 24,
                borderWidth: 2, borderColor: '#00e5ff', shadow: true,
                zIndex: (currentPreset.elements.length + 1)
            };
        }

        if (newEl) {
            currentPreset.elements.push(newEl);
            selectCanvasElement(newEl.id, false);
        }
    }
    window.addPluginCanvasElement = addPluginCanvasElement;

    // Photo Library Picker Modal Functions
    async function openPluginPhotoPickerModal() {
        const modal = document.getElementById('plugin-photo-picker-modal');
        if (!modal) return;
        modal.style.display = 'flex';
        selectedPhotoId = null;
        updatePhotoPickerConfirmBtn();

        await loadPluginPhotoLibrary();
    }
    window.openPluginPhotoPickerModal = openPluginPhotoPickerModal;

    function closePluginPhotoPickerModal() {
        const modal = document.getElementById('plugin-photo-picker-modal');
        if (modal) modal.style.display = 'none';
        selectedPhotoId = null;
    }
    window.closePluginPhotoPickerModal = closePluginPhotoPickerModal;

    async function loadPluginPhotoLibrary() {
        try {
            const res = await fetch('/api/media/photo');
            if (!res.ok) return;
            photoLibraryData = await res.json();
            renderPluginPhotoFolders();
            renderPluginPhotoGrid();
        } catch (e) {
            console.error('[Plugin] Error loading photo library:', e);
        }
    }

    function renderPluginPhotoFolders() {
        const container = document.getElementById('plugin-photo-folder-list');
        if (!container) return;
        container.innerHTML = '';

        const folders = photoLibraryData.folders || ['ALL'];
        folders.forEach(f => {
            const item = document.createElement('div');
            item.className = `plugin-photo-folder-item ${f === activePhotoFolder ? 'active' : ''}`;
            item.innerText = `📁 ${f}`;
            item.onclick = () => {
                activePhotoFolder = f;
                renderPluginPhotoFolders();
                renderPluginPhotoGrid();
            };
            container.appendChild(item);
        });
    }

    function renderPluginPhotoGrid() {
        const container = document.getElementById('plugin-photo-grid');
        if (!container) return;
        container.innerHTML = '';

        const itemsObj = photoLibraryData.items || {};
        let itemsList = Object.values(itemsObj);

        if (activePhotoFolder !== 'ALL') {
            itemsList = itemsList.filter(item => (item.folder || 'ALL') === activePhotoFolder);
        }

        if (photoSearchQuery) {
            const q = photoSearchQuery.toLowerCase();
            itemsList = itemsList.filter(item => (item.name || '').toLowerCase().includes(q));
        }

        if (itemsList.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; color: #6b7280; padding: 40px; font-size: 0.85em;">
                    Tidak ada foto dalam folder ini. Klik <strong>＋ UPLOAD NEW PHOTO</strong> untuk menambahkan.
                </div>
            `;
            return;
        }

        itemsList.forEach(item => {
            const photoEl = document.createElement('div');
            const isSel = selectedPhotoId === item.id;
            photoEl.className = `plugin-photo-item ${isSel ? 'selected' : ''}`;
            photoEl.onclick = () => selectPluginPhotoItem(item.id, item.name);
            photoEl.ondblclick = () => {
                selectPluginPhotoItem(item.id, item.name);
                confirmPluginPhotoSelection();
            };

            const img = document.createElement('img');
            img.className = 'plugin-photo-img';
            img.src = `/api/stream_photo/${item.id}`;
            img.alt = item.name;
            img.loading = 'lazy';

            const title = document.createElement('div');
            title.className = 'plugin-photo-title';
            title.innerText = item.name;

            photoEl.appendChild(img);
            photoEl.appendChild(title);
            container.appendChild(photoEl);
        });
    }

    function filterPluginPhotoGrid(query) {
        photoSearchQuery = query || '';
        renderPluginPhotoGrid();
    }
    window.filterPluginPhotoGrid = filterPluginPhotoGrid;

    function selectPluginPhotoItem(id, name) {
        selectedPhotoId = id;
        renderPluginPhotoGrid();
        updatePhotoPickerConfirmBtn(name);
    }

    function updatePhotoPickerConfirmBtn(name) {
        const btn = document.getElementById('btn-plugin-photo-confirm');
        const nameLbl = document.getElementById('plugin-photo-selected-name');
        if (btn) btn.disabled = !selectedPhotoId;
        if (nameLbl) {
            nameLbl.innerText = selectedPhotoId ? `Foto dipilih: ${name || selectedPhotoId}` : 'Belum ada foto yang dipilih';
            nameLbl.style.color = selectedPhotoId ? '#00e5ff' : '#9ca3af';
        }
    }

    function confirmPluginPhotoSelection() {
        if (!selectedPhotoId) return;
        const photoUrl = `/api/stream_photo/${selectedPhotoId}`;

        // If an image element is currently selected, replace its URL
        const primaryId = getSelectedElementId();
        const primaryEl = currentPreset?.elements?.find(item => item.id === primaryId);
        if (primaryEl && primaryEl.type === 'image') {
            pushHistory();
            primaryEl.url = photoUrl;
            renderCanvasElements();
            updateInspectorPanel();
        } else {
            // Otherwise, add a new image element to canvas
            addImageElementToCanvas(photoUrl);
        }
        closePluginPhotoPickerModal();
    }
    window.confirmPluginPhotoSelection = confirmPluginPhotoSelection;

    async function triggerPluginPhotoUpload() {
        try {
            const res = await fetch('/api/browse_file_dialog/photo');
            const data = await res.json();
            if (data.status === 'success' && data.files && data.files.length > 0) {
                const addRes = await fetch('/api/media/photo/add_files', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        folder_name: activePhotoFolder === 'ALL' ? 'Uncategorized' : activePhotoFolder,
                        files: data.files
                    })
                });
                if (addRes.ok) {
                    await loadPluginPhotoLibrary();
                    if (typeof window.loadMediaData === 'function') {
                        window.loadMediaData('photo');
                    }
                    const items = Object.values(photoLibraryData.items || {});
                    const latest = items[items.length - 1];
                    if (latest) selectPluginPhotoItem(latest.id, latest.name);
                    return;
                }
            }
        } catch (e) {
            console.log('Native file picker fallback to file input:', e);
        }

        const fileInput = document.getElementById('plugin-photo-upload-input');
        if (fileInput) fileInput.click();
    }
    window.triggerPluginPhotoUpload = triggerPluginPhotoUpload;

    async function uploadPhotoToLibraryFromPlugin(e) {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder_name', activePhotoFolder === 'ALL' ? 'Uncategorized' : activePhotoFolder);

        try {
            const res = await fetch('/api/media/photo/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                await loadPluginPhotoLibrary();
                if (typeof window.loadMediaData === 'function') {
                    window.loadMediaData('photo');
                }
                if (data.item) {
                    selectPluginPhotoItem(data.item.id, data.item.name);
                }
            } else {
                await showCustomDialog('alert', data.message || 'Gagal mengupload foto ke Photo Library');
            }
        } catch (err) {
            console.error('Error uploading photo from plugin:', err);
            await showCustomDialog('alert', 'Error mengupload foto: ' + (err.message || err));
        }
        e.target.value = '';
    }
    window.uploadPhotoToLibraryFromPlugin = uploadPhotoToLibraryFromPlugin;

    function addImageElementToCanvas(url) {
        if (!currentPreset) return;
        pushHistory();

        const elId = `el-img-${Date.now().toString(36)}`;
        const newEl = {
            id: elId,
            type: 'image',
            url: url,
            x: 760, y: 390, width: 400, height: 300,
            fit: 'contain', opacity: 1, borderRadius: 12,
            borderWidth: 0, shadow: false,
            zIndex: (currentPreset.elements.length + 1)
        };
        currentPreset.elements.push(newEl);
        selectCanvasElement(newEl.id, false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 9. Inspector Panel & Property Binding
    // ─────────────────────────────────────────────────────────────────────────
    function toggleElBoolProp(btn, elId, prop) {
        if (!currentPreset) return;
        const el = currentPreset.elements.find(item => item.id === elId);
        if (!el) return;

        pushHistory();
        el[prop] = !el[prop];

        if (btn) {
            btn.classList.toggle('active', !!el[prop]);
        } else {
            const selector = `.insp-btn-toggle[data-prop="${prop}"][data-id="${elId}"]`;
            const foundBtn = document.querySelector(selector);
            if (foundBtn) {
                foundBtn.classList.toggle('active', !!el[prop]);
            }
        }
        renderCanvasElements();
    }
    window.toggleElBoolProp = toggleElBoolProp;

    function updateInspectorPanel() {
        const panel = document.getElementById('plugin-inspector-panel');
        if (!panel || !currentPreset) return;

        if (selectedElementIds.size === 0) {
            panel.innerHTML = `<span style="color:#6b7280; font-size:0.75em;">Klik elemen pada kanvas untuk mengubah properti font, warna, ukuran, dan efek.</span>`;
            return;
        }

        if (selectedElementIds.size > 1) {
            panel.innerHTML = `
                <div class="insp-multi-toolbar">
                    <span style="color:#00e5ff; font-weight:700; font-size:0.78em; margin-right:4px;">📦 ${selectedElementIds.size} Elemen Terpilih</span>
                    <button class="insp-btn-toggle" onclick="alignSelectedElements('left')" title="Align Left">⇤ Left</button>
                    <button class="insp-btn-toggle" onclick="alignSelectedElements('center')" title="Center Horizontally">⇥⇤ Center X</button>
                    <button class="insp-btn-toggle" onclick="alignSelectedElements('right')" title="Align Right">⇥ Right</button>
                    <button class="insp-btn-toggle" onclick="alignSelectedElements('top')" title="Align Top">⤒ Top</button>
                    <button class="insp-btn-toggle" onclick="alignSelectedElements('middle')" title="Middle Vertically">⤓⤒ Middle Y</button>
                    <button class="insp-btn-toggle" onclick="alignSelectedElements('bottom')" title="Align Bottom">⤓ Bottom</button>
                    <button class="btn-tb btn-tb-danger" onclick="deleteSelectedCanvasElement()" style="margin-left:auto; height:28px;">🗑️ Delete All (${selectedElementIds.size})</button>
                </div>
            `;
            return;
        }

        const primaryId = getSelectedElementId();
        const el = currentPreset.elements.find(item => item.id === primaryId);
        if (!el) return;

        // ── 3-Column Inspector Layout (2-Row Balanced) ──────────────────────
        // Col A: Position & Size  |  Col B: Properties (Typo/Shape/Image)  |  Col C: Actions
        let colA = '';
        let colB = '';
        let colC = '';

        // COL A — Position & Size (always shown, 2x2 grid)
        colA = `
            <div class="insp-col insp-col-pos">
                <span class="insp-title">Position &amp; Size</span>
                <div class="insp-possize-grid">
                    <label class="insp-lbl">X<input type="number" class="insp-num-pos" value="${el.x || 0}" oninput="changeElProp('${el.id}', 'x', parseInt(this.value, 10)||0)"></label>
                    <label class="insp-lbl">Y<input type="number" class="insp-num-pos" value="${el.y || 0}" oninput="changeElProp('${el.id}', 'y', parseInt(this.value, 10)||0)"></label>
                    <label class="insp-lbl">W<input type="number" class="insp-num-pos" value="${el.width || 100}" oninput="changeElProp('${el.id}', 'width', parseInt(this.value, 10)||1)"></label>
                    <label class="insp-lbl">H<input type="number" class="insp-num-pos" value="${el.height || 50}" oninput="changeElProp('${el.id}', 'height', parseInt(this.value, 10)||1)"></label>
                </div>
            </div>`;

        // COL B — Element-type properties (2 organized rows)
        if (el.type === 'text') {
            colB = `
            <div class="insp-col insp-col-typo">
                <span class="insp-title">Typography</span>
                <div class="insp-row-line1">
                    <label class="insp-lbl" style="width:100%;">
                        <span style="color:#00e5ff; margin-right:2px; font-weight:700;">Text</span>
                        <input type="text" id="insp-input-text-${el.id}" class="insp-text-input" value="${escapeHtml(el.text || '')}" placeholder="Ketik teks di sini…" oninput="changeElProp('${el.id}', 'text', this.value)" title="Text Content">
                    </label>
                </div>
                <div class="insp-row-line2">
                    <input type="text" list="plugin-font-datalist" class="insp-font-input" value="${escapeHtml(el.fontFamily || 'Montserrat')}" oninput="changeElProp('${el.id}', 'fontFamily', this.value)" placeholder="Font" title="Font Family">
                    <label class="insp-lbl" title="Font Size">Size<input type="number" class="insp-num-pos" value="${el.fontSize || 24}" min="8" max="400" oninput="changeElProp('${el.id}', 'fontSize', parseInt(this.value,10)||8)"></label>
                    <input type="color" class="insp-color" value="${el.color || '#ffffff'}" oninput="changeElProp('${el.id}', 'color', this.value)" title="Text Color">
                    <div class="insp-toggle-group">
                        <button class="insp-btn-toggle ${el.bold ? 'active' : ''}" data-prop="bold" data-id="${el.id}" onclick="toggleElBoolProp(this, '${el.id}', 'bold')" title="Bold"><strong>B</strong></button>
                        <button class="insp-btn-toggle ${el.italic ? 'active' : ''}" data-prop="italic" data-id="${el.id}" onclick="toggleElBoolProp(this, '${el.id}', 'italic')" title="Italic"><em>I</em></button>
                        <button class="insp-btn-toggle ${el.underline ? 'active' : ''}" data-prop="underline" data-id="${el.id}" onclick="toggleElBoolProp(this, '${el.id}', 'underline')" title="Underline"><u>U</u></button>
                        <button class="insp-btn-toggle insp-btn-aa ${el.uppercase ? 'active' : ''}" data-prop="uppercase" data-id="${el.id}" onclick="toggleElBoolProp(this, '${el.id}', 'uppercase')" title="Uppercase">AA</button>
                        <button class="insp-btn-toggle ${el.shadow ? 'active' : ''}" data-prop="shadow" data-id="${el.id}" onclick="toggleElBoolProp(this, '${el.id}', 'shadow')" title="Shadow">S</button>
                    </div>
                    <select class="insp-select" onchange="changeElProp('${el.id}', 'align', this.value)" title="Alignment">
                        <option value="left" ${el.align==='left'?'selected':''}>Left</option>
                        <option value="center" ${el.align==='center'?'selected':''}>Center</option>
                        <option value="right" ${el.align==='right'?'selected':''}>Right</option>
                    </select>
                    <label class="insp-lbl" title="Opacity">Opacity<input type="range" min="0" max="1" step="0.05" value="${el.opacity!==undefined?el.opacity:1}" oninput="changeElProp('${el.id}', 'opacity', parseFloat(this.value))"></label>
                </div>
            </div>`;
        } else if (el.type === 'timer') {
            colB = `
            <div class="insp-col insp-col-typo">
                <span class="insp-title">Timer &amp; Typography</span>
                <div class="insp-row-line1">
                    <label class="insp-lbl" title="Duration in Seconds">Durasi (Detik)<input type="number" class="insp-num-pos" style="width:72px;" value="${el.duration||300}" min="1" max="86400" oninput="changeElProp('${el.id}', 'duration', parseInt(this.value,10)||1)"></label>
                    <label class="insp-lbl" title="Finish Action">Aksi Selesai
                        <select class="insp-select" onchange="changeElProp('${el.id}', 'finishAction', this.value)">
                            <option value="blink" ${el.finishAction==='blink'?'selected':''}>Blink</option>
                            <option value="freeze" ${el.finishAction==='freeze'?'selected':''}>Freeze</option>
                            <option value="hide" ${el.finishAction==='hide'?'selected':''}>Hide</option>
                        </select>
                    </label>
                </div>
                <div class="insp-row-line2">
                    <input type="text" list="plugin-font-datalist" class="insp-font-input" value="${escapeHtml(el.fontFamily || 'Montserrat')}" oninput="changeElProp('${el.id}', 'fontFamily', this.value)" placeholder="Font" title="Font Family">
                    <label class="insp-lbl" title="Font Size">Size<input type="number" class="insp-num-pos" value="${el.fontSize || 24}" min="8" max="400" oninput="changeElProp('${el.id}', 'fontSize', parseInt(this.value,10)||8)"></label>
                    <input type="color" class="insp-color" value="${el.color || '#ffffff'}" oninput="changeElProp('${el.id}', 'color', this.value)" title="Text Color">
                    <div class="insp-toggle-group">
                        <button class="insp-btn-toggle ${el.bold ? 'active' : ''}" data-prop="bold" data-id="${el.id}" onclick="toggleElBoolProp(this, '${el.id}', 'bold')" title="Bold"><strong>B</strong></button>
                        <button class="insp-btn-toggle ${el.shadow ? 'active' : ''}" data-prop="shadow" data-id="${el.id}" onclick="toggleElBoolProp(this, '${el.id}', 'shadow')" title="Shadow">S</button>
                    </div>
                    <select class="insp-select" onchange="changeElProp('${el.id}', 'align', this.value)" title="Alignment">
                        <option value="left" ${el.align==='left'?'selected':''}>Left</option>
                        <option value="center" ${el.align==='center'?'selected':''}>Center</option>
                        <option value="right" ${el.align==='right'?'selected':''}>Right</option>
                    </select>
                    <label class="insp-lbl" title="Opacity">Opacity<input type="range" min="0" max="1" step="0.05" value="${el.opacity!==undefined?el.opacity:1}" oninput="changeElProp('${el.id}', 'opacity', parseFloat(this.value))"></label>
                </div>
            </div>`;
        } else if (el.type === 'stopwatch' || el.type === 'clock') {
            colB = `
            <div class="insp-col insp-col-typo">
                <span class="insp-title">${el.type === 'clock' ? 'Clock' : 'Stopwatch'} &amp; Typography</span>
                <div class="insp-row-line1">
                    ${el.type === 'clock' ? `
                        <label class="insp-lbl">Format
                            <select class="insp-select" onchange="changeElProp('${el.id}', 'format', this.value)">
                                <option value="24h" ${el.format==='24h'?'selected':''}>24 Hours</option>
                                <option value="12h" ${el.format==='12h'?'selected':''}>12 Hours (AM/PM)</option>
                            </select>
                        </label>
                    ` : `
                        <span style="color:#10b981; font-weight:700; font-size:0.75em;">⏱️ Live Stopwatch Timekeeper</span>
                    `}
                </div>
                <div class="insp-row-line2">
                    <input type="text" list="plugin-font-datalist" class="insp-font-input" value="${escapeHtml(el.fontFamily || 'Montserrat')}" oninput="changeElProp('${el.id}', 'fontFamily', this.value)" placeholder="Font" title="Font Family">
                    <label class="insp-lbl" title="Font Size">Size<input type="number" class="insp-num-pos" value="${el.fontSize || 24}" min="8" max="400" oninput="changeElProp('${el.id}', 'fontSize', parseInt(this.value,10)||8)"></label>
                    <input type="color" class="insp-color" value="${el.color || '#ffffff'}" oninput="changeElProp('${el.id}', 'color', this.value)" title="Text Color">
                    <div class="insp-toggle-group">
                        <button class="insp-btn-toggle ${el.bold ? 'active' : ''}" data-prop="bold" data-id="${el.id}" onclick="toggleElBoolProp(this, '${el.id}', 'bold')" title="Bold"><strong>B</strong></button>
                        <button class="insp-btn-toggle ${el.shadow ? 'active' : ''}" data-prop="shadow" data-id="${el.id}" onclick="toggleElBoolProp(this, '${el.id}', 'shadow')" title="Shadow">S</button>
                    </div>
                    <select class="insp-select" onchange="changeElProp('${el.id}', 'align', this.value)" title="Alignment">
                        <option value="left" ${el.align==='left'?'selected':''}>Left</option>
                        <option value="center" ${el.align==='center'?'selected':''}>Center</option>
                        <option value="right" ${el.align==='right'?'selected':''}>Right</option>
                    </select>
                    <label class="insp-lbl" title="Opacity">Opacity<input type="range" min="0" max="1" step="0.05" value="${el.opacity!==undefined?el.opacity:1}" oninput="changeElProp('${el.id}', 'opacity', parseFloat(this.value))"></label>
                </div>
            </div>`;
        } else if (el.type === 'shape') {
            colB = `
            <div class="insp-col insp-col-typo">
                <span class="insp-title">Shape &amp; Border</span>
                <div class="insp-row-line1">
                    <label class="insp-lbl">Fill<input type="color" class="insp-color" value="${el.bgColor||'#000000'}" oninput="changeElProp('${el.id}', 'bgColor', this.value)"></label>
                    <label class="insp-lbl" title="Opacity">Opacity<input type="range" min="0" max="1" step="0.05" value="${el.bgOpacity!==undefined?el.bgOpacity:1}" oninput="changeElProp('${el.id}', 'bgOpacity', parseFloat(this.value))"></label>
                    <label class="insp-lbl" title="Corner Radius">Radius<input type="number" class="insp-num-pos" value="${el.borderRadius||0}" min="0" max="500" oninput="changeElProp('${el.id}', 'borderRadius', parseInt(this.value,10)||0)"></label>
                </div>
                <div class="insp-row-line2">
                    <label class="insp-lbl" title="Border Width">Border<input type="number" class="insp-num-pos" value="${el.borderWidth||0}" min="0" max="40" oninput="changeElProp('${el.id}', 'borderWidth', parseInt(this.value,10)||0)"></label>
                    <label class="insp-lbl" title="Border Color">Border Color<input type="color" class="insp-color" value="${el.borderColor||'#00e5ff'}" oninput="changeElProp('${el.id}', 'borderColor', this.value)"></label>
                    <button class="insp-btn-toggle ${el.shadow?'active':''}" data-prop="shadow" data-id="${el.id}" onclick="toggleElBoolProp(this, '${el.id}', 'shadow')" title="Shadow">S</button>
                </div>
            </div>`;
        } else if (el.type === 'image') {
            colB = `
            <div class="insp-col insp-col-typo">
                <span class="insp-title">Image</span>
                <div class="insp-row-line1">
                    <button class="btn-tb" onclick="openPluginPhotoPickerModal()" style="height:28px;">📷 Ganti Foto</button>
                    <label class="insp-lbl">Fit
                        <select class="insp-select" onchange="changeElProp('${el.id}', 'fit', this.value)">
                            <option value="contain" ${el.fit==='contain'?'selected':''}>Contain</option>
                            <option value="cover" ${el.fit==='cover'?'selected':''}>Cover</option>
                            <option value="fill" ${el.fit==='fill'?'selected':''}>Fill</option>
                        </select>
                    </label>
                </div>
                <div class="insp-row-line2">
                    <label class="insp-lbl" title="Opacity">Opacity<input type="range" min="0" max="1" step="0.05" value="${el.opacity!==undefined?el.opacity:1}" oninput="changeElProp('${el.id}', 'opacity', parseFloat(this.value))"></label>
                    <label class="insp-lbl" title="Corner Radius">Radius<input type="number" class="insp-num-pos" value="${el.borderRadius||0}" min="0" max="500" oninput="changeElProp('${el.id}', 'borderRadius', parseInt(this.value,10)||0)"></label>
                </div>
            </div>`;
        }

        // COL C — Actions (2 rows: Forward/Backward & Duplicate/Delete)
        colC = `
            <div class="insp-col insp-col-actions">
                <span class="insp-title">Actions</span>
                <div class="insp-actions-grid">
                    <div class="insp-row-line1">
                        <button class="btn-tb" onclick="reorderCanvasElement('${el.id}', 'up')" title="Bring Forward">▲ Forward</button>
                        <button class="btn-tb" onclick="reorderCanvasElement('${el.id}', 'down')" title="Send Backward">▼ Backward</button>
                    </div>
                    <div class="insp-row-line2">
                        <button class="btn-tb" onclick="duplicateSelectedCanvasElement()" title="Duplicate">📋 Duplicate</button>
                        <button class="btn-tb btn-tb-danger" onclick="deleteSelectedCanvasElement()" title="Delete">🗑️ Delete</button>
                    </div>
                </div>
            </div>`;

        let html = `<div class="inspector-fields-wrap">${colA}${colB}${colC}</div>`;
        panel.innerHTML = html;
        fitCanvasZoom();
    }

    function changeElProp(elId, prop, val) {
        if (!currentPreset) return;
        const el = currentPreset.elements.find(item => item.id === elId);
        if (!el) return;

        pushHistory();
        el[prop] = val;
        renderCanvasElements();
    }
    window.changeElProp = changeElProp;

    function reorderCanvasElement(elId, dir) {
        if (!currentPreset) return;
        const idx = currentPreset.elements.findIndex(item => item.id === elId);
        if (idx === -1) return;

        pushHistory();
        if (dir === 'up' && idx < currentPreset.elements.length - 1) {
            const temp = currentPreset.elements[idx];
            currentPreset.elements[idx] = currentPreset.elements[idx + 1];
            currentPreset.elements[idx + 1] = temp;
        } else if (dir === 'down' && idx > 0) {
            const temp = currentPreset.elements[idx];
            currentPreset.elements[idx] = currentPreset.elements[idx - 1];
            currentPreset.elements[idx - 1] = temp;
        }

        currentPreset.elements.forEach((item, i) => { item.zIndex = i + 1; });
        renderCanvasElements();
    }
    window.reorderCanvasElement = reorderCanvasElement;

    function deleteSelectedCanvasElement() {
        if (!currentPreset || selectedElementIds.size === 0) return;
        pushHistory();
        currentPreset.elements = currentPreset.elements.filter(item => !selectedElementIds.has(item.id));
        selectedElementIds.clear();
        renderCanvasElements();
        updateInspectorPanel();
    }
    window.deleteSelectedCanvasElement = deleteSelectedCanvasElement;

    function duplicateSelectedCanvasElement() {
        if (!currentPreset || selectedElementIds.size === 0) return;
        pushHistory();

        const newIds = new Set();
        selectedElementIds.forEach(id => {
            const el = currentPreset.elements.find(item => item.id === id);
            if (el) {
                const copy = JSON.parse(JSON.stringify(el));
                copy.id = `el-${copy.type}-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 4)}`;
                copy.x = (copy.x || 0) + 20;
                copy.y = (copy.y || 0) + 20;
                copy.zIndex = currentPreset.elements.length + 1;
                currentPreset.elements.push(copy);
                newIds.add(copy.id);
            }
        });

        selectedElementIds = newIds;
        renderCanvasElements();
        updateInspectorPanel();
    }
    window.duplicateSelectedCanvasElement = duplicateSelectedCanvasElement;

    // ─────────────────────────────────────────────────────────────────────────
    // 10. Alignment Tools
    // ─────────────────────────────────────────────────────────────────────────
    function alignSelectedElements(type) {
        if (!currentPreset || selectedElementIds.size === 0) return;
        pushHistory();

        if (selectedElementIds.size === 1) {
            // Align single element relative to 1920x1080 canvas
            const primaryId = getSelectedElementId();
            const el = currentPreset.elements.find(item => item.id === primaryId);
            if (!el) return;

            if (type === 'left') el.x = 40;
            else if (type === 'center') el.x = Math.round((1920 - el.width) / 2);
            else if (type === 'right') el.x = 1920 - el.width - 40;
            else if (type === 'top') el.y = 40;
            else if (type === 'middle') el.y = Math.round((1080 - el.height) / 2);
            else if (type === 'bottom') el.y = 1080 - el.height - 40;
        } else {
            // Align group relative to group bounding box
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            const items = [];
            selectedElementIds.forEach(id => {
                const el = currentPreset.elements.find(item => item.id === id);
                if (el) {
                    items.push(el);
                    minX = Math.min(minX, el.x);
                    minY = Math.min(minY, el.y);
                    maxX = Math.max(maxX, el.x + el.width);
                    maxY = Math.max(maxY, el.y + el.height);
                }
            });

            const groupCenterX = minX + (maxX - minX) / 2;
            const groupCenterY = minY + (maxY - minY) / 2;

            items.forEach(el => {
                if (type === 'left') el.x = minX;
                else if (type === 'center') el.x = Math.round(groupCenterX - el.width / 2);
                else if (type === 'right') el.x = maxX - el.width;
                else if (type === 'top') el.y = minY;
                else if (type === 'middle') el.y = Math.round(groupCenterY - el.height / 2);
                else if (type === 'bottom') el.y = maxY - el.height;
            });
        }

        renderCanvasElements();
        updateInspectorPanel();
    }
    window.alignSelectedElements = alignSelectedElements;

    // ─────────────────────────────────────────────────────────────────────────
    // 11. Palette Tabs & Preset Save
    // ─────────────────────────────────────────────────────────────────────────
    async function savePluginPreset() {
        if (!currentPreset) return;

        const nameInput = document.getElementById('plugin-edit-name');
        currentPreset.name = (nameInput?.value || 'Untitled Plugin').trim();

        const targets = [];
        if (document.getElementById('target-cb-main')?.checked) targets.push('main');
        if (document.getElementById('target-cb-lt')?.checked) targets.push('lt');
        if (targets.length === 0) targets.push('main');
        currentPreset.targets = targets;

        // Generate static thumbnail snapshot for crisp card rendering
        const snapshot = await generateCanvasSnapshot();
        if (snapshot) {
            currentPreset.thumbnail = snapshot;
        }

        try {
            const res = await fetch('/api/plugins/preset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(currentPreset)
            });
            if (res.ok) {
                const data = await res.json();
                currentPreset = data.preset;
                await loadPluginLibrary();
                initialPresetSnapshot = getCurrentEditorSnapshot();
                if (typeof showToast === 'function') {
                    showToast('Plugin berhasil disimpan!', 'success', 2000);
                }
                closePluginEditorModal(true);
            } else {
                await showCustomDialog('alert', 'Gagal menyimpan preset');
            }
        } catch (e) {
            console.error('Error saving preset:', e);
            await showCustomDialog('alert', 'Gagal menyimpan preset: ' + e);
        }
    }
    window.savePluginPreset = savePluginPreset;

    async function savePluginPresetAsNew() {
        if (!currentPreset) return;
        currentPreset.id = ''; // generate new ID
        currentPreset.name = `${currentPreset.name} (Copy)`;
        await savePluginPreset();
    }
    window.savePluginPresetAsNew = savePluginPresetAsNew;

    function switchPaletteTab(tab) {
        const btns = document.querySelectorAll('.palette-tab-btn');
        btns.forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.palette-tab-btn[data-tab="${tab}"]`);
        if (activeBtn) activeBtn.classList.add('active');

        const tabComp = document.getElementById('palette-tab-comp');
        const tabSaved = document.getElementById('palette-tab-saved');
        if (tabComp) tabComp.style.display = tab === 'comp' ? 'flex' : 'none';
        if (tabSaved) tabSaved.style.display = tab === 'saved' ? 'flex' : 'none';
    }
    window.switchPaletteTab = switchPaletteTab;

    function renderPaletteSavedList() {
        const container = document.getElementById('palette-saved-list');
        if (!container) return;
        container.innerHTML = '';

        pluginPresets.forEach(preset => {
            const item = document.createElement('div');
            item.className = 'palette-component-card';
            item.onclick = () => injectSavedPresetElements(preset.id);

            item.innerHTML = `
                <div class="palette-comp-info">
                    <span class="palette-comp-icon">📦</span>
                    <div>
                        <div class="palette-comp-title">${escapeHtml(preset.name)}</div>
                        <div class="palette-comp-desc">${(preset.elements || []).length} elemen • ${preset.category || 'CUSTOM'}</div>
                    </div>
                </div>
                <button class="btn-add-comp">＋ Insert</button>
            `;
            container.appendChild(item);
        });
    }

    function injectSavedPresetElements(presetId) {
        const p = pluginPresets.find(item => item.id === presetId);
        if (!p || !currentPreset) return;

        pushHistory();
        const baseZ = currentPreset.elements.length;
        (p.elements || []).forEach((el, i) => {
            const copy = JSON.parse(JSON.stringify(el));
            copy.id = `el-${copy.type}-${Date.now().toString(36)}-${i}`;
            copy.x = (copy.x || 0) + 30;
            copy.y = (copy.y || 0) + 30;
            copy.zIndex = baseZ + i + 1;
            currentPreset.elements.push(copy);
        });
        renderCanvasElements();
        updateInspectorPanel();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 12. Snapping Guides
    // ─────────────────────────────────────────────────────────────────────────
    function showGuideLineX(x) {
        const wrapper = document.getElementById('plugin-canvas-wrapper');
        if (!wrapper || document.getElementById('guide-line-x')) return;
        const line = document.createElement('div');
        line.id = 'guide-line-x';
        line.style.position = 'absolute';
        line.style.left = `${x}px`;
        line.style.top = '0px';
        line.style.width = '1px';
        line.style.height = '1080px';
        line.style.backgroundColor = '#00e5ff';
        line.style.zIndex = '99999';
        line.style.pointerEvents = 'none';
        line.style.boxShadow = '0 0 8px #00e5ff';
        wrapper.appendChild(line);
    }

    function showGuideLineY(y) {
        const wrapper = document.getElementById('plugin-canvas-wrapper');
        if (!wrapper || document.getElementById('guide-line-y')) return;
        const line = document.createElement('div');
        line.id = 'guide-line-y';
        line.style.position = 'absolute';
        line.style.left = '0px';
        line.style.top = `${y}px`;
        line.style.width = '1920px';
        line.style.height = '1px';
        line.style.backgroundColor = '#00e5ff';
        line.style.zIndex = '99999';
        line.style.pointerEvents = 'none';
        line.style.boxShadow = '0 0 8px #00e5ff';
        wrapper.appendChild(line);
    }

    function removeGuideLines() {
        document.getElementById('guide-line-x')?.remove();
        document.getElementById('guide-line-y')?.remove();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 13. Keyboard Shortcuts (Canvas & Global)
    // ─────────────────────────────────────────────────────────────────────────
    document.addEventListener('keydown', function (e) {
        const modal = document.getElementById('plugin-editor-modal');
        const isModalOpen = modal && modal.style.display === 'flex';

        if (isModalOpen) {
            // Ignore if in inline editing or typing inside input fields
            if (isInlineEditing) return;
            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                deleteSelectedCanvasElement();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                duplicateSelectedCanvasElement();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                undoCanvas();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                redoCanvas();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
                e.preventDefault();
                selectedElementIds = new Set((currentPreset?.elements || []).map(el => el.id));
                renderCanvasElements();
                updateInspectorPanel();
            } else if (e.key === 'Escape') {
                selectedElementIds.clear();
                renderCanvasElements();
                updateInspectorPanel();
            } else if ((e.ctrlKey || e.metaKey) && ['b', 'i', 'u'].includes(e.key.toLowerCase())) {
                if (selectedElementIds.size > 0 && currentPreset) {
                    const primaryId = getSelectedElementId();
                    const el = currentPreset.elements.find(item => item.id === primaryId);
                    if (el && (el.type === 'text' || el.type === 'timer' || el.type === 'stopwatch' || el.type === 'clock')) {
                        const propMap = { 'b': 'bold', 'i': 'italic', 'u': 'underline' };
                        const prop = propMap[e.key.toLowerCase()];
                        if (prop) {
                            e.preventDefault();
                            toggleElBoolProp(null, el.id, prop);
                        }
                    }
                }
            } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key) && selectedElementIds.size > 0) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                pushHistory();
                selectedElementIds.forEach(id => {
                    const el = currentPreset?.elements?.find(item => item.id === id);
                    if (el) {
                        if (e.key === 'ArrowLeft') el.x = (el.x || 0) - step;
                        if (e.key === 'ArrowRight') el.x = (el.x || 0) + step;
                        if (e.key === 'ArrowUp') el.y = (el.y || 0) - step;
                        if (e.key === 'ArrowDown') el.y = (el.y || 0) + step;
                    }
                });
                renderCanvasElements();
                if (selectedElementIds.size === 1) {
                    const singleEl = currentPreset?.elements?.find(item => item.id === getSelectedElementId());
                    const inputX = document.querySelector('.insp-possize-grid input[oninput*="\'x\'"]');
                    const inputY = document.querySelector('.insp-possize-grid input[oninput*="\'y\'"]');
                    if (inputX && singleEl) inputX.value = singleEl.x || 0;
                    if (inputY && singleEl) inputY.value = singleEl.y || 0;
                }
            }
        }
    });

    // ─────────────────────────────────────────────────────────────────────────
    // 14. Selective Context Menu Blocking (Whitelist Based)
    // ─────────────────────────────────────────────────────────────────────────
    document.addEventListener('contextmenu', function (e) {
        // Whitelist all elements that have ShowLyrics custom context menus
        const isAllowedCustomMenu = e.target.closest(
            '.plugin-folder-item, #plugin-folder-list, .plugin-card, .canvas-element, #plugin-canvas-viewport, ' +
            '.song-item, .schedule-item, .schedule-sub-item, .verse-item, .grid-verse-item, ' +
            '.bg-card, .bg-folder-item, .media-item, .translation-item, .preset-card, .plugin-ctx-menu, .grid-context-menu'
        );

        if (isAllowedCustomMenu) {
            // Let the custom menu handler run
            return;
        }

        // Block native browser context menu everywhere else
        e.preventDefault();
    });

    // Helper HTML escape
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    // Initialize marquee setup on DOMContentLoaded or immediate
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupMarqueeSelection);
    } else {
        setupMarqueeSelection();
    }

})();
