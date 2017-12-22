/* eslint-disable standard/no-callback-literal */
const axios = require('axios')
const ip = require('./internal-ip.js')

module.exports = cb => {
  axios.get('http://captive.keymetrics.io/').then((res) => {
    cb(true)
  }).catch(e => {
    cb(false)
  })
}

module.exports.internet = module.exports
module.exports.local = cb => {
  let addr = ip()
  cb(addr !== '127.0.0.1')
}
