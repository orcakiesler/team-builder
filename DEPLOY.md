# Let friends “install and use” (no Poetry, no servers for them)

Your friends should only **install the app and use it**. You run the auth server once on the internet; the app talks to it.

**Deployment branch:** For now, Render tracks **`app/deployment`** so you can test deploys there. Push/merge into `app/deployment` to trigger a deploy. Once everything works, merge to `main` and you can switch Render back to `main` if you like.

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
   - `AUTH_DATABASE_URL` = see **Persistent database** below (do not rely on default SQLite on Render free tier).
5. Deploy. The host will give you a URL, e.g. `https://relay-auth.onrender.com`.

### Persistent database (recommended on Render)

On Render's free tier, the app filesystem is **ephemeral**: when the service sleeps and wakes, the container is new and **SQLite data is lost** (accounts disappear, login fails). To keep users and invite codes:

1. In the same Render account, create a **PostgreSQL** database: **New** → **PostgreSQL**. Name it (e.g. `relay-auth-db`). Region should match your auth web service.
2. After it's created, open the DB → **Info** (or **Connect**) and copy the **Internal Database URL** (starts with `postgres://`).
3. In your **auth web service** → **Environment**, add or set:
   - **Key:** `AUTH_DATABASE_URL`
   - **Value:** paste the Internal Database URL (e.g. `postgres://user:pass@dpg-xxx.oregon-postgres.render.com/dbname`)
4. Save. Redeploy the auth service. On startup it will create tables in Postgres; users and invite codes will persist across restarts and sleep/wake.

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

## 3. Linking swimmers, coaches, and admins

**Swimmers:** Add each swimmer's **email** on their profile (Edit swimmer). They create an account with that same email and choose **Swimmer**; the app matches by email and shows "My profile". Optional: **Admin** → **Invite swimmers** still lets you generate a one-time code per swimmer.
**Coaches and admins:** Admin → Invite coaches & admins → Get coach invite code or Get admin invite code. Send the code; they enter it when creating an account. **Where to see coaches:** Admin → User accounts lists all users (admins, coaches, swimmers).
- (obsolete) They open the app, click **Create account**, choose **Swimmer**, enter the **Invite code**, then email and password. Their account is linked to that swimmer; they only see “My profile” for that swimmer.


## 4. Friends: install and use

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
| **You**   | Push to your deploy branch (e.g. `app/deployment` for now); set URL in `auth-config.js`; run `npm run dist`; share the .exe. |
| **Friends** | Install the app and use it (sign up / log in like a normal app). |
