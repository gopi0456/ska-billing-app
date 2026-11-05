const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

process.on('uncaughtException', function(e){
  try { dialog.showErrorBox('SK Aayurveda Billing - Error', String((e && e.stack) || e)); } catch(_) {}
});

/* Legacy Windows 7 safety switches (fix 0xc0000005 and ffmpeg errors) */
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('allow-file-access-from-files');

/* FIX FOR DATA LOSS: Force Electron to save user data in AppData */
const userDataPath = path.join(app.getPath('appData'), 'SKA-Billing-Data');
app.setPath('userData', userDataPath);

let win = null;

function findIndex() {
  const candidates = [
    path.join(__dirname, 'dist-web', 'index.html'),
    path.join(process.resourcesPath || '', 'app', 'dist-web', 'index.html'),
    path.join(process.resourcesPath || '', 'dist-web', 'index.html'),
    path.join(__dirname, '..', 'dist-web', 'index.html')
  ];
  for (const c of candidates) {
    try { if (fs.existsSync(c)) return c; } catch (e) {}
  }
  return null;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1100,
    height: 780,
    center: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false },
    show: false
  });
  
  const indexPath = findIndex();
  if (!indexPath) {
    dialog.showErrorBox('App Load Error', 'Could not find index.html. Please reinstall.');
    app.quit();
    return;
  }
  
  win.loadFile(indexPath);
  win.once('ready-to-show', function(){ win.show(); });
  win.on('closed', function(){ win = null; });
}

app.whenReady().then(createWindow);
app.on('window-all-closed', function(){
  if (process.platform !== 'darwin') app.quit();
});
