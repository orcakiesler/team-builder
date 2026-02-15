const cardBestTimes = document.getElementById('card-best-times');
const cardNamesRelays = document.getElementById('card-names-relays');
const nameBestTimes = document.getElementById('name-best-times');
const nameNamesRelays = document.getElementById('name-names-relays');
const pathBestTimes = document.getElementById('path-best-times');
const pathNamesRelays = document.getElementById('path-names-relays');
const importBtn = document.getElementById('import-btn');
const runBtn = document.getElementById('run-btn');
const runHint = document.getElementById('run-hint');
const resultsSection = document.getElementById('results-section');
const teamsContainer = document.getElementById('teams-container');
const swimmersList = document.getElementById('swimmers-list');
const removeSelectedBtn = document.getElementById('remove-selected-btn');
const loadingEl = document.getElementById('loading');
const modalOverlay = document.getElementById('swimmer-modal-overlay');
const modal = document.getElementById('swimmer-modal');
const modalName = document.getElementById('modal-swimmer-name');
const modalBody = document.getElementById('modal-body');
const modalFooter = document.getElementById('modal-footer');
const modalClose = document.getElementById('modal-close');
const meetDropdownTrigger = document.getElementById('meet-dropdown-trigger');
const meetDropdownPanel = document.getElementById('meet-dropdown-panel');
const meetDropdownList = document.getElementById('meet-dropdown-list');
const removeSelectedCompetitionsBtn = document.getElementById('remove-selected-competitions-btn');
const selectModeBtn = document.getElementById('select-mode-btn');
const selectAllSwimmersBtn = document.getElementById('select-all-swimmers-btn');
const addCompetitionBtn = document.getElementById('add-competition-btn');
const addCompetitionModal = document.getElementById('add-competition-modal-overlay');
const addCompetitionClose = document.getElementById('add-competition-close');
const addCompetitionForm = document.getElementById('add-competition-form');
const addCompetitionCancel = document.getElementById('add-competition-cancel');
const addCompetitionSave = document.getElementById('add-competition-save');
const addSwimmerBtn = document.getElementById('add-swimmer-btn');
const refreshSwimmersBtn = document.getElementById('refresh-swimmers-btn');
const addSwimmerModal = document.getElementById('add-swimmer-modal-overlay');
const addSwimmerClose = document.getElementById('add-swimmer-close');
const addSwimmerForm = document.getElementById('add-swimmer-form');
const addSwimmerCancel = document.getElementById('add-swimmer-cancel');
const addSwimmerSave = document.getElementById('add-swimmer-save');
const addSwimmerBack = document.getElementById('add-swimmer-back');
const addSwimmerStep1 = document.getElementById('add-swimmer-step1');
const addSwimmerStep2 = document.getElementById('add-swimmer-step2');
const addSwimmerAvailability = document.getElementById('add-swimmer-availability');
const modalEditBtn = document.getElementById('modal-edit-btn');
const editModalOverlay = document.getElementById('edit-modal-overlay');
const editModalClose = document.getElementById('edit-modal-close');
const editCancelBtn = document.getElementById('edit-cancel-btn');
const editSaveBtn = document.getElementById('edit-save-btn');
const editSwimmerForm = document.getElementById('edit-swimmer-form');

const AVAILABILITY_KEYS = ['freestyle', 'medley', 'freestyle_mix', 'medley_mix'];
const STORAGE_LAST_MEET = 'relay_last_meet_id';
const STORAGE_LAST_TEAMS = 'relay_last_teams';

let dbPath = null;
let currentSwimmers = [];
let currentCompetitions = [];
let selectedMeetId = null;
let lastTeamsResult = null;
let swimmerSelectMode = false;

