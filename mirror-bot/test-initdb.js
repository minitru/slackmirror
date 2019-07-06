// OUR DATABASE STUFF LIVES HERE
var User = require('./db');

/* WATCH OUT - TRYING TO ACCESS THE VARIABLES GETS FUCKY
 * BECAUSE THE INSERTS HAPPEN FASTER THAN THE CONSOLE.LOGS
 * WILL PRINT LAST DOMAIN ADDED BUT IT'S OK IN THE DB
 */

// create a new user
var newUser = User({
    domain: 'ENTER-SLACK-DOMAIN',
    team: 'TXXXXXXXX',
    token: 'xoxb-XXXXXXXXXXXX-XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX'
});

newUser.save(function(err) {
    var u = newUser;
    if (err) throw err;
    console.log('user created!');
});

// create a new user
var newUser = User({
    domain: 'ENTER-SLACK-DOMAIN',
    team: 'TXXXXXXXX',
    token: 'xoxb-XXXXXXXXXXXX-XXXXXXXXXXXX-XXXXXXXXXXXXXXXXXXXXXXXX'
});

newUser.save(function(err) {
    var u = newUser;
    if (err) throw err;
    console.log('user created!');
});

/*
 * THIS FIRES OFF BEFORE THE DB STUFF IS
 * ADDED... NO IDEA HOW TO DEAL WITH THAT
 * PROBABLY HAVE TO WRAP STUFF IN FUNCTIONS
 * LIKE onStart()
 * SO DON'T PRINT FROM HERE
 

User.find({}, function(err, users) {
    if (err) throw err;
    console.log(users);
});
  /*  WE CAN DO THINGS LIKE DELETE USERS IN HERE
  user.remove(function(err) {
    if (err) throw err;
    console.log('User successfully deleted!');
  });

    console.log('Find users!');
    // object of all the users
    console.log(users);
});

/* 
// find the user starlord55
// update him to starlord 88
User.findOneAndUpdate({ username: 'starlord55' }, { username: 'starlord88' }, function(err, user) {
    if (err) throw err;
  
    // we have the updated user returned to us
    console.log(user);
 });

// find the user with id 4
User.findOneAndRemove({ username: 'starlord55' }, function(err) {
    if (err) throw err;
  
    // we have deleted the user
    console.log('User deleted!');
 });
 */
