const koa = require('koa')
const fs = require('fs')
const bodyParser = require('koa-body')
const nodemailer = require('nodemailer')
const passport = require('koa-passport')
const r = require('koa-route')
const session = require('koa-session')
const adminSocket = require('./sockets/adminSocket.js')
const bundleSocket = require('./sockets/bundleSocket.js')
const xcms = new koa();
const jsp = JSON.parse;
const mongoose = require('mongoose')
const theEventListener = require(__dirname + "/xcmsCustoms/innerEvents")
let allModels = {}
let the = ''
try {
  const env = fs.readFileSync('./config.xcms.json')
  the = jsp(env)
} catch{
  const defaultConfig = fs.readFileSync(__dirname + '/config.xcms.json')
  the = jsp(defaultConfig)
}

mongoose.connect(the.mongoURI + '/xcms', the.mongoOptions)

var pagesCollection = require(__dirname + '/xcmsCustoms/pageCollection.js')

var isIndex = require(__dirname + '/xcmsCustoms/isIndex.js')
const { pagedb, menudb, customComponentsdb } = require(__dirname + '/cmsModels.js')
allModels = Object.assign({pagedb}, allModels)
allModels = Object.assign({menudb}, allModels)

let customModelsJson = fs.readFileSync(__dirname + '/xcmsCustoms/customModels.json')
let customModels = JSON.parse(customModelsJson)
const registerModel = (model)=>{
  let identifiers = model.identifiers
  for (let id in identifiers){
    if(identifiers[id] === "String")
      identifiers[id] = String
    if(identifiers[id] === "Number")
      identifiers[id] = Number
    if(identifiers[id] === "Boolean")
      identifiers[id] = Boolean
    if(identifiers[id] === "Array")
      identifiers[id] = Array
    if(identifiers[id] === "Buffer")
      identifiers[id] = Buffer
    if(identifiers[id] === "Map")
      identifiers[id] = Map
    if(identifiers[id] === "Date")
      identifiers[id] = Date
    if(identifiers[id] === "Mixed")
      identifiers[id] = mongoose.Mixed
    if(identifiers[id] === "ObjectId")
      identifiers[id] = mongoose.ObjectId
    if(identifiers[id] === "Decimal128")
      identifiers[id] = mongoose.Decimal128
  }
  allModels = Object.assign({
    [model.dbName + 'db' ]: mongoose.model(model.dbName, new mongoose.Schema (identifiers))
  }, allModels)
}
customModels.forEach(model =>{
  if(model != undefined){
    registerModel(model)
  }
})
theEventListener.on('RegisterNewModel', (model)=>{
  registerModel(model)
})


xcms.proxy = true
xcms.keys = [the.passportKeys]
xcms.use(session({}, xcms))
xcms.use(bodyParser())
xcms.use(passport.initialize())
xcms.use(passport.session())
require(__dirname + '/adminAuth.js')

function updatePageCollection(){
  isIndex.length = 0
  pagedb.find({}, (err, data) => {
  if (err) { console.log('fetch page error', err) }
  pagesCollection.push(...data)
  pagesCollection.forEach(page => {
    if (page.name === "index.html") {
      isIndex.push(page)
    }
  })
})
}
updatePageCollection()


const makeCustomRoute = (conf)=>{
  if(conf.action === "read"){
    return xcms.use(r.get('/'+conf.route, (ctx)=>{
      ctx.status = 200
      return allModels[conf.model].find({}, (err, res)=>{
        if(err) console.log(err)
        if(res){
          ctx.type = "text/json"
          let targetMapped = {}
          conf.targetValues.forEach(target =>{
            targetMapped = Object.assign({[target]: target}, targetMapped)
            return {[target]: target}
          })
          let queryResponse = res.map(obj=>{
            let queryObject = {}
            for (key in targetMapped){
              queryObject = Object.assign({[key]: obj[key]}, queryObject)
            }
            return queryObject
          })
          ctx.body = JSON.stringify(queryResponse)
        }
      })
    }))
  }else{
    return xcms.use(r.post('/'+conf.route, (ctx)=>{
      let reqBody = ctx.request.body
      ctx.status = 200
      if(conf.action === "create"){
        let addItem = new allModels[conf.model](reqBody)
        addItem.save()
      }
      if(conf.action === "update"){
        allModels[conf.model].findOneAndUpdate({[conf.targetValue]: reqBody[conf.targetValue]},reqBody,
        {new: true}, (err, res)=>{
          if(err) {
            ctx.type = "text/json"
            console.log(err)
            ctx.body = JSON.stringify({updateError: `Could not update the data with item:\n${reqBody}`})
            }
          if(res){
            ctx.type = "text/json"
            res.save()
            ctx.body = JSON.stringify({success: "Data updated successfully."})
          }
        })
      }
      if(conf.action === "delete"){
        allModels[conf.model].deleteOne(reqBody, (err, res)=>{
          if(err){
            ctx.type = "text/json"
            console.log(err)
            ctx.body = JSON.stringify({updateError: `Could not delete the data with item:\n${reqBody}`})
          }
          if(res){
            ctx.type = "text/json"
            ctx.body = JSON.stringify({success: "Data deleted successfully."})
          }
        })
      }
    }))
  }
}

