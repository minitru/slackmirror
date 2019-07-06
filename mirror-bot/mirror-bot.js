var User = require('./db');                     // OUR DATABASE STUFF LIVES HERE
var fs = require("fs");
var path = require('path');
var SlackBot = require('slackbots');
const request = require('request');
var links = [];                                   /* ARRAY OF LINKS */
var xbots = [];                                    /* AN ARRAY OF BOTS */

require('dotenv').config();                       /* STORES mqtt LOCATION - NO TOKENS ANYMORE */

var mqtt = require('mqtt');
const client  = mqtt.connect(process.env.MQTTBOX, {
  clean: false,
  clientId: 'test'
});

// HANDLE NEW CLIENTS
client.on('connect', function () {
  client.subscribe('/cmd/add', {qos: 1});
  // client.publish('/hello/s-pro', 'Hello, S-PRO!', {qos: 1});
});

var onStart = () => {
  var tmplinks;
   User.find({}, function(err, users) {
    if (err) throw err;
    // console.log("IN FIND");
    for (let u of users) {
      if (!u.src || u.src == 'slack') {
        console.log("USER " + u.domain);
        addxbot(u.domain, u.team, u.token);
        if (u.links) {
          tmplinks=JSON.parse(u.links);
          // SUBSCRIBE TO THE CHANNELS HERE
          // THIS USED TO BE FURTHER DOWN BUT SOMEHOW WASN'T GETTING EXECUTED
          // DUE TO THE RANDOM ASYNCHRONOUS NATURE OF node
          for (let link of tmplinks) {
            client.subscribe(link.remote, {qos: 1});
            console.log("*** SUBSCRIBING TO " + link.remote);
          }
          links = links.concat(tmplinks);
        }
      }
      // console.log(tmplinks);
    }
    console.log(links);
  });
  console.log('Slack bot started');

  let myVar = setInterval(function(){ heartbeat('/maclawran.slack.com/messages/CFMMBM5AP') }, 300000);

  /* THIS SHOULD BE IN A DATABASE BY CLIENT */
  /* AND NOW IT IS...
  if (fs.existsSync('./.links.json')) {
    links = JSON.parse(fs.readFileSync('./.links.json', 'utf8'));
    console.log(links);
  }
  */
};

/*
 * INCOMING SLACK MESSAGES
 */
