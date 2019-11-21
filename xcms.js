const koa = require('koa')
const fs = require('fs')
const bodyParser = require('koa-body')
const nodemailer = require('nodemailer')
const passport = require('koa-passport')
const r = require('koa-route')
const session = require('koa-session')
const adminSocket = require('./sockets/adminSocket.js')
const xcms = new koa();
const jsp = JSON.parse;
const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/xcms', { useNewUrlParser: true, useFindAndModify: false })

var pagesCollection = require('./xcmsDB/pageCollection.js')

var isIndex = require('./xcmsDB/isIndex.js')
const { pagedb, userdb } = require('./cmsModels.js')

xcms.proxy = true
xcms.keys = ['xavier-cms-key']
xcms.use(session({}, xcms))
xcms.use(bodyParser())
xcms.use(passport.initialize())
xcms.use(passport.session())
require('./adminAuth.js')

pagedb.find({}, (err, data) => {
    if (err) { console.log('fetch page error', err) }
    pagesCollection.push(...data)
    pagesCollection.forEach(page => {
        if (page.name === "index.html") {
            isIndex.push(page)
        }
    })
})

const typeCTL = /(html|css|js|jpeg|jpg|PNG|png|woff2|ttf|mp4)/

xcms.use(r.get('/', ctx => {
    if (isIndex != undefined) {
        ctx.type = 'text/html'
        ctx.body = isIndex[0].page
    } else {
        ctx.redirect('/connect')
    }
}))

xcms.use(r.get('/connect', ctx => {
    ctx.type = "text/html"
    ctx.body = fs.createReadStream('./admin-site/login.html', {
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
            let transporterInfo = fs.createReadStream('./xcmsDB/transporter', {
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

xcms.use(r.get('/chat', ctx => {
    ctx.type = 'html'
    ctx.body = fs.createReadStream('./extra_modules/instant-messaging.html', {
        autoClose: true
    })
}))

xcms.use(r.get('/favicon.ico', ctx => {
    ctx.type = 'image/png'
    ctx.body = fs.createReadStream('./favicon.ico', {
        autoClose: true
    })
}))

xcms.use(r.get('/admin-site/dltcursor.png', ctx=>{
    ctx.type = 'image/png'
    ctx.body = fs.createReadStream('./admin-site/dltcursor.png', {
        autoClose: true
    })
}))

xcms.use(r.get(/\/[a-zA-Z0-9_-]{2,}.html/, ctx=>{
    ctx.type = 'text/html'
    pagesCollection.forEach(page => {
        if ('/' + page.name === ctx.url) {
            ctx.body = page.page
        }
    })
}))

xcms.use(r.get(/\/frontend-site\/[a-zA-Z0-9/._-]{2,}?[a-zA-Z0-9/._-]{2,}.css/, ctx=>{
    ctx.type = 'text/css'
    if(/onthefly/.test(ctx.url)){
        if (typeCTL.exec(ctx.url)[0] === 'css') {
            cssFileName = /\/([a-zA-Z0-9]{2,})\.css/.exec(ctx.url)[1]
            pagesCollection.forEach(page => {
                if (page.name === cssFileName + '.html') {
                    ctx.body = page.css
                }
            })
        }
    }else{
        ctx.body = fs.createReadStream('.'+ ctx.url)
    }
}))

xcms.use(r.get(/\/frontend-site\/[a-zA-Z0-9/._-]{2,}?[a-zA-Z0-9/._-]{2,}.js/, ctx=>{
    ctx.type = 'text/javascript'
    if(/onthefly/.test(ctx.url)){
        jsFileName = /\/([a-zA-Z0-9]{2,})\.js/.exec(ctx.url)[1]
        pagesCollection.forEach(page => {
            if (page.name === jsFileName + '.html') {
                ctx.body = page.js
            }
        })
    }else{
        ctx.body = fs.createReadStream('.'+ ctx.url)
    }
}))

xcms.use(r.get(/^\/videos\/([a-zA-Z0-9_-]{2,})/, ctx=>{
    let videoName = ctx.url.split('/')
    ctx.type = 'video/*'
    ctx.body = fs.createReadStream('./frontend-site/videos/' + videoName[2], {
        autoclose: true
    })
}))

xcms.use(r.get(/^\/imgs\/([a-zA-Z0-9_-]{2,})/, ctx=>{
    let imageName = ctx.url.split('/')
    ctx.type = 'image/*'
    ctx.body = fs.createReadStream('./frontend-site/imgs/' + imageName[2], {
        autoclose: true
    })
}))

xcms.use(r.get(/\/[a-zA-Z0-9_-]{2,}.woff/, ctx=>{
    ctx.type = 'font/woff2'
    ctx.body = fs.createReadStream('.'+ ctx.url)
}))

xcms.use(r.get(/\/[a-zA-Z0-9_-]{2,}.ttf/, ctx=>{
    ctx.type = 'application/font-sfnt'
    ctx.body = fs.createReadStream('.'+ ctx.url)
}))

xcms.use(r.post('/admin',
    passport.authenticate('local', {
        successRedirect: '/admin',
        failureRedirect: '/'
    })
))

xcms.use((ctx, next) => {
    if (ctx.isAuthenticated()) {
        return next()
    } else {
        ctx.redirect('/')
    }
})

xcms.use(r.get('/admin', (ctx) => {
    ctx.type = "html"
    ctx.body = fs.createReadStream('./admin-site/index.html', {
        autoClose: true
    })
}))

xcms.use(r.get(/\/admin-site\/[a-zA-Z0-9/._-]{2,}?[a-zA-Z0-9/._-]{2,}.css/, ctx=>{
    ctx.type = 'text/css'
    ctx.body = fs.createReadStream('.'+ ctx.url)
}))

xcms.use(r.get(/\/admin-site\/[a-zA-Z0-9/._-]{2,}?[a-zA-Z0-9/._-]{2,}.js/, ctx=>{
    ctx.type = 'text/javascript'
    ctx.body = fs.createReadStream('.'+ ctx.url)
}))

xcms.use(r.get('/admin/crm', (ctx) => {
    ctx.type = "html"
    ctx.body = fs.createReadStream('./admin-site/crm.html', {
        autoClose: true
    })
}))

xcms.use(r.get('/logout', (ctx, next)=>{
    ctx.logout();
    ctx.redirect('/')
}))


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
    let transporterInfo = fs.createReadStream('./xcmsDB/transporter', {
        autoClose: true
    })
    let transporter = "";
    transporterInfo.on('data', (data) => {
        transporter += data
    })
    transporterInfo.on('end', () => {
        transporter = JSON.parse(transporter)
        if (transporter.host !== '') ctx.socket.emit('normal', JSON.stringify({
            formfield: true
        }))
    })
})
require('./sockets/CRMSocket.js').attach(xcms)
/* FIN SOCKET IO */


/* let IM = require('./extra_modules/instant-messaging')
IM.attach(xcms) */

xcms.listen(9899, () => {
    console.log("XCMS Listening port 9899")
})

//COMMUNIQUER LES ERREURS A LA FRONTEND