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
    await refreshTeamCoachesList();
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
                <button type="button" class="btn btn-secondary btn-sm admin-duplicate-meet-btn" data-id="${c.id}" title="Duplicate with new dates">Duplicate</button>
                <button type="button" class="btn btn-secondary btn-sm admin-edit-meet-btn" data-id="${c.id}">Edit</button>
                <button type="button" class="btn btn-danger btn-sm admin-remove-meet-btn" data-id="${c.id}">Remove</button>
              </div>
            </div>`
        )
        .join('');

      adminMeetsList.querySelectorAll('.admin-duplicate-meet-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = parseInt(btn.getAttribute('data-id'), 10);
          const meet = competitions.find((c) => c.id === id);
          if (meet && window.RelayApp.modals && window.RelayApp.modals.openDuplicateMeetModal) {
            window.RelayApp.modals.openDuplicateMeetModal(meet);
          }
        });
      });
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
            `<li class="team-list-item admin-team-row">
              <span class="admin-team-name">${utils.escapeHtml(name)}</span>
              <div class="admin-team-actions">
                <button type="button" class="btn btn-secondary btn-sm admin-bulk-reassign-btn" data-team="${utils.escapeHtml(name)}" title="Reassign all swimmers to another team">Bulk reassign</button>
                <button type="button" class="btn btn-danger btn-sm admin-delete-all-swimmers-btn" data-team="${utils.escapeHtml(name)}" title="Delete all swimmers in this team">Delete all swimmers</button>
                <button type="button" class="btn btn-danger btn-sm btn-remove-team" data-team="${utils.escapeHtml(name)}">Remove team</button>
              </div>
            </li>`
        )
        .join('');
      adminTeamsList.querySelectorAll('.admin-bulk-reassign-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const teamName = btn.getAttribute('data-team');
          if (teamName && window.RelayApp.modals && window.RelayApp.modals.openBulkReassignModal) {
            window.RelayApp.modals.openBulkReassignModal(teamName);
          }
        });
      });
      adminTeamsList.querySelectorAll('.admin-delete-all-swimmers-btn').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const teamName = btn.getAttribute('data-team');
          if (!teamName) return;
          const data = await window.electronAPI.runBackend({ command: 'list-swimmers-by-team', dbPath: state.dbPath, payload: { team: teamName } }).catch(() => ({ count: 0 }));
          const count = data.count || 0;
          if (count === 0) { alert('No swimmers in this team.'); return; }
          if (!confirm(`Delete all ${count} swimmer(s) in "${teamName}"? This cannot be undone.`)) return;
          api.setLoading('Deleting…');
          try {
            await api.ensureDbPath();
            await window.electronAPI.runBackend({ command: 'delete-swimmers-by-team', dbPath: state.dbPath, payload: { team: teamName } });
            window.RelayApp.TEAMS = (await window.electronAPI.runBackend({ command: 'list-teams', dbPath: state.dbPath })).teams || [];
            await refreshTeamsList();
            if (window.RelayApp.swimmers && window.RelayApp.swimmers.renderSwimmers) {
              await api.loadSwimmers();
            }
          } catch (err) {
            alert('Error: ' + (err.message || String(err)));
          } finally {
            api.clearLoading();
          }
        });
      });
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

  const adminTeamCoachesList = document.getElementById('admin-team-coaches-list');
  async function refreshTeamCoachesList() {
    if (!adminTeamCoachesList) return;
    try {
      await api.ensureDbPath();
      const [teamsWithCoachesData, coachesData] = await Promise.all([
        window.electronAPI.runBackend({ command: 'list-teams-with-coaches', dbPath: state.dbPath }),
        window.electronAPI.runBackend({ command: 'list-coaches', dbPath: state.dbPath }),
      ]);
      const teamsWithCoaches = teamsWithCoachesData.teams_with_coaches || [];
      const coaches = coachesData.coaches || [];
      if (teamsWithCoaches.length === 0) {
        adminTeamCoachesList.innerHTML = '<p class="text-muted">No teams. Add a team in the Teams section first.</p>';
        return;
      }
      const coachEmails = new Set(coaches.map((c) => (c.email || '').trim()).filter(Boolean));
      adminTeamCoachesList.innerHTML = teamsWithCoaches
        .map(
          (t) => {
            const teamName = t.team_name || '';
            const assigned = t.coaches || [];
            const assignedSet = new Set(assigned.filter(Boolean));
            const allEmails = new Set([...coachEmails, ...assignedSet]);
            const checkboxes = Array.from(allEmails)
              .sort((a, b) => a.localeCompare(b))
              .map(
                (email) => {
                  const c = coaches.find((x) => (x.email || '').trim() === email);
                  const label = (c && c.name && c.name.trim()) ? utils.escapeHtml(c.name) + ' (' + utils.escapeHtml(email) + ')' : utils.escapeHtml(email);
                  const checked = assignedSet.has(email) ? ' checked' : '';
                  return `<label class="checkbox-label admin-team-coach-cb"><input type="checkbox" data-team="${utils.escapeHtml(teamName)}" data-email="${utils.escapeHtml(email)}"${checked} /> ${label}</label>`;
                }
              )
              .join('');
            return `<div class="admin-team-coach-row"><span class="admin-team-coach-team-name">${utils.escapeHtml(teamName)}</span><div class="admin-team-coach-checkboxes">${checkboxes || '<span class="text-muted">No coaches in app yet.</span>'}</div></div>`;
          }
        )
        .join('');
      adminTeamCoachesList.querySelectorAll('.admin-team-coach-cb input').forEach((cb) => {
        cb.addEventListener('change', async () => {
          const teamName = cb.getAttribute('data-team');
          if (!teamName) return;
          const row = cb.closest('.admin-team-coach-row');
          const selected = Array.from(row.querySelectorAll('.admin-team-coach-cb input:checked')).map((el) => el.getAttribute('data-email')).filter(Boolean);
          try {
            await window.electronAPI.runBackend({
              command: 'set-team-coaches',
              dbPath: state.dbPath,
              payload: { team_name: teamName, coach_emails: selected },
            });
          } catch (err) {
            alert('Failed to save: ' + (err.message || String(err)));
          }
        });
      });
    } catch (err) {
      adminTeamCoachesList.innerHTML = '<p class="text-muted">Failed to load team coaches.</p>';
    }
  }

  function renderRelayTypesList() {
    const listEl = document.getElementById('admin-relay-types-list');
    if (!listEl) return;
    const keys = window.RelayApp.AVAILABILITY_KEYS || [];
    listEl.innerHTML = keys.length
      ? keys.map((k) => `<span class="admin-relay-type-tag"><span>${utils.escapeHtml(k)}</span> <button type="button" class="btn-link btn-remove-relay-type" data-key="${utils.escapeHtml(k)}" aria-label="Remove">&times;</button></span>`).join('')
      : '<p class="text-muted">No relay types. Add one below.</p>';
    listEl.querySelectorAll('.btn-remove-relay-type').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.getAttribute('data-key');
        const updated = (window.RelayApp.AVAILABILITY_KEYS || []).filter((x) => x !== key);
        window.RelayApp.AVAILABILITY_KEYS = updated;
        renderRelayTypesList();
      });
    });
  }

  async function refreshRelayTypesList() {
    const listEl = document.getElementById('admin-relay-types-list');
    if (!listEl) return;
    try {
      await api.ensureDbPath();
      const data = await window.electronAPI.runBackend({ command: 'list-relay-types', dbPath: state.dbPath });
      const keys = Array.isArray(data.relay_types) ? data.relay_types : [];
      window.RelayApp.AVAILABILITY_KEYS = keys;
      renderRelayTypesList();
    } catch (_) {
      listEl.innerHTML = '<p class="text-muted">Failed to load.</p>';
    }
  }

  const ROLE_ORDER = { admin: 0, coach: 1, swimmer: 2 };

  async function refreshUsersListPopup() {
    const listEl = document.getElementById('admin-users-list-popup');
    const token = window.RelayApp.getAuthToken && window.RelayApp.getAuthToken();
    const baseUrl = window.RELAY_AUTH_BASE_URL || api.AUTH_BASE_URL || 'http://127.0.0.1:8000';
    if (!listEl) return;
    if (!token) {
      listEl.innerHTML = '<p class="text-muted">Sign in required.</p>';
      return;
    }
    try {
      const usersResp = await fetch(`${baseUrl}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!usersResp.ok) {
        listEl.innerHTML = '<p class="text-muted">Could not load users.</p>';
        return;
      }
      const users = await usersResp.json();
      await api.ensureDbPath();
      const [swimmersData, coachesData] = await Promise.all([
        window.electronAPI.runBackend({ command: 'list-swimmers', dbPath: state.dbPath }),
        window.electronAPI.runBackend({ command: 'list-coaches', dbPath: state.dbPath }),
      ]);
      const swimmers = swimmersData.swimmers || [];
      const coaches = coachesData.coaches || [];
      if (users.length === 0) {
        listEl.innerHTML = '<p class="text-muted">No user accounts yet.</p>';
        return;
      }
      const sorted = users.slice().sort(function (a, b) {
        const oa = ROLE_ORDER[a.role] ?? 99;
        const ob = ROLE_ORDER[b.role] ?? 99;
        if (oa !== ob) return oa - ob;
        return (a.email || '').localeCompare(b.email || '');
      });
      function normEmail(e) { return (e || '').trim().toLowerCase(); }
      function oneLine(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
      function displayName(u, linkedSw, coach) {
        if (u.role === 'swimmer' && linkedSw && linkedSw.full_name) return oneLine(linkedSw.full_name);
        if (u.role === 'coach' && coach && coach.name && coach.name.trim()) return oneLine(coach.name);
        return u.email || '—';
      }
      listEl.innerHTML = sorted
        .map(function (u) {
          const roleLabel = u.role === 'admin' ? 'Admin' : u.role === 'coach' ? 'Coach' : u.role === 'swimmer' ? 'Swimmer' : u.role || '—';
          let linkedId = u.swimmer_id != null ? u.swimmer_id : null;
          if (u.role === 'swimmer' && linkedId == null && u.email) {
            const match = swimmers.find(function (s) { return normEmail(s.email) === normEmail(u.email); });
            if (match) linkedId = match.id;
          }
          const linkedSw = linkedId != null ? swimmers.find(function (s) { return s.id === linkedId; }) : null;
          const linkedName = linkedSw ? oneLine(linkedSw.full_name || '') : '';
          const coach = coaches.find(function (c) { return normEmail(c.email) === normEmail(u.email); });
          const name = displayName(u, linkedSw, coach);
          const searchText = (name + ' ' + (u.email || '') + ' ' + roleLabel + ' ' + linkedName).toLowerCase();
          let linkHtml = '';
          if (u.role === 'swimmer') {
            const options = swimmers.map(function (s) {
              const sel = s.id === linkedId ? ' selected' : '';
              const optName = oneLine(s.full_name || '');
              return '<option value="' + (s.id || '') + '"' + sel + '>' + (utils.escapeHtml(optName) + ' (ID ' + s.id + ')') + '</option>';
            }).join('');
            linkHtml =
              '<select class="admin-user-link-select" data-user-id="' + u.id + '">' +
              '<option value="">— No profile —</option>' + options +
              '</select>' +
              '<button type="button" class="btn btn-primary btn-sm admin-user-link-btn" data-user-id="' + u.id + '">Link</button>' +
              '<button type="button" class="btn btn-secondary btn-sm admin-user-invite-btn" data-user-id="' + u.id + '" data-swimmer-id="' + (linkedId != null ? linkedId : '') + '">Get invite code</button>' +
              '<span class="admin-user-invite-result hidden"></span>';
          }
          const metaParts = [roleLabel];
          if (name !== (u.email || '')) metaParts.push(utils.escapeHtml(u.email));
          if (linkedId != null) metaParts.push('ID\u00a0' + linkedId);
          const metaLine = metaParts.join(' · ');
          return (
            '<div class="admin-user-row" data-user-id="' + u.id + '" data-search="' + utils.escapeHtml(searchText) + '">' +
            '<div class="admin-user-row-info">' +
            '<span class="admin-user-display-name">' + utils.escapeHtml(name) + '</span>' +
            '<span class="admin-user-meta">' + metaLine + '</span>' +
            '</div>' +
            (linkHtml ? '<div class="admin-user-row-actions">' + linkHtml + '</div>' : '') +
            '</div>'
          );
        })
        .join('');

      listEl.querySelectorAll('.admin-user-link-btn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          const userId = btn.getAttribute('data-user-id');
          const select = listEl.querySelector('.admin-user-link-select[data-user-id="' + userId + '"]');
          const val = select ? select.value : '';
          const swimmerId = val === '' ? null : parseInt(val, 10);
          try {
            const body = swimmerId != null ? JSON.stringify({ swimmer_id: swimmerId }) : JSON.stringify({ swimmer_id: null });
            const resp = await fetch(`${baseUrl}/admin/users/${userId}/link-swimmer`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
              body: body,
            });
            if (!resp.ok) throw new Error('Link failed');
            await refreshUsersListPopup();
          } catch (err) {
            alert('Error: ' + (err.message || String(err)));
          }
        });
      });

      listEl.querySelectorAll('.admin-user-invite-btn').forEach(function (btn) {
        btn.addEventListener('click', async function () {
          const row = btn.closest('.admin-user-row');
          const userId = row ? row.getAttribute('data-user-id') : null;
          const select = listEl.querySelector('.admin-user-link-select[data-user-id="' + userId + '"]');
          const val = select ? select.value : '';
          let swimmerId = val !== '' ? parseInt(val, 10) : null;
          if (swimmerId == null) {
            const swimmerIdRaw = btn.getAttribute('data-swimmer-id');
            swimmerId = swimmerIdRaw === '' ? null : parseInt(swimmerIdRaw, 10);
          }
          const resultEl = row ? row.querySelector('.admin-user-invite-result') : null;
          if (swimmerId == null || !resultEl) {
            alert('Select a swimmer profile in the dropdown first (or link the user to a profile).');
            return;
          }
          btn.disabled = true;
          btn.textContent = '…';
          try {
            const resp = await fetch(baseUrl + '/admin/invite-codes', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
              body: JSON.stringify({ swimmer_id: swimmerId }),
            });
            if (!resp.ok) throw new Error('Failed to create code');
            const data = await resp.json();
            const code = (data && data.code) || '';
            resultEl.textContent = 'Code: ' + code + ' ';
            resultEl.classList.remove('hidden');
            const copyBtn = document.createElement('button');
            copyBtn.type = 'button';
            copyBtn.className = 'btn btn-primary btn-sm';
            copyBtn.textContent = 'Copy';
            copyBtn.addEventListener('click', function () {
              navigator.clipboard.writeText(code).then(function () { copyBtn.textContent = 'Copied!'; });
            });
            resultEl.appendChild(copyBtn);
          } catch (err) {
            resultEl.textContent = 'Error: ' + (err.message || String(err));
            resultEl.classList.remove('hidden');
          }
          btn.disabled = false;
          btn.textContent = 'Get invite code';
        });
      });
    } catch (err) {
      listEl.innerHTML = '<p class="text-muted">Could not load users: ' + (err.message || String(err)) + '</p>';
    }
  }

  function filterUsersListPopup() {
    const listEl = document.getElementById('admin-users-list-popup');
    const searchEl = document.getElementById('admin-users-list-search');
    if (!listEl || !searchEl) return;
    const q = (searchEl.value || '').trim().toLowerCase();
    listEl.querySelectorAll('.admin-user-row').forEach(function (row) {
      const text = (row.getAttribute('data-search') || '');
      row.style.display = !q || text.indexOf(q) !== -1 ? '' : 'none';
    });
  }

  async function openAdminPanel() {
    if (adminOverlay) adminOverlay.classList.remove('hidden');
    await refreshMeetsList();
    await refreshTeamsList();
    await refreshTeamCoachesList();
    await refreshRelayTypesList();
    if (adminNewTeamInput) setTimeout(() => adminNewTeamInput.focus(), 100);
  }

  async function openUsersListPopup() {
    const overlay = document.getElementById('admin-users-list-modal-overlay');
    const searchEl = document.getElementById('admin-users-list-search');
    if (overlay) overlay.classList.remove('hidden');
    if (searchEl) searchEl.value = '';
    await refreshUsersListPopup();
    if (searchEl) {
      searchEl.oninput = filterUsersListPopup;
      searchEl.onkeyup = filterUsersListPopup;
    }
  }

  function closeUsersListPopup() {
    const overlay = document.getElementById('admin-users-list-modal-overlay');
    if (overlay) overlay.classList.add('hidden');
  }

  const adminBackupDbBtn = document.getElementById('admin-backup-db-btn');
  const adminOpenDbFolderBtn = document.getElementById('admin-open-db-folder-btn');
  const adminRelayTypesList = document.getElementById('admin-relay-types-list');
  const adminNewRelayTypeInput = document.getElementById('admin-new-relay-type');
  const adminAddRelayTypeBtn = document.getElementById('admin-add-relay-type-btn');
  const adminSaveRelayTypesBtn = document.getElementById('admin-save-relay-types-btn');
  const adminResetDbBtn = document.getElementById('admin-reset-db-btn');
  const adminResetClearTeamsCb = document.getElementById('admin-reset-clear-teams');

  if (adminBackupDbBtn) {
    adminBackupDbBtn.addEventListener('click', async () => {
      try {
        const out = await window.electronAPI.backupDatabase();
        if (out && !out.canceled && out.path) alert('Database backed up to:\n' + out.path);
      } catch (err) {
        alert('Backup failed: ' + (err.message || String(err)));
      }
    });
  }
  if (adminOpenDbFolderBtn) {
    adminOpenDbFolderBtn.addEventListener('click', async () => {
      try {
        await window.electronAPI.openDatabaseFolder();
      } catch (err) {
        alert('Failed to open folder: ' + (err.message || String(err)));
      }
    });
  }
  if (adminAddRelayTypeBtn && adminNewRelayTypeInput) {
    adminAddRelayTypeBtn.addEventListener('click', () => {
      const key = adminNewRelayTypeInput.value.trim().replace(/\s+/g, '_');
      if (!key) return;
      const keys = window.RelayApp.AVAILABILITY_KEYS || [];
      if (keys.includes(key)) return;
      window.RelayApp.AVAILABILITY_KEYS = keys.concat(key);
      adminNewRelayTypeInput.value = '';
      // Just redraw locally; do not reload from backend so unsaved keys aren't lost.
      renderRelayTypesList();
    });
  }
  if (adminSaveRelayTypesBtn) {
    adminSaveRelayTypesBtn.addEventListener('click', async () => {
      const keys = window.RelayApp.AVAILABILITY_KEYS || [];
      api.setLoading('Saving…');
      try {
        await api.ensureDbPath();
        await window.electronAPI.runBackend({ command: 'save-relay-types', dbPath: state.dbPath, payload: { relay_types: keys } });
        refreshRelayTypesList();
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
      }
    });
  }
  if (adminResetDbBtn) {
    adminResetDbBtn.addEventListener('click', async () => {
      const clearTeams = adminResetClearTeamsCb && adminResetClearTeamsCb.checked;
      if (!confirm('Reset database? This will delete ALL swimmers and meets.' + (clearTeams ? ' All teams will also be removed.' : '') + ' This cannot be undone.')) return;
      const confirmText = 'RESET';
      const entered = prompt('Type ' + confirmText + ' to confirm:');
      if (entered !== confirmText) return;
      api.setLoading('Resetting…');
      try {
        await api.ensureDbPath();
        await window.electronAPI.runBackend({ command: 'reset-database', dbPath: state.dbPath, payload: { clear_teams: clearTeams } });
        state.currentCompetitions = [];
        state.selectedMeetId = null;
        state.currentSwimmers = [];
        window.RelayApp.TEAMS = [];
        if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.renderCompetitions) {
          window.RelayApp.meetSelector.renderCompetitions([]);
        }
        if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.updateMeetTriggerText) {
          window.RelayApp.meetSelector.updateMeetTriggerText();
        }
        if (window.RelayApp.swimmers && window.RelayApp.swimmers.renderSwimmers) {
          window.RelayApp.swimmers.renderSwimmers([]);
        }
        await refreshMeetsList();
        await refreshTeamsList();
        await refreshRelayTypesList();
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
      }
    });
  }

  const adminInviteCoachBtn = document.getElementById('admin-invite-coach-btn');
  const adminInviteAdminBtn = document.getElementById('admin-invite-admin-btn');
  const adminInviteRoleResult = document.getElementById('admin-invite-role-result');
  async function createRoleInviteCode(role) {
    if (!adminInviteRoleResult) return;
    const token = window.RelayApp.getAuthToken && window.RelayApp.getAuthToken();
    const baseUrl = window.RELAY_AUTH_BASE_URL || api.AUTH_BASE_URL || 'http://127.0.0.1:8000';
    if (!token) { adminInviteRoleResult.textContent = 'Sign in required.'; adminInviteRoleResult.classList.remove('hidden'); return; }
    adminInviteRoleResult.classList.add('hidden');
    adminInviteRoleResult.innerHTML = '';
    try {
      const resp = await fetch(baseUrl + '/admin/invite-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
        body: JSON.stringify({ role: role }),
      });
      if (!resp.ok) throw new Error('Failed to create code');
      const data = await resp.json();
      const code = (data && data.code) || '';
      adminInviteRoleResult.textContent = (role === 'admin' ? 'Admin' : 'Coach') + ' code: ' + code + ' ';
      adminInviteRoleResult.classList.remove('hidden');
      const copyBtn = document.createElement('button');
      copyBtn.type = 'button';
      copyBtn.className = 'btn btn-primary btn-sm';
      copyBtn.textContent = 'Copy';
      copyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(code).then(function () { copyBtn.textContent = 'Copied!'; });
      });
      adminInviteRoleResult.appendChild(copyBtn);
    } catch (err) {
      adminInviteRoleResult.textContent = 'Error: ' + (err.message || String(err));
      adminInviteRoleResult.classList.remove('hidden');
    }
  }
  if (adminInviteCoachBtn) adminInviteCoachBtn.addEventListener('click', function () { createRoleInviteCode('coach'); });
  if (adminInviteAdminBtn) adminInviteAdminBtn.addEventListener('click', function () { createRoleInviteCode('admin'); });

  const adminOpenUsersListBtn = document.getElementById('admin-open-users-list-btn');
  const adminUsersListModalClose = document.getElementById('admin-users-list-modal-close');
  const adminUsersListModalOverlay = document.getElementById('admin-users-list-modal-overlay');
  if (adminOpenUsersListBtn) adminOpenUsersListBtn.addEventListener('click', function () { openUsersListPopup(); });
  if (adminUsersListModalClose) adminUsersListModalClose.addEventListener('click', closeUsersListPopup);
  if (adminUsersListModalOverlay) {
    adminUsersListModalOverlay.addEventListener('click', function (e) {
      if (e.target === adminUsersListModalOverlay) closeUsersListPopup();
    });
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
    refreshRelayTypesList,
    refreshUsersListPopup,
    isAdminPanelOpen,
  };
})();
