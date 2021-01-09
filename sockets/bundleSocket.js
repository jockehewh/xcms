const IO = require('koa-socket-2')
const fs = require('fs')
const mongoose = require('mongoose')
const { customComponentsdb } = require('../cmsModels.js')
const bundler = require('../xcmsCustoms/bundler.js')

const bundleSocket = new IO({
    namespace: 'bundler-socket'
})

bundleSocket.on('message', ctx=>{
  let datainfo = JSON.parse(ctx.data)
  if(datainfo.createBuild){
    let createBuild = datainfo.createBuild
    bundler(createBuild, ctx)
  }
})

module.exports = bundleSocket