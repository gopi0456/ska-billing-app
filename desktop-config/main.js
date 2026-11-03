const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

// CRITICAL: Disable web security for local file access
app.commandLine.appendSwitch('disable-web-security');
app.commandLine.appendSwitch('allow-file-access-from-files');

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,       // Allow Node APIs in renderer if needed
      contextIsolation: false,     // Disable isolation for simpler debugging
      webSecurity: false           // Force allow local files
    },
    show: false                    // Don't show until ready-to-show event
  });

  // --- SMART PATH RESOLUTION FOR PACKAGED APPS ---
  let indexPath;
  
  // 1. Check if we are running from inside the ASAR archive (Production .exe)
  if (app.isPackaged) {
    // In packaged apps, __dirname points to resources/app.asar/dist/...
    // We need to go up to resources/, then into app.asar/, then our files.
    // Usually: resources/app.asar/dist-web/index.html
    const asarPath = path.join(process.resourcesPath, 'app.asar', 'dist-web', 'index.html');
    
    // Fallback: Sometimes structure is resources/app/dist-web/index.html
    const loosePath = path.join(process.resourcesPath, 'app', 'dist-web', 'index.html');
    
    if (fs.existsSync(asarPath)) {
      indexPath = asarPath;
    } else if (fs.existsSync(loosePath)) {
      indexPath = loosePath;
    } else {
      console.error("❌ ERROR: index.html not found in packaged app!");
      console.error("Checked:", asarPath);
      console.error("And:", loosePath);
      // Show error dialog so user sees something
      const { dialog } = require('electron');
      dialog.showErrorBox("App Load Error", "Could not find index.html. Please reinstall.");
      app.quit();
      return;
    }
  } 
  // 2. Development Mode (npm start)
  else {
    indexPath = path.join(__dirname, '..', 'www', 'index.html');
  }

  console.log("✅ Loading Index From:", indexPath);

  // Load the file
  win.loadFile(indexPath);

  // Open DevTools automatically for debugging (Remove this line after fixing!)
  win.webContents.openDevTools();

  // Show window only when content is ready to prevent flash of white
  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', () => {
    win = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