function getLastMeetId() {
  try {
    const v = localStorage.getItem(STORAGE_LAST_MEET);
    return v != null ? parseInt(v, 10) : null;
  } catch (_) { return null; }
}
function setLastMeetId(id) {
  try {
    if (id != null) localStorage.setItem(STORAGE_LAST_MEET, String(id));
    else localStorage.removeItem(STORAGE_LAST_MEET);
  } catch (_) {}
}
function getLastTeamsByMeet() {
  try {
    const raw = localStorage.getItem(STORAGE_LAST_TEAMS);
    return raw ? JSON.parse(raw) : {};
  } catch (_) { return {}; }
}
function setLastTeamsForMeet(meetId, data) {
  if (meetId == null) return;
  const byMeet = getLastTeamsByMeet();
  byMeet[meetId] = { teams: data.teams, swimmers: data.swimmers, reference_year: data.reference_year };
  try {
    localStorage.setItem(STORAGE_LAST_TEAMS, JSON.stringify(byMeet));
  } catch (_) {}
}
async function applyLastTeamsForMeet(meetId) {
  if (meetId == null) return;
  const byMeet = getLastTeamsByMeet();
  const saved = byMeet[meetId];
  if (saved && saved.teams) {
    lastTeamsResult = saved;
    renderTeams(saved.teams);
    renderSwimmers(saved.swimmers || []);
    resultsSection.classList.remove('hidden');
  } else {
    lastTeamsResult = null;
    renderTeams(null);
    try {
      await ensureDbPath();
      const data = await window.electronAPI.runBackend({ command: 'list-swimmers', dbPath });
      currentSwimmers = data.swimmers || [];
      renderSwimmers(currentSwimmers);
    } catch (_) {
      currentSwimmers = [];
      renderSwimmers([]);
    }
    resultsSection.classList.remove('hidden');
  }
}
async function restoreLastMeetAndTeams() {
  const lastId = getLastMeetId();
  if (lastId != null && !isNaN(lastId) && currentCompetitions.some((c) => c.id === lastId)) {
    selectedMeetId = lastId;
    updateMeetTriggerText();
  }
  if (selectedMeetId != null) {
    await applyLastTeamsForMeet(selectedMeetId);
  }
}

async function ensureDbPath() {
  if (!dbPath) dbPath = await window.electronAPI.getDbPath();
  return dbPath;
}

function getPaths() {
  return {
    bestTimesPath: (pathBestTimes.value || '').trim() || null,
    namesRelaysPath: (pathNamesRelays.value || '').trim() || null,
  };
}

function setLoading(msg) {
  loadingEl.textContent = msg || 'Loading…';
  loadingEl.classList.remove('hidden');
}

function clearLoading() {
  loadingEl.classList.add('hidden');
}

function updateImportButton() {
  const { bestTimesPath, namesRelaysPath } = getPaths();
  const atLeastOne = bestTimesPath || namesRelaysPath;
  importBtn.disabled = !atLeastOne;
}

function setFile(which, filePath) {
  const name = filePath ? filePath.split(/[/\\]/).pop() : null;
  if (which === 'best_times') {
    pathBestTimes.value = filePath || '';
    nameBestTimes.textContent = name || 'Drop file or click to browse';
    cardBestTimes.classList.toggle('has-file', !!filePath);
  } else {
    pathNamesRelays.value = filePath || '';
    nameNamesRelays.textContent = name || 'Drop file or click to browse';
    cardNamesRelays.classList.toggle('has-file', !!filePath);
  }
  updateImportButton();
}

async function onCardClick(which) {
  const path = await window.electronAPI.selectFile(which);
  if (path) setFile(which, path);
}

function setupDrop(card, which) {
  card.addEventListener('click', () => onCardClick(which));
  card.addEventListener('dragover', (e) => { e.preventDefault(); e.stopPropagation(); card.classList.add('drag-over'); });
  card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    card.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && /\.(xlsx|xls)$/i.test(file.name)) setFile(which, file.path);
  });
}

setupDrop(cardBestTimes, 'best_times');
setupDrop(cardNamesRelays, 'names_relays');

const clearBestTimesBtn = document.getElementById('clear-best-times');
const clearNamesRelaysBtn = document.getElementById('clear-names-relays');
if (clearBestTimesBtn) {
  clearBestTimesBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); setFile('best_times', null); });
}
if (clearNamesRelaysBtn) {
  clearNamesRelaysBtn.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); setFile('names_relays', null); });
}

function formatTime(sec) {
  if (sec == null) return '–';
  const s = Number(sec);
  return isNaN(s) ? '–' : `${s.toFixed(2)}s`;
}

