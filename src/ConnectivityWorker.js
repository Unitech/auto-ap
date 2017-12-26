/* eslint-env node */

'use strict'
const EventEmitter = require('events')
const isOnline = require('./utils/is-online.js')

/**
 * ConnectivityWorker is a worker who check internet and network.
 */
class ConnectivityWorker extends EventEmitter {
  constructor () {
    super()

    this.network = null
    this.networkTests = 0
    this.intervalNetwork = null

    this.internet = null
    this.intervalInternet = null
  }

  /**
   * Start worker.
   */
  start () {
    this.intervalInternet = setInterval(() => {
      isOnline((internet) => {
        if (this.internet !== internet) {
          this.emit('change', this.network, internet)
          this.internet = internet
        }
      })
    }, 1000)
  }

  /**
   * Stop worker.
   */
  stop () {
    clearInterval(this.intervalNetwork)
    clearInterval(this.intervalInternet)
    this.emit('stop')
  }
}

module.exports = ConnectivityWorker
