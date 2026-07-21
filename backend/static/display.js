// === UNIFIED MOTION LOOP HANDOFF ENGINE ===
// === GLOBAL CONSTANTS (konsolidasi untuk performa & maintenance) ===

// Gradient Theme Map - Single source of truth untuk semua gradient themes
const GRADIENT_THEME_MAP = {
    // Original
    'gold': 'linear-gradient(135deg, #f6d365, #fda085)',
    'sunset': 'linear-gradient(135deg, #f093fb, #f5576c)',
    'nature': 'linear-gradient(135deg, #43e97b, #38f9d7)',
    'metal': 'linear-gradient(135deg, #868f96, #596164)',
    'goldleaf': 'linear-gradient(135deg, #f7971e, #ffd200)',
    // New Worship
    'covenant': 'linear-gradient(135deg, #7c3aed 0%, #9f1239 50%, #d97706 100%)',
    // New Praise
    'wildfire': 'linear-gradient(180deg, #fff 0%, #ffdb4a 20%, #ff8c00 55%, #ff2200 80%, #8b0000 100%)',
    'celebration': 'linear-gradient(90deg, #ff0080, #ff6600, #ffdd00, #00ff88, #00d4ff, #8000ff)',
    // New Creative Art
    'duotone': 'linear-gradient(135deg, #ff6b35 0%, #f7b267 40%, #c71585 65%, #4b0082 100%)',
    'aurora-art': 'linear-gradient(90deg, #00ff88, #00e5ff, #8000ff, #ff0088, #ff8800, #00ff88)',
    'solarpunk': 'linear-gradient(135deg, #22c55e, #84cc16, #eab308, #f59e0b)',
    'neo-prism': 'linear-gradient(110deg, #ffffff 0%, #8ff7ff 22%, #ff7ad9 50%, #ffe66d 76%, #ffffff 100%)',
    'liquid-gold-box': 'linear-gradient(135deg, #fff7bd 0%, #f7c948 38%, #b7791f 72%, #fff0a3 100%)',
    'aurora-glass-box': 'linear-gradient(120deg, #dffcff 0%, #8dd8ff 35%, #d0a2ff 70%, #ffffff 100%)',
    'modern-kinetic': 'linear-gradient(90deg, #ffffff 0%, #00e5ff 40%, #ff2d75 68%, #ffffff 100%)',
};

// Fixed Themes Set - O(1) lookup performance
const FIXED_THEMES = new Set([
    // Original fixed themes
    'gold', 'sunset', 'retro', 'hologram', 'nature', 'metal',
    'comic', 'arcade', 'firework', 'spirit', 'rainbow', 'goldleaf', 'blueprint',
    // New Worship (gradient)
    'covenant',
    // New Praise (gradient)
    'wildfire', 'celebration',
    // New Creative Art (gradient)
    'duotone', 'aurora-art', 'solarpunk',
    // Advanced scenic/text-box presets
    'cloud-halo', 'cinematic-caption', 'calligraphy-gold', 'neo-prism', 'liquid-gold-box',
    'aurora-glass-box', 'ink-sermon', 'velvet-marquee', 'modern-kinetic', 'sacred-parchment',
    // Deep effect themes
    'chromatic', 'veil-lift',
]);

// Text-only motion loops (animate .lyric-text directly)
const TEXT_ONLY_LOOPS = new Set([
    'breathe', 'float-slow', 'pulse-glow', 'shimmer', 'levitate', 'handheld', 'hypnotic', 'sonar', 'glitch-rgb', 'vertigo',
    'lazy', 'jingle', 'grunge', 'strobe', 'pulse-neon', 'earthquake'
]);

// Wrapper motion loops (animate .lyric-wrapper)
const WRAPPER_LOOPS = new Set([]);

// FX classification sets for performance
const WORD_FX = new Set(['fx-bloom', 'fx-smoke', 'fx-light', 'fx-softfocus', 'fx-float', 'fx-dust', 'fx-lens', 'fx-wipe', 'fx-abyss', 'fx-aurora']);
const DEEP_WORD_FX = new Set(['fx-smoke-deep', 'fx-liquid', 'fx-zoom-deep', 'fx-glitch-deep', 'fx-fisheye', 'fx-radial-blur', 'fx-chromatic', 'fx-motion-blur', 'fx-veil-lift', 'fx-particle']);
const CENTER_WORD_FX = new Set(['fx-holy-breathe', 'fx-sanctify', 'fx-ascend', 'fx-mist-form', 'fx-rapture']);
const CHAR_FX = new Set(['fx-stagger', 'fx-spin', 'fx-wave', 'fx-gauss', 'fx-glitch', 'fx-punch', 'fx-elastic', 'fx-flashpop', 'fx-whip', 'fx-gdrop', 'fx-rgb', 'fx-shake', 'fx-smash', 'fx-slash', 'fx-terminal', 'fx-voltage', 'fx-riot']);
const REVERSE_CHAR_FX = new Set(['fx-shockwave', 'fx-overdrive', 'fx-nuke']);
const PRAISE_RANDOM_LETTER_FX = new Set([
    'fx-praise-letter-zoom-spark', 'fx-praise-letter-strobe-pop', 'fx-praise-letter-prism-snap',
    'fx-praise-letter-whip-grid', 'fx-praise-letter-flash-cut', 'fx-praise-letter-orbit-hit',
    'fx-praise-letter-bass-drop', 'fx-praise-letter-chroma-burst', 'fx-praise-letter-tile-shatter',
    'fx-praise-letter-speed-ramp'
]);
const WORSHIP_RANDOM_LETTER_FX = new Set([
    'fx-worship-letter-candle-rise', 'fx-worship-letter-mist-bloom', 'fx-worship-letter-lens-prayer',
    'fx-worship-letter-silk-drift', 'fx-worship-letter-soft-iris', 'fx-worship-letter-cloud-form',
    'fx-worship-letter-golden-hour', 'fx-worship-letter-deep-focus', 'fx-worship-letter-veil-cascade',
    'fx-worship-letter-cinematic-breathe'
]);
const RANDOM_LETTER_FX = new Set([...PRAISE_RANDOM_LETTER_FX, ...WORSHIP_RANDOM_LETTER_FX]);

// === THEME TEXT-SHADOW CACHE ===
// Avoids getComputedStyle() forced reflow in the WebSocket hot path.
// Populated lazily: first access per theme class measures once via off-screen probe, then cached.
const THEME_SHADOW_CACHE = new Map();
function getThemeTextShadow(themeClass) {
    if (THEME_SHADOW_CACHE.has(themeClass)) return THEME_SHADOW_CACHE.get(themeClass);
    const probe = document.createElement('div');
    probe.className = 'lyric-text ' + themeClass;
    probe.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none;font-size:16px;white-space:nowrap;';
    document.body.appendChild(probe);
    const shadow = getComputedStyle(probe).textShadow;
    document.body.removeChild(probe);
    const result = (!shadow || shadow === 'none') ? '' : shadow;
    THEME_SHADOW_CACHE.set(themeClass, result);
    return result;
}

// === UNIFIED MOTION LOOP HANDOFF ENGINE ===
// Motion loop play-state CSS is now in display.css (zero-delay, no runtime injection needed)

let handoffTimer = null;
let transitionTimer = null;
let transitionAnimEndWrapper = null;
let transitionAnimEndTxt = null; // Tracks nextTxt listener so cancelPendingHandoffs can clean it up
let transitionAnimEndHandler = null;
let transitionGeneration = 0;
let activeHandoffCleanup = null;
let outgoingLayer = null;
let outgoingTimer = null;
let outgoingTransitionEndHandler = null;

// Returns the starting CSS scale for a zoom mode, matching CSS keyframe 0%
function getZoomStartScale(zoomMode) {
    if (zoomMode === 'in')  return 0.78;   // matches moveZoomIn  0% { transform: scale(0.78) }
    if (zoomMode === 'out') return 1.14;   // matches moveZoomOut 0% { transform: scale(1.14) }
    return 1.0;                             // stay: no scale change
}

function getHandoffDurationMs() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue('--loop-handoff-ms').trim();
    if (raw.endsWith('ms')) return parseFloat(raw) || 800;
    if (raw.endsWith('s')) return (parseFloat(raw) || 0.8) * 1000;
    return 800;
}

function getLoopHandoffTargets(layer, wrapper, txt, motionLoop) {
    if (!motionLoop || motionLoop === 'none') return [];
    if (motionLoop === 'cyber-glitch') return txt ? [txt] : [];
    if (motionLoop.startsWith('worship-line-') || motionLoop.startsWith('praise-line-')) {
        return wrapper ? [wrapper] : [];
    }
    if (motionLoop.startsWith('worship-word-') || motionLoop.startsWith('praise-word-')) {
        if (!txt) return [];
        const words = txt.querySelectorAll('.word');
        return words.length ? Array.from(words) : [txt];
    }
    // Gunakan global constants untuk performa O(1) lookup
    if (TEXT_ONLY_LOOPS.has(motionLoop)) return txt ? [txt] : [];
    if (WRAPPER_LOOPS.has(motionLoop)) return wrapper ? [wrapper] : (txt ? [txt] : []);
    return txt ? [txt] : (wrapper ? [wrapper] : []);
}

function captureHandoffSnapshot(elements) {
    const snapshots = [];
    elements.forEach(el => {
        if (!el) return;
        const cs = getComputedStyle(el);
        snapshots.push({
            el,
            transform: cs.transform,
            filter: cs.filter,
            opacity: cs.opacity,
            textShadow: cs.textShadow
        });
    });
    return snapshots;
}

function normalizeCssValue(value, fallback) {
    return (!value || value === 'none') ? fallback : value;
}

