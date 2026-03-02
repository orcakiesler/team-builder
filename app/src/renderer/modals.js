(function () {
  window.RelayApp = window.RelayApp || {};
  const state = window.RelayApp.state;
  const utils = window.RelayApp.utils;
  const api = window.RelayApp.api;
  const AVAILABILITY_KEYS = window.RelayApp.AVAILABILITY_KEYS;

  const modalOverlay = document.getElementById('swimmer-modal-overlay');
  const modal = document.getElementById('swimmer-modal');
  const modalName = document.getElementById('modal-swimmer-name');
  const modalBody = document.getElementById('modal-body');
  const modalFooter = document.getElementById('modal-footer');
  const modalClose = document.getElementById('modal-close');
  const modalEditBtn = document.getElementById('modal-edit-btn');
  const editModalOverlay = document.getElementById('edit-modal-overlay');
  const editModalClose = document.getElementById('edit-modal-close');
  const editCancelBtn = document.getElementById('edit-cancel-btn');
  const editSaveBtn = document.getElementById('edit-save-btn');
  const editSwimmerForm = document.getElementById('edit-swimmer-form');
  const addCompetitionModal = document.getElementById('add-competition-modal-overlay');
  const addCompetitionClose = document.getElementById('add-competition-close');
  const addCompetitionForm = document.getElementById('add-competition-form');
  const addCompetitionCancel = document.getElementById('add-competition-cancel');
  const addCompetitionSave = document.getElementById('add-competition-save');
  const editCompetitionModal = document.getElementById('edit-competition-modal-overlay');
  const editCompetitionClose = document.getElementById('edit-competition-close');
  const editCompetitionCancel = document.getElementById('edit-competition-cancel');
  const editCompetitionSave = document.getElementById('edit-competition-save');
  const editCompetitionForm = document.getElementById('edit-competition-form');
  const duplicateMeetModal = document.getElementById('duplicate-meet-modal-overlay');
  const duplicateMeetClose = document.getElementById('duplicate-meet-close');
  const duplicateMeetCancel = document.getElementById('duplicate-meet-cancel');
  const duplicateMeetSave = document.getElementById('duplicate-meet-save');
  const bulkReassignModal = document.getElementById('bulk-reassign-modal-overlay');
  const bulkReassignClose = document.getElementById('bulk-reassign-close');
  const bulkReassignCancel = document.getElementById('bulk-reassign-cancel');
  const bulkReassignSave = document.getElementById('bulk-reassign-save');
  const addSwimmerModal = document.getElementById('add-swimmer-modal-overlay');
  const addSwimmerClose = document.getElementById('add-swimmer-close');
  const addSwimmerForm = document.getElementById('add-swimmer-form');
  const addSwimmerCancel = document.getElementById('add-swimmer-cancel');
  const addSwimmerSave = document.getElementById('add-swimmer-save');
  const addSwimmerBack = document.getElementById('add-swimmer-back');
  const addSwimmerStep1 = document.getElementById('add-swimmer-step1');
  const addSwimmerStep2 = document.getElementById('add-swimmer-step2');
  const addSwimmerAvailability = document.getElementById('add-swimmer-availability');

  let swimmerBeingEdited = null;

  function openSwimmerModal(s) {
    if (!s) return;
    swimmerBeingEdited = s;
    modalName.textContent = s.full_name;
    const hasMeet = state.selectedMeetId != null;
    const avail = s.availability || {};
    const availKeys = window.RelayApp.AVAILABILITY_KEYS || Object.keys(avail) || [];
    const availList = hasMeet
      ? (availKeys.length
          ? availKeys
              .map((k) => {
                const v = !!avail[k];
                return `<li><span>${utils.escapeHtml(k)}</span><span>${v ? 'Yes' : 'No'}</span></li>`;
              })
              .join('')
          : '')
      : '';
    const availabilityHtml = hasMeet
      ? `<dt>Availability</dt><dd><ul class="availability-list">${availList || '<li>–</li>'}</ul></dd>`
      : '<dt>Availability</dt><dd class="text-muted">Select a meet to see availability.</dd>';
    const medicalStr = s.medical_date && String(s.medical_date).trim() ? utils.escapeHtml(String(s.medical_date).slice(0, 10)) : '–';
    const teamStr = s.team && String(s.team).trim() ? utils.escapeHtml(s.team) : '–';
    modalBody.innerHTML = `
      <dl>
        <dt>First name</dt><dd>${utils.escapeHtml(s.first_name)}</dd>
        <dt>Last name</dt><dd>${utils.escapeHtml(s.last_name)}</dd>
        <dt>Gender</dt><dd>${utils.escapeHtml(s.gender ?? '–')}</dd>
        <dt>Year of birth</dt><dd>${s.year_of_birth ?? '–'}</dd>
        <dt>Age</dt><dd>${s.age ?? '–'}</dd>
        <dt>Team</dt><dd>${teamStr}</dd>
        <dt>Medical date</dt><dd>${medicalStr}</dd>
        <dt>50 Free</dt><dd>${utils.formatTime(s.freestyle_50)}</dd>
        <dt>50 Back</dt><dd>${utils.formatTime(s.backstroke_50)}</dd>
        <dt>50 Breast</dt><dd>${utils.formatTime(s.breaststroke_50)}</dd>
        <dt>50 Fly</dt><dd>${utils.formatTime(s.butterfly_50)}</dd>
        ${availabilityHtml}
      </dl>
    `;
    modalFooter.classList.toggle('hidden', !s.id);
    modalOverlay.classList.remove('hidden');
  }

  function buildEditFormHTML() {
    const TEAMS = window.RelayApp.TEAMS || [];
    const teamOptions = TEAMS.map((t) => `<option value="${utils.escapeHtml(t)}">${utils.escapeHtml(t)}</option>`).join('');
    const availKeys = window.RelayApp.AVAILABILITY_KEYS || AVAILABILITY_KEYS || [];
    const availCheckboxes = availKeys.map(
      (k) =>
        `<label class="checkbox-label"><input type="checkbox" name="avail-${k}" data-key="${utils.escapeHtml(k)}" /> ${utils.escapeHtml(k.replace('_', ' '))}</label>`
    ).join('');
    return `
      <div class="form-group">
        <label for="edit-first-name">First name <span class="required">*</span></label>
        <input type="text" id="edit-first-name" required />
      </div>
      <div class="form-group">
        <label for="edit-last-name">Last name <span class="required">*</span></label>
        <input type="text" id="edit-last-name" required />
      </div>
      <div class="form-group">
        <label for="edit-gender">Gender <span class="required">*</span></label>
        <select id="edit-gender" required>
          <option value="m">Male</option>
          <option value="f">Female</option>
        </select>
      </div>
      <div class="form-group">
        <label for="edit-year-of-birth">Birth year <span class="required">*</span></label>
        <input type="number" id="edit-year-of-birth" required min="1900" max="2030" />
      </div>
      <div class="form-group">
        <label for="edit-team">Team <span class="required">*</span></label>
        <select id="edit-team" required>${teamOptions}</select>
      </div>
      <div class="form-group">
        <label for="edit-medical-date">Medical date</label>
        <input type="date" id="edit-medical-date" />
      </div>
      <div class="form-group times-row">
        <label>Best times (50m, seconds)</label>
        <input type="number" id="edit-freestyle" step="0.01" min="0" placeholder="50 Free" />
        <input type="number" id="edit-backstroke" step="0.01" min="0" placeholder="50 Back" />
        <input type="number" id="edit-breaststroke" step="0.01" min="0" placeholder="50 Breast" />
        <input type="number" id="edit-butterfly" step="0.01" min="0" placeholder="50 Fly" />
      </div>
      <div class="form-group availability-checkboxes" id="edit-availability-section">
        <label>Availability <span class="availability-meet-hint text-muted"></span></label>
        <div class="availability-checkboxes-inner">${availCheckboxes}</div>
      </div>
    `;
  }

  function openEditModal(swimmer) {
    if (!swimmer || !swimmer.id) return;
    swimmerBeingEdited = swimmer;
    editSwimmerForm.innerHTML = buildEditFormHTML();
    document.getElementById('edit-first-name').value = swimmer.first_name || '';
    document.getElementById('edit-last-name').value = swimmer.last_name || '';
    document.getElementById('edit-gender').value = swimmer.gender === 'f' ? 'f' : 'm';
    document.getElementById('edit-year-of-birth').value = swimmer.year_of_birth ?? '';
    const editTeam = document.getElementById('edit-team');
    if (editTeam) {
      const teamVal = (swimmer.team || '').trim();
      editTeam.value = teamVal && window.RelayApp.TEAMS && window.RelayApp.TEAMS.includes(teamVal) ? teamVal : (window.RelayApp.TEAMS && window.RelayApp.TEAMS[0]) || '';
    }
    const medDate = swimmer.medical_date && String(swimmer.medical_date).trim() ? String(swimmer.medical_date).slice(0, 10) : '';
    document.getElementById('edit-medical-date').value = medDate;
    document.getElementById('edit-freestyle').value = swimmer.freestyle_50 != null ? swimmer.freestyle_50 : '';
    document.getElementById('edit-backstroke').value = swimmer.backstroke_50 != null ? swimmer.backstroke_50 : '';
    document.getElementById('edit-breaststroke').value = swimmer.breaststroke_50 != null ? swimmer.breaststroke_50 : '';
    document.getElementById('edit-butterfly').value = swimmer.butterfly_50 != null ? swimmer.butterfly_50 : '';
    const availSection = editSwimmerForm.querySelector('#edit-availability-section');
    const hintSpan = editSwimmerForm.querySelector('.availability-meet-hint');
    if (state.selectedMeetId != null) {
      if (availSection) availSection.classList.remove('hidden');
      if (hintSpan) hintSpan.textContent = '(for current meet only)';
      const avail = swimmer.availability || {};
      (window.RelayApp.AVAILABILITY_KEYS || AVAILABILITY_KEYS || []).forEach((k) => {
        const cb = editSwimmerForm.querySelector(`input[name="avail-${k}"]`);
        if (cb) { cb.checked = !!avail[k]; cb.disabled = false; }
      });
    } else {
      if (availSection) availSection.classList.add('hidden');
      if (hintSpan) hintSpan.textContent = '';
      editSwimmerForm.querySelectorAll('input[name^="avail-"]').forEach((cb) => { cb.disabled = true; });
    }
    modalOverlay.classList.add('hidden');
    editModalOverlay.classList.remove('hidden');
  }

  function closeEditModal() {
    editModalOverlay.classList.add('hidden');
    swimmerBeingEdited = null;
  }

  function getEditFormPayload() {
    const first_name = document.getElementById('edit-first-name').value.trim();
    const last_name = document.getElementById('edit-last-name').value.trim();
    const gender = document.getElementById('edit-gender').value;
    const year_of_birth = document.getElementById('edit-year-of-birth').value.trim();
    const teamEl = document.getElementById('edit-team');
    const team = teamEl ? teamEl.value.trim() : '';
    const medical_date = document.getElementById('edit-medical-date').value.trim() || null;
    const freestyle_50 = document.getElementById('edit-freestyle').value.trim();
    const backstroke_50 = document.getElementById('edit-backstroke').value.trim();
    const breaststroke_50 = document.getElementById('edit-breaststroke').value.trim();
    const butterfly_50 = document.getElementById('edit-butterfly').value.trim();
    const payload = {
      id: swimmerBeingEdited.id,
      first_name,
      last_name,
      gender: gender || null,
      year_of_birth: year_of_birth === '' ? null : parseInt(year_of_birth, 10),
      team: team || null,
      medical_date,
      freestyle_50: freestyle_50 === '' ? null : parseFloat(freestyle_50),
      backstroke_50: backstroke_50 === '' ? null : parseFloat(backstroke_50),
      breaststroke_50: breaststroke_50 === '' ? null : parseFloat(breaststroke_50),
      butterfly_50: butterfly_50 === '' ? null : parseFloat(butterfly_50),
    };
    if (state.selectedMeetId != null) {
      const availability = {};
      (window.RelayApp.AVAILABILITY_KEYS || AVAILABILITY_KEYS || []).forEach((k) => {
        const cb = editSwimmerForm.querySelector(`input[name="avail-${k}"]`);
        availability[k] = cb ? cb.checked : false;
      });
      payload.availability = availability;
    }
    return payload;
  }

  if (modalEditBtn) {
    modalEditBtn.addEventListener('click', () => {
      if (swimmerBeingEdited) openEditModal(swimmerBeingEdited);
    });
  }
  if (editModalClose) editModalClose.addEventListener('click', closeEditModal);
  if (editCancelBtn) editCancelBtn.addEventListener('click', closeEditModal);
  if (editModalOverlay) {
    editModalOverlay.addEventListener('click', (e) => {
      if (e.target === editModalOverlay) closeEditModal();
    });
  }
  if (editSaveBtn) {
    editSaveBtn.addEventListener('click', async () => {
      if (!swimmerBeingEdited) return;
      const first_name = document.getElementById('edit-first-name').value.trim();
      const last_name = document.getElementById('edit-last-name').value.trim();
      const year_of_birth = document.getElementById('edit-year-of-birth').value.trim();
      if (!first_name || !last_name) {
        alert('First name and last name are required.');
        return;
      }
      const teamEl = document.getElementById('edit-team');
      const teamVal = teamEl ? teamEl.value.trim() : '';
      if (!teamVal || !(window.RelayApp.TEAMS && window.RelayApp.TEAMS.includes(teamVal))) {
        alert('Please select a team.');
        return;
      }
      const yob = year_of_birth === '' ? null : parseInt(year_of_birth, 10);
      if (year_of_birth === '' || isNaN(yob) || yob < 1900 || yob > 2030) {
        alert('Please enter a valid birth year (1900–2030).');
        return;
      }
      api.setLoading('Saving…');
      try {
        await api.ensureDbPath();
        const payload = getEditFormPayload();
        await window.electronAPI.runBackend({ command: 'update-swimmer', dbPath: state.dbPath, payload, competitionId: state.selectedMeetId ?? undefined });
        await api.loadSwimmers();
        closeEditModal();
        swimmerBeingEdited = null;
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
      }
    });
  }
  if (modalClose) {
    modalClose.addEventListener('click', () => {
      modalOverlay.classList.add('hidden');
      swimmerBeingEdited = null;
    });
  }
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
    });
  }

  function closeAddCompetitionModal() {
    if (addCompetitionModal) addCompetitionModal.classList.add('hidden');
  }
  if (addCompetitionClose) addCompetitionClose.addEventListener('click', closeAddCompetitionModal);
  if (addCompetitionCancel) addCompetitionCancel.addEventListener('click', closeAddCompetitionModal);
  if (addCompetitionModal) {
    addCompetitionModal.addEventListener('click', (e) => {
      if (e.target === addCompetitionModal) closeAddCompetitionModal();
    });
  }
  if (addCompetitionSave) {
    addCompetitionSave.addEventListener('click', async () => {
      const name = document.getElementById('comp-name').value.trim();
      const start = document.getElementById('comp-start').value;
      const end = document.getElementById('comp-end').value;
      const location = document.getElementById('comp-location').value.trim() || '';
      if (!name || !start || !end) {
        alert('Please fill in name, start date, and end date.');
        return;
      }
      const addCompTeamsEl = document.getElementById('add-comp-teams-checkboxes');
      const teams = addCompTeamsEl
        ? Array.from(addCompTeamsEl.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value)
        : [];
      if (!teams.length) {
        alert('Select at least one team for this meet.');
        return;
      }
      api.setLoading('Adding competition…');
      try {
        await api.ensureDbPath();
        const data = await window.electronAPI.runBackend({
          command: 'add-competition',
          dbPath: state.dbPath,
          payload: { name, start_date: start, end_date: end, location, teams },
          competitionId: state.selectedMeetId ?? undefined,
        });
        if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.renderCompetitions) {
          window.RelayApp.meetSelector.renderCompetitions(data.competitions);
        }
        closeAddCompetitionModal();
        if (window.RelayApp.admin && window.RelayApp.admin.refreshMeetsList) {
          window.RelayApp.admin.refreshMeetsList();
        }
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
      }
    });
  }

  function closeEditCompetitionModal() {
    if (editCompetitionModal) editCompetitionModal.classList.add('hidden');
  }

  async function openEditCompetitionModal(meet) {
    if (!meet || !editCompetitionForm) return;
    document.getElementById('edit-comp-id').value = meet.id;
    document.getElementById('edit-comp-name').value = meet.name || '';
    document.getElementById('edit-comp-start').value = meet.start_date || '';
    document.getElementById('edit-comp-end').value = meet.end_date || '';
    document.getElementById('edit-comp-location').value = meet.location || '';
    const editCompTeamsEl = document.getElementById('edit-comp-teams-checkboxes');
    try {
      await api.ensureDbPath();
      const data = await window.electronAPI.runBackend({ command: 'list-teams', dbPath: state.dbPath });
      const allTeams = Array.isArray(data.teams) ? data.teams : [];
      window.RelayApp.TEAMS = allTeams;
      const meetTeams = Array.isArray(meet.teams) ? meet.teams : [];
      if (editCompTeamsEl && allTeams.length) {
        editCompTeamsEl.innerHTML = allTeams
          .map(
            (teamName) =>
              `<label class="checkbox-label meet-team-cb"><input type="checkbox" value="${utils.escapeHtml(teamName)}" ${meetTeams.includes(teamName) ? 'checked' : ''} /> ${utils.escapeHtml(teamName)}</label>`
          )
          .join('');
      } else if (editCompTeamsEl) {
        editCompTeamsEl.innerHTML = '<span class="text-muted">No teams. Add teams in Admin first.</span>';
      }
    } catch (_) {
      if (editCompTeamsEl) editCompTeamsEl.innerHTML = '<span class="text-muted">Failed to load teams.</span>';
    }
    if (addCompetitionModal) addCompetitionModal.classList.add('hidden');
    if (editCompetitionModal) editCompetitionModal.classList.remove('hidden');
  }

  if (editCompetitionClose) editCompetitionClose.addEventListener('click', closeEditCompetitionModal);
  if (editCompetitionCancel) editCompetitionCancel.addEventListener('click', closeEditCompetitionModal);
  if (editCompetitionModal) {
    editCompetitionModal.addEventListener('click', (e) => {
      if (e.target === editCompetitionModal) closeEditCompetitionModal();
    });
  }
  if (editCompetitionSave) {
    editCompetitionSave.addEventListener('click', async () => {
      const idEl = document.getElementById('edit-comp-id');
      const id = idEl ? parseInt(idEl.value, 10) : NaN;
      if (!id || isNaN(id)) return;
      const name = document.getElementById('edit-comp-name').value.trim();
      const start = document.getElementById('edit-comp-start').value;
      const end = document.getElementById('edit-comp-end').value;
      const location = document.getElementById('edit-comp-location').value.trim() || '';
      if (!name || !start || !end) {
        alert('Please fill in name, start date, and end date.');
        return;
      }
      const editCompTeamsEl = document.getElementById('edit-comp-teams-checkboxes');
      const teams = editCompTeamsEl
        ? Array.from(editCompTeamsEl.querySelectorAll('input[type="checkbox"]:checked')).map((el) => el.value)
        : [];
      if (!teams.length) {
        alert('Select at least one team for this meet.');
        return;
      }
      api.setLoading('Saving…');
      try {
        await api.ensureDbPath();
        const data = await window.electronAPI.runBackend({
          command: 'update-competition',
          dbPath: state.dbPath,
          payload: { id, name, start_date: start, end_date: end, location, teams },
        });
        if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.renderCompetitions) {
          window.RelayApp.meetSelector.renderCompetitions(data.competitions || []);
        }
        if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.updateMeetTriggerText) {
          window.RelayApp.meetSelector.updateMeetTriggerText();
        }
        closeEditCompetitionModal();
        if (window.RelayApp.admin && window.RelayApp.admin.refreshMeetsList) {
          window.RelayApp.admin.refreshMeetsList();
        }
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
      }
    });
  }

  function closeDuplicateMeetModal() {
    if (duplicateMeetModal) duplicateMeetModal.classList.add('hidden');
  }
  function openDuplicateMeetModal(meet) {
    if (!meet) return;
    document.getElementById('duplicate-meet-source-id').value = meet.id;
    const info = document.getElementById('duplicate-meet-source-info');
    if (info) info.textContent = `Duplicate "${meet.name}" (${meet.start_date} – ${meet.end_date}) with new dates.`;
    document.getElementById('duplicate-meet-start').value = meet.start_date || '';
    document.getElementById('duplicate-meet-end').value = meet.end_date || '';
    if (duplicateMeetModal) duplicateMeetModal.classList.remove('hidden');
  }
  if (duplicateMeetClose) duplicateMeetClose.addEventListener('click', closeDuplicateMeetModal);
  if (duplicateMeetCancel) duplicateMeetCancel.addEventListener('click', closeDuplicateMeetModal);
  if (duplicateMeetModal) {
    duplicateMeetModal.addEventListener('click', (e) => { if (e.target === duplicateMeetModal) closeDuplicateMeetModal(); });
  }
  if (duplicateMeetSave) {
    duplicateMeetSave.addEventListener('click', async () => {
      const sourceId = parseInt(document.getElementById('duplicate-meet-source-id').value, 10);
      const newStart = document.getElementById('duplicate-meet-start').value;
      const newEnd = document.getElementById('duplicate-meet-end').value;
      if (!sourceId || !newStart || !newEnd) {
        alert('Please enter new start and end dates.');
        return;
      }
      api.setLoading('Duplicating…');
      try {
        await api.ensureDbPath();
        const data = await window.electronAPI.runBackend({
          command: 'duplicate-competition',
          dbPath: state.dbPath,
          payload: { source_id: sourceId, new_start_date: newStart, new_end_date: newEnd },
        });
        if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.renderCompetitions) {
          window.RelayApp.meetSelector.renderCompetitions(data.competitions || []);
        }
        closeDuplicateMeetModal();
        if (window.RelayApp.admin && window.RelayApp.admin.refreshMeetsList) {
          window.RelayApp.admin.refreshMeetsList();
        }
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
      }
    });
  }

  let bulkReassignSourceTeam = null;
  let bulkReassignSwimmerIds = [];
  function closeBulkReassignModal() {
    bulkReassignSourceTeam = null;
    bulkReassignSwimmerIds = [];
    if (bulkReassignModal) bulkReassignModal.classList.add('hidden');
  }
  async function openBulkReassignModal(teamName) {
    bulkReassignSourceTeam = teamName;
    try {
      await api.ensureDbPath();
      const data = await window.electronAPI.runBackend({
        command: 'list-swimmers-by-team',
        dbPath: state.dbPath,
        payload: { team: teamName },
      });
      const swimmers = data.swimmers || [];
      bulkReassignSwimmerIds = swimmers.map((s) => s.id).filter((id) => id != null);
      const count = bulkReassignSwimmerIds.length;
      const infoEl = document.getElementById('bulk-reassign-info');
      if (infoEl) infoEl.textContent = count === 0 ? 'No swimmers in this team.' : `Move ${count} swimmer(s) from "${teamName}" to another team.`;
      const selectEl = document.getElementById('bulk-reassign-target-team');
      if (selectEl) {
        const teams = (window.RelayApp.TEAMS || []).filter((t) => (t || '').trim() !== (teamName || '').trim());
        selectEl.innerHTML = teams.length
          ? teams.map((t) => `<option value="${utils.escapeHtml(t)}">${utils.escapeHtml(t)}</option>`).join('')
          : '<option value="">No other teams</option>';
      }
      if (bulkReassignModal) bulkReassignModal.classList.remove('hidden');
    } catch (err) {
      alert('Error: ' + (err.message || String(err)));
    }
  }
  if (bulkReassignClose) bulkReassignClose.addEventListener('click', closeBulkReassignModal);
  if (bulkReassignCancel) bulkReassignCancel.addEventListener('click', closeBulkReassignModal);
  if (bulkReassignModal) {
    bulkReassignModal.addEventListener('click', (e) => { if (e.target === bulkReassignModal) closeBulkReassignModal(); });
  }
  if (bulkReassignSave) {
    bulkReassignSave.addEventListener('click', async () => {
      const selectEl = document.getElementById('bulk-reassign-target-team');
      const targetTeam = selectEl ? selectEl.value.trim() : '';
      if (!targetTeam || bulkReassignSwimmerIds.length === 0) {
        alert('Select a target team.');
        return;
      }
      api.setLoading('Reassigning…');
      try {
        await api.ensureDbPath();
        await window.electronAPI.runBackend({
          command: 'bulk-update-team',
          dbPath: state.dbPath,
          payload: { swimmer_ids: bulkReassignSwimmerIds, team: targetTeam },
        });
        const teamsData = await window.electronAPI.runBackend({ command: 'list-teams', dbPath: state.dbPath });
        window.RelayApp.TEAMS = teamsData.teams || [];
        closeBulkReassignModal();
        if (window.RelayApp.admin && window.RelayApp.admin.refreshTeamsList) {
          window.RelayApp.admin.refreshTeamsList();
        }
        if (window.RelayApp.api && window.RelayApp.api.loadSwimmers) {
          window.RelayApp.api.loadSwimmers();
        }
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
      }
    });
  }

  function showAddSwimmerStep(step) {
    if (step === 1) {
      addSwimmerStep1.classList.remove('hidden');
      addSwimmerStep2.classList.add('hidden');
      addSwimmerSave.textContent = 'Next';
      addSwimmerBack.classList.add('hidden');
    } else {
      addSwimmerStep1.classList.add('hidden');
      addSwimmerStep2.classList.remove('hidden');
      addSwimmerSave.textContent = 'Add';
      addSwimmerBack.classList.remove('hidden');
    }
  }
  function ensureAddSwimmerAvailabilityCheckboxes() {
    const keys = window.RelayApp.AVAILABILITY_KEYS || AVAILABILITY_KEYS || [];
    if (addSwimmerAvailability && (addSwimmerAvailability.children.length === 0 || addSwimmerAvailability.dataset.keys !== keys.join(','))) {
      addSwimmerAvailability.dataset.keys = keys.join(',');
      addSwimmerAvailability.innerHTML = keys.map(
        (k) =>
          `<label class="checkbox-label"><input type="checkbox" name="new-avail-${k}" data-key="${k}" /> ${k.replace('_', ' ')}</label>`
      ).join('');
    }
  }
  function resetAddSwimmerForm() {
    addSwimmerForm.reset();
    const teamSelect = document.getElementById('new-team');
    if (teamSelect && window.RelayApp.TEAMS && window.RelayApp.TEAMS.length) {
      teamSelect.innerHTML = window.RelayApp.TEAMS.map((t) => `<option value="${t}">${t}</option>`).join('');
      teamSelect.value = window.RelayApp.TEAMS[0];
    }
    showAddSwimmerStep(1);
    ensureAddSwimmerAvailabilityCheckboxes();
    const ids = ['new-freestyle', 'new-backstroke', 'new-breaststroke', 'new-butterfly'];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    (window.RelayApp.AVAILABILITY_KEYS || AVAILABILITY_KEYS || []).forEach((k) => {
      const cb = addSwimmerAvailability && addSwimmerAvailability.querySelector(`input[name="new-avail-${k}"]`);
      if (cb) cb.checked = false;
    });
    if (addSwimmerModal) {
      addSwimmerModal.querySelectorAll('input, select').forEach((el) => {
        el.disabled = false;
        el.removeAttribute('readonly');
      });
    }
  }
  function closeAddSwimmerModal() {
    resetAddSwimmerForm();
    if (addSwimmerModal) addSwimmerModal.classList.add('hidden');
  }
  if (addSwimmerClose) addSwimmerClose.addEventListener('click', closeAddSwimmerModal);
  if (addSwimmerCancel) addSwimmerCancel.addEventListener('click', closeAddSwimmerModal);
  if (addSwimmerModal) {
    addSwimmerModal.addEventListener('click', (e) => {
      if (e.target === addSwimmerModal) closeAddSwimmerModal();
    });
  }
  if (addSwimmerBack) addSwimmerBack.addEventListener('click', () => showAddSwimmerStep(1));
  if (addSwimmerSave) {
    addSwimmerSave.addEventListener('click', async () => {
      const first_name = document.getElementById('new-first-name').value.trim();
      const last_name = document.getElementById('new-last-name').value.trim();
      const yearRaw = document.getElementById('new-year-of-birth').value.trim();
      const gender = document.getElementById('new-gender').value;
      const medical_date = document.getElementById('new-medical-date').value.trim() || null;

      if (addSwimmerStep2.classList.contains('hidden')) {
        if (!first_name || !last_name) {
          alert('First name and last name are required.');
          return;
        }
        const year_of_birth = yearRaw === '' ? null : parseInt(yearRaw, 10);
        if (yearRaw === '' || isNaN(year_of_birth) || year_of_birth < 1900 || year_of_birth > 2030) {
          alert('Please enter a valid birth year (1900–2030).');
          return;
        }
      if (gender !== 'm' && gender !== 'f') {
        alert('Please select a gender.');
        return;
      }
      const teamEl = document.getElementById('new-team');
      const teamVal = teamEl ? teamEl.value.trim() : '';
      if (!teamVal || !(window.RelayApp.TEAMS && window.RelayApp.TEAMS.includes(teamVal))) {
        alert('Please select a team.');
        return;
      }
      showAddSwimmerStep(2);
        return;
      }

      const year_of_birth = yearRaw === '' ? null : parseInt(yearRaw, 10);
      if (!first_name || !last_name) {
        alert('First name and last name are required.');
        return;
      }
      if (yearRaw === '' || isNaN(year_of_birth) || year_of_birth < 1900 || year_of_birth > 2030) {
        alert('Please enter a valid birth year (1900–2030).');
        return;
      }
      if (gender !== 'm' && gender !== 'f') {
        alert('Please select a gender.');
        return;
      }
      const teamEl = document.getElementById('new-team');
      const teamVal = teamEl ? teamEl.value.trim() : '';
      if (!teamVal || !(window.RelayApp.TEAMS && window.RelayApp.TEAMS.includes(teamVal))) {
        alert('Please select a team.');
        return;
      }

      const freestyle_50 = document.getElementById('new-freestyle') && document.getElementById('new-freestyle').value.trim();
      const backstroke_50 = document.getElementById('new-backstroke') && document.getElementById('new-backstroke').value.trim();
      const breaststroke_50 = document.getElementById('new-breaststroke') && document.getElementById('new-breaststroke').value.trim();
      const butterfly_50 = document.getElementById('new-butterfly') && document.getElementById('new-butterfly').value.trim();
      const payload = {
        first_name,
        last_name,
        year_of_birth,
        gender,
        team: teamVal,
        medical_date: medical_date || undefined,
        freestyle_50: freestyle_50 === '' ? undefined : parseFloat(freestyle_50),
        backstroke_50: backstroke_50 === '' ? undefined : parseFloat(backstroke_50),
        breaststroke_50: breaststroke_50 === '' ? undefined : parseFloat(breaststroke_50),
        butterfly_50: butterfly_50 === '' ? undefined : parseFloat(butterfly_50),
      };
      if (state.selectedMeetId != null) {
        const availability = {};
        (window.RelayApp.AVAILABILITY_KEYS || AVAILABILITY_KEYS || []).forEach((k) => {
          const cb = addSwimmerAvailability && addSwimmerAvailability.querySelector(`input[name="new-avail-${k}"]`);
          availability[k] = cb ? cb.checked : false;
        });
        if (Object.keys(availability).length) payload.availability = availability;
      }

      api.setLoading('Adding swimmer…');
      try {
        await api.ensureDbPath();
        const data = await window.electronAPI.runBackend({
          command: 'add-swimmer',
          dbPath: state.dbPath,
          payload,
          competitionId: state.selectedMeetId ?? undefined,
        });
        state.currentSwimmers = data.swimmers || [];
        if (window.RelayApp.swimmers && window.RelayApp.swimmers.renderSwimmers) {
          window.RelayApp.swimmers.renderSwimmers(state.currentSwimmers);
        }
        closeAddSwimmerModal();
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
      }
    });
  }

  async function openAddCompetitionModal() {
    if (addCompetitionForm) addCompetitionForm.reset();
    const loc = document.getElementById('comp-location');
    if (loc) loc.value = '';
    const addCompTeamsEl = document.getElementById('add-comp-teams-checkboxes');
    try {
      await api.ensureDbPath();
      const data = await window.electronAPI.runBackend({ command: 'list-teams', dbPath: state.dbPath });
      const teams = Array.isArray(data.teams) ? data.teams : [];
      window.RelayApp.TEAMS = teams;
      if (addCompTeamsEl && teams.length) {
        addCompTeamsEl.innerHTML = teams
          .map(
            (teamName) =>
              `<label class="checkbox-label meet-team-cb"><input type="checkbox" value="${utils.escapeHtml(teamName)}" checked /> ${utils.escapeHtml(teamName)}</label>`
          )
          .join('');
      } else if (addCompTeamsEl) {
        addCompTeamsEl.innerHTML = '<span class="text-muted">No teams yet. Add teams in Manage teams first, then create a meet.</span>';
      }
    } catch (_) {
      if (addCompTeamsEl) addCompTeamsEl.innerHTML = '<span class="text-muted">Load a database first (or add teams in Manage teams).</span>';
    }
    if (addCompetitionModal) addCompetitionModal.classList.remove('hidden');
  }

  const manageTeamsModal = document.getElementById('manage-teams-modal-overlay');
  const manageTeamsClose = document.getElementById('manage-teams-close');
  const manageTeamsList = document.getElementById('manage-teams-list');
  const newTeamNameInput = document.getElementById('new-team-name');
  const addTeamBtn = document.getElementById('add-team-btn');

  async function refreshManageTeamsList() {
    if (!manageTeamsList) return;
    try {
      await api.ensureDbPath();
      const data = await window.electronAPI.runBackend({ command: 'list-teams', dbPath: state.dbPath });
      const teams = Array.isArray(data.teams) ? data.teams : [];
      window.RelayApp.TEAMS = teams;
      manageTeamsList.innerHTML = teams
        .map(
          (name) =>
            `<li class="team-list-item">
              <span>${utils.escapeHtml(name)}</span>
              <button type="button" class="btn btn-danger btn-sm btn-remove-team" data-team="${utils.escapeHtml(name)}">Remove</button>
            </li>`
        )
        .join('');
      manageTeamsList.querySelectorAll('.btn-remove-team').forEach((btn) => {
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
            await refreshManageTeamsList();
          } catch (err) {
            alert('Error: ' + (err.message || String(err)));
          } finally {
            api.clearLoading();
          }
        });
      });
    } catch (err) {
      manageTeamsList.innerHTML = '<li class="text-muted">Failed to load teams.</li>';
    }
  }

  function closeManageTeamsModal() {
    if (manageTeamsModal) manageTeamsModal.classList.add('hidden');
    if (newTeamNameInput) newTeamNameInput.value = '';
  }

  async function openManageTeamsModal() {
    if (manageTeamsModal) manageTeamsModal.classList.remove('hidden');
    await refreshManageTeamsList();
    if (newTeamNameInput) setTimeout(() => newTeamNameInput.focus(), 100);
  }

  if (manageTeamsClose) manageTeamsClose.addEventListener('click', closeManageTeamsModal);
  if (manageTeamsModal) {
    manageTeamsModal.addEventListener('click', (e) => {
      if (e.target === manageTeamsModal) closeManageTeamsModal();
    });
  }
  if (addTeamBtn && newTeamNameInput) {
    addTeamBtn.addEventListener('click', async () => {
      const name = newTeamNameInput.value.trim();
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
        newTeamNameInput.value = '';
        await refreshManageTeamsList();
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
      }
    });
  }

  window.RelayApp.modals = {
    openSwimmerModal,
    openEditModal,
    closeEditModal,
    closeAddCompetitionModal,
    closeEditCompetitionModal,
    closeAddSwimmerModal,
    openAddCompetitionModal,
    openEditCompetitionModal,
    openDuplicateMeetModal,
    openBulkReassignModal,
    openManageTeamsModal,
    closeManageTeamsModal,
    resetAddSwimmerForm,
    showAddSwimmerStep,
    ensureAddSwimmerAvailabilityCheckboxes,
  };
})();
