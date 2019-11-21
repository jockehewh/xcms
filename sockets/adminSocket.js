const IO = require('koa-socket-2')
const fs = require('fs')
const {pagedb} = require('../cmsModels.js')
var pagesCollection = require('../xcmsDB/pageCollection.js')
var isIndex = require('../xcmsDB/isIndex.js')

const adminSocket = new IO({
  namespace: 'asocket'
})
adminSocket.on('message', async (ctx) => {
  if (typeof ctx.data === 'string') {
    var datainfo = JSON.parse(ctx.data)
    if (datainfo.name) {
      pagedb.find({ name: datainfo.name + '.html' }, (err, data) => {
        if (data.length > 0) {
          ctx.socket.emit('errorr', 'a page with the same name already exist')
        } else {
          let newPage = new pagedb({
            name: datainfo.name + ".html",
            page: datainfo.page,
            js: datainfo.js,
            css: datainfo.css
          })
          newPage.save((err, data) => {
            if (err) {
              console.log('error saving a new page', err)
              ctx.socket.emit('errorr', 'A problem happened: ' + err)
              return
            } else {
              pagesCollection.push(data)
              if (data.name === "index.html") {
                isIndex = data
              }
            }
          })
        }
      })
    }
    if (datainfo.update) {
      pagedb.findOneAndUpdate({ name: datainfo.update.name },
        { page: datainfo.update.page, js: datainfo.update.js, css: datainfo.update.css },
        { new: true },
        (err, data) => {
          if (err) {
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
    if (datainfo.deletePage) {
      pagedb.deleteOne({ name: datainfo.deletePage }, (err, success) => {
        if (err) console.log(err)//envoyer l'erreur
        if (success) console.log(datainfo.deletePage, 'was successfully deleted')//envoyer success
      })
      pagesCollection = pagesCollection.filter(pageData => { if (pageData.name !== datainfo.deletePage) return pageData })
      if(datainfo.deletePage === 'index.html'){
        isIndex.length = 0
      }
    }
  }
})

adminSocket.on('image', ctx => {
  var newImg = fs.createWriteStream('./frontend-site/imgs/' + ctx.data.name, {
    encoding: "binary"
  })
  newImg.write(ctx.data.image)
  newImg.end()
})
adminSocket.on('video', ctx => {
  var newImg = fs.createWriteStream('./frontend-site/videos/' + ctx.data.name, {
    encoding: "binary"
  })
  newImg.write(ctx.data.video)
  newImg.end()
})
module.exports = adminSocket