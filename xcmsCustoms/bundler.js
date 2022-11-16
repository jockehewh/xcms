const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackPluginWithoutScriptTag = require('./HtmlWebpackPluginWithoutScriptTag')
const fs = require('fs')
const webpack = require('webpack')
var pagesCollection = require('../xcmsCustoms/pageCollection.js')
const { customComponentsdb, pagedb } = require("../cmsModels")
const htmlVanillaTemplate = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><%= htmlWebpackPlugin.options.title %></title>
  <style><%= htmlWebpackPlugin.options.inlinecss %></style>
  <link rel="stylesheet" href="//fonts.googleapis.com/css?family=Roboto:400,500,700,400italic|Material+Icons">
</head>
<body>
  <div class="xcms-root-container" id="app"></div>
  <script><%= htmlWebpackPlugin.options.bundle %></script>
  
</body>
</html>
`

const cleanBuildFolders = () => {
  fs.rmdir(__dirname + '/../builders/', { recursive: true, force: true }, (err) => {
    if (err === null) {
      fs.mkdir(__dirname + '/../builders/prebuild', { recursive: true }, (err) => {
        if (err) console.log(err)
      })
      fs.mkdir(__dirname + '/../builders/build', { recursive: true }, (err) => {
        if (err) console.log(err)
      })
      fs.mkdir(__dirname + '/../builders/css', { recursive: true }, (err) => {
        if (err) console.log(err)
      })
    }
  })
}
const saveBundle = (bundleName, ctx) => {
  let lastBundle = fs.readFileSync(__dirname + '/../builders/build/' + bundleName, { encoding: "utf-8" })
  let saveBundle = new pagedb({
    isBundle: true,
    name: bundleName,
    page: lastBundle,
    js: "",
    css: ""
  })
  pagedb.find({ name: bundleName }, (error, response) => {
    if (error) console.log(error)
    if (response.length > 0) {
      response[0].page = lastBundle
      response[0].isBundle = true
      response[0].save()
      ctx.socket.emit('success', "Successfully updated the bundle: " + bundleName)
      cleanBuildFolders()
    } else {
      saveBundle.save((err, res) => {
        if (err) {
          ctx.socket.emit('errorr', "Couldnt save the bundle into the database.")
        }
        if (res) {
          pagesCollection.push(res)
          ctx.socket.emit('success', "Successfully created the bundle: " + bundleName)
          cleanBuildFolders()
        }
      })
    }
  })
}

const Bundler = (buildConfig, ctx) => {
  process.noDeprecation = true
  let postBuildConfig = {}
  let prebuildConfig = {}
  customComponentsdb.find({project: buildConfig.project}, (err, res)=>{
    if (err) {
      console.log(err)
      ctx.socket.emit('errorr', 'error gathering the components.')
    }
    res.forEach(component=>{
      if(!fs.existsSync(`${__dirname}/../builder/${buildConfig.project}/${component.path}`)){
        fs.mkdirSync(`${__dirname}/../builder/${buildConfig.project}/${component.path}`, { recursive: true })
        fs.writeFileSync(`${__dirname}/../builder/${buildConfig.project}/${component.path}/${component.scriptName}`, component.scriptContent)
        if(component.attachedCSS !== "")
        fs.writeFileSync(`${__dirname}/../builder/${buildConfig.project}/${component.path}/${component.scriptName.replace('.js', '.css')}`, component.attachedCSS)
      }else{
        fs.writeFileSync(`${__dirname}/../builder/${buildConfig.project}/${component.path}/${component.scriptName}`, component.scriptContent)
        if(component.attachedCSS !== "")
        fs.writeFileSync(`${__dirname}/../builder/${buildConfig.project}/${component.path}/${component.scriptName.replace('.js', '.css')}`, component.attachedCSS)
      }
    })
    //ADAPTER LE BUILD POUR FACILITER L'UTILISATION DE FRAMEWORK
    if (buildConfig.framework === 'Vanilla') {
      let templateFile = fs.createWriteStream(__dirname + '/../builders/indexTemplate.html')
      templateFile.write(htmlVanillaTemplate)
      templateFile.end()
      prebuildConfig = {
        entry: path.resolve(__dirname, '../builders/' + buildConfig.main),
        output: {
          path: path.resolve(__dirname, '../builders/prebuild'),
          filename: 'prebuild.js'
        },
        stats: "errors-only",
         plugins: [
          'css-loader'
        ], 
        module: {
          rules: [
            {
              test: /\.js$/,
              use: {
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/preset-env'],
                  plugins: ['@babel/plugin-transform-runtime']
                }
              },
              exclude: /node_modules/
            },
            {
              test: /\.css$/i,
              use: [
                'css-loader',
              ],
            }
          ]
        },
        optimization: {
          minimize: true,
        },
      }
      webpack(prebuildConfig, (errb, stats) => {
        if (errb || stats.hasErrors()) {
          let errs = stats.compilation.errors
          ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the Vanilla configuration.`)
          //ctx.socket.emit('builder', `error bundling ${buildConfig.framework} project with the Vanilla configuration: \n ${errs}`)
          /* 
          CREER UN EVENEMENT WEBPACK ERROR
           */
        }
        let rebuildJSConfig = {
          mode: 'production',
          stats: "errors-only",
          stats: {
            preset: "errors-only",
            warnings: false
          },
          entry: path.resolve(__dirname, '../builders/prebuild/prebuild.js'),
          output: {
            path: path.resolve(__dirname, '../builders/prebuild'),
            filename: 'vanillaBuild.js'
          }
        }
        webpack(rebuildJSConfig, (err, res) => {
          if (err || res.hasErrors()) {
            //console.log(err, res)
            ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the Vanilla configuration.`)
          }
          try {
            let prebuild = fs.readFileSync(__dirname + '/../builders/prebuild/vanillaBuild.js', { encoding: 'utf-8' })
            let inlineCSS = ""
            try {
              inlineCSS = fs.readFileSync(__dirname + '/../builders/prebuild/prebuild.css', { encoding: 'utf-8' })
            } catch {
              inlineCSS = ""
            }
            postBuildConfig = {
              mode: 'production',
              stats: "errors-only",
              stats: {
                preset: "errors-only",
                warnings: false
              },
              entry: path.resolve(__dirname, '../builders/prebuild/vanillaBuild.js'),
              plugins: [
                new HtmlWebpackPluginWithoutScriptTag({ options: "" }),
                new HtmlWebpackPlugin({
                  filename: buildConfig.pageName,
                  template: path.resolve(__dirname, '../builders/indexTemplate.html'),
                  title: buildConfig.pageName.replace('.html', ''),
                  bundle: prebuild,
                  inlinecss: inlineCSS
                })
              ],
              output: {
                path: path.resolve(__dirname, '../builders/build'),
                filename: 'post.build.bundle.js'
              }
            }
            webpack(postBuildConfig, (err, ress) => {
              if (err || ress.hasErrors()) {
                // [Handle errors here](#error-handling)
              }
              saveBundle(buildConfig.pageName, ctx)
            })
          } catch {
            ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the Vanilla configuration.`)
            cleanBuildFolders()
          }
        })
      })
    }
  })
  /* customComponentsdb.find({}, (err, res) => {
    if (err) {
      console.log(err)
      ctx.socket.emit('errorr', 'error gathering the components.')
    }
    if (res) {
      //ADAPTER LE BUILD POUR FACILITER L'UTILISATION DE FRAMEWORK
      ctx.socket.emit('success', 'Gathering components...')
      buildConfig.componentsList.forEach(component => {
        res.forEach(existingComponent => {
          if (existingComponent.scriptName === component) {
            let oneComp = fs.createWriteStream(__dirname + '/../builders/' + existingComponent.scriptName)
            oneComp.write(existingComponent.scriptContent)
            oneComp.end()
            oneComp.on('close', () => {
              ctx.socket.emit('success', `Gathered: ${existingComponent.scriptName}`)
            })
            if (!/.vue$/.test(existingComponent.scriptName)) {
              let cssComp = fs.createWriteStream(__dirname + '/../builders/css/' + existingComponent.scriptName.replace('.js', '.css'))
              cssComp.write(existingComponent.attachedCSS)
              cssComp.end()
            }
          }
        })
      })
    }
    if (buildConfig.framework === 'vanilla') {
      let templateFile = fs.createWriteStream(__dirname + '/../builders/indexTemplate.html')
      templateFile.write(htmlVanillaTemplate)
      templateFile.end()
      prebuildConfig = {
        entry: path.resolve(__dirname, '../builders/' + buildConfig.main),
        output: {
          path: path.resolve(__dirname, '../builders/prebuild'),
          filename: 'prebuild.js'
        },
        stats: "errors-only",
         plugins: [
          'css-loader'
        ], 
        module: {
          rules: [
            {
              test: /\.js$/,
              use: {
                loader: 'babel-loader',
                options: {
                  presets: ['@babel/preset-env'],
                  plugins: ['@babel/plugin-transform-runtime']
                }
              },
              exclude: /node_modules/
            },
            {
              test: /\.css$/i,
              use: [
                'css-loader',
              ],
            }
          ]
        },
        optimization: {
          minimize: true,
        },
      }
      webpack(prebuildConfig, (errb, stats) => {
        if (errb || stats.hasErrors()) {
          let errs = stats.compilation.errors
          ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the Vanilla configuration.`)
          //ctx.socket.emit('builder', `error bundling ${buildConfig.framework} project with the Vanilla configuration: \n ${errs}`)
          
        }
        let rebuildJSConfig = {
          mode: 'production',
          stats: "errors-only",
          stats: {
            preset: "errors-only",
            warnings: false
          },
          entry: path.resolve(__dirname, '../builders/prebuild/prebuild.js'),
          output: {
            path: path.resolve(__dirname, '../builders/prebuild'),
            filename: 'vanillaBuild.js'
          }
        }
        webpack(rebuildJSConfig, (err, res) => {
          if (err || res.hasErrors()) {
            //console.log(err, res)
            ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the Vanilla configuration.`)
          }
          try {
            let prebuild = fs.readFileSync(__dirname + '/../builders/prebuild/vanillaBuild.js', { encoding: 'utf-8' })
            let inlineCSS = ""
            try {
              inlineCSS = fs.readFileSync(__dirname + '/../builders/prebuild/prebuild.css', { encoding: 'utf-8' })
            } catch {
              inlineCSS = ""
            }
            postBuildConfig = {
              mode: 'production',
              stats: "errors-only",
              stats: {
                preset: "errors-only",
                warnings: false
              },
              entry: path.resolve(__dirname, '../builders/prebuild/vanillaBuild.js'),
              plugins: [
                new HtmlWebpackPluginWithoutScriptTag({ options: "" }),
                new HtmlWebpackPlugin({
                  filename: buildConfig.pageName,
                  template: path.resolve(__dirname, '../builders/indexTemplate.html'),
                  title: buildConfig.pageName.replace('.html', ''),
                  bundle: prebuild,
                  inlinecss: inlineCSS
                })
              ],
              output: {
                path: path.resolve(__dirname, '../builders/build'),
                filename: 'post.build.bundle.js'
              }
            }
            webpack(postBuildConfig, (err, ress) => {
              if (err || ress.hasErrors()) {
                // [Handle errors here](#error-handling)
              }
              saveBundle(buildConfig.pageName, ctx)
            })
          } catch {
            ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the Vanilla configuration.`)
            cleanBuildFolders()
          }
        })
      })
    }
  }) */
}

module.exports = { Bundler }