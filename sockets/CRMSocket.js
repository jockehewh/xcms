const IO = require('koa-socket-2')
const fs = require('fs')
const { spawn } = require('child_process')
const archiver = require("archiver")
const extract = require("extract-zip")
const { userdb, admindb } = require('../cmsModels.js')
const nodemailer = require('nodemailer')
let mongoURI = ''
try {
    const env = fs.readFileSync('./../config.xcms.json')
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
crmSocket.on('message', async (ctx) => {
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
    if (datainfo.selectedContacts) {
        let transporterInfo = fs.createReadStream(__dirname + '/../xcmsDB/transporter', {
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
            })
        })
    }
    if (datainfo.host) {
        let transporter = fs.createWriteStream(__dirname + '/../xcmsDB/transporter', {
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
    }
    if (datainfo.addAdmin) {
        const newAdmin = datainfo.addAdmin
        admindb.find({ xcmsAdmin: newAdmin.username }, (err, res) => {
            if (err) console.log(err)
            if (res.length === 0) {
                const addAnAdmin = new admindb({
                    xcmsAdmin: newAdmin.username,
                    password: newAdmin.password
                })
                addAnAdmin.save()
                ctx.socket.emit('success', 'the admin was successfully created')
            } else {
                ctx.socket.emit('errorr', `the admin ${newAdmin.username} already exist`)
            }
        })
    }
    if (datainfo.updateAdmin) {
        const toUpdate = datainfo.updateAdmin
        admindb.findOne({ xcmsAdmin: toUpdate.username }, (err, res) => {
            if (err) console.log("err", err)
            if (res) {
                console.log(res)
                res.password = toUpdate.password
                res.save()
                ctx.socket.emit('success', 'the admin was successfully updated')
            } else {
                ctx.socket.emit('errorr', 'the admin does not exist')
            }
        })
    }
    if (datainfo.exportPages) {
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
            } else {
                console.log(err)
            }
        })
    }
})

crmSocket.on("importing", async (ctx) =>{
    let importedFile = fs.createWriteStream(__dirname + '/../xcmsExport.zip', {autoClose: true})
    importedFile.write(ctx.data)
    importedFile.end()
    importedFile.on('close', async function(){
        await extract(__dirname + '/../xcmsExport.zip', {dir: __dirname + "/../xcmsExport"})
        const mongorestoreCommand = [`--uri=${mongoURI}/xcms`, "--gzip", `--nsInclude="xcms.*"`, `${__dirname}/../xcmsExport`]
        const importAction = spawn("mongorestore", mongorestoreCommand)
        importAction.on("close", (ec)=>{
            ctx.socket.emit('import-complete', "")
        })
    })
})

module.exports = crmSocket