function buildCenteredStarterSnapshot(snapshots) {
    return snapshots.map(({ el, filter, opacity, textShadow }) => ({
        el,
        transform: 'translate3d(0, 0, 0) scale(1) rotate(0deg) skew(0deg, 0deg)',
        filter: normalizeCssValue(filter, 'none'),
        opacity: opacity || '1',
        textShadow: normalizeCssValue(textShadow, 'none')
    }));
}

function applyHandoffSnapshot(snapshots) {
    snapshots.forEach(({ el, transform, filter, opacity, textShadow }) => {
        el.style.transform = normalizeCssValue(transform, 'none');
        el.style.filter = normalizeCssValue(filter, 'none');
        el.style.opacity = opacity;
        el.style.textShadow = normalizeCssValue(textShadow, 'none');
    });
}

function clearHandoffInline(snapshots) {
    snapshots.forEach(({ el }) => {
        el.style.transform = '';
        el.style.filter = '';
        el.style.opacity = '';
        el.style.textShadow = '';
    });
}

function saveOriginalInlineStyles(elements) {
    elements.forEach(el => {
        if (!el) return;
        if (!el._originalInlineStyles) {
            el._originalInlineStyles = {
                transform: el.style.transform || '',
                filter: el.style.filter || '',
                opacity: el.style.opacity || '',
                textShadow: el.style.textShadow || '',
                transition: el.style.transition || ''
            };
        }
    });
}

function restoreOriginalInlineStyles(elements) {
    elements.forEach(el => {
        if (!el) return;
        if (el._originalInlineStyles) {
            el.style.transform = el._originalInlineStyles.transform;
            el.style.filter = el._originalInlineStyles.filter;
            el.style.opacity = el._originalInlineStyles.opacity;
            el.style.textShadow = el._originalInlineStyles.textShadow;
            el.style.transition = el._originalInlineStyles.transition;
            delete el._originalInlineStyles;
        } else {
            el.style.transform = '';
            el.style.filter = '';
            el.style.opacity = '';
            el.style.textShadow = '';
            el.style.transition = '';
        }
    });
}

function holdLoopAnimations(elements, hold) {
    elements.forEach(el => {
        if (!el) return;
        if (hold) {
            if (el.dataset.loopHandoffAnimation === undefined) {
                el.dataset.loopHandoffAnimation = el.style.animation || '';
            }
            if (el.dataset.loopHandoffTransition === undefined) {
                el.dataset.loopHandoffTransition = el.style.transition || '';
            }
            el.style.animation = 'none';
        } else {
            if (el.dataset.loopHandoffAnimation !== undefined) {
                el.style.animation = el.dataset.loopHandoffAnimation;
                delete el.dataset.loopHandoffAnimation;
            } else {
                el.style.animation = '';
            }
            if (el.dataset.loopHandoffTransition !== undefined) {
                el.style.transition = el.dataset.loopHandoffTransition;
                delete el.dataset.loopHandoffTransition;
            } else {
                el.style.transition = '';
            }
        }
    });
}

function clearLoopHandoffClasses(layer) {
    if (!layer) return;
    layer.classList.remove('loop-init', 'loop-handoff', 'loop-handoff-active', 'loop-settled');
}

function stripFxFromElements(layer, wrapper, txt) {
    [layer, wrapper, txt].forEach(el => {
        if (!el) return;
        const toRemove = [];
        el.classList.forEach(c => {
            if (c.startsWith('fx-')) toRemove.push(c);
        });
        toRemove.forEach(c => el.classList.remove(c));
    });
}

function setCompositingActive(layer, active) {
    if (!layer) return;
    if (active) layer.classList.add('compositing-active');
    else layer.classList.remove('compositing-active');
}

function cancelPendingHandoffs() {
    transitionGeneration++;
    if (activeHandoffCleanup) {
        activeHandoffCleanup();
        activeHandoffCleanup = null;
    }
    if (handoffTimer) {
        clearTimeout(handoffTimer);
        handoffTimer = null;
    }
    if (transitionTimer) {
        clearTimeout(transitionTimer);
        transitionTimer = null;
    }
    if (transitionAnimEndHandler) {
        if (transitionAnimEndWrapper) {
            transitionAnimEndWrapper.removeEventListener('animationend', transitionAnimEndHandler);
        }
        // Fix: also remove from nextTxt to prevent listener accumulation after rapid transitions
        if (transitionAnimEndTxt) {
            transitionAnimEndTxt.removeEventListener('animationend', transitionAnimEndHandler);
        }
        transitionAnimEndHandler = null;
        transitionAnimEndWrapper = null;
        transitionAnimEndTxt = null;
    }
}

function cancelOutgoingLayer() {
    if (outgoingTimer) {
        clearTimeout(outgoingTimer);
        outgoingTimer = null;
    }
    if (outgoingLayer) {
        if (outgoingTransitionEndHandler) {
            outgoingLayer.removeEventListener('transitionend', outgoingTransitionEndHandler);
        }
        outgoingLayer.classList.remove('lyric-exiting');
        outgoingLayer.style.removeProperty('--lyric-exit-ms');
        outgoingLayer = null;
    }
    outgoingTransitionEndHandler = null;
}

function deactivateLyricLayer(layer) {
    if (!layer) return;
    const wrapper = layer.querySelector('.lyric-wrapper');
    const txt = layer.querySelector('.lyric-text');
    clearLoopHandoffClasses(layer);
    layer.classList.remove('loop-ready', 'compositing-active');
    clearFxClasses(layer);
    if (wrapper) clearFxClasses(wrapper);
    if (txt) clearFxClasses(txt);
    if (outgoingLayer === layer && outgoingTransitionEndHandler) {
        layer.removeEventListener('transitionend', outgoingTransitionEndHandler);
        outgoingTransitionEndHandler = null;
    }
    layer.classList.remove('active', 'lyric-exiting');
    layer.style.removeProperty('--lyric-exit-ms');
    layer.classList.add('lyric-dormant');
    resetAnimatedTextParts(layer);
}

function activateLyricLayer(layer) {
    if (!layer) return;
    if (layer === outgoingLayer) cancelOutgoingLayer();
    layer.classList.remove('lyric-dormant', 'lyric-exiting');
    layer.style.removeProperty('--lyric-exit-ms');
}

function beginLayerExit(layer, fadeMs, maxStaggerDelay) {
    if (!layer) return;
    if (layer === outgoingLayer) cancelOutgoingLayer();

    const exitMs = Math.max(220, fadeMs);
    layer.style.setProperty('--lyric-exit-ms', `${exitMs}ms`);

    // Commit the current visible state before switching to the exit state.
    // This keeps the browser from coalescing class changes into an instant hide.
    void layer.offsetWidth;
    layer.classList.add('lyric-exiting');
    layer.classList.remove('active');

    outgoingLayer = layer;
    let completed = false;
    const finishExit = () => {
        if (completed || outgoingLayer !== layer) return;
        completed = true;
        if (outgoingTransitionEndHandler) {
            layer.removeEventListener('transitionend', outgoingTransitionEndHandler);
            outgoingTransitionEndHandler = null;
        }
        if (outgoingTimer) {
            clearTimeout(outgoingTimer);
            outgoingTimer = null;
        }
        deactivateLyricLayer(layer);
        if (outgoingLayer === layer) outgoingLayer = null;
    };

    outgoingTransitionEndHandler = (e) => {
        if (e.target !== layer || e.propertyName !== 'opacity') return;
        finishExit();
    };
    layer.addEventListener('transitionend', outgoingTransitionEndHandler);

    outgoingTimer = setTimeout(() => {
        if (outgoingLayer !== layer) return;
        finishExit();
    }, exitMs + 120);
}

function startMotionLoopHandoff(layer, wrapper, txt, motionLoop, generation) {
    const duration = getHandoffDurationMs();
    clearLoopHandoffClasses(layer);
    layer.classList.remove('loop-ready');

    const targets = getLoopHandoffTargets(layer, wrapper, txt, motionLoop);
    saveOriginalInlineStyles(targets);

    const transitionEndSnapshots = captureHandoffSnapshot(targets);
    const starterSnapshots = buildCenteredStarterSnapshot(transitionEndSnapshots);

    stripFxFromElements(layer, wrapper, txt);
    applyMotionLoop(motionLoop, layer, wrapper, txt);
    const loopStartSnapshots = captureHandoffSnapshot(targets);
    holdLoopAnimations(targets, true);
    layer.classList.add('loop-handoff');
    applyHandoffSnapshot(starterSnapshots);
    setCompositingActive(layer, true);

    activeHandoffCleanup = () => {
        restoreOriginalInlineStyles(targets);
        holdLoopAnimations(targets, false);
        clearLoopHandoffClasses(layer);
        setCompositingActive(layer, false);
        activeHandoffCleanup = null;
    };

    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            if (generation !== transitionGeneration) return;
            layer.classList.add('loop-handoff-active');
            applyHandoffSnapshot(loopStartSnapshots);

            handoffTimer = setTimeout(() => {
                handoffTimer = null;
                if (generation !== transitionGeneration) return;
                layer.classList.add('loop-ready');
                holdLoopAnimations(targets, false);
                layer.classList.remove('loop-handoff', 'loop-handoff-active');
                layer.classList.add('loop-settled');
                restoreOriginalInlineStyles(targets);
                setCompositingActive(layer, false);
                activeHandoffCleanup = null;
            }, duration);
        });
    });
}

function finishTransition(layer, wrapper, nextTxt, gstEl, motionLoop, zoomMode, generation) {
    if (generation !== transitionGeneration) return;

    clearAnimationDelays(nextTxt);
    clearAnimationDelays(gstEl);

    if (motionLoop !== 'none') {
        startMotionLoopHandoff(layer, wrapper, nextTxt, motionLoop, generation);
    } else {
        stripFxFromElements(layer, wrapper, nextTxt);
        setCompositingActive(layer, false);
        if (wrapper) {
            wrapper.style.transform = ''; // Bersihkan sisa inline transform jika ada
        }
    }
}

