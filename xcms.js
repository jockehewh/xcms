const koa = require('koa')
const fs = require('fs')
const xcmsDB = require('./xdata.js');
const bodyParser = require('koa-body')
const nodemailer = require('nodemailer')
const IO = require('koa-socket-2')
const adminSocket = new IO({
    namespace: 'asocket'
})
const xcms = new koa();
const jsp = JSON.parse;
const jss = JSON.stringify;
var pagesCollection, paged;
var dbpages = xcmsDB.get()
const fileCTL = /([a-z]{2,}).(html|css|js|jpeg|PNG|jpg|png|mp4)/
const extensionCTL = /\.(html|css|js|jpeg|jpg|PNG|png|woff2|ttf|mp4)/
const typeCTL = /(html|css|js|jpeg|jpg|PNG|png|woff2|ttf|mp4)/
dbpages.on('data', (data) => {
    if (pagesCollection === undefined) {
        pagesCollection = data
    } else {
        pagesCollection += data
    }
})
/* [{"db":"placeholder","size":"1"}] */
dbpages.on('end', () => {
    pagesCollection = JSON.parse(pagesCollection)
})
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
xcms.use(bodyParser())
xcms.use(async (ctx, next) => {
    var urlctl = fileCTL.exec(ctx.url)
    let page
    if (/^.[a-zA-Z0-9_-]{2,}(.html)/.exec(ctx.url) !== null) {
        page = /^.[a-zA-Z0-9_-]{2,}(.html)/.exec(ctx.url)[0]
    }
    if (page != undefined) {
        console.log('page', page)
    }
    if (ctx.method === "GET") {
        switch (ctx.url) {
            case '/':
                console.log(pagesCollection[1].name)
                if (pagesCollection[1].name === 'index.html') {
                    ctx.type = "html"
                    ctx.body = pagesCollection[1].page
                } else {
                    ctx.redirect('/admin')
                }
                break;
            case '/admin':
                ctx.type = "html"
                ctx.body = fs.createReadStream('./admin-site/login.html', {
                    autoClose: true
                })
                break;
            case '/admin/crm':
                ctx.type = "html"
                ctx.body = fs.createReadStream('./admin-site/crm-login.html', {
                    autoClose: true
                })
                break;
            default:
                break;
        }
    }
    if (ctx.method === "POST") {
        switch (ctx.url) {
            case '/admin':
                const auth = ctx.request.body
                for (let i = 0; i < admins.length; i++) {
                    if (auth.username == admins[i]["username"]) {
                        if (auth.password == admins[i]["password"]) {
                            ctx.type = "html"
                            ctx.body = fs.createReadStream('./admin-site/index.html', {
                                autoClose: true
                            })
                            break;
                        } else {
                            ctx.redirect('/admin')
                            break;
                        }
                    } else {
                        if (i + 1 === admins.length) {
                            ctx.redirect('/admin')
                            break;
                        }
                    }
                }
                break;
            case '/admin/crm':
                const crmauth = ctx.request.body
                for (let i = 0; i < admins.length; i++) {
                    if (crmauth.username == admins[i]["username"]) {
                        if (crmauth.password == admins[i]["password"]) {
                            ctx.type = "html"
                            ctx.body = fs.createReadStream('./admin-site/crm.html', {
                                autoClose: true
                            })
                            break;
                        } else {
                            ctx.redirect('/admin/crm')
                            break;
                        }
                    } else {
                        if (i + 1 === admins.length) {
                            ctx.redirect('/admin/crm')
                            break;
                        }
                    }
                }
                break;
            case '/contact':
                const contact = ctx.request.body
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

                let crmFile = fs.createReadStream('./xcmsDB/Xcrmdata.db', {
                    autoClose: true
                })
                let crmdata = ""
                crmFile.on('data', (data) => {
                    crmdata += data
                })
                crmFile.on('end', () => {
                    crmdata = jsp(crmdata)
                    let newContact = {
                        fullName: contact.firstname + " " + contact.lastname,
                        email: contact.email
                    }
                    crmdata.push(newContact)
                    let updatecrm = fs.createWriteStream('./xcmsDB/Xcrmdata.db', {
                        encoding: 'utf8'
                    })
                    updatecrm.write(jss(crmdata))
                    updatecrm.end()
                })
                ctx.redirect('/')
                break;
            default:
                break;
        }
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
            ctx.body = fs.createReadStream('./' + ctx.url, {
                autoclose: true
            })
        }
    }
    await next();
})

/* SOCKET IO */
adminSocket.on('connection', ctx => {
    if (pagesCollection.length !== 0) {
        pagesCollection.forEach(fi => {
            if (/\.html/.test(fi.name)) {
                ctx.socket.emit('normal', jss({
                    lien: fi
                }))
            }
        })
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
        if (datainfo.titre) {
            nouvellePage = {
                name: datainfo.titre + ".html",
                page: datainfo.contenu
            }
            count = 0
            pagesCollection.forEach(page => {
                if (Object.values(page)[0] === nouvellePage.name) {
                    console.log('erreur la page exist')
                    count++
                    return
                }
            })
            if (count === 0) {
                xcmsDB.set(nouvellePage)
            } else {
                console.log('erreur la page existe pour de vrai')
                count = 0
                return
            }
            pagesCollection.push(nouvellePage)
        }
        if (datainfo.update) {
            pagesCollection.forEach(page => {
                if (page.name === datainfo.update.name) {
                    page.page = datainfo.update.page
                    xcmsDB.update(pagesCollection)
                }
            })
        }
        //PAGE CRM
        if (datainfo.userslist) {
            let crmFile = fs.createReadStream('./xcmsDB/Xcrmdata.db')
            let crmdata = ""
            crmFile.on('data', data => {
                crmdata += data
            })
            crmFile.on('end', () => {
                crmdata = jsp(crmdata)
                crmUsers = crmdata.map(user => {
                    if (user.fullName) {
                        return user
                    }
                }).filter(user => {
                    if (user !== null) {
                        return user
                    }
                })
                ctx.socket.emit('normal', jss({
                    userslist: crmUsers
                }))
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
adminSocket.attach(xcms)

xcms.listen(9899, () => {
    console.log("XCMS Listening port 9899")
})