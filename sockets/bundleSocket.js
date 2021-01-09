const IO = require('koa-socket-2')
const fs = require('fs')
const mongoose = require('mongoose')
const { customComponentsdb } = require('../cmsModels.js')

const bundleSocket = new IO({
    namespace: 'bundler-socket'
})

bundleSocket.on('message', data=>{
  let datainfo = JSON.parse(data)
})

module.exports = bundleSocket