function formatTimeMMSS(sec) {
  if (sec == null) return '–';
  const s = Number(sec);
  if (isNaN(s)) return '–';
  const min = Math.floor(s / 60);
  const remainder = s % 60;
  return `${min}:${remainder.toFixed(2).padStart(5, '0')}`;
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/** Total time as minutes:seconds.hundredths (e.g. 2:03.45) */
function formatTimeMMSS(sec) {
  if (sec == null) return '–';
  const s = Number(sec);
  if (isNaN(s)) return '–';
  const min = Math.floor(s / 60);
  const remainder = s % 60;
  return `${min}:${remainder.toFixed(2).padStart(5, '0')}`;
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderTeams(teamsByEvent) {
  if (!teamsByEvent || !Object.keys(teamsByEvent).length) {
    teamsContainer.innerHTML = '<p class="text-muted">Build teams to see results.</p>';
    return;
  }
  if (!teamsByEvent || Object.keys(teamsByEvent).length === 0) {
    teamsContainer.innerHTML = '<p class="text-muted">Build teams to see results.</p>';
    return;
  }
  let html = '';
  for (const [eventName, teams] of Object.entries(teamsByEvent)) {
    if (!teams.length) continue;
    html += `<div class="event-block"><h4>${escapeHtml(eventName)}</h4>`;
    for (const team of teams) {
      const [lo, hi] = team.age_group_range;
      html += `<div class="team-block">`;
      html += `<div class="age-group">Age group ${lo}–${hi}</div>`;
      html += `<div class="team-time">Total time: ${formatTimeMMSS(team.total_time)} (age sum: ${team.total_age})</div>`;
      html += `<ul class="swimmers-list">`;
      if (team.is_medley && team.stroke_labels) {
        const strokeTimes = ['backstroke_50', 'breaststroke_50', 'butterfly_50', 'freestyle_50'];
        team.swimmers.forEach((s, i) => {
          const time = s[strokeTimes[i]];
          const ageStr = s.age != null ? `, ${s.age}` : '';
          html += `<li><span class="stroke-label">${team.stroke_labels[i]}:</span>${escapeHtml(s.full_name)}${ageStr} <span class="swimmer-time">(${formatTime(time)})</span></li>`;
        });
      } else {
        team.swimmers.forEach((s) => {
          const ageStr = s.age != null ? `, ${s.age}` : '';
          html += `<li>${escapeHtml(s.full_name)}${ageStr} <span class="swimmer-time">(${formatTime(s.freestyle_50)})</span> <span class="swimmer-time">(${formatTime(s.freestyle_50)})</span></li>`;
        });
      }
      html += `</ul></div>`;
    }
    html += `</div>`;
  }
  teamsContainer.innerHTML = html;
}

function getSelectedSwimmerIds() {
  const checkboxes = swimmersList.querySelectorAll('.swimmer-row input[type="checkbox"]:checked');
  return Array.from(checkboxes).map((cb) => parseInt(cb.value, 10)).filter((n) => !isNaN(n));
}

function getSelectedCompetitionIds() {
  const checkboxes = meetDropdownList.querySelectorAll('input.competition-cb:checked');
  return Array.from(checkboxes).map((cb) => parseInt(cb.value, 10)).filter((n) => !isNaN(n));
}

function updateRemoveButtonVisibility() {
  const ids = getSelectedSwimmerIds();
  if (ids.length > 0) {
    removeSelectedBtn.classList.remove('hidden');
  } else {
    removeSelectedBtn.classList.add('hidden');
  }
  updateSelectAllButtonLabel();
}

function updateSelectAllButtonLabel() {
  if (!swimmerSelectMode || !currentSwimmers.length) return;
  const checkboxes = swimmersList.querySelectorAll('input.swimmer-cb');
  const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every((cb) => cb.checked);
  selectAllSwimmersBtn.textContent = allChecked ? 'Unselect all' : 'Select all';
}

function updateRemoveCompetitionsButtonVisibility() {
  const ids = getSelectedCompetitionIds();
  if (ids.length > 0) {
    removeSelectedCompetitionsBtn.classList.remove('hidden');
  } else {
    removeSelectedCompetitionsBtn.classList.add('hidden');
  }
}

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

function renderSwimmers(swimmers) {
  currentSwimmers = swimmers || [];
  if (!currentSwimmers.length) {
    swimmersList.innerHTML = '<p class="text-muted">No swimmers. Import from Excel files.</p>';
    removeSelectedBtn.classList.add('hidden');
    selectAllSwimmersBtn.classList.add('hidden');
    return;
  }
  const meet = currentCompetitions.find((c) => c.id === selectedMeetId);
  const meetStart = meet ? meet.start_date : null;
  if (swimmerSelectMode) {
    swimmersList.innerHTML = currentSwimmers
      .map(
        (s, index) =>
          `<div class="swimmer-row" data-index="${index}">
            <input type="checkbox" value="${s.id ?? ''}" class="swimmer-cb" />
            <span class="medical-indicator">${medicalIndicator(s, meetStart)}</span>
            <span class="swimmer-name">${escapeHtml(s.full_name)}</span>
          </div>`
      )
      .join('');
    swimmersList.querySelectorAll('input.swimmer-cb').forEach((cb) => {
      cb.addEventListener('change', updateRemoveButtonVisibility);
    });
  } else {
    swimmersList.innerHTML = currentSwimmers
      .map(
        (s, index) =>
          `<div class="swimmer-row swimmer-row-no-cb" data-index="${index}">
            <span class="medical-indicator">${medicalIndicator(s, meetStart)}</span>
            <span class="swimmer-name">${escapeHtml(s.full_name)}</span>
          </div>`
      )
      .join('');
  }
  swimmersList.querySelectorAll('.swimmer-row').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.classList.contains('swimmer-cb')) return;
      const index = parseInt(row.getAttribute('data-index'), 10);
      openSwimmerModal(currentSwimmers[index]);
    });
  });
  if (swimmerSelectMode) {
    selectAllSwimmersBtn.classList.remove('hidden');
    updateRemoveButtonVisibility();
    updateSelectAllButtonLabel();
  } else {
    selectAllSwimmersBtn.classList.add('hidden');
    removeSelectedBtn.classList.add('hidden');
  }
}

