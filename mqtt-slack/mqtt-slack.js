// Require MQTT broker
var mosca = require('mosca');
// Define connection to MongoDB
var mongo_con = 'mongodb://localhost:27017/mqtt';
// This settings is required to enable persistent session feature.
// All messages will be stored in MongoDB
var ascoltatore = {
type: 'mongo',
url: mongo_con,
pubsubCollection: 'ascoltatori',
mongo: {}
};
// Final settings for Mosca MQTT broker
var settings = {
port: 1883,
backend: ascoltatore,
persistence: {
factory: mosca.persistence.Mongo,
url: mongo_con
}
};
// Define HTTP and MQTT servers
var http     = require('http'),
httpServ = http.createServer(),
mqttServ = new mosca.Server(settings);
// Attach HTTP to MQTT server
mqttServ.attachHttpServer(httpServ);
httpServ.listen(3000);
// Triggers when mqtt server is ready to accept requests
mqttServ.on('ready', ready);
// Triggers when new message is published
mqttServ.on('published', function(packet, client) {
console.log(packet.topic + ': ' + packet.payload);
});
function ready() {
console.log('Mosca server is up and running');
}
