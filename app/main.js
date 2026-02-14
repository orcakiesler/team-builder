const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
const backendDir = path.resolve(__dirname, '..', 'backend');

function getDbPath() {
  return path.join(app.getPath('userData'), 'swimmers.db');
}

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

ipcMain.handle('get-db-path', () => getDbPath());

ipcMain.handle('select-file', async (_, { which }) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: which === 'best_times' ? 'Select best times Excel file' : 'Select names/relays Excel file',
    filters: [{ name: 'Excel', extensions: ['xlsx', 'xls'] }],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  return result.filePaths[0];
});

ipcMain.handle('run-backend', async (_, options) => {
  const dbPath = options.dbPath || getDbPath();
  const command = options.command;
  const isWin = process.platform === 'win32';
  const useStdin = command === 'update-swimmer';

  const args = ['run', 'python', 'app_entry.py', '--db', dbPath, '--command', command];
  if (command === 'import-files' && options.bestTimesPath && options.namesRelaysPath) {
    args.push('--best-times', options.bestTimesPath, '--names-relays', options.namesRelaysPath);
  }
  if (command === 'build-teams' && options.referenceYear != null) {
    args.push('--reference-year', String(options.referenceYear));
  }

  return new Promise((resolve, reject) => {
    const stdio = useStdin ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'];
    const child = spawn('poetry', args, {
      cwd: backendDir,
      env: process.env,
      shell: isWin,
      stdio,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    if (useStdin && options.payload != null) {
      child.stdin.write(JSON.stringify(options.payload), (err) => {
        if (err) reject(err);
        else child.stdin.end();
      });
    }

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
