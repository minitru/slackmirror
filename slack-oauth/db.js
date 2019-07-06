// DB.js - SAVE OUR STUFF IN MONGODB

// TEST WITH EXAMPLES FROM 
// https://mongoosejs.com/docs/

// getting-started.js
var mongoose = require('mongoose');
var Schema = mongoose.Schema;
console.log("CONNECTING TO MONGOOSE");
mongoose.connect('mongodb://localhost/appusers', { 
    autoReconnect:true, poolSize: 20, socketTimeoutMS: 480000, keepAlive: 300000,
    keepAliveInitialDelay : 300000, connectTimeoutMS: 30000, reconnectTries: Number.MAX_VALUE,
    reconnectInterval: 1000, useNewUrlParser: true} );

mongoose.set('useCreateIndex', true);   // AVOID DUMB WARNING
mongoose.set('useFindAndModify', false);

// create a schema
var userSchema = new Schema({
    domain: String,
    team: { type: String, unique: true },
    token: String,
    admin: String,
    links: String       // STRINGIFIED LIST OF LINKS - NOT SURE ABOUT THIS
});

var User = mongoose.model('User', userSchema);

// make this available to our users in our Node applications
// SMM EVENTUALLY
module.exports = User;
