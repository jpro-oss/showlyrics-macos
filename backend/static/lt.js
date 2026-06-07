let globalSubColor = "#ffc107";
        let globalSubSize = 0.6;

        // Ambil warna terjemahan pas proyektor pertama nyala
        fetch('/api/global_sub_settings')
            .then(res => res.json())
            .then(data => {
                if (data.color) globalSubColor = data.color;
                if (data.size) globalSubSize = data.size;
            }).catch(e => console.log("Gagal load global sub settings"));

        const container = document.getElementById("lt-container");
        const textEl = document.getElementById("lt-text");
        const fontLink = document.getElementById("lt-font-link");

        // ========================================================
        // --- SECURITY: HTML SANITIZER (ANTI-XSS) ---
        // ========================================================
        function sanitizeHTML(str) {
            if (!str) return "";
            // Cukup halangi tag kurung siku (< dan >) aja.
            // Biarkan tanda petik ('), kutip ("), dan dan (&) tampil normal.
            return str.replace(/[<>]/g, function (tag) {
                const charsToReplace = { '<': '&lt;', '>': '&gt;' };
                return charsToReplace[tag] || tag;
            });
        }

        // --- MAGIC ENGINE BUAT LOWER THIRD ---
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
        // --- AUTO-RECONNECT WEBSOCKET ENGINE ---
        // ==========================================
        let ws;
        let reconnectTimer;
        let isWebSocketConnected = false;      // Track real-time connection status


        /**
         * 🧹 Bersihkan watermark dari DOM & timer
         */


        function updateLayers(layers) {
            if (!layers) return;
            const layerMap = {
                'camera': 'audience-cam-iframe',
                'background': 'frame-video',
                'photo': 'frame-photo',
                'ppt': 'frame-presentation',
                'lyrics': 'lt-container',
                'scripture': 'scripture-lt-frame'
            };

            layers.forEach((layer, index) => {
                const elId = layerMap[layer.id];
                const el = document.getElementById(elId);
                if (el) {
                    // Z-index: Top of list = Highest Z-Index
                    el.style.zIndex = layers.length - index;
                    if (layer.visible === false) {
                        el.style.display = 'none';
                    } else {
                        if (el.tagName === 'IFRAME') el.style.display = 'block';
                        else el.style.display = 'block';
                    }
                }
            });
        }

        function connectWebSocket() {
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

                // 🎯 TANGKAP LAYER CONFIG (Dynamic Z-Index)
                if (data.type === "update_layers") {
                    if (data.layers_lt) {
                        updateLayers(data.layers_lt);
                    } else if (data.target === 'lt' && data.layers) {
                        updateLayers(data.layers);
                    }
                }

                // 1. TERIMA TEKS
                if (data.type === "update_state") {
                    const s = data.state;

                    // Update memori warna kalo slider digeser
                    if (s.sub_color) globalSubColor = s.sub_color;
                    if (s.sub_size) globalSubSize = s.sub_size;

                    if (s.show) {
                        textEl.innerHTML = processBilingual(s.text || "");
                        container.classList.add("lt-active");
                    } else {
                        container.classList.remove("lt-active");
                    }
                }

                // 2. TERIMA CONFIG (Preset)
                if (data.type === "update_lt_config") {
                    const c = data.config;

                    // Update Posisi
                    container.style.top = "auto"; container.style.bottom = "auto"; container.style.transform = "none";
                    if (c.position === 'bottom') container.style.bottom = c.margin_y + "px";
                    else if (c.position === 'top') container.style.top = c.margin_y + "px";
                    else if (c.position === 'center') {
                        container.style.top = "50%";
                        container.style.transform = `translateY(calc(-50% + ${c.margin_y}px))`;
                    }

                    // Update Style (Font, Color, Shadow & Stroke)
                    textEl.style.fontSize = c.size + "px";
                    textEl.style.color = c.color;

                    // Shadow
                    const strokeSize = c.stroke_size !== undefined ? parseInt(c.stroke_size) : 0;
                    const strokeColor = c.stroke_color || '#000000';
                    const shadowBlur = c.shadow_blur !== undefined ? parseInt(c.shadow_blur) : 0;

                    let shadowLayers = [];

                    if (strokeSize > 0) {
                        const step = strokeSize > 5 ? 10 : 20;
                        for (let angle = 0; angle < 360; angle += step) {
                            const rad = angle * Math.PI / 180;
                            const x = (Math.cos(rad) * strokeSize).toFixed(1);
                            const y = (Math.sin(rad) * strokeSize).toFixed(1);
                            shadowLayers.push(`${x}px ${y}px 0px ${strokeColor}`);
                        }
                    }

                    shadowLayers.push(`${c.shadow_x}px ${c.shadow_y}px ${shadowBlur}px ${c.shadow_color}`);

                    textEl.style.textShadow = shadowLayers.join(', ');
                    textEl.style.webkitTextStroke = "0px transparent"; // Matikan stroke duri bawaan

                    // Update Font Dinamis
                    if (c.font) {
                        let fontName = c.font;
                        if (fontName !== 'custom' && !fontName.includes('sans-serif')) {
                            fontLink.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@400;700;900&display=swap`;
                        }
                        if (fontName === 'custom') fontName = 'sans-serif';
                        textEl.style.fontFamily = fontName;
                    }
                }
                if (data.type === "alert") {
                    const d = data.data;
                    const alertBox = document.getElementById("alert-crawl");
                    const crawlTxt = document.getElementById("crawl-text");

                    // Pastikan targetnya sesuai! (Kalo di lowerthird ganti jadi 'lt', kalo di display ganti jadi 'main')
                    if (d.targets && d.targets.includes('lt') && d.show && d.text) {
                        crawlTxt.innerText = d.text;
                        alertBox.style.backgroundColor = d.color;
                        alertBox.style.fontSize = (d.size || 40) + "px";
                        alertBox.style.top = (d.position === 'top') ? '0' : 'auto';
                        alertBox.style.bottom = (d.position === 'bottom') ? '0' : 'auto';

                        // Tampilkan dulu biar bisa diukur
                        alertBox.style.display = "block";

                        // ========================================================
                        // --- SMART VELOCITY MATH (ANTI NGEBUT) ---
                        // ========================================================
                        crawlTxt.style.animation = 'none'; // Matikan animasi

                        // Hapus padding siluman sementara buat ngukur murni teksnya
                        crawlTxt.style.paddingLeft = "0px";
                        const textWidth = crawlTxt.scrollWidth;
                        const screenWidth = window.innerWidth;

                        // Balikin paddingnya buat animasi
                        crawlTxt.style.paddingLeft = "100%";
                        void crawlTxt.offsetWidth; // Paksa browser reflow

                        const baseSpeed = d.speed || 15;
                        // Rumus: (Jarak Tempuh Total / Lebar Layar) * Kecepatan Dasar
                        const calculatedDuration = ((screenWidth + textWidth) / screenWidth) * baseSpeed;

                        // Tembak animasi dengan durasi baru
                        crawlTxt.style.animation = `crawl ${calculatedDuration}s linear infinite`;
                        // ========================================================

                    } else {
                        alertBox.style.display = "none";
                    }
                }

            };

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
            // ==========================================
        }
        // Jalankan koneksi pertama kali saat layar dibuka
        connectWebSocket();