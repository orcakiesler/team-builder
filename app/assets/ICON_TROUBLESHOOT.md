# Icon still shows the old one?

The build only reads **one** icon file: **`app/assets/relay-app.ico`**. There is no other .ico used. If the built exe still shows the wrong icon, do this:

## 1. Confirm the file is really the new icon

- Open **`C:\Users\GilKiesler\dev\team-builder\app\assets\relay-app.ico`** in Windows (double-click or preview).
- If you see the wrong icon, replace the file: put your correct icon in `app\assets\` and name it exactly **`relay-app.ico`**.

## 2. Clear all caches and rebuild

In PowerShell or Command Prompt, from the **`app`** folder:

```bash
npm run clean
npm run dist
```

`npm run clean` deletes:
- **`dist`** (build output)
- **`%LOCALAPPDATA%\electron-builder\Cache`** (electron-builder cache that can keep the old icon)

Then `npm run dist` does a full rebuild using **only** `app/assets/relay-app.ico`.

## 3. If it still shows the old icon

Then **`app\assets\relay-app.ico`** on disk is still the wrong file (e.g. wrong folder, save didn’t overwrite, or a copy elsewhere). Check:

- You’re editing the repo at **`C:\Users\GilKiesler\dev\team-builder\app\assets\`**, not another clone or folder.
- After replacing the file, save and confirm in Explorer that **Date modified** on `relay-app.ico` is recent.
- Open `app\assets\relay-app.ico` again and confirm it shows the right icon before running `npm run clean` and `npm run dist`.