function calculateStaggerDelayBase(fadeMs, fxClass, textEl) {
    if (!textEl) return 35;

    const isDeepWordFx = DEEP_WORD_FX.has(fxClass);
    const isCenterWordFx = CENTER_WORD_FX.has(fxClass);
    const isWordFx = WORD_FX.has(fxClass);
    const isRandomLetterFx = RANDOM_LETTER_FX.has(fxClass);

    const isWordLevel = isDeepWordFx || isCenterWordFx || isWordFx;

    if (isWordLevel) {
        const wordsCount = textEl.querySelectorAll('.word').length || 1;
        let divisor = 1;
        if (isDeepWordFx) {
            divisor = Math.max(1, wordsCount - 1);
        } else if (isCenterWordFx) {
            divisor = Math.max(1, 2 * Math.floor(wordsCount / 2));
        } else if (isWordFx) {
            divisor = Math.max(1, (wordsCount - 1) * 2);
        }

        let delayBase = (fadeMs * 0.6) / divisor;
        const maxWordDelay = (fadeMs / 1000) * 150;
        const minWordDelay = 30;
        return Math.max(minWordDelay, Math.min(maxWordDelay, delayBase));
    } else {
        let divisor = 1;
        if (isRandomLetterFx) {
            const spread = PRAISE_RANDOM_LETTER_FX.has(fxClass) ? 9 : 14;
            divisor = spread - 1;
        } else {
            const charsCount = textEl.querySelectorAll('.char').length || 1;
            divisor = Math.max(1, charsCount - 1);
        }

        let delayBase = (fadeMs * 0.7) / divisor;
        const maxCharDelay = (fadeMs / 1000) * 80;
        const minCharDelay = 10;
        return Math.max(minCharDelay, Math.min(maxCharDelay, delayBase));
    }
}

function computeMaxStaggerDelay(s, fxClass, motionLoop, textEl, fadeMs) {
    // Gunakan global constants untuk performa O(1) lookup
    const isWordFx = WORD_FX.has(fxClass);
    const isDeepWordFx = DEEP_WORD_FX.has(fxClass);
    const isCenterWordFx = CENTER_WORD_FX.has(fxClass);
    const isReverseCharFx = REVERSE_CHAR_FX.has(fxClass);
    const isCharFx = CHAR_FX.has(fxClass);
    const isRandomLetterFx = RANDOM_LETTER_FX.has(fxClass);
    const isWordMotionLoop = motionLoop !== 'none' && (
        motionLoop.startsWith('worship-word-') || motionLoop.startsWith('praise-word-')
    );
    const useSplitCharFx = isWordMotionLoop || isWordFx || isCharFx || isRandomLetterFx || isDeepWordFx || isCenterWordFx || isReverseCharFx;

    if (!useSplitCharFx || !textEl) return 0;

    const delayBase = calculateStaggerDelayBase(fadeMs, fxClass, textEl);

    if (isDeepWordFx) {
        const wordsCount = textEl.querySelectorAll('.word').length || 1;
        return Math.max(0, wordsCount - 1) * delayBase;
    }
    if (isCenterWordFx) {
        const wordsCount = textEl.querySelectorAll('.word').length || 1;
        return Math.floor(wordsCount / 2) * delayBase * 2;
    }
    if (isReverseCharFx) {
        const charsCount = textEl.querySelectorAll('.char').length || 1;
        return Math.max(0, charsCount - 1) * delayBase;
    }
    if (isRandomLetterFx) {
        const spread = PRAISE_RANDOM_LETTER_FX.has(fxClass) ? 9 : 14;
        return (spread - 1) * delayBase;
    }
    if (isWordFx) {
        const wordsCount = textEl.querySelectorAll('.word').length || 1;
        return Math.max(0, wordsCount - 1) * delayBase * 2;
    }
    const charsCount = textEl.querySelectorAll('.char').length || 1;
    return Math.max(0, charsCount - 1) * delayBase;
}

function getRandomLetterDelay(index, delayBase, fxClass) {
    const spread = PRAISE_RANDOM_LETTER_FX.has(fxClass) ? 9 : 14;
    const lane = ((index * 7) + ((index % 5) * 11) + ((index % 3) * 17)) % spread;
    return lane * delayBase;
}

function scheduleTransitionComplete(layer, wrapper, nextTxt, gstEl, motionLoop, zoomMode, fadeMs, maxStaggerDelay) {
    const generation = transitionGeneration;
    let completed = false;

    const runComplete = () => {
        if (completed || generation !== transitionGeneration) return;
        completed = true;
        if (transitionAnimEndHandler) {
            if (transitionAnimEndWrapper) {
                transitionAnimEndWrapper.removeEventListener('animationend', transitionAnimEndHandler);
            }
            nextTxt.removeEventListener('animationend', transitionAnimEndHandler);
            transitionAnimEndHandler = null;
            transitionAnimEndWrapper = null;
            transitionAnimEndTxt = null;
        }
        if (transitionTimer) {
            clearTimeout(transitionTimer);
            transitionTimer = null;
        }
        finishTransition(layer, wrapper, nextTxt, gstEl, motionLoop, zoomMode, generation);
    };

    // JEDA AMAN: Gunakan waktu presisi ditambah buffer 120ms agar animasi tidak kepotong
    const fallbackMs = fadeMs + maxStaggerDelay + 120;
    transitionTimer = setTimeout(runComplete, fallbackMs);

    transitionAnimEndWrapper = wrapper;
    transitionAnimEndTxt = nextTxt; // Record for cancelPendingHandoffs cleanup
    transitionAnimEndHandler = (e) => {
        // Picu runComplete secara instan ketika animasi pada wrapper atau nextTxt (lyric-text) selesai
        if (e.target === wrapper || e.target === nextTxt) {
            runComplete();
        }
    };

    if (wrapper) {
        wrapper.addEventListener('animationend', transitionAnimEndHandler);
    }
    nextTxt.addEventListener('animationend', transitionAnimEndHandler);
}

let globalSubColor = "#ffc107";
let globalSubSize = 0.6;

fetch('/api/global_sub_settings')
    .then(res => res.json())
    .then(data => {
        if (data.color) globalSubColor = data.color;
        if (data.size) globalSubSize = data.size;
    }).catch(e => console.log("Gagal load global sub settings"));

function updateLayers(layers) {
    if (!layers) return;
    const layerMap = {
        'camera': 'main-cam-iframe',
        'background': 'frame-video',
        'photo': 'frame-photo',
        'ppt': 'frame-presentation',
        'lyrics': 'display-scale-wrapper',
        'scripture': 'scripture-frame'
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
                else if (el.id === 'display-scale-wrapper') el.style.display = 'block';
                else if (el.id === 'scene-container') el.style.display = 'flex';
                else el.style.display = 'block';
            }
        }
    });
}

const scene = document.getElementById("scene-container");
const layerA = document.getElementById("layer-a");
const layerB = document.getElementById("layer-b");
let activeLayer = null;

