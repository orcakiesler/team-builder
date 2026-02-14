const cardBestTimes = document.getElementById('card-best-times');
const cardNamesRelays = document.getElementById('card-names-relays');
const nameBestTimes = document.getElementById('name-best-times');
const nameNamesRelays = document.getElementById('name-names-relays');
const pathBestTimes = document.getElementById('path-best-times');
const pathNamesRelays = document.getElementById('path-names-relays');
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
const modalClose = document.getElementById('modal-close');

let lastResult = null;

function getPaths() {
  const best = (pathBestTimes.value || '').trim();
  const names = (pathNamesRelays.value || '').trim();
  return { bestTimesPath: best || null, namesRelaysPath: names || null };
}

function updateRunButton() {
  const { bestTimesPath, namesRelaysPath } = getPaths();
  const both = bestTimesPath && namesRelaysPath;
  runBtn.disabled = !both;
  runHint.textContent = both ? 'Click to build teams.' : 'Choose both files to enable.';
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
  updateRunButton();
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

function renderTeams(teamsByEvent) {
  const strokeLabels = ['Backstroke', 'Breaststroke', 'Butterfly', 'Freestyle'];
  let html = '';
  for (const [eventName, teams] of Object.entries(teamsByEvent)) {
    if (!teams.length) continue;
    html += `<div class="event-block"><h4>${escapeHtml(eventName)}</h4>`;
    for (const team of teams) {
      const [lo, hi] = team.age_group_range;
      html += `<div class="team-block">`;
      html += `<div class="age-group">Age group ${lo}–${hi}</div>`;
      html += `<div class="team-time">Total time: ${team.total_time}s (age sum: ${team.total_age})</div>`;
      html += `<ul class="swimmers-list">`;
      if (team.is_medley && team.stroke_labels) {
        team.swimmers.forEach((s, i) => {
          html += `<li><span class="stroke-label">${team.stroke_labels[i]}:</span>${escapeHtml(s.full_name)}</li>`;
        });
      } else {
        team.swimmers.forEach((s) => {
          html += `<li>${escapeHtml(s.full_name)}</li>`;
        });
      }
      html += `</ul></div>`;
    }
    html += `</div>`;
  }
  teamsContainer.innerHTML = html || '<p class="text-muted">No teams built.</p>';
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderSwimmers(swimmers) {
  swimmersList.innerHTML = swimmers
    .map((s, index) => `<div class="swimmer-item" data-index="${index}">${escapeHtml(s.full_name)}</div>`)
    .join('');

  swimmersList.querySelectorAll('.swimmer-item').forEach((el) => {
    el.addEventListener('click', () => {
      const index = parseInt(el.getAttribute('data-index'), 10);
      openSwimmerModal(lastResult.swimmers[index]);
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
  modalOverlay.classList.remove('hidden');
}

modalClose.addEventListener('click', () => modalOverlay.classList.add('hidden'));
modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) modalOverlay.classList.add('hidden');
});

runBtn.addEventListener('click', async () => {
  const { bestTimesPath, namesRelaysPath } = getPaths();
  if (!bestTimesPath || !namesRelaysPath) return;
  loadingEl.classList.remove('hidden');
  runBtn.disabled = true;
  try {
    const data = await window.electronAPI.runScript({ bestTimesPath, namesRelaysPath });
    lastResult = data;
    renderTeams(data.teams);
    renderSwimmers(data.swimmers);
    resultsSection.classList.remove('hidden');
  } catch (err) {
    alert('Error: ' + (err.message || String(err)));
  } finally {
    loadingEl.classList.add('hidden');
    updateRunButton();
  }
});

updateRunButton();
