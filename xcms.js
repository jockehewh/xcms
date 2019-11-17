const koa = require('koa')
const fs = require('fs')
const bodyParser = require('koa-body')
const nodemailer = require('nodemailer')
const IO = require('koa-socket-2')
const passport = require('koa-passport')
const r = require('koa-route')
const session = require('koa-session')
const adminSocket = new IO({
    namespace: 'asocket'
})
const xcms = new koa();
const jsp = JSON.parse;
const jss = JSON.stringify;
const mongoose = require('mongoose')
mongoose.connect('mongodb://localhost:27017/xcms', { useNewUrlParser: true, useFindAndModify: false })

var pagesCollection, page, pages, isIndex, user, users;
const {pagedb, userdb, admindb} = require('./cmsModels.js')

xcms.proxy = true
xcms.keys = ['xavier-cms-key']
xcms.use(session({}, xcms))
xcms.use(bodyParser())
xcms.use(passport.initialize())
xcms.use(passport.session())
require('./adminAuth.js')

pagedb.find({}, (err, data)=>{
    if(err) {console.log('fetch page error', err)}
    pagesCollection = data
    pagesCollection.forEach(page=>{
        if(page.name === "index.html"){
            isIndex = page
        }
    })
})


/* 
pagedb.deleteOne({name: 'selectedPage.html})
 */
const fileCTL = /([a-z]{2,}).(html|css|js|jpeg|PNG|jpg|png|mp4)/
const extensionCTL = /\.(html|css|js|jpeg|jpg|PNG|png|woff2|ttf|mp4)/
const typeCTL = /(html|css|js|jpeg|jpg|PNG|png|woff2|ttf|mp4)/
/* [{"db":"placeholder","size":"1"}] */

let authStream = fs.createReadStream('./xcmsDB/adminlist', {
    autoClose: true
})
let admins = ""
authStream.on('data', data => {
    admins += data
})
authStream.on('end', () => {
    admins = jsp(admins)
})

xcms.use(r.get('/', ctx =>{
    if(isIndex != undefined){
        ctx.type = 'html'
        ctx.body = isIndex.page
    } else {
        ctx.redirect('/connect')
    }
}))

xcms.use(r.get('/connect', ctx =>{
    ctx.type = "html"
    ctx.body = fs.createReadStream('./admin-site/login.html', {
        autoClose: true
    })
}))