function openSwimmerModal(s) {
  if (!s) return;
  modalName.textContent = s.full_name;
  const avail = s.availability || {};
  const availList = Object.entries(avail)
    .map(([k, v]) => `<li><span>${escapeHtml(k)}</span><span>${v ? 'Yes' : 'No'}</span></li>`)
    .join('');
  const medicalStr = s.medical_date && String(s.medical_date).trim() ? escapeHtml(String(s.medical_date).slice(0, 10)) : '–';
  modalBody.innerHTML = `
    <dl>
      <dt>First name</dt><dd>${escapeHtml(s.first_name)}</dd>
      <dt>Last name</dt><dd>${escapeHtml(s.last_name)}</dd>
      <dt>Gender</dt><dd>${escapeHtml(s.gender ?? '–')}</dd>
      <dt>Year of birth</dt><dd>${s.year_of_birth ?? '–'}</dd>
      <dt>Age</dt><dd>${s.age ?? '–'}</dd>
      <dt>Medical date</dt><dd>${medicalStr}</dd>
      <dt>50 Free</dt><dd>${formatTime(s.freestyle_50)}</dd>
      <dt>50 Back</dt><dd>${formatTime(s.backstroke_50)}</dd>
      <dt>50 Breast</dt><dd>${formatTime(s.breaststroke_50)}</dd>
      <dt>50 Fly</dt><dd>${formatTime(s.butterfly_50)}</dd>
      <dt>Availability</dt>
      <dd><ul class="availability-list">${availList || '<li>–</li>'}</ul></dd>
    </dl>
  `;
  modalFooter.classList.toggle('hidden', !s.id);
  modalOverlay.classList.remove('hidden');
  swimmerBeingEdited = s;
}

