(function () {
  const AUTH_BASE_URL = 'http://127.0.0.1:8000';
  const STORAGE_TOKEN = 'relay_auth_token';

  function saveToken(token) {
    try {
      localStorage.setItem(STORAGE_TOKEN, token);
    } catch (_) {}
  }

  function getToken() {
    try {
      return localStorage.getItem(STORAGE_TOKEN);
    } catch (_) {
      return null;
    }
  }

  function redirectToApp() {
    window.location.href = 'index.html';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const existing = getToken();
    if (existing) {
      redirectToApp();
      return;
    }

    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('login-submit');
    const errorEl = document.getElementById('login-error');
    const authUrlEl = document.getElementById('login-auth-url');

    if (authUrlEl) authUrlEl.textContent = AUTH_BASE_URL;

    if (!form || !emailInput || !passwordInput || !submitBtn) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorEl.textContent = '';

      const email = emailInput.value.trim();
      const password = passwordInput.value;
      if (!email || !password) {
        errorEl.textContent = 'Please enter email and password.';
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = 'Signing in…';

      try {
        const body = new URLSearchParams();
        body.set('username', email);
        body.set('password', password);

        const resp = await fetch(`${AUTH_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        });

        if (!resp.ok) {
          if (resp.status === 400 || resp.status === 401) {
            errorEl.textContent = 'Incorrect email or password.';
          } else {
            errorEl.textContent = `Login failed (status ${resp.status}).`;
          }
          return;
        }

        const data = await resp.json();
        if (!data || !data.access_token) {
          errorEl.textContent = 'Login failed: invalid server response.';
          return;
        }

        saveToken(data.access_token);
        redirectToApp();
      } catch (err) {
        const msg = err && err.message ? err.message : String(err);
        if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
          errorEl.textContent = 'Cannot reach auth server. Make sure it is running on http://127.0.0.1:8000.';
        } else {
          errorEl.textContent = 'Login failed: ' + msg;
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log in';
      }
    });
  });
})();

