const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const HtmlWebpackPluginWithoutScriptTag = require('./HtmlWebpackPluginWithoutScriptTag')
const miniCssExtractPlugin = require('mini-css-extract-plugin')
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin')
const fs = require('fs')
const webpack = require('webpack')
var pagesCollection = require('../xcmsCustoms/pageCollection.js')
const { customComponentsdb, pagedb } = require("../cmsModels")
const { VueLoaderPlugin } = require('vue-loader')
const svelte = require('rollup-plugin-svelte')
const internal = require('svelte/internal')
const rollup = require('rollup')
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
const htmlReactTemplate = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><%= htmlWebpackPlugin.options.title %></title>
</head>
<body>
  <div class="xcms-root-container" id="app"></div>
  <script><%= htmlWebpackPlugin.options.bundle %></script>
</body>
</html>
`
const htmlVueTemplate = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title><%= htmlWebpackPlugin.options.title %></title>
  <link rel="stylesheet" href="//fonts.googleapis.com/css?family=Roboto:400,500,700,400italic|Material+Icons">
  <style><%= htmlWebpackPlugin.options.inpagecss %></style>
</head>
<body>
  <div class="xcms-root-container" id="app"></div>
  <script><%= htmlWebpackPlugin.options.bundle %></script>
</body>
</html>
`
const htmlSvelteTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= htmlWebpackPlugin.options.title %></title>
</head>
<body>
  <div id="app"></div>
  <script><%= htmlWebpackPlugin.options.bundle %></script>
