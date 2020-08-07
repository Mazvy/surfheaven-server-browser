const {app, BrowserWindow, Tray, Menu, ipcMain, ipcRenderer} = require('electron');
const ipc = require('electron').ipcMain

let win;

function createWindow () {
    win = new BrowserWindow({
        width: 680,
        height: 250,
        minHeight: 250,
        transparent: true, 
        frame: false, 
        resizable: true,
        skipTaskbar: false,
        webPreferences: {
            nodeIntegration: true
        }
    })

    win.loadFile('app/main.html');

  
}

app.on('ready', createWindow);

ipc.on('height', function(e, height) {
    win.setSize(650, height);
}); 