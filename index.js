
const Network = require('./src/network.js');
const Api = require('./src/api.js');
const ConnectivityWorker = require('./src/ConnectivityWorker.js');

var AutoAp = {
  init : function() {
    console.log('[Auto AP] Starting');

    var network = new Network({
      ap_iface : 'ap',
      password : '12345678',
      ssid : 'PM2 IOT'
    });

    var connectivityworker = new ConnectivityWorker();
    var api = new Api(network);

    connectivityworker.start();

    connectivityworker.on('change', function(old_network, new_network) {
      if (new_network == false) {
        network.start();
        api.start();
        console.log(new Date() + ' Lost connection');
      }
      else {
        network.stop();
        api.stop();
        console.log(new Date() + ' Connected');
      }
    });
  }
}

AutoAp.init();
