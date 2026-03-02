const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const initSqlJs = require('sql.js');
const { generateTeamsPDF } = require('./pdfExport');
const {
  STDIN_COMMANDS,
  WINDOW_DEFAULT_WIDTH,
  WINDOW_DEFAULT_HEIGHT,
  APP_DATA_DIR_NAME,
  DB_FILENAME,
} = require('./constants');

let mainWindow;
const backendDir = app.isPackaged
  ? path.join(process.resourcesPath, 'backend')
  : path.resolve(__dirname, '..', 'backend');

// Single persistent DB path - same path for dev and packaged so we never have two DBs.
let resolvedDbPath = null;

function getDbPath() {
  if (resolvedDbPath) return resolvedDbPath;
  // Use fixed env-based path so it's identical whether run via "npm start" or packaged app.
  const isWin = process.platform === 'win32';
  const baseDir = isWin
    ? path.join(process.env.APPDATA || process.env.LOCALAPPDATA || process.env.USERPROFILE || '.', APP_DATA_DIR_NAME)
    : path.join(process.env.HOME || '.', '.config', APP_DATA_DIR_NAME);
  const appDataDb = path.resolve(baseDir, DB_FILENAME);
  const projectDb = path.resolve(backendDir, 'relay_swimmers.db');

  try {
    fs.mkdirSync(baseDir, { recursive: true });
  } catch (_) {}

  if (!fs.existsSync(appDataDb)) {
    const oldElectronPath = path.join(app.getPath('appData'), APP_DATA_DIR_NAME, DB_FILENAME);
    if (fs.existsSync(oldElectronPath)) {
      try {
        fs.copyFileSync(oldElectronPath, appDataDb);
      } catch (_) {}
    } else if (fs.existsSync(projectDb)) {
      try {
        fs.copyFileSync(projectDb, appDataDb);
      } catch (_) {}
    }
  }
  resolvedDbPath = appDataDb;
  return resolvedDbPath;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: WINDOW_DEFAULT_WIDTH,
    height: WINDOW_DEFAULT_HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Always start at login page; login redirects to main app after success.
  const loginPath = path.join(__dirname, 'src', 'login.html');
  mainWindow.loadFile(loginPath);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  getDbPath(); // Resolve and cache the single DB path before any renderer or backend use
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

ipcMain.handle('get-db-path', () => getDbPath());

ipcMain.handle('backup-database', async () => {
  const dbPath = getDbPath();
  const defaultName = `swimmers-backup-${new Date().toISOString().slice(0, 10)}.db`;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Backup database',
    defaultPath: defaultName,
    filters: [{ name: 'SQLite database', extensions: ['db'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  try {
    fs.copyFileSync(dbPath, result.filePath);
    return { canceled: false, path: result.filePath };
  } catch (err) {
    throw new Error(err.message || 'Failed to copy database');
  }
});

ipcMain.handle('open-database-folder', async () => {
  const dbPath = getDbPath();
  const dir = path.dirname(dbPath);
  await shell.openPath(dir);
  return { path: dir };
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

/** When packaged, run `poetry install` in the bundled backend once so the venv has pandas etc. */
let backendInstallPromise = null;
function ensureBackendDeps() {
  if (!app.isPackaged) return Promise.resolve();
  if (backendInstallPromise) return backendInstallPromise;
  const isWin = process.platform === 'win32';
  backendInstallPromise = new Promise((resolve, reject) => {
    const child = spawn('poetry', ['install', '--no-interaction', '--no-root'], {
      cwd: backendDir,
      env: process.env,
      shell: isWin,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stderr = '';
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(stderr.trim() || `poetry install exited with code ${code}`));
    });
    child.on('error', (err) => reject(err));
  });
  return backendInstallPromise;
}

/** Run backend command; always uses main process DB path. */
async function runBackendCommand(options) {
  const dbPath = getDbPath();
  const command = options.command;
  const isWin = process.platform === 'win32';
  const useStdin = STDIN_COMMANDS.includes(command) && options.payload != null;
  const dbPathForBackend = path.resolve(dbPath).replace(/\\/g, '/');

  await ensureBackendDeps();

  const args = ['run', 'python', 'app_entry.py', '--db', dbPathForBackend, '--command', command];
  if (command === 'import-files') {
    if (options.bestTimesPath) args.push('--best-times', options.bestTimesPath);
    if (options.namesRelaysPath) args.push('--names-relays', options.namesRelaysPath);
  }
  if (command === 'build-teams' && options.referenceYear != null) {
    args.push('--reference-year', String(options.referenceYear));
  }
  if (command === 'build-teams' && options.meetStartDate) {
    args.push('--meet-start-date', options.meetStartDate);
  }
  if (options.competitionId != null && ['list-swimmers', 'build-teams', 'import-files', 'update-swimmer', 'delete-swimmers', 'add-swimmer'].includes(command)) {
    args.push('--competition-id', String(options.competitionId));
  }

  return new Promise((resolve, reject) => {
    const stdio = useStdin ? ['pipe', 'pipe', 'pipe'] : ['ignore', 'pipe', 'pipe'];
    const env = { ...process.env, RELAY_DB_PATH: dbPathForBackend };
    const child = spawn('poetry', args, {
      cwd: backendDir,
      env,
      shell: isWin,
      stdio,
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (d) => { stdout += d.toString(); });
    child.stderr.on('data', (d) => { stderr += d.toString(); });

    if (useStdin) {
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
}

ipcMain.handle('run-backend', async (_, options) => runBackendCommand(options));

// Load swimmers by reading the DB file directly in main (same path we write to; no backend timing).
async function loadSwimmersFromDb() {
  const dbPath = getDbPath();
  if (!fs.existsSync(dbPath)) return [];
  const SQL = await initSqlJs();
  const fileBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(fileBuffer);
  try {
    // Ensure team column exists (migrate if old DB)
    const pragma = db.exec('PRAGMA table_info(swimmers)');
    const columns = pragma && pragma[0] && pragma[0].values ? pragma[0].values.map((r) => r[1]) : [];
    if (!columns.includes('team')) {
      db.run('ALTER TABLE swimmers ADD COLUMN team TEXT');
      db.run("UPDATE swimmers SET team = 'Haifa - masters' WHERE team IS NULL OR team = ''");
    }
    const result = db.exec(
      'SELECT id, first_name, last_name, gender, year_of_birth, COALESCE(team, \'Haifa - masters\') AS team, freestyle_50, backstroke_50, breaststroke_50, butterfly_50, availability_json, medical_date FROM swimmers ORDER BY first_name, last_name'
    );
    if (!result.length || !result[0].values.length) return [];
    const cols = result[0].columns;
    const year = new Date().getFullYear();
    return result[0].values.map((row) => {
      const o = {};
      cols.forEach((c, i) => { o[c] = row[i]; });
      const first = o.first_name || '';
      const last = o.last_name || '';
      let availability = {};
      try {
        if (o.availability_json) availability = JSON.parse(o.availability_json);
      } catch (_) {}
      return {
        id: o.id,
        first_name: first,
        last_name: last,
        full_name: `${first} ${last}`.trim(),
        gender: o.gender || null,
        year_of_birth: o.year_of_birth,
        age: o.year_of_birth != null ? year - o.year_of_birth : null,
        team: o.team || 'Haifa - masters',
        freestyle_50: o.freestyle_50,
        backstroke_50: o.backstroke_50,
        breaststroke_50: o.breaststroke_50,
        butterfly_50: o.butterfly_50,
        availability,
        medical_date: o.medical_date || null,
      };
    });
  } finally {
    db.close();
  }
}

// Renderer calls this when ready; main reads DB file directly so list always matches what we write to.
ipcMain.handle('request-initial-swimmers', async () => {
  try {
    const swimmers = await loadSwimmersFromDb();
    return { swimmers };
  } catch (_) {
    return { swimmers: [] };
  }
});

ipcMain.handle('export-teams-pdf', async (_, payload) => {
  const { meetName, meetDate, meetLocation, teams } = payload || {};
  const safeName = (meetName || 'Relay Teams').replace(/[<>:"/\\|?*]/g, ' ').trim() || 'Relay Teams';
  const defaultName = `${safeName}.pdf`;
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Export teams to PDF',
    defaultPath: defaultName,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  if (result.canceled || !result.filePath) return { canceled: true };
  try {
    await generateTeamsPDF(result.filePath, { meetName: meetName || safeName, meetDate, meetLocation, teams });
    return { path: result.filePath, canceled: false };
  } catch (err) {
    throw new Error(err.message || 'Failed to write PDF');
  }
});
