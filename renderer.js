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
const http = require('http');
const querystring = require('querystring');

const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
const TOKEN_PATH = path.join(app.getPath('userData'), 'drive-nodejs-quickstart.json');
const SETTING_PATH = path.join(app.getPath('userData'), 'settings.json');

// トークンだけではなくウィンドウサイズとかも保存したい
let settings = {};

// WebView領域がウィンドウのサイズと一致するように
window.onresize = () => {
    var webview = document.getElementById('authview');
    webview.style.height = document.documentElement.clientHeight + "px";
    webview.style.width = document.documentElement.clientWidth + "px";
}

window.onload = () => {
    // WebViewでページがロード完了した際に呼ばれるコールバックを設定
    var webview = document.getElementById('authview');
    webview.addEventListener('did-stop-loading', () => {
        const webview = document.getElementById('authview');
        const url = require('url').parse(webview.getURL(), true);
        if (url.hostname === "localhost") {
            // GoogleによるOAuth認証に成功し、localhostにリダイレクトされた。
            // ハッシュにaccess_tokenがあるか調べる
            const query = querystring.parse(url.hash.substring(1));
            if (query.error) {
                // TODO: エラー発生したのでリトライさせる
            } else {
                console.log(query.access_token);
            }
            
            /*
            oauth2Client.credentials.access_token = query.access_token;
            listFiles(oauth2Client);
            */
        }
    });

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
                // 設定ファイルが異常なので、初期値を設定する
                setDefaultSetting(settings);
            }
        }
        authorize();       
    });
};

function setDefaultSetting(settings) {
    settings = {
        // ここにデフォルトの設定を挿入
    };
}

function authorize() {
    getPort(port => {
        let clientId = '513856185766-nqlth14qgv55ag90j1esi77kmlogpvu3.apps.googleusercontent.com';
        let redirectUrl = 'http://localhost:' + port;
        let auth = new googleAuth();
        let oauth2Client = new auth.OAuth2(clientId, '', redirectUrl);
        
        // settingsにaccess_tokenが保存されているか？
        if (settings.access_token) {
            
        } else {
            getAccessToken(oauth2Client, port);
        }
    });
}

function getAccessToken(oauth2Client, port) {
    const authUrl = oauth2Client.generateAuthUrl({
        response_type: 'code token',
        scope: SCOPES
    });

    // サーバを立てる
    http.createServer((req, res) => { 
        httpCallback(req, res, oauth2Client);
    }).listen(port, 'localhost');

    // authUrlをWebView中にロードする
    const webview = document.getElementById('authview');
    webview.loadURL(authUrl);
}

function httpCallback(request, response, oauth2Client) {
    let postData = "";
    request.on("data", chunk => postData += chunk);
    request.on("end", () => response.end());
}

function parseUrlAndGetToken(url) {
    let query = require('url').parse(url, true).query;

    if (query && query.code) {
        return query.code;
    } else {
        return null;
    }
};

function listFiles(auth) {
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