function injectFont(fontName) {
    if (!fontName) return;
    const linkId = "font-link-" + fontName.replace(/\s+/g, '-').toLowerCase();
    if (document.getElementById(linkId)) return;
    const link = document.createElement('link'); link.id = linkId; link.rel = 'stylesheet'; link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}&display=swap`;
    document.head.appendChild(link);
}

let keepAliveAudio = null;
function startKeepAlive() {
    if (keepAliveAudio) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 1;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    keepAliveAudio = { ctx, osc, gain };
    if (ctx.state === 'suspended') {
        document.body.addEventListener('click', () => { ctx.resume(); }, { once: true });
    }
}
startKeepAlive();

function stopKeepAlive() {
    if (!keepAliveAudio) return;
    const { ctx, osc } = keepAliveAudio;
    try { osc.stop(); } catch (e) { }
    if (ctx && ctx.state !== 'closed') ctx.close().catch(() => { });
    keepAliveAudio = null;
}

function clearFxClasses(element) {
    if (!element) return;
    const classesToRemove = [];
    element.classList.forEach(c => {
        if (c.startsWith('fx-') || c.startsWith('loop-')) classesToRemove.push(c);
    });
    if (classesToRemove.length) element.classList.remove(...classesToRemove);
}

function getAnimatedTextParts(root) {
    return root ? root.querySelectorAll('.word, .char') : [];
}

function clearAnimationDelays(root) {
    getAnimatedTextParts(root).forEach(el => {
        el.style.animationDelay = '';
    });
}

function resetAnimatedTextParts(root) {
    getAnimatedTextParts(root).forEach(el => {
        el.style.animationDelay = '';
        el.style.transform = '';
        el.style.filter = '';
        el.style.opacity = '';
        el.style.textShadow = '';
        el.style.animation = '';
        el.style.transition = '';
        delete el.dataset.loopHandoffAnimation;
        delete el.dataset.loopHandoffTransition;
    });
}

// Helper: apply motion loop to correct element (wrapper for line/block, txt for text-level)
function applyMotionLoop(motionLoop, layer, wrapper, txt) {
    if (motionLoop === 'none') return;
    if (motionLoop === 'cyber-glitch') {
        txt.classList.add('loop-cyber-glitch');
        return;
    }
    // Text-level loops animate .lyric-text words (worship-word-*, praise-word-*)
    // These are applied on the LAYER so CSS selector [.loop-X .lyric-text .word] works
    // Standard pro loops (breathe, float, etc.) animate .lyric-text directly — apply on layer
    // Worship/Praise LINE loops animate .lyric-wrapper — apply on layer (CSS parent selector)
    // These will be held PAUSED until FX IN ends (via .loop-ready class added by JS)

    // All loops: add class to layer (CSS handles proper targeting via descendant selectors)
    layer.classList.add('loop-' + motionLoop);

    // For wrapper loops: they start PAUSED (CSS: animation-play-state: paused by default)
    // The .loop-ready class is added by triggerLoopReady() after FX IN animationend
    // For non-wrapper loops: they are always running (no paused state in CSS)
}

// Called after FX IN animation on wrapper completes — unlocks wrapper motion loops
function triggerLoopReady(layer) {
    // Small RAF delay to ensure smooth transition from FX-end to loop-start
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            layer.classList.add('loop-ready');
        });
    });
}

function enhanceThemeTextShadow(rawShadow, glowVal) {
    if (!rawShadow || rawShadow === 'none') return rawShadow;
    const glowFactor = 1 + glowVal / 40;
    const alphaFactor = 1 + glowVal / 120;
    return rawShadow.split(/\s*,\s*/).map(shadow => {
        const scaled = shadow.replace(/(\d+(?:\.\d+)?)px(?!.*px)/, (match) => {
            const val = parseFloat(match) * glowFactor;
            return `${Math.min(30, Math.max(1, val))}px`;
        });
        return scaled.replace(/(rgba?\([^,]+,[^,]+,[^,]+,\s*)(\d*\.?\d+)(\))/g, (all, prefix, alpha, suffix) => {
            const newAlpha = Math.min(1, parseFloat(alpha) * alphaFactor);
            return `${prefix}${newAlpha}${suffix}`;
        });
    }).join(', ');
}
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

function processBilingual(rawText, splitCharFx = false) {
    if (!rawText) return { html: "", plainText: "", htmlGhost: "" };

    // Data asli disimpan biar logika pendeteksi slide ganda gak error
    let cleanRawText = sanitizeHTML(rawText);
    let plainText = cleanRawText.replace(/\n/g, ' ');
    let safeText = cleanRawText.replace(/-/g, '\u2011');
    let rawLines = safeText.split('\n');
    let lines = [];

    // Gabungkan baris subtext bilingual yang berdiri sendiri
    rawLines.forEach((line) => {
        let trimmed = line.trim();
        if (!trimmed) return;
        if (trimmed.startsWith('(') && trimmed.endsWith(')') && lines.length > 0) {
            lines[lines.length - 1] = `${lines[lines.length - 1].trim()} ${trimmed}`;
        } else if (trimmed.startsWith('//') && lines.length > 0) {
            lines[lines.length - 1] = `${lines[lines.length - 1].trim()} ${trimmed}`;
        } else {
            lines.push(line);
        }
    });

    let finalLinesHtml = [];
    let finalLinesGhost = [];

    const splitToChars = (text) => {
        return text.split(' ').map(word => {
            let chars = word.split('').map(c => `<span class="char" style="display:inline-block;vertical-align:baseline;font-size:1em;line-height:1;">${c}</span>`).join('');
            return `<span class="word" style="white-space:nowrap;display:inline-block;vertical-align:baseline;font-size:1em;line-height:1;">${chars}</span>`;
        }).join(' ');
    };

    lines.forEach((line, index) => {
        let mainText = line;
        let subText = "";
        let isBilingual = false;
        let bracketAtStart = false;

        // 1. DETEKSI FORMAT BARU: Haleluya (Hallelujah)
        let startIdx = line.indexOf('(');
        let endIdx = line.lastIndexOf(')');

        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            const bracketText = line.substring(startIdx + 1, endIdx).trim();
            const outsideText = (line.substring(0, startIdx) + " " + line.substring(endIdx + 1)).trim();

            if (startIdx === 0) {
                // Bracket is at the start, e.g. "(Hallelujah) Haleluya"
                mainText = outsideText;
                subText = bracketText;
                bracketAtStart = true;
            } else {
                // Bracket is at the end or middle, e.g. "Haleluya (Hallelujah)"
                mainText = outsideText;
                subText = bracketText;
            }
            isBilingual = true;
        }
        // 2. FALLBACK FORMAT LAMA: Haleluya // Hallelujah (Biar lagu lama ga rusak)
        else if (line.includes("//")) {
            let parts = line.split("//");
            mainText = parts[0].trim();
            subText = parts.slice(1).join("//").trim();
            isBilingual = true;
        }

        // SUPPRESS MARGIN UNTUK BILINGUAL CASE
        let gapAntarBaris = (index > 0 && !isBilingual) ? 'margin-top: 0.3em;' : 'margin-top: 0;';

        if (isBilingual) {
            let mainHtml = splitCharFx ? splitToChars(mainText) : mainText;
            let subHtml = splitCharFx ? splitToChars(subText) : subText;

            // RENDER: sub-lang di atas jika bracket di awal baris, jika tidak di bawah
            let innerHtml = "";
            if (bracketAtStart) {
                innerHtml = `<div class="sub-lang" style="color:${globalSubColor}; font-size:${globalSubSize}em; font-style:italic; opacity:0.9; margin-bottom:0.1em !important;">${subHtml}</div><div class="main-lang">${mainHtml}</div>`;
            } else {
                innerHtml = `<div class="main-lang">${mainHtml}</div><div class="sub-lang" style="color:${globalSubColor}; font-size:${globalSubSize}em; font-style:italic; opacity:0.9;">${subHtml}</div>`;
            }

            const lineHtml = `<div class="bilingual-line" style="${gapAntarBaris}">${innerHtml}</div>`;
            finalLinesHtml.push(lineHtml);
            finalLinesGhost.push(lineHtml); // Ghost content matches main content to prevent stagger/timing anomalies!
        } else {
            let mainHtml = splitCharFx ? splitToChars(line) : line;
            const lineHtml = `<div class="main-lang" style="${gapAntarBaris}">${mainHtml}</div>`;
            finalLinesHtml.push(lineHtml);
            finalLinesGhost.push(lineHtml);
        }
    });

    return {
        html: finalLinesHtml.join(''),
        htmlGhost: finalLinesGhost.join(''),
        plainText: plainText // plainText tetap asli (-) biar ga nge-loop render
    };
}

// ==========================================
// --- CONSOLE.LOG INTERCEPTOR (once at load) ---
// ==========================================
let ws;
const pageSource = window.location.pathname.replace('/', '') || 'index';

function sendLogToServer(level, args) {
    try {
        const msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                action: "frontend_log",
                payload: { source: pageSource, level: level, message: msg }
            }));
        }
    } catch (e) { }
}

function setupConsoleInterceptor() {
    if (setupConsoleInterceptor._installed) return;
    setupConsoleInterceptor._installed = true;
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;
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
}
setupConsoleInterceptor();

// ==========================================
// --- AUTO-RECONNECT WEBSOCKET ENGINE ---
// ==========================================
let reconnectTimer;
let isWebSocketConnected = false;

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
            if (data.layers_main) {
                updateLayers(data.layers_main);
            } else if (data.target === 'main' && data.layers) {
                updateLayers(data.layers);
            }
        }

        if (data.type === "update_state") {

            const s = data.state;
            if (window.location.pathname.includes("preview")) {
                s.show = true;
            }

            // --- TAMBAHKAN 5 BARIS INI DI SINI BIAR GAK ERROR REFRENCE ---
            const strokeSizeVal = s.stroke_size !== undefined ? parseFloat(s.stroke_size) : 0;
            const strokeColorVal = s.stroke_color || '#000000';
            const glowVal = s.glow !== undefined ? parseInt(s.glow) : 50;
            const shadowIntVal = s.shadow_int || 0;
            const shadowColorVal = s.shadow_color || '#000000';
            // --------------------------------------------------------------

            if (s.sub_color) globalSubColor = s.sub_color;
            if (s.sub_size) globalSubSize = s.sub_size;

            if (s.font) injectFont(s.font);
            document.body.style.setProperty('--main-color', s.color);
            document.body.style.setProperty('--glow-int', s.glow / 50);
            document.body.style.setProperty('--fade-speed', s.fade + "s");
            if (s.font_size) {
                let sizeVal = s.font_size;
                if (sizeVal <= 15) sizeVal = sizeVal * 19.2;
                document.body.style.setProperty('--main-font-size', sizeVal + "px");
            }
            if (s.speed) {
                let speedDuration = s.speed;
                if (s.speed === '120s') speedDuration = '45s';
                else if (s.speed === '60s') speedDuration = '25s';
                else if (s.speed === '30s') speedDuration = '15s';
                else if (s.speed === '15s') speedDuration = '9s';
                else if (s.speed === '6s') speedDuration = '5s';
                document.body.style.setProperty('--motion-drift-speed', speedDuration);
            }

            const useManualColor = (s.color !== "#ffffff" && !FIXED_THEMES.has(s.theme));
            const themeClass = "theme-" + (s.theme || "default");
            const isFixedTheme = FIXED_THEMES.has(s.theme);

            if (activeLayer) {
                const wrapper = activeLayer.querySelector(".lyric-wrapper");
                const zoomContainer = activeLayer.querySelector(".lyric-zoom-container") || wrapper;
                const txt = wrapper.querySelector(".lyric-text");
                const gstEl = wrapper.querySelector(".lyric-ghost");

                if (s.font) {
                    txt.style.fontFamily = `"${s.font}", sans-serif`;
                    gstEl.style.fontFamily = `"${s.font}", sans-serif`;
                }

                txt.className = "lyric-text " + themeClass;
                gstEl.className = "lyric-ghost " + themeClass;

                if (useManualColor) {
                    txt.style.color = s.color;
                    gstEl.style.color = s.color;
                } else {
                    txt.style.color = "";
                    gstEl.style.color = "";
                }

                const marginXPercent = s.margin_x !== undefined ? s.margin_x : (s.pad_x !== undefined ? s.pad_x : 10);
                const textWrapPercent = s.text_wrap !== undefined ? s.text_wrap : (s.pad_x !== undefined ? (100 - 2 * s.pad_x) : 80);

                const paddingVal = (marginXPercent * 19.2) + 'px';
                activeLayer.style.paddingLeft = paddingVal;
                activeLayer.style.paddingRight = paddingVal;

                if (wrapper) {
                    const maxWVal = (textWrapPercent * 19.2) + 'px';
                    wrapper.style.maxWidth = maxWVal;
                    wrapper.style.width = "100%";
                }

                const alignMode = s.align || 'center';
                let layerAlign = "center";
                let transformOrigin = "center center";

                if (alignMode === 'left') {
                    layerAlign = "flex-start";
                    transformOrigin = "left center";
                } else if (alignMode === 'right') {
                    layerAlign = "flex-end";
                    transformOrigin = "right center";
                }

                // Use alignItems for horizontal alignment in flex-direction: column
                activeLayer.style.alignItems = layerAlign;

                // Penting: Align teks di dalam blok flex text
                txt.style.alignItems = layerAlign;
                txt.style.textAlign = alignMode;

                gstEl.style.alignItems = layerAlign;
                gstEl.style.textAlign = alignMode;

                if (zoomContainer) {
                    zoomContainer.style.transformOrigin = transformOrigin;
                    zoomContainer.style.alignItems = layerAlign;
                    const expectedZoomClass = (s.zoom === 'in') ? 'move-in' : ((s.zoom === 'out') ? 'move-out' : 'move-stay');
                    if (!zoomContainer.classList.contains(expectedZoomClass)) {
                        zoomContainer.classList.remove('move-in', 'move-out', 'move-stay');
                        void zoomContainer.offsetWidth;
                        zoomContainer.classList.add(expectedZoomClass);
                    }
                }
                if (wrapper) {
                    wrapper.style.transformOrigin = transformOrigin;
                }

                // ==========================================
                // --- TAMBAHAN VERTICAL ALIGNMENT (BLOK 1) ---
                // ==========================================
                const vAlignMode = s.v_align || 'center';
                const vMarginVal = ((s.v_margin !== undefined ? s.v_margin : 5) * 10.8) + 'px';

                if (vAlignMode === 'top') {
                    activeLayer.style.justifyContent = 'flex-start';
                    activeLayer.style.paddingTop = vMarginVal;
                    activeLayer.style.paddingBottom = '0';
                } else if (vAlignMode === 'bottom') {
                    activeLayer.style.justifyContent = 'flex-end';
                    activeLayer.style.paddingTop = '0';
                    activeLayer.style.paddingBottom = vMarginVal;
                } else {
                    activeLayer.style.justifyContent = 'center';
                    activeLayer.style.paddingTop = '0';
                    activeLayer.style.paddingBottom = '0';
                }

                // =======================================================
                // --- MASTER FORMATTING ENGINE (BLOCK 1: txt) ---
                // =======================================================
                const tTrans = s.text_transform || 'none';
                const fWeight = s.font_weight === 'bold' ? 'bold' : 'normal';
                const fStyle = s.font_style || 'normal';
                const tDeco = s.text_decoration || 'none';

                txt.style.textTransform = tTrans; gstEl.style.textTransform = tTrans;
                txt.style.fontWeight = fWeight; gstEl.style.fontWeight = fWeight;
                txt.style.fontStyle = fStyle; gstEl.style.fontStyle = fStyle;
                txt.style.textDecoration = tDeco; gstEl.style.textDecoration = tDeco;


                // 1. TEXT COLOR & GRADIENT ENGINE (ANTI-BUG)
                txt.classList.remove('gradient-text');
                txt.style.backgroundImage = '';
                txt.style.webkitBackgroundClip = '';
                txt.style.webkitTextFillColor = '';
                txt.style.color = '';
                if (!isFixedTheme) {
                    if (s.color_type === 'gradient') {
                        txt.style.setProperty('--grad-color', `linear-gradient(${s.color_angle || 90}deg, ${s.color}, ${s.color_2 || '#00e5ff'})`);
                        txt.classList.add('gradient-text');
                        txt.style.textDecorationColor = s.color;
                    } else {
                        txt.style.color = s.color;
                        txt.style.textDecorationColor = s.color;
                    }
                } else {
                    // FIXED THEME: Apply gradient via reliable hardcoded map
                    const themeKey = s.theme || 'default';
                    if (GRADIENT_THEME_MAP[themeKey]) {
                        txt.style.setProperty('--grad-color', GRADIENT_THEME_MAP[themeKey]);
                        txt.classList.add('gradient-text');
                    }
                    // Non-gradient fixed themes (hologram, retro, etc.) rely purely on CSS class
                }

                const strokeSizeVal = s.stroke_size !== undefined ? parseFloat(s.stroke_size) : 0;
                const strokeColorVal = s.stroke_color || '#000000';
                txt.style.webkitTextStroke = strokeSizeVal > 0 ? `${strokeSizeVal}px ${strokeColorVal}` : '';
                gstEl.style.webkitTextStroke = strokeSizeVal > 0 ? `${strokeSizeVal}px ${strokeColorVal}` : '';

                // 2. DROP SHADOW & GLOW ENGINE (OPTIMIZED)
                const glowVal = s.glow !== undefined ? parseInt(s.glow) : 50;
                const shadowIntVal = s.shadow_int || 0;
                const shadowColorVal = s.shadow_color || '#000000';
                const glowType = s.glow_type || 'text';
                const glowC1 = s.glow_color_1 || s.color;
                const glowC2 = s.glow_color_2 || '#ff00ff';
                const glowAng = s.glow_angle || 90;

                // A. Reset & Setup Ghost Glow
                gstEl.style.opacity = '0';
                gstEl.classList.remove('gradient-text');
                gstEl.style.backgroundImage = '';
                gstEl.style.webkitBackgroundClip = '';
                gstEl.style.webkitTextFillColor = '';
                gstEl.style.filter = '';

                // Reset wrapper filter to completely remove CPU/GPU drop-shadow filter overhead
                if (wrapper) {
                    wrapper.style.filter = '';
                }

                let shadowList = [];

                // 1. INTENSITY SHADOW (Directly onto text-shadow instead of container drop-shadow)
                if (shadowIntVal > 0) {
                    const off = shadowIntVal / 4;
                    const blur1 = Math.min(15, shadowIntVal / 2);
                    const blur2 = Math.min(30, shadowIntVal);
                    shadowList.push(`${off}px ${off}px ${blur1}px ${shadowColorVal}`);
                    shadowList.push(`${off * 1.5}px ${off * 1.5}px ${blur2}px rgba(0,0,0,0.6)`);
                }

                // Identify if theme uses gradient text
                const isGradient = s.color_type === 'gradient' || ['gold', 'sunset', 'nature', 'hologram'].includes(s.theme);
                const isGhostAllowed = !['box-black', 'frosted', 'clean', 'pure', 'paper', 'plain'].includes(s.theme);
                const useGhostGlow = glowVal > 0 && isGradient && isGhostAllowed;

                // 2. GLOW ENGINE
                if (glowVal > 0) {
                    if (useGhostGlow) {
                        // Use ghost layer for beautiful gradient neon glow (single blur filter is very fast)
                        if (glowType === 'gradient') {
                            gstEl.style.setProperty('--grad-color', `linear-gradient(${glowAng}deg, ${glowC1}, ${glowC2})`);
                            gstEl.classList.add('gradient-text');
                        } else if (s.color_type === 'gradient' && glowType === 'text') {
                            gstEl.style.setProperty('--grad-color', `linear-gradient(${s.color_angle || 90}deg, ${s.color}, ${s.color_2 || '#00e5ff'})`);
                            gstEl.classList.add('gradient-text');
                        }
                        const blurRadius = Math.min(15, glowVal / 5);
                        gstEl.style.filter = `blur(${blurRadius}px) brightness(1.3) saturate(1.4)`;
                        gstEl.style.opacity = '0.9';
                    } else if (!isFixedTheme) {
                        // Solid Text / Custom Solid Glow -> Applied to text-shadow directly
                        let actualGlowColor = (glowType === 'solid') ? glowC1 : s.color;
                        let preserveThemeTextShadow = false;

                        if (glowType === 'text') {
                            const themeTextShadow = getThemeTextShadow(themeClass);
                            if (themeTextShadow) {
                                preserveThemeTextShadow = true;
                                txt.dataset.baseTextShadow = themeTextShadow;
                                const enhancedShadow = enhanceThemeTextShadow(themeTextShadow, glowVal);
                                shadowList.push(enhancedShadow);
                            } else {
                                delete txt.dataset.baseTextShadow;
                            }

                            if (!preserveThemeTextShadow) {
                                actualGlowColor = s.color;
                                const blur1 = Math.min(12, glowVal / 5);
                                const blur2 = Math.min(25, glowVal / 2.5);
                                const blur3 = Math.min(40, glowVal * 0.7);
                                shadowList.push(`0 0 ${blur1}px ${actualGlowColor}`);
                                shadowList.push(`0 0 ${blur2}px ${actualGlowColor}`);
                                shadowList.push(`0 0 ${blur3}px ${actualGlowColor}`);
                            }
                        } else {
                            // Custom solid glow
                            const blur1 = Math.min(12, glowVal / 4);
                            const blur2 = Math.min(30, glowVal * 0.8);
                            shadowList.push(`0 0 ${blur1}px ${actualGlowColor}`);
                            shadowList.push(`0 0 ${blur2}px ${actualGlowColor}`);
                        }

                        if (preserveThemeTextShadow) {
                            txt.dataset.preserveTextShadow = 'true';
                        }
                    } else {
                        // Fixed solid themes glow -> Applied to text-shadow directly
                        let themeGlowColor = s.color;
                        const blur1 = Math.min(12, glowVal / 4);
                        const blur2 = Math.min(30, glowVal * 0.8);
                        shadowList.push(`0 0 ${blur1}px ${themeGlowColor}`);
                        shadowList.push(`0 0 ${blur2}px ${themeGlowColor}`);
                    }
                }

                txt.style.textShadow = shadowList.length > 0 ? shadowList.join(', ') : '';

                // FIX BUG THEME HILANG: Jangan matikan text-shadow jika ada custom shadow/glow
                if (shadowList.length > 0) {
                    if (txt.dataset.preserveTextShadow === 'true') {
                        delete txt.dataset.preserveTextShadow;
                    }
                } else {
                    if (!isFixedTheme && s.color_type === 'gradient') {
                        txt.style.textShadow = 'none';
                    } else {
                        txt.style.textShadow = ''; // Kosongkan biar ikut CSS Theme bawaan!
                    }
                }
                // ====================================================================

                clearFxClasses(activeLayer);
                const activeWrapper = activeLayer.querySelector('.lyric-wrapper');
                if (activeWrapper) clearFxClasses(activeWrapper);
                clearFxClasses(txt);

                // Clear any inline animation delays
                clearAnimationDelays(activeLayer);

                const motionLoop = s.motion || "none";
                if (motionLoop !== "none") {
                    startMotionLoopHandoff(activeLayer, activeWrapper, txt, motionLoop, transitionGeneration);
                }
            }

            const rawNewText = s.show ? s.text : "";
            let nextLayer;

            if (!activeLayer) { nextLayer = layerA; } else {
                const currentText = activeLayer.querySelector(".lyric-text").getAttribute("data-text");
                const newCompareText = rawNewText ? rawNewText.replace(/\n/g, ' ') : "";
                if (currentText === newCompareText && s.show) {
                    // Teks sama — tapi cek apakah motion loop berubah
                    const curLoop = activeLayer.dataset.currentMotionLoop || "none";
                    const newLoop = s.motion || "none";
                    if (curLoop !== newLoop) {
                        cancelPendingHandoffs();
                        clearFxClasses(activeLayer);
                        const alWrapper = activeLayer.querySelector('.lyric-wrapper');
                        const alTxt = activeLayer.querySelector('.lyric-text');
                        if (alWrapper) clearFxClasses(alWrapper);
                        if (alTxt) clearFxClasses(alTxt);

                        clearAnimationDelays(activeLayer);

                        activeLayer.dataset.currentMotionLoop = newLoop;
                        if (newLoop !== "none") {
                            startMotionLoopHandoff(activeLayer, alWrapper, alTxt, newLoop, transitionGeneration);
                        } else {
                            activeLayer.classList.remove('loop-ready');
                            clearLoopHandoffClasses(activeLayer);
                        }
                    }
                    return;
                }
                nextLayer = (activeLayer === layerA) ? layerB : layerA;
            }

            cancelPendingHandoffs();

            const wrapper = nextLayer.querySelector(".lyric-wrapper");
            const zoomContainer = nextLayer.querySelector(".lyric-zoom-container") || wrapper;
            const nextTxt = wrapper.querySelector(".lyric-text");
            const gstEl = wrapper.querySelector(".lyric-ghost");

            activateLyricLayer(nextLayer);
            clearLoopHandoffClasses(nextLayer);
            clearFxClasses(nextLayer);
            clearFxClasses(wrapper);
            clearFxClasses(nextTxt);
            // Also clear any stale loop classes from wrapper itself
            clearFxClasses(wrapper);

            nextTxt.className = "lyric-text " + themeClass;
            gstEl.className = "lyric-ghost " + themeClass;

            if (useManualColor) {
                nextTxt.style.color = s.color;
                gstEl.style.color = s.color;
            } else {
                nextTxt.style.color = "";
                gstEl.style.color = "";
            }

            let fxClass = 'fx-fade';
            if (s.trans === 'blur') fxClass = 'fx-blur'; if (s.trans === 'mask') fxClass = 'fx-mask'; if (s.trans === 'stagger') fxClass = 'fx-stagger';
            if (s.trans === 'track') fxClass = 'fx-track'; if (s.trans === 'burst') fxClass = 'fx-burst'; if (s.trans === 'type') fxClass = 'fx-type';
            if (s.trans === 'echo') fxClass = 'fx-echo'; if (s.trans === 'flip3d') fxClass = 'fx-flip3d'; if (s.trans === 'slide') fxClass = 'fx-slide';
            if (s.trans === 'spin') fxClass = 'fx-spin'; if (s.trans === 'focus') fxClass = 'fx-focus'; if (s.trans === 'neon') fxClass = 'fx-neon';
            if (s.trans === 'wave') fxClass = 'fx-wave'; if (s.trans === 'pop') fxClass = 'fx-pop'; if (s.trans === 'stretch') fxClass = 'fx-stretch';
            if (s.trans === 'gauss') fxClass = 'fx-gauss'; if (s.trans === 'glitch') fxClass = 'fx-glitch';
            if (s.trans === 'cinema') fxClass = 'fx-cinema'; if (s.trans === 'swipe') fxClass = 'fx-swipe'; if (s.trans === 'stamp') fxClass = 'fx-stamp';
            if (s.trans === 'elevator') fxClass = 'fx-elevator'; if (s.trans === 'swivel') fxClass = 'fx-swivel'; if (s.trans === 'fold') fxClass = 'fx-fold';
            if (s.trans === 'turb') fxClass = 'fx-turb'; if (s.trans === 'drop') fxClass = 'fx-drop'; if (s.trans === 'rotate') fxClass = 'fx-rotate';
            if (s.trans === 'beat') fxClass = 'fx-beat';

            // --- STANDARD PRO ANIMS ---
            const newAnims = ['bloom', 'smoke', 'light', 'softfocus', 'float', 'punch', 'elastic', 'flashpop', 'whip', 'gdrop',
                'dust', 'lens', 'wipe', 'abyss', 'aurora', 'rgb', 'shake', 'smash', 'slash', 'terminal'];
            if (newAnims.includes(s.trans)) fxClass = 'fx-' + s.trans;

            // --- DEEP EFFECT: GROUPED ODD/EVEN WORD TRANSITIONS ---
            const deepAnims = ['smoke-deep', 'liquid', 'zoom-deep', 'glitch-deep', 'fisheye', 'radial-blur', 'chromatic', 'motion-blur', 'veil-lift', 'particle'];
            if (deepAnims.includes(s.trans)) fxClass = 'fx-' + s.trans;

            // --- WORSHIP PRO: CENTER-OUT WORD STAGGER ---
            const worshipProAnims = ['holy-breathe', 'sanctify', 'ascend', 'mist-form', 'rapture'];
            if (worshipProAnims.includes(s.trans)) fxClass = 'fx-' + s.trans;

            // --- PRAISE EXTREME: REVERSE-CASCADE + VARIATION CHARS ---
            const praiseExtremeAnims = ['shockwave', 'overdrive', 'nuke', 'voltage', 'riot'];
            if (praiseExtremeAnims.includes(s.trans)) fxClass = 'fx-' + s.trans;

            // --- PRAISE/WORSHIP RANDOM LETTER TRANSITIONS ---
            const praiseRandomLetterAnims = [
                'praise-letter-zoom-spark', 'praise-letter-strobe-pop', 'praise-letter-prism-snap',
                'praise-letter-whip-grid', 'praise-letter-flash-cut', 'praise-letter-orbit-hit',
                'praise-letter-bass-drop', 'praise-letter-chroma-burst', 'praise-letter-tile-shatter',
                'praise-letter-speed-ramp'
            ];
            const worshipRandomLetterAnims = [
                'worship-letter-candle-rise', 'worship-letter-mist-bloom', 'worship-letter-lens-prayer',
                'worship-letter-silk-drift', 'worship-letter-soft-iris', 'worship-letter-cloud-form',
                'worship-letter-golden-hour', 'worship-letter-deep-focus', 'worship-letter-veil-cascade',
                'worship-letter-cinematic-breathe'
            ];
            if (praiseRandomLetterAnims.includes(s.trans) || worshipRandomLetterAnims.includes(s.trans)) {
                fxClass = 'fx-' + s.trans;
            }

            const motionLoop = s.motion || "none";
            nextLayer.classList.remove('loop-ready');
            nextLayer.dataset.currentMotionLoop = motionLoop;

            // Pre-clear zoomContainer zoom class before the single reflow so one flush covers both
            if (zoomContainer) {
                zoomContainer.classList.remove('move-in', 'move-out', 'move-stay');
                zoomContainer.style.transform = '';
            }

            void nextLayer.offsetWidth; // Single reflow – flushes cleared fx-class + zoom state together
            nextLayer.classList.add(fxClass);
            setCompositingActive(nextLayer, true);

            const fadeMs = (parseFloat(s.fade) || 0.8) * 1000;

            if (rawNewText) {
                // Bedakan mana animasi per Kata, mana per Huruf menggunakan Set global O(1)
                const isRandomLetterFx = RANDOM_LETTER_FX.has(fxClass);
                // Deteksi apakah motion loop yang aktif adalah jenis WORD (membutuhkan .word elements)
                const isWordMotionLoop = motionLoop !== 'none' && (
                    motionLoop.startsWith('worship-word-') || motionLoop.startsWith('praise-word-')
                );
                const isWordFx = WORD_FX.has(fxClass);
                const isDeepWordFx = DEEP_WORD_FX.has(fxClass);
                const isCenterWordFx = CENTER_WORD_FX.has(fxClass);
                const isReverseCharFx = REVERSE_CHAR_FX.has(fxClass);
                const isCharFx = CHAR_FX.has(fxClass);
                const useSplitCharFx = isWordMotionLoop || isWordFx || isCharFx || isRandomLetterFx || isDeepWordFx || isCenterWordFx || isReverseCharFx;

                if (s.font) {
                    nextTxt.style.fontFamily = `"${s.font}", sans-serif`;
                    gstEl.style.fontFamily = `"${s.font}", sans-serif`;
                }

                const marginXPercent = s.margin_x !== undefined ? s.margin_x : (s.pad_x !== undefined ? s.pad_x : 10);
                const textWrapPercent = s.text_wrap !== undefined ? s.text_wrap : (s.pad_x !== undefined ? (100 - 2 * s.pad_x) : 80);

                const paddingVal = (marginXPercent * 19.2) + 'px';
                nextLayer.style.paddingLeft = paddingVal;
                nextLayer.style.paddingRight = paddingVal;

                if (wrapper) {
                    const maxWVal = (textWrapPercent * 19.2) + 'px';
                    wrapper.style.maxWidth = maxWVal;
                    wrapper.style.width = "100%";
                }

                const alignMode = s.align || 'center';
                let layerAlign = "center";
                let transformOrigin = "center center";

                if (alignMode === 'left') { layerAlign = "flex-start"; transformOrigin = "left center"; }
                else if (alignMode === 'right') { layerAlign = "flex-end"; transformOrigin = "right center"; }

                // Horizontal alignment (align-items for column)
                nextLayer.style.alignItems = layerAlign;
                nextTxt.style.textAlign = alignMode;
                nextTxt.style.alignItems = layerAlign;
                gstEl.style.textAlign = alignMode;
                gstEl.style.alignItems = layerAlign;
                if (zoomContainer) {
                    zoomContainer.style.transformOrigin = transformOrigin;
                    zoomContainer.style.alignItems = layerAlign;
                    // zoomContainer zoom class was already cleared before the single reflow above; just add the new one
                    const zoomClass = (s.zoom === 'in') ? 'move-in' : (s.zoom === 'out') ? 'move-out' : 'move-stay';
                    zoomContainer.classList.add(zoomClass);
                }
                if (wrapper) {
                    wrapper.style.transformOrigin = transformOrigin;
                }

                // ==========================================
                // --- TAMBAHAN VERTICAL ALIGNMENT (BLOK 2) ---
                // ==========================================
                const vAlignMode2 = s.v_align || 'center';
                const vMarginVal2 = ((s.v_margin !== undefined ? s.v_margin : 5) * 10.8) + 'px';

                if (vAlignMode2 === 'top') {
                    nextLayer.style.justifyContent = 'flex-start';
                    nextLayer.style.paddingTop = vMarginVal2;
                    nextLayer.style.paddingBottom = '0';
                } else if (vAlignMode2 === 'bottom') {
                    nextLayer.style.justifyContent = 'flex-end';
                    nextLayer.style.paddingTop = '0';
                    nextLayer.style.paddingBottom = vMarginVal2;
                } else {
                    nextLayer.style.justifyContent = 'center';
                    nextLayer.style.paddingTop = '0';
                    nextLayer.style.paddingBottom = '0';
                }

                // =======================================================
                // --- MASTER FORMATTING ENGINE (BLOCK 2: nextTxt) ---
                // =======================================================
                const tTrans2 = s.text_transform || 'none';
                const fWeight2 = s.font_weight === 'bold' ? 'bold' : 'normal';
                const fStyle2 = s.font_style || 'normal';
                const tDeco2 = s.text_decoration || 'none';

                nextTxt.style.textTransform = tTrans2; gstEl.style.textTransform = tTrans2;
                nextTxt.style.fontWeight = fWeight2; gstEl.style.fontWeight = fWeight2;
                nextTxt.style.fontStyle = fStyle2; gstEl.style.fontStyle = fStyle2;
                nextTxt.style.textDecoration = tDeco2; gstEl.style.textDecoration = tDeco2;

                // 1. TEXT COLOR & GRADIENT ENGINE (ANTI-BUG)
                nextTxt.classList.remove('gradient-text');
                nextTxt.style.backgroundImage = '';
                nextTxt.style.webkitBackgroundClip = '';
                nextTxt.style.webkitTextFillColor = '';
                nextTxt.style.color = '';

                if (!isFixedTheme) {
                    if (s.color_type === 'gradient') {
                        nextTxt.style.setProperty('--grad-color', `linear-gradient(${s.color_angle || 90}deg, ${s.color}, ${s.color_2 || '#00e5ff'})`);
                        nextTxt.classList.add('gradient-text');
                        nextTxt.style.textDecorationColor = s.color;
                    } else {
                        nextTxt.style.color = s.color;
                        nextTxt.style.textDecorationColor = s.color;
                    }
                } else {
                    // FIXED THEME: Apply gradient via reliable hardcoded map (Block 2)
                    const themeKey2 = s.theme || 'default';
                    if (GRADIENT_THEME_MAP[themeKey2]) {
                        nextTxt.style.setProperty('--grad-color', GRADIENT_THEME_MAP[themeKey2]);
                        nextTxt.classList.add('gradient-text');
                    }
                    // Non-gradient fixed themes rely purely on CSS class
                }

                const strokeSizeVal2 = s.stroke_size !== undefined ? parseFloat(s.stroke_size) : 0;
                const strokeColorVal2 = s.stroke_color || '#000000';
                nextTxt.style.webkitTextStroke = strokeSizeVal2 > 0 ? `${strokeSizeVal2}px ${strokeColorVal2}` : '';
                gstEl.style.webkitTextStroke = strokeSizeVal2 > 0 ? `${strokeSizeVal2}px ${strokeColorVal2}` : '';

                // 2. DROP SHADOW & GLOW ENGINE (OPTIMIZED)
                const glowVal2 = s.glow !== undefined ? parseInt(s.glow) : 50;
                const shadowIntVal2 = s.shadow_int || 0;
                const shadowColorVal2 = s.shadow_color || '#000000';
                const glowType2 = s.glow_type || 'text';
                const glowC1_2 = s.glow_color_1 || s.color;
                const glowC2_2 = s.glow_color_2 || '#ff00ff';
                const glowAng2 = s.glow_angle || 90;

                // A. Reset & Setup Ghost Glow
                gstEl.style.opacity = '0';
                gstEl.classList.remove('gradient-text');
                gstEl.style.backgroundImage = '';
                gstEl.style.webkitBackgroundClip = '';
                gstEl.style.webkitTextFillColor = '';
                gstEl.style.filter = '';

                // Reset wrapper filter to completely remove CPU/GPU drop-shadow filter overhead
                if (wrapper) {
                    wrapper.style.filter = '';
                }

                let shadowList2 = [];

                // 1. INTENSITY SHADOW (Directly onto text-shadow instead of container drop-shadow)
                if (shadowIntVal2 > 0) {
                    const off2 = shadowIntVal2 / 4;
                    const blur1_2 = Math.min(15, shadowIntVal2 / 2);
                    const blur2_2 = Math.min(30, shadowIntVal2);
                    shadowList2.push(`${off2}px ${off2}px ${blur1_2}px ${shadowColorVal2}`);
                    shadowList2.push(`${off2 * 1.5}px ${off2 * 1.5}px ${blur2_2}px rgba(0,0,0,0.6)`);
                }

                // Identify if theme uses gradient text
                const isGradient2 = s.color_type === 'gradient' || ['gold', 'sunset', 'nature', 'hologram'].includes(s.theme);
                const isGhostAllowed2 = !['box-black', 'frosted', 'clean', 'pure', 'paper', 'plain'].includes(s.theme);
                const useGhostGlow2 = glowVal2 > 0 && isGradient2 && isGhostAllowed2;

                // 2. GLOW ENGINE
                if (glowVal2 > 0) {
                    if (useGhostGlow2) {
                        // Use ghost layer for beautiful gradient neon glow (single blur filter is very fast)
                        if (glowType2 === 'gradient') {
                            gstEl.style.setProperty('--grad-color', `linear-gradient(${glowAng2}deg, ${glowC1_2}, ${glowC2_2})`);
                            gstEl.classList.add('gradient-text');
                        } else if (s.color_type === 'gradient' && glowType2 === 'text') {
                            gstEl.style.setProperty('--grad-color', `linear-gradient(${s.color_angle || 90}deg, ${s.color}, ${s.color_2 || '#00e5ff'})`);
                            gstEl.classList.add('gradient-text');
                        }
                        const blurRadius2 = Math.min(15, glowVal2 / 5);
                        gstEl.style.filter = `blur(${blurRadius2}px) brightness(1.3) saturate(1.4)`;
                        gstEl.style.opacity = '0.9';
                    } else if (!isFixedTheme) {
                        // Solid Text / Custom Solid Glow -> Applied to text-shadow directly
                        let actualGlowColor2 = (glowType2 === 'solid') ? glowC1_2 : s.color;
                        let preserveThemeTextShadow2 = false;

                        if (glowType2 === 'text') {
                            const themeTextShadow2 = getThemeTextShadow(themeClass);
                            if (themeTextShadow2) {
                                preserveThemeTextShadow2 = true;
                                nextTxt.dataset.baseTextShadow = themeTextShadow2;
                                const enhancedShadow2 = enhanceThemeTextShadow(themeTextShadow2, glowVal2);
                                shadowList2.push(enhancedShadow2);
                            } else {
                                delete nextTxt.dataset.baseTextShadow;
                            }

                            if (!preserveThemeTextShadow2) {
                                actualGlowColor2 = s.color;
                                const blur1_2 = Math.min(12, glowVal2 / 5);
                                const blur2_2 = Math.min(25, glowVal2 / 2.5);
                                const blur3_2 = Math.min(40, glowVal2 * 0.7);
                                shadowList2.push(`0 0 ${blur1_2}px ${actualGlowColor2}`);
                                shadowList2.push(`0 0 ${blur2_2}px ${actualGlowColor2}`);
                                shadowList2.push(`0 0 ${blur3_2}px ${actualGlowColor2}`);
                            }
                        } else {
                            // Custom solid glow
                            const blur1_2 = Math.min(12, glowVal2 / 4);
                            const blur2_2 = Math.min(30, glowVal2 * 0.8);
                            shadowList2.push(`0 0 ${blur1_2}px ${actualGlowColor2}`);
                            shadowList2.push(`0 0 ${blur2_2}px ${actualGlowColor2}`);
                        }

                        if (preserveThemeTextShadow2) {
                            nextTxt.dataset.preserveTextShadow = 'true';
                        }
                    } else {
                        // Fixed solid themes glow -> Applied to text-shadow directly
                        let themeGlowColor = s.color;
                        const blur1_2 = Math.min(12, glowVal2 / 4);
                        const blur2_2 = Math.min(30, glowVal2 * 0.8);
                        shadowList2.push(`0 0 ${blur1_2}px ${themeGlowColor}`);
                        shadowList2.push(`0 0 ${blur2_2}px ${themeGlowColor}`);
                    }
                }

                nextTxt.style.textShadow = shadowList2.length > 0 ? shadowList2.join(', ') : '';

                // FIX BUG THEME HILANG: Jangan matikan text-shadow jika ada custom shadow/glow
                if (shadowList2.length > 0) {
                    if (nextTxt.dataset.preserveTextShadow === 'true') {
                        delete nextTxt.dataset.preserveTextShadow;
                    }
                } else {
                    if (!isFixedTheme && s.color_type === 'gradient') {
                        nextTxt.style.textShadow = 'none';
                    } else {
                        nextTxt.style.textShadow = '';
                    }
                }
                // ========================================================================

                const processed = processBilingual(rawNewText, useSplitCharFx);
                nextTxt.setAttribute("data-text", processed.plainText);

                // 🚀 OPTIMASI MEMORY: Hapus bersih DOM lama sampai ke akarnya (Purge)
                // Ini mencegah frame-drop kalau aplikasi jalan berjam-jam
                while (nextTxt.firstChild) nextTxt.removeChild(nextTxt.firstChild);
                while (gstEl.firstChild) gstEl.removeChild(gstEl.firstChild);

                // Baru tembak elemen DOM yang baru
                nextTxt.innerHTML = processed.html;
                gstEl.innerHTML = processed.htmlGhost;  // GHOST: Hanya main-lang (no bilingual)

                // --- ENGINE PENYUNTIK DELAY (FIXED) ---
                if (useSplitCharFx) {
                    const delayBase = calculateStaggerDelayBase(fadeMs, fxClass, nextTxt);

                    if (isDeepWordFx) {
                        // DEEP: RANDOM WORD ENTRY (kata masuk acak secara sinkron antara main dan ghost)
                        const wordsCount = nextTxt.querySelectorAll('.word').length || 1;
                        const shuffledIndices = Array.from({ length: wordsCount }, (_, i) => i);
                        let seed = wordsCount + 7;
                        const pseudoRandom = () => {
                            seed = (seed * 9301 + 49297) % 233280;
                            return seed / 233280;
                        };
                        for (let i = shuffledIndices.length - 1; i > 0; i--) {
                            const j = Math.floor(pseudoRandom() * (i + 1));
                            const temp = shuffledIndices[i];
                            shuffledIndices[i] = shuffledIndices[j];
                            shuffledIndices[j] = temp;
                        }

                        [nextTxt, gstEl].forEach(container => {
                            container.querySelectorAll('.word').forEach((w, i) => {
                                const randFactor = shuffledIndices[i] !== undefined ? shuffledIndices[i] : 0;
                                w.style.animationDelay = (randFactor * delayBase) + 'ms';
                            });
                        });
                    } else if (isCenterWordFx) {
                        // WORSHIP PRO: CENTER-OUT RIPPLE (center word first, ripples L&R)
                        [nextTxt, gstEl].forEach(container => {
                            const words = Array.from(container.querySelectorAll('.word'));
                            const center = Math.floor(words.length / 2);
                            const wordDelay = delayBase * 2;
                            words.forEach((w, i) => {
                                w.style.animationDelay = (Math.abs(i - center) * wordDelay) + 'ms';
                            });
                        });
                    } else if (isReverseCharFx) {
                        [nextTxt, gstEl].forEach(container => {
                            const chars = Array.from(container.querySelectorAll('.char'));
                            const total = chars.length;
                            chars.forEach((c, i) => {
                                c.style.animationDelay = ((total - 1 - i) * delayBase) + "ms";
                            });
                        });
                    } else if (isRandomLetterFx) {
                        [nextTxt, gstEl].forEach(container => {
                            container.querySelectorAll('.char').forEach((c, i) => {
                                c.style.animationDelay = getRandomLetterDelay(i, delayBase, fxClass) + 'ms';
                            });
                        });
                    } else if (isWordFx) {
                        // SEQUENTIAL WORD STAGGER
                        let wordDelay = delayBase * 2;
                        let wIndex = 0;
                        nextTxt.querySelectorAll('.word').forEach((w) => { w.style.animationDelay = (wIndex * wordDelay) + "ms"; wIndex++; });
                        wIndex = 0;
                        gstEl.querySelectorAll('.word').forEach((w) => { w.style.animationDelay = (wIndex * wordDelay) + "ms"; wIndex++; });
                    } else {
                        // SEQUENTIAL CHAR STAGGER
                        let wordDelay = delayBase;
                        [nextTxt, gstEl].forEach(container => {
                            let cIndex = 0;
                            container.querySelectorAll('.char').forEach((c) => {
                                c.style.animationDelay = (cIndex * wordDelay) + "ms";
                                cIndex++;
                            });
                        });
                    }
                }

                const maxStaggerDelay = computeMaxStaggerDelay(s, fxClass, motionLoop, nextTxt, fadeMs);
                scheduleTransitionComplete(nextLayer, wrapper, nextTxt, gstEl, motionLoop, s.zoom || 'stay', fadeMs, maxStaggerDelay);

                const previousLayer = activeLayer;
                nextLayer.classList.add("active");
                if (previousLayer) {
                    beginLayerExit(previousLayer, fadeMs / 1.8, maxStaggerDelay);
                }
            } else {
                if (activeLayer && activeLayer.classList.contains('active')) {
                    beginLayerExit(activeLayer, fadeMs / 1.8, 0);
                }
                stripFxFromElements(nextLayer, wrapper, nextTxt);
                setCompositingActive(nextLayer, false);
            }
            activeLayer = nextLayer;
        }

        if (data.type === "alert") {
            const d = data.data;
            const alertBox = document.getElementById("alert-crawl");
            const crawlTxt = document.getElementById("crawl-text");

            // Pastikan targetnya sesuai! (Kalo di lowerthird ganti jadi 'lt', kalo di display ganti jadi 'main')
            if (d.targets && d.targets.includes('main') && d.show && d.text) {
                crawlTxt.innerText = d.text;
                alertBox.style.backgroundColor = d.color;
                alertBox.style.fontSize = (d.size || 40) + "px";
                alertBox.style.top = (d.position === 'top') ? '0' : 'auto';
                alertBox.style.bottom = (d.position === 'bottom') ? '0' : 'auto';

                // Apply Font if provided
                if (d.font) {
                    injectFont(d.font);
                    alertBox.style.fontFamily = d.font;
                } else {
                    alertBox.style.fontFamily = 'sans-serif';
                }

                // Apply Text Color if provided
                if (d.text_color) {
                    alertBox.style.color = d.text_color;
                } else {
                    alertBox.style.color = '#ffffff';
                }

                // Tampilkan dulu biar bisa diukur
                alertBox.style.display = "block";

                // ========================================================
                // --- SMART VELOCITY MATH (ANTI NGEBUT) ---
                // ========================================================
                crawlTxt.style.animation = 'none'; // Matikan animasi

                // Hapus padding siluman sementara buat ngukur murni teksnya
                crawlTxt.style.paddingLeft = "0px";
                const textWidth = crawlTxt.scrollWidth;
                const screenWidth = 1920;

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
}
// Jalankan koneksi pertama kali saat layar dibuka
connectWebSocket();
window.addEventListener('beforeunload', function () {
    cancelPendingHandoffs();
    stopKeepAlive();
});

// --- AUTO SCALE DISPLAY WRAPPER (1080p Virtual Canvas) ---
let displayResizeScheduled = false;
function scaleDisplayWrapper() {
    if (displayResizeScheduled) return;
    displayResizeScheduled = true;
    window.requestAnimationFrame(() => {
        const wrapper = document.getElementById('display-scale-wrapper');
        if (wrapper) {
            const htmlWidth = parseFloat(window.getComputedStyle(document.documentElement).width);
            const htmlHeight = parseFloat(window.getComputedStyle(document.documentElement).height);
            const layoutWidth = (htmlWidth && htmlWidth > 0) ? htmlWidth : window.innerWidth;
            const layoutHeight = (htmlHeight && htmlHeight > 0) ? htmlHeight : window.innerHeight;
            const scale = Math.min(layoutWidth / 1920, layoutHeight / 1080);
            wrapper.style.transform = `translate(-50%, -50%) scale(${scale})`;
        }
        displayResizeScheduled = false;
    });
}
window.addEventListener('resize', scaleDisplayWrapper);
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scaleDisplayWrapper);
} else {
    scaleDisplayWrapper();
}

// Observe CSS injection on html tag (for custom Electron resolution scaling recalculation)
try {
    const displayStyleObserver = new ResizeObserver(() => {
        scaleDisplayWrapper();
    });
    displayStyleObserver.observe(document.documentElement);
} catch (e) {
    console.warn("Failed to initialize display resolution observer", e);
}


// Staggered loading for sub-iframes to prevent TCP connection exhaustion / websocket lockups
window.addEventListener('load', function () {
    const iframes = document.querySelectorAll('iframe[data-src]');
    iframes.forEach((iframe, index) => {
        setTimeout(() => {
            const dataSrc = iframe.getAttribute('data-src');
            if (dataSrc) {
                iframe.src = dataSrc;
                console.log(`[StaggeredLoad] Loading iframe: ${iframe.id || 'unnamed'} -> ${dataSrc}`);
            }
        }, index * 120);
    });
});

