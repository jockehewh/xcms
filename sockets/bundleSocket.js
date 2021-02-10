const IO = require('koa-socket-2')
const fs = require('fs')
const mongoose = require('mongoose')
const { customComponentsdb, projectsdb } = require('../cmsModels.js')
const {Bundler} = require('../xcmsCustoms/bundler.js')


const bundleSocket = new IO({
    namespace: 'bundler-socket'
})

bundleSocket.on('message', ctx=>{
  let datainfo = JSON.parse(ctx.data)
  if(datainfo.createBuild){
    let createBuild = datainfo.createBuild
    Bundler(createBuild, ctx)
  }
  if(datainfo.newComponent){
    let newComponent = datainfo.newComponent
    let saveComp = new customComponentsdb(newComponent)
    saveComp.save((err, res)=>{
      if(err) console.log(err)
      if(res) {
        ctx.socket.emit('success', "Successfully created new component: " + newComponent.scriptName)
      }
    })
  }
  if(datainfo.updateComponent){
    let updateComponent = datainfo.updateComponent
    customComponentsdb.findOneAndUpdate({scriptName: updateComponent.scriptName}, 
    {
      scriptContent: updateComponent.scriptContent,
      attachedCSS: updateComponent.attachedCSS
    }, (err, ress)=>{
      if(err){
        ctx.socket.emit("errorr", 'Could not update the component: ' + updateComponent.scriptName)
        console.log(err)
      }
      if(ress){
        ctx.socket.emit('success', "Successfully updated the component: " + updateComponent.scriptName)
        ress.save((errr)=>{
          if(errr) console.log(errr, 'saving')
        })
      }
    })
  }
})

module.exports = bundleSocket