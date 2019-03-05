const IO = require('koa-socket-2')
const instantMessageing = new IO({
    namespace: 'instant-messaging'
})

instantMessageing.on('connection', ctx=>{
  console.log(ctx.socket.handshake.query['name'])
})

/* 
public message = {
  sender: "",
  message: "",
  timestamp: ""
}
 */
instantMessageing.on('public-message', ctx=>{
  instantMessageing.broadcast('pubmsg', ctx.data)
})
/* 
private message = {
  sender: "",
  receipient: "",
  message: "",
  timestamp: ""
}
 */
instantMessageing.on('private-message', ctx=>{
})
/* 
set profile = {
  firstname: "",
  lastname: "",
  photo: "?"
}
 */
instantMessageing.on('set-profile', ctx=>{
})


module.exports = instantMessageing