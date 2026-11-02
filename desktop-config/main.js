const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024, height: 768,
    webPreferences: { nodeIntegration: false, contextIsolation: true }
  });
  // Loads the built web assets from the parent www/ folder
  win.loadFile(path.join(__dirname, '..', 'www', 'index.html'));
}

app.whenReady().then(createWindow);
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
