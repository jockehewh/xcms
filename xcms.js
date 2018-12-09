const koa = require('koa')
const WS = require('ws')
const fs = require('fs')
const xcmsDB = require('./xdata.js');
const xcmsWs = new WS.Server({port: 9898});
const xcms = new koa();
const jsp = JSON.parse;
const jss = JSON.stringify;
var pagesCollection;
var dbpages = xcmsDB.get()
const fileCTL = /([a-z]{2,}).(html|css|js|jpeg|PNG|jpg|png)/
const extensionCTL = /\.(html|css|js|jpeg|jpg|PNG|png)/
const typeCTL = /(html|css|js|jpeg|jpg|PNG|png)/
dbpages.on('data', (data)=>{
    if(pagesCollection === undefined){
        pagesCollection = data
    }else{
        pagesCollection += data
    }
})
dbpages.on('end', ()=>{
pagesCollection = JSON.parse(pagesCollection)
})
xcms.use(async (ctx, next) =>{
    var urlctl = fileCTL.exec(ctx.url)
    //ctx.type= "html"
    //ctx.body = ctx.url;
    console.log(ctx.url)
    switch (ctx.url){
        case '/' :
            ctx.redirect('/admin')
        break;
        case '/client' :
            ctx.type= "html"
            //gérer pageCollection 
            ctx.body = fs.createReadStream('./client-site/index.html',{autoClose: true})
        break;
        case '/admin' :
            ctx.type= "html"
            ctx.body = fs.createReadStream('./admin-site/index.html',{autoClose: true})
        break;
        default:
        break;
    }
    if(extensionCTL.test(ctx.url)){
        if(/^\/imgs/.test(ctx.url)){
            return
        }
        var urlctl = fileCTL.exec(ctx.url)
        ctx.type = typeCTL.exec(ctx.url)[0]
        if(/\/client-site\/imgs/.test(ctx.url)){
            ctx.type = 'image/*'
            ctx.body = fs.createReadStream('./'+ctx.url, {autoClose: true})
        }
        if(/\/client-site/.test(ctx.url) && urlctl[2] === 'html'){
            ctx.type = 'html'
            pagesCollection.forEach(page=>{
                if(Object.values(page)[0] === urlctl[0]){
                    ctx.body = Object.values(page)[1]
                }
            })
        }else{
            ctx.body = fs.createReadStream('./'+ctx.url, {autoClose: true})
        }
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
                    nouvellePage = {name: datainfo.titre+".html", page: datainfo.contenu}
                    count = 0
                    pagesCollection.forEach(page=>{
                        if(Object.values(page)[0] === nouvellePage.name){
                            console.log('erreur la page exist')
                            count++
                            return
                        }
                    })
                    if(count === 0){
                        console.log('creating page:', nouvellePage)
                        xcmsDB.set(nouvellePage)
                    }else{
                        console.log('erreur la page exist pour de vrai')
                        count = 0
                        return
                    }
                    pagesCollection.push(nouvellePage)
                    //xcmsDB.set(nouvellePage)
                    /* var newFile = fs.createWriteStream('./client-site/'+datainfo.titre+".html", {encoding: 'utf8'})
                    newFile.write(datainfo.contenu)
                    newFile.end() */
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