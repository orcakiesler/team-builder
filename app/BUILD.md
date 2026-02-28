# Building the desktop app

## Create an installable app (Windows)

From the `app` folder:

```bash
npm run dist
```

This produces:

- **`dist/Relay Team Builder Setup 0.1.0.exe`** – run this to install the app.
- **`dist/win-unpacked/`** – portable folder (no install); run `Relay Team Builder.exe` inside it.

After installation, you get a Start Menu entry and can pin the app to the taskbar or desktop.

## Requirements for the installed app

- **Python and Poetry** must be installed and on your PATH. The app bundles the backend code and runs `poetry run python ...` from that folder when you use “Build teams”, “Import files”, etc.
- The **first time** you do something that uses the backend (e.g. the app loads meets, or you click "Build teams"), the app runs `poetry install` in the bundled backend so dependencies (pandas, openpyxl, etc.) are installed. That can take 30–60 seconds; the UI will show "Loading…" until it finishes. After that, backend commands run as usual.

## Custom icon

Place your icon at **`app/assets/relay-app.ico`** (256×256, 32-bit with transparency if needed). The build uses `buildResources: "assets"` and `icon: "relay-app.ico"`. Run `npm run dist` after changing the icon.

### Icon doesn’t update on desktop after reinstalling

Windows caches icons, and the shortcut points at the **installed .exe**’s icon. To force the new icon everywhere:

1. **Use the icon you want** – Put the correct icon at `app/assets/relay-app.ico` (the one you want on the desktop).
2. **Clean rebuild** – From the `app` folder: delete the `dist` folder, then run `npm run dist`.
3. **Check the built exe** – Open `dist\win-unpacked\` and look at **Relay Team Builder.exe** in Explorer. If that exe shows the new icon, the build is correct.
4. **Uninstall the old app** – Settings → Apps → Relay Team Builder → Uninstall. Delete any existing desktop shortcut.
5. **Install the new setup** – Run `dist\Relay Team Builder Setup 0.1.0.exe`. Let it create a new desktop shortcut.
6. **If the shortcut still shows the old icon** – Right‑click the desktop shortcut → Delete. Then: Start Menu → right‑click “Relay Team Builder” → **Open file location** → right‑click **Relay Team Builder.exe** → **Send to** → **Desktop (create shortcut)**. That forces Windows to load the icon from the exe again.
7. **Optional: clear icon cache** – Close all Explorer windows, run in PowerShell (as yourself): `Remove-Item $env:LOCALAPPDATA\IconCache.db -Force -ErrorAction SilentlyContinue; ie4uinit.exe -show` then restart Explorer or log off and back on.

### Large preview in Explorer still shows old icon

Windows caches icons per size. The **small** icon can update while the **large** preview (details pane) keeps the old one. Do this:

1. **Close all File Explorer windows.**
2. **Open PowerShell** (Win+X → Windows PowerShell) and run:
   ```powershell
   Remove-Item $env:LOCALAPPDATA\IconCache.db -Force -ErrorAction SilentlyContinue
   Remove-Item "$env:LOCALAPPDATA\Microsoft\Windows\Explorer\iconcache*" -Force -ErrorAction SilentlyContinue
   ie4uinit.exe -show
   Stop-Process -Name explorer -Force
   ```
   Explorer will restart and rebuild the icon cache; the large preview should then show the new icon.

**Note:** The file you’re looking at is the **installer** (Setup). The icon used for the **desktop shortcut** after install comes from **`dist\win-unpacked\Relay Team Builder.exe`**. Check that exe’s icon too; if that one is correct, the shortcut will be after you clear the cache and recreate it.
