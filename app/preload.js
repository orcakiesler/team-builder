const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  selectFile: (which) => ipcRenderer.invoke('select-file', { which }),
  runScript: (options) => ipcRenderer.invoke('run-script', options),
  runBackend: (options) => ipcRenderer.invoke('run-backend', options),
  requestInitialSwimmers: () => ipcRenderer.invoke('request-initial-swimmers'),
  exportTeamsToPdf: (payload) => ipcRenderer.invoke('export-teams-pdf', payload),
  backupDatabase: () => ipcRenderer.invoke('backup-database'),
  openDatabaseFolder: () => ipcRenderer.invoke('open-database-folder'),
});
