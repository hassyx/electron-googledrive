'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');


const electron = require('electron');
const app = electron.app;
const {ipcRenderer} = require('electron')

// 非同期でレンダラープロセスからメインプロセスにメッセージを送信する
function asynchronousMessage(data) {
    /*
    ipcRenderer.on('asynchronous-reply', function(response) {
        console.log("asynchronousMessage response : " + response);
    });
    */
    ipcRenderer.send('open-auth-window', data);
}

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/drive-nodejs-quickstart.json
const SCOPES = ['https://www.googleapis.com/auth/drive.metadata.readonly'];
const TOKEN_PATH = path.join(fs.realpathSync('./'), 'drive-nodejs-quickstart.json');

window.onload = function () {
    // Load client secrets from a local file.
    fs.readFile('client_secret.json', function processClientSecrets(err, content) {
        if (err) {
            console.log('Error loading client secret file: ' + err);
            return;
        }

        authorize(JSON.parse(content), listFiles);       
    });
};

function authorize(credentials, callback) {
    var clientSecret = credentials.installed.client_secret;
    var clientId = credentials.installed.client_id;
    var redirectUrl = credentials.installed.redirect_uris[0];
    var auth = new googleAuth();
    var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

    // Check if we have previously stored a token.
    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) {
            getNewToken(oauth2Client, callback);
        } else {
            oauth2Client.credentials = JSON.parse(token);
            callback(oauth2Client);
        }
    });
}

const http = require('http');

function getNewToken(oauth2Client, callback) {
    getPort(port => {
        const authUrl = oauth2Client.generateAuthUrl({
            response_type: 'code token',
            redirect_uri: 'http://localhost:' + port,
            scope: SCOPES
        });

        // サーバを立てる
        http.createServer((req, res) => {
            // reqから情報を取得
            let postData = "";
            req.on("data", chunk => postData += chunk);
            req.on("end", () => {
                console.log(postData);
                const element = document.getElementById('text');
                element.textContent = req.url;

                res.writeHead(200, {'Content-Type': 'text/plain'});　
                res.write('hello world');
                res.end();
            });
        }).listen(port, 'localhost');

        // authUrlを別ウィンドウで表示する
        asynchronousMessage(authUrl);
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

const net = require('net');
let portrange = 45032

function getPort(cb) {
    var port = portrange;
    portrange += 1;

    var server = net.createServer();
    server.listen(port, function (err) {
        server.once('close', function () {
            cb(port);
        })
        server.close();
    })
    server.on('error', function (err) {
        getPort(cb);
    })
}
