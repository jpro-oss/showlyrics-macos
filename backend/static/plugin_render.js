// plugin_render.js — High-performance transparent overlay renderer for ShowLyrics plugins
(function () {
    'use strict';

    const viewport = document.getElementById('plugin-viewport');
    if (!viewport) return;
    const targetType = viewport.getAttribute('data-target') || 'main'; // 'main' or 'lt'

    // ─────────────────────────────────────────────────────────────────────────
    // Responsive Transform Scale (1920x1080 virtual canvas to window dimensions)
    // ─────────────────────────────────────────────────────────────────────────
    function resizeViewport() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        const scaleX = w / 1920;
        const scaleY = h / 1080;
        viewport.style.transform = `scale(${scaleX}, ${scaleY})`;
    }
    window.addEventListener('resize', resizeViewport);
    window.addEventListener('DOMContentLoaded', resizeViewport);
    resizeViewport();

    // ─────────────────────────────────────────────────────────────────────────
    // Dynamic Font Injection
    // ─────────────────────────────────────────────────────────────────────────
    function injectFont(fontName) {
        if (!fontName) return;
        const linkId = 'font-link-' + fontName.replace(/\s+/g, '-').toLowerCase();
        if (document.getElementById(linkId)) return;
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}&display=swap`;
        document.head.appendChild(link);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Time Formatter (Always HH:MM:SS)
    // ─────────────────────────────────────────────────────────────────────────
    function pad2(n) {
        return n < 10 ? '0' + n : '' + n;
    }

    function formatTime(totalSec, isNegative) {
        const absSec = Math.max(0, Math.floor(Math.abs(totalSec)));
        const hrs = Math.floor(absSec / 3600);
        const mins = Math.floor((absSec % 3600) / 60);
        const secs = absSec % 60;
        const formatted = `${pad2(hrs)}:${pad2(mins)}:${pad2(secs)}`;
        return isNegative ? `-${formatted}` : formatted;
    }

    function formatClock(el) {
        const now = new Date();
        const is12h = el.format12h === true;
        let hrs = now.getHours();
        let ampm = '';
        if (is12h) {
            ampm = hrs >= 12 ? ' PM' : ' AM';
            hrs = hrs % 12 || 12;
        }
        const mins = pad2(now.getMinutes());
        const secs = el.hideSeconds ? '' : `:${pad2(now.getSeconds())}`;
        let timeStr = `${pad2(hrs)}:${mins}${secs}${ampm}`;

        if (el.showDate) {
            const lang = el.dateLang || 'id';
            const dateStr = now.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
                year: 'numeric'
            });
            timeStr = `${dateStr}  ${timeStr}`;
        }
        return timeStr;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Active Plugins State & DOM Tracker
    // ─────────────────────────────────────────────────────────────────────────
    let currentActivePlugins = {};
    const renderedNodes = new Map(); // preset_id -> { node, autoHideTimer }

    function shouldRenderOnTarget(targets) {
        if (!targets || targets.length === 0) return true;
        if (targets.includes('both')) return true;
        return targets.includes(targetType);
    }

    function renderElement(el, presetId) {
        const div = document.createElement('div');
        div.className = `plugin-el plugin-el-${el.type}`;
        div.id = `el-${presetId}-${el.id}`;

        div.style.left = (el.x || 0) + 'px';
        div.style.top = (el.y || 0) + 'px';
        div.style.width = (el.width || 100) + 'px';
        div.style.height = (el.height || 50) + 'px';
        div.style.zIndex = el.zIndex || 1;

        if (el.fontFamily) injectFont(el.fontFamily);

        if (el.type === 'shape') {
            div.style.backgroundColor = el.bgColor || '#000000';
            div.style.opacity = el.bgOpacity !== undefined ? el.bgOpacity : 1;
            div.style.borderRadius = (el.borderRadius || 0) + 'px';
            if (el.borderWidth) {
                div.style.border = `${el.borderWidth}px solid ${el.borderColor || 'transparent'}`;
            }
            if (el.shadow) {
                div.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
            }
        } else if (el.type === 'text') {
            div.style.fontFamily = el.fontFamily || 'Montserrat';
            div.style.fontSize = (el.fontSize || 24) + 'px';
            div.style.color = el.color || '#ffffff';
            div.style.fontWeight = el.bold ? 'bold' : 'normal';
            div.style.fontStyle = el.italic ? 'italic' : 'normal';
            div.style.textDecoration = el.underline ? 'underline' : 'none';
            div.style.textTransform = el.uppercase ? 'uppercase' : 'none';
            div.style.textAlign = el.align || 'center';
            div.style.justifyContent = el.align === 'left' ? 'flex-start' : (el.align === 'right' ? 'flex-end' : 'center');
            div.style.alignItems = 'center';
            div.style.whiteSpace = 'pre-wrap';
            div.style.lineHeight = el.lineHeight || 1.3;
            if (el.shadow) div.style.textShadow = '0 2px 8px rgba(0,0,0,0.8)';
            if (el.strokeWidth) {
                div.style.webkitTextStroke = `${el.strokeWidth}px ${el.strokeColor || '#000000'}`;
            }
            div.innerText = el.text || '';
        } else if (el.type === 'image') {
            const img = document.createElement('img');
            img.src = el.url || '';
            img.style.width = '100%';
            img.style.height = '100%';
            img.style.objectFit = el.fit || 'contain';
            img.style.opacity = el.opacity !== undefined ? el.opacity : 1;
            img.style.borderRadius = (el.borderRadius || 0) + 'px';
            if (el.borderWidth) {
                img.style.border = `${el.borderWidth}px solid ${el.borderColor || 'transparent'}`;
            }
            if (el.shadow) {
                img.style.filter = 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))';
            }
            div.appendChild(img);
        } else if (el.type === 'timer' || el.type === 'stopwatch' || el.type === 'clock') {
            div.style.fontFamily = el.fontFamily || 'Montserrat';
            div.style.fontSize = (el.fontSize || 48) + 'px';
            div.style.color = el.color || '#ffffff';
            div.style.fontWeight = el.bold ? 'bold' : 'normal';
            div.style.textAlign = el.align || 'center';
            div.style.justifyContent = el.align === 'left' ? 'flex-start' : (el.align === 'right' ? 'flex-end' : 'center');
            div.style.alignItems = 'center';
            if (el.shadow) div.style.textShadow = '0 2px 10px rgba(0,0,0,0.9)';
            div.dataset.pluginType = el.type;
            div.dataset.elementId = el.id;
            div.dataset.presetId = presetId;
            div.innerText = el.type === 'clock' ? formatClock(el) : '00:00:00';
        }

        return div;
    }

    function syncActivePlugins(activePlugins) {
        currentActivePlugins = activePlugins || {};
        const incomingIds = new Set();

        for (const [pid, entry] of Object.entries(currentActivePlugins)) {
            const preset = entry.preset;
            if (!preset || !shouldRenderOnTarget(preset.targets)) continue;

            incomingIds.add(pid);

            if (!renderedNodes.has(pid)) {
                // Buat instance baru
                const instance = document.createElement('div');
                instance.className = 'plugin-instance';
                instance.id = `plugin-instance-${pid}`;

                const anim = preset.animation || { in: 'fade', out: 'fade', duration: 0.4 };
                const dur = anim.duration || 0.4;
                instance.style.setProperty('--anim-dur', `${dur}s`);
                instance.classList.add(`anim-${anim.in || 'fade'}-in`);

                // Render elements
                (preset.elements || []).forEach(el => {
                    const elNode = renderElement(el, pid);
                    instance.appendChild(elNode);
                });

                viewport.appendChild(instance);

                // Auto-Hide untuk Lowerthird jika dikonfigurasi
                let autoHideTimer = null;
                if (preset.autoHide && preset.autoHide > 0) {
                    autoHideTimer = setTimeout(() => {
                        dismissPluginInstance(pid);
                    }, preset.autoHide * 1000);
                }

                renderedNodes.set(pid, { node: instance, preset, autoHideTimer });
            }
        }

        // Hapus plugin yang sudah tidak aktif
        for (const [pid, item] of renderedNodes.entries()) {
            if (!incomingIds.has(pid)) {
                dismissPluginInstance(pid);
            }
        }
    }

    function dismissPluginInstance(pid) {
        const item = renderedNodes.get(pid);
        if (!item) return;

        if (item.autoHideTimer) clearTimeout(item.autoHideTimer);

        const node = item.node;
        const preset = item.preset;
        const anim = preset.animation || { in: 'fade', out: 'fade', duration: 0.4 };
        const dur = anim.duration || 0.4;

        node.className = `plugin-instance anim-${anim.out || 'fade'}-out`;
        setTimeout(() => {
            if (node.parentNode) node.parentNode.removeChild(node);
            renderedNodes.delete(pid);
        }, dur * 1000 + 50);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Fast High-Precision Ticker for Timers & Clock
    // ─────────────────────────────────────────────────────────────────────────
    function updateTimers() {
        const now = Date.now() / 1000.0;

        for (const [pid, entry] of Object.entries(currentActivePlugins)) {
            const preset = entry.preset;
            if (!preset || !renderedNodes.has(pid)) continue;

            const timersState = entry.timers || {};

            (preset.elements || []).forEach(el => {
                if (el.type === 'timer') {
                    const tState = timersState[el.id];
                    const elNode = document.getElementById(`el-${pid}-${el.id}`);
                    if (!elNode || !tState) return;

                    let remaining = 0;
                    if (tState.running) {
                        remaining = tState.target_end - now;
                    } else if (tState.paused_at) {
                        remaining = tState.target_end - tState.paused_at;
                    } else {
                        remaining = tState.duration || 0;
                    }

                    const finishAction = el.finishAction || 'blink';

                    if (remaining <= 0) {
                        if (finishAction === 'blink') {
                            elNode.innerText = '00:00:00';
                            elNode.classList.add('timer-blink');
                        } else if (finishAction === 'freeze') {
                            elNode.innerText = '00:00:00';
                            elNode.classList.remove('timer-blink');
                            elNode.style.color = el.color || '#ffffff';
                        } else if (finishAction === 'overtime') {
                            elNode.innerText = formatTime(remaining, true);
                            elNode.classList.remove('timer-blink');
                            elNode.style.color = '#ef4444'; // merah menyala untuk overtime
                        }
                    } else {
                        elNode.classList.remove('timer-blink');
                        elNode.style.color = el.color || '#ffffff';
                        elNode.innerText = formatTime(remaining, false);

                        // Blink warning saat sisa waktu < 1 menit
                        if (finishAction === 'blink' && remaining < 60) {
                            elNode.classList.add('timer-blink');
                        }
                    }
                } else if (el.type === 'stopwatch') {
                    const tState = timersState[el.id];
                    const elNode = document.getElementById(`el-${pid}-${el.id}`);
                    if (!elNode || !tState) return;

                    let elapsed = 0;
                    if (tState.running) {
                        elapsed = now - (tState.started_at || now);
                    } else if (tState.paused_at) {
                        elapsed = tState.paused_at - (tState.started_at || tState.paused_at);
                    }
                    elNode.innerText = formatTime(elapsed, false);
                } else if (el.type === 'clock') {
                    const elNode = document.getElementById(`el-${pid}-${el.id}`);
                    if (elNode) {
                        elNode.innerText = formatClock(el);
                    }
                }
            });
        }
    }
    setInterval(updateTimers, 200);

    // ─────────────────────────────────────────────────────────────────────────
    // WebSocket Connection
    // ─────────────────────────────────────────────────────────────────────────
    let ws = null;
    function connectWS() {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

        ws.onopen = function () {
            console.log('[PluginRender] WebSocket connected on target:', targetType);
        };

        ws.onmessage = function (event) {
            function handleData(data) {
                if (data.type === 'update_plugin_state') {
                    syncActivePlugins(data.active_plugins);
                }
            }

            if (window._WEShield && typeof window._WEShield.dispatch === 'function') {
                window._WEShield.dispatch(event.data, handleData);
            } else {
                try {
                    const parsed = JSON.parse(event.data);
                    handleData(parsed);
                } catch (e) {
                    console.error('[PluginRender] Error parsing WS data:', e);
                }
            }
        };

        ws.onclose = function () {
            console.warn('[PluginRender] WebSocket closed, retrying in 2s...');
            setTimeout(connectWS, 2000);
        };

        ws.onerror = function (err) {
            console.error('[PluginRender] WebSocket error:', err);
            try { ws.close(); } catch (e) {}
        };
    }

    connectWS();
})();
