// webpack.config.js

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');

const isProduction = process.env.NODE_ENV === 'production';

// Load SSL certs only for local dev
let sslOptions = {};
if (!isProduction) {
  try {
    sslOptions = {
      key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
      cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem')),
    };
  } catch (e) {
    console.warn('⚠️ SSL certificates not found. Running over HTTP instead.');
  }
}

module.exports = (env, argv) => {
  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.[contenthash].js',
      publicPath: argv.mode === 'production' ? './' : '/',
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env', '@babel/preset-react'],
            },
          },
        },
        { test: /\.css$/, use: ['style-loader', 'css-loader'] },
        { test: /\.(png|jpg|gif|svg|webp)$/, type: 'asset/resource' },
        { test: /\.wasm$/, type: 'asset/resource' },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: { filename: 'fonts/[name][ext]' },
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: './public/index.html' }),
      new CopyWebpackPlugin({
        patterns: [
          { from: './public/data', to: 'data' },
          { from: './public/audio', to: 'audio' },
          { from: './public/images', to: 'images' },
          { from: './public/3dmodels', to: '3dmodels' },
          { from: './public/draco.worker.js', to: 'draco.worker.js' },
          { from: './public/manifest.json', to: 'manifest.json' },
          { from: './public/sw.js', to: 'sw.js' },
          { from: './public/icons', to: 'icons' },
          { from: './src/tests/testSetup.js', to: 'testSetup.js' },
          {
            from: 'node_modules/three/examples/jsm/libs/draco',
            to: 'draco',
            globOptions: { ignore: ['**/*.d.ts'] },
          },
        ],
      }),
      new webpack.BannerPlugin({
        banner: [
          '=========================',
          '  Softwear Virtual Try-on',
          '  © Ricki Angel, 2025',
          '=========================',
          '  RUNNING ON PORT 3000',
        ].join('\n'),
      }),
      new webpack.DefinePlugin({
        __BUILD_DATE__: JSON.stringify(
            new Date().toLocaleString('en-GB', {
              year: 'numeric',
              month: 'numeric',
              day: 'numeric',
              hour: 'numeric',
              minute: 'numeric',
              second: 'numeric',
            })
        ),
      }),
    ],
    devServer: {
      static: [
        { directory: path.join(__dirname, 'public'), publicPath: '/' },
        { directory: path.join(__dirname, 'public/fonts'), publicPath: '/fonts' },
        {
          directory: path.join(__dirname, 'node_modules/three/examples/jsm/libs/draco'),
          publicPath: '/draco',
        },
      ],
      compress: true,
      port: 3000,
      host: '0.0.0.0',
      historyApiFallback: { disableDotRule: true },
      hot: true,
      allowedHosts: 'all',
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
      ...(sslOptions.key && sslOptions.cert
          ? { server: { type: 'https', options: sslOptions } }
          : {}),
    },
    resolve: { extensions: ['.js', '.jsx'] },
    experiments: { asyncWebAssembly: true },
    // MediaPipe Tasks Vision resolves its wasm path dynamically; harmless.
    ignoreWarnings: [
      { module: /@mediapipe[\\/]tasks-vision/ },
      /Critical dependency: the request of a dependency is an expression/,
    ],
  };
};
