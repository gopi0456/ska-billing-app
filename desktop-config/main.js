const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  // Load index.html from the built web assets (../../www relative to desktop-config)
  const fs = require('fs'); const prodPath = path.join(__dirname, '..', 'dist-web', 'index.html'); const devPath = path.join(__dirname, '..', '..', 'www', 'index.html'); win.loadFile(fs.existsSync(prodPath) ? prodPath : devPath);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
