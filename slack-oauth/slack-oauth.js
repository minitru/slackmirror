// DOTENV EXPECTS THE .env FILE TO BE IN THE 
// CURRENT WORKING DIRECTORY
// SO RUN pm2 FROM THERE, NOT FROM ONE LEVEL UP
// OR ADJUST IT HERE SOMEHOW
require('dotenv').config()

// BUT IT DOESN'T SEEM TO BE AN ISSUE FOR ./db
// SO IT'S A BIT STRANGE
var User = require('./db');
var mqtt = require('mqtt');
var express = require('express')
var request = require('request')
var app = express()

// ENABLE MQTT
var client  = mqtt.connect('mqtt://dev.maclawran.ca', {
    clean: false,
    clientId: 'console_client'
});

client.on('connect', function () {
    console.log("*** MQTT ACTIVE");
// client.subscribe('/cmd/add', {qos: 1});
// client.end();   // NOT SURE ABOUT THIS
});

// NOT SURE ABOUT THIS.
// DO IT IN NGINX
app.get('/auth', (req, res) =>{
    res.redirect('https://dev.maclawran.ca/index.html');
    // res.sendFile(__dirname + '/html/auth.html')
})

//https://slack.com/oauth/authorize?client_id=102549979367.503200528337&scope=bot,chat:write:bot,files:read,files:write:user,team:read

app.get('/auth/redirect', (req, res) =>{
	// I'M NOT SURE THAT WE SHOULD BE USING THESE CREDENTIALS
	// I SUSPECT THEY SHOULD BE THE ONES FROM THE ADDED SLACK SITE
    var options = {
        uri: 'https://slack.com/api/oauth.access?code='
            +req.query.code+
            '&client_id='+process.env.CLIENT_ID+
            '&client_secret='+process.env.CLIENT_SECRET+
            '&state=supercatlitter'+
            '&redirect_uri='+process.env.REDIRECT_URI,
        method: 'GET'
    }
    console.log(options);
    request(options, (error, response, body) => {
        var JSONresponse = JSON.parse(body)
        if (!JSONresponse.ok){
            console.log(JSONresponse)
            res.redirect('https://dev.maclawran.ca/failure');
            // res.send("Error encountered: \n"+JSON.stringify(JSONresponse)).status(200).end()
        }else{
            // console.log(JSONresponse)
            var state = JSONresponse.state; 
            // THEY'RE FIBBING ABOUT RETURNING A STATE VARIABLE
            // UNLESS IT'S IN THE HEADERS OR SOMETHING - NOPE
            // console.log(response.headers);
            // console.log("====> CHECK RETURNED STATE: " + state);
            var token = JSONresponse.bot.bot_access_token;
            var team = JSONresponse.team_id;
            var options = {
                // uri: 'https://slack.com/api/team.info?token='+token,
                uri: 'https://slack.com/api/auth.test?token='+token,
                method: 'GET'
            }
            request(options, (error, response, body) => {
                var JSONresponse = JSON.parse(body)
                if (!JSONresponse.ok){
                    console.log(JSONresponse)
                    res.redirect('https://dev.maclawran.ca/failure');
                    //res.send("Error encountered: \n"+JSON.stringify(JSONresponse)).status(200).end()
                }else{ 
                    /* SHOULD RETURN
                    "ok": true,
                    "url": "https://subarachnoid.slack.com/",
                    "team": "Subarachnoid Workspace",
                    "user": "grace",
                    "team_id": "T12345678",
                    "user_id": "W12345678"
                    */
                    // console.log(JSONresponse.team.domain);
                    var domain=JSONresponse.url.replace('https://',''); 
                    domain=domain.replace('.slack.com/','');
                    // console.log("DOMAIN: " + domain);
                    var user = JSONresponse.user;

                    // DISPLAY THE ERROR FROM HERE SOMEHOW
                    // THIS CODE IS ASYNC AND OF COURSE, DOESN'T WORK
                    // BUT AT LEAST IT WORKS RIGHT
                    if (saveClient(domain, token, team, user)) {
                        res.redirect('https://dev.maclawran.ca/failure?' +JSON.stringify(JSONresponse));
                    } else {
                        res.redirect('https://dev.maclawran.ca/success');
	                }
                }
            });
	/*
	ORIGINAL CALL RETURNS ALL THIS
	==============================
{ ok: true,
  access_token:
   'xoxp-102549979367-101157751312-518593169604-3e313a3b1dde11ce54ac357f688b46fb',
  scope: 'identify,bot,chat:write:user,chat:write:bot',
  user_id: 'U2Z4MN396',
  team_name: 'AltSlack',
  team_id: 'T30G5UTAT',
  bot:
   { bot_user_id: 'UF9PY7C8P',
     bot_access_token: 'xoxb-102549979367-519814250295-ZQJNzWW1UInN8tDoJ8oWSHWx' } }
     */
            // console.log(JSONresponse)
        }
    })
})

function saveClient(domain, token, team, admin) {
    console.log("DOMAIN: " + domain + " TOKEN: " + token + " TEAM: " + team + " ADMIN: " + admin);

   User.findOne({'team': team}, function(err, user){
    if (err) throw err;
    if (user) {
        console.log("UPDATE USER!");
        // ONLY THE TOKEN SHOULD CHANGE
        // THEY MIGHT BE ABLE TO CHANGE THE DOMAIN AND PERSON INSTALLING
        // UPDATE EVERYTHING BUT THE TEAM ID
        // THIS COULD BE WRONG TOO, HOWEVER
        // ALL OUR LINKING IS BASED ON IT... SO
        User.findByIdAndUpdate(user._id, { token: token }, function(err, user) {
            if (err) throw err;
            // we have the updated user returned to us
            console.log(user);
          });
          // TELL OUR BOT ABOUT IT
          // THE BOT MAY BE DOING BAD THINGS
          client.publish('/cmd/add', team, {qos: 1}); 
    } else {
        console.log("CREATE USER!");
        var newUser2 = new User({
            domain: domain,
            team: team,
            token: token,
            admin: admin,
            links: ''
          });
        newUser2.save(function(err, newuser) {
            if (err) {
                console.log("SAVE FAILED");
            }
            console.log(newuser);
            // TELL OUR BOT ABOUT IT
            client.publish('/cmd/add', team, {qos: 1}); 
        })
    };
  });
}
// LISTEN FOR THINGS FROM NGINX
app.listen(4000);
