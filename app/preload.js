const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getDbPath: () => ipcRenderer.invoke('get-db-path'),
  selectFile: (which) => ipcRenderer.invoke('select-file', { which }),
  runScript: (options) => ipcRenderer.invoke('run-script', options),
  runBackend: (options) => ipcRenderer.invoke('run-backend', options),
});
