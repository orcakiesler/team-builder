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

To use your own app icon:

1. Add `assets/icon.ico` (256×256 recommended).
2. In `package.json`, under `build.win`, add: `"icon": "assets/icon.ico"`.
3. Run `npm run dist` again.
