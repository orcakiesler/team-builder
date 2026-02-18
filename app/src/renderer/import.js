(function () {
  window.RelayApp = window.RelayApp || {};
  const state = window.RelayApp.state;
  const api = window.RelayApp.api;

  const importModal = document.getElementById('import-files-modal-overlay');
  const cardBestTimes = document.getElementById('card-best-times');
  const cardNamesRelays = document.getElementById('card-names-relays');
  const nameBestTimes = document.getElementById('name-best-times');
  const nameNamesRelays = document.getElementById('name-names-relays');
  const pathBestTimes = document.getElementById('path-best-times');
  const pathNamesRelays = document.getElementById('path-names-relays');
  const importBtn = document.getElementById('import-btn');

  function openImportModal() {
    if (importModal) importModal.classList.remove('hidden');
    updateImportButton();
  }

  function closeImportModal() {
    if (importModal) importModal.classList.add('hidden');
  }

  function updateImportButton() {
    const { bestTimesPath, namesRelaysPath } = api.getPaths();
    const atLeastOne = bestTimesPath || namesRelaysPath;
    if (importBtn) importBtn.disabled = !atLeastOne;
  }

  function setFile(which, filePath) {
    const name = filePath ? filePath.split(/[/\\]/).pop() : null;
    if (which === 'best_times') {
      if (pathBestTimes) pathBestTimes.value = filePath || '';
      if (nameBestTimes) nameBestTimes.textContent = name || 'Drop file or click to browse';
      if (cardBestTimes) cardBestTimes.classList.toggle('has-file', !!filePath);
    } else {
      if (pathNamesRelays) pathNamesRelays.value = filePath || '';
      if (nameNamesRelays) nameNamesRelays.textContent = name || 'Drop file or click to browse';
      if (cardNamesRelays) cardNamesRelays.classList.toggle('has-file', !!filePath);
    }
    updateImportButton();
  }

  async function onCardClick(which) {
    const path = await window.electronAPI.selectFile(which);
    if (path) setFile(which, path);
  }

  function setupDrop(card, which) {
    if (!card) return;
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

  if (importBtn) {
    importBtn.addEventListener('click', async () => {
      const { bestTimesPath, namesRelaysPath } = api.getPaths();
      if (!bestTimesPath && !namesRelaysPath) return;
      api.setLoading('Importing…');
      importBtn.disabled = true;
      try {
        await api.ensureDbPath();
        const data = await window.electronAPI.runBackend({
          command: 'import-files',
          dbPath: state.dbPath,
          bestTimesPath: bestTimesPath || undefined,
          namesRelaysPath: namesRelaysPath || undefined,
          competitionId: state.selectedMeetId ?? undefined,
        });
        if (window.RelayApp.swimmers && window.RelayApp.swimmers.renderSwimmers) {
          window.RelayApp.swimmers.renderSwimmers(data.swimmers);
        }
        let msg = `Imported: ${data.imported || 0} added, ${data.updated || 0} updated.`;
        if (data.skipped && data.skipped.length) {
          msg += `\n\nNot in database (best-times only, not added):\n${data.skipped.join('\n')}`;
        }
        alert(msg);
        closeImportModal();
      } catch (err) {
        alert('Error: ' + (err.message || String(err)));
      } finally {
        api.clearLoading();
        updateImportButton();
      }
    });
  }

  const openImportBtn = document.getElementById('open-import-modal-btn');
  const importModalClose = document.getElementById('import-files-modal-close');
  if (openImportBtn) openImportBtn.addEventListener('click', openImportModal);
  if (importModalClose) importModalClose.addEventListener('click', closeImportModal);
  if (importModal) {
    importModal.addEventListener('click', (e) => {
      if (e.target === importModal) closeImportModal();
    });
  }

  updateImportButton();

  window.RelayApp.import = { setFile, updateImportButton, openImportModal, closeImportModal };
})();
