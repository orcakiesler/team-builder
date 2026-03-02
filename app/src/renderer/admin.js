/**
 * Admin panel: popup for managing meets (add/edit/remove) and teams (add/remove).
 * Main window only shows a read-only meet selector; all editing is in the admin panel.
 */
(function () {
  window.RelayApp = window.RelayApp || {};
  const state = window.RelayApp.state;
  const utils = window.RelayApp.utils;
  const api = window.RelayApp.api;

  const adminOverlay = document.getElementById('admin-panel-overlay');
  const adminCloseBtn = document.getElementById('admin-panel-close');
  const adminMeetsList = document.getElementById('admin-meets-list');
  const adminAddMeetBtn = document.getElementById('admin-add-meet-btn');
  const adminTeamsList = document.getElementById('admin-teams-list');
  const adminNewTeamInput = document.getElementById('admin-new-team-name');
  const adminAddTeamBtn = document.getElementById('admin-add-team-btn');

  function closeAdminPanel() {
    if (adminOverlay) adminOverlay.classList.add('hidden');
  }

  function isAdminPanelOpen() {
    return adminOverlay && !adminOverlay.classList.contains('hidden');
  }

  async function refreshAdminContent() {
    if (!isAdminPanelOpen()) return;
    await refreshMeetsList();
    await refreshTeamsList();
  }

  async function refreshMeetsList() {
    if (!adminMeetsList) return;
    try {
      await api.ensureDbPath();
      const data = await window.electronAPI.runBackend({ command: 'list-competitions', dbPath: state.dbPath });
      const competitions = data.competitions || [];
      state.currentCompetitions = competitions;
      if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.renderCompetitions) {
        window.RelayApp.meetSelector.renderCompetitions(competitions);
      }
      if (competitions.length === 0) {
        adminMeetsList.innerHTML = '<p class="text-muted">No meets yet. Add one below.</p>';
        return;
      }
      adminMeetsList.innerHTML = competitions
        .map(
          (c) =>
            `<div class="admin-meet-row" data-id="${c.id}">
              <div class="admin-meet-row-info">
                <span class="comp-name">${utils.escapeHtml(c.name)}</span>
                <span class="comp-dates">${utils.escapeHtml(c.start_date)} – ${utils.escapeHtml(c.end_date)}</span>
                ${c.location ? `<span class="comp-location">${utils.escapeHtml(c.location)}</span>` : ''}
              </div>
              <div class="admin-meet-row-actions">
                <button type="button" class="btn btn-secondary btn-sm admin-edit-meet-btn" data-id="${c.id}">Edit</button>
                <button type="button" class="btn btn-danger btn-sm admin-remove-meet-btn" data-id="${c.id}">Remove</button>
              </div>
            </div>`
        )
        .join('');

      adminMeetsList.querySelectorAll('.admin-edit-meet-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = parseInt(btn.getAttribute('data-id'), 10);
          const meet = competitions.find((c) => c.id === id);
          if (meet && window.RelayApp.modals && window.RelayApp.modals.openEditCompetitionModal) {
            window.RelayApp.modals.openEditCompetitionModal(meet);
          }
        });
      });
      adminMeetsList.querySelectorAll('.admin-remove-meet-btn').forEach((btn) => {
        btn.addEventListener('click', async (e) => {
          e.stopPropagation();
          const id = parseInt(btn.getAttribute('data-id'), 10);
          if (!confirm('Remove this meet? This cannot be undone.')) return;
          api.setLoading('Removing…');
          try {
            await api.ensureDbPath();
            const data = await window.electronAPI.runBackend({
              command: 'delete-competitions',
              dbPath: state.dbPath,
              payload: { ids: [id] },
            });
            if (state.selectedMeetId === id) state.selectedMeetId = null;
            if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.renderCompetitions) {
              window.RelayApp.meetSelector.renderCompetitions(data.competitions || []);
            }
            if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.updateMeetTriggerText) {
              window.RelayApp.meetSelector.updateMeetTriggerText();
            }
            await refreshMeetsList();
          } catch (err) {
            alert('Error: ' + (err.message || String(err)));
          } finally {
            api.clearLoading();
          }
        });
      });
    } catch (err) {
      adminMeetsList.innerHTML = '<p class="text-muted">Failed to load meets.</p>';
    }
  }

  async function refreshTeamsList() {
    if (!adminTeamsList) return;
    try {
      await api.ensureDbPath();
      const data = await window.electronAPI.runBackend({ command: 'list-teams', dbPath: state.dbPath });
      const teams = Array.isArray(data.teams) ? data.teams : [];
      window.RelayApp.TEAMS = teams;
      adminTeamsList.innerHTML = teams
        .map(
          (name) =>
            `<li class="team-list-item">
              <span>${utils.escapeHtml(name)}</span>
              <button type="button" class="btn btn-danger btn-sm btn-remove-team" data-team="${utils.escapeHtml(name)}">Remove</button>
            </li>`
        )
        .join('');
      adminTeamsList.querySelectorAll('.btn-remove-team').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const teamName = btn.getAttribute('data-team');
          if (!teamName || !confirm(`Remove team "${teamName}"? This will fail if any swimmer is assigned to it.`)) return;
          api.setLoading('Removing…');
          try {
            await api.ensureDbPath();
            const out = await window.electronAPI.runBackend({
              command: 'delete-team',
              dbPath: state.dbPath,
              payload: { name: teamName },
            });
            window.RelayApp.TEAMS = out.teams || [];
            await refreshTeamsList();
          } catch (err) {
            alert('Error: ' + (err.message || String(err)));
          } finally {
            api.clearLoading();
          }
        });
      });
    } catch (err) {
      adminTeamsList.innerHTML = '<li class="text-muted">Failed to load teams.</li>';
    }
  }

  async function openAdminPanel() {
    if (adminOverlay) adminOverlay.classList.remove('hidden');
    await refreshMeetsList();
    await refreshTeamsList();
    if (adminNewTeamInput) setTimeout(() => adminNewTeamInput.focus(), 100);
  }

  if (adminCloseBtn) adminCloseBtn.addEventListener('click', closeAdminPanel);
  if (adminOverlay) {
    adminOverlay.addEventListener('click', (e) => {
      if (e.target === adminOverlay) closeAdminPanel();
    });
  }
  if (adminAddMeetBtn) {
    adminAddMeetBtn.addEventListener('click', () => {
      if (window.RelayApp.modals && window.RelayApp.modals.openAddCompetitionModal) {
        window.RelayApp.modals.openAddCompetitionModal();
      }
    });
  }
  if (adminAddTeamBtn && adminNewTeamInput) {
    adminAddTeamBtn.addEventListener('click', async () => {
      const name = adminNewTeamInput.value.trim();
      if (!name) {
        alert('Enter a team name.');
        return;
      }
      api.setLoading('Adding team…');
      try {
        await api.ensureDbPath();
        const out = await window.electronAPI.runBackend({
          command: 'add-team',
          dbPath: state.dbPath,
          payload: { name },
        });
        window.RelayApp.TEAMS = out.teams || [];
        adminNewTeamInput.value = '';
        await refreshTeamsList();
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
      }
    });
  }

  window.RelayApp.admin = {
    openAdminPanel,
    closeAdminPanel,
    refreshAdminContent,
    refreshMeetsList,
    refreshTeamsList,
    isAdminPanelOpen,
  };
})();
