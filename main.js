'u1 strict';

const electron = require('electron');
const app = electron.app;
const ipcMain = electron.ipcMain;
const BrowserWindow = electron.BrowserWindow;
var mainWindow = null;
var authWindow = null;

app.on('window-all-closed', function() {
  app.quit();
});

app.on('ready', function() {

  // ブラウザ(Chromium)の起動, 初期画面のロード
  mainWindow = new BrowserWindow({width: 800, height: 600});
  mainWindow.loadURL('file://' + __dirname + '/index.html');

  mainWindow.openDevTools();

  mainWindow.on('closed', function() {
    mainWindow = null;
  });
});

// 非同期でレンダラープロセスからのメッセージを受信し、メッセージを返信する
ipcMain.on('open-auth-window', function (event, arg) {
  //console.log("asynchronous-message arg : " + arg);
  //event.sender.send('asynchronous-reply', 'asynchronous-message main process.');
  
  /*
  authWindow = new BrowserWindow({width: 800, height: 600});
  authWindow.loadURL(arg);

  authWindow.on('closed', function() {
    authWindow = null;
  });
  */

  electron.shell.openExternal(arg)

});
