const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFile: (which) => ipcRenderer.invoke('select-file', { which }),
  runScript: (options) => ipcRenderer.invoke('run-script', options),
});
