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
    this.intervalNetwork = setInterval(() => {
      isOnline.local((network) => {
        if (this.network !== network && this.networkTests < 5) {
          this.networkTests++
          return
        }
        this.networkTests = 0
        if (this.network !== network) {
          this.emit('change', this.internet, network)
          this.emit('networkChange', this.network, network)
          this.network = network
        }
      })
    }, 2000)

    this.intervalInternet = setInterval(() => {
      isOnline((internet) => {
        if (this.internet !== internet) {
          this.emit('change', this.network, internet)
          this.emit('internetChange', this.internet, internet)
          this.internet = internet
        }
      })
    }, 10000)

    this.emit('start')
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
