const { app, BrowserWindow, Tray, nativeImage } = require('electron');
const path = require('path');

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function log(msg) {
  fs.appendFileSync(logFile, `${new Date().toISOString()} ${msg}\n`);
}

function resolveIconPath() {
  if (isDev) {
    return path.join(__dirname, '../build/icon.ico');
  }

  const candidates = [
    path.join(process.resourcesPath, 'icon.ico'),
    path.join(path.dirname(app.getPath('exe')), 'resources', 'icon.ico'),
    path.join(app.getAppPath(), '..', 'icon.ico'),
  ];

  for (const p of candidates) {
    const exists = fs.existsSync(p);
    if (exists) return p;
  }

  return null;
}

const iconPath = resolveIconPath(); 

let tray = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath ?? undefined,           // taskbar icon on Linux/Windows
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#1b3c53',
      symbolColor: '#ffffff',
      height: 40,
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      autoplayPolicy: 'no-user-gesture-required',
    },
  });

  mainWindow.setMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.webContents.on('did-finish-load', () => {
    if (iconPath) mainWindow.setIcon(iconPath);

    const soundsPath = isDev
      ? path.join(__dirname, '../public/sounds')
      : path.join(process.resourcesPath, 'sounds');

    mainWindow.webContents.executeJavaScript(`
      window.__APP_PATH__ = ${JSON.stringify(soundsPath.replace(/\\/g, '/'))};
      window.__ELECTRON__ = true;
    `);
  });
}

app.whenReady().then(() => {
  createWindow();

  if (iconPath) {
    const icon = nativeImage.createFromPath(iconPath);
    if (!icon.isEmpty()) {
      tray = new Tray(icon);
      tray.setToolTip('Criminal Investigation Assistant');
    }
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});