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
  const both = bestTimesPath && namesRelaysPath;
  importBtn.disabled = !both;
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
          const time = s[strokeTimes[i]];
          html += `<li><span class="stroke-label">${team.stroke_labels[i]}:</span>${escapeHtml(s.full_name)}${ageStr} <span class="swimmer-time">(${formatTime(time)})</span> <span class="swimmer-time">(${formatTime(time)})</span></li>`;
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

function renderSwimmers(swimmers) {
  currentSwimmers = swimmers || [];
  if (!currentSwimmers.length) {
    swimmersList.innerHTML = '<p class="text-muted">No swimmers. Import from Excel files.</p>';
    removeSelectedBtn.classList.add('hidden');
    selectAllSwimmersBtn.classList.add('hidden');
    return;
  }
  if (swimmerSelectMode) {
    swimmersList.innerHTML = currentSwimmers
      .map(
        (s, index) =>
          `<div class="swimmer-row" data-index="${index}">
            <input type="checkbox" value="${s.id ?? ''}" class="swimmer-cb" />
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
  modalBody.innerHTML = `
    <dl>
      <dt>First name</dt><dd>${escapeHtml(s.first_name)}</dd>
      <dt>Last name</dt><dd>${escapeHtml(s.last_name)}</dd>
      <dt>Gender</dt><dd>${escapeHtml(s.gender ?? '–')}</dd>
      <dt>Year of birth</dt><dd>${s.year_of_birth ?? '–'}</dd>
      <dt>Age</dt><dd>${s.age ?? '–'}</dd>
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
  } catch (err) {
    currentSwimmers = [];
    renderSwimmers([]);
    runHint.textContent = 'Could not load swimmers: ' + (err.message || String(err));
  } finally {
    clearLoading();
  }
}

async function loadCompetitions() {
  try {
    await ensureDbPath();
    const data = await window.electronAPI.runBackend({ command: 'list-competitions', dbPath });
    renderCompetitions(data.competitions || []);
    await restoreLastMeetAndTeams();
  } catch (_) {
    renderCompetitions([]);
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
  if (!bestTimesPath || !namesRelaysPath) return;
  setLoading('Importing…');
  importBtn.disabled = true;
  try {
    await ensureDbPath();
    const data = await window.electronAPI.runBackend({
      command: 'import-files',
      dbPath,
      bestTimesPath,
      namesRelaysPath,
    });
    renderSwimmers(data.swimmers);
    alert(`Imported: ${data.imported || 0} added, ${data.updated || 0} updated.`);
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
    const data = await window.electronAPI.runBackend({ command: 'build-teams', dbPath });
    lastTeamsResult = data;
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

updateImportButton();
loadSwimmers();
loadCompetitions();
