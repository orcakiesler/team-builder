/**
 * Entry: wires Run button, Admin, Add swimmer, Refresh, and init.
 * Modules in renderer/ provide: utils, state, api, teams, modals, admin, swimmers, import, meetSelector.
 */
(function () {
  const state = window.RelayApp.state;
  const getAuthToken = window.RelayApp.getAuthToken;

  // Simple guard: if not authenticated, send user back to login page.
  try {
    const token = getAuthToken && getAuthToken();
    if (!token) {
      window.location.href = 'login.html';
      return;
    }
  } catch (_) {
    window.location.href = 'login.html';
    return;
  }
  const api = window.RelayApp.api;
  const modals = window.RelayApp.modals;
  const runBtn = document.getElementById('run-btn');
  const runHint = document.getElementById('run-hint');
  const resultsSection = document.getElementById('results-section');
  const openAdminBtn = document.getElementById('open-admin-btn');
  const addSwimmerBtn = document.getElementById('add-swimmer-btn');
  const refreshSwimmersBtn = document.getElementById('refresh-swimmers-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const topBar = document.querySelector('.top-bar');
  const meetTeamsBar = document.getElementById('meet-teams-section');
  const swimmerProfileSection = document.getElementById('swimmer-profile-section');
  const swimmerProfileContent = document.getElementById('swimmer-profile-content');
  const swimmerProfileEditBtn = document.getElementById('swimmer-profile-edit-btn');

  function applyRoleVisibility(user) {
    const role = user && user.role ? user.role : 'coach';
    const isAdmin = role === 'admin';
    const isSwimmer = role === 'swimmer';
    if (openAdminBtn) openAdminBtn.style.display = isAdmin ? '' : 'none';
    if (topBar) topBar.style.display = isSwimmer ? 'none' : '';
    if (meetTeamsBar) meetTeamsBar.style.display = isSwimmer ? 'none' : '';
    if (resultsSection) resultsSection.style.display = isSwimmer ? 'none' : '';
    if (swimmerProfileSection) swimmerProfileSection.classList.toggle('hidden', !isSwimmer);
  }

  function _normEmail(e) {
    return (e || '').trim().toLowerCase();
  }

  async function loadMyProfile() {
    if (!state.currentUser || state.currentUser.role !== 'swimmer' || !swimmerProfileContent) return;
    let sid = state.currentUser.swimmer_id;
    try {
      await api.ensureDbPath();
      const data = await window.electronAPI.runBackend({ command: 'list-swimmers', dbPath: state.dbPath });
      const swimmers = data.swimmers || [];
      let me = sid != null ? swimmers.find(function (s) { return s.id === sid; }) : null;
      if (!me && state.currentUser.email) {
        const loginEmail = _normEmail(state.currentUser.email);
        me = swimmers.find(function (s) {
          const swimmerEmail = _normEmail(s.email);
          return swimmerEmail && swimmerEmail === loginEmail;
        }) || null;
        if (me) sid = me.id;
      }
      if (sid == null || !me) {
        swimmerProfileContent.innerHTML = '<p class="text-muted">No profile linked. Add your email to your swimmer profile (coach does this), or sign up with the same email—or ask your coach to link your account.</p>';
        if (swimmerProfileEditBtn) swimmerProfileEditBtn.style.display = 'none';
        return;
      }
      if (!me) {
        swimmerProfileContent.innerHTML = '<p class="text-muted">Profile not found. Contact your coach or admin.</p>';
        if (swimmerProfileEditBtn) swimmerProfileEditBtn.style.display = 'none';
        return;
      }
      state.currentSwimmers = [me];
      const utils = window.RelayApp.utils;
      const esc = utils && utils.escapeHtml ? utils.escapeHtml : function (s) { return (s == null ? '' : String(s)); };
      swimmerProfileContent.innerHTML =
        '<div class="swimmer-profile-card">' +
        '<dl><dt>Name</dt><dd>' + esc(me.full_name) + '</dd>' +
        '<dt>Birth year</dt><dd>' + esc(me.year_of_birth) + '</dd>' +
        '<dt>Gender</dt><dd>' + (me.gender === 'm' ? 'Male' : me.gender === 'f' ? 'Female' : '—') + '</dd>' +
        '<dt>Team</dt><dd>' + esc(me.team) + '</dd>' +
        (me.medical_date ? '<dt>Medical date</dt><dd>' + esc(me.medical_date) + '</dd>' : '') +
        '</dl></div>';
      if (swimmerProfileEditBtn) {
        swimmerProfileEditBtn.style.display = '';
        swimmerProfileEditBtn.onclick = function () {
          if (modals && modals.openEditModal) modals.openEditModal(me);
        };
      }
    } catch (err) {
      swimmerProfileContent.innerHTML = '<p class="text-muted">Could not load profile: ' + (err.message || String(err)) + '</p>';
      if (swimmerProfileEditBtn) swimmerProfileEditBtn.style.display = 'none';
    }
  }

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

  if (openAdminBtn && window.RelayApp.admin && window.RelayApp.admin.openAdminPanel) {
    openAdminBtn.addEventListener('click', () => window.RelayApp.admin.openAdminPanel());
  }

  if (logoutBtn && window.RelayApp.clearAuthToken) {
    logoutBtn.addEventListener('click', () => {
      try {
        window.RelayApp.clearAuthToken();
      } catch (_) {}
      window.location.href = 'login.html';
    });
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
    if (swimmersList) swimmersList.innerHTML = '<p class="text-muted">Loading…</p>';
    try {
      const me = await api.fetchAuthMe();
      state.currentUser = me ? {
        role: me.role || 'coach',
        swimmer_id: me.swimmer_id != null ? me.swimmer_id : null,
        email: (me.email || '').trim() || null,
      } : null;
      applyRoleVisibility(state.currentUser);

      if (state.currentUser && state.currentUser.role === 'swimmer') {
        await loadMyProfile();
        api.clearLoading();
        return;
      }

      await api.ensureDbPath();
      try {
        const teamsData = await window.electronAPI.runBackend({ command: 'list-teams', dbPath: state.dbPath });
        window.RelayApp.TEAMS = Array.isArray(teamsData.teams) ? teamsData.teams : ['Haifa - masters'];
      } catch (_) {
        window.RelayApp.TEAMS = ['Haifa - masters'];
      }
      try {
        const relayData = await window.electronAPI.runBackend({ command: 'list-relay-types', dbPath: state.dbPath });
        window.RelayApp.AVAILABILITY_KEYS = Array.isArray(relayData.relay_types) ? relayData.relay_types : ['freestyle', 'medley', 'freestyle_mix', 'medley_mix'];
      } catch (_) {
        window.RelayApp.AVAILABILITY_KEYS = ['freestyle', 'medley', 'freestyle_mix', 'medley_mix'];
      }
      api.setLoading('Loading meets…');
      await api.loadCompetitions();
      await api.loadSwimmers();
      if (runHint) runHint.textContent = 'Select a meet and build teams, or update from the app';
    } catch (err) {
      if (runHint) runHint.textContent = (runHint.textContent ? runHint.textContent + ' ' : '') + (err.message || String(err));
    } finally {
      api.clearLoading();
    }
  })();
})();
