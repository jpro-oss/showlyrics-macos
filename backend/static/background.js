        /* ============================================================
         * SHOWLYRICS — Background Video Engine v2.1 (Optimized)
         *
         * Perubahan dari v2.0:
         *  - 3-Tier adaptive sync (micro-ignore / soft-catchup / masked-seek)
         *  - Masked Hard Seek dengan event-driven restoration (seeked event)
         *  - BroadcastChannel API mengganti localStorage (zero disk I/O)
         *  - Adaptive crossfade berdasarkan kapasitas device
         *  - Smart preload: default metadata → upgrade ke auto sebelum transisi
         *  - 3-Stage reconnect recovery (delay sebelum sync)
         *  - Fallback polling interval diperlebar ke 20 detik
         * ============================================================ */

        /* ========== DETEKSI KAPASITAS PERANGKAT ========== */
        (function detectDevice() {
            const cores = navigator.hardwareConcurrency || 4;

            // BUG FIX: navigator.deviceMemory || 4 menyebabkan isLow SELALU true di Electron!
            // Karena deviceMemory bisa undefined di Electron, fallback ke 4, lalu 4 <= 4 = TRUE.
            // Fix: gunakan nilai aktual atau null — JANGAN fallback ke 4.
            const mem = navigator.deviceMemory || null;

            // Deteksi apakah berjalan di Electron (via User-Agent string)
            const isElectron = /Electron\//.test(navigator.userAgent);

            if (isElectron) {
                // Di Electron: paksa 'high' tier untuk mendapat sync interval MINIMUM.
                // HEARTBEAT_THROTTLE_MS = 0 artinya SETIAP heartbeat diproses.
                // Ini penting karena video di Electron butuh sinkronisasi presisi.
                window._bgDeviceTier = "high";
            } else {
                // Di browser biasa: deteksi tier berdasarkan hardware aktual
                const memIsLow = (mem !== null) && (mem <= 4);
                const isLow = cores <= 4 || memIsLow;
                const memIsMid = (mem !== null) && (mem <= 8);
                const isMid = !isLow && (cores <= 8 || memIsMid);
                window._bgDeviceTier = isLow ? "low" : (isMid ? "mid" : "high");
            }
        })();

        /* ========== KONFIGURASI ========== */
        // Adaptive crossfade berdasarkan tier perangkat
        const CROSSFADE_BY_TIER = { low: 150, mid: 300, high: 500 };
        let crossfadeTime = CROSSFADE_BY_TIER[window._bgDeviceTier] || 500;

        // Sync thresholds — 3-tier adaptif, dilonggarkan untuk low-end agar kurangi hard seek
        const SYNC_MICRO_IGNORE = window._bgDeviceTier === "low" ? 0.5 : 0.3;

        // [PERF-FIX] SYNC_MEDIUM_LIMIT diperluas: soft catchup berlaku sampai 1.5s (low) / 1.0s (mid) / 0.6s (high).
        // Ini memastikan drift yang terjadi karena variasi normal decode/render
        // tidak langsung trigger hard seek yang menyebabkan glitch visual.
        const SYNC_MEDIUM_LIMIT = window._bgDeviceTier === "low" ? 1.5 : (window._bgDeviceTier === "mid" ? 1.0 : 0.6);

        // [PERF-FIX] SYNC_HARD_SEEK_LIMIT: hard seek HANYA terjadi jika drift > nilai ini.
        // User request: toleransi drift maks 600ms → hard seek tidak boleh terjadi di bawah 600ms.
        // Low-end: 0.6s (600ms), mid: 0.5s, high: 0.4s.
        // Tier 3 (hard seek) hanya terpicu jika drift MELEWATI limit ini.
        const SYNC_HARD_SEEK_LIMIT = window._bgDeviceTier === "low" ? 0.6 : (window._bgDeviceTier === "mid" ? 0.5 : 0.4);

        const SYNC_SLOWDOWN_RATE = 0.98;  // perlambat kalau terlalu maju
        const SYNC_RATE_RESTORE_AT = 0.15; // kembalikan ke 1.0 jika drift < nilai ini

        // [RC-8] Adaptive catchup: semakin besar drift, semakin agresif
        function getAdaptiveCatchupRate(absDrift) {
            if (absDrift < 0.4) return 1.01;  // drift kecil: +1%
            if (absDrift < 0.5) return 1.025; // drift sedang: +2.5%
            return 1.05;                      // drift besar: +5%
        }

        // Hard seek controls
        const SYNC_HARD_COOLDOWN_MS = 2500; // cooldown global antar hard seek
        const SYNC_DEBOUNCE_MS = 80;  // debounce antar command sync_time
        const SEEK_MASK_OPACITY = 0.3;  // opacity saat masking hard seek

        // [RC-1] Grace period setelah ganti background — cegah hard seek prematur
        const TRANSITION_GRACE_MS = 3000; // 3 detik tidak boleh hard seek setelah video baru load
        let transitionGracePeriodEnd = 0; // timestamp performance.now() saat grace selesai

        // Lainnya
        const LOAD_WATCHDOG_MS = 10000; // timeout watchdog saat video load (naik 8→10s untuk file besar)
        const TRANSITION_MIN_GAP_MS = 500;  // anti-spam transisi (naik 250→500ms)
        const RECONNECT_SYNC_DELAY = 1500; // tunggu decoder stabil sebelum sync pasca-reconnect
        const FALLBACK_POLL_MS = 20000; // polling fallback

        // Client-side heartbeat throttle — kurangi beban CPU di low-end
        const HEARTBEAT_THROTTLE_MS = window._bgDeviceTier === "low" ? 2000 :
                                       (window._bgDeviceTier === "mid" ? 1000 : 0);
        let lastHeartbeatProcessedAt = 0;

        // Watchdog interval adaptif — 3s cukup untuk low-end (threshold stuck tetap 3.5s)
        const WATCHDOG_INTERVAL_MS = window._bgDeviceTier === "low" ? 3000 : 1000;

        // [RC-3] Exponential backoff untuk reconnect — cegah connection storm
        let reconnectAttempt = 0;

        const BC_CHANNEL_NAME = "showlyrics_sync_channel"; // BroadcastChannel name

        /* ========== STATE ========== */
        const tabUid = Math.random().toString(36).substring(2, 9);
        let activeVid = 1;
        let bgRequestId = 0;
        let isTransitioning = false;
        let lastTransitionAt = 0;
        let lastSyncAt = 0;      // timestamp hard seek terakhir (ms)
        let lastBgSignature = "";
        let videoErrorCount = 0;
        const MAX_VIDEO_ERRORS = 3;

        // NTP Clock Calibration state
        let clockOffset = 0;
        let isCalibrated = false;
        let hasCalibratedOnce = false; // Simpan status kalibrasi sebelumnya agar sinkronisasi tidak mati saat reconnect
        let calibrationSamples = [];

        // BroadcastChannel snapshot state (mengganti localStorage)
        let lastSnapshot = null;   // { videoUrl, playbackStartedAt, pausedAt, playing, generationId }

        let ws = null;
        let reconnectTimer = null;
        let fadeTimeout = null;
        let loadWatchdogTimeout = null;
        let syncDebounceTimer = null;
        let nextVidCanPlayHandler = null;
        let seekMaskTimer = null; // timeout fallback jika event seeked terlambat

        // SW Cache status tracker (dari pesan SW → page)
        const swCacheStatusMap = new Map(); // mediaId → 'downloading' | 'ready' | 'error'

        // Application-level WS keepalive timer
        let wsKeepaliveInterval = null;
        let wsKeepaliveWorker = null;

        const v1 = document.getElementById("vid1");
        const v2 = document.getElementById("vid2");

        /* ========== BROADCAST CHANNEL (ganti localStorage) ========== */
        let bc = null;
        try {
            bc = new BroadcastChannel(BC_CHANNEL_NAME);
            bc.onmessage = (event) => {
                const snap = event.data;
                if (snap && snap.videoUrl) {
                    lastSnapshot = snap;
                    // Jangan langsung sync — hanya perbarui snapshot
                    // Sync hanya dipicu saat reconnect / polling fallback
                }
            };
        } catch (e) {
            console.warn("[BG] BroadcastChannel tidak tersedia:", e);
        }

        /* ========== HELPERS ========== */
        function getCurrentVideo() { return activeVid === 1 ? v1 : v2; }
        function getNextVideo() { return activeVid === 1 ? v2 : v1; }

        function normalizeUrl(url) {
            if (!url) return "";
            try { return new URL(url, window.location.origin).href.split('#')[0]; } catch (_) { return url.split('#')[0]; }
        }

        function forceMuted(video) {
            if (!video) return;
            video.muted = true;
            video.volume = 0;
            video.setAttribute("muted", "");
        }

        function applyVolumeState(video) {
            // Background.html selalu mute — audio dikelola oleh audio.html
            if (!video) return;
            video.muted = true;
            video.volume = 0;
            video.setAttribute("muted", "");
        }

        function cleanupVideo(video) {
            if (!video) return;
            try {
                video.pause();
                video.removeAttribute("src");
                video.src = "";
                video.load();
                video.style.opacity = "0";
                video.dataset.behavior = "";
                video.playbackRate = 1.0;
            } catch (e) {
                console.warn("Cleanup video error:", e);
            }
        }

        function clearTimers() {
            if (fadeTimeout) { clearTimeout(fadeTimeout); fadeTimeout = null; }
            if (loadWatchdogTimeout) { clearTimeout(loadWatchdogTimeout); loadWatchdogTimeout = null; }
            if (syncDebounceTimer) { clearTimeout(syncDebounceTimer); syncDebounceTimer = null; }
            if (seekMaskTimer) { clearTimeout(seekMaskTimer); seekMaskTimer = null; }
        }

        function updateCssTransition(durationMs) {
            const s = `${durationMs / 1000}s`;
            v1.style.transition = `opacity ${s} ease-in-out`;
            v2.style.transition = `opacity ${s} ease-in-out`;
        }

        /* ========== MASKED HARD SEEK ========== */
        function maskedHardSeek(video, targetTime) {
            if (!video || !video.src) return;

            const now = performance.now();
            if (now - lastSyncAt < SYNC_HARD_COOLDOWN_MS) return; // throttle global

            // [RC-1] Grace period setelah ganti background — jangan paksa seek prematur
            if (now < transitionGracePeriodEnd) {
                return; // masih dalam grace period, skip hard seek
            }

            lastSyncAt = now;

            // [PERF-FIX] Set will-change HANYA saat seek akan terjadi — bukan permanen.
            // Ini memberi hint ke GPU compositor bahwa transform/opacity akan berubah,
            // tanpa mengunci GPU layer secara permanen saat video idle.
            video.style.willChange = "transform, opacity";

            // Pre-seek masking — sembunyikan artefak decoder
            video.style.opacity = String(SEEK_MASK_OPACITY);

            // Pastikan playbackRate normal sebelum seek
            if (video.playbackRate !== 1.0) video.playbackRate = 1.0;

            try {
                video.currentTime = Math.max(0, targetTime);
            } catch (e) {
                // Seek gagal (misalnya video belum siap) — restore opacity langsung
                video.style.willChange = "auto"; // cleanup GPU hint
                video.style.opacity = video === getCurrentVideo() ? "1" : "0";
                return;
            }

            // Restore opacity via event seeked (event-driven)
            const onSeeked = () => {
                if (seekMaskTimer) { clearTimeout(seekMaskTimer); seekMaskTimer = null; }
                video.removeEventListener("waiting", onWaiting);
                video.style.transition = `opacity 150ms ease-in-out`;
                video.style.opacity = video === getCurrentVideo() ? "1" : "0";
                setTimeout(() => {
                    updateCssTransition(crossfadeTime);
                    // [PERF-FIX] Hapus will-change setelah animasi selesai (160ms)
                    video.style.willChange = "auto";
                }, 160);
            };

            video.addEventListener("seeked", onSeeked, { once: true });

            // [RC-2] Safety saat video stuck buffering setelah seek
            const onWaiting = () => {
                setTimeout(() => {
                    // Jika masih menunggu setelah 1.5s, restore opacity agar tidak blank
                    video.removeEventListener("seeked", onSeeked);
                    if (seekMaskTimer) { clearTimeout(seekMaskTimer); seekMaskTimer = null; }
                    video.style.willChange = "auto"; // cleanup GPU hint
                    video.style.opacity = video === getCurrentVideo() ? "1" : "0";
                    setTimeout(() => updateCssTransition(crossfadeTime), 160);
                }, 1500);
            };
            video.addEventListener("waiting", onWaiting, { once: true });

            // Fallback safety jika event seeked tidak terpicu dalam 2s
            seekMaskTimer = setTimeout(() => {
                video.removeEventListener("seeked", onSeeked);
                video.removeEventListener("waiting", onWaiting);
                video.style.willChange = "auto"; // cleanup GPU hint
                video.style.opacity = video === getCurrentVideo() ? "1" : "0";
                setTimeout(() => updateCssTransition(crossfadeTime), 160);
            }, 2000);
        }

        /* ========== 3-TIER TIMELINE SYNC ========== */
        function applySyncTime(rawValue, options = {}) {
            const curr = getCurrentVideo();
            if (!curr || !curr.src) return;

            let t = parseFloat(rawValue);
            if (!Number.isFinite(t)) return;

            if (curr.duration && curr.duration > 0 && curr.loop) {
                t = t % curr.duration;
            }

            const drift = curr.currentTime - t;
            const absDrift = Math.abs(drift);
            const targetRate = options.playbackRate || 1.0;

            /* TIER 1 — Micro drift: abaikan & kembalikan playbackRate normal */
            if (absDrift < SYNC_MICRO_IGNORE && !options.force) {
                if (curr.playbackRate !== targetRate) {
                    curr.playbackRate = targetRate;
                }
                return;
            }

            /* TIER 2 — Medium drift: soft catch-up via playbackRate (adaptive)
             * Aman dilakukan bahkan saat buffering (readyState < 3) karena tidak menyebabkan
             * seek yang membatalkan buffer yang sedang terisi.
             * [RC-8] Rate proporsional: drift besar → rate lebih agresif
             * [PERF-FIX] SYNC_MEDIUM_LIMIT diperluas ke 1.5s (low-end) agar drift ≤600ms
             * selalu di-handle via playbackRate, tidak pernah trigger hard seek. */
            if (absDrift <= SYNC_MEDIUM_LIMIT && !options.force) {
                if (drift < 0) {
                    // Video tertinggal — percepat secara adaptif
                    curr.playbackRate = targetRate * getAdaptiveCatchupRate(absDrift);
                } else if (drift > SYNC_RATE_RESTORE_AT) {
                    // Video terlalu maju — perlambat
                    curr.playbackRate = targetRate * SYNC_SLOWDOWN_RATE;
                } else {
                    // Hampir sync — kembalikan ke normal
                    curr.playbackRate = targetRate;
                }
                return;
            }

            /* TIER 3 — Hard drift: masked hard seek
             * [PERF-FIX] Hanya terpicu jika drift > SYNC_HARD_SEEK_LIMIT (600ms untuk low-end).
             * Ini memastikan drift normal akibat decode/render latency tidak menyebabkan
             * hard seek yang mengganggu visual dan memicu reconnect loop.
             * JANGAN seek saat buffering (readyState < 3) karena seek membatalkan buffer fill!
             * JANGAN seek di 0.5s pertama agar decoder sempat decode frame awal. */
            if (!options.force && absDrift <= SYNC_HARD_SEEK_LIMIT) return;
            if (!options.force && curr.readyState < 3) return;
            if (!options.force && curr.currentTime < 0.5) return;
            maskedHardSeek(curr, t);
        }


        function scheduleSync(rawValue, options = {}) {
            if (options.force) {
                applySyncTime(rawValue, options);
                return;
            }
            if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
            syncDebounceTimer = setTimeout(() => {
                syncDebounceTimer = null;
                applySyncTime(rawValue);
            }, SYNC_DEBOUNCE_MS);
        }

        /* ========== SNAPSHOT TIMELINE RECONSTRUCTION ========== */
        function reconstructTimeline() {
            // Jangan rekonstruksi sebelum NTP kalibrasi selesai (kecuali sudah kalibrasi sekali)
            if (!isCalibrated && !hasCalibratedOnce) return;

            const snap = lastSnapshot;
            if (!snap || !snap.videoUrl) return;

            const curr = getCurrentVideo();
            const currUrl = normalizeUrl(curr.currentSrc || curr.src);
            const snapUrl = normalizeUrl(snap.videoUrl);
            if (!currUrl || currUrl !== snapUrl) return;

            // Gunakan getServerTimeNow() yang sudah dikalibrasi, bukan Date.now() mentah
            let target;
            if (snap.playing && snap.playbackStartedAt) {
                const elapsed = Math.max(0, (getServerTimeNow() - snap.playbackStartedAt) / 1000);
                target = (snap.pausedAt || 0) + elapsed;
            } else {
                target = snap.pausedAt || 0;
            }

            scheduleSync(target);
        }

        /* ========== VIDEO INIT ========== */
        function initializeVideoElement(video) {
            if (!video) return;
            video.preload = "metadata"; // default hemat
            video.playsInline = true;
            video.disablePictureInPicture = true;
            video.setAttribute("playsinline", "");
            video.setAttribute("preload", "metadata");
            forceMuted(video);

            video.addEventListener("error", () => {
                videoErrorCount++;
                console.warn(`Background video error (${videoErrorCount}):`, video.error);
                if (videoErrorCount >= MAX_VIDEO_ERRORS) videoErrorCount = 0;
            });

            video.addEventListener("loadeddata", () => {
                videoErrorCount = 0;
                if (video === getCurrentVideo()) {
                    applyVolumeState(video);
                } else {
                    forceMuted(video);
                }
            });

            video.addEventListener("ended", () => {
                if (video.dataset.behavior === "once_clear") {
                    video.style.opacity = "0";
                    setTimeout(() => cleanupVideo(video), crossfadeTime);
                }
            });
        }

        /* ========== BACKGROUND MANAGER (RACE-SAFE) ========== */
        function setBackground(payload = {}) {
            let url = payload.url || "";
            if (url) {
                if (url.startsWith('/')) {
                    url = window.location.protocol + "//" + window.location.hostname + ":18899" + url;
                } else {
                    try {
                        const parsedUrl = new URL(url);
                        parsedUrl.host = window.location.hostname + ":18899";
                        url = parsedUrl.href;
                    } catch (e) {
                        url = url.replace(/:\d+/, ":18899").replace("localhost", window.location.hostname).replace("127.0.0.1", window.location.hostname);
                    }
                }
            }
            const behavior = payload.behavior || "loop";
            const forceReplay = payload.forceReplay === true;
            const signature = `${url}|${behavior}`;

            // Dedup: parameter sama & tidak di-force-replay → hanya update timeline
            if (signature === lastBgSignature && url && !forceReplay) {
                // Terima start_time update (misalnya dari reconnect/join baru)
                if (payload.start_time !== undefined && (isCalibrated || hasCalibratedOnce)) {
                    applySyncTime(payload.start_time);
                }
                reconstructTimeline();
                return;
            }

            // [RC-4] Anti-spam: hanya block jika URL SAMA — URL baru HARUS diterima
            const incomingNormUrl = normalizeUrl(url);
            const currNormUrl = normalizeUrl(getCurrentVideo().currentSrc || getCurrentVideo().src);
            const isSameUrl = (incomingNormUrl && currNormUrl && incomingNormUrl === currNormUrl);
            if (isSameUrl && !forceReplay && performance.now() - lastTransitionAt < TRANSITION_MIN_GAP_MS) {
                return;
            }

            lastBgSignature = signature;

            // [RC-1] Mulai grace period untuk URL baru — blokir hard seek 3 detik
            if (url && !forceReplay) {
                transitionGracePeriodEnd = performance.now() + TRANSITION_GRACE_MS;
            }
            bgRequestId += 1;
            const requestId = bgRequestId;

            clearTimers();

            // Bersihkan listener lama agar tidak fire dari request sebelumnya
            const nextVid = getNextVideo();
            if (nextVidCanPlayHandler) {
                nextVid.removeEventListener("canplay", nextVidCanPlayHandler);
                nextVidCanPlayHandler = null;
            }

            const currVid = getCurrentVideo();

            // --- URL KOSONG: fade out video aktif ---
            if (!url) {
                lastBgSignature = ""; // Reset signature so we can show it again later!
                
                if (payload.clear_type === "clearlayer") {
                    currVid.style.opacity = "0";
                    currVid.pause();
                    try { currVid.currentTime = 0; } catch (_) {}
                    isTransitioning = false;
                    return;
                }
                
                if (payload.clear_type === "force_close") {
                    const videoUrl = currVid.currentSrc || currVid.src;
                    if (videoUrl && navigator.serviceWorker && navigator.serviceWorker.controller) {
                        const cleanUrl = videoUrl.split('?')[0];
                        navigator.serviceWorker.controller.postMessage({
                            action: 'clear_cache',
                            cleanUrl: cleanUrl
                        });
                        console.log("[Cache] Force clear SW cache for:", cleanUrl);
                    }
                }

                isTransitioning = true;
                lastTransitionAt = performance.now();
                // [PERF-FIX] Set will-change hanya saat fade out aktif
                currVid.style.willChange = "opacity, transform";
                currVid.style.opacity = "0";
                fadeTimeout = setTimeout(() => {
                    if (requestId !== bgRequestId) return;
                    cleanupVideo(currVid);
                    currVid.style.willChange = "auto"; // cleanup setelah fade selesai
                    isTransitioning = false;
                }, crossfadeTime);
                return;
            }

            const incomingUrl = normalizeUrl(url);
            const currUrl = normalizeUrl(currVid.currentSrc || currVid.src);

            // URL sama (tidak force replay): hanya perbarui timeline
            if (currUrl === incomingUrl) {
                // Pastikan opacity di-restore ke 1 (jika sebelumnya disembunyikan oleh clearlayer)
                currVid.style.opacity = "1";
                
                // Selalu replay dari awal ("tetap di replay dari awal") ketika unclear / muat ulang
                currVid.dataset.behavior = behavior;
                currVid.loop = (behavior === "loop" || behavior === undefined);
                try { currVid.currentTime = 0; } catch (_) { }
                currVid.play().catch(() => { });
                return;
            }

            // --- URL BARU: siapkan next video ---
            cleanupVideo(nextVid);
            nextVid.dataset.behavior = behavior;
            nextVid.loop = (behavior === "loop" || behavior === undefined);
            nextVid.preload = "auto"; // upgrade preload hanya saat transisi
            nextVid.setAttribute("preload", "auto");
            forceMuted(nextVid);
            if ('preservesPitch' in nextVid) nextVid.preservesPitch = false;

            let finalUrl = url;

            // Bypass Chrome Media Cache Lock across multiple windows on 1 computer
            // CATATAN: tabUid membuat setiap window punya URL unik sehingga tidak saling blokir
            // di level Cache Storage API. Namun SW akan strip query params saat match cache.
            const sep = url.includes('?') ? '&' : '?';
            finalUrl += sep + '_uid=' + tabUid;

            // CATATAN PENTING: Kami TIDAK menambah #t= Media Fragment URL.
            // Alasan: browser mengirim Range request dengan offset byte yang tidak bisa
            // diprediksi, yang melewati Service Worker cache dan menyebabkan IO disk baru.
            // Sinkronisasi posisi dilakukan via heartbeat setelah video berhasil load.
            if (payload.start_time !== undefined) {
                // Simpan start_time untuk dipakai setelah canplay, bukan sebagai URL fragment
                nextVid._targetStartTime = parseFloat(payload.start_time) || 0;
            } else {
                nextVid._targetStartTime = undefined;
            }

            nextVid.src = finalUrl;

            nextVid.load();

            let playbackStarted = false;

            nextVidCanPlayHandler = function onCanPlay() {
                if (requestId !== bgRequestId) return;
                if (playbackStarted) return;
                playbackStarted = true;

                nextVid.play().then(() => {
                    if (requestId !== bgRequestId) return;

                    // Terapkan posisi awal jika ada start_time yang disimpan
                    if (nextVid._targetStartTime !== undefined && nextVid._targetStartTime > 0.5) {
                        const t = nextVid._targetStartTime;
                        nextVid._targetStartTime = undefined;
                        // Tambahkan kompensasi 0.5s untuk waktu decode
                        const compensated = t + 0.5;
                        try { nextVid.currentTime = compensated; } catch (_) { }
                    } else {
                        nextVid._targetStartTime = undefined;
                    }

                    // Swap activeVid SEBELUM fade agar getCurrentVideo() konsisten
                    activeVid = activeVid === 1 ? 2 : 1;
                    applyVolumeState(nextVid);
                    forceMuted(currVid);

                    isTransitioning = true;
                    lastTransitionAt = performance.now();

                    // [PERF-FIX] Set will-change hanya saat crossfade aktif
                    nextVid.style.willChange = "opacity, transform";
                    currVid.style.willChange = "opacity, transform";

                    nextVid.style.opacity = "1";
                    currVid.style.opacity = "0";

                    // Setelah fade selesai: bersihkan old video
                    fadeTimeout = setTimeout(() => {
                        if (requestId !== bgRequestId) return;
                        cleanupVideo(currVid);
                        // [PERF-FIX] Hapus will-change dari kedua video setelah crossfade selesai.
                        // nextVid kini jadi active video — tidak perlu GPU layer hint saat idle.
                        currVid.style.willChange = "auto";
                        nextVid.style.willChange = "auto";
                        isTransitioning = false;

                        // Rekonstruksi timeline setelah decoder stabil (400ms setelah fade)
                        setTimeout(() => reconstructTimeline(), 400);
                    }, crossfadeTime);

                }).catch((err) => {
                    console.warn("Autoplay prevented or playback error, forcing mute and retrying:", err);
                    forceMuted(nextVid);
                    nextVid.play().then(() => {
                        if (requestId !== bgRequestId) return;

                        if (nextVid._targetStartTime !== undefined && nextVid._targetStartTime > 0.5) {
                            const t = nextVid._targetStartTime;
                            nextVid._targetStartTime = undefined;
                            const compensated = t + 0.5;
                            try { nextVid.currentTime = compensated; } catch (_) { }
                        } else {
                            nextVid._targetStartTime = undefined;
                        }

                        activeVid = activeVid === 1 ? 2 : 1;
                        applyVolumeState(nextVid);
                        forceMuted(currVid);

                        isTransitioning = true;
                        lastTransitionAt = performance.now();

                        // [PERF-FIX] Set will-change hanya saat crossfade aktif (retry path)
                        nextVid.style.willChange = "opacity, transform";
                        currVid.style.willChange = "opacity, transform";

                        nextVid.style.opacity = "1";
                        currVid.style.opacity = "0";

                        fadeTimeout = setTimeout(() => {
                            if (requestId !== bgRequestId) return;
                            cleanupVideo(currVid);
                            currVid.style.willChange = "auto";
                            nextVid.style.willChange = "auto";
                            isTransitioning = false;
                            setTimeout(() => reconstructTimeline(), 400);
                        }, crossfadeTime);
                    }).catch(finalErr => {
                        console.error("Critical: Retrying playback failed:", finalErr);
                        // Walaupun gagal mutar, tetap transisi ke opacity 1 agar frame pertama terlihat daripada hitam pekat
                        activeVid = activeVid === 1 ? 2 : 1;
                        nextVid.style.opacity = "1";
                        currVid.style.opacity = "0";
                    });
                });
            };

            nextVid.addEventListener("canplay", nextVidCanPlayHandler, { once: true });

            // Watchdog: reload jika data benar-benar tidak ada setelah LOAD_WATCHDOG_MS
            loadWatchdogTimeout = setTimeout(() => {
                if (requestId !== bgRequestId) return;
                if (nextVid.readyState < 2 && nextVid.src) {
                    console.warn("Load watchdog triggered: reloading video");
                    nextVid.load();
                }
            }, LOAD_WATCHDOG_MS);
        }

        function getServerTimeNow() {
            return Date.now() + clockOffset;
        }

        let pingsSent = 0;
        const MAX_PINGS = window._bgDeviceTier === "low" ? 8 : 15;
        const NTP_RETRY_MS = window._bgDeviceTier === "low" ? 300 : 100;

        function runNtpCalibration() {
            calibrationSamples = [];
            isCalibrated = false;
            pingsSent = 0;

            function sendPing() {
                if (!ws || ws.readyState !== WebSocket.OPEN) return;
                ws.send(JSON.stringify({
                    action: "ping",
                    client_ts: Date.now()
                }));
                pingsSent++;
            }

            sendPing();
        }

        /* ========== WEBSOCKET ========== */
        function connectWebSocket() {
            if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

            try {
                ws = new WebSocket("ws://" + window.location.hostname + ":18899/ws");
            } catch (e) {
                console.error("Gagal membuat WebSocket", e);
                scheduleReconnect();
                return;
            }

            ws.onopen = () => {
                console.log("WebSocket tersambung, memulai kalibrasi NTP...");
                if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

                // [RC-3] Reset exponential backoff counter saat berhasil connect
                reconnectAttempt = 0;

                // Mulai kalibrasi waktu
                runNtpCalibration();

                // 3-Stage Reconnect Recovery — tunggu decoder + NTP stabil
                setTimeout(() => reconstructTimeline(), RECONNECT_SYNC_DELAY);

                // Application-level keepalive ping setiap 25 detik via Web Worker.
                // Menggunakan Web Worker agar timer tidak di-throttle oleh browser saat tab berada di background.
                if (wsKeepaliveWorker) {
                    try { wsKeepaliveWorker.terminate(); } catch (_) {}
                    wsKeepaliveWorker = null;
                }
                try {
                    const blob = new Blob([
                        `self.onmessage = function(e) {
                            if (e.data === 'start') {
                                setInterval(function() {
                                    self.postMessage('ping');
                                }, 25000);
                            }
                        };`
                    ], { type: 'application/javascript' });
                    const workerUrl = URL.createObjectURL(blob);
                    wsKeepaliveWorker = new Worker(workerUrl);
                    wsKeepaliveWorker.onmessage = (e) => {
                        if (e.data === 'ping') {
                            if (ws && ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ action: 'ping', client_ts: Date.now() }));
                            }
                        }
                    };
                    wsKeepaliveWorker.postMessage('start');
                } catch (err) {
                    console.warn("[BG] Gagal membuat Web Worker keepalive, fallback ke setInterval:", err);
                    if (wsKeepaliveInterval) clearInterval(wsKeepaliveInterval);
                    wsKeepaliveInterval = setInterval(() => {
                        if (ws && ws.readyState === WebSocket.OPEN) {
                            ws.send(JSON.stringify({ action: 'ping', client_ts: Date.now() }));
                        }
                    }, 25000);
                }
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const action = data.action || data.type;
                    const payload = data.payload || {};

                    if (action === "pong") {
                        const now = Date.now();
                        const clientSent = data.client_ts;
                        const serverTs = data.server_ts;
                        const rtt = now - clientSent;

                        // Increase RTT limit to 300ms to tolerate jittery local Wi-Fi
                        if (rtt < 300) {
                            const estimatedServerTime = serverTs + rtt / 2;
                            const offset = estimatedServerTime - now;
                            calibrationSamples.push(offset);
                        }

                        if (calibrationSamples.length >= 5) {
                            calibrationSamples.sort((a, b) => a - b);
                            clockOffset = calibrationSamples[Math.floor(calibrationSamples.length / 2)];
                            isCalibrated = true;
                            hasCalibratedOnce = true;
                            console.log(`[NTP] Kalibrasi selesai: offset=${clockOffset}ms, RTT=${rtt}ms`);
                        } else if (pingsSent < MAX_PINGS) {
                            // Retry dengan delay adaptif — lebih lambat di low-end untuk kurangi congestion
                            setTimeout(() => {
                                if (ws && ws.readyState === WebSocket.OPEN) {
                                    ws.send(JSON.stringify({ action: "ping", client_ts: Date.now() }));
                                    pingsSent++;
                                }
                            }, NTP_RETRY_MS);
                        } else {
                            // Fallback: use median of whatever samples we collected, or 0
                            if (calibrationSamples.length > 0) {
                                calibrationSamples.sort((a, b) => a - b);
                                clockOffset = calibrationSamples[Math.floor(calibrationSamples.length / 2)];
                            } else {
                                clockOffset = 0;
                            }
                            isCalibrated = true;
                            hasCalibratedOnce = true;
                            console.warn(`[NTP] Kalibrasi selesai dengan fallback (sampel=${calibrationSamples.length}): offset=${clockOffset}ms`);
                        }
                    }

                    if (action === "heartbeat") {
                        // Client-side heartbeat throttle — kurangi CPU overhead di low/mid-end devices
                        if (HEARTBEAT_THROTTLE_MS > 0) {
                            const _hbNow = performance.now();
                            if (_hbNow - lastHeartbeatProcessedAt < HEARTBEAT_THROTTLE_MS) return;
                            lastHeartbeatProcessedAt = _hbNow;
                        }

                        const mediaId = data.media_id;
                        const serverTime = data.server_time;
                        const position = data.position;
                        const playing = data.playing;
                        const playbackRate = data.playback_rate || 1.0;

                        const curr = getCurrentVideo();
                        // ONLY sync to heartbeat if clock calibration has completed or has run at least once before
                        if (curr && curr.src && playing && !isTransitioning && (isCalibrated || hasCalibratedOnce)) {
                            // [OPT] network_advance compensation:
                            // Server mengirim estimasi half-RTT (detik). Ditambahkan ke targetPos
                            // agar video sedikit "proaktif" — mengkompensasi latency:
                            // Go → OS network stack → Electron IPC → JS event loop (≈15–50ms)
                            // Hasilnya: video tidak tertinggal dari timeline server di output display.
                            const networkAdvance = data.network_advance || 0;
                            const elapsed = (getServerTimeNow() - serverTime) / 1000;
                            const targetPos = position + elapsed * playbackRate + networkAdvance;
                            scheduleSync(targetPos, { force: false, playbackRate: playbackRate });
                        }
                    }

                    if (action === "update_bg_config") {
                        if (payload.transition !== undefined) {
                            crossfadeTime = Math.max(0, payload.transition * 1000);
                            updateCssTransition(crossfadeTime);
                        }
                        if (payload.fit) {
                            v1.style.objectFit = payload.fit;
                            v2.style.objectFit = payload.fit;
                        }
                    }

                    if (action === "update_background") {
                        setBackground(payload);

                        let mediaId = payload.media_id;
                        if (!mediaId && payload.url) {
                            const match = payload.url.match(/\/api\/stream_video\/([^/?#]+)/);
                            if (match) mediaId = match[1];
                        }
                        if (mediaId && payload.url) {
                            checkAndPreloadCache(payload.url, mediaId);
                        }
                    }

                    if (action === "bg_control" && payload.target === "video") {
                        const currVid = getCurrentVideo();
                        const cmd = payload.command;

                        if (cmd === "play") {
                            currVid.play().catch(() => { });

                        } else if (cmd === "pause") {
                            currVid.pause();
                            if (currVid.playbackRate !== 1.0) currVid.playbackRate = 1.0;

                        } else if (cmd === "replay") {
                            const expectedUrl = payload.url ? normalizeUrl(payload.url) : "";
                            const currentUrl = normalizeUrl(currVid.currentSrc || currVid.src);
                            if (!expectedUrl || currentUrl === expectedUrl) {
                                currVid.currentTime = 0;
                                currVid.play().catch(() => { });
                            }

                        } else if (cmd === "loop") {
                            currVid.loop = (payload.value === "loop" || payload.value === true);

                        } else if (cmd === "volume") {
                            applyVolumeState(currVid);

                        } else if (cmd === "mute") {
                            applyVolumeState(currVid);

                        } else if (cmd === "sync_time") {
                            // [OPT] preservesPitch = false saat rate adjustment:
                            // Mencegah pitch shift audio saat playbackRate berubah via sync.
                            // Sebelumnya hanya dipasang di nextVid saat transisi —
                            // currVid tidak di-set sehingga bisa ada pitch artifact.
                            const currVidSync = getCurrentVideo();
                            if (currVidSync && 'preservesPitch' in currVidSync) {
                                currVidSync.preservesPitch = false;
                            }
                            scheduleSync(payload.value, { force: payload.force === true, playbackRate: payload.playback_rate });

                        } else if (cmd === "update_behavior") {
                            currVid.dataset.behavior = payload.value;
                            currVid.loop = (payload.value === "loop" || payload.value === undefined);
                        }
                    }
                } catch (e) {
                    console.error("Gagal parsing data WS", e);
                }
            };

            ws.onerror = (err) => {
                console.error("WebSocket error:", err);
            };

            ws.onclose = () => {
                console.warn("WebSocket terputus, menjadwalkan reconnect...");
                scheduleReconnect();
            };
        }

        // [RC-3] Exponential backoff + jitter — cegah connection storm saat banyak klien reconnect
        function scheduleReconnect() {
            if (reconnectTimer) return;
            // delay = min(15s, 1s * 1.5^attempt) + random jitter 0–500ms
            const baseDelay = Math.min(15000, 1000 * Math.pow(1.5, reconnectAttempt));
            const jitter = Math.random() * 500;
            const delay = baseDelay + jitter;
            reconnectAttempt = Math.min(reconnectAttempt + 1, 8); // cap attempts
            console.log(`[BG] Reconnect attempt ${reconnectAttempt} dalam ${Math.round(delay)}ms...`);
            reconnectTimer = setTimeout(() => {
                reconnectTimer = null;
                connectWebSocket();
            }, delay);
        }

        function reconnectWebSocket() {
            if (ws) {
                try { ws.close(); } catch (_) { }
                ws = null;
            }
            connectWebSocket();
        }

        /* ========== CACHE PRELOAD & REPORTING ========== */
        let preloadCacheTimer = null;

        // [RC-5] Cache preload fully routed via SW — tidak ada caches.open() dari page
        // SW adalah satu-satunya penulis cache → tidak ada lock contention
        function checkAndPreloadCache(url, mediaId) {
            if (!url || !mediaId) return;

            // Cek apakah SW sudah melaporkan status caching untuk video ini
            const swStatus = swCacheStatusMap.get(mediaId);
            if (swStatus === 'downloading' || swStatus === 'ready') {
                // SW sedang download atau sudah selesai — tidak perlu trigger preload lagi
                console.log(`[Cache] Video ${mediaId} sudah ${swStatus} via SW, skip preload.`);
                return;
            }

            if (preloadCacheTimer) clearTimeout(preloadCacheTimer);

            const cleanUrl = window.location.protocol + "//" + window.location.hostname + `:18899/api/stream_video/${mediaId}`;

            // [OPT] Jadwalkan preload dengan delay adaptif berdasarkan tier:
            // - low (HDD/4GB RAM): 10s — beri waktu lebih panjang agar video aktif buffer penuh
            //   di HDD 5400rpm sebelum preload bersaing untuk I/O bandwidth
            // - mid: 5s — cukup untuk SSD entry-level atau HDD cepat
            // - high: 3s — SSD NVMe / RAM besar, I/O tidak jadi bottleneck
            const preloadDelay = window._bgDeviceTier === "low" ? 10000 : (window._bgDeviceTier === "mid" ? 5000 : 3000);
            preloadCacheTimer = setTimeout(() => {
                preloadCacheTimer = null;

                // Skip preload pada low-end jika video sedang playing — hindari I/O contention
                if (window._bgDeviceTier === "low") {
                    const curr = getCurrentVideo();
                    if (curr && !curr.paused && curr.readyState >= 3) {
                        console.log("[Cache] Low-end device, skipping preload while video is playing.");
                        return;
                    }
                }

                // Re-check setelah delay (SW mungkin sudah mulai download)
                const statusNow = swCacheStatusMap.get(mediaId);
                if (statusNow === 'downloading' || statusNow === 'ready') {
                    console.log(`[Cache] Video ${mediaId} sudah ${statusNow} saat preload timer fired.`);
                    return;
                }

                // Fetch dengan priority 'low' agar tidak bersaign dengan video yang sedang play
                // SW akan intercept, cek cache, dan tee() jika belum ada
                fetch(cleanUrl, { priority: 'low' }).catch(() => {
                    // Abaikan network errors saat preload — tidak kritis
                });
            }, preloadDelay);
        }

        function reportCacheStatus(mediaId, status) {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    action: "cache_status",
                    payload: {
                        video_id: mediaId,
                        status: status
                    }
                }));
            }
        }

        /* ========== INIT ========== */
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('[SW] ServiceWorker registered with scope:', reg.scope))
                .catch(err => console.error('[SW] ServiceWorker registration failed:', err));

            // Dengarkan pesan dari Service Worker (cache_status events)
            navigator.serviceWorker.addEventListener('message', (event) => {
                const msg = event.data;
                if (msg && msg.type === 'cache_status' && msg.mediaId) {
                    swCacheStatusMap.set(msg.mediaId, msg.status);
                    if (msg.status === 'ready') {
                        console.log(`[SW→Page] Video ${msg.mediaId} sudah ter-cache.`);
                        reportCacheStatus(msg.mediaId, 'ready');
                    }
                }
            });
        }

        initializeVideoElement(v1);
        initializeVideoElement(v2);
        updateCssTransition(crossfadeTime);
        connectWebSocket();

        /* ========== PLAYBACK WATCHDOG ========== */
        let lastCheckedTime = -1;
        let lastCheckedPos = -1;
        let stuckDuration = 0;

        function recoverStuckVideo(video, pos) {
            console.warn(`[Watchdog] Attempting playback recovery at pos: ${pos}`);
            
            // 1. Soft recovery: try play() first
            video.play().then(() => {
                console.log("[Watchdog] Soft recovery succeeded. Playback resumed.");
            }).catch(e => {
                console.warn("[Watchdog] Soft recovery failed, initiating hard recovery:", e);
                
                // 2. Hard recovery: reset src and reload
                const currentUrl = video.src;
                video.src = "";
                video.load();
                
                // Re-apply and reload
                video.src = currentUrl;
                video.load();
                
                const onCanPlay = () => {
                    try {
                        video.currentTime = pos;
                    } catch (_) {}
                    video.play().then(() => {
                        console.log("[Watchdog] Hard recovery succeeded. Resumed at:", pos);
                    }).catch(playErr => {
                        console.error("[Watchdog] Hard recovery play failed:", playErr);
                        forceMuted(video);
                        video.play().catch(mErr => console.error("[Watchdog] Muted hard recovery also failed:", mErr));
                    });
                };
                
                video.addEventListener("canplay", onCanPlay, { once: true });
            });
        }

        setInterval(() => {
            if (isTransitioning) {
                stuckDuration = 0;
                lastCheckedTime = -1;
                lastCheckedPos = -1;
                return;
            }

            const curr = getCurrentVideo();
            if (!curr || !curr.src || curr.paused || curr.ended) {
                stuckDuration = 0;
                lastCheckedTime = -1;
                lastCheckedPos = -1;
                return;
            }

            const now = performance.now();
            const pos = curr.currentTime;

            if (lastCheckedTime > 0) {
                if (Math.abs(pos - lastCheckedPos) < 0.001) {
                    stuckDuration += (now - lastCheckedTime) / 1000;
                } else {
                    stuckDuration = 0;
                }
            }

            lastCheckedTime = now;
            lastCheckedPos = pos;

            if (stuckDuration >= 3.5) {
                const stuckTime = pos;
                console.warn(`[Watchdog] Video stuck at position ${stuckTime.toFixed(3)}s for ${stuckDuration.toFixed(1)}s. Recovering...`);
                stuckDuration = 0;
                recoverStuckVideo(curr, stuckTime);
            }
        }, WATCHDOG_INTERVAL_MS);

        /* ========== EVENT LISTENERS GLOBAL ========== */

        // Visibilitychange: jaga mute & reconnect saat tab kembali aktif
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                forceMuted(v1);
                forceMuted(v2);
                // Hanya lakukan reconnect jika koneksi WebSocket benar-benar terputus/tutup
                if (!ws || (ws.readyState !== WebSocket.OPEN && ws.readyState !== WebSocket.CONNECTING)) {
                    console.log("[BG] WebSocket disconnected on visibility change, reconnecting...");
                    reconnectWebSocket();
                } else {
                    // Jika koneksi sudah/masih aktif, cukup rekonstruksi timeline untuk sinkronisasi ulang
                    reconstructTimeline();
                }
            }
        });

        // BroadcastChannel: terima update snapshot dari halaman lain
        // (sudah di-handle di inisialisasi bc.onmessage di atas)

        // Cleanup saat halaman ditutup
        window.addEventListener("beforeunload", () => {
            if (ws) { try { ws.close(); } catch (_) { } }
            if (bc) { try { bc.close(); } catch (_) { } }
            if (wsKeepaliveInterval) clearInterval(wsKeepaliveInterval);
            if (wsKeepaliveWorker) { try { wsKeepaliveWorker.terminate(); } catch (_) {} }
            clearTimers();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        });

        /*
         * Fallback polling — 20 detik.
         * Hanya sebagai jaring pengaman jika BroadcastChannel tidak terpicu.
         * Tidak berjalan saat sedang transisi atau tab tidak visible.
         */
        setInterval(() => {
            if (!isTransitioning && document.visibilityState === "visible") {
                reconstructTimeline();
            }
        }, FALLBACK_POLL_MS);
