# ShowLyrics macOS — Post-Beta Cleanup Guide

This guide provides exact step-by-step instructions for removing the Closed Beta Access Gate when ShowLyrics macOS is ready for public release. Following these steps restores the application to its standard single-layer license model (watermark license only) without any leftover beta code.

---

### Step 1: Delete Beta Access Python Files
Delete the following 2 files from the `backend/` directory:
- `backend/access_core.py`
- `backend/access_check.py`

---

### Step 2: Clean `backend/main.py`
1. Open `backend/main.py`.
2. Remove `import access_check`.
3. Remove `beta_access_gate` from the `middleware` import and remove `@app.middleware("http") async def beta_access_gate_middleware(...)`.
4. Remove `app.include_router(access_check.router)` and `access_check.inject_manager(manager)`.
5. In `lifespan`, remove `await asyncio.to_thread(access_check.startup_access_check)`, `asyncio.create_task(access_check.start_periodic_access_monitor())`, and `access_check.stop_periodic_access_monitor()`.
6. In `@app.websocket("/ws")`, remove the `access_check.is_access_valid()` pre-connect and in-loop guards.

---

### Step 3: Clean `backend/middleware.py` & `backend/routes_pages.py`
1. Open `backend/middleware.py` and remove `import access_check`, `_BETA_OUTPUT_PAGES`, `_BETA_CONTROL_PAGES`, `_render_beta_locked_html()`, and `beta_access_gate()`.
2. Open `backend/routes_pages.py`, remove `import access_check`, and revert `/control` and `/diagnostic` to render templates directly without access checks.

---

### Step 4: Clean `backend/templates/index.html` & `tools/obf.json`
1. Open `backend/templates/index.html`.
2. Remove the `#mac-beta-modal` HTML block, its `.beta-*` CSS rules, and the `#beta-status-badge` header badge.
3. Update `.brand-ver` from `Engine Build V.1.35.4.1 (BETA VERSION)` to the release version string.
4. Revert the `SHOWLYRICS CONTROLLER` anchor to `<a href="/control" class="launch-card mode-reguler">`.
5. Remove `checkBetaAccessOnLoad()`, `handleLaunchControl()`, `openBetaModal()`, `closeBetaModal()`, and `submitBetaAccessCode()`.
6. Remove the Beta Access symbols from `tools/obf.json` `reservedNames` and remove `'access_check', 'access_core'` from `backend/ShowLyrics-macos.spec`.

---

### Step 5: Clean `firebase.rules` & CI Smoke Test
1. Open `firebase.rules` and remove the `match /access/{accessId} { ... }` security rules block.
2. Open `.github/workflows/build-macos.yml` and remove the Beta Access redirect/403 assertions from Step `9b` Smoke Test.
