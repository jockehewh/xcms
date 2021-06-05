const IO = require('koa-socket-2')
const fs = require('fs')
const { spawn, exec } = require('child_process')
const archiver = require("archiver")
const extract = require("extract-zip")
const process = require('process')
const { userdb, admindb, projectsdb } = require('../cmsModels.js')
const nodemailer = require('nodemailer')
const mongoose = require('mongoose')
const sharp = require('sharp')

let mongoURI = ''
try {
  const env = fs.readFileSync('./config.xcms.json')
  let temp = JSON.parse(env)
  mongoURI = temp.mongoURI
} catch {
  const defaultConfig = fs.readFileSync(__dirname + '/../config.xcms.json')
  let temp = JSON.parse(defaultConfig)
  mongoURI = temp.mongoURI
}
const crmSocket = new IO({
  namespace: 'crm-socket'
})

const saveCustomAPI = (latestRoutes)=>{
  let saveCustomAPI = fs.createWriteStream('./customAPI.json')
  saveCustomAPI.write(latestRoutes)
  saveCustomAPI.end()
}
const saveCustomModels = (latestModels)=>{
  let updatedModels = fs.createWriteStream('./customModels.json')
  updatedModels.write(latestModels)
  updatedModels.end()
}

crmSocket.on('message', async (ctx) => {
  function restart() {
    ctx.socket.broadcast.emit('restarting', "")
    ctx.socket.emit('restarting', "")
    exec('pm2 -v', (err, res) => {
      if (err) {
        process.on('exit', () => {
          if (process.exitCode == "custom") {
            spawn(process.argv.shift(), process.argv, {
              cwd: process.cwd(),
              detached: true,
              stdio: "inherit"
            })
          }
        })
        console.log('restarting without PM2...')
        process.exit("custom")
      }
      if (res) {
        console.log('restarting...')
        process.exit()
      }
    })
  }
  var datainfo = JSON.parse(ctx.data)
  if (datainfo.userslist) {
    userContacts = []
    userdb.find({}, (err, data) => {
      if (err) console.log(err)
      if (data.length > 0) {
        data.forEach(user => {
          userContacts.push({ fullName: user.firstname + ' ' + user.lastname, email: user.email })
        })
        ctx.socket.emit('normal', JSON.stringify({
          userslist: userContacts
        }))
      } else {
        return
      }
    })
  }
  if (datainfo.routeslist) {
    let customAPIJson = ""
    try{
      customAPIJson = fs.readFileSync('./customAPI.json', { autoClose: true })
    }catch{
      customAPIJson = fs.readFileSync(__dirname + '/../xcmsCustoms/customAPI.json', { autoClose: true })
    }
    let customAPI = JSON.parse(customAPIJson)
    ctx.socket.emit('normal', JSON.stringify({ customRoutes: { routes: customAPI } }))
  }
  if (datainfo.modelslist) {
    let customModelsJson = ""
    try{
      customModelsJson = fs.readFileSync('./customModels.json', { autoClose: true })
    } catch {
      customModelsJson = fs.readFileSync(__dirname + '/../xcmsCustoms/customModels.json', { autoClose: true })
    }
    let customModels = JSON.parse(customModelsJson)
    ctx.socket.emit('normal', JSON.stringify({ customModels: { models: customModels } }))
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.selectedContacts) {
    let transporterInfo = fs.createReadStream('./mail.config.json', {
      autoClose: true
    })
    let transporter = "";
    transporterInfo.on('data', (data) => {
      transporter += data
    })
    transporterInfo.on('end', () => {
      transporter = JSON.parse(transporter)
      let mailTransporter = nodemailer.createTransport(transporter)
      datainfo.selectedContacts.forEach(contact => {
        let mailOptions = {
          from: transporter.auth.user,
          to: contact.email,
          subject: "Hello " + contact.fullName,
          text: datainfo.mailText,
          html: datainfo.htmlText
        }
        mailTransporter.sendMail(mailOptions)
        ctx.socket.emit('success', `Your email to ${contact.email} was sent successfully.`)
      })
    })
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.host) {
    let transporter = fs.createWriteStream('./mail.config.json', {
      encoding: 'utf8'
    })
    let transporterData = {
      host: datainfo.host,
      port: 587,
      secure: false,
      auth: {
        user: datainfo.user,
        pass: datainfo.userpassword
      }
    }
    transporter.write(JSON.stringify(transporterData))
    transporter.end()
    ctx.socket.emit('success', `Your email provider was updated successfully.`)
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.addAdmin) {
    const newAdmin = datainfo.addAdmin
    admindb.find({ xcmsAdmin: newAdmin.username }, (err, res) => {
      if (err) console.log(err)
      if (res.length === 0) {
        const addAnAdmin = new admindb({
          xcmsAdmin: newAdmin.username,
          password: newAdmin.password,
          superAdmin: newAdmin.isSuperAdmin == 1 ? true : false,
          projects: ["default"],
          access: newAdmin.adminAccess,
          isBackendUser: true
        })
        addAnAdmin.save()
        ctx.socket.emit('success', 'The admin was successfully added')
      } else {
        ctx.socket.emit('errorr', `The admin ${newAdmin.username} already exist`)
      }
    })
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.updateAdmin) {
    const toUpdate = datainfo.updateAdmin
    admindb.findOne({ xcmsAdmin: toUpdate.username }, (err, res) => {
      if (err) {
        console.log("err", err)
        ctx.socket.emit('errorr', `The admin "${datainfo.updateAdmin.username}" does not exist.`)
      }
      if (res) {
        res.password = toUpdate.password
        res.superAdmin = toUpdate.isSuperAdmin == 1 ? true : false
        res.access = toUpdate.adminAccess
        if(res.projects && res.projects.length > 0){
          res.save()
        }else{
          res.projects = ["default"]
          res.save()
        }
        ctx.socket.emit('success', `The admin "${datainfo.updateAdmin.username}" was successfully updated.`)
      } else {
        ctx.socket.emit('errorr', `The admin "${datainfo.updateAdmin.username}" does not exist.`)
      }
    })
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.exportPages) {
    const mongodumpCommand = [`--uri=${mongoURI}/xcms`, `-o="mongoExport"`, "--excludeCollection=admins", "--gzip"]
    const exportAction = spawn("mongodump", mongodumpCommand)
    exportAction.on("close", (exitCode, err) => {
      if (exitCode === 0) {
        const out = fs.createWriteStream(__dirname + '/../xcmsExport.zip')
        var archive = archiver('zip', { zlib: { level: 9 } });
        out.on('close', function () {
          fs.readFile(__dirname + "/../xcmsExport.zip", function (err, data) {
            if (err) { console.log(err) }
            ctx.socket.emit('export-complete', data)
          })
        });
        archive.pipe(out);
        archive.directory('mongoExport/', false)
        archive.finalize();
        ctx.socket.emit('success', "Your database has been successfully exported.")
      } else {
        console.log(err)
        ctx.socket.emit('errorr', "Your database export generated an error.", err)
      }
    })
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.exportMedias) {
    const out = fs.createWriteStream(__dirname + '/../xcmsMediaExport.zip')
    var archive = archiver('zip', { zlib: { level: 9 } });
    out.on('close', function () {
      fs.readFile(__dirname + "/../xcmsMediaExport.zip", function (err, data) {
        if (err) { console.log(err) }
        ctx.socket.emit('export-media-complete', data)
        ctx.socket.emit('success', "Your media files was successfully exported.")
      })
    });
    archive.pipe(out);
    archive.directory('./medias/', false)
    archive.finalize();
    ctx.socket.emit('success', "Gathering your media files...")
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.exportMailConfig) {
    let mailConf = fs.createReadStream('./mail.config.json', { autoClose: true })
    let mailJSON = ""
    mailConf.on('data', data => {
      mailJSON += data
    })
    mailConf.on('end', () => {
      ctx.socket.emit('exporting-mail-config', mailJSON)
      ctx.socket.emit('success', "Your mail configuration was successfully exported.")
    })
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.newModel) {
    let newModel = datainfo.newModel
    let customModelsJson = fs.readFileSync(__dirname + '/../xcmsCustoms/customModels.json', { autoClose: true })
    let latestModels = JSON.parse(customModelsJson)
    latestModels.push(newModel)
    latestModels = JSON.stringify(latestModels)
    let updatedModels = fs.createWriteStream(__dirname + '/../xcmsCustoms/customModels.json')
    updatedModels.write(latestModels)
    updatedModels.end()
    saveCustomModels(latestModels)
    ctx.socket.emit('success', `Successfully created the new model: ${newModel.dbName + 'db'}`)
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.newRoute) {
    let newRoute = datainfo.newRoute
    let customAPIJson = fs.readFileSync(__dirname + '/../xcmsCustoms/customAPI.json', { autoClose: true })
    let latestRoutes = JSON.parse(customAPIJson)
    latestRoutes.push(newRoute)
    latestRoutes = JSON.stringify(latestRoutes)
    let updatedRoutes = fs.createWriteStream(__dirname + '/../xcmsCustoms/customAPI.json')
    updatedRoutes.write(latestRoutes)
    updatedRoutes.end()
    saveCustomAPI(latestRoutes)
    ctx.socket.emit('success', `Successfully created the new route: ${newRoute.route}`)
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.updateRoute) {
    let updateRoute = datainfo.updateRoute
    let customAPIJson = fs.readFileSync(__dirname + '/../xcmsCustoms/customAPI.json', { autoClose: true })
    let latestRoutes = JSON.parse(customAPIJson)
    let latestRoutesUpdated = latestRoutes.map(route => {
      if (route.name === updateRoute.oldName) {
        return updateRoute.route
      } else {
        return route
      }
    })
    /* 
    AJOUTER UN BOUTON RECHARGER LA CONFIGURATION
     */
    latestRoutesUpdated = JSON.stringify(latestRoutesUpdated)
    let updatedRoutes = fs.createWriteStream(__dirname + '/../xcmsCustoms/customAPI.json', { autoClose: true })
    updatedRoutes.write(latestRoutesUpdated)
    updatedRoutes.end()
    saveCustomAPI(latestRoutesUpdated)
    ctx.socket.emit('success', `Successfully updated the route: ${updateRoute.route.name} ...Reload your configuration.`)
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.updateModel) {
    let updateModel = datainfo.updateModel
    let customModelsJson = fs.readFileSync(__dirname + '/../xcmsCustoms/customModels.json', { autoClose: true })
    let latestModels = JSON.parse(customModelsJson)
    let latestModelsUpdated = latestModels.map(model => {
      if (model.dbName === updateModel.oldName) {
        return updateModel.model
      } else {
        return model
      }
    })
    latestModelsUpdated = JSON.stringify(latestModelsUpdated)
    let updatedModels = fs.createWriteStream(__dirname + '/../xcmsCustoms/customModels.json')
    updatedModels.write(latestModelsUpdated)
    updatedModels.end()
    saveCustomModels(latestModelsUpdated)
    ctx.socket.emit('success', `Successfully updated the model: ${updateModel.model.dbName + 'db'} ...Reload your configuration.`)
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.exportRoutes) {
    let customAPIJson = fs.readFileSync(__dirname + '/../xcmsCustoms/customAPI.json', { autoClose: true })
    let latestRoutes = JSON.parse(customAPIJson)
    ctx.socket.emit('exporting-routes', JSON.stringify(latestRoutes))
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.exportModels) {
    let customModelsJson = fs.readFileSync(__dirname + '/../xcmsCustoms/customModels.json', { autoClose: true })
    let latestModels = JSON.parse(customModelsJson)
    ctx.socket.emit('exporting-models', JSON.stringify(latestModels))
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.deleteRoute) {
    let deletedRoute = datainfo.deleteRoute.name
    let customAPIJson = fs.readFileSync(__dirname + '/../xcmsCustoms/customAPI.json', { autoClose: true })
    let latestRoutes = JSON.parse(customAPIJson)
    let updatedAPI = latestRoutes.filter(route => {
      if (route.name !== deletedRoute) {
        return route
      }
    })
    customAPIJson = fs.createWriteStream(__dirname + '/../xcmsCustoms/customAPI.json')
    customAPIJson.write(JSON.stringify(updatedAPI))
    customAPIJson.end()
    customAPIJson.on('close', () => {
      saveCustomAPI(updatedAPI)
      ctx.socket.emit('success', `The route named ${deletedRoute} was successfully deleted`)
    })
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.deleteModel) {
    let deletedModel = datainfo.deleteModel
    let customModelsJson = fs.readFileSync(__dirname + '/../xcmsCustoms/customModels.json', { autoClose: true })
    let customModels = JSON.parse(customModelsJson)
    let latestModels = customModels.filter(model => {
      if (model.dbName !== deletedModel.name) {
        return model
      }
    })
    customModelsJson = fs.createWriteStream(__dirname + '/../xcmsCustoms/customModels.json')
    customModelsJson.write(JSON.stringify(latestModels))
    customModelsJson.end()
    customModelsJson.on('close', () => {
      ctx.socket.emit('success', `The model named ${deletedModel} was successfully deleted`)
      saveCustomModels(latestModels)
      if (deletedModel.purge) {
        mongoose.model(deletedModel.name).remove((err, res) => {
          if (err) {
            console.log("err", err)
            ctx.socket.emit('errorr', `Something went wrong: ${err}`)
          }
          if (res) {
            ctx.socket.emit('success', `Successfully removed all the documents from the collection ${deletedModel.name}`)
          }
        })
      }
    })
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.createProject) {
    let project = datainfo.createProject
    projectsdb.find({ name: project.name }, (err, res) => {
      if (err) {
        console.log(err)
      }
      if (res.length > 0) {
        ctx.socket.emit('errorr', `The project named ${project.name} already exsits.`)
      } else {
        let newProject = new projectsdb({
          name: project.name,
          framework: project.framework,
          participants: ["superuser"]
        })
        newProject.save((e, r) => {
          if (e) console.log(e)
          if (r) {
            ctx.socket.emit('success', `Successfully created the project ${project.name}`)
          }
        })
        admindb.findOne({xcmsAdmin: 'superuser'}, (errb, resb)=>{
          if(errb){console.log(errb)}
          if(resb){
            resb.projects.push(project.name)
            resb.save()
          }
        })
      }
    })
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.updateProject) {
    let updateProject = datainfo.updateProject
    let previousPraticipants = []
    projectsdb.findOne({ name: updateProject.name }, (err, res) => {
      if (err) {
        console.log(err)
      }
      if (res) {
        previousPraticipants = res.participants
        res.participants = updateProject.participants
        res.save()
        updateProject.participants.forEach(participant => {
          admindb.findOne({ xcmsAdmin: participant }, (e, r) => {
            if (e) {
              console.log(e)
            }
            if (r) {
              if (r.projects.includes(updateProject.name)) {

              } else {
                r.projects.push(updateProject.name)
                r.save()
                ctx.socket.emit('success', `Successfully added ${r.xcmsAdmin} to the project: ${updateProject.name}`)
              }
            }
          })
        })
        if (previousPraticipants.length > updateProject.participants.length) {
          let removedParticipants = []
          previousPraticipants.forEach(previousParticipant => {
            if (updateProject.participants.indexOf(previousParticipant) === -1) {
              removedParticipants.push(previousParticipant)
            }
          })
          removedParticipants.forEach(removedParticipant => {
            admindb.findOne({ xcmsAdmin: removedParticipant }, (er, re) => {
              if (er) {
                console.log(er)
              }
              if (re) {
                re.projects.pull(updateProject.name)
                re.save()
              }
            })
          })
        }
      }
    })
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.deleteProject) {
    let deleteProject = datainfo.deleteProject
    projectsdb.deleteOne({name: deleteProject.name}, (err, res)=>{
      if(err)console.log(err)
      if(res){
        ctx.socket.emit('success', `Successfully deleted the project: ${deleteProject.name}`)
      }
    })
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.getimages){
    let images = fs.readdirSync(__dirname + "/../medias/imgs")
    ctx.socket.emit('normal', JSON.stringify({images}))
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.getvideos){
    let videos = fs.readdirSync(__dirname + "/../medias/videos")
    ctx.socket.emit('normal', JSON.stringify({videos}))
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.deleteImage){
    fs.unlink(`${__dirname}/../medias/imgs/${datainfo.deleteImage}`, err =>{
      if(err) return console.log(err)
      ctx.socket.emit('success', `Successfully deleted the image: ${datainfo.deleteImage}`)
    })
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.deleteVideo){
    fs.unlink(`${__dirname}/../medias/videos/${datainfo.deleteVideo}`, err =>{
      if(err) return console.log(err)
      ctx.socket.emit('success', `Successfully deleted the video: ${datainfo.deleteVideo}`)
    })
  }
  if (ctx.socket.isSuperAdmin === true && datainfo.restart){
    let restartVal = datainfo.restart.restart
    console.log(restartVal)
    if(restartVal) restart()
  }
})