xcms.use(r.post('/contact', ctx=>{
    const contact = ctx.request.body
    userdb.find({email: contact.email},(err, data)=>{
        if(data.length > 0){
            ctx.socket.emit('errorr', 'You already sent an email, please wait, we will contact you very soon')
        } else {
            let newContact = new userdb({
                firstname: contact.firstname,
                lastname: contact.lastname,
                email: contact.email,
                firstMessage: contact.message,
                messagesHistory: [contact.message]
            })
            newContact.save((err, user)=>{})
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

xcms.use(r.get('/chat', ctx =>{
    ctx.type = 'html'
    ctx.body = fs.createReadStream('./extra_modules/instant-messaging.html', {
        autoClose: true
    })
}))

xcms.use(r.get('/favicon.ico', ctx=>{
    ctx.type = 'image/png'
    ctx.body = fs.createReadStream('./favicon.ico', {
        autoClose: true
    })
}))

xcms.use(async (ctx, next) => {
    let page
    if (/^.[a-zA-Z0-9_-]{2,}(.html)/.exec(ctx.url) !== null) {
        page = /^.[a-zA-Z0-9_-]{2,}(.html)/.exec(ctx.url)[0]
    }
    if (page != undefined) {
        console.log('someone is visiting', page)
    }

    if (extensionCTL.test(ctx.url)) {
        if (/^\/imgs\/([ a-zA-Z0-9_-]{2,})/.test(ctx.url)) {
            let imageName = ctx.url.split('/')
            ctx.type = 'image/*'
            ctx.body = fs.createReadStream('./frontend-site/imgs/' + imageName[2], {
                autoclose: true
            })
            return
        }
        if (/^\/videos\/([a-zA-Z0-9_-]{2,})/.test(ctx.url)) {
            let imageName = ctx.url.split('/')
            ctx.type = 'video/*'
            ctx.body = fs.createReadStream('./frontend-site/videos/' + imageName[2], {
                autoclose: true
            })
            return
        }
        if(/dltcursor\.png/.test(ctx.url)){
            ctx.type = 'image/png'
            ctx.body = fs.createReadStream('./admin-site/dltcursor.png', {autoclose: true})
        }
        var urlctl = fileCTL.exec(ctx.url)
        if (typeCTL.exec(ctx.url)[0] === 'woff') {
            ctx.type = "font/woff2"
        } else if (typeCTL.exec(ctx.url)[0] === 'ttf') {
            ctx.type = "application/font-sfnt"
        } else {
            ctx.type = typeCTL.exec(ctx.url)[0]
        }

        if (page != undefined) {
            pagesCollection.forEach(existingPage => {
                if ('/' + existingPage.name == page) {
                    ctx.type = "html"
                    ctx.body = existingPage.page
                }
            })
        } else {
            if(/instant-messaging-scripts/.test(ctx.url)){
                ctx.body = fs.createReadStream('./extra_modules'+ ctx.url, {autoClose: true})
            }else{
                if(/onthefly/.test(ctx.url)){
                    if(typeCTL.exec(ctx.url)[0] === 'css'){
                        cssFileName = /\/([a-zA-Z0-9]{2,})\.css/.exec(ctx.url)[1]
                        pagesCollection.forEach(page=>{
                            if(page.name === cssFileName+'.html'){
                                ctx.type = 'text/css'
                                ctx.body = page.css
                            }
                        })
                    }
                    if(typeCTL.exec(ctx.url)[0] === 'js'){
                        jsFileName = /\/([a-zA-Z0-9]{2,})\.js/.exec(ctx.url)[1]
                        pagesCollection.forEach(page=>{
                            if(page.name === jsFileName+'.html'){
                                ctx.type = 'application/javascript'
                                ctx.body = page.js
                            }
                        })
                    }
                }else{
                    ctx.body = fs.createReadStream('./' + ctx.url, {
                        autoclose: true
                    })
                }
            }
        }
    }
    await next();
})

xcms.use(r.post('/admin', 
    passport.authenticate('local', {
        successRedirect: '/admin',
        failureRedirect: '/'
    })
))

xcms.use((ctx, next)=>{
    if(ctx.isAuthenticated()){
        return next()
    }else{
        ctx.redirect('/')
    }
})

xcms.use(r.get('/admin', (ctx)=>{
    ctx.type = "html"
    ctx.body = fs.createReadStream('./admin-site/index.html', {
        autoClose: true
    })
}))

xcms.use(r.get('/admin/crm', (ctx)=>{
    ctx.type = "html"
    ctx.body = fs.createReadStream('./admin-site/crm.html', {
        autoClose: true
    })
}))

adminSocket.attach(xcms)
/* SOCKET IO */
adminSocket.on('connection', (ctx) => {
    if(pagesCollection != undefined){
        if (pagesCollection.length !== 0) {
            pagesCollection.forEach(file => {
                if (/\.html/.test(file.name)) {
                    ctx.emit('normal', jss({
                        lien: file
                    }))
                }
            })
        }
    }
    
    let transporterInfo = fs.createReadStream('./xcmsDB/transporter', {
        autoClose: true
    })
    let transporter = "";
    transporterInfo.on('data', (data) => {
        transporter += data
    })
    transporterInfo.on('end', () => {
        transporter = jsp(transporter)
        if (transporter.host !== '') ctx.socket.emit('normal', jss({
            formfield: true
        }))
    })
})
adminSocket.on('message', (ctx) => {
    if (typeof ctx.data === 'string') {
        var datainfo = jsp(ctx.data)
        if (datainfo.name) {
            pagedb.find({name: datainfo.name+'.html'}, (err, data)=>{
                if(data.length > 0){
                    ctx.socket.emit('errorr', 'a page with the same name already exist')
                }else{
                    let newPage = new pagedb({
                        name: datainfo.name+".html",
                        page: datainfo.page,
                        js: datainfo.js,
                        css: datainfo.css
                    })
                    newPage.save((err,data)=>{
                        if(err){ 
                            console.log('error saving a new page', err)
                            ctx.socket.emit('errorr', 'A problem happened: '+err)
                            return
                        } else {
                            pagesCollection.push(data)
                            if(data.name === "index.html"){
                                isIndex = data
                            }
                        }
                    })
                }
            })
        }
        if (datainfo.update) {
            pagedb.findOneAndUpdate({name: datainfo.update.name},
            {page: datainfo.update.page, js: datainfo.update.js, css: datainfo.update.css},
            {new: true},
                (err, data)=>{
                    if(err) {
                        console.log('error updating the page', err)
                        ctx.socket.emit('errorr', 'error updating the page, please retry.')
                    }
                    ctx.socket.emit('success', `the page ${datainfo.update.name} was sucesfully updated`)
                })
            pagesCollection.forEach(page => {
                if (page.name === datainfo.update.name) {
                    page.page = datainfo.update.page
                    page.js = datainfo.update.js
                    page.css = datainfo.update.css
                }
            })
        }
        if(datainfo.deletePage){
            pagedb.deleteOne({name: datainfo.deletePage}, (err, success)=>{
                if(err) console.log(err)//envoyer l'erreur
                if(success) console.log(datainfo.deletePage, 'was successfully deleted')//envoyer success
            })
            pagesCollection = pagesCollection.filter(pageData=>{if(pageData.name !== datainfo.deletePage) return pageData})
        }
        //PAGE CRM
        if (datainfo.userslist) {
            userContacts = []
            userdb.find({}, (err, data)=>{
                if(err) console.log(err)
                if(data.length > 0){
                    data.forEach(user=>{
                        userContacts.push({fullName: user.firstname+' '+user.lastname, email: user.email})
                    })
                    ctx.socket.emit('normal', jss({
                    userslist: userContacts
                    }))
                }else{
                    console.log('no contacts')
                    return
                }
            })
        }
        if (datainfo.selectedContacts) {
            let transporterInfo = fs.createReadStream('./xcmsDB/transporter', {
                autoClose: true
            })
            let transporter = "";
            transporterInfo.on('data', (data) => {
                transporter += data
            })
            transporterInfo.on('end', () => {
                transporter = jsp(transporter)
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
                })
            })
        }
        if (datainfo.host) {
            let transporter = fs.createWriteStream('./xcmsDB/transporter', {
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
            transporter.write(jss(transporterData))
            transporter.end()
        }
        if(datainfo.addAdmin){
            newAdmin = datainfo.addAdmin
            admindb.find({xcmsAdmin: newAdmin.username}, (err, res)=>{
                if(err)console.log(err)
                if(res.length === 0){
                    const addAnAdmin = new admindb({
                        xcmsAdmin: newAdmin.username,
                        password: newAdmin.password
                    })
                    addAnAdmin.save()
                    ctx.socket.emit('success', 'the admin was successfully created')
                }else{
                    ctx.socket.emit('errorr', `the admin ${newAdmin.username} already exist`)
                }
            })
        }
        if(datainfo.updateAdmin){
            const toUpdate = datainfo.updateAdmin
            admindb.findOne({xcmsAdmin: toUpdate.username}, (err,res)=>{
                if(err) console.log("err",err)
                if(res){
                    console.log(res)
                    res.password = toUpdate.password
                    res.save()
                    ctx.socket.emit('success', 'the admin was successfully updated')
                }else{
                    ctx.socket.emit('errorr', 'the admin does not exist')
                }
            })
        }
    }
})
adminSocket.on('image', ctx =>{
    var newImg = fs.createWriteStream('./frontend-site/imgs/' + ctx.data.name, {
        encoding: "binary"
    })
    newImg.write(ctx.data.image)
    newImg.end()
})
adminSocket.on('video', ctx =>{
    var newImg = fs.createWriteStream('./frontend-site/videos/' + ctx.data.name, {
        encoding: "binary"
    })
    newImg.write(ctx.data.video)
    newImg.end()
})
/* FIN SOCKET IO */
//adminSocket.attach(xcms)

/* let IM = require('./extra_modules/instant-messaging')
IM.attach(xcms) */

xcms.listen(9899, () => {
    console.log("XCMS Listening port 9899")
})

//COMMUNIQUER LES ERREURS A LA FRONTEND