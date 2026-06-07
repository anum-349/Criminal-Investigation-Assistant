const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;


function createWindow() {
  const iconPath = isDev
    ? path.join(__dirname, '../build/icon.ico')
    : path.join(process.resourcesPath, 'icon.ico');

  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: iconPath,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      autoplayPolicy: 'no-user-gesture-required', // ✅ lowercase 'p'
    },
  });

  mainWindow.setMenu(null);

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // ✅ Inject the sounds path so ToastContext can build file:// URLs
  // main.cjs
  mainWindow.webContents.on('did-finish-load', () => {
    // ✅ Force taskbar icon explicitly
    mainWindow.setIcon(iconPath);

    // ... your existing __APP_PATH__ injection
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
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});