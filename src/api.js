
const express = require('express');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');
const os = require('os');

class API {
  constructor(ap) {
    var app = this.app = express();
    this.connected = false;

    app.use(bodyParser.urlencoded({ extended: false }))
    app.use(bodyParser.json())
    app.use('/', express.static(path.join(__dirname, '../front')));


    app.get('/host_info', (req, res) => {
      res.json({
        hostname : os.hostname()
      });
    })

    app.get('/is_connected', (req, res) => {
      res.json('Host is already connected');
    })

    /**
     * Get networks
     *
     * @name networks
     * @path {GET} /networks/
     * @response {Array} networks List of networks
     */
    app.get('/networks/', (req, res) => {
      ap.getNetworks((err, networks) => {
        if (err) {
          console.trace('getWifiNetworks')
          console.error(err)
          return res.status(400).json({ msg: err })
        }
        res.json({ networks: networks })
      })
    })

    /**
     * Set wifi network
     *
     * @name networks
     * @path {POST} /networks/
     * @body {String} ssid Name of network
     * @body {String} pwd Password of network
     * @response {String} ip IP
     */
    app.post('/networks', (req, res) => {
      var ssid = req.body.ssid;
      var password = req.body.pwd;

      console.log(`Connecting to network ${ssid} with ${password}`);
      res.header('Access-Control-Allow-Headers', req.get('Access-Control-Request-Headers'))
      ap.setNetwork(ssid, password, (err, ip) => {
        if (err) {
          return res.status(400).json({ msg: err })
        }

        ap.stop()
        res.json({
          ip: ip
        })
      })
    })

    /**
     * Get status
     *
     * @name status
     * @path {GET} /networks/status
     * @response {String} status ap_mode or normal
     */
    app.get('/networks/status', (req, res) => {
      res.json({
        status: ap.getStatus() ? 'ap_mode' : 'normal'
      })
    })
  }

  start() {
    if (this.connected == true) return;

    this.connected = true;
    var self = this;
    this.server = this.app.listen(80, () => {
      console.log(`API listening on port ${self.server.address().port}`);
    });
  }

  stop() {
    this.connected = false;
    if (!this.server) return;
    this.server.close();
  }
}

module.exports = API;
