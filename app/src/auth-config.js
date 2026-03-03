/**
 * Auth server URL. The app uses this for login, signup, and /auth/me.
 *
 * - Development (default): run auth-backend locally and leave this as below.
 * - For friends: deploy auth-backend (e.g. Render, Railway), then set this to
 *   your deployed URL (e.g. 'https://relay-auth.onrender.com'), run
 *   "npm run build:html" and "npm run dist", and share the installer.
 *   Friends only install and use—no Poetry or servers.
 */
window.RELAY_AUTH_BASE_URL = 'https://relay-builder-auth.onrender.com';
