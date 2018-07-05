const koa = require('koa')
const WS = require('ws')
const fs = require('fs')
const mongoClient = require('mongodb').MongoClient
const xcmsWs = new WS.Server({port: 9898});
const xcms = new koa();
const jsp = JSON.parse;
const jss = JSON.stringify;

xcms.use(async (ctx, next) =>{
    ctx.type= "html"
    ctx.body = ctx.url;
    switch (ctx.url){
        case '/' :
            ctx.redirect('/admin')
        break;
        case '/client' :
            ctx.body = fs.createReadStream('./client-site/index.html',{autoClose: true})
        break;
        case '/admin' :
            ctx.body = fs.createReadStream('./admin-site/index.html',{autoClose: true})
        break;
        case /\/client-site/.test(ctx.url):
        ctx.body = fs.createReadStream('./'+ctx.url, {autoClose: true})
        break;
    }
    if(/\.(html|css|js|jpeg)/.test(ctx.url)){
        console.log(ctx.origin)
        console.log(ctx.href)
        console.log(ctx.originalUrl)
        ctx.type = /(html|css|js|jpeg)/.exec(ctx.url)[0]
        ctx.body = fs.createReadStream('./'+ctx.url, {autoClose: true})
    }
    await next();
})

xcms.listen(9899,()=>{
    var db, clientDB, adminDB
    console.log("XCMS Listening port 9899")
    //WEBSOCKET START ************************* START WEBSOCKET\\
    function noop() {}
    function heartbeat(){
        this.isAlive = true;
    }
    xcmsWs.on('connection', (peer)=>{
        console.log(peer)
        peer.isAlive = true;
        peer.on('pong', heartbeat)
        fs.readdir('./client-site', (err, fil)=>{
            fil.forEach(fi =>{
                if(/\.html/.test(fi)){
                    peer.send(jss({lien:fi}))
                }
            })
        })
        var waitEnd = []
        fs.watch('./client-site', {encoding: "utf-8"}, (change, filename)=>{
            if(waitEnd.length === 2){
                peer.send(jss({lien:filename}))
                waitEnd = []
            }else{
                waitEnd.push(filename)
            }
        })
        peer.on('close', ()=>{
           console.log('connexion fermé')
           peer.terminate()
        })
        peer.on('error', function(e){
            console.log("erreur")
            if(e === "ERCONNRESET"){
                throw e
            }
        })
        var image
        peer.on('message', (data)=>{
            if(typeof data === 'string'){
                var datainfo = jsp(data)
                if(datainfo.name){
                    image = datainfo
                }
                if(datainfo.titre){
                    var newFile = fs.createWriteStream('./client-site/'+datainfo.titre+".html", {encoding: 'utf8'})
                    newFile.write(datainfo.contenu)
                    newFile.end()
                }
            }
            if(typeof data === 'object'){
                var newImg = fs.createWriteStream('./client-site/imgs/'+image.name, {encoding:"binary"})
                newImg.write(data)
                newImg.end()
            }
        })
    })
})