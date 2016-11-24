const electron = require('electron');
const app = electron.app;

const {ipcRenderer} = require('electron')

// 非同期でレンダラープロセスからメインプロセスにメッセージを送信する
function asynchronousMessage() {
    console.log("asynchronousMessage");
    ipcRenderer.on('asynchronous-reply', function(response) {
        console.log("asynchronousMessage response : " + response);
    });
    ipcRenderer.send('asynchronous-message', 'asynchronous-message render process.');
}