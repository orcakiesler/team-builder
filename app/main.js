const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
const backendDir = path.resolve(__dirname, '..', 'backend');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('select-file', async (_, { which }) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: which === 'best_times' ? 'Select best times Excel file' : 'Select names/relays Excel file',
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('run-script', async (_, { bestTimesPath, namesRelaysPath }) => {
  return new Promise((resolve, reject) => {
    const isWin = process.platform === 'win32';
    const args = [
      'run', 'python', 'app_entry.py',
      '--best-times', bestTimesPath,
      '--names-relays', namesRelaysPath,
    ];
    const child = spawn('poetry', args, {
      cwd: backendDir,
      env: process.env,
      shell: isWin,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Process exited with code ${code}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout.trim()));
      } catch (e) {
        reject(new Error('Invalid output from backend.'));
      }
    });

    child.on('error', (err) => reject(err));
  });
});
