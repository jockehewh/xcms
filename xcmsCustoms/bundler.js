const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackPluginWithoutScriptTag = require('./HtmlWebpackPluginWithoutScriptTag')
const fs = require('fs')
const webpack = require('webpack')
var pagesCollection = require('../xcmsCustoms/pageCollection.js')
const { customComponentsdb, pagedb } = require("../cmsModels")
const pageCollection = require('../xcmsCustoms/pageCollection.js')
const htmlTemplate = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><%= htmlWebpackPlugin.options.title %></title>
</head>
<body>
  <div id="app"></div>
  <script><%= htmlWebpackPlugin.options.bundle %></script>
  
</body>
</html>
`

const Bundler = (buildConfig, ctx)=>{
  customComponentsdb.find({}, (err, res)=>{
    if(err) {
      console.log(err)
      ctx.socket.emit('errorr', 'error gathering the components.')
    }
    if(res){
      ctx.socket.emit('success', 'Gathering components...')
      buildConfig.componentsList.forEach(component=>{
        res.forEach(existingComponent=>{
          if(existingComponent.scriptName === component){
            let oneComp = fs.createWriteStream(__dirname + '/../builders/'+existingComponent.scriptName)
            oneComp.write(existingComponent.scriptContent)
            oneComp.end()
            oneComp.on('close', ()=>{
              ctx.socket.emit('success', `Gathered: ${existingComponent.scriptName}`)
            })
          }
        })
        //A voir
        
        /* 
        CREATE OUTPUT FROM MAIN
        REBUILD JS OUTPUT
        BUILD PAGE FROM TEMPLATE
        SAVE PAGE
        REMOVE TEMPORARYFILES
         */
      })
    }
    let templateFile = fs.createWriteStream(__dirname + '/../builders/indexTemplate.html')
        templateFile.write(htmlTemplate)
        templateFile.end()
        if(buildConfig.framework === "vanilla"){
          webpack({
            entry: path.resolve(__dirname, '../builders/'+buildConfig.main),
            output: {
              path: path.resolve(__dirname, '../builders/prebuild'),
              filename: 'prebuild.js'
            }
          }, (errb, stats) => {
            if (errb || stats.hasErrors()) {
              // [Handle errors here](#error-handling)
            }
            let prebuild = fs.readFileSync(__dirname + '/../builders/prebuild/prebuild.js', {encoding: 'utf-8'})
            webpack({
              entry: path.resolve(__dirname, '../builders/prebuild/prebuild.js'),
              plugins:[
                new HtmlWebpackPluginWithoutScriptTag({options: ""}),
                new HtmlWebpackPlugin({
                  filename: buildConfig.pageName,
                  template: path.resolve(__dirname, '../builders/indexTemplate.html'),
                  title: buildConfig.pageName.replace('.html', ''),
                  bundle: prebuild
                })
              ],
              output: {
                path: path.resolve(__dirname, '../builders/build'),
                filename: 'post.build.bundle.js'
              }
            }, (err, ress)=>{
              if (err || ress.hasErrors()) {
                // [Handle errors here](#error-handling)
              }
              let lastBundle = fs.readFileSync(__dirname + '/../builders/build/'+ buildConfig.pageName, {encoding: "utf-8"})
              let saveBundle = new pagedb({
                name: buildConfig.pageName,
                page: lastBundle,
                js: "",
                css: ""
              })
              saveBundle.save((err, res)=>{
                if(err){
                  ctx.socket.emit('errorr', "Couldnt save the bundle into the database.")
                }
                if(res){
                  pageCollection.push(res)
                  ctx.socket.emit('success', "The bundle was saved at: "+buildConfig.pageName)
                   fs.rmdir(__dirname + '/../builders/', {recursive: true, force: true}, (err)=>{
                      if(err === null){
                        fs.mkdir(__dirname + '/../builders/prebuild', {recursive: true}, (err)=>{
                          if(err) console.log(err)
                        })
                        fs.mkdir(__dirname + '/../builders/build', {recursive: true}, (err)=>{
                          if(err) console.log(err)
                        })
                      }
                  }) 
                }
              })
            })
          });
        }
  })
  /* 

   */
}

module.exports = {Bundler}