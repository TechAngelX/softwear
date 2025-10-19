// webpack.config.js

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const fs = require('fs');

let sslOptions = {};
try {
  sslOptions = {
    key: fs.readFileSync(path.join(__dirname, 'ssl', 'key.pem')),
    cert: fs.readFileSync(path.join(__dirname, 'ssl', 'cert.pem')),
  };
} catch (e) {
  console.error("ERROR: SSL certificates not found or unreadable.");
  console.error("Please run the following command to generate them:");
  console.error("openssl req -x509 -newkey rsa:2048 -nodes -keyout ssl/key.pem -out ssl/cert.pem -days 365");
  process.exit(1);
}

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'bundle.[contenthash].js',
      publicPath: isProduction ?
          './' : '/'
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets:
                  ['@babel/preset-env', '@babel/preset-react'],
            },
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpg|gif|svg|webp)$/,
          type:
              'asset/resource',
        },
        {
          test: /\.wasm$/,
          type: 'asset/resource',
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename:
                'fonts/[name][ext]'
          }
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './public/index.html',
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: './public/data', to: 'data' },
          { from: './public/audio', to:
                'audio' },
          { from: './public/images', to: 'images' },
          { from: './public/3dmodels', to: '3dmodels' },
          { from: './public/draco.worker.js', to: 'draco.worker.js' },
          { from: './src/tests/testSetup.js', to: 'testSetup.js' },
          {
            from: 'node_modules/three/examples/jsm/libs/draco',
            to: 'draco',

            globOptions: {
              ignore: ['**/*.d.ts'],
            }
          }
        ],
      }),
      new webpack.BannerPlugin({
        banner: '=========================\n' +
            '  Softwear Virtual Try-on\n' +

            '  © Ricki Angel, 2025\n' +
            '=========================\n' +
            '  RUNNING ON PORT 3000',
      }),
      new webpack.DefinePlugin({
        __BUILD_DATE__: JSON.stringify(new Date().toLocaleString('en-GB', {
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          second: 'numeric'
        }))
      })
    ],
    devServer: {
      static: [
        {
          directory: path.join(__dirname, 'public'),
          publicPath: '/',

        },
        {
          directory: path.join(__dirname, 'public/fonts'),
          publicPath: '/fonts',
        },
        {
          directory: path.join(__dirname, 'node_modules/three/examples/jsm/libs/draco'),
          publicPath: '/draco',
        }
      ],
      compress: true,

      port: 3000,
      host: '0.0.0.0',
      historyApiFallback: { disableDotRule: true },
      hot: true,
      server: {
        type: 'https',
        options: sslOptions,
      },
      allowedHosts: 'all',
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',


      },
    },
    resolve: {
      extensions: ['.js', '.jsx'],
    },
    experiments: {
      asyncWebAssembly: true,
    },
  };
};
