
const Network = require('./network.js');

var AutoAp = {
  init : function() {
    var network = new Network({
      ap_iface : 'ap',
      password : '12345678',
      ssid : 'PM2 IOT'
    });

    network.start()

    var api = require('./api.js')({}, network);
  }
}

AutoAp.init();
