// DB.js - SAVE OUR STUFF IN MONGODB

// TEST WITH EXAMPLES FROM 
// https://mongoosejs.com/docs/

// getting-started.js
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
// KEEP TRYING TO RECONNECT IF MONGO STOPS
mongoose.connect('mongodb://localhost/appusers', { 
    autoReconnect:true, poolSize: 20, socketTimeoutMS: 480000, keepAlive: 300000,
    keepAliveInitialDelay : 300000, connectTimeoutMS: 30000, reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 1000, useNewUrlParser: true} );

// create a schema
var userSchema = new Schema({
    src: String, 	// SLACK, DISCORD, ETC
    domain: String,
    team: String,
    token: String,
    links: String       // STRINGIFIED LIST OF LINKS - IT WORKS :)
});

var User = mongoose.model('User', userSchema);

// make this available to our users in our Node applications
// SMM EVENTUALLY
module.exports = User;

