const IO = require('koa-socket-2')
const fs = require('fs')
const { spawn, exec } = require('child_process')
const archiver = require("archiver")
const extract = require("extract-zip")
const process = require('process')
const { userdb, admindb } = require('../cmsModels.js')
const nodemailer = require('nodemailer')
const theEventListener = require(__dirname + '/../xcmsDB/innerEvents')
let isSuperAdmin = false
theEventListener.on('isSuperAdmin', (b)=>{
    if(b){
        isSuperAdmin = true
    }
})

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
crmSocket.on('message', async (ctx) => {
    function restart(){
        ctx.socket.emit('restarting', "")
        exec('pm2', (err,res)=>{
            if(err) {
                process.on('exit', ()=>{
                    spawn(process.argv.shift(), process.argv, {
                        cwd: process.cwd(),
                        detached: true,
                        stdio: "inherit"
                    })
                })
                console.log('restarting with new PID')
                process.exit()
            }
            if(res) {
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
        let customAPIJson = fs.readFileSync(__dirname + '/../xcmsDB/customAPI.json', {autoClose: true})
        let customAPI = JSON.parse(customAPIJson)
        ctx.socket.emit('normal', JSON.stringify({customRoutes: {routes: customAPI}}))
    }
    if (datainfo.modelslist) {
        let customModelsJson = fs.readFileSync(__dirname + '/../xcmsDB/customModels.json', {autoClose: true})
        let customModels = JSON.parse(customModelsJson)
        ctx.socket.emit('normal', JSON.stringify({customModels: {models: customModels}}))
    }
    if (datainfo.selectedContacts) {
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
    if (datainfo.host) {
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
    if (datainfo.addAdmin) {
        const newAdmin = datainfo.addAdmin
        if(isSuperAdmin === true){
            admindb.find({ xcmsAdmin: newAdmin.username }, (err, res) => {
                if (err) console.log(err)
                if (res.length === 0) {
                    const addAnAdmin = new admindb({
                        xcmsAdmin: newAdmin.username,
                        password: newAdmin.password,
                        superAdmin: newAdmin.isSuperAdmin == 1 ? true : false
                    })
                    addAnAdmin.save()
                    ctx.socket.emit('success', 'The admin was successfully added')
                } else {
                    ctx.socket.emit('errorr', `The admin ${newAdmin.username} already exist`)
                }
            })
        }else{
            ctx.socket.emit('errorr', `You must be a super admin to create an admin account`)
        }
    }
    if (datainfo.updateAdmin) {
        const toUpdate = datainfo.updateAdmin
        if(isSuperAdmin === true){
            admindb.findOne({ xcmsAdmin: toUpdate.username }, (err, res) => {
                if (err) {
                    console.log("err", err)
                    ctx.socket.emit('errorr', `The admin "${datainfo.updateAdmin.username}" does not exist.`)
                } 
                if (res) {
                    res.password = toUpdate.password
                    res.superAdmin = toUpdate.isSuperAdmin == 1 ? true : false
                    res.save()
                    ctx.socket.emit('success', `The admin "${datainfo.updateAdmin.username}" was successfully updated.`)
                }else{
                    ctx.socket.emit('errorr', `The admin "${datainfo.updateAdmin.username}" does not exist.`)
                }
            })
        }else{
            ctx.socket.emit('errorr', `You must be a super admin to update another admin account.`)
        }
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
                ctx.socket.emit('success', "Your database has been successfully exported.")
            } else {
                console.log(err)
                ctx.socket.emit('errorr', "Your database export generated an error.", err)
            }
        })
    }
    if (datainfo.exportMedias) {
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
    if(datainfo.exportMailConfig){
        let mailConf = fs.createReadStream('./mail.config.json', {autoClose:true})
        let mailJSON = ""
        mailConf.on('data', data=>{
            mailJSON+= data
        })
        mailConf.on('end', ()=>{
            ctx.socket.emit('exporting-mail-config', mailJSON)
            ctx.socket.emit('success', "Your mail configuration was successfully exported.")
        })
    }
    if(datainfo.newModel){
        let newModel = datainfo.newModel
        let customModelsJson = fs.readFileSync(__dirname + '/../xcmsDB/customModels.json', {autoClose: true})
        let latestModels = JSON.parse(customModelsJson)
        latestModels.push(newModel)
        latestModels = JSON.stringify(latestModels)
        let updatedModels = fs.createWriteStream(__dirname + '/../xcmsDB/customModels.json')
        updatedModels.write(latestModels)
        updatedModels.end()
        theEventListener.emit('RegisterNewModel', newModel)
        ctx.socket.emit('success', `Successfully created the new model: ${newModel.dbName+'db'}`)
    }
    if(datainfo.newRoute){
        let newRoute = datainfo.newRoute
        let customAPIJson = fs.readFileSync(__dirname + '/../xcmsDB/customAPI.json', {autoClose: true})
        let latestRoutes = JSON.parse(customAPIJson)
        latestRoutes.push(newRoute)
        latestRoutes = JSON.stringify(latestRoutes)
        let updatedRoutes = fs.createWriteStream(__dirname + '/../xcmsDB/customAPI.json')
        updatedRoutes.write(latestRoutes)
        updatedRoutes.end()
        theEventListener.emit('MakeNewCustomRoute', newRoute)
        ctx.socket.emit('success', `Successfully created the new route: ${newRoute.route+'db'}`)
    }
    if(datainfo.updateRoute){
        let updateRoute = datainfo.updateRoute
        let customAPIJson = fs.readFileSync(__dirname + '/../xcmsDB/customAPI.json', {autoClose: true})
        let latestRoutes = JSON.parse(customAPIJson)
        let latestRoutesUpdated = latestRoutes.map(route=>{
            if(route.name === updateRoute.oldName){
                return route = updateRoute.route
            }else{
                return route
            }
        })
        latestRoutesUpdated = JSON.stringify(latestRoutesUpdated)
        let updatedRoutes = fs.createWriteStream(__dirname + '/../xcmsDB/customAPI.json', {autoClose: true})
        updatedRoutes.write(latestRoutesUpdated)
        updatedRoutes.end()
        ctx.socket.emit('success', `Successfully updated the route: ${updateRoute.route.name} ...Restarting.`)
        restart()
    }
    if(datainfo.updateModel){
        let updateModel = datainfo.updateModel
        let customModelsJson = fs.readFileSync(__dirname + '/../xcmsDB/customModels.json', {autoClose: true})
        let latestModels = JSON.parse(customModelsJson)
        let latestModelsUpdated = latestModels.map(model=>{
            if(model.dbName === updateModel.oldName){
                return updateModel.model
            }else{
                return model
            }
        })
        latestModelsUpdated = JSON.stringify(latestModelsUpdated)
        let updatedModels = fs.createWriteStream(__dirname + '/../xcmsDB/customModels.json')
        updatedModels.write(latestModelsUpdated)
        updatedModels.end()
        ctx.socket.emit('success', `Successfully updated the model: ${updateModel.model.dbName+'db'} ...Restarting.`)
        restart()
    }
})

crmSocket.on("importing", async (ctx) =>{
    let importedFile = fs.createWriteStream(__dirname + '/../xcmsExport.zip', {autoClose: true})
    importedFile.write(ctx.data)
    importedFile.end()
    ctx.socket.emit('success', "Unziping your content...")
    importedFile.on('close', async function(){
        await extract(__dirname + '/../xcmsExport.zip', {dir: __dirname + "/../xcmsExport"})
        const mongorestoreCommand = [`--uri=${mongoURI}/xcms`, "--gzip", `--nsInclude="xcms.*"`, `${__dirname}/../xcmsExport`]
        const importAction = spawn("mongorestore", mongorestoreCommand)
        importAction.on("close", (ec)=>{
            ctx.socket.emit('import-complete', "")
        })
    })
})
crmSocket.on("importing-medias", async (ctx) =>{
    let importedFile = fs.createWriteStream(__dirname + '/../xcmsMediaExport.zip', {autoClose: true})
    importedFile.write(ctx.data)
    importedFile.end()
    ctx.socket.emit('success', "Unziping your media files...")
    importedFile.on('close', async function(){
        await extract(__dirname + '/../xcmsMediaExport.zip', {dir: "./medias/"})
        ctx.socket.emit('import-media-complete', "")
    })
})
crmSocket.on("importing-mail-config", async (ctx) =>{
    let mailConfig = fs.createWriteStream('./mail.config.json', {autoClose: true})
    mailConfig.write(ctx.data)
    mailConfig.end()
    ctx.socket.emit('success', "Mail configuration imported successfully.")
    mailConfig.on('close', async function(){
        ctx.socket.emit('import-mail-complete', "")
    })
})

module.exports = crmSocket