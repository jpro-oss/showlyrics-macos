
// ============================================================
// SECURITY: Protect canvas getContext dari prototype override.
// Harus dijalankan SEBELUM IIFE watermark agar tidak bisa
// dikosongkan dengan: HTMLCanvasElement.prototype.getContext = ...
// ============================================================
(function () {
    'use strict';
    try {
        var _origGetCtx = HTMLCanvasElement.prototype.getContext;
        Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
            value: _origGetCtx,
            writable: false,
            configurable: false,
            enumerable: false
        });
    } catch (e) { /* already locked or old browser */ }
})();

(function (global) {
    'use strict';

    var _active = false;
    var _confirmed = false;
    var _graceExpired = false;
    var _graceTimer = null;
    var _nonce = null;
    var _lastSeq = 0;          // Anti-replay: sequence terakhir yang diterima
    var _lastHandleMs = 0;     // Rate-limit: timestamp terakhir license msg diproses
    var _canvas = null;
    var _observer = null;
    var _pulseTimer = null;
    var _CSS_ID = '__weshield__';
    var _ATTR = 'data-weshield';
    var _logo = null;
    var _logoReady = false;
    var GRACE_FIRST_MS = 3000;
    var GRACE_RECONNECT_MS = 10000;
    var LICENSE_MSG_RATELIMIT_MS = 800;  // Throttle license msg: max 1 per 800ms


    var _img = new Image();
    _img.onload = function () { _logoReady = true; _logo = _img; if (_active) _renderCanvas(); };
    _img.onerror = function () { _logoReady = false; };
    _img.src = '/static/logo.png';

    function _injectCSS() {
        var el = document.getElementById(_CSS_ID);
        if (!el) {
            el = document.createElement('style');
            el.id = _CSS_ID;
            document.head.appendChild(el);
        }
        el.textContent =
            'canvas[' + _ATTR + ']{' +
            'position:fixed!important;' +
            'top:0!important;left:0!important;' +
            'width:100vw!important;height:100vh!important;' +
            'z-index:2147483647!important;' +
            'pointer-events:none!important;' +
            'opacity:1!important;' +
            'display:block!important;' +
            'visibility:visible!important;' +
            'transform:none!important;' +
            'filter:none!important;' +
            'clip-path:none!important;' +
            'mix-blend-mode:normal!important;' +
            '}';
    }
    function _createCanvas() {
        var old = document.querySelector('canvas[' + _ATTR + ']');
        if (old) old.remove();

        _canvas = document.createElement('canvas');
        _canvas.setAttribute(_ATTR, '1');
        _canvas.setAttribute('aria-hidden', 'true');

        _injectCSS();
        document.body.appendChild(_canvas);
        _renderCanvas();
    }

    function _renderCanvas() {
        if (!_canvas || !_active) return;

        var w = _canvas.width = window.innerWidth;
        var h = _canvas.height = window.innerHeight;

        var ctx = _canvas.getContext('2d');
        ctx.clearRect(0, 0, w, h);

        if (_logoReady && _logo) {
            var sz = Math.round(w * 0.14);
            var gx = sz + 90, gy = sz + 70;
            ctx.globalAlpha = 0.13;
            for (var x = 0; x < w + sz; x += gx) {
                for (var y = 0; y < h + sz; y += gy) {
                    ctx.drawImage(_logo, x, y, sz, sz);
                }
            }
        }

        ctx.save();
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-Math.PI / 7);
        ctx.globalAlpha = 0.10;
        ctx.fillStyle = '#ffffff';
        var fs = Math.max(14, Math.round(w * 0.016));
        ctx.font = 'bold ' + fs + 'px Arial,sans-serif';
        ctx.textAlign = 'center';
        var rx = 440, ry = 110;
        for (var tx = -w * 1.6; tx < w * 1.6; tx += rx) {
            for (var ty = -h * 1.6; ty < h * 1.6; ty += ry) {
                ctx.fillText('UNLICENSED  \u25CF  ShowLyrics', tx, ty);
            }
        }
        ctx.restore();

        var gr = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.85);
        gr.addColorStop(0, 'rgba(0,0,0,0)');
        gr.addColorStop(1, 'rgba(0,0,0,0.18)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, w, h);
    }

    function _startObserver() {
        if (_observer) { _observer.disconnect(); _observer = null; }

        _observer = new MutationObserver(function (mutations) {
            if (!_active) return;
            var dirty = false;

            for (var i = 0; i < mutations.length; i++) {
                var m = mutations[i];
                if (m.type === 'childList') {
                    for (var j = 0; j < m.removedNodes.length; j++) {
                        if (m.removedNodes[j] === _canvas) { dirty = true; break; }
                    }
                    if (m.target === document.head) {
                        for (var k = 0; k < m.removedNodes.length; k++) {
                            if (m.removedNodes[k].id === _CSS_ID) { dirty = true; break; }
                        }
                    }
                }
                if (m.type === 'attributes' && m.target === _canvas) {
                    dirty = true;
                }
            }

            if (dirty) {
                requestAnimationFrame(function () {
                    _injectCSS();
                    if (!_canvas || !document.body.contains(_canvas)) {
                        _createCanvas();
                    } else {
                        _canvas.setAttribute(_ATTR, '1');
                        _renderCanvas();
                    }
                });
            }
        });

        _observer.observe(document.documentElement, {
            childList: true, subtree: true, attributes: true,
            attributeFilter: ['style', 'class', 'hidden', _ATTR]
        });
    }

    function _startPulse() {
        if (_pulseTimer) clearInterval(_pulseTimer);
        _pulseTimer = setInterval(function () {
            if (!_active) return;
            if (!document.getElementById(_CSS_ID)) { _injectCSS(); }
            if (!_canvas || !document.body.contains(_canvas)) {
                _createCanvas();
            } else {
                _canvas.setAttribute(_ATTR, '1');
                // CSS Opacity Hardening: Reset inline style jika di-override paksa
                // (misal via DevTools, CSS injection, atau script attack)
                var cs = window.getComputedStyle(_canvas);
                if (parseFloat(cs.opacity) < 0.05 || cs.display === 'none' || cs.visibility === 'hidden') {
                    _canvas.style.cssText = '';  // Clear semua inline style override
                    _injectCSS();               // Re-inject CSS !important rules
                }
            }
        }, 1000);
    }


    function _cancelGrace() {
        if (_graceTimer) { clearTimeout(_graceTimer); _graceTimer = null; }
        _graceExpired = true;
    }

    function _startGrace(isReconnect) {
        _cancelGrace();
        _graceExpired = false;

        var delay = isReconnect ? GRACE_RECONNECT_MS : GRACE_FIRST_MS;

        _graceTimer = setTimeout(function () {
            _graceExpired = true;
            _graceTimer = null;
            // Waktu habis tanpa konfirmasi valid → aktifkan watermark
            if (!_confirmed) {
                _activate();
            }
        }, delay);
    }

    // =========================================================================
    // NONCE + SEQUENCE VERIFICATION
    // =========================================================================
    function _verifyNonce(msg) {
        if (!msg || typeof msg !== 'object') return false;

        var isLicenseMsg = (msg.action === 'license_status' || msg.action === 'force_watermark');

        if (_nonce === null) {
            if (msg._nonce && typeof msg._nonce === 'string' && msg._nonce.length >= 32) {
                _nonce = msg._nonce;
                // Set baseline sequence dari pesan pertama
                if (typeof msg._seq === 'number') { _lastSeq = msg._seq; }
                return true;
            }
            if (isLicenseMsg) return false;
            return true;
        }

        if (isLicenseMsg) {
            // 1. Nonce harus cocok
            if (msg._nonce !== _nonce) return false;

            // 2. Sequence harus selalu naik — cegah replay attack
            if (typeof msg._seq === 'number') {
                if (msg._seq <= _lastSeq) {
                    // Sequence sama atau mundur = pesan lama yang di-replay
                    return false;
                }
                _lastSeq = msg._seq;
            }
            return true;
        }

        return true;
    }

    // =========================================================================
    // ACTIVATE / DEACTIVATE
    // =========================================================================
    function _activate() {
        _active = true;
        _createCanvas();
        _startObserver();
        _startPulse();
    }

    function _deactivate() {
        _active = false;
        if (_observer) { _observer.disconnect(); _observer = null; }
        if (_pulseTimer) { clearInterval(_pulseTimer); _pulseTimer = null; }
        if (_canvas && document.body.contains(_canvas)) { _canvas.remove(); }
        _canvas = null;
        var cssEl = document.getElementById(_CSS_ID);
        if (cssEl) cssEl.remove();
    }

    var Shield = {

        onConnect: function () {
            _nonce = null;
            _lastSeq = 0;       // Reset sequence — server baru punya counter baru mulai dari 0
            _lastHandleMs = 0;  // Reset rate-limit agar license_status pertama langsung diproses
            _deactivate();
            var isReconnect = _confirmed;
            _startGrace(isReconnect);
        },


        onDisconnect: function () {
            _nonce = null;

            _cancelGrace();

            if (_confirmed) {
                return;
            }

            _activate();
        },

        /**
         * Dipanggil untuk setiap message WS.
         * Verifikasi nonce + sequence, handle license_status dan force_watermark.
         * Rate-limited untuk pesan license agar tidak bisa di-spam dari console.
         *
         * @param {object} msg - Parsed JSON dari WS
         * @returns {boolean} true jika message sudah di-handle
         */
        handleMessage: function (msg) {
            var isLicenseMsg = (msg && (msg.action === 'license_status' || msg.action === 'force_watermark'));

            // Rate-limit untuk pesan license: max 1 per LICENSE_MSG_RATELIMIT_MS
            // Ini mencegah flood attack dari console (loop panggil handleMessage)
            if (isLicenseMsg) {
                var now = Date.now();
                if (now - _lastHandleMs < LICENSE_MSG_RATELIMIT_MS) {
                    return false;  // Terlalu cepat, abaikan
                }
                _lastHandleMs = now;
            }

            if (!_verifyNonce(msg)) {
                _cancelGrace();
                _confirmed = false;
                _activate();
                return true;
            }

            if (msg.action === 'license_status') {
                if (msg.valid === true) {
                    _confirmed = true;
                    _cancelGrace();
                    _deactivate();
                } else {
                    _confirmed = false;
                    _cancelGrace();
                    _activate();
                }
                return true;
            }

            if (msg.action === 'force_watermark') {
                _confirmed = false;
                _cancelGrace();
                _activate();
                return true;
            }

            return false;
        },

        isActive: function () { return _active; }
    };

    Object.defineProperty(global, '_WEShield', {
        value: Object.freeze(Shield),
        writable: false,
        configurable: false,
        enumerable: false
    });

})(window);
