const IO = require('koa-socket-2')
const fs = require('fs')
const mongoose = require('mongoose')
const { customComponentsdb, projectsdb, admindb } = require('../cmsModels.js')
const {Bundler} = require('../xcmsCustoms/bundler.js')
const { spawn } = require('child_process')
const sharp = require('sharp')

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
    if(!fs.existsSync(`./builders${newComponent.path}`)){
      fs.mkdirSync(`./builders${newComponent.path}`)
      fs.writeFileSync(`./builders${newComponent.path}/${newComponent.scriptName}`, "console.log('Hello world!');")
    }else{
      fs.writeFileSync(`./builders${newComponent.path}/${newComponent.scriptName}`, "console.log('Hello world!');")
    }
  }
  if(datainfo.updateComponent){
    let updateComponent = datainfo.updateComponent
    fs.writeFileSync(`./builders${updateComponent.path}/${updateComponent.scriptName}`, updateComponent.scriptContent, {encoding: "utf8"})
  }
  if(datainfo.pkgopt){
    const pkgOptions = datainfo.pkgopt
    let pkgcmd = spawn('npm', ['run', ...pkgOptions.script], {cwd: "./builders/"+ pkgOptions.name})
    pkgcmd.stdout.on('data', data=>{
      console.log(data.toString('utf8'))
    })
    pkgcmd.on('close', code =>{
      console.log("command closed")
    })
  }
})
let extensionCheck = /(\.(jpeg)|(png)|(PNG)|(tiff)|(tif)|(jpg)|(gif)|(svg)|(webp))$/
bundleSocket.on('image', ctx=>{
  console.log("new image:", ctx.data.name)
  let extensionIndex = extensionCheck.exec(ctx.data.name).index
  let newName = ctx.data.name.slice(0, extensionIndex) + 'webp'
  sharp(ctx.data.image).toFile('./medias/imgs/' + newName, (err, info)=>{
    if(err)console.log(err)
    ctx.socket.emit('success', `Saved at /medias/imgs/${newName}.`)
  })
})
bundleSocket.on('video', ctx=>{
  console.log("new video:", ctx.data.name)
  let newVideo = fs.createWriteStream('./medias/videos/' + ctx.data.name, {
    encoding: "binary"
  })
  newVideo.write(ctx.data.video)
  newVideo.end()
  ctx.socket.emit('success', `Saved at /medias/videos/${ctx.data.name}.`)
})

module.exports = bundleSocket