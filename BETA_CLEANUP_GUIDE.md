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
3. Remove `app.include_router(access_check.router)`.
4. Remove `access_check.startup_access_check()` from the `@app.on_event("startup")` block.

---

### Step 3: Clean `backend/routes_pages.py`
1. Open `backend/routes_pages.py`.
2. Remove `import access_check`.
3. Revert the `/control` route handler to render `control.html` directly without access check:
   ```python
   @router.get("/control", response_class=HTMLResponse)
   async def get_control(request: Request):
       return templates.TemplateResponse("control.html", {"request": request})
   ```

---

### Step 4: Clean `backend/templates/index.html`
1. Open `backend/templates/index.html`.
2. Remove the `#mac-beta-modal` HTML div block.
3. Revert the `SHOWLYRICS CONTROLLER` card anchor to standard link:
   ```html
   <a href="/control" class="launch-card mode-reguler">
   ```
4. Remove `checkBetaAccess()` and `submitBetaAccessCode()` script functions.

---

### Step 5: Clean `firebase.rules`
1. Open `firebase.rules`.
2. Remove the `match /access/{accessId} { ... }` security rules block.
