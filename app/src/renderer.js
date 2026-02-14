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
const loadingEl = document.getElementById('loading');
const modalOverlay = document.getElementById('swimmer-modal-overlay');
const modal = document.getElementById('swimmer-modal');
const modalName = document.getElementById('modal-swimmer-name');
const modalBody = document.getElementById('modal-body');
const modalFooter = document.getElementById('modal-footer');
const modalClose = document.getElementById('modal-close');
const modalEditBtn = document.getElementById('modal-edit-btn');
const editModalOverlay = document.getElementById('edit-modal-overlay');
const editModalClose = document.getElementById('edit-modal-close');
const editSwimmerForm = document.getElementById('edit-swimmer-form');
const editCancelBtn = document.getElementById('edit-cancel-btn');
const editSaveBtn = document.getElementById('edit-save-btn');

let dbPath = null;
let currentSwimmers = [];
let lastTeamsResult = null;
let swimmerBeingEdited = null;

async function ensureDbPath() {
  if (!dbPath) dbPath = await window.electronAPI.getDbPath();
  return dbPath;
}

function getPaths() {
  const best = (pathBestTimes.value || '').trim();
  const names = (pathNamesRelays.value || '').trim();
  return { bestTimesPath: best || null, namesRelaysPath: names || null };
}

function setLoading(msg = 'Loading…') {
  loadingEl.textContent = msg;
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
  card.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    card.classList.add('drag-over');
  });
  card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
  card.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    card.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file && /\.(xlsx|xls)$/i.test(file.name)) {
      setFile(which, file.path);
    }
  });
}

setupDrop(cardBestTimes, 'best_times');
setupDrop(cardNamesRelays, 'names_relays');

function formatTime(sec) {
  if (sec == null) return '–';
  const s = Number(sec);
  if (isNaN(s)) return '–';
  return `${s.toFixed(2)}s`;
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
  const strokeLabels = ['Backstroke', 'Breaststroke', 'Butterfly', 'Freestyle'];
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
          html += `<li><span class="stroke-label">${team.stroke_labels[i]}:</span>${escapeHtml(s.full_name)} <span class="swimmer-time">(${formatTime(time)})</span></li>`;
        });
      } else {
        team.swimmers.forEach((s) => {
          html += `<li>${escapeHtml(s.full_name)} <span class="swimmer-time">(${formatTime(s.freestyle_50)})</span></li>`;
        });
      }
      html += `</ul></div>`;
    }
    html += `</div>`;
  }
  teamsContainer.innerHTML = html || '<p class="text-muted">No teams built.</p>';
}

function renderSwimmers(swimmers) {
  if (!swimmers || swimmers.length === 0) {
    swimmersList.innerHTML = '<p class="text-muted">No swimmers in database. Import from Excel files.</p>';
    return;
  }
  swimmersList.innerHTML = swimmers
    .map((s, index) => `<div class="swimmer-item" data-index="${index}">${escapeHtml(s.full_name)}</div>`)
    .join('');

  swimmersList.querySelectorAll('.swimmer-item').forEach((el) => {
    el.addEventListener('click', () => {
      const index = parseInt(el.getAttribute('data-index'), 10);
      openSwimmerModal(swimmers[index]);
    });
  });
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
  if (e.target === modalOverlay) {
    modalOverlay.classList.add('hidden');
    swimmerBeingEdited = null;
  }
});

modalEditBtn.addEventListener('click', () => {
  if (!swimmerBeingEdited) return;
  openEditModal(swimmerBeingEdited);
});

function openEditModal(s) {
  const avail = s.availability || {};
  const availabilityKeys = Object.keys(avail);
  let availHtml = '';
  if (availabilityKeys.length) {
    availHtml = '<div class="form-group"><label>Availability</label><div class="availability-checkboxes">';
    for (const k of availabilityKeys) {
      const checked = avail[k] ? ' checked' : '';
      availHtml += `<label><input type="checkbox" name="avail_${escapeHtml(k)}" data-key="${escapeHtml(k)}"${checked}> ${escapeHtml(k)}</label>`;
    }
    availHtml += '</div></div>';
  }

  editSwimmerForm.innerHTML = `
    <input type="hidden" name="id" value="${s.id ?? ''}">
    <div class="form-group">
      <label>First name</label>
      <input type="text" name="first_name" value="${escapeHtml(s.first_name ?? '')}">
    </div>
    <div class="form-group">
      <label>Last name</label>
      <input type="text" name="last_name" value="${escapeHtml(s.last_name ?? '')}">
    </div>
    <div class="form-group">
      <label>Gender</label>
      <input type="text" name="gender" value="${escapeHtml(s.gender ?? '')}" placeholder="e.g. M / F">
    </div>
    <div class="form-group">
      <label>Year of birth</label>
      <input type="number" name="year_of_birth" value="${s.year_of_birth ?? ''}" placeholder="e.g. 2010" min="1900" max="2030">
    </div>
    <div class="form-group">
      <label>50 Free (seconds)</label>
      <input type="number" name="freestyle_50" step="0.01" value="${s.freestyle_50 ?? ''}" placeholder="e.g. 28.50">
    </div>
    <div class="form-group">
      <label>50 Back (seconds)</label>
      <input type="number" name="backstroke_50" step="0.01" value="${s.backstroke_50 ?? ''}">
    </div>
    <div class="form-group">
      <label>50 Breast (seconds)</label>
      <input type="number" name="breaststroke_50" step="0.01" value="${s.breaststroke_50 ?? ''}">
    </div>
    <div class="form-group">
      <label>50 Fly (seconds)</label>
      <input type="number" name="butterfly_50" step="0.01" value="${s.butterfly_50 ?? ''}">
    </div>
    ${availHtml}
  `;
  editModalOverlay.classList.remove('hidden');
}

