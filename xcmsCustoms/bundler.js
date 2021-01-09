const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackPluginWithoutScriptTag = require('HtmlWebpackPluginWithoutScriptTag')
const fs = require('fs')
const webpack = require('webpack')
const { customComponentsdb } = require("./cmsModels")

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
          if(existingComponent.scriptName != component.scriptName){
            let oneComp = fs.createWriteStream('./builders/'+existingComponent.scriptName)
            oneComp.write(existingComponent.scriptContent)
            oneComp.end()
            oneComp.on('close', ()=>{
              ctx.socket.emit('success', `Gathered: ${existingComponent.scriptName}`)
            })
          }
        })
        /* 
        CREATE OUTPUT FROM MAIN
        REBUILD JS OUTPUT
        BUILD PAGE FROM TEMPLATE
        SAVE PAGE
        REMOVE TEMPORARYFILES
         */
      })

      ctx.socket.emit('success', `Building endPoint: ${existingComponent.pageName}`)
    }
  })
  /* 

   */
}

module.exports = {Bundler}