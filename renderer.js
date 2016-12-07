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
const SETTING_PATH = path.join(app.getPath('userData'), 'settings.json');

// トークンだけではなくウィンドウサイズとかも保存したい
let settings = {};

// WebView領域がウィンドウのサイズと一致するように
window.onresize = () => {
    var webview = document.getElementById('authview');
    webview.style.height = document.documentElement.clientHeight + "px";
    webview.style.width = document.documentElement.clientWidth + "px";
}

// WebViewでページがロード完了した際に呼ばれるコールバック
function webViewDidStopLoading() {
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
        
        settings.access_token = query.access_token;
        fs.writeFile(SETTING_PATH, JSON.stringify(settings), err => {
            if (err) {
                dialog.showErrorBox('エラー', '設定ファイルが読み込めません。');
                app.quit();
                // TODO:リトライ
            }
        });

        /*
        oauth2Client.credentials.access_token = query.access_token;
        listFiles(oauth2Client);
        */
    }
}

window.onload = () => {
    var webview = document.getElementById('authview');
    webview.addEventListener('did-stop-loading', webViewDidStopLoading);

    // 設定ファイルを読み込む
    fs.readFile(SETTING_PATH, (err, data) => {
        if (err) {
            setDefaultSetting(settings);
            // 存在しなかったので設定ファイルを作成する
            fs.writeFile(SETTING_PATH, JSON.stringify(settings), err => {
                if (err) {
                    dialog.showErrorBox('エラー', '設定ファイルが読み込めません。');
                    app.quit();
                    // TODO:リトライ
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
            // TODO: ファイル一覧を表示する
            console.log('アクセストークンはすでに存在します:' + settings.access_token);
        } else {
            authrize(oauth2Client, port);
        }
    });
}

function authrize(oauth2Client, port) {
    const authUrl = oauth2Client.generateAuthUrl({
        response_type: 'code token',
        scope: SCOPES
    });

    // サーバを立てる
    http.createServer(httpCallback).listen(port, 'localhost');

    // authUrlをWebView中に表示、ユーザーにGoogleへのログインを求める
    const webview = document.getElementById('authview');
    webview.loadURL(authUrl);
}

function httpCallback(request, response) {
    // 念のためpostされたデータは受け取っておく
    let postData = "";
    request.on("data", chunk => postData += chunk);
    request.on("end", () => response.end());
}

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