const typeCTL = /(html|css|js|jpeg|jpg|PNG|png|woff2|ttf|mp4|webp)/

/* ROUTER START */

xcms.use(r.get('/', ctx => {
  if (isIndex[0] != undefined) {
    ctx.type = 'text/html'
    ctx.body = isIndex[0].page
  } else {
    ctx.redirect('/connect')
  }
}))

xcms.use(r.get('/connect', ctx => {
  ctx.type = "text/html"
  ctx.body = fs.createReadStream(__dirname + '/admin-site/login.html', {
    autoClose: true
  })
}))

xcms.use(r.post('/contact', ctx => {
  const contact = ctx.request.body
  userdb.find({ email: contact.email }, (err, data) => {
    if (data.length > 0) {
      ctx.socket.emit('errorr', 'You already sent an email, please wait, we will contact you very soon')
    } else {
      let newContact = new userdb({
        firstname: contact.firstname,
        lastname: contact.lastname,
        email: contact.email,
        firstMessage: contact.message,
        messagesHistory: [contact.message]
      })
      newContact.save((err, user) => { })
      let transporterInfo = fs.createReadStream('./mail.config.json', {
        autoClose: true
      })
      let transporter = "";
      transporterInfo.on('data', (data) => {
        transporter += data
      })
      transporterInfo.on('end', () => {
        transporter = jsp(transporter)
        const mailTransporter = nodemailer.createTransport(transporter)
        const email = {
          from: contact.email,
          to: transporter.auth.user,
          subject: contact.firstname + " " + contact.lastname + " contacted you",
          text: contact.message
        }
        mailTransporter.sendMail(email)
      })
      ctx.socket.emit('success', `Thank you ${contact.firstname} ${contact.lastname}, we will read your email soon.`)
    }
  })
  ctx.redirect('/')
}))

xcms.use(r.get('/favicon.ico', ctx => {
  ctx.type = 'image/png'
  ctx.body = fs.createReadStream(__dirname + '/favicon.ico', {
    autoClose: true
  })
}))

xcms.use(r.get(/\/([a-zA-Z0-9_-]{2,}.html)/, ctx => {
  updatePageCollection()
  ctx.type = 'text/html'
  pagesCollection.forEach(page => {
    if ('/' + page.name === ctx.url) {
      ctx.body = page.page
    }
  })
}))

xcms.use(r.get(/\/frontend-site\/[a-zA-Z0-9/._-]{2,}?[a-zA-Z0-9/._-]{2,}.css/, ctx => {
  ctx.type = 'text/css'
  if (/onthefly/.test(ctx.url)) {
    if (typeCTL.exec(ctx.url)[0] === 'css') {
      cssFileName = /\/([a-zA-Z0-9]{2,})\.css/.exec(ctx.url)[1]
      pagesCollection.forEach(page => {
        if (page.name === cssFileName + '.html') {
          ctx.body = page.css
        }
      })
    }
  } else {
    ctx.body = fs.createReadStream(__dirname + ctx.url)
  }
}))

