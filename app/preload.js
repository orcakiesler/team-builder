const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  selectFile: (which) => ipcRenderer.invoke('select-file', { which }),
  runBackend: (options) => ipcRenderer.invoke('run-backend', options),
});
