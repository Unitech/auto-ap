
const ifconfig = require('wireless-tools/ifconfig')

class NetworkManager {
  constructor(ssid = 'auto-ap', password = null) {
    this.ap_online = false;
    this.ap_process = null;

    this.ssid = ssid;
    this.ap_interface = 'ap';
  }

  start() {
    if (this.ap_online == true)
      return false;

    this.getInterface(this.ap_interface, function(err, iface) {
      //if (err &&
    });
  }

  getInterface(name, cb) {
    ifconfig.status((err, status) => {
      if (err) {
        console.error(err);
        return cb('no_ifconfig')
      }

      for (let i = 0; i < status.length; i++) {
        status[i].interface = status[i].interface.replace(':', '')
        if (status[i].interface.indexOf(name) !== -1) {
          console.log('Wifi card detected', status[i])
          return cb(null, status[i].interface)
        }
      }
      return cb('no_interface')
    })
  }
}
