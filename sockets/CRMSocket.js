const IO = require('koa-socket-2')
const fs = require('fs')
const {userdb, admindb} = require('../cmsModels.js')

const crmSocket = new IO({
    namespace: 'crm-socket'
})

crmSocket.on('message', (ctx)=>{
  var datainfo = JSON.parse(ctx.data)
  if (datainfo.userslist) {
    userContacts = []
    userdb.find({}, (err, data)=>{
        if(err) console.log(err)
        if(data.length > 0){
            data.forEach(user=>{
                userContacts.push({fullName: user.firstname+' '+user.lastname, email: user.email})
            })
            ctx.socket.emit('normal', JSON.stringify({
            userslist: userContacts
            }))
        }else{
            console.log('no contacts')
            return
        }
    })
  }
  if (datainfo.selectedContacts) {
    let transporterInfo = fs.createReadStream('../xcmsDB/transporter', {
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
    let transporter = fs.createWriteStream('../xcmsDB/transporter', {
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
  if(datainfo.addAdmin){
    const newAdmin = datainfo.addAdmin
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
})

module.exports = crmSocket