var onMessage = (message) => {
    var res;
    var params = {
      icon_url: 'https://dev.maclawran.ca/img/mirror-icon.png',
      as_user: 'false',
      username: 'mirror',
    };
    users = [];
    channels = [];
    cmdargs = [];
    var link = {
      channel: "",
      remote: ""
    }
    var tmplink = {
      channel: "",
      remote: "",
      channelName: "",
      remoteName: ""
    }
    var remoteDomain = "";

    /* WHEN THE BOT IS UNINSTALLED...
      SLACK INCOMING MESSAGE TYPE user_change
      FIND BOT BY CHANNEL undefined
      BOT NOT FOUND
      WE MAY WANT TO ACT ON THIS
    */
    /* DISABLE FOR NOW
    // IF WE WANT TO UNINSTALL THE APP
    if (message.type == 'member_left_channel') {
      deleteBot(team);
    }
    */

   let ignore = ['error','group_join','member_joined_channel','file_created','hello','desktop_notification','user_typing','file_public','bot_added','bot_changed','apps_changed','apps_installed','user_change'];
   if (ignore.includes(message.type)) {
     // console.log("====> SKIPPING " + message.type);
     return;
   } else {
     console.log("====> HANDLING " + message.type);
   }


  /*  OLD VERSION GOT OUT OF CONTROL
    // DO SOMETHING ABOUT THE LINKS - NOT SURE WHAT YET
    if (message.type == 'error' || message.type == 'group_join' || message.type == 'member_joined_channel' || message.type == 'file_created' || message.type == 'hello' || message.type == 'desktop_notification' || message.type == 'user_typing' || message.type == 'file_public') {
      return;
    }
    */
    var thischan;

    // console.log("SLACK INCOMING MESSAGE TYPE " + message.type);
    if (message.team && message.team !== 'undefined') {
      console.log("FIND BOT BY TEAM " + message.team);
      var xbot = xbots.find(x => x.team === message.team);
      if (xbot) {
        bot = xbot.bot;
      }
    } else {    // PROBABLY A FILE UPLOAD - FIGURE OUT THE BOT
      // console.log(message);
      console.log("FIND BOT BY CHANNEL " + message.channel_id);
      for (let l of links) {
        if (l.channel.includes(message.channel_id)) {
          thischan=message.channel_id;
          console.log("FOUND: " + l.channel);
          xbot=setxbot(l.channel);
          bot = xbot.bot;
        }
      }
    }

    if (xbot) {
      console.log("==> FOUND BOT FOR " + xbot.domain)
    } else {
      console.log('BOT NOT FOUND');
      return
    }

    var botUsers = bot.getUsers();
    users = botUsers._value.members;
    var botChannels = bot.getChannels();
    channels = botChannels._value.channels;
    // console.log("---------------------------")
    // console.log(channels);
    // console.log("---------------------------")

    // ONGOING ISSUES
    // GET THE CHANNEL ID
    var usr = users.find(user => user.id === message.user);
    if (!thischan) {
      var channel = channels.find(channel => channel.id === message.channel);
      if (!channel) {
        console.log("***** NO CHANNEL - PROBABLY A LOCKED GROUP *****");
        // LOCKED CHANNELS DO NOT APPEAR IN HERE
        // console.log(channels);
        // console.log(message);
      }
      thischan = message.channel;   // WORKS FOR LOCKED CHANNELS TOO
    }

    console.log("\n\n---------------------");
    console.log("INBOUND FROM SLACK: " + bot.team.domain + " MSG TYPE: " + message.type + " [" + message.text + "]"); 
    // console.log(channel);
    // console.log("---------");
    // console.log(message);
    console.log("---------------------");

    // THIS IS THE DEFAULT OUTBOUND CHANNEL ASSOCIATED WITH A SLACK CHANNEL
    link.channel = "/" + bot.team.domain + ".slack.com/messages/" + thischan;                      // CURRENT SLACK CHANNEL
    console.log("=====> OUTBOUND CHANNEL: " + link.channel);

    // IF WE LEAVE THE CHANNEL, UNLINK ANYTHING ASSOCIATED
    // GROSSER THAN I THOUGHT
    // ALL WE HAVE IS MESSAGE TEXT... WE NEED TO FIGURE OUT THE CHANNEL ID
    // text: 'You have been removed from #mirror-debug by <@U5N6184N8>',
    if (message.type == 'message' && message.user == 'USLACKBOT') {
      console.log("SLACKBOT MESSAGE " + message.text);
      // LOWERCASE PLUS HYPHENS ONLY
      var re = /#(?=\S*['-])([a-zA-Z'-]+)/g;
      var channelName = message.text.toString().match(re);
      var re = /removed/g;
      var removed = message.text.toString().match(re);
      console.log("SLACKBOT REMOVAL FROM " + channelName);
      if (channelName && removed) {
        // LOSE THE LEADING #
        channelName = channelName.toString().replace('#','');
        channel = channels.find(channel => channel.name === channelName);
        link.channel = "/" + bot.team.domain + ".slack.com/messages/" + channel.id;                      // CURRENT SLACK CHANNEL
        console.log("UNMIRROR & UNSUB CHANNEL " + link.channel)
        unmirror(link.channel);
        unsubscribe(link.channel);
      }
      return;
    }

    // FILE SHARING
    if (message.type == 'file_shared') {
      usr = users.find(user => user.id === message.user_id);
      // console.log(message);
      // console.log("FILE SHARED BY " + usr.name);
      if (usr.name === 'mirror') {
        return;
      }
      console.log("---> SENDING FILE MESSAGE OUTBOUND QUEUE " + link.channel);
      var usr = '`' + usr.name + '@' + bot.team.domain + '`';
      shareFile(usr, message.file_id, bot.token, link.channel);
    }
 
    // HANDLE ATTACHMENTS
    // EXPECT SHITSHOW
    if(message.type === 'message' && message.attachments && !message.text) {
      // var att = message.attachments;
      // att.title = '`' + usr.name + '@' + bot.team.domain + '` ' + message.attachments.title;
      msg = JSON.stringify(message.attachments);
      console.log("---> SENDING ATTACHMENT TO OUTBOUND QUEUE " + link.channel);
      client.publish(link.channel, msg, {qos: 1});
    }

    if(message.type === 'message' && Boolean(message.text)) {
      var command = '';
      if (channel) {
         console.log("CHANNEL: " + channel.name);
      }
      if (usr) {
          console.log("NAME: " + usr.name);
      }

      // OK THIS IS THE SOURCE OF ALL CONFUSION
      // @mirror command COMES IN AS <@UF9PY7C8P> help
      // AND THAT ID WILL BE DIFFERENT FOR EVERY BOT INSTANCE
      // SO WE DON'T KNOW WHAT THE USER IS 
      if (/^<@/.test(message.text)) {
        cmdargs = (message.text).match(/\S+/gi);    // SPLIT INTO WORDS
        cmdargs[0]=cmdargs[0].replace(">","").replace('<@',"");
        // console.log("LOOK FOR " + cmdargs[0]);
        // console.log("UID" + cmdargs[0] + " CMD " + cmdargs[1]);
        var usr = users.find(user => user.id === cmdargs[0]);
        // console.log("FOUND USR " + usr.name);
        // KILL STUPID BUG DOESN'T LOOK LIKE A mirror COMMAND
        // console.log("THIS COMMAND: " + cmdargs[1]);
        if (usr.name === 'mirror') {
          let validcmd = ['help', 'mirror','unmirror','list','status'];
          if (validcmd.includes(cmdargs[1])) {
            command = cmdargs[1];
          } else {
            bot.postMessage(message.channel, "`whoa! that's not a mirror command`", params); 
            return;
          }
        }
      }
      /*
      // BOT COMMANDS BEGIN WITH mirror:
      if (/^<@mirror/.test(message.text)) {
        cmdargs = (message.text).match(/\S+/gi);    // SPLIT INTO WORDS
        // ARG0 is <@UEPB56X6Z>, CLEAN IT UP
        cmdargs[0]=cmdargs[0].replace(">","").replace('<@',"");
        console.log("LOOK FOR " + cmdargs[0]);
        var usr = users.find(user => user.id === cmdargs[0]);
        console.log("FOUND USR " + usr.name);
        if (cmdargs[0] === 'mirror') {
          command = cmdargs[1];
          console.log("MIRROR COMMAND: " + command);
          console.log("TEXT: " + message.text);
          var skip = 'has';
          if (message.text.includes(skip)) {
            console.log("SKIP " + message.text);
            return;
            // command = null;
            // cmdargs = '';
          }
        }
      }
      // THIS ISN'T BEING HIT AT ALL.
      // PROBABLY BECAUSE USER NAME IS <@BLAH>
      if (/^mirror:/.test(message.text)) {
          console.log("HITTING THE IMPOSSIBLE ENTRY");
          cmdargs = (message.text).match(/\S+/gi);    // SPLIT INTO WORDS
          command = cmdargs[1];
          console.log("MIRROR COMMAND: " + command);
          if (command.match('joined') || command.match('left')) {
            console.log("SKIP ELVIS HAS LEFT THE BUILDING MESSAGES");
            return;
          }
      }
      */
      if (command && cmdargs.length > 2) {
          remotechannel = cmdargs[2];
          var parts = cmdargs[2].split("/");
          // FOUND IT... IF YOU DON'T INCLUDE https WE HAVE ISSUES
          // PEOPLE WILL DO WHAT I DID...
          // WOW - SLACK SURROUNDS URLS WITH BRACKETS...
          if (/^<http/.test(parts[0])) {  // https://ripcitysoftware.slack.com/messages/CEUDECU0Z/
            if (parts[2] === undefined || parts[3] === undefined || parts[4] === undefined) {
              // bot.postMessage(channel.id, "`oops! that doesn't look like a Slack channel`", params); 
              bot.postMessage(message.channel, "`oops! doesn't look like a Slack channel`", params); 
              return;
            }
            if (!(parts[2].includes('slack'))) {
              console.log(parts[2]);
              // bot.postMessage(channel.id, "`oops! that doesn't look like a Slack channel`", params); 
              bot.postMessage(message.channel, "`oops! that doesn't look like a Slack channel`", params); 
              return;
            }
            remoteDomain = parts[2].replace('.slack.com', '');
            link.remote = ('/' + parts[2] + '/' + parts[3] + '/' + parts[4]).replace(">","");
          } else {                      // /ripcitysoftware.slack.com/messages/CEUDECU0Z/
            if (parts[0].match(/#/)) {
              var unsubname = parts[0];
              console.log('UNSUBSCRIBE');
            } else {
              if (parts[1] === undefined || parts[2] === undefined || parts[3] === undefined) {
                console.log(parts);
                bot.postMessage(message.channel, "`oops! doesn't look like a Slack channel`", params); 
                return;
              }
              if (!(parts[1].includes('slack'))) {
                console.log(parts[2]);
                bot.postMessage(message.channel, "`oops! that doesn't look like a Slack channel`", params); 
                return;
              }
              remoteDomain = parts[1].replace('.slack.com', '');
              link.remote = ('/' + parts[1] + '/' + parts[2] + '/' + parts[3]).replace(">","");
            }
          }
      }

      if (command) {
        console.log("IN COMMAND: " + command);
      switch(command) {
        // MIRROR CAN ACCEPT CRAP TO MIRROR
        // NEED SOME SANITY CHECKING
        case 'mirror':
          console.log("IN MIRROR: " + link.channel + " <-> " + link.remote);
          if (link.channel === link.remote) {
            bot.postMessage(message.channel, "`um, you really don't want to link to yourself.`", params); 
            return;
          }
          if (!link.remote) {
            bot.postMessage(message.channel, "`error: remote Slack channel not specified`", params); 
            return;
          }
          // FILTER OUT DUPLICATE LINKS
          var result = links.filter( links => links.remote === link.remote);
          result = result.filter( links => links.channel === link.channel);
          console.log('---------------------------------');
          if (result.length > 0) {
            bot.postMessage(message.channel, "`oops! you're already mirroring this channel to there`", params); 
            return;
          }
          // GET THE FRIENDLY NAMES FOR LOCAL LINK
          // SMM THIS IS BROKEN - SHOWING undefined
          var id=path.basename(link.channel)
          console.log("CHANNEL: " + link.channel + " AND BASENAME " + id + " AND CHANNEL NAME " + channel.name);

          // SMM WHY CAN'T I FIND THIS CHANNEL???
          // REVERTING TO CHANNEL ID'S TILL I FIND OUT WHY
          // channel = channels.find(channel => channel.id === id);

          if (channel.name) {
            console.log("CHANNEL NAME:  [" + channel.name + "]");
            if (channel.name === undefined) {  // NOT 'undefined'
            // LOSE FRIENDLY NAME
              link.channelName=thischan;
            } else {
              link.channelName=channel.name;
            }
          } else {
            console.log("CHANNEL IS NULL!!!: " + thischan);
            link.channelName=thischan;
          }
          // NOW THE REMOTE SIDE.
          // THIS WON'T WORK IF WE'RE NOT CONNECTED TO THEM
          // PLUS WE HAVE TO GET IT FROM THEIR BOT.
          link.remoteName = getChannelName(link.remote);
          console.log("REMOTE CHANNEL NAME: " + link.remoteName);
          if (link.remoteName && link.remoteName != 'undefined') {
            link.remoteName=remoteDomain + "#" + link.remoteName;
          } else {
            console.log("USING REMOTE CHANNEL ID: " + link.remote);
            var id=path.basename(link.remote)
            link.remoteName=remoteDomain + "#" + id;
          }
          links.push(link);
          savelinks(links);

          // var msg = "`mirrorring this channel to " + link.remote + "`";
          var msg = "`mirrorring this channel to " + link.remoteName + "`";
          // WE SHOULD POST A MESSAGE SLACK CHANNEL THAT WE'RE LINKED
          // bot.postMessage(channel.id, msg, params);
          bot.postMessage(message.channel, msg, params);
          client.subscribe(link.remote, {qos: 1});

          // LINK THE OTHER SIDE SO THAT IT WORKS WHEN THEY SHOW UP
          client.subscribe(link.channel, {qos: 1}); // SUBSCRIBE TO THE OTHER SIDE

          /* 
           * SMM CREATE AND SAVE THE REVERSE LINK
           */
          tmplink.channel = link.remote;
          tmplink.remote = link.channel;
          tmplink.channelName = link.remoteName;
          tmplink.remoteName = bot.team.domain + "#" + link.channelName;
          links.push(tmplink); 
          savelinks(links);

          // WE SHOULD POST A MESSAGE IN THE REMOTE QUEUE THAT WE'RE LINKED
          var msg = "_`==> mirroring this channel to " + tmplink.remoteName + " via remote request `_\n`to unmirror enter` @mirror unmirror " + tmplink.remoteName;
          client.publish(tmplink.remote, msg, {qos: 1});

          return;
        // UNLINK IS SORT OF BROKEN
        // IT SHOULD UNLINK BOTH SIDES
        // IF WE WANT A ONE-WAY LINK IT SHOULD BE A DIFFERENT COMMAND
        case 'unmirror':
          if (unsubname) {
            console.log("SEARCH FOR UNMIRROR " + unsubname);
            var newlink = links.filter( links => links.remoteName === unsubname);
            if (newlink) {
                link = newlink[0];
                console.log(link);
            } else {
              console.log("NO LINK FOUND");
              return;
            }
          } 
          if (!link.remote) {
            bot.postMessage(message.channel, "`error: remote Slack channel not specified`", params); 
            return;
          }

          var msg = "• COMMAND: UNMIRROR " + link.channel + " <-> " + link.remote;
          console.log(msg);

          var len = links.length;
          links = unmirror(link.channel, link.remote);
          if (len != links.length) {
            // CAN'T POST AN UNMIRROR MESSAGE TO THE OTHER SIDE
            // THE UNMIRROR IS TOO FAST
            msg = "`unmirrored this channel from " + link.remoteName + "`";
            unsubscribe(link.channel);
          } else {
            msg = "`um, you weren't mirroring this channel to " + link.remoteName + "`";
          }
          bot.postMessage(message.channel, msg, params);
          return;
        case 'list':
          // THIS SHOULD BE LIMITED TO THE REQUESTING DOMAIN
          console.log("• COMMAND: LIST ");
          var result = myLinks(links, bot.team.domain);
          // console.log(result);
          if (result.length > 0) {
            if (result.length == 1) {
              msg = '`mirroring '+ result[0].channelName + " -> " + result[0].remoteName + '`';
            } else {
              msg = "`mirroring these channels` \n";
              for (let item of result) {
                msg = msg + '>' + item.channelName + ' -> ' + item.remoteName + '\n'; 
              }
            }
            bot.postMessage(message.channel, msg, params);
          } else {
              bot.postMessage(message.channel, '`not mirroring any channels`', params);
          }
          return;
          // THIS COMMAND IS BROKEN EVEN THOUGH THE LINKS COMMAND IS OK
          // PROBABLY BECAUSE IT'S NOT QUITE A STRING
        case 'status':
          console.log("STATUS");
          // console.log(links);
          // console.log('-----');
          var result = links.filter( links => links.channel === link.channel);
          // console.log(result);
          if (result.length > 0) {
            if (result.length == 1) {
              // console.log("RESULT LENGTH 1");
              // AWKWARD - I DON'T KNOW HOW TO POINT AT THE THING INSIDE THE RESULT
              for (let item of result) {
                msg = '`mirroring this channel to ' + item.remoteName +'`';
              }
            } else {
              msg = "`mirroring this channel to these channels` \n";
              for (let item of result) {
                msg = msg + '>' + item.remoteName + '\n';
              }
            }
            bot.postMessage(message.channel, msg, params);
          } else {
            // bot.postMessage(channel.id, "`not mirroring this channel`", params);
            bot.postMessage(message.channel, "`not mirroring this channel`", params);
          }
          return;
        case 'help':
          res = ">`@mirror mirror remote-slack-url`\n>`@mirror unmirror remote-slack-url`\n>`@mirror status`\n>`@mirror list`";
          // bot.postMessage(channel.id, res, params);
          bot.postMessage(message.channel, res, params);
          break;
      default:
            // bot.postMessage(channel.id, "hi! try `@mirror help` for commands...", params);
            bot.postMessage(message.channel, "hi! try `@mirror help` for commands...", params);
      }
      return;
    } else {
      // OUTBOUND - JUST POST TO THE CORRESPONDING OUTPUT CHANNEL
      // slack.maclawran.com/messages/ABABABAA
      // BOTS HAVE A username BUT NO usr.name DEFINED
      // I WONDER IF WE CAN FUDGE A NAME IN HERE?
      // set 'as_user = true && username set to whatever
      if(usr && usr.name !== 'mirror') {
        var msg = '`' + usr.name + '@' + bot.team.domain + '` ' + message.text;;
        console.log("---> SENDING TO OUTBOUND QUEUE " + link.channel);
        client.publish(link.channel, msg, {qos: 1});
        console.log(msg); // Will display contents of the object inside the array
      }
    }
  }
}

/*
 * INBOUND MESSAGES FROM MQTT
 */
// bot.on('start', onStart);
onStart();

// INBOUND FROM MESSAGE QUEUE
client.on('message', function (topic, message) {

  var params = {
    icon_url: 'https://dev.maclawran.ca/img/mirror-icon.png',
    as_user: 'false',
    username: 'mirror',
    attachments: ''
  };

  msg = message.toString();
  console.log("\n\n*** INBOUND MESSAGE QUEUE [" + topic + "] " + msg);

  // ADD A NEW BOT
  if (topic == '/cmd/add') {
    var newTeam = message.toString();
    console.log("CMD ADD CLIENT -> [" + newTeam + "]");
    // IT RETURNS THE FIRST MATCH EVEN IF THERE ARE MANY
    User.findOne({'team': newTeam}, function(err, user){
      if (err) throw err;
      console.log(user);
      addxbot(user.domain, user.team, user.token);
    });
    return;
  }

  // NOW WE NEED TO KNOW WHAT CHANNEL TO POST TO
  // IT'S ANY SLACK CHANNEL LISTENING ON THAT PATH
  var result = links.filter( chan => chan.remote === topic);
  for (let item of result) {
    console.log("*** TO SLACK " + item.channel);
    // NEED TO SET THE BOT TO THE IDENTITY OF THE SLACK INSTANCE 
    // ASSOCIATED TO THAT DOMAIN
    console.log("CALLING SETXBOT");
    console.log(item);
    xbot = setxbot(item.channel);
    if (!xbot) {
      console.log("BOT NOT FOUND... ");
      return;
    }
    bot = xbot.bot;
    if (bot) {
      message.channel = path.basename(item.channel);  // GET THE LAST ELEMENT IN THE NAME
      console.log("POSTING TO " + message.channel);

      // SEE IF THE MESSSAGE IS A FILE UPLOAD
      if (msg.includes('@FILE')) {
        var args = msg.split(' ');
        // UPLOAD THE FILE TO THIS CHANNEL
        // FORMAT @FILE mirror.png sean
        msg=args[2];
        console.log("CALL SLACKUPLOAD " + args[1] + " " + item.channel);
        slackUpload(args[1], item.channel, msg);
      // POST A NORMAL MESSAGE
      } else {
        // params.icon_url='https://dev.maclawran.ca/img/mirror-teal.png';
        if(msg.includes('fallback')) {
          console.log("ATTACHMENT MESSAGE INCOMING");
          msg=JSON.parse(msg);
          // params.icon_url='https://dev.maclawran.ca/img/mirror-blue.png';
          params.attachments=msg;
          msg="`via mirror`";
        }
        // console.log(message);
        bot.postMessage(message.channel, msg, params)
        .then((res) => {
          // `res` contains information about the posted message
          console.log('Message timestamp: ', res.ts);
        })
        // catch(console.error);
        // ERROR POSTING TO SLACK CHANNEL
        // APP IS GONE OR DE-AUTHED 
        // REMOVE IT (MAYBE)
        .catch((error) => {
          // HERE IS THE ERROR - SOMETHING LIKE
          //  ok: false, error: 'account_inactive'
          console.log("**********************************************************")
          let boterr = JSON.parse(error);
          console.log(boterr);
          console.log(error);
        });
      }
    }
  }
});

/*
 * FUNCTIONS
 */

/* 
 * FIND THE RIGHT IDENTITY IN SLACK TO POST WITH
 */
var setxbot = (path) => {
  var parts = path.split("/");
  var domain = parts[1].replace('.slack.com', '');
  console.log("SEARCHING FOR BOT FOR " + domain);
  let obj = xbots.find(x => x.domain === domain);
  if (obj) {
      console.log('FOUND BOT');
      // console.log(obj);
      return obj;
  } else {
      console.log('BOT NOT FOUND');
      return
  }
}

/* 
 * GET CHANNEL NAME GIVEN THE PATH
 * THIS WILL GENERALLY WORK UNLESS THE REMOTE SIDE
 * HASN'T ADDED mirror YET
 */
var getChannelName = (xpath) => {
  var parts = xpath.split("/");
  var xdomain = parts[1].replace('.slack.com', '');
  var xchan = path.basename(xpath);
  if (bot.domain != xdomain) {
    console.log("SEARCHING FOR BOT FOR " + xdomain);
    let xobj = xbots.find(x => x.domain === xdomain);
    if (xobj) {
      console.log('FOUND BOT');
    } else {
      console.log('BOT NOT FOUND');
      return null;
    }
    // HMMM WHERE'S THE LIST OF CHANNELS?
    var xChannels = xobj.bot.getChannels();

    if (xChannels) {
      var xchannels = xChannels._value.channels;
      // console.log(xchannels);
      var xchannel = xchannels.find(xchannel => xchannel.id === xchan);
      if (xchannel) {
        return xchannel.name;
      }
    }
    console.log('CHANNEL NOT FOUND ' + xchan);
    return null;
  }
} 

function dbSaveLinks(linkfile) {
  // TRY ADDING THE LINKS TO THE DATABASE
  // WE'LL KEEP THE OLD WAY AROUND JUST IN CASE
  User.find({}, function(err, users) {
    if (err) throw err;
    console.log("IN FIND");
    for (let u of users) {
      console.log("USER " + u.domain);
      u.links = JSON.stringify(myChannelLinks(linkfile,u.domain));
      console.log("DOMAIN: " + u.domain + " SAVED LINKS: " + u.links);
      // NOW UPDATE THE USER IN THE DB
      User.findByIdAndUpdate(u._id, { links: u.links }, function(err, user) {
        if (err) throw err;
        // we have the updated user returned to us
        console.log(user);
      });
    }
  });
}

// SAVE LINKS IN DB AND ON DISK
var savelinks = (linkfile) => {
  dbSaveLinks(linkfile);
  // THE FILE IS JUST A BACKUP AT THIS POINT :)
  fs.writeFile('./.links.json', JSON.stringify(linkfile, null, 4), (err) => {
    if (err) {
        console.error(err);
        return;
    };
  });
}

// THIS NEEDS SOME THOUGHT
// WE MAY HAVE LEFTOVER BOTS THAT SHOULD BE UPDATED SOMEHOW
// IF THE CLIENT IS DELETED AND RE-ADDED
function addxbot(domain, team, token) {
  console.log("*** CREATEBOT DOMAIN " + domain + " TEAM " + team + " TOKEN " + token);

  // CREATE A NEW BOT
  var bot = new SlackBot({
    token: token,  // Add a bot https://my.slack.com/services/new/bot and put the token 
    name: team     // WE KNOW THIS ON ADD
  });

  let obj = xbots.find(x => x.domain === domain);
  if (obj) {
    console.log("REPLACING BOT FOR " + domain);
    obj.bot = bot;  // SET NEW BOT
  } else {
    console.log("ADDING BOT FOR " + domain);
    let newbot = {
      domain: domain,
      team: team,
      bot: bot
    }
    if (bot) {
      xbots.push(newbot)    // BOTS IS POPULATED HERE
    }
    else {
      console.log("BOT IS NULL - PROBABLY INVALID!!!");
    }
  }

  bot.on('message', onMessage);
  bot.on('error', function(data) {
    var re = /removed/g;
    // LOOK FOR Error: account_inactive
    if (data.toString().match(/account_inactive/g)) {
      // xbots.pop();  // IT SHOULDN'T BE ADDED
      console.log("*******************");
      console.log("DELETE BOT: " + team + " - " + data);
      console.log("*******************");
      deleteClient(team);
    };
   return;
  });
}

// DELETE A BOT
// THIS WASN'T A GOOD IDEA.
// AS RECORDS WERE ADDED TO THE DATABASE
// THEY GOT DELETED BY THIS LITTLE FUNCTION
// WHICH TOOK ME FOUR HOURS TO FIND
// AND THUS THE LARGE COMMENT
// IN HOPING I LEARN SOMETHING
/* 
function deletexBot(team){
  let forDeletion = [team];
  xbots = xbots.filter(item => !forDeletion.includes(item));
  let ret = user.deleteOne({'team': team}, function(err, user){
    if (err) throw err;
    console.log("*** DELETED TEAM: " + team + " RETURNS " + ret);
    return;
  });
}
*/

// NOT SURE IF THIS WORKS... TRY IT
function deleteClient(team) {
  let ret = User.deleteOne({'team': team}, function(err, user){
  if (err) throw err;
    console.log("*** DELETED TEAM: " + team);
    console.log(ret);
  }); 
};

function shareFile(usr, fileId, token, channel) {
  var options = {
   uri: 'https://slack.com/api/files.info?token='+token+'&file='+fileId,
   method: 'GET'
  }
  request(options, (error, response, body) => {
    var JSONresponse = JSON.parse(body);
    if (!JSONresponse.ok) {
      console.log(JSONresponse);
    } else {
      console.log("DOWNLOAD URL: " + JSONresponse.file.url_private);
      fname = slackXfer(usr, JSONresponse.file.url_private, token, channel);
    }
  });
}

function slackXfer(usr, file, token, channel) {
  console.log("FILE: " + file + " TOKEN: " + token);
  let options = {
    uri: file,
    method: 'GET',
    headers:{
      Authorization: " Bearer " + token 
    }
  };
  let fname = path.basename(file);
  let fileStream = fs.createWriteStream(__dirname + '/downloads/' + fname);  
  request(options)
    .pipe(fileStream)
    .on('finish', function() {
      console.log('Done downloading ' + fname);
      var msg = '@FILE' + ' ' +  fname + ' ' + usr;
      client.publish(channel, msg, {qos: 1});
  });
}

// UPLOAD A LOCAL FILE TO A REMOTE SLACK CHANNEL
// NEED TO FIND THE RIGHT BOT TO GET THE PERMS
// IF IT SUCCEEDS, SHOULD PROBABLY DELETE THE FILE
function slackUpload(fname, channel, msg) {
  console.log("CHANNEL: " + channel + " " + path.basename(channel));
  if (msg.includes('[[')) {
    console.log("*** POSTING ATTACHMENT");
    var att=JSON.parse(msg);
    msg='';                       // ATTACHMENT, NO MESSAGE FOR NOW
  }
  var token=bot.token;
  var options = {
   uri: 'https://slack.com/api/files.upload',
   method: 'POST',
   formData: {  
    // channels: 'CEUDECU0Z',
    channels: path.basename(channel),
    file: fs.createReadStream(__dirname + '/downloads/' + fname),
    initial_comment: msg,
    attachments: ''
   },
   headers:{
    Authorization: ' Bearer ' + token 
   }
  }
  // send as multipart/form-data
  console.log("SEND REQUEST " + channel);
  // console.log(options);
  request(options)
    .on('finish', function() {
      console.log('Done uploading');
    });
}

function unmirror(local, remote){
  console.log("BEFORE LINK COUNT: " + links.length);
  array = links;
  var filtered = [];
  for (let item of array) {
    console.log(item);
    if (remote) {
      if (item.channel == local && item.remote == remote || item.remote == local && item.channel == remote) {
        console.log("DELETING LINK: " + item.channel + " <-> " + item.remote);
      } else {
        filtered.push(item);
      }
    } else {
      if (item.channel == local || item.remote == local) {  // IF EITHER SIDE OF A CONNECTION
        console.log("LEAVE CHANNEL DELETE LINK: " + item.channel + " <-> " + item.remote);
      }
      else {
        filtered.push(item);
      }
    }
  }    
  links = filtered;
  console.log("AFTER LINK COUNT: " + filtered.length);
  savelinks(links);
  return filtered;
}

// UNSUBSCRIBE FROM CHANNELS WE'RE NOT ATTACHED TO ANYMORE
// IF WE AREN'T MIRRORING THEM, THEN WE SHOULD BE SUBSCRIBED TO THEM
function unsubscribe(chan) {
  let array = links;
  console.log("LINK COUNT: " + array.length);
  for (let item of array) {
    var str = item.channel + " <-> " + item.remote;
    if(str.indexOf(chan)>=0){
      console.log("====> CHANNEL IN USE - CAN'T UNSUBSCRIBE " + str);
      return
    }
  }
  // IF WE'RE NOT LISTENING OR PUBLISHING TO THAT CHANNEL, 
  // DON'T LISTEN ANY MORE
  console.log("=====> UNSUBSCRIBE " + chan + " UNUSED");
  client.unsubscribe(chan);
}

// RETURN A LIST OF LINKS CONTAINING MY DOMAIN
function myLinks(array, domain){
  var filtered = [];
  for (let item of array) {
    // BRAIN MUSH
    // MIRRORING IS BIDIRECTIONAL 
      if(item.channel.includes(domain)){
        filtered.push(item);
      }
  }    
  return filtered;
}

// RETURN A LIST OF LINKS CONTAINING MY DOMAIN IN MY CHANNEL ONLY
function myChannelLinks(array, domain){
  var filtered = [];
  for (let item of array) {
      // A LITTLE HACKY - CONCATENATE THE STRINGS THEN SEARCH FOR THE DOMAIN 
      // SINCE IT COULD BE IN EITHER ONE 
      if(item.channel.indexOf(domain)>=0){
        filtered.push(item);
      }
  }    
  return filtered;
}

// SEND A HEARTBEAT TO A CHANNEL
function heartbeat(chan) {
  var params = {
    icon_url: 'https://dev.maclawran.ca/img/mirror-icon.png',
    as_user: 'false',
    username: 'heartbeat',
  };
  var datetime = new Date();
  var msg = "`->` " + datetime;
  xbot=setxbot(chan);
  bot = xbot.bot;
  var id=path.basename(chan)
  bot.postMessage(id, msg, params);
}