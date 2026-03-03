(function () {
  window.RelayApp = window.RelayApp || {};
  const state = window.RelayApp.state;
  const loadingOverlay = document.getElementById('loading');
  const loadingMessage = document.getElementById('loading-message');
  const pathBestTimes = document.getElementById('path-best-times');
  const pathNamesRelays = document.getElementById('path-names-relays');
  const runHint = document.getElementById('run-hint');

  const AUTH_BASE_URL = window.RELAY_AUTH_BASE_URL || 'http://127.0.0.1:8000';

  async function fetchAuthMe() {
    const token = window.RelayApp.getAuthToken && window.RelayApp.getAuthToken();
    if (!token) return null;
    const resp = await fetch(`${AUTH_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!resp.ok) return null;
    return resp.json();
  }

  async function ensureDbPath() {
    if (!state.dbPath) state.dbPath = await window.electronAPI.getDbPath();
    return state.dbPath;
  }

  function setLoading(msg) {
    if (loadingMessage) loadingMessage.textContent = msg || 'Loading…';
    if (loadingOverlay) loadingOverlay.classList.remove('hidden');
  }

  function clearLoading() {
    if (loadingOverlay) loadingOverlay.classList.add('hidden');
  }

  function getPaths() {
    return {
      bestTimesPath: (pathBestTimes && pathBestTimes.value || '').trim() || null,
      namesRelaysPath: (pathNamesRelays && pathNamesRelays.value || '').trim() || null,
    };
  }

  async function loadSwimmers() {
    setLoading('Loading swimmers…');
    try {
      await ensureDbPath();
      const data = await window.electronAPI.runBackend({ command: 'list-swimmers', dbPath: state.dbPath, competitionId: state.selectedMeetId ?? undefined });
      state.currentSwimmers = data.swimmers || [];
      if (window.RelayApp.swimmers && window.RelayApp.swimmers.renderSwimmers) {
        window.RelayApp.swimmers.renderSwimmers(state.currentSwimmers);
      }
      if (runHint) runHint.textContent = 'Select a meet and build teams, or update from the app';
    } catch (err) {
      state.currentSwimmers = [];
      if (window.RelayApp.swimmers && window.RelayApp.swimmers.renderSwimmers) {
        window.RelayApp.swimmers.renderSwimmers([]);
      }
      if (runHint) runHint.textContent = 'Could not load swimmers: ' + (err.message || String(err));
    } finally {
      clearLoading();
    }
  }

  async function loadCompetitions() {
    try {
      await ensureDbPath();
      const data = await window.electronAPI.runBackend({ command: 'list-competitions', dbPath: state.dbPath });
      if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.renderCompetitions) {
        window.RelayApp.meetSelector.renderCompetitions(data.competitions || []);
      }
      if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.restoreLastMeetAndTeams) {
        await window.RelayApp.meetSelector.restoreLastMeetAndTeams();
      }
    } catch (err) {
      if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.renderCompetitions) {
        window.RelayApp.meetSelector.renderCompetitions([]);
      }
      if (runHint) runHint.textContent = (runHint.textContent ? runHint.textContent + ' ' : '') + ('Could not load meets: ' + (err.message || String(err)));
    }
  }

  window.RelayApp.api = {
    AUTH_BASE_URL,
    ensureDbPath,
    setLoading,
    clearLoading,
    getPaths,
    loadSwimmers,
    loadCompetitions,
    fetchAuthMe,
  };
})();
