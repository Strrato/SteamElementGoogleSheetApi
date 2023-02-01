require('dotenv').config();
const express = require('express');
const app = express();
const API_TOKEN = process.env.API_TOKEN;
const cors = require('cors');
const SECURITY_REGEX = /["'`]+/;
const fetch = require('node-fetch');
const Db = require('./assets/js/Db');
const Utils = require('./assets/js/Utils');
const {google} = require('googleapis');

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_API_CLIENT,
    process.env.GOOGLE_API_SECRET,
    process.env.REDIRECT_URI
);

const scopes = [
    'https://www.googleapis.com/auth/spreadsheets'
];

const Authurl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
});

oauth2Client.on('tokens', (tokens) => {
    if (tokens.refresh_token) {
        console.log('Save tokens for user');
        Db.setUser(process.env.AUTHORIZED_USER, tokens.refresh_token, tokens.access_token);
    }else {
        console.log('Update access token');
        Db.updateAccessToken(process.env.AUTHORIZED_USER, tokens.access_token);
    }
});

app.use(cors({
    origin: '*'
}));

app.listen(2000, () => {
    console.log('Server listen on port 2000');
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.get('/authorize/:userId', (req, res) => {
    let userId = req.params.userId;
    userId = Utils.satanize(userId);

    if (userId !== process.env.AUTHORIZED_USER){
        res.status(401).send('UNAUTHORIZED');
        return;
    }

    res.redirect(Authurl);
});

app.get('/gapiauth', (req, res) => {
    let code = req.query.code;

    if (!code){
        res.status(401).send('UNAUTHORIZED');
        return;
    }

    oauth2Client.getToken(code).then(token => {
        oauth2Client.setCredentials(token);
    }, err => {
        console.log(err);
    });
    res.send('Authorized');
});

app.get('/api/sheetdata/:userId/:sheet/:range', (req, res) => {
    console.log('get on api/sheetdata');
  
    let headerToken = req.header('X-AUTH-TOKEN');
    headerToken = headerToken.replace(SECURITY_REGEX, "Invalid");
    
    if ( typeof headerToken === typeof void(0) || !headerToken){
      res.status(403).send("UNAUTHORIZED");
      return;
    }
  
    if ( headerToken !== API_TOKEN ){
      res.status(403).send("UNAUTHORIZED");
      return;
    }

    let userId = req.params.userId;
    userId = Utils.satanize(userId);
    if (typeof userId === typeof void(0) || userId === ""){
      res.status(404).send("Missings userId in request");
      return;
    }
    
    let sheet = req.params.sheet;
    sheet = Utils.satanize(sheet);
    if (typeof sheet === typeof void(0) || sheet === ""){
        res.status(404).send("Missings sheet in request");
        return;
    }
    
    let range = req.params.range;
    range = Utils.satanize(range);
    if (typeof range === typeof void(0) || range === ""){
        res.status(404).send("Missings range in request");
        return;
    }

    let user = Db.getUser(userId);
    if (!user.user || !user.refresh_token || !user.access_token){
        res.status(400).send('Authentification required');
        return;
    }

    oauth2Client.setCredentials({
        refresh_token: user.refresh_token,
        access_token: user.access_token,
        scope: 'https://www.googleapis.com/auth/spreadsheets'
    });

    callGoogleSheetApi(user, sheet, range).then(data => {
        res.status(200).send(JSON.stringify(data));
    }, error => {
        res.status(400).send(error);
    })

});

function callGoogleSheetApi(user, sheet, range){
    return new Promise((resolve, reject) => {

        oauth2Client.getAccessToken().then(res => {
            if (res.token){
                console.log('Call Google api for sheet', sheet);
                console.log('Range : ', range);
                fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheet}/values/${range}`,
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${res.token}`  
                    }
                })
                .then(response => response.json())
                .then(data => {
                    if (Utils.defined(data.error)){
                        if (data.error.code === 401){
                            console.log('Google api error : ', data.error.message);
                            Db.removeUser(user.user);
                        }

                        reject(data.error.message);
                    }
                    resolve(data);
                })
                .catch(err => {
                    console.log('Google api error : ', err);
                    Db.removeUser(user.user);
                    reject('Authentification required');
                });

            }
        }, error => {
            console.log('refresh token error : ', error);
            Db.removeUser(user.user);
            reject('Authentification required');
        });
    });
}