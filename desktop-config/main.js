const { app, BrowserWindow, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// --- FIX FOR PORTABLE DATA LOSS ---
// Check if we are running as a portable app
if (process.env.PORTABLE_EXECUTABLE_DIR) {
  // Save data in a folder next to the .exe file
  const portableDataPath = path.join(process.env.PORTABLE_EXECUTABLE_DIR, 'SKA-Billing-Data');
  app.setPath('userData', portableDataPath);
}
// ----------------------------------

process.on('uncaughtException', function(e){
  // ... rest of your error handler
});

// ... rest of your main.js code
