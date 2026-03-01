(function () {
  window.RelayApp = window.RelayApp || {};
  const state = window.RelayApp.state;
  const utils = window.RelayApp.utils;
  const api = window.RelayApp.api;

  const meetDropdownTrigger = document.getElementById('meet-dropdown-trigger');
  const meetDropdownPanel = document.getElementById('meet-dropdown-panel');
  const meetDropdownList = document.getElementById('meet-dropdown-list');
  const removeSelectedCompetitionsBtn = document.getElementById('remove-selected-competitions-btn');
  const resultsSection = document.getElementById('results-section');
  const meetTeamsSection = document.getElementById('meet-teams-section');
  const meetTeamsCheckboxes = document.getElementById('meet-teams-checkboxes');

  function updateMeetTriggerText() {
    const selected = state.currentCompetitions.find((c) => c.id === state.selectedMeetId);
    if (meetDropdownTrigger) meetDropdownTrigger.textContent = selected ? selected.name : 'Select a meet';
    updateMeetTeamsSection();
  }

  function updateMeetTeamsSection() {
    if (!meetTeamsSection || !meetTeamsCheckboxes) return;
    if (state.selectedMeetId == null) {
      meetTeamsSection.classList.add('hidden');
      return;
    }
    const meet = state.currentCompetitions.find((c) => c.id === state.selectedMeetId);
    const meetTeamNames = meet && Array.isArray(meet.teams) ? meet.teams : [];
    meetTeamsSection.classList.remove('hidden');
    meetTeamsCheckboxes.innerHTML = meetTeamNames.length
      ? meetTeamNames.map((t) => `<span class="meet-team-tag">${utils.escapeHtml(t)}</span>`).join('')
      : '<span class="text-muted">No teams in this meet</span>';
  }

  function closeMeetDropdown() {
    if (meetDropdownPanel) meetDropdownPanel.classList.add('hidden');
  }

  function getSelectedCompetitionIds() {
    if (!meetDropdownList) return [];
    const checkboxes = meetDropdownList.querySelectorAll('input.competition-cb:checked');
    return Array.from(checkboxes).map((cb) => parseInt(cb.value, 10)).filter((n) => !isNaN(n));
  }

  function updateRemoveCompetitionsButtonVisibility() {
    const ids = getSelectedCompetitionIds();
    if (removeSelectedCompetitionsBtn) {
      if (ids.length > 0) removeSelectedCompetitionsBtn.classList.remove('hidden');
      else removeSelectedCompetitionsBtn.classList.add('hidden');
    }
  }

  async function applyLastTeamsForMeet(meetId) {
    if (meetId == null) return;
    // Always refetch swimmers for the selected meet so list and availability are up to date
    try {
      await api.ensureDbPath();
      const data = await window.electronAPI.runBackend({
        command: 'list-swimmers',
        dbPath: state.dbPath,
        competitionId: meetId,
      });
      state.currentSwimmers = data.swimmers || [];
      if (window.RelayApp.swimmers && window.RelayApp.swimmers.renderSwimmers) {
        window.RelayApp.swimmers.renderSwimmers(state.currentSwimmers);
      }
    } catch (_) {
      state.currentSwimmers = [];
      if (window.RelayApp.swimmers && window.RelayApp.swimmers.renderSwimmers) {
        window.RelayApp.swimmers.renderSwimmers([]);
      }
    }
    if (resultsSection) resultsSection.classList.remove('hidden');

    // Use cached teams for this meet if we have them; otherwise clear teams panel
    const byMeet = window.RelayApp.getLastTeamsByMeet();
    const saved = byMeet[meetId];
    if (saved && saved.teams) {
      state.lastTeamsResult = saved;
      if (window.RelayApp.teams && window.RelayApp.teams.renderTeams) {
        window.RelayApp.teams.renderTeams(saved.teams);
      }
    } else {
      state.lastTeamsResult = null;
      if (window.RelayApp.teams && window.RelayApp.teams.renderTeams) {
        window.RelayApp.teams.renderTeams(null);
      }
    }
  }

  async function restoreLastMeetAndTeams() {
    const lastId = window.RelayApp.getLastMeetId();
    if (lastId != null && !isNaN(lastId) && state.currentCompetitions.some((c) => c.id === lastId)) {
      state.selectedMeetId = lastId;
      updateMeetTriggerText();
    }
    if (state.selectedMeetId != null) {
      await applyLastTeamsForMeet(state.selectedMeetId);
    }
  }

  function renderCompetitions(competitions) {
    state.currentCompetitions = competitions || [];
    if (!state.currentCompetitions.length) {
      if (meetDropdownList) meetDropdownList.innerHTML = '';
      if (meetDropdownTrigger) meetDropdownTrigger.textContent = 'Select a meet';
      state.selectedMeetId = null;
      if (meetTeamsSection) meetTeamsSection.classList.add('hidden');
      if (removeSelectedCompetitionsBtn) removeSelectedCompetitionsBtn.classList.add('hidden');
      return;
    }
    meetDropdownList.innerHTML = state.currentCompetitions
      .map(
        (c) =>
          `<div class="meet-dropdown-item" data-id="${c.id}">
            <input type="checkbox" value="${c.id}" class="competition-cb" />
            <div class="meet-dropdown-item-content">
              <span class="comp-name">${utils.escapeHtml(c.name)}</span>
              <span class="comp-dates">${utils.escapeHtml(c.start_date)} – ${utils.escapeHtml(c.end_date)}</span>
              <span class="comp-location">${utils.escapeHtml(c.location)}</span>
            </div>
          </div>`
      )
      .join('');

    meetDropdownList.querySelectorAll('input.competition-cb').forEach((cb) => {
      cb.addEventListener('change', (e) => { e.stopPropagation(); updateRemoveCompetitionsButtonVisibility(); });
    });
    meetDropdownList.querySelectorAll('.meet-dropdown-item').forEach((row) => {
      row.addEventListener('click', async (e) => {
        if (e.target.type === 'checkbox') return;
        state.selectedMeetId = parseInt(row.getAttribute('data-id'), 10);
        window.RelayApp.setLastMeetId(state.selectedMeetId);
        updateMeetTriggerText();
        closeMeetDropdown();
        api.setLoading('Loading meet…');
        try {
          await applyLastTeamsForMeet(state.selectedMeetId);
        } finally {
          api.clearLoading();
        }
      });
    });
    if (!state.currentCompetitions.some((c) => c.id === state.selectedMeetId)) {
      state.selectedMeetId = null;
    }
    updateMeetTriggerText();
    updateRemoveCompetitionsButtonVisibility();
  }

  if (meetDropdownTrigger) {
    meetDropdownTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      meetDropdownPanel.classList.toggle('hidden');
    });
  }
  document.addEventListener('click', () => {
    if (meetDropdownPanel && !meetDropdownPanel.classList.contains('hidden')) closeMeetDropdown();
  });
  if (meetDropdownPanel) meetDropdownPanel.addEventListener('click', (e) => e.stopPropagation());

  if (removeSelectedCompetitionsBtn) {
    removeSelectedCompetitionsBtn.addEventListener('click', async () => {
      const ids = getSelectedCompetitionIds();
      if (!ids.length) return;
      if (!confirm(`Remove ${ids.length} selected competition(s)?`)) return;
      api.setLoading('Removing…');
      try {
        await api.ensureDbPath();
        const data = await window.electronAPI.runBackend({
          command: 'delete-competitions',
          dbPath: state.dbPath,
          payload: { ids },
          competitionId: state.selectedMeetId ?? undefined,
        });
        if (ids.includes(state.selectedMeetId)) state.selectedMeetId = null;
        closeMeetDropdown();
        renderCompetitions(data.competitions);
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
      }
    });
  }

  window.RelayApp.meetSelector = {
    renderCompetitions,
    restoreLastMeetAndTeams,
    updateMeetTriggerText,
    closeMeetDropdown,
  };
})();
