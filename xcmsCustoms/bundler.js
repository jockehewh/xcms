const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackPluginWithoutScriptTag = require('./HtmlWebpackPluginWithoutScriptTag')
const fs = require('fs')
const webpack = require('webpack')
var pagesCollection = require('../xcmsCustoms/pageCollection.js')
const { customComponentsdb, pagedb } = require("../cmsModels")
const htmlTemplate = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><%= htmlWebpackPlugin.options.title %></title>
</head>
<body>
  <div id="root"></div>
  <script><%= htmlWebpackPlugin.options.bundle %></script>
  
</body>
</html>
`



/* 
INCLURE LE CSS DANS LE BUNDLE ET LE PASSER EN INLINE
POUR INTEGRER REACT ? UTILISER CREATE APP
 */

const Bundler = (buildConfig, ctx) => {
  let postBuildConfig = {}
  customComponentsdb.find({}, (err, res) => {
    if (err) {
      console.log(err)
      ctx.socket.emit('errorr', 'error gathering the components.')
    }
    if (res) {
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
          }
        })
      })
    }
    let templateFile = fs.createWriteStream(__dirname + '/../builders/indexTemplate.html')
    templateFile.write(htmlTemplate)
    templateFile.end()

    webpack({
      entry: path.resolve(__dirname, '../builders/' + buildConfig.main),
      output: {
        path: path.resolve(__dirname, '../builders/prebuild'),
        filename: 'prebuild.js'
      }
    }, (errb, stats) => {
      if (errb || stats.hasErrors()) {
        // [Handle errors here](#error-handling)
      }
      //AJOUTER L'INTERBUILD
      let prebuild = fs.readFileSync(__dirname + '/../builders/prebuild/prebuild.js', { encoding: 'utf-8' })
      if (buildConfig.framework === "vanilla") {
        postBuildConfig = {
          entry: path.resolve(__dirname, '../builders/prebuild/prebuild.js'),
          module: {
            rules: [
              {
                test: /\.css$/i,
                use: [
                  { loader: 'style-loader', options: { injectType: 'singletonStyleTag' } },
                  'css-loader',
                ],
              }
            ]
          },
          plugins: [
            new HtmlWebpackPluginWithoutScriptTag({ options: "" }),
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
        }
      }
      if (buildConfig.framework === "react") {
        postBuildConfig = {
          entry: path.resolve(__dirname, '../builders/prebuild/prebuild.js'),
          module: {
            rules: [
              {
                test: /\.(js|jsx)$/,
                use: {
                  loader: 'babel-loader',
                  options: {
                    presets: ['@babel/preset-env', '@babel/preset-react'],
                    plugins: ['@babel/plugin-transform-runtime']
                  }
                },
                exclude: /node_modules/
              },
              {
                test: /\.css$/i,
                use: [
                  { loader: 'style-loader', options: { injectType: 'singletonStyleTag' } },
                  'css-loader',
                ],
              }
            ]
          },
          resolve: {
            extensions: [
              '.js',
              '.jsx',
              '.css'
            ]
          },
          plugins: [
            new HtmlWebpackPluginWithoutScriptTag({ options: "" }),
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
        }
      }
      if (buildConfig.framework === "vue") {
        postBuildConfig = {
          entry: path.resolve(__dirname, '../builders/prebuild/prebuild.js'),
          module: {
            rules: [
              {
                test: /\.vue$/,
                loader: 'vue-loader'
              },
              {
                test: /\.css$/i,
                use: [
                  { loader: 'style-loader', options: { injectType: 'singletonStyleTag' } },
                  'css-loader',
                ],
              }
            ]
          },
          resolve: {
            extensions: [
              '.js',
              '.vue',
              '.css'
            ]
          },
          plugins: [
            new require('vue-loader/lib/plugin')(),
            new HtmlWebpackPluginWithoutScriptTag({ options: "" }),
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
        }
      }
      webpack(postBuildConfig, (err, ress) => {
        if (err || ress.hasErrors()) {
          // [Handle errors here](#error-handling)
        }
        let lastBundle = fs.readFileSync(__dirname + '/../builders/build/' + buildConfig.pageName, { encoding: "utf-8" })
        let saveBundle = new pagedb({
          name: buildConfig.pageName,
          page: lastBundle,
          js: "",
          css: ""
        })
        saveBundle.save((err, res) => {
          if (err) {
            ctx.socket.emit('errorr', "Couldnt save the bundle into the database.")
          }
          if (res) {
            pagesCollection.push(res)
            ctx.socket.emit('success', "The bundle was saved at: " + buildConfig.pageName)
            fs.rmdir(__dirname + '/../builders/', { recursive: true, force: true }, (err) => {
              if (err === null) {
                fs.mkdir(__dirname + '/../builders/prebuild', { recursive: true }, (err) => {
                  if (err) console.log(err)
                })
                fs.mkdir(__dirname + '/../builders/build', { recursive: true }, (err) => {
                  if (err) console.log(err)
                })
              }
            })
          }
        })
      })
    });
  })
  /* 

   */
}

module.exports = { Bundler }