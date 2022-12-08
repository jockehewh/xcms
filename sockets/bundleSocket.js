const IO = require('koa-socket-2')
const fs = require('fs')
const mongoose = require('mongoose')
const { customComponentsdb, projectsdb, admindb } = require('../cmsModels.js')
const {Bundler} = require('../xcmsCustoms/bundler.js')
const { spawn } = require('child_process')
const sharp = require('sharp')
let devServer = require('../xcmsCustoms/devServerStatus')
const devServerPort = require('../config.xcms.json').projectOptions.devServerPort
console.log(devServerPort)
const controller = new AbortController();
const { signal } = controller;

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
  if (datainfo.deleteComponent){
    fs.unlink(`./builders${datainfo.deleteComponent.path}/${datainfo.deleteComponent.name}`, err =>{
      if(err) return console.log(err)
      ctx.socket.emit('success', `Successfully deleted the component: ${datainfo.deleteComponent.name}`)
    })
  }
  if(datainfo.pkgopt){
    const pkgOptions = datainfo.pkgopt
    let pkgcmd = ""
    console.log(pkgOptions.script[0])
    if(pkgOptions.script[0] === "dev"){
      devServer.isOn = true
      devServer.devServer = spawn('npm', ['run', ...pkgOptions.script], {cwd: "./builders/"+ pkgOptions.name, signal})
      bundleSocket.broadcast('normal', JSON.stringify({devServer: {isOn: devServer.isOn}}))
      //emit devser has started
    }else if(pkgOptions.script[0] === "stop-dev-server"){
      devServer.isOn = false
      bundleSocket.broadcast('normal', JSON.stringify({devServer: {isOn: devServer.isOn}}))
      let temp = ""
      let shutDownDevServer = spawn("lsof", ["-i", `TCP:${devServerPort}`])
      shutDownDevServer.stdout.on('data', (c)=>{
        console.log(c)
        temp += c.toString('utf8')
      })
      shutDownDevServer.stderr.on('error', (e)=>{
        console.log("error", e, devServer.devServer.pid.toString())
      })
      shutDownDevServer.on('close', ()=>{
        console.log(temp.split('NAME\nnode'))
        let systemPID = temp.split('NAME\nnode')[1].trim()
        console.log("1",systemPID)
        systemPID = systemPID.split(' ')[0]
        console.log(systemPID)
        spawn('kill', ["-9", systemPID])
        console.log("closed the kill command for pid", devServer.devServer.pid)
        //emit devser has stoped
        devServer.devServer = {}
      })
    }else{
      pkgcmd = spawn('npm', ['run', ...pkgOptions.script], {cwd: "./builders/"+ pkgOptions.name})
      pkgcmd.stdout.on('data', data=>{
        console.log(data.toString('utf8'))
      })
      pkgcmd.on('close', code =>{
        console.log("command closed")
      })
    }
  }
  if (datainfo.addAdmin) {
    const newAdmin = datainfo.addAdmin
    admindb.find({ xcmsAdmin: newAdmin.username }, (err, res) => {
      if (err) console.log(err)
      if (res.length === 0) {
        const addAnAdmin = new admindb({
          xcmsAdmin: newAdmin.username,
          password: newAdmin.password,
          superAdmin: true,
          projects: ["default"],
          access: 'bundle',
          isBackendUser: true
        })
        addAnAdmin.save()
        ctx.socket.emit('success', 'The admin was successfully added')
      } else {
        ctx.socket.emit('errorr', `The admin ${newAdmin.username} already exist`)
      }
    })
  }
  if (datainfo.updateAdmin) {
    const toUpdate = datainfo.updateAdmin
    admindb.findOne({ xcmsAdmin: toUpdate.username }, (err, res) => {
      if (err) {
        console.log("err", err)
        ctx.socket.emit('errorr', `The admin "${datainfo.updateAdmin.username}" does not exist.`)
      }
      if (res) {
        res.password = toUpdate.password
        res.save()
        ctx.socket.emit('success', `The admin "${datainfo.updateAdmin.username}" was successfully updated.`)
      } else {
        ctx.socket.emit('errorr', `The admin "${datainfo.updateAdmin.username}" does not exist.`)
      }
    })
  }
  if (datainfo.getimages){
    let images = fs.readdirSync("./medias/imgs")
    ctx.socket.emit('normal', JSON.stringify({images}))
  }
  if (datainfo.getvideos){
    let videos = fs.readdirSync("./medias/videos")
    ctx.socket.emit('normal', JSON.stringify({videos}))
  }
  if (datainfo.deleteImage){
    fs.unlink(`./medias/imgs/${datainfo.deleteImage}`, err =>{
      if(err) return console.log(err)
      ctx.socket.emit('success', `Successfully deleted the image: ${datainfo.deleteImage}`)
    })
  }
  if (datainfo.deleteVideo){
    fs.unlink(`./medias/videos/${datainfo.deleteVideo}`, err =>{
      if(err) return console.log(err)
      ctx.socket.emit('success', `Successfully deleted the video: ${datainfo.deleteVideo}`)
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
    //envoyer un nouveau message transfert complete pour créer les thumbnail et les liens
    ctx.socket.emit('success', `Saved at /medias/imgs/${newName}.`)
  })
})
bundleSocket.on('video', ctx=>{
  console.log("new video:", ctx.data.name)
  let newVideo = fs.createWriteStream('./medias/videos/' + ctx.data.name, {
    encoding: "binary"
  })
  newVideo.write(ctx.data.video)
  newVideo.on('close', code=>{
    //socket emit transfert completep our créer les thumbnail et les liens
  })
  newVideo.end()
  ctx.socket.emit('success', `Saved at /medias/videos/${ctx.data.name}.`)
})

module.exports = {bundleSocket, devServer}