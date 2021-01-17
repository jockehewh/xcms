const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackPluginWithoutScriptTag = require('./HtmlWebpackPluginWithoutScriptTag')
const miniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
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
  <style><%= htmlWebpackPlugin.options.inlinecss %></style>
</head>
<body>
  <div id="root"></div>
  <script><%= htmlWebpackPlugin.options.bundle %></script>
  
</body>
</html>
`
const cleanBuildFolders = ()=>{
  fs.rmdir(__dirname + '/../builders/', { recursive: true, force: true }, (err) => {
    if (err === null) {
      fs.mkdir(__dirname + '/../builders/prebuild', { recursive: true }, (err) => {
        if (err) console.log(err)
      })
      fs.mkdir(__dirname + '/../builders/build', { recursive: true }, (err) => {
        if (err) console.log(err)
      })
      fs.mkdir(__dirname + '/../builders/css', {recursive: true}, (err)=>{
        if(err) console.log(err)
      })
    }
  })
}

const Bundler = (buildConfig, ctx) => {
  let postBuildConfig = {}
  let prebuildConfig = {}
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
            let cssComp = fs.createWriteStream(__dirname + '/../builders/css/' + existingComponent.scriptName.replace('.js', '.css'))
            cssComp.write(existingComponent.attachedCSS)
            cssComp.end()
          }
        })
      })
    }
    let templateFile = fs.createWriteStream(__dirname + '/../builders/indexTemplate.html')
    templateFile.write(htmlTemplate)
    templateFile.end()
    if(buildConfig.framework === 'vanilla' || buildConfig.framework === "nightlyjs"){
      prebuildConfig = {
        entry: path.resolve(__dirname, '../builders/' + buildConfig.main),
        output: {
          path: path.resolve(__dirname, '../builders/prebuild'),
          filename: 'prebuild.js'
        },
        stats: "errors-only",
        stats: {
          preset: "errors-only",
          warnings: false
        },
        plugins: [
          new miniCssExtractPlugin({
            filename: "prebuild.css"
          }),
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
                miniCssExtractPlugin.loader,
                'css-loader',
              ],
            }
          ]
        },
        optimization: {
          minimize: true,
          minimizer: [
            new CssMinimizerPlugin(),
          ],
        },
      }
    }
    if(buildConfig.framework === 'react'){
      prebuildConfig = {
        entry: path.resolve(__dirname, '../builders/' + buildConfig.main),
        output: {
          path: path.resolve(__dirname, '../builders/prebuild'),
          filename: 'prebuild.js'
        },
        plugins: [
          new miniCssExtractPlugin({
            filename: "prebuild.css"
          }),
        ],
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
                miniCssExtractPlugin.loader,
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
        optimization: {
          minimize: true,
          minimizer: [
            new CssMinimizerPlugin(),
          ],
        },
      }
    }
    if(buildConfig.framework === 'vue'){
      prebuildConfig = {
        entry: path.resolve(__dirname, '../builders/' + buildConfig.main),
        output: {
          path: path.resolve(__dirname, '../builders/prebuild'),
          filename: 'prebuild.js'
        },
        module: {
            rules: [
              {
                test: /\.vue$/,
                loader: 'vue-loader'
              },
              {
                test: /\.css$/i,
                use: [
                  miniCssExtractPlugin.loader,
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
        optimization: {
          minimize: true,
          minimizer: [
            new CssMinimizerPlugin(),
          ],
        },
        plugins: [
          new require('vue-loader/lib/plugin')(),
          new miniCssExtractPlugin({
            filename: "prebuild.css"
          }),
        ],
      }
    }
    
    webpack(prebuildConfig, (errb, stats) => {
      if (errb || stats.hasErrors()) {
        // [Handle errors here](#error-handling)
        console.log(errb)
        console.log(stats)
        /* 
        UI
        METTRE LE SYSTEME DE BUILD EN EVIDENCE (IMPORTANCE DES IMPORT)
         */
      }
      if(buildConfig.framework === 'vanilla' || buildConfig.framework === 'nightlyjs'){
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
        webpack(rebuildJSConfig, (err, res)=>{
          if(err || res.hasErrors()){
            console.log(err, res)
          }
          let prebuild = fs.readFileSync(__dirname + '/../builders/prebuild/vanillaBuild.js', { encoding: 'utf-8' })
          let inlineCSS = fs.readFileSync(__dirname + '/../builders/prebuild/prebuild.css', { encoding: 'utf-8' })
          postBuildConfig = {
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
                inlinecss : inlineCSS
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
                cleanBuildFolders()
              }
            })
          })
        })
      }else{
        let prebuild = fs.readFileSync(__dirname + '/../builders/prebuild/prebuild.js', { encoding: 'utf-8' })
        let inlineCSS = fs.readFileSync(__dirname + '/../builders/prebuild/prebuild.css', { encoding: 'utf-8' })
        postBuildConfig = {
          stats: "errors-only",
          entry: path.resolve(__dirname, '../builders/prebuild/prebuild.js'),
          plugins: [
            new HtmlWebpackPluginWithoutScriptTag({ options: "" }),
            new HtmlWebpackPlugin({
              filename: buildConfig.pageName,
              template: path.resolve(__dirname, '../builders/indexTemplate.html'),
              title: buildConfig.pageName.replace('.html', ''),
              bundle: prebuild,
              inlinecss : inlineCSS
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
              cleanBuildFolders()
            }
          })
        })
      }
    });
  })
  /* 

   */
}

module.exports = { Bundler }