</body>
</html>`

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
const saveBundle = (bundleName, ctx) => {
  let lastBundle = fs.readFileSync(__dirname + '/../builders/build/' + bundleName, { encoding: "utf-8" })
  let saveBundle = new pagedb({
    isBundle: true,
    name: bundleName,
    page: lastBundle,
    js: "",
    css: ""
  })
  pagedb.find({name: bundleName}, (error, response)=>{
    if(error) console.log(error)
    if(response.length > 0){
      response[0].page = lastBundle
      response[0].isBundle = true
      response[0].save()
      ctx.socket.emit('success', "Successfully updated the bundle: " + bundleName)
      cleanBuildFolders()
    }else{
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
            if(!/.vue$/.test(existingComponent.scriptName)){
              let cssComp = fs.createWriteStream(__dirname + '/../builders/css/' + existingComponent.scriptName.replace('.js', '.css'))
              cssComp.write(existingComponent.attachedCSS)
              cssComp.end()
            }
          }
        })
      })
    }
    if(buildConfig.framework === 'vanilla' || buildConfig.framework === "nightly"){
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
      webpack(prebuildConfig, (errb, stats) => {
        if (errb || stats.hasErrors()) {
          let errs = stats.compilation.errors
          ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the Vanilla configuration.`)
          ctx.socket.emit('builder', `error bundling ${buildConfig.framework} project with the Vanilla configuration: \n ${errs}`)
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
          webpack(rebuildJSConfig, (err, res)=>{
            if(err || res.hasErrors()){
              //console.log(err, res)
              ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the Vanilla configuration.`)
            }
            let prebuild = fs.readFileSync(__dirname + '/../builders/prebuild/vanillaBuild.js', { encoding: 'utf-8' })
            let inlineCSS = ""
            try{
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
              saveBundle(buildConfig.pageName, ctx)
            })
          })
      })
    }
    if(buildConfig.framework === 'react'){
      let templateFile = fs.createWriteStream(__dirname + '/../builders/indexTemplate.html')
      templateFile.write(htmlReactTemplate)
      templateFile.end()
      prebuildConfig = {
        entry: path.resolve(__dirname, '../builders/' + buildConfig.main),
        output: {
          path: path.resolve(__dirname, '../builders/prebuild'),
          filename: 'prebuild.js'
        },
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
      webpack(prebuildConfig, (errb, stats) => {
        if (errb || stats.hasErrors()) {
          // [Handle errors here](#error-handling)
          console.log(errb)
          console.log(stats)
          ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the ReactJS configuration.`)
        }
          let prebuild = fs.readFileSync(__dirname + '/../builders/prebuild/prebuild.js', { encoding: 'utf-8' })
          postBuildConfig = {
            mode: 'production',
            stats: "errors-only",
            entry: path.resolve(__dirname, '../builders/prebuild/prebuild.js'),
            plugins: [
              new HtmlWebpackPluginWithoutScriptTag({ options: "" }),
              new HtmlWebpackPlugin({
                filename: buildConfig.pageName,
                template: path.resolve(__dirname, '../builders/indexTemplate.html'),
                title: buildConfig.pageName.replace('.html', ''),
                bundle: prebuild,
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
              console.log(err)
              console.log(ress)
              ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the ReactJS configuration.`)
            }
            let postBuild = fs.readFileSync(__dirname + '/../builders/build/post.build.bundle.js', { encoding: 'utf-8' })
            const wpOptimizeConfig = {
              mode: 'production',
              stats: "errors-only",
              entry: path.resolve(__dirname, '../builders/build/post.build.bundle.js'),
              plugins: [
                new HtmlWebpackPluginWithoutScriptTag({ options: "" }),
                new HtmlWebpackPlugin({
                  filename: buildConfig.pageName,
                  template: path.resolve(__dirname, '../builders/indexTemplate.html'),
                  title: buildConfig.pageName.replace('.html', ''),
                  bundle: postBuild,
                })
              ],
              output: {
                path: path.resolve(__dirname, '../builders/build'),
                filename: 'optimized.build.bundle.js'
              }
            }
            webpack(wpOptimizeConfig, (optiErr, optiRes)=>{
              if (optiErr || optiRes.hasErrors()) {
                // [Handle errors here](#error-handling)
                console.log(optiErr)
                console.log("Optimisation error", optiRes)
                ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the ReactJS configuration.`)
              }
              saveBundle(buildConfig.pageName, ctx)
            })
          })
      })
    }
    if(buildConfig.framework === 'vue'){
      let templateFile = fs.createWriteStream(__dirname + '/../builders/indexTemplate.html')
      templateFile.write(htmlVueTemplate)
      templateFile.end()
      prebuildConfig = {
        mode: 'production',
        stats: "errors-only",
        entry: path.resolve(__dirname, '../builders/' + buildConfig.main),
        output: {
          path: path.resolve(__dirname, '../builders/prebuild'),
          filename: 'prebuild.js'
        },
        module: {
            rules: [
              {
                test: /\.js$/,
                use: 'babel-loader',
                exclude: /node_modules/
              },
              {
                test: /\.vue$/,
                loader: 'vue-loader',
                options: {
                  loaders: {
                    js: 'babel-loader'
                  }
                }
              },
              {
                test: /\.css$/,
                use: [
                  'vue-style-loader',
                  miniCssExtractPlugin.loader,
                  'css-loader',
                ],
              },
              {
                test: /\.scss$/,
                use: [
                  'vue-style-loader',
                  'css-loader',
                  'sass-loader'
                ],
              }
            ]
          },
          resolve: {
            alias: {
              'vue$': 'vue/dist/vue.esm.js'
            },
            extensions: [
              '.js',
              '.vue',
              '.css',
              '.sass'
            ]
          },
        plugins: [
          new VueLoaderPlugin(),
          new miniCssExtractPlugin()
        ],
        stats: {moduleTrace: true},
        optimization: {
          minimize: true,
        },
      }
      webpack(prebuildConfig, (errb, stats) => {
        if (errb || stats.hasErrors()) {
          // [Handle errors here](#error-handling)
          console.log(errb)
          console.log(stats)
          ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the VueJS configuration.`)
          }
          let prebuild = fs.readFileSync(__dirname + '/../builders/prebuild/prebuild.js', { encoding: 'utf-8' })
          let inpagecss = fs.readFileSync(__dirname + `/../builders/prebuild/${buildConfig.main.replace('.js', '.css')}`, { encoding: 'utf-8' })
          postBuildConfig = {
            mode: 'production',
            stats: "errors-only",
            entry: path.resolve(__dirname, '../builders/prebuild/prebuild.js'),
            plugins: [
              new HtmlWebpackPluginWithoutScriptTag({ options: "" }),
              new HtmlWebpackPlugin({
                appMountId: 'app',
                filename: buildConfig.pageName,
                template: path.resolve(__dirname, '../builders/indexTemplate.html'),
                title: buildConfig.pageName.replace('.html', ''),
                bundle: prebuild,
                inpagecss: inpagecss
              })
            ],
            output: {
              path: path.resolve(__dirname, '../builders/build'),
              filename: 'post.build.bundle.js'
            },
            optimization: {
              minimize: true,
              minimizer: [
                new CssMinimizerPlugin(),
              ],
            },
          }
          webpack(postBuildConfig, (err, ress) => {
            if (err || ress.hasErrors()) {
              // [Handle errors here](#error-handling)
              ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the VueJS configuration.`)
            }
            saveBundle(buildConfig.pageName, ctx)
          })
      })
    }
    if(buildConfig.framework === 'svelte'){
      let templateFile = fs.createWriteStream(__dirname + '/../builders/indexTemplate.html')
      templateFile.write(htmlSvelteTemplate)
      templateFile.end()
      let svelteCSS = ""
      let sveltePrebuildConfig = {
        external: ['svelte', 'svelte/internal'],
        input: path.resolve(__dirname + '/../builders/' + buildConfig.main),
        plugins: [
          svelte({
            preprocess: {
              style: ({ content }) => {
                svelteCSS += content
                return
              }
            },
            emitCss: false,
            onwarn: (warning, handler) => {
              // e.g. don't warn on <marquee> elements, cos they're cool
              if (warning.code === 'a11y-distracting-elements') return;
              // let Rollup handle all other warnings normally
              handler(warning);
            },
            // You can pass any of the Svelte compiler options
            compilerOptions: {
              customElement: false
            }
          }),
        ]
      }
      let svelteOutputConfig = {
        file: path.resolve(__dirname + '/../builders/prebuild/prebuild.js'),
        format: 'es',
        name: buildConfig.main,
        globals: {
          "svelte/internal": "internal"
        },
        paths:{
          "svelte/internal": "svelte/internal"
        }
      }
      
      rollup.rollup(sveltePrebuildConfig).then(cfg=>{
        cfg.write(svelteOutputConfig)
        cfg.close()
        return svelteCSS
      }).then((css)=>{
        let watcherCount = 0
        if (fs.existsSync(__dirname + '/../builders/prebuild')){
            let myWatcher = fs.watch(__dirname + '/../builders/prebuild',{persistent: false}, (ev, filename)=>{
            watcherCount++
            if(watcherCount == 2){
              let convertConfig = {
                mode: 'production',
                stats: "errors-only",
                entry: path.resolve(__dirname, '../builders/prebuild/prebuild.js'),
                output: {
                  path: path.resolve(__dirname, '../builders/build'),
                  filename: 'post.build.bundle.js'
                },
                optimization: {
                  minimize: true
                },
              }
              webpack(convertConfig, (hasErrors, stats)=>{
                if (hasErrors || stats.hasErrors()) {
                    // [Handle errors here](#error-handling)
                    console.log(err)
                    console.log(stats)
                    ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the SvelteJS configuration.`)
                  }
                  let postbuild = fs.readFileSync(__dirname + '/../builders/build/post.build.bundle.js', { encoding: 'utf-8' })
                  postBuildConfig = {
                      mode: 'production',
                      stats: "errors-only",
                      entry: path.resolve(__dirname, '../builders/build/post.build.bundle.js'),
                      plugins: [
                        new HtmlWebpackPluginWithoutScriptTag({ options: "" }),
                        new HtmlWebpackPlugin({
                          appMountId: 'app',
                          filename: buildConfig.pageName,
                          template: path.resolve(__dirname, '../builders/indexTemplate.html'),
                          title: buildConfig.pageName.replace('.html', ''),
                          bundle: postbuild
                        })
                      ],
                      output: {
                        path: path.resolve(__dirname, '../builders/build'),
                        filename: 'post.build.bundle.js'
                      },
                      optimization: {
                        minimize: true,
                        minimizer: [
                          new CssMinimizerPlugin(),
                        ],
                      },
                    }
                    webpack(postBuildConfig, (err, stats)=>{
                      if (err || stats.hasErrors()) {
                        // [Handle errors here](#error-handling)
                        console.log(err)
                        console.log(stats)
                        ctx.socket.emit('errorr', `error bundling ${buildConfig.framework} project with the SvelteJS configuration.`)
                      }
                      saveBundle(buildConfig.pageName, ctx)
                    })
                    watcherCount = 0
                    myWatcher.close()
              })
              
            }
          })
        }
        
        
      })
    }
  })
}

module.exports = { Bundler }