function buildEditFormHTML() {
  const availCheckboxes = AVAILABILITY_KEYS.map(
    (k) =>
      `<label class="checkbox-label"><input type="checkbox" name="avail-${k}" data-key="${escapeHtml(k)}" /> ${escapeHtml(k.replace('_', ' '))}</label>`
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
    <div class="form-group availability-checkboxes">
      <label>Availability</label>
      <div class="availability-checkboxes-inner">${availCheckboxes}</div>
    </div>
  `;
}

function openEditModal(swimmer) {
  if (!swimmer || !swimmer.id) return;
  editSwimmerForm.innerHTML = buildEditFormHTML();
  document.getElementById('edit-first-name').value = swimmer.first_name || '';
  document.getElementById('edit-last-name').value = swimmer.last_name || '';
  document.getElementById('edit-gender').value = swimmer.gender === 'f' ? 'f' : 'm';
  document.getElementById('edit-year-of-birth').value = swimmer.year_of_birth ?? '';
  const medDate = swimmer.medical_date && String(swimmer.medical_date).trim() ? String(swimmer.medical_date).slice(0, 10) : '';
  document.getElementById('edit-medical-date').value = medDate;
  document.getElementById('edit-freestyle').value = swimmer.freestyle_50 != null ? swimmer.freestyle_50 : '';
  document.getElementById('edit-backstroke').value = swimmer.backstroke_50 != null ? swimmer.backstroke_50 : '';
  document.getElementById('edit-breaststroke').value = swimmer.breaststroke_50 != null ? swimmer.breaststroke_50 : '';
  document.getElementById('edit-butterfly').value = swimmer.butterfly_50 != null ? swimmer.butterfly_50 : '';
  const avail = swimmer.availability || {};
  AVAILABILITY_KEYS.forEach((k) => {
    const cb = editSwimmerForm.querySelector(`input[name="avail-${k}"]`);
    if (cb) cb.checked = !!avail[k];
  });
  modalOverlay.classList.add('hidden');
  editModalOverlay.classList.remove('hidden');
}

function closeEditModal() {
  editModalOverlay.classList.add('hidden');
}

function getEditFormPayload() {
  const first_name = document.getElementById('edit-first-name').value.trim();
  const last_name = document.getElementById('edit-last-name').value.trim();
  const gender = document.getElementById('edit-gender').value;
  const year_of_birth = document.getElementById('edit-year-of-birth').value.trim();
  const medical_date = document.getElementById('edit-medical-date').value.trim() || null;
  const freestyle_50 = document.getElementById('edit-freestyle').value.trim();
  const backstroke_50 = document.getElementById('edit-backstroke').value.trim();
  const breaststroke_50 = document.getElementById('edit-breaststroke').value.trim();
  const butterfly_50 = document.getElementById('edit-butterfly').value.trim();
  const availability = {};
  AVAILABILITY_KEYS.forEach((k) => {
    const cb = editSwimmerForm.querySelector(`input[name="avail-${k}"]`);
    availability[k] = cb ? cb.checked : false;
  });
  return {
    id: swimmerBeingEdited.id,
    first_name,
    last_name,
    gender: gender || null,
    year_of_birth: year_of_birth === '' ? null : parseInt(year_of_birth, 10),
    medical_date,
    freestyle_50: freestyle_50 === '' ? null : parseFloat(freestyle_50),
    backstroke_50: backstroke_50 === '' ? null : parseFloat(backstroke_50),
    breaststroke_50: breaststroke_50 === '' ? null : parseFloat(breaststroke_50),
    butterfly_50: butterfly_50 === '' ? null : parseFloat(butterfly_50),
    availability,
  };
}

modalEditBtn.addEventListener('click', () => {
  if (swimmerBeingEdited) openEditModal(swimmerBeingEdited);
});

editModalClose.addEventListener('click', closeEditModal);
editCancelBtn.addEventListener('click', closeEditModal);
editModalOverlay.addEventListener('click', (e) => {
  if (e.target === editModalOverlay) closeEditModal();
});

editSaveBtn.addEventListener('click', async () => {
  if (!swimmerBeingEdited) return;
  const first_name = document.getElementById('edit-first-name').value.trim();
  const last_name = document.getElementById('edit-last-name').value.trim();
  const year_of_birth = document.getElementById('edit-year-of-birth').value.trim();
  if (!first_name || !last_name) {
    alert('First name and last name are required.');
    return;
  }
  const yob = year_of_birth === '' ? null : parseInt(year_of_birth, 10);
  if (year_of_birth === '' || isNaN(yob) || yob < 1900 || yob > 2030) {
    alert('Please enter a valid birth year (1900–2030).');
    return;
  }
  setLoading('Saving…');
  try {
    await ensureDbPath();
    const payload = getEditFormPayload();
    await window.electronAPI.runBackend({ command: 'update-swimmer', dbPath, payload });
    await loadSwimmers();
    closeEditModal();
    swimmerBeingEdited = null;
  } catch (err) {
    alert('Error: ' + (err.message || String(err)));
  } finally {
    clearLoading();
  }
});

modalClose.addEventListener('click', () => {
  modalOverlay.classList.add('hidden');
  swimmerBeingEdited = null;
});
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
});

async function loadSwimmers() {
  setLoading('Loading swimmers…');
  try {
    await ensureDbPath();
    const data = await window.electronAPI.runBackend({ command: 'list-swimmers', dbPath });
    currentSwimmers = data.swimmers || [];
    renderSwimmers(currentSwimmers);
    runHint.textContent = 'Import Excel files to add/update swimmers. Build teams uses the database.';
  } catch (err) {
    currentSwimmers = [];
    renderSwimmers([]);
    runHint.textContent = 'Could not load swimmers: ' + (err.message || String(err));
  } finally {
    clearLoading();
  }
}

if (refreshSwimmersBtn) {
  refreshSwimmersBtn.addEventListener('click', () => loadSwimmers());
}

async function loadCompetitions() {
  try {
    await ensureDbPath();
    const data = await window.electronAPI.runBackend({ command: 'list-competitions', dbPath });
    renderCompetitions(data.competitions || []);
    await restoreLastMeetAndTeams();
  } catch (err) {
    renderCompetitions([]);
    runHint.textContent = (runHint.textContent ? runHint.textContent + ' ' : '') + ('Could not load meets: ' + (err.message || String(err)));
  }
}

function updateMeetTriggerText() {
  const selected = currentCompetitions.find((c) => c.id === selectedMeetId);
  meetDropdownTrigger.textContent = selected ? selected.name : 'Select a meet';
}

function closeMeetDropdown() {
  meetDropdownPanel.classList.add('hidden');
}

function renderCompetitions(competitions) {
  currentCompetitions = competitions || [];
  if (!currentCompetitions.length) {
    meetDropdownList.innerHTML = '';
    meetDropdownTrigger.textContent = 'Select a meet';
    selectedMeetId = null;
    removeSelectedCompetitionsBtn.classList.add('hidden');
    return;
  }
  meetDropdownList.innerHTML = currentCompetitions
    .map(
      (c) =>
        `<div class="meet-dropdown-item" data-id="${c.id}">
          <input type="checkbox" value="${c.id}" class="competition-cb" />
          <div class="meet-dropdown-item-content">
            <span class="comp-name">${escapeHtml(c.name)}</span>
            <span class="comp-dates">${escapeHtml(c.start_date)} – ${escapeHtml(c.end_date)}</span>
            <span class="comp-location">${escapeHtml(c.location)}</span>
          </div>
        </div>`
    )
    .join('');

  meetDropdownList.querySelectorAll('input.competition-cb').forEach((cb) => {
    cb.addEventListener('change', (e) => { e.stopPropagation(); updateRemoveCompetitionsButtonVisibility(); });
  });
  meetDropdownList.querySelectorAll('.meet-dropdown-item').forEach((row) => {
    row.addEventListener('click', (e) => {
      if (e.target.type === 'checkbox') return;
      selectedMeetId = parseInt(row.getAttribute('data-id'), 10);
      setLastMeetId(selectedMeetId);
      updateMeetTriggerText();
      closeMeetDropdown();
      applyLastTeamsForMeet(selectedMeetId); // async, no await needed
    });
  });
  if (!currentCompetitions.some((c) => c.id === selectedMeetId)) {
    selectedMeetId = null;
  }
  updateMeetTriggerText();
  updateRemoveCompetitionsButtonVisibility();
}

meetDropdownTrigger.addEventListener('click', (e) => {
  e.stopPropagation();
  meetDropdownPanel.classList.toggle('hidden');
});
document.addEventListener('click', () => {
  if (!meetDropdownPanel.classList.contains('hidden')) closeMeetDropdown();
});
meetDropdownPanel.addEventListener('click', (e) => e.stopPropagation());

importBtn.addEventListener('click', async () => {
  const { bestTimesPath, namesRelaysPath } = getPaths();
  if (!bestTimesPath && !namesRelaysPath) return;
  setLoading('Importing…');
  importBtn.disabled = true;
  try {
    await ensureDbPath();
    const data = await window.electronAPI.runBackend({
      command: 'import-files',
      dbPath,
      bestTimesPath: bestTimesPath || undefined,
      namesRelaysPath: namesRelaysPath || undefined,
    });
    renderSwimmers(data.swimmers);
    let msg = `Imported: ${data.imported || 0} added, ${data.updated || 0} updated.`;
    if (data.skipped && data.skipped.length) {
      msg += `\n\nNot in database (best-times only, not added):\n${data.skipped.join('\n')}`;
    }
    alert(msg);
  } catch (err) {
    alert('Error: ' + (err.message || String(err)));
  } finally {
    clearLoading();
    updateImportButton();
  }
});

runBtn.addEventListener('click', async () => {
  setLoading('Building teams…');
  runBtn.disabled = true;
  try {
    await ensureDbPath();
    const meet = currentCompetitions.find((c) => c.id === selectedMeetId);
    const meetStartDate = meet ? meet.start_date : null;
    const data = await window.electronAPI.runBackend({
      command: 'build-teams',
      dbPath,
      meetStartDate: meetStartDate || undefined,
    });
    lastTeamsResult = data;
    // Sync swimmers list from backend so the list matches what build-teams used (fixes list sometimes empty).
    if (data.swimmers && Array.isArray(data.swimmers)) {
      currentSwimmers = data.swimmers;
    }
    renderTeams(data.teams);
    renderSwimmers(currentSwimmers);
    resultsSection.classList.remove('hidden');
    if (selectedMeetId != null) {
      setLastTeamsForMeet(selectedMeetId, data);
      setLastMeetId(selectedMeetId);
    }
  } catch (err) {
    alert('Error: ' + (err.message || String(err)));
  } finally {
    clearLoading();
    runBtn.disabled = false;
  }
});

selectModeBtn.addEventListener('click', () => {
  swimmerSelectMode = !swimmerSelectMode;
  selectModeBtn.textContent = swimmerSelectMode ? 'Done' : 'Select';
  addSwimmerBtn.classList.toggle('hidden', swimmerSelectMode);
  if (refreshSwimmersBtn) refreshSwimmersBtn.classList.toggle('hidden', swimmerSelectMode);
  renderSwimmers(currentSwimmers);
  if (swimmerSelectMode) {
    updateSelectAllButtonLabel();
  }
});

selectAllSwimmersBtn.addEventListener('click', () => {
  const checkboxes = swimmersList.querySelectorAll('input.swimmer-cb');
  const allChecked = checkboxes.length > 0 && Array.from(checkboxes).every((cb) => cb.checked);
  checkboxes.forEach((cb) => { cb.checked = !allChecked; });
  updateRemoveButtonVisibility();
});

removeSelectedBtn.addEventListener('click', async () => {
  const ids = getSelectedSwimmerIds();
  if (!ids.length) return;
  if (!confirm(`Remove ${ids.length} selected swimmer(s)?`)) return;
  setLoading('Removing…');
  try {
    await ensureDbPath();
    const data = await window.electronAPI.runBackend({
      command: 'delete-swimmers',
      dbPath,
      payload: { ids },
    });
    renderSwimmers(data.swimmers);
  } catch (err) {
    alert('Error: ' + (err.message || String(err)));
  } finally {
    clearLoading();
  }
});

removeSelectedCompetitionsBtn.addEventListener('click', async () => {
  const ids = getSelectedCompetitionIds();
  if (!ids.length) return;
  if (!confirm(`Remove ${ids.length} selected competition(s)?`)) return;
  setLoading('Removing…');
  try {
    await ensureDbPath();
    const data = await window.electronAPI.runBackend({
      command: 'delete-competitions',
      dbPath,
      payload: { ids },
    });
    if (ids.includes(selectedMeetId)) selectedMeetId = null;
    closeMeetDropdown();
    renderCompetitions(data.competitions);
  } catch (err) {
    alert('Error: ' + (err.message || String(err)));
  } finally {
    clearLoading();
  }
});

addCompetitionBtn.addEventListener('click', () => {
  addCompetitionForm.reset();
  document.getElementById('comp-location').value = '';
  addCompetitionModal.classList.remove('hidden');
});

function closeAddCompetitionModal() {
  addCompetitionModal.classList.add('hidden');
}

addCompetitionClose.addEventListener('click', closeAddCompetitionModal);
addCompetitionCancel.addEventListener('click', closeAddCompetitionModal);
addCompetitionModal.addEventListener('click', (e) => {
  if (e.target === addCompetitionModal) closeAddCompetitionModal();
});

addCompetitionSave.addEventListener('click', async () => {
  const name = document.getElementById('comp-name').value.trim();
  const start = document.getElementById('comp-start').value;
  const end = document.getElementById('comp-end').value;
  const location = document.getElementById('comp-location').value.trim() || '';
  if (!name || !start || !end) {
    alert('Please fill in name, start date, and end date.');
    return;
  }
  setLoading('Adding competition…');
  try {
    await ensureDbPath();
    const data = await window.electronAPI.runBackend({
      command: 'add-competition',
      dbPath,
      payload: { name, start_date: start, end_date: end, location },
    });
    renderCompetitions(data.competitions);
    closeAddCompetitionModal();
  } catch (err) {
    alert('Error: ' + (err.message || String(err)));
  } finally {
    clearLoading();
  }
});

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
  if (addSwimmerAvailability && addSwimmerAvailability.children.length === 0) {
    addSwimmerAvailability.innerHTML = AVAILABILITY_KEYS.map(
      (k) =>
        `<label class="checkbox-label"><input type="checkbox" name="new-avail-${k}" data-key="${k}" /> ${k.replace('_', ' ')}</label>`
    ).join('');
  }
}

function resetAddSwimmerForm() {
  addSwimmerForm.reset();
  showAddSwimmerStep(1);
  ensureAddSwimmerAvailabilityCheckboxes();
  const ids = ['new-freestyle', 'new-backstroke', 'new-breaststroke', 'new-butterfly'];
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  AVAILABILITY_KEYS.forEach((k) => {
    const cb = addSwimmerAvailability && addSwimmerAvailability.querySelector(`input[name="new-avail-${k}"]`);
    if (cb) cb.checked = false;
  });
  addSwimmerModal.querySelectorAll('input, select').forEach((el) => {
    el.disabled = false;
    el.removeAttribute('readonly');
  });
}

addSwimmerBtn.addEventListener('click', (e) => {
  e.preventDefault();
  clearLoading();
  resetAddSwimmerForm();
  addSwimmerModal.classList.remove('hidden');
  addSwimmerBtn.blur();
  // Delay focus so the button fully releases focus and inputs accept typing (fixes second-open in Electron).
  setTimeout(() => {
    const first = document.getElementById('new-first-name');
    if (first) {
      first.focus();
      first.removeAttribute('readonly');
      first.disabled = false;
    }
  }, 100);
});

function closeAddSwimmerModal() {
  resetAddSwimmerForm();
  addSwimmerModal.classList.add('hidden');
}

addSwimmerClose.addEventListener('click', closeAddSwimmerModal);
addSwimmerCancel.addEventListener('click', closeAddSwimmerModal);
addSwimmerModal.addEventListener('click', (e) => {
  if (e.target === addSwimmerModal) closeAddSwimmerModal();
});

addSwimmerBack.addEventListener('click', () => showAddSwimmerStep(1));

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

  const freestyle_50 = document.getElementById('new-freestyle') && document.getElementById('new-freestyle').value.trim();
  const backstroke_50 = document.getElementById('new-backstroke') && document.getElementById('new-backstroke').value.trim();
  const breaststroke_50 = document.getElementById('new-breaststroke') && document.getElementById('new-breaststroke').value.trim();
  const butterfly_50 = document.getElementById('new-butterfly') && document.getElementById('new-butterfly').value.trim();
  const availability = {};
  AVAILABILITY_KEYS.forEach((k) => {
    const cb = addSwimmerAvailability && addSwimmerAvailability.querySelector(`input[name="new-avail-${k}"]`);
    availability[k] = cb ? cb.checked : false;
  });

  const payload = {
    first_name,
    last_name,
    year_of_birth,
    gender,
    medical_date: medical_date || undefined,
    freestyle_50: freestyle_50 === '' ? undefined : parseFloat(freestyle_50),
    backstroke_50: backstroke_50 === '' ? undefined : parseFloat(backstroke_50),
    breaststroke_50: breaststroke_50 === '' ? undefined : parseFloat(breaststroke_50),
    butterfly_50: butterfly_50 === '' ? undefined : parseFloat(butterfly_50),
    availability: Object.keys(availability).length ? availability : undefined,
  };

  setLoading('Adding swimmer…');
  try {
    await ensureDbPath();
    const data = await window.electronAPI.runBackend({
      command: 'add-swimmer',
      dbPath,
      payload,
    });
    currentSwimmers = data.swimmers || [];
    renderSwimmers(currentSwimmers);
    closeAddSwimmerModal();
  } catch (err) {
    alert('Error: ' + (err.message || String(err)));
  } finally {
    clearLoading();
  }
});

updateImportButton();

(async function init() {
  swimmersList.innerHTML = '<p class="text-muted">Loading swimmers…</p>';
  await ensureDbPath();
  // Request initial swimmers from main process (same DB path as Refresh/Build teams, no race).
  try {
    const data = await window.electronAPI.requestInitialSwimmers();
    currentSwimmers = data.swimmers || [];
    renderSwimmers(currentSwimmers);
    runHint.textContent = 'Import Excel files to add/update swimmers. Build teams uses the database.';
  } catch (_) {
    await loadSwimmers();
  }
  await loadCompetitions();
})();
