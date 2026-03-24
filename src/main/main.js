'use strict';

const { app, BrowserWindow, ipcMain, protocol, net } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const { registerIpcHandlers } = require('./ipc-handlers');

// Must be called before app.whenReady() — gives app:// a secure, standard origin
// so ES module imports and Web Workers work (file:// blocks cross-file imports in Chromium)
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true, supportFetchAPI: true, corsEnabled: true } },
]);

const APP_ROOT = path.join(__dirname, '..', '..');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'PDFWatermark Pro',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadURL('app://localhost/src/renderer/index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Serve all local app files through app:// so ES module imports work
  protocol.handle('app', (request) => {
    const pathname = new URL(request.url).pathname;
    const filePath = path.join(APP_ROOT, pathname.slice(1)); // strip leading /
    return net.fetch(pathToFileURL(filePath).toString());
  });

  createWindow();
  registerIpcHandlers();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
