const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

process.on('uncaughtException', function(e){
  try { dialog.showErrorBox('SK Aayurveda Billing - Error', String((e && e.stack) || e)); } catch(_) {}
});

/* Legacy Windows 7 safety switches (fix 0xc0000005 on old GPU/AV stacks) */
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu');
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('allow-file-access-from-files');

let win = null;

function findIndex() {
  const candidates = [
    path.join(__dirname, 'dist-web', 'index.html'),
    path.join(process.resourcesPath || '', 'app.asar', 'dist-web', 'index.html'),
    path.join(process.resourcesPath || '', 'app', 'dist-web', 'index.html'),
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
