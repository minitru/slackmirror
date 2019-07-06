var express = require('express');
var http = require('http');
var Client = require('oauth2');
const request = require('request');

require('dotenv').config();   
var client = new Client();
client.createCredentials({
    "client_id" : process.env.CLIENT_ID,
    "client_secret" : process.env.CLIENT_SECRET,
    "scope": ["channels:history", "channels:read", "chat:write:user", "chat:write:bot"],
    "redirect_url": "https://YOUR-OAUTH/auth"
});
client.setAuthEndPoint("https://slack.com/oauth/authorize");
client.setOauthEndPoint("https://slack.com/api/oauth.access");

var app = express();
var server = http.createServer(app);

app.get('/', (req, res, next) => {
    res.write('<a href="' + client.getAuthUrl() + '">' +
                '<img alt="Add to Slack" height="40" width="139" src="https://platform.slack-edge.com/img/add_to_slack.png" srcset="https://platform.slack-edge.com/img/add_to_slack.png 1x, https://platform.slack-edge.com/img/add_to_slack@2x.png 2x" />' +
                '</a>');
    res.end();
});

app.get('/auth', (req, res, next) => {
    let code = req.param("code");
    let state = req.param("state");
    /* SUCCESSFUL RETURN LOOKS LIKE THIS
     * WE NEED TO PARSE THIS INTO A USEABLE OBJECT
    {"ok":true,"access_token":"xoxp-XXXXXXXXXXXX-XXXXXXXXXXXX-XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
    "scope":"identify,channels:history,channels:read,chat:write:user,chat:write:bot",
    "user_id":"UXXXXXXXX","team_name":"XXXXXXXX","team_id":"TXXXXXXXX"}
    */
    let access_token = client.getAccessToken(code, state).then((result) => {
        // ADD THE NEW ENTRY TO THE DATABASE - WE KNOW THE TEAM NAME BUT NOT THE DOMAIN
        // AND TELL THE RUNNING APP ABOUT IT BY POSTING TO /ctrl/client/addA
	var slack  = JSON.parse(result);
        console.log("ACCESS TOKEN: " + slack.access_token);
        console.log("TEAM ID: " + slack.team_id);
    // NOW WE NEED TO CALL SLACK TO GET THE DOMAIN
    // USE https://api.slack.com/methods/team.info team.info TO GET IT
    // CAN'T ACCESS THIS UNLESS THE USER IS LOGGING IN W/SLACK UGH
	    // RETURNING 403 - FORBIDDEN
	    // statusCode: 403,
    request('https://api.slack.com/methods/team.info', {form:{token:slack.access_token}}, (err, res, body) => {
        if (err) { return console.log(err); }
        console.log(res);
      });
        console.log(res);
    })
        .catch((err) => {
            console.log(err);
        });
    res.write('<h1> My Page </h1>');
    res.end();
});

server.listen(4000, 'localhost');
server.on('listening', function() {
    console.log('Express server started on port %s at %s', server.address().port, server.address().address);
});
