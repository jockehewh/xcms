const IO = require('koa-socket-2')
const fs = require('fs')
const sharp = require('sharp')
const {pagedb, menudb, projectsdb} = require('../cmsModels.js')
/* 
AJOUTER UNE OPTION AJOUTER AU PROJET
POUR LES PAGES CUSTOMISÉES
 */
var pagesCollection = require('../xcmsCustoms/pageCollection.js')
var isIndex = require('../xcmsCustoms/isIndex.js')
let gtag = ''
let lang = ''
try {
    const env = fs.readFileSync('./config.xcms.json')
    let temp = JSON.parse(env)
    gtag = temp.gtag
    lang = temp.lang
} catch {
    const defaultConfig = fs.readFileSync(__dirname + '/../config.xcms.json')
    let temp = JSON.parse(defaultConfig)
    gtag = temp.gtag
    lang = temp.lang
}
const adminSocket = new IO({
  namespace: 'asocket'
})
adminSocket.on('message', async (ctx) => {
  if (typeof ctx.data === 'string') {
    var datainfo = JSON.parse(ctx.data)
    if (datainfo.name) {
      pagedb.find({ name: datainfo.name + '.html' }, (err, data) => {
        if (data.length > 0) {
          ctx.socket.emit('errorr', 'This page already exist.')
        } else {
          let newPage = new pagedb({
            isBundle: false,
            name: datainfo.name + ".html",
            page: datainfo.page,
            js: datainfo.js,
            css: datainfo.css
          })
          newPage.save((err, data) => {
            if (err) {
              console.log('error saving a new page', err)
              ctx.socket.emit('errorr', 'A problem happened.\n' + err)
              return
            } else {
              pagesCollection.push(data)
              if (data.name === "index.html") {
                isIndex = data
              }
              ctx.socket.emit('success', `The ${datainfo.name} was successfully created !`)
            }
          })
        }
      })
    }
    if(datainfo.menulist){
      menudb.find({}, (err, res)=>{
        if(err)console.log(err)
        if(res){
          ctx.socket.emit('menulist', JSON.stringify(res))
        }
      })
    }
    if(datainfo.getgtag){
      ctx.socket.emit('gtag', {gtag:gtag})
    }
    if(datainfo.getlang){
      ctx.socket.emit('lang', {lang:lang})
    }
    if(datainfo.menu){
      let newMenu = new menudb({
        menu: datainfo.menu
      })
      newMenu.save((err, res)=>{
        if(err)console.log(err)
        if(res)console.log(res)
      })
    }
    if (datainfo.update) {
      pagedb.findOneAndUpdate({ name: datainfo.update.name },
        { page: datainfo.update.page, css: datainfo.update.css, js: datainfo.update.js },
        { new: true },
        (err) => {
          if (err) {
            console.log('error updating the page', err)
            ctx.socket.emit('errorr', 'Couldn\'t update the page.\n', err)
          }
          ctx.socket.emit('success', `the page ${datainfo.update.name} was successfully updated.`)
        })
      pagesCollection.forEach(page => {
        if (page.name === datainfo.update.name) {
          page.page = datainfo.update.page
          page.js = datainfo.update.js
          page.css = datainfo.update.css
        }
      })
    }
    if (datainfo.oldName) {
      let oldName = datainfo.oldName.slice(0, -5)
      pagedb.findOneAndUpdate({ name: datainfo.oldName },
        { name: datainfo.newName + '.html' },
        { new: true },
        (err, data) => {
          if (err) {
            console.log('An error occured while renaming the page.', err)
            ctx.socket.emit('errorr', 'An error occured while renaming the page.\n', err)
          }
          data.page.replace(oldName+ ".css", datainfo.newName + ".css")
          data.page.replace(oldName+ ".js", datainfo.newName + ".js")
          data.save()
          ctx.socket.emit('success', `the page ${datainfo.oldName} was successfully renamed to ${datainfo.newName}.`)
        })
      pagesCollection.forEach(page => {
        if (page.name === datainfo.oldName) {
          page.name = datainfo.newName + '.html'
        }
      })
    }
    if (datainfo.deletePage) {
      pagedb.deleteOne({ name: datainfo.deletePage }, (err, success) => {
        if (err) {
          ctx.socket.emit('errorr', `error deleting the page: ${datainfo.deletePage}, please retry.`)
        }
        if (success) {
          ctx.socket.emit('success', `Done. The: ${datainfo.deletePage} page was successfully deleted`)
          }
      })
      let pagesCollectionTemp = pagesCollection.filter(pageData => { if (pageData.name !== datainfo.deletePage) return pageData })
      pagesCollection = pagesCollectionTemp
      if(datainfo.deletePage === 'index.html'){
        isIndex.length = 0
      }
    }
  }
})
let extensionCheck = /(\.(jpeg)|(png)|(PNG)|(tiff)|(tif)|(jpg)|(gif)|(svg)|(webp))$/
adminSocket.on('image', ctx => {
  let extensionIndex = extensionCheck.exec(ctx.data.name).index
  let newName = ctx.data.name.slice(0, extensionIndex) + 'webp'
  sharp(ctx.data.image).toFile('./medias/imgs/' + newName, (err, info)=>{
    if(err)console.log(err)
  })
})
adminSocket.on('video', ctx => {
  var newImg = fs.createWriteStream('./medias/videos/' + ctx.data.name, {
    encoding: "binary"
  })
  newImg.write(ctx.data.video)
  newImg.end()
})
module.exports = adminSocket