const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');

function createWindow() {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    win.loadURL('http://localhost:3000'); // Adjust this to your React app's URL
}

app.whenReady().then(createWindow);

ipcMain.handle('open-directory-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
        return null;
    }
    return result.filePaths[0]; // Return the absolute path of the selected directory
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
}); 