xcms.use(r.get(/\/frontend-site\/[a-zA-Z0-9/._-]{2,}?[a-zA-Z0-9/._-]{2,}.js/, ctx => {
  ctx.type = 'text/javascript'
  if (/onthefly/.test(ctx.url)) {
    jsFileName = /\/([a-zA-Z0-9]{2,})\.js/.exec(ctx.url)[1]
    pagesCollection.forEach(page => {
      if (page.name === jsFileName + '.html') {
        ctx.body = page.js
      }
    })
  } else {
    ctx.body = fs.createReadStream(__dirname + ctx.url)
  }
}))

xcms.use(r.get(/^\/videos\/([a-zA-Z0-9_-]{2,})/, ctx => {
  let videoName = ctx.url.split('/')
  ctx.type = 'video/*'
  ctx.body = fs.createReadStream('./medias/videos/' + videoName[2], {
    autoclose: true
  })
}))

xcms.use(r.get(/^\/imgs\/([a-zA-Z0-9_-]{2,})/, ctx => {
  let imageName = ctx.url.split('/')
  ctx.type = 'image/webp'
  ctx.body = fs.createReadStream('./medias/imgs/' + imageName[2], {
    autoclose: true
  })
}))

xcms.use(r.get(/\/[a-zA-Z0-9_-]{2,}.woff/, ctx => {
  ctx.type = 'font/woff2'
  ctx.body = fs.createReadStream(__dirname + ctx.url)
}))

xcms.use(r.get(/\/[a-zA-Z0-9_-]{2,}.ttf/, ctx => {
  ctx.type = 'application/font-sfnt'
  ctx.body = fs.createReadStream(__dirname + ctx.url)
}))

xcms.use(r.post('/admin', (ctx)=>{
  return passport.authenticate('connexion', function(err, res){
    if(err){
      console.log(err)
      ctx.redirect('/')
      }
    if(res){
      const evem = require(__dirname + "/xcmsCustoms/innerEvents")
      evem.emit('isSuperAdmin', res.superAdmin)
      ctx.login(res)
      ctx.redirect('/admin')
    }
  })(ctx)
}))

/* ENABLE CUSTOM API ROUTES */

let customAPIReader = fs.readFileSync(__dirname +'/xcmsCustoms/customAPI.json')
let customAPI = JSON.parse(customAPIReader)
let identifiedRoutes = customAPI.map(route=>{
  if(route.authenticated === true)
  return route
})
let unidentifiedRoutes = customAPI.map(route=>{
  if(route.authenticated === false)
  return route
})
unidentifiedRoutes.forEach(conf=>{
  if(conf !== undefined){
    if(conf.available){
      makeCustomRoute(conf)
    }
  }
})

/* AUTHENTICATED ROUTES START */

xcms.use((ctx, next) => {
  if (ctx.isAuthenticated()) {
    return next()
  } else {
    ctx.redirect('/')
  }
})

xcms.use(r.get('/admin', (ctx) => {
  ctx.type = "html"
  ctx.body = fs.createReadStream(__dirname + '/admin-site/index.html', {
    autoClose: true
  })
}))
xcms.use(r.get('/bundle-editor', (ctx) => {
  ctx.type = "html"
  ctx.body = fs.createReadStream(__dirname + '/admin-site/bundle-editor.html', {
    autoClose: true
  })
}))
xcms.use(r.get('/data-manager', (ctx) => {
  ctx.type = "html"
  ctx.body = fs.createReadStream(__dirname + '/admin-site/data-manager.html', {
    autoClose: true
  })
}))
xcms.use(r.get(/\/admin-site\/[a-zA-Z0-9/._-]{2,}?[a-zA-Z0-9/._-]{2,}.css$/, ctx => {
  ctx.type = 'text/css'
  ctx.body = fs.createReadStream(__dirname + ctx.url)
}))

xcms.use(r.get(/\/admin-site\/[a-zA-Z0-9/._-]{2,}?[a-zA-Z0-9/._-]{2,}.js$/, ctx => {
  ctx.type = 'text/javascript'
  ctx.body = fs.createReadStream(__dirname + ctx.url)
}))

