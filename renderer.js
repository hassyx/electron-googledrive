'use strict';

const path = require('path');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');


const electron = require('electron');
const app = electron.remote.app;
const dialog = electron.remote.dialog;
const ipcRenderer = electron.ipcRenderer;
const fs = require('fs');

// 非同期でレンダラープロセスからメインプロセスにメッセージを送信する
function asynchronousMessage(data) {
    /*
    ipcRenderer.on('asynchronous-reply', function(response) {
        console.log("asynchronousMessage response : " + response);
    });
    */
    
    //ipcRenderer.send('open-auth-window', data);

    // webviewタグを取得し、loadURL(data)でGoogleの認証ページを読み込む。
    const webview = document.getElementById('authview');
    webview.loadURL(data);
}

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
const TOKEN_PATH = path.join(app.getPath('userData'), 'drive-nodejs-quickstart.json');
const SETTING_PATH = path.join(app.getPath('userData'), 'settings.json');

// トークンだけではなくウィンドウサイズとかも保存したい
let settings = {};

window.onload = () => {
    // 設定ファイルを読み込む
    fs.readFile(SETTING_PATH, (err, data) => {
        if (err) {
            // 存在しなかったらファイルを作成する
            setDefaultSetting(settings);

            fs.writeFile(SETTING_PATH, JSON.stringify(settings), err => {
                if (err) {
                    dialog.showErrorBox('エラー', '設定ファイルが読み込めません。');
                    app.quit();
                }
            });
        } else {
            try {
                settings = JSON.parse(data);
            } catch (e) {
                // 設定ファイルが異常なので、新たに設定する
                setDefaultSetting();
            }

        }
        authorize(listFiles);       
    });
};

window.onresize = () => {
    var webview = document.getElementById('authview');
    webview.style.height = document.documentElement.clientHeight + "px";
    webview.style.width = document.documentElement.clientWidth + "px";
}

function setDefaultSetting(settings) {
    settings = {
        // ここにデフォルトの設定を挿入
    };
}

function authorize(callback) {
    getPort(port => {
        let clientId = '513856185766-nqlth14qgv55ag90j1esi77kmlogpvu3.apps.googleusercontent.com';
        let redirectUrl = 'http://localhost:' + port;
        let auth = new googleAuth();
        let oauth2Client = new auth.OAuth2(clientId, '', redirectUrl);

        // Check if we have previously stored a token.
        fs.readFile(TOKEN_PATH, function(err, token) {
            if (err) {
                getNewToken(oauth2Client, port, callback);
            } else {
                /*
                oauth2Client.credentials = JSON.parse(token);
                callback(oauth2Client);
                */
            }
        });
    });
}

const http = require('http');

function getNewToken(oauth2Client, port, callback) {
    const authUrl = oauth2Client.generateAuthUrl({
        response_type: 'code token',
        scope: SCOPES
    });

    // サーバを立てる
    http.createServer((req, res) => { 
        httpCallback(req, res, oauth2Client, callback);
    }).listen(port, 'localhost');;

    // authUrlを別ウィンドウで表示する
    asynchronousMessage(authUrl);
}

function httpCallback(request, response, oauth2Client, callback) {
    // reqから情報を取得
    let postData = "";
    request.on("data", chunk => postData += chunk);
    request.on("end", () => {
        const code = parseUrlAndGetCode(request.url);
        
        response.writeHead(200, {'Content-Type': 'text/plain'});　
        if (code) {
            response.write('Authentication succeeded!');
            exchangeCodeForToken(oauth2Client, code, callback);
        } else {
            response.write('Authentication failed!');
            // 失敗した場合の処理を追加すべし
        }
        response.end();

        setTimeout(() => {
            // HTTPサーバ側では、認証ページのコールバックが返ってきた際に、
            // webviewタグを取得し、getURL()でurl(とフラグメント)を取得する。
            const webview = document.getElementById('authview');
            console.log(webview.getURL());
        }, 2000);

    });
}

function parseUrlAndGetCode(url) {
    let query = require('url').parse(url, true).query;

    if (query && query.code) {
        return query.code;
    } else {
        return null;
    }
};

function exchangeCodeForToken(oauth2Client, code, callback) {
    oauth2Client.getToken(code, function(err, token) {
        if (err) {
            console.log('Error while trying to retrieve access token', err);
            return;
        }
        oauth2Client.credentials = token;
        //storeToken(token);
        callback(oauth2Client);
    });
}

/*
function getNewToken(oauth2Client, callback) {
    var authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log('Authorize this app by visiting this url: ', authUrl);
    var rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question('Enter the code from that page here: ', function(code) {
        rl.close();
        oauth2Client.getToken(code, function(err, token) {
            if (err) {
                console.log('Error while trying to retrieve access token', err);
                return;
            }
            oauth2Client.credentials = token;
            storeToken(token);
            callback(oauth2Client);
        });
    });
}
*/

function storeToken(token) {
  fs.writeFile(TOKEN_PATH, JSON.stringify(token));
  console.log('Token stored to ' + TOKEN_PATH);
}

function listFiles(auth) {
    
    const elm = document.getElementById('text');
    elm.textContent = "hogehoge";


    var service = google.drive('v3');
    service.files.list({
        auth: auth,
        pageSize: 10,
        fields: "nextPageToken, files(id, name)"
    }, function(err, response) {
        if (err) {
            console.log('The API returned an error: ' + err);
            return;
        }
        var files = response.files;
        if (files.length == 0) {
            console.log('No files found.');
        } else {
            console.log('Files:');
            for (var i = 0; i < files.length; i++) {
            var file = files[i];
            console.log('%s (%s)', file.name, file.id);
            }
        }
    });
}

function getPort(callback) {
    var net = require('net');

    var srv = net.createServer(sock => {
        sock.end('Hello world\n');
    });
    srv.listen(0, () => {
        callback(srv.address().port);
        srv.close();
    });
}
