const koa = require('koa')
const WS = require('ws')
const fs = require('fs')
const xcmsDB = require('./xdata.js');
const bodyParser = require('koa-body')
const user = require('./usercred')
const xcmsWs = new WS.Server({port: 9898});
const xcms = new koa();
const jsp = JSON.parse;
const jss = JSON.stringify;
var pagesCollection, paged;
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
/* [{"db":"placeholder","size":"1"}] */
dbpages.on('end', ()=>{
    console.log(typeof pagesCollection)
pagesCollection = JSON.parse(pagesCollection)
console.log(typeof pagesCollection)
})
xcms.use(bodyParser())
xcms.use(async (ctx, next) =>{
    var urlctl = fileCTL.exec(ctx.url)
    let page
    if(/^.[a-z]{2,}(.html)/.exec(ctx.url) !== null){
        page = /^.[a-z]{2,}(.html)/.exec(ctx.url)[0]
    }
    if(page != undefined){
        console.log('page', page)
    }
    if(ctx.method === "GET"){
        switch (ctx.url){
            case '/' :
            try{
                pagesCollection.forEach((page, i)=>{
                    console.log(page.name, i)
                    if(page.name == 'index.html'){
                        ctx.type = "html"
                        ctx.body = page.page
                        return
                    }
                    if(i === pagesCollection.length){
                        console.log('FIN')
                        throw 'no index';
                    }
                })
            }catch(e){
                console.log(e)
                ctx.redirect('/admin')
            }
            break;
            //CASE LOGIN?
            case '/admin' :
                ctx.type= "html"
                ctx.body = fs.createReadStream('./admin-site/login.html',{autoClose: true})
            break;
            default:
            break;
        }
    }
    if(ctx.method === "POST"){
        switch (ctx.url){
            case '/admin' :
                const auth = ctx.request.body
                if(auth.username === user.username){
                    if(auth.password === user.password){
                        ctx.type = "html"
                        ctx.body = fs.createReadStream('./admin-site/index.html',{autoClose: true})
                    }
                }else{
                    redirect('/admin')
                }
            break;
            default:
            break;
        }
    }
    
    if(extensionCTL.test(ctx.url)){
        if(/^\/imgs\/([\D a-z 0-9]{2,})/.test(ctx.url)){
            let imageName = ctx.url.split('/')
            ctx.type = 'image/*'
            ctx.body = fs.createReadStream('./client-site/imgs/'+imageName[2], {autoclose: true})
            return
        }
        var urlctl = fileCTL.exec(ctx.url)
        ctx.type = typeCTL.exec(ctx.url)[0]
        if(page != undefined){
            pagesCollection.forEach(existingPage=>{
                if('/'+existingPage.name == page){
                    ctx.type = "html"
                    ctx.body = existingPage.page
                }
            })
        }else{
            ctx.body = fs.createReadStream('./'+ctx.url, {autoclose: true})
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
        console.log(pagesCollection.length)
        console.log(typeof pagesCollection)
        if(pagesCollection.length !== 0){
            pagesCollection.forEach(fi =>{
                if(/\.html/.test(fi.name)){
                    peer.send(jss({lien:fi}))
                }
            })
        }
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
                        xcmsDB.set(nouvellePage)
                    }else{
                        console.log('erreur la page exist pour de vrai')
                        count = 0
                        return
                    }
                    pagesCollection.push(nouvellePage)
                }
                if(datainfo.update){
                    pagesCollection.forEach(page =>{
                        if(page.name === datainfo.update.name){
                            page.page = datainfo.update.page
                            xcmsDB.update(pagesCollection)
                        }
                    })
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