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
    const avail = s.availability || {};
    const availList = Object.entries(avail)
      .map(([k, v]) => `<li><span>${utils.escapeHtml(k)}</span><span>${v ? 'Yes' : 'No'}</span></li>`)
      .join('');
    const medicalStr = s.medical_date && String(s.medical_date).trim() ? utils.escapeHtml(String(s.medical_date).slice(0, 10)) : '–';
    modalBody.innerHTML = `
      <dl>
        <dt>First name</dt><dd>${utils.escapeHtml(s.first_name)}</dd>
        <dt>Last name</dt><dd>${utils.escapeHtml(s.last_name)}</dd>
        <dt>Gender</dt><dd>${utils.escapeHtml(s.gender ?? '–')}</dd>
        <dt>Year of birth</dt><dd>${s.year_of_birth ?? '–'}</dd>
        <dt>Age</dt><dd>${s.age ?? '–'}</dd>
        <dt>Medical date</dt><dd>${medicalStr}</dd>
        <dt>50 Free</dt><dd>${utils.formatTime(s.freestyle_50)}</dd>
        <dt>50 Back</dt><dd>${utils.formatTime(s.backstroke_50)}</dd>
        <dt>50 Breast</dt><dd>${utils.formatTime(s.breaststroke_50)}</dd>
        <dt>50 Fly</dt><dd>${utils.formatTime(s.butterfly_50)}</dd>
        <dt>Availability</dt>
        <dd><ul class="availability-list">${availList || '<li>–</li>'}</ul></dd>
      </dl>
    `;
    modalFooter.classList.toggle('hidden', !s.id);
    modalOverlay.classList.remove('hidden');
  }

  function buildEditFormHTML() {
    const availCheckboxes = AVAILABILITY_KEYS.map(
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
    swimmerBeingEdited = swimmer;
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
    swimmerBeingEdited = null;
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
      const yob = year_of_birth === '' ? null : parseInt(year_of_birth, 10);
      if (year_of_birth === '' || isNaN(yob) || yob < 1900 || yob > 2030) {
        alert('Please enter a valid birth year (1900–2030).');
        return;
      }
      api.setLoading('Saving…');
      try {
        await api.ensureDbPath();
        const payload = getEditFormPayload();
        await window.electronAPI.runBackend({ command: 'update-swimmer', dbPath: state.dbPath, payload });
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
      api.setLoading('Adding competition…');
      try {
        await api.ensureDbPath();
        const data = await window.electronAPI.runBackend({
          command: 'add-competition',
          dbPath: state.dbPath,
          payload: { name, start_date: start, end_date: end, location },
        });
        if (window.RelayApp.meetSelector && window.RelayApp.meetSelector.renderCompetitions) {
          window.RelayApp.meetSelector.renderCompetitions(data.competitions);
        }
        closeAddCompetitionModal();
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

      api.setLoading('Adding swimmer…');
      try {
        await api.ensureDbPath();
        const data = await window.electronAPI.runBackend({
          command: 'add-swimmer',
          dbPath: state.dbPath,
          payload,
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

  function openAddCompetitionModal() {
    if (addCompetitionForm) addCompetitionForm.reset();
    const loc = document.getElementById('comp-location');
    if (loc) loc.value = '';
    if (addCompetitionModal) addCompetitionModal.classList.remove('hidden');
  }

  window.RelayApp.modals = {
    openSwimmerModal,
    openEditModal,
    closeEditModal,
    closeAddCompetitionModal,
    closeAddSwimmerModal,
    openAddCompetitionModal,
    resetAddSwimmerForm,
    showAddSwimmerStep,
    ensureAddSwimmerAvailabilityCheckboxes,
  };
})();