crmSocket.on("importing", async (ctx) => {
  let importedFile = fs.createWriteStream(__dirname + '/../xcmsExport.zip', { autoClose: true })
  importedFile.write(ctx.data)
  importedFile.end()
  ctx.socket.emit('success', "Unziping your content...")
  importedFile.on('close', async function () {
    await extract(__dirname + '/../xcmsExport.zip', { dir: __dirname + "/../xcmsExport" })
    const mongorestoreCommand = [`--uri=${mongoURI}/xcms`, "--gzip", `--nsInclude="xcms.*"`, `${__dirname}/../xcmsExport`]
    const importAction = spawn("mongorestore", mongorestoreCommand)
    importAction.on("close", (ec) => {
      ctx.socket.emit('import-complete', "")
    })
  })
})
crmSocket.on("importing-medias", async (ctx) => {
  let importedFile = fs.createWriteStream(__dirname + '/../xcmsMediaExport.zip', { autoClose: true })
  importedFile.write(ctx.data)
  importedFile.end()
  ctx.socket.emit('success', "Unziping your media files...")
  importedFile.on('close', async function () {
    await extract(__dirname + '/../xcmsMediaExport.zip', { dir: "./medias/" })
    ctx.socket.emit('import-media-complete', "")
  })
})
crmSocket.on("importing-mail-config", async (ctx) => {
  let mailConfig = fs.createWriteStream('./mail.config.json', { autoClose: true })
  mailConfig.write(ctx.data)
  mailConfig.end()
  ctx.socket.emit('success', "Mail configuration imported successfully.")
  mailConfig.on('close', async function () {
    ctx.socket.emit('import-mail-complete', "")
  })
})

