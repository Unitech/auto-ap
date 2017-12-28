const path = require('path')
const os = require('os')
const debug = require('debug')('envision:access_point')
const spawn = require('child_process').spawn
const AP_SCRIPT = path.join(__dirname, './utils/create_ap')
const IFACE_SCRIPT = path.join(__dirname, './utils/create_iface')
const shelljs = require('shelljs');
const iw = require('wireless-tools/iw')
const ifconfig = require('wireless-tools/ifconfig')

class AccessPoint {
  constructor (config) {
    this.apOnline = false
    this.apProcess = null
    this.appSsidName = os.hostname() + '-ap';

    process.on('uncaughtException', () => {
      this.stop();
    });

    process.on('SIGINT', () => {
      this.stop();
      setTimeout(function() {
        process.exit(0);
      }, 1000);
    });

    this.config = Object.assign({
      ap_iface: null,
      password: null,
      ssid: null
    }, config)
  }

  start (ifaceTarget) {
    // Do no double instanciate AP mode
    if (this.apProcess) {
      return false;
    }

    if (!ifaceTarget) {
      ifaceTarget = 'wl'
    }

    // Find the exact name of wifi card starting with 'wl'
    this.getInterface(ifaceTarget, (err, iface) => {
      if (err) {
        return console.error(err);
      }

      console.log('[Network] Using network interface: %s + %s', iface, ifaceTarget);

      this.launchAP(iface, ifaceTarget)
    })
  }

  /**
   * Launch Access Point Script
   * @param {String} iface physical interface in system (ex: wlan0)
   * @param {String} ifaceTarget virtual hotspot interface created by system (ex: ap0)
   */
  launchAP (iface, ifaceTarget) {
    if (this.apProcess) {
      debug('Cannot exec AP two time')
      return
    }

    debug('[Network][AP] Launching Access Point script')

    this.apProcess = spawn(AP_SCRIPT, [
      '-n',
      iface,
      '--redirect-to-localhost',
      this.appSsidName // SSID
    ])

    this.apProcess.stdout.on('data', (data) => {
      data = data.toString()
      process.stdout.write(data);

      if (data.indexOf('AP-ENABLED') !== -1) {
        this.apOnline = true;
      }

      if (data.indexOf('STA') !== -1 && data.indexOf('associated') !== -1) {
        console.log(`[Network][AP] Station connected`)
      }
    })

    this.apProcess.stderr.on('data', data => {
      data = data.toString()
      process.stderr.write('[Network][AP] ' + data.toString());
    })

    this.apProcess.on('close', (code) => {
      console.log('[Network][AP] Access point stopped');
      this.apOnline = false
      this.apProcess = null
    })
  }

  stop () {
    if (this.apOnline) {
      console.log('[NETWORK] Clean up');
      this.apProcess.kill('SIGINT')
    }
  }

  // This is a blind connection
  // It disables AP then connect
  delayedConnection(ssid, password, cb) {
    console.log('[Network] Blind connection. Now disabling AP...');
    var self = this;
    this.apProcess.kill('SIGINT');
    this.apOnline = null;

    setTimeout(function() {
      console.log('[Network] Now connect to WIFI with auth info provided...');
      var cmd = `nmcli device wifi con "${ssid}" password "${password}"`;

      shelljs.exec(cmd, { silent : true }, (code, stdout, stderr) => {
        if (code) {
          console.log(stderr);
          console.log('[Network] Fallback connect has failed...');
          return cb(stderr);
        }

        console.log('[Network] Fallback connect has succeeded!');
        console.log('[Network] Now forcing connection up');
        shelljs.exec(`nmcli con up ${ssid}`, { silent : true }, (code, stdout, stderr) => {
          self.getIpFromWlan(function(err, ip) {
            console.log(`[Network] Connected with ip=${ip}`);
            return cb(null, stdout);
          })
        });
      });
    }, 2000);
  }

  /**
   * Connect to target wifi network
   * @param {String} SSID Wifi SSID
   * @param {String} password Wifi Password
   */
  setNetwork (ssid, password, cb) {
    var self = this;
    var code = 0;

    var cmd = `nmcli device wifi con "${ssid}" password "${password}"`;

    console.log('Executing command', cmd);

    // Try first to connect while in AP MODE
    // Sometime connecting with AP MODE Direrctly might not work (nanopi, asus rpi...)
    shelljs.exec(cmd, { silent : true }, (code, stdout, stderr) => {
      if (code || stdout.indexOf('successfully activated') == -1) {
        console.log(stderr);

        self.delayedConnection(ssid, password, function(err) {
          if (err) {
            // Ok Still cannot connect, maybe password is wrong
            // Start AP again
            return self.start()
          }
        });

        return cb('Blind mode connection with SSID=' + ssid + ' PASSWORD=' + password);
      }
      console.log('[Network] Auto connect has been a success');
      return self.getIpFromWlan(cb)
    });
  }

  getInterface (name, cb) {
    ifconfig.status((err, status) => {
      if (err) {
        console.error(err);
        return cb('no_ifconfig')
      }

      for (let i = 0; i < status.length; i++) {
        status[i].interface = status[i].interface.replace(':', '')
        if (status[i].interface.indexOf(name) !== -1) {
          debug('Wifi card detected', status[i])
          return cb(null, status[i].interface)
        }
      }
      return cb('no_interface')
    })
  }

  getIpFromWlan (cb) {
    this.getInterface('wl', (err, iface) => {
      if (err) return cb(err)

      this.getIPv4FromInterface(iface, cb)
    })
  }

  getNetworks (cb) {
    this.getInterface('wl', (err, iface) => {
      if (err) { return cb(err) }

      iw.scan({ iface: iface }, (err, networks) => {
        if (err && err.code === 127) return cb('package_missing')

        if (err) return cb(err)

        return cb(null, networks)
      })
    })
  }

  getStatus () {
    return this.apOnline
  }

  getIPv4FromInterface (iface, cb) {
    const addresses = os.networkInterfaces()[iface]
    if (!addresses) {
      return
    }
    for (let i = 0; i < addresses.length; i++) {
      if (addresses[i].family === 'IPv4') {
        return cb(null, addresses[i].address)
      }
    }
  }
}

module.exports = AccessPoint
