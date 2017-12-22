/* eslint-disable standard/no-callback-literal */

const path = require('path')
const os = require('os')
const spawn = require('child_process').spawn
const exec = require('child_process').exec
const EventEmitter = require('events')
const debug = require('debug')('envision:access_point')
const AP_SCRIPT = path.join(__dirname, './create_ap')
const IFACE_SCRIPT = path.join(__dirname, './create_iface')

// we can scan with `nmcli -m multiline device wifi list` instead of using iw
// scan wifi
const iw = require('wireless-tools/iw')
// list interfaces
const ifconfig = require('wireless-tools/ifconfig')

/**
 * AccessPoint class
 * Allow to switch network card in access point mode and
 * connect to desired Wifi
 *
 * Event emitted:
 * - station
 * - setting_network
 * - host_connected
 * - network_manager_err
 * - start
 * - error
 * - stop
 *
 */
class AccessPoint extends EventEmitter {
  constructor (config) {
    super()

    this.apOnline = false
    this.apProcess = null
    this.cachedNetworks = null
    this.stopAutoDiscovery = false

    this.config = Object.assign({
      ap_iface: null,
      password: null,
      ssid: null
    }, config)
  }

  start (ifaceTarget) {
    if (this.apProcess) {
      console.log('AP already started')
      return false
    }

    if (!ifaceTarget) {
      if (this.config.ap_iface) {
        ifaceTarget = this.config.ap_iface
      } else {
        ifaceTarget = 'ap'
      }
    }

    this.getInterface(ifaceTarget, (err, iface) => {
      if (err && err === 'no_interface' && ifaceTarget === 'ap') {
        // If ap interface not detected, start with wl instead
        this.start('wl')
        return
      }

      if (err) {
        console.error(err)
        console.trace('Execution stopped')
        return
      }

      exec('systemctl stop NetworkManager', (err, stdout, stderr) => {
        if (err || stderr || (stderr && stderr !== '')) {
          this.emit('network_manager_err', err, stderr)
        }

        this.launchAP(iface, ifaceTarget)
      })
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

    debug('Launching Access Point script')

    this.apProcess = spawn(AP_SCRIPT, [
      '-n',
      iface,
      '--redirect-to-localhost',
      os.hostname() // SSID
    ])

    /**
     * Process access point script output
     */
    this.apProcess.stdout.on('data', (data) => {
      data = data.toString()
      process.stdout.write(data);

      if (data.indexOf('AP-ENABLED') !== -1) {
        this.apOnline = true
        this.emit('start')

        exec('systemctl start NetworkManager', (err, stdout, stderr) => {
          if (err || stderr || (stderr && stderr !== '')) { console.error(stderr); this.emit('network_manager_err', err, stderr) }
        })
      }

      if (data.indexOf('STA') !== -1 && data.indexOf('associated') !== -1) {
        debug(`[AP] Station connected`)
        this.emit('station')
      }
    })

    /**
     * Process access point script errput
     */
    this.apProcess.stderr.on('data', data => {
      data = data.toString()
      process.stderr.write(data);
      if (data.indexOf('run it as root') !== -1) {
        this.emit('error', new Error('Must run as root for hotspot'))
      } else if (data.indexOf('Operation not supported (-95)') !== -1 || data.indexOf('Device or resource busy') !== -1) {
        this.apProcess.on('close', () => {
          exec('systemctl stop NetworkManager', (err, stdout, stderr) => {
            if (err || stderr || (stderr && stderr !== '')) {
              this.emit('network_manager_err', err, stderr)
            }
            this.start(ifaceTarget)
          })
        })
      } else if (data.indexOf(' is not a WiFi interface') !== -1) {
        // start NetworkManager
        exec('systemctl stop NetworkManager', (err, stdout, stderr) => {
          if (err || stderr || (stderr && stderr !== '')) {
            this.emit('network_manager_err', err, stderr)
          }
          // create ap interface
          exec(IFACE_SCRIPT, () => {
            // try to recreate hotspot
            this.start(ifaceTarget)
          })
        })
      } else {
        debug(`[AP] ${data}`)
      }
    })

    this.apProcess.on('close', (code) => {
      this.apOnline = false
      debug(`[AP] Stopped`)
      this.emit('stop')
      this.apProcess = null
    })
  }

  stop () {
    if (this.apOnline) {
      this.apProcess.kill('SIGINT')
    }
  }

  connectToWifi(ssid, password, cb) {
    let stdout = '';
    let stderr = '';
    var add;
    let rescan = spawn('nmcli', ['device', 'wifi', 'rescan']);

    rescan.on('close', function() {
      console.log('Rescan done')
      add = spawn('nmcli', ['dev', 'wifi', 'con', ssid, 'password', password], {
        shell : '/bin/bash'
      })

      this.emit('setting_network', ssid)

      add.stdout.on('data', data => {
        stdout += data.toString()
        console.log(data.toString());
        debug('info', 'nmcli', data.toString())
      })

      add.stderr.on('data', data => {
        stderr += data.toString();
        console.error(data.toString());
        debug('err', 'nmcli', data.toString())
      })

      add.on('close', code => {
        debug('code: ' + code)
        if (code === 0 && stdout.indexOf('successfully activated') !== -1) {
          // test if ip adressed
          // check connection with DNS test?
          this.getIpFromWlan(cb)
          this.emit('host_connected')
        } else if (code === 0 && stdout.indexOf('New connection activation was enqueued') !== -1) {
          cb('connection_enqueued')
        } else if ((code === 0 && stdout.indexOf('Secrets were required, but not provided.') !== -1) || code === 4) {
          cb('bad_pass')
        } else if (code === 10) {
          cb('network_not_found')
        } else {
          cb(stdout, stderr)
        }
      })
    })

  }

  /**
   * Connect to target wifi network
   * @param {String} SSID Wifi SSID
   * @param {String} password Wifi Password
   */
  setNetwork (ssid, password, cb) {
    var retry = 3;
    var self = this;

    (function rec(retry) {
      self.connectToWifi(ssid, password, function(err, res) {
        if (err) {
          console.error('[Network] Connect to wifi failed, retry %d/3', retry - 2);
          if (retry <= 0)
            return cb(err);
          return setTimeout(function() {
            rec(retry--)
          }, 200);
        }
        console.log('[Network] Connection Successfull');
        return cb(null, res);
      });
    })(retry);

  }

  getInterface (name, cb) {
    if (/\d/.test(name)) {
      return cb(null, name)
    }

    ifconfig.status((err, status) => {
      if (err) return cb('no_ifconfig')

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
