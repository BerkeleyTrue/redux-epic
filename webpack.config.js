const path = require('path');

const outputPath = path.resolve(__dirname, './lib');
const entry = path.resolve(__dirname, './src/index.js');

module.exports = {
  entry,
  output: {
    filename: 'index.js',
    path: outputPath,
    libraryTarget: 'commonjs2'
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: /(node_modules|lib)/,
        loaders: ['babel-loader']
      }
    ]
  },
  externals: /(^react|prop-types|rx)/i
};