function closeEditModal() {
  editModalOverlay.classList.add('hidden');
}

editModalClose.addEventListener('click', closeEditModal);
editCancelBtn.addEventListener('click', closeEditModal);
editModalOverlay.addEventListener('click', (e) => {
  if (e.target === editModalOverlay) closeEditModal();
});

editSaveBtn.addEventListener('click', async () => {
  const id = editSwimmerForm.querySelector('input[name="id"]').value;
  if (!id) return;
  const payload = {
    id: parseInt(id, 10),
    first_name: editSwimmerForm.querySelector('input[name="first_name"]').value.trim(),
    last_name: editSwimmerForm.querySelector('input[name="last_name"]').value.trim(),
    gender: editSwimmerForm.querySelector('input[name="gender"]').value.trim() || null,
    year_of_birth: (() => {
      const v = editSwimmerForm.querySelector('input[name="year_of_birth"]').value.trim();
      return v ? parseInt(v, 10) : null;
    })(),
    freestyle_50: parseFloatOrNull(editSwimmerForm.querySelector('input[name="freestyle_50"]').value),
    backstroke_50: parseFloatOrNull(editSwimmerForm.querySelector('input[name="backstroke_50"]').value),
    breaststroke_50: parseFloatOrNull(editSwimmerForm.querySelector('input[name="breaststroke_50"]').value),
    butterfly_50: parseFloatOrNull(editSwimmerForm.querySelector('input[name="butterfly_50"]').value),
  };
  const availability = {};
  editSwimmerForm.querySelectorAll('input[type="checkbox"][data-key]').forEach((cb) => {
    availability[cb.getAttribute('data-key')] = cb.checked;
  });
  payload.availability = availability;

  setLoading('Saving…');
  try {
    await ensureDbPath();
    const result = await window.electronAPI.runBackend({
      command: 'update-swimmer',
      dbPath,
      payload,
    });
    if (result.swimmer) {
      const idx = currentSwimmers.findIndex((s) => s.id === result.swimmer.id);
      if (idx !== -1) currentSwimmers[idx] = result.swimmer;
      renderSwimmers(currentSwimmers);
    }
    closeEditModal();
    modalOverlay.classList.add('hidden');
  } catch (err) {
    alert('Error: ' + (err.message || String(err)));
  } finally {
    clearLoading();
  }
});

function parseFloatOrNull(val) {
  if (val == null || String(val).trim() === '') return null;
  const n = parseFloat(val);
  return isNaN(n) ? null : n;
}

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

importBtn.addEventListener('click', async () => {
  const { bestTimesPath, namesRelaysPath } = getPaths();
  if (!bestTimesPath || !namesRelaysPath) return;
  setLoading('Importing from files…');
  importBtn.disabled = true;
  try {
    await ensureDbPath();
    const data = await window.electronAPI.runBackend({
      command: 'import-files',
      dbPath,
      bestTimesPath,
      namesRelaysPath,
    });
    currentSwimmers = data.swimmers || [];
    renderSwimmers(currentSwimmers);
    const added = data.imported ?? 0;
    const updated = data.updated ?? 0;
    alert(`Import done. Added: ${added}, updated: ${updated}.`);
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
    currentSwimmers = data.swimmers || [];
    renderTeams(data.teams);
    renderSwimmers(currentSwimmers);
    resultsSection.classList.remove('hidden');
  } catch (err) {
    alert('Error: ' + (err.message || String(err)));
  } finally {
    clearLoading();
    runBtn.disabled = false;
  }
});

updateImportButton();
loadSwimmers();
