
const express = require('express');
const http = require('http');
const path = require('path');

module.exports = function (config, ap) {
  var app = express();

  app.use('/', express.static(path.join(__dirname, './front')));

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
    res.header('Access-Control-Allow-Headers', req.get('Access-Control-Request-Headers'))
    ap.setNetwork(req.body.ssid, req.body.pwd, (err, ip) => {
      if (err) {
        console.trace('setWifiNetwork')
        console.error(err)
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

  var server = app.listen(80, () => {
    console.log(`API listening on port ${server.address().port}`);
  });
}
