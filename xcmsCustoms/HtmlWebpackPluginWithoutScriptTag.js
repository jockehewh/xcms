const HtmlWebpackPlugin = require('html-webpack-plugin');
class HtmlWebpackPluginWithoutScriptTag {
  apply (compiler) {
    compiler.hooks.compilation.tap('HtmlWebpackPluginWithoutScriptTag', (compilation) => {
      HtmlWebpackPlugin.getHooks(compilation).alterAssetTags.tapAsync(
        'HtmlWebpackPluginWithoutScriptTag',
        (data, cb) => {
          data.assetTags.scripts.length = 0
          cb(null, data)
        }
      )
    })
  }
}

module.exports = HtmlWebpackPluginWithoutScriptTag