(function () {
  window.RelayApp = window.RelayApp || {};
  const state = window.RelayApp.state;
  const loadingEl = document.getElementById('loading');
  const pathBestTimes = document.getElementById('path-best-times');
  const pathNamesRelays = document.getElementById('path-names-relays');
  const runHint = document.getElementById('run-hint');

  async function ensureDbPath() {
    if (!state.dbPath) state.dbPath = await window.electronAPI.getDbPath();
    return state.dbPath;
  }

  function setLoading(msg) {
    if (loadingEl) {
      loadingEl.textContent = msg || 'Loading…';
      loadingEl.classList.remove('hidden');
    }
  }

  function clearLoading() {
    if (loadingEl) loadingEl.classList.add('hidden');
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
      const data = await window.electronAPI.runBackend({ command: 'list-swimmers', dbPath: state.dbPath });
      state.currentSwimmers = data.swimmers || [];
      if (window.RelayApp.swimmers && window.RelayApp.swimmers.renderSwimmers) {
        window.RelayApp.swimmers.renderSwimmers(state.currentSwimmers);
      }
      if (runHint) runHint.textContent = 'Import Excel files to add/update swimmers. Build teams uses the database.';
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
    ensureDbPath,
    setLoading,
    clearLoading,
    getPaths,
    loadSwimmers,
    loadCompetitions,
  };
})();
