const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('allow-file-access-from-files');

let win;

function findIndex() {
  const candidates = [
    path.join(__dirname, 'dist-web', 'index.html'),
    path.join(process.resourcesPath || '', 'app.asar', 'dist-web', 'index.html'),
    path.join(process.resourcesPath || '', 'app', 'dist-web', 'index.html'),
    path.join(__dirname, '..', 'dist-web', 'index.html'),
    path.join(__dirname, 'www', 'index.html'),
    path.join(__dirname, '..', 'www', 'index.html')
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch (e) {}
  }
  return null;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false },
    show: false
  });

  const indexPath = findIndex();
  if (!indexPath) {
    dialog.showErrorBox('App Load Error', 'Could not find index.html in any known location.');
    app.quit();
    return;
  }
  console.log('Loading:', indexPath);
  win.loadFile(indexPath);
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
