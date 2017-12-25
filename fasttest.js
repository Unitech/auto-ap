
const Network = require('./src/network.js');
const Api = require('./src/api.js');

var network = new Network({
  ap_iface : 'ap',
  password : '12345678',
  ssid : 'PM2 IOT'
});

var api = new Api(network);

network.start();
api.start();
