# Let friends “install and use” (no Poetry, no servers for them)

Your friends should only **install the app and use it**. You run the auth server once on the internet; the app talks to it.

## 1. You: deploy the auth server once

1. Pick a host (e.g. [Render](https://render.com) or [Railway](https://railway.app)).
2. Create a new **Web Service** and connect your repo (or upload the `auth-backend` folder).
3. Set the start command to:
   ```bash
   cd auth-backend && pip install -r requirements.txt && uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```
   (If the host uses Poetry: `poetry install && poetry run uvicorn app.main:app --host 0.0.0.0 --port 8000`.)
4. In the host’s **Environment** set at least:
   - `AUTH_SECRET_KEY` = a long random string (e.g. from a password generator)
   - `AUTH_DATABASE_URL` = e.g. `sqlite:///./auth.db` (or a Postgres URL if the host provides one)
5. Deploy. The host will give you a URL, e.g. `https://relay-auth.onrender.com`.

## 2. You: point the app at that URL and build the installer

1. Open **`app/src/auth-config.js`**.
2. Change the line to your deployed URL:
   ```javascript
   window.RELAY_AUTH_BASE_URL = 'https://your-actual-url.onrender.com';
   ```
   (No slash at the end.)
3. Build the installer:
   ```bash
   cd app
   npm run build:html
   npm run dist
   ```
4. In `app/dist/` you’ll get the installer (e.g. `Relay Team Builder Setup 0.1.0.exe`).

## 3. Friends: install and use

- Send them the **single installer file**.
- They run it, install, open the app.
- They sign up (Create account) or log in. Everything goes to your auth server; they don’t install Poetry or run any server.

## Render: if the build fails ("Exited with status 1")

1. On Render, open your service → **Logs**.
2. Click the **failed** deploy (red X).
3. In the log, find the **build** section (not "Starting service"). Scroll to the **bottom** of the build output.
4. The last few lines usually show the real error (e.g. `ModuleNotFoundError`, `No such file or directory`, `could not find requirements.txt`). Copy those lines so we can fix the exact issue.

**Manual service setup (no Root Directory):** Leave **Root Directory** empty. Use:
- **Build command:** `cd auth-backend && pip install -r requirements.txt`
- **Start command:** `cd auth-backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`

**Python version:** If the build fails with `maturin` / `pydantic-core` / "Read-only file system", Render may be using a Python version (e.g. 3.14) that has no pre-built wheels. The repo includes a **`.python-version`** file set to `3.11.7` so Render uses a version with wheels. Commit and push `.python-version` (at repo root and/or in `auth-backend/`), then redeploy.

**Optional:** The repo has a `render.yaml` blueprint. You can create a new Blueprint from the repo and Render will use it, or keep your current service and just fix the commands above.

## Summary

| Who        | Does what |
|-----------|-----------|
| **You**   | Deploy auth-backend once; set URL in `auth-config.js`; run `npm run dist`; share the .exe. |
| **Friends** | Install the app and use it (sign up / log in like a normal app). |
