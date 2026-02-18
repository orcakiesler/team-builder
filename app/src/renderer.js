/**
 * Entry: wires Run button, Add competition/swimmer, Refresh, and init.
 * Modules in renderer/ provide: utils, state, api, teams, modals, swimmers, import, meetSelector.
 */
(function () {
  const state = window.RelayApp.state;
  const api = window.RelayApp.api;
  const modals = window.RelayApp.modals;
  const runBtn = document.getElementById('run-btn');
  const runHint = document.getElementById('run-hint');
  const resultsSection = document.getElementById('results-section');
  const addCompetitionBtn = document.getElementById('add-competition-btn');
  const addSwimmerBtn = document.getElementById('add-swimmer-btn');
  const refreshSwimmersBtn = document.getElementById('refresh-swimmers-btn');

  if (runBtn) {
    runBtn.addEventListener('click', async () => {
      api.setLoading('Building teams…');
      runBtn.disabled = true;
      try {
        await api.ensureDbPath();
        const meet = state.currentCompetitions.find((c) => c.id === state.selectedMeetId);
        const meetStartDate = meet ? meet.start_date : null;
        const data = await window.electronAPI.runBackend({
          command: 'build-teams',
          dbPath: state.dbPath,
          meetStartDate: meetStartDate || undefined,
          competitionId: state.selectedMeetId ?? undefined,
        });
        state.lastTeamsResult = data;
        if (data.swimmers && Array.isArray(data.swimmers)) {
          state.currentSwimmers = data.swimmers;
        }
        if (window.RelayApp.teams && window.RelayApp.teams.renderTeams) {
          window.RelayApp.teams.renderTeams(data.teams);
        }
        if (window.RelayApp.swimmers && window.RelayApp.swimmers.renderSwimmers) {
          window.RelayApp.swimmers.renderSwimmers(state.currentSwimmers);
        }
        if (resultsSection) resultsSection.classList.remove('hidden');
        if (state.selectedMeetId != null) {
          window.RelayApp.setLastTeamsForMeet(state.selectedMeetId, data);
          window.RelayApp.setLastMeetId(state.selectedMeetId);
        }
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
        runBtn.disabled = false;
      }
    });
  }

  if (addCompetitionBtn && modals && modals.openAddCompetitionModal) {
    addCompetitionBtn.addEventListener('click', () => modals.openAddCompetitionModal());
  }

  if (addSwimmerBtn) {
    addSwimmerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      api.clearLoading();
      if (modals && modals.resetAddSwimmerForm) modals.resetAddSwimmerForm();
      const addSwimmerModal = document.getElementById('add-swimmer-modal-overlay');
      if (addSwimmerModal) addSwimmerModal.classList.remove('hidden');
      addSwimmerBtn.blur();
      setTimeout(() => {
        const first = document.getElementById('new-first-name');
        if (first) {
          first.focus();
          first.removeAttribute('readonly');
          first.disabled = false;
        }
      }, 100);
    });
  }

  if (refreshSwimmersBtn) {
    refreshSwimmersBtn.addEventListener('click', () => api.loadSwimmers());
  }

  const exportPdfBtn = document.getElementById('export-teams-pdf-btn');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', async () => {
      const result = state.lastTeamsResult;
      if (!result || !result.teams || Object.keys(result.teams).length === 0) {
        alert('Build teams first, then export to PDF.');
        return;
      }
      const meet = state.currentCompetitions.find((c) => c.id === state.selectedMeetId);
      const meetName = meet ? (meet.name || 'Relay Teams') : 'Relay Teams';
      const meetDate = meet && (meet.start_date || meet.end_date)
        ? [meet.start_date, meet.end_date].filter(Boolean).join(' – ')
        : null;
      const meetLocation = meet && meet.location ? meet.location : null;
      try {
        const out = await window.electronAPI.exportTeamsToPdf({
          meetName,
          meetDate,
          meetLocation,
          teams: result.teams,
        });
        if (out && out.canceled) return;
        if (out && out.path) alert('PDF saved to:\n' + out.path);
      } catch (err) {
        alert('Export failed: ' + (err.message || String(err)));
      }
    });
  }

  (async function init() {
    api.setLoading('Loading…');
    const swimmersList = document.getElementById('swimmers-list');
    if (swimmersList) swimmersList.innerHTML = '<p class="text-muted">Loading swimmers…</p>';
    try {
      await api.ensureDbPath();
      try {
        const data = await window.electronAPI.requestInitialSwimmers();
        state.currentSwimmers = data.swimmers || [];
        if (window.RelayApp.swimmers && window.RelayApp.swimmers.renderSwimmers) {
          window.RelayApp.swimmers.renderSwimmers(state.currentSwimmers);
        }
        if (runHint) runHint.textContent = 'Select a meet and build teams, or update from the app';
      } catch (_) {
        await api.loadSwimmers();
      }
      api.setLoading('Loading meets…');
      await api.loadCompetitions();
    } finally {
      api.clearLoading();
    }
  })();
})();