xcms.use(r.get('/admin-site/dltcursor.png', ctx => {
  ctx.type = 'image/png'
  ctx.body = fs.createReadStream(__dirname + '/admin-site/dltcursor.png', {
    autoClose: true
  })
}))
xcms.use(r.get('/admin-site/smart-template.png', ctx => {
  ctx.type = 'image/png'
  ctx.body = fs.createReadStream(__dirname + '/admin-site/smart-template.png', {
    autoClose: true
  })
}))
xcms.use(r.get(/column/, ctx => {
  ctx.type = 'image/png'
  ctx.body = fs.createReadStream(__dirname + ctx.url, {
    autoClose: true
  })
}))
/* ENABLE CUSTOM API AUTHENTIFIED ROUTES */
identifiedRoutes.forEach(conf=>{
  if(conf !== undefined){
    if(conf.available){
      makeCustomRoute(conf)
    }
  }
})

xcms.use(r.get('/logout', (ctx) => {
  ctx.logout();
  ctx.redirect('/connect')
}))

/* AUTHENTICATED ROUTES END */

/* ROUTER END */

/* SOCKET IO */
adminSocket.attach(xcms)
adminSocket.on('connection', (ctx) => {
  pagedb.find({}, (err, res) => {
    if (err) console.log(err)
    if (res) {
      res.forEach(file => {
        ctx.emit('normal', JSON.stringify({
          lien: file
        }))
      })
    }
  })
  let transporterInfo = fs.createReadStream('./mail.config.json', {
    autoClose: true
  })
  let transporter = "";
  transporterInfo.on('data', (data) => {
    transporter += data
  })
  transporterInfo.on('end', () => {
    transporter = JSON.parse(transporter)
    if (transporter.host !== ''){
      ctx.emit('normal', JSON.stringify({
        formfield: true
      }))
    }
  })
})

require(__dirname + '/sockets/CRMSocket.js').attach(xcms)
bundleSocket.attach(xcms)
bundleSocket.on('connection', (ctx)=>{
  customComponentsdb.find({}, (err, res)=>{
    if(err){
      console.log(err)
      ctx.emit('errorr', "Error gathering all components")
    }
    if(res){
      ctx.emit('normal', JSON.stringify({existingComponents: res}))
    }
  })
})

/* SOCKET IO END */

xcms.listen(the.port, () => {
  if(!fs.existsSync('./medias')){
    fs.mkdir('./medias/imgs', {recursive: true}, (err)=>{
      if(err) console.log(err)
    })
    fs.mkdir('./medias/videos', {recursive: true}, (err)=>{
      if(err) console.log(err)
    })
  }
  if(!fs.existsSync('./mail.config.json')){
    let transporter = fs.createWriteStream('./mail.config.json', {
          encoding: 'utf8'
      })
    let transporterData = {
        host: "",
        port: 587,
        secure: false,
        auth: {
            user: "",
            pass: ""
        }
    }
    transporter.write(JSON.stringify(transporterData))
    transporter.end()
  }
  if(!fs.existsSync(__dirname + '/builders')){
    fs.mkdir(__dirname + '/builders/prebuild', {recursive: true}, (err)=>{
      if(err) console.log(err)
    })
    fs.mkdir(__dirname + '/builders/build', {recursive: true}, (err)=>{
      if(err) console.log(err)
    })
    fs.mkdir(__dirname + '/builders/css', {recursive: true}, (err)=>{
      if(err) console.log(err)
    })
  }
  customComponentsdb.find({}, (err, res)=>{
    if(err)console.log(err)
    if(res.length < 1){
      let files = fs.readdirSync(__dirname + '/nightlyjs')
      let cssfiles = fs.readdirSync(__dirname + '/nightlyjs/css')
      files.forEach(file=>{
        if(/.js$/.test(file)){
          let fileContent = fs.readFileSync(__dirname + '/nightlyjs/'+ file, {encoding: 'utf-8'})
          let cssContent = ""
          cssfiles.forEach(css=>{
            if(css.replace('.css', '') == file.replace('.js', '')){
              cssContent = fs.readFileSync(__dirname + '/nightlyjs/css/'+ css, {encoding: 'utf-8'})
            }
          })
          let componentObject = new customComponentsdb({
          framework: 'nightlyjs',
          scriptName: file,
          scriptContent: fileContent,
          attachedCSS: cssContent
          })
          componentObject.save((err, res)=>{
            if(err) console.log(err)
            if(res){
              console.log(`Successfully created the ${res.scriptName} component for the framework ${res.framework}`)
            }
          })
        }
    })
    }
  })
  console.log("listenning on port:", the.port)
})

module.exports = xcms