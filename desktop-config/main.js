const { app, BrowserWindow, screen, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

process.on('uncaughtException', function(e){
  try { dialog.showErrorBox('SK Aayurveda Billing - Error', String((e && e.stack) || e)); } catch(_) {}
});
process.on('unhandledRejection', function(e){
  try { dialog.showErrorBox('SK Aayurveda Billing - Error', String((e && e.stack) || e)); } catch(_) {}
});

let win = null, server = null, port = 0;

const MIME = {
  '.html':'text/html; charset=utf-8', '.htm':'text/html; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.json':'application/json', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg',
  '.gif':'image/gif', '.svg':'image/svg+xml', '.ico':'image/x-icon',
  '.woff':'font/woff', '.woff2':'font/woff2', '.ttf':'font/ttf', '.map':'application/json',
  '.txt':'text/plain; charset=utf-8'
};

function webRoot(){
  const a = path.join(__dirname, 'dist-web');
  if (fs.existsSync(path.join(a, 'index.html'))) return a;
  const b = path.join(__dirname, '..', 'dist-web');
  if (fs.existsSync(path.join(b, 'index.html'))) return b;
  return a;
}

const SESSION_SHIM = '(' + function(){
  try {
    var saved = localStorage.getItem('skaDesktopSession');
    if (saved && !sessionStorage.getItem('currentUser')) sessionStorage.setItem('currentUser', saved);
    var os = sessionStorage.setItem.bind(sessionStorage);
    sessionStorage.setItem = function(k, v){ os(k, v); if (k === 'currentUser'){ try{ localStorage.setItem('skaDesktopSession', v); }catch(e){} } };
    var or = sessionStorage.removeItem.bind(sessionStorage);
    sessionStorage.removeItem = function(k){ or(k); if (k === 'currentUser'){ try{ localStorage.removeItem('skaDesktopSession'); }catch(e){} } };
  } catch(e){}
}.toString() + ')();';

function createWindow(useHttp){
  const wa = screen.getPrimaryDisplay().workAreaSize;
  const zoom = Math.max(0.75, Math.min(1.4, wa.width / 1366));

  win = new BrowserWindow({
    width: Math.min(1280, wa.width - 40),
    height: Math.min(860, wa.height - 40),
    center: true,
    webPreferences: { nodeIntegration: true, contextIsolation: false, webSecurity: false },
    show: false
  });

  // Normal window (use the maximize button if you want full screen).
  // To auto-maximize on small screens, uncomment next line:
  // if (wa.width < 1100) win.maximize();

  win.webContents.setZoomFactor(zoom);
  win.webContents.on('did-finish-load', function(){
    win.webContents.executeJavaScript(SESSION_SHIM).catch(function(){});
    try {
      const css = path.join(__dirname, 'desktop.css');
      if (fs.existsSync(css)) win.webContents.insertCSS(fs.readFileSync(css, 'utf8'));
    } catch(e){}
  });
  win.once('ready-to-show', function(){ win.show(); });

  if (useHttp && port) win.loadURL('http://127.0.0.1:' + port + '/index.html');
  else win.loadFile(path.join(webRoot(), 'index.html'));

  win.on('closed', function(){ win = null; });
}

app.whenReady().then(function(){
  const root = webRoot();
  server = http.createServer(function(req, res){
    try {
      let u = decodeURIComponent((req.url || '/').split('?')[0]);
      if (u === '/') u = '/index.html';
      const fp = path.join(root, path.normalize(u).replace(/^(\.\.[\/\\])+/, ''));
      if (fp.indexOf(root) !== 0 || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()){
        res.writeHead(404); res.end('Not found'); return;
      }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      fs.createReadStream(fp).pipe(res);
    } catch(e){ res.writeHead(500); res.end('Error'); }
  });
  server.on('error', function(){ server = null; createWindow(false); });
  server.listen(0, '127.0.0.1', function(){ port = server.address().port; createWindow(true); });
});

app.on('window-all-closed', function(){
  try { if (server) server.close(); } catch(e){}
  if (process.platform !== 'darwin') app.quit();
});