crmSocket.on('importing-routes', async ctx => {
  let customAPIJson = fs.createWriteStream(__dirname + '/../xcmsCustoms/customAPI.json', { autoClose: true })
  customAPIJson.write(ctx.data)
  customAPIJson.end()
  ctx.socket.emit('success', "API configuration imported successfully. Reload your configuration...")
})
crmSocket.on('importing-models', async ctx => {
  let customModelsJson = fs.createWriteStream(__dirname + '/../xcmsCustoms/customModels.json', { autoClose: true })
  customModelsJson.write(ctx.data)
  customModelsJson.end()
  ctx.socket.emit('success', "Models configuration imported successfully. Reload your configuration...")
})
let extensionCheck = /(\.(jpeg)|(png)|(PNG)|(tiff)|(tif)|(jpg)|(gif)|(svg)|(webp))$/
crmSocket.on('image', ctx => {
  let extensionIndex = extensionCheck.exec(ctx.data.name).index
  let newName = ctx.data.name.slice(0, extensionIndex) + 'webp'
  sharp(ctx.data.image).toFile('./medias/imgs/' + newName, (err, info)=>{
    if(err)console.log(err)
    ctx.socket.emit('success', `New image saved as ${newName}.`)
  })
})
crmSocket.on('video', ctx => {
  var newImg = fs.createWriteStream('./medias/videos/' + ctx.data.name, {
    encoding: "binary"
  })
  newImg.write(ctx.data.video)
  newImg.end()
  ctx.socket.emit('success', `New video saved as ${ctx.data.name}.`)
})

module.exports = crmSocket