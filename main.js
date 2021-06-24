const { app, BrowserWindow } = require('electron');
const path = require('path');

require('electron-reload')(__dirname, {
    electron: path.join(__dirname, 'node_modules', '.bin', 'electron'),
    hardResetMethod: 'exit'
});

const createMainWindows = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'src/preload.js')
        }
    });

    win.loadFile('./src/home.html');
    win.removeMenu();
    win.webContents.openDevTools();
}

app.whenReady().then(createMainWindows);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindows();
});