(function () {
  const AUTH_BASE_URL = window.RELAY_AUTH_BASE_URL || 'http://127.0.0.1:8000';
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
    // Prefer built file so admin panel (and User accounts section) is included
    window.location.href = 'index.generated.html';
  }

  document.addEventListener('DOMContentLoaded', () => {
    const existing = getToken();
    if (existing) {
      redirectToApp();
      return;
    }

    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const form = document.getElementById('login-form');
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('login-submit');
    const errorEl = document.getElementById('login-error');
    const authUrlEl = document.getElementById('login-auth-url');
    const signupForm = document.getElementById('signup-form');
    const signupEmail = document.getElementById('signup-email');
    const signupRole = document.getElementById('signup-role');
    const signupPassword = document.getElementById('signup-password');
    const signupPasswordConfirm = document.getElementById('signup-password-confirm');
    const signupSubmitBtn = document.getElementById('signup-submit');
    const signupErrorEl = document.getElementById('signup-error');

    if (authUrlEl) authUrlEl.textContent = AUTH_BASE_URL;

    function showLogin() {
      if (loginView) loginView.classList.remove('hidden');
      if (signupView) signupView.classList.add('hidden');
      if (errorEl) errorEl.textContent = '';
      if (signupErrorEl) signupErrorEl.textContent = '';
    }
    function showSignup() {
      if (loginView) loginView.classList.add('hidden');
      if (signupView) signupView.classList.remove('hidden');
      if (errorEl) errorEl.textContent = '';
      if (signupErrorEl) signupErrorEl.textContent = '';
    }

    const showSignupLink = document.getElementById('show-signup');
    const showLoginLink = document.getElementById('show-login');
    if (showSignupLink) showSignupLink.addEventListener('click', (e) => { e.preventDefault(); showSignup(); });
    if (showLoginLink) showLoginLink.addEventListener('click', (e) => { e.preventDefault(); showLogin(); });

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
          errorEl.textContent = 'Cannot reach auth server. Check your connection and that the server is running.';
        } else {
          errorEl.textContent = 'Login failed: ' + msg;
        }
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Log in';
      }
    });

    if (signupForm && signupEmail && signupPassword && signupPasswordConfirm && signupSubmitBtn && signupErrorEl) {
      signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        signupErrorEl.textContent = '';

        const email = signupEmail.value.trim();
        const password = signupPassword.value;
        const confirm = signupPasswordConfirm.value;
        if (!email || !password) {
          signupErrorEl.textContent = 'Please enter email and password.';
          return;
        }
        if (password.length < 6) {
          signupErrorEl.textContent = 'Password must be at least 6 characters.';
          return;
        }
        if (password !== confirm) {
          signupErrorEl.textContent = 'Passwords do not match.';
          return;
        }

        signupSubmitBtn.disabled = true;
        signupSubmitBtn.textContent = 'Creating account…';

        const role = (signupRole && signupRole.value) || 'coach';
        try {
          const resp = await fetch(`${AUTH_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
            body: JSON.stringify({ email, password, role }),
          });

          if (!resp.ok) {
            const errData = await resp.json().catch(() => ({}));
            const detail = errData.detail || (typeof errData.detail === 'string' ? errData.detail : '');
            if (resp.status === 400 && (detail === 'Email already registered' || (detail && detail.includes('already')))) {
              signupErrorEl.textContent = 'This email is already registered. Sign in instead.';
            } else {
              signupErrorEl.textContent = detail || `Sign up failed (status ${resp.status}).`;
            }
            return;
          }

          // Account created; log them in and go to app
          const loginBody = new URLSearchParams();
          loginBody.set('username', email);
          loginBody.set('password', password);
          const loginResp = await fetch(`${AUTH_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: loginBody.toString(),
          });
          if (loginResp.ok) {
            const loginData = await loginResp.json();
            if (loginData && loginData.access_token) {
              saveToken(loginData.access_token);
              redirectToApp();
              return;
            }
          }
          showLogin();
          if (errorEl) errorEl.textContent = '';
          if (emailInput) emailInput.value = email;
          if (passwordInput) passwordInput.value = '';
          alert('Account created. Please sign in.');
        } catch (err) {
          const msg = err && err.message ? err.message : String(err);
          if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
            signupErrorEl.textContent = 'Cannot reach auth server. Check your connection and that the server is running.';
          } else {
            signupErrorEl.textContent = 'Sign up failed: ' + msg;
          }
        } finally {
          signupSubmitBtn.disabled = false;
          signupSubmitBtn.textContent = 'Create account';
        }
      });
    }
  });
})();

