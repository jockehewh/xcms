const koa = require('koa')
const fs = require('fs')
const {koaBody} = require('koa-body')
const nodemailer = require('nodemailer')
const passport = require('koa-passport')
const r = require('koa-route')
const session = require('koa-session')
const serve = require('koa-static')
const js_beautify = require('js-beautify')
const {bundleSocket} = require('./sockets/bundleSocket.js')
const xcms = new koa();
const jsp = JSON.parse;
const mongoose = require('mongoose')
const { admindb } = require('./cmsModels.js')
let currentProjects = []
let currentUser =''
let isSuperAdmin = false
let the = ''
try {
  const env = fs.readFileSync('./config.xcms.json')
  the = jsp(env)
} catch{
  const defaultConfig = fs.readFileSync(__dirname + '/config.xcms.json')
  the = jsp(defaultConfig)
}

mongoose.connect(the.mongoURI, the.mongoOptions)

var pagesCollection = require(__dirname + '/xcmsCustoms/pageCollection.js')

var isIndex = require(__dirname + '/xcmsCustoms/isIndex.js')
const { pagedb, menudb, customComponentsdb, projectsdb } = require(__dirname + '/cmsModels.js')


xcms.proxy = true
xcms.keys = [the.passportKeys]
xcms.use(session({}, xcms))
xcms.use(koaBody())
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

const typeCTL = /(html|css|js|jpeg|jpg|PNG|png|woff2|ttf|mp4|webp)/

/* ROUTER START */

xcms.use(r.get('/', serve(`builder/${fs.readdirSync('./builder')[0]}/${the.projectOptions.buildFolder}`)))

xcms.use(r.get('/connect', ctx => {
  ctx.type = "text/html"
  ctx.body = fs.createReadStream(__dirname + '/admin-site/login.html', {
    autoClose: true
  })
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

xcms.use(r.get(/^(?!\/admin-site\/)[a-zA-Z0-9/._-]{2,}.css$/, ctx => {
  ctx.type = 'text/css'
  ctx.body = fs.createReadStream(`builder/${fs.readdirSync('./builder')[0]}/${the.projectOptions.buildFolder}/${ctx.url}`)
}))

xcms.use(r.get(/^(?!\/admin-site\/)[a-zA-Z0-9/._-]{2,}.js$/, ctx => {
  ctx.type = 'text/javascript'
  ctx.body = fs.createReadStream(`builder/${fs.readdirSync('./builder')[0]}/${the.projectOptions.buildFolder}/${ctx.url}`)
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

xcms.use(r.post('/admin', async (ctx)=>{
  return await passport.authenticate('connexion', async function(err, res){
    if(err){
      console.log(err)
      ctx.redirect('/')
      }
    if(res){
      isSuperAdmin = res.superAdmin
      currentProjects = res.projects
      currentUser = res.xcmsAdmin
      ctx.session.customAccess = res.access
      await ctx.login(res)
      ctx.redirect('/bundle-editor')
    }
  })(ctx)
}))

/* AUTHENTICATED ROUTES START */

xcms.use((ctx, next) => {
  if (ctx.isAuthenticated()) {
    return next()
  } else {
    ctx.redirect('/')
  }
})

xcms.use(r.get('/bundle-editor', (ctx) => {
  if(ctx.session.customAccess == "bundle" || ctx.session.customAccess == "both"){
    ctx.type = "html"
    ctx.body = fs.createReadStream(__dirname + '/admin-site/bundle-editor.html', {
      autoClose: true
    })
  }else{
    ctx.redirect('/')
  }
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

xcms.use(r.get('/logout', (ctx) => {
  ctx.logout();
  ctx.redirect('/connect')
}))

/* AUTHENTICATED ROUTES END */

/* ROUTER END */

/* SOCKET IO */
bundleSocket.attach(xcms)
bundleSocket.on('connection', async (ctx)=>{
  let existingComponents = []
  const readNextDir = async (nextDir)=>{
    fs.readdir(nextDir, (err, subfiles)=>{
      if(err){
        console.log("ERR",err)
      }
      if(subfiles){
        subfiles.forEach(subfile=>{
          if(subfile === "node_modules") return
          fs.readdir(nextDir+subfile, (err2, depth)=>{
            if(err2){
              if(
                err2.path.includes('package-lock.json')
                ) return
              let compPath = err2.path.split('/')
              let compName = compPath.pop()
              compPath = compPath.join('/')
              compPath = compPath.split("builder")[1]
              if(err2.path.includes('package.json')){
                let packageJ = fs.readFileSync(err2.path, {encoding: "utf8"})
                packageJ = JSON.parse(packageJ)
                if(!packageJ.scripts['stop-dev-server']) packageJ.scripts['stop-dev-server'] = ""
                if(!packageJ.scripts.install) packageJ.scripts.install = ""
                packageJ = js_beautify(JSON.stringify(packageJ), { indent_size: 2, space_in_empty_paren: true })
                fs.writeFileSync(err2.path, packageJ, {encoding: "utf8"})
              }
              let newCustomComp = {
                scriptName: compName,
                path: compPath,
                scriptContent: fs.readFileSync(err2.path, {encoding: "utf8"}),
                attachedCSS: "",
                project: "projectName"
              }
              existingComponents.push(newCustomComp)
            }
            if(depth && depth.length > 0) readNextDir(nextDir + subfile + '/')
          })
        })
      }
    })
  }
  if(fs.readdirSync( "./builder").length > 0)
  await readNextDir("./builder/"+fs.readdirSync( "./builder")[0] + "/")
  setTimeout(()=>{
    ctx.emit('normal', JSON.stringify({existingComponents: {existingComponents: existingComponents}}))
    let devServer = require('./xcmsCustoms/devServerStatus.js')
    ctx.emit('normal', JSON.stringify({devServer: {isOn: devServer.isOn}}))
  }, 1250)
})

admindb.find({}, (err, res) =>{
  if(err) console.log(err)
  if(res){
    res.forEach((admin) =>{
      admin.isBackendUser = true
      admin.save()
    })
  }
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
  if(!fs.existsSync('./builder')){
    fs.mkdir('./builder', (err)=>{
      if(err) console.log(err)
    })
  }
  console.log("Listenning on port:", the.port)
})

module.exports = xcms