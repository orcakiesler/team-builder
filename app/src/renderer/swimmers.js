(function () {
  window.RelayApp = window.RelayApp || {};
  const state = window.RelayApp.state;
  const utils = window.RelayApp.utils;
  const modals = window.RelayApp.modals;

  const swimmersList = document.getElementById('swimmers-list');
  const removeSelectedBtn = document.getElementById('remove-selected-btn');
  const selectModeBtn = document.getElementById('select-mode-btn');
  const selectAllSwimmersBtn = document.getElementById('select-all-swimmers-btn');

  function isMedicalValidForMeet(medicalDateStr, meetStartDateStr) {
    if (!meetStartDateStr || !String(meetStartDateStr).trim()) return null;
    if (!medicalDateStr || !String(medicalDateStr).trim()) return false;
    const meetStr = String(meetStartDateStr).trim().slice(0, 10);
    const medStr = String(medicalDateStr).trim().slice(0, 10);
    try {
      const meetDate = new Date(meetStr);
      const medDate = new Date(medStr);
      if (isNaN(meetDate.getTime()) || isNaN(medDate.getTime())) return null;
      const oneYearAfterMed = new Date(medDate);
      oneYearAfterMed.setFullYear(oneYearAfterMed.getFullYear() + 1);
      return oneYearAfterMed >= meetDate;
    } catch (_) {
      return null;
    }
  }

  function medicalIndicator(swimmer, meetStartDateStr) {
    const med = swimmer.medical_date;
    if (!med || !String(med).trim()) return '<span class="medical-unknown" title="No medical date">—</span>';
    const valid = isMedicalValidForMeet(med, meetStartDateStr);
    if (valid === null) return '<span class="medical-unknown" title="No meet selected">—</span>';
    if (valid) return '<span class="medical-ok" title="Medical valid">✓</span>';
    return '<span class="medical-expired" title="Medical expired">✗</span>';
  }

  function getSelectedSwimmerIds() {
    if (!swimmersList) return [];
    const checkboxes = swimmersList.querySelectorAll('.swimmer-row input[type="checkbox"]:checked');
    return Array.from(checkboxes).map((cb) => parseInt(cb.value, 10)).filter((n) => !isNaN(n));
  }

  function updateRemoveButtonVisibility() {
    const ids = getSelectedSwimmerIds();
    if (removeSelectedBtn) {
      if (ids.length > 0) removeSelectedBtn.classList.remove('hidden');
      else removeSelectedBtn.classList.add('hidden');
    }
    updateSelectAllButtonLabel();
  }

  function updateSelectAllButtonLabel() {
    if (!selectAllSwimmersBtn || !state.swimmerSelectMode || !state.currentSwimmers.length) return;
    const checkboxes = swimmersList.querySelectorAll('input.swimmer-cb');
    const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every((cb) => cb.checked);
    selectAllSwimmersBtn.textContent = allChecked ? 'Unselect all' : 'Select all';
  }

  function renderSwimmers(swimmers) {
    state.currentSwimmers = swimmers || [];
    if (!swimmersList) return;
    if (!state.currentSwimmers.length) {
      swimmersList.innerHTML = '<p class="text-muted">No swimmers. Import from Excel files.</p>';
      if (removeSelectedBtn) removeSelectedBtn.classList.add('hidden');
      if (selectAllSwimmersBtn) selectAllSwimmersBtn.classList.add('hidden');
      return;
    }
    const meet = state.currentCompetitions.find((c) => c.id === state.selectedMeetId);
    const meetStart = meet ? meet.start_date : null;
    if (state.swimmerSelectMode) {
      swimmersList.innerHTML = state.currentSwimmers
        .map(
          (s, index) =>
            `<div class="swimmer-row" data-index="${index}">
              <input type="checkbox" value="${s.id ?? ''}" class="swimmer-cb" />
              <span class="medical-indicator">${medicalIndicator(s, meetStart)}</span>
              <span class="swimmer-name">${utils.escapeHtml(s.full_name)}</span>
            </div>`
        )
        .join('');
      swimmersList.querySelectorAll('input.swimmer-cb').forEach((cb) => {
        cb.addEventListener('change', updateRemoveButtonVisibility);
      });
    } else {
      swimmersList.innerHTML = state.currentSwimmers
        .map(
          (s, index) =>
            `<div class="swimmer-row swimmer-row-no-cb" data-index="${index}">
              <span class="medical-indicator">${medicalIndicator(s, meetStart)}</span>
              <span class="swimmer-name">${utils.escapeHtml(s.full_name)}</span>
            </div>`
        )
        .join('');
    }
    swimmersList.querySelectorAll('.swimmer-row').forEach((row) => {
      row.addEventListener('click', (e) => {
        if (e.target.classList.contains('swimmer-cb')) return;
        const index = parseInt(row.getAttribute('data-index'), 10);
        if (modals && modals.openSwimmerModal) modals.openSwimmerModal(state.currentSwimmers[index]);
      });
    });
    if (state.swimmerSelectMode) {
      if (selectAllSwimmersBtn) selectAllSwimmersBtn.classList.remove('hidden');
      updateRemoveButtonVisibility();
      updateSelectAllButtonLabel();
    } else {
      if (selectAllSwimmersBtn) selectAllSwimmersBtn.classList.add('hidden');
      if (removeSelectedBtn) removeSelectedBtn.classList.add('hidden');
    }
  }

  if (selectModeBtn) {
    selectModeBtn.addEventListener('click', () => {
      state.swimmerSelectMode = !state.swimmerSelectMode;
      selectModeBtn.textContent = state.swimmerSelectMode ? 'Done' : 'Select';
      const addSwimmerBtn = document.getElementById('add-swimmer-btn');
      const refreshSwimmersBtn = document.getElementById('refresh-swimmers-btn');
      if (addSwimmerBtn) addSwimmerBtn.classList.toggle('hidden', state.swimmerSelectMode);
      if (refreshSwimmersBtn) refreshSwimmersBtn.classList.toggle('hidden', state.swimmerSelectMode);
      renderSwimmers(state.currentSwimmers);
      if (state.swimmerSelectMode) updateSelectAllButtonLabel();
    });
  }
  if (selectAllSwimmersBtn) {
    selectAllSwimmersBtn.addEventListener('click', () => {
      const checkboxes = swimmersList.querySelectorAll('input.swimmer-cb');
      const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every((cb) => cb.checked);
      checkboxes.forEach((cb) => { cb.checked = !allChecked; });
      updateRemoveButtonVisibility();
    });
  }
  if (removeSelectedBtn) {
    removeSelectedBtn.addEventListener('click', async () => {
      const ids = getSelectedSwimmerIds();
      if (!ids.length) return;
      if (!confirm(`Remove ${ids.length} selected swimmer(s)?`)) return;
      const api = window.RelayApp.api;
      api.setLoading('Removing…');
      try {
        await api.ensureDbPath();
        const data = await window.electronAPI.runBackend({
          command: 'delete-swimmers',
          dbPath: state.dbPath,
          payload: { ids },
        });
        if (window.RelayApp.swimmers && window.RelayApp.swimmers.renderSwimmers) {
          window.RelayApp.swimmers.renderSwimmers(data.swimmers);
        }
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
      }
    });
  }

  window.RelayApp.swimmers = {
    renderSwimmers,
    getSelectedSwimmerIds,
    updateRemoveButtonVisibility,
    updateSelectAllButtonLabel,
  };
})();
