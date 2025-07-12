const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const WebpackObfuscator = require('webpack-obfuscator');

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: {
      // Main entry points for your application
      index: './index.js',
      login: './login.js',
      signup: './signup.js',
      dashboard: './dashboard.js',
      admin: './admin.js',
      plan: './plan.js',
      profile: './profile.js',
      settings: './settings.js',
      stats: './stats.js',
      'campaign-data': './campaign-data.js',
      'sidebar-centralized': './sidebar-centralized.js'
    },
    
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'js/[name].[contenthash].js' : 'js/[name].js',
      clean: true
    },
    
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          type: 'asset/resource',
          generator: {
            filename: 'images/[name].[hash][ext]'
          }
        },
        {
          test: /\.(woff|woff2|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[hash][ext]'
          }
        }
      ]
    },
    
    plugins: [
      new CleanWebpackPlugin(),
      
      // HTML plugins for each page
      new HtmlWebpackPlugin({
        template: './index.html',
        filename: 'index.html',
        chunks: ['index', 'sidebar-centralized'],
        inject: 'body'
      }),
      
      new HtmlWebpackPlugin({
        template: './login.html',
        filename: 'login.html',
        chunks: ['login'],
        inject: 'body'
      }),
      
      new HtmlWebpackPlugin({
        template: './signup.html',
        filename: 'signup.html',
        chunks: ['signup'],
        inject: 'body'
      }),
      
      new HtmlWebpackPlugin({
        template: './dashboard.html',
        filename: 'dashboard.html',
        chunks: ['dashboard', 'sidebar-centralized'],
        inject: 'body'
      }),
      
      new HtmlWebpackPlugin({
        template: './admin.html',
        filename: 'admin.html',
        chunks: ['admin', 'sidebar-centralized'],
        inject: 'body'
      }),
      
      new HtmlWebpackPlugin({
        template: './plan.html',
        filename: 'plan.html',
        chunks: ['plan', 'sidebar-centralized'],
        inject: 'body'
      }),
      
      new HtmlWebpackPlugin({
        template: './profile.html',
        filename: 'profile.html',
        chunks: ['profile', 'sidebar-centralized'],
        inject: 'body'
      }),
      
      new HtmlWebpackPlugin({
        template: './settings.html',
        filename: 'settings.html',
        chunks: ['settings', 'sidebar-centralized'],
        inject: 'body'
      }),
      
      new HtmlWebpackPlugin({
        template: './stats.html',
        filename: 'stats.html',
        chunks: ['stats', 'sidebar-centralized'],
        inject: 'body'
      }),
      
      new HtmlWebpackPlugin({
        template: './campaign-data.html',
        filename: 'campaign-data.html',
        chunks: ['campaign-data', 'sidebar-centralized'],
        inject: 'body'
      }),
      
      new HtmlWebpackPlugin({
        template: './about.html',
        filename: 'about.html',
        chunks: ['sidebar-centralized'],
        inject: 'body'
      }),
      
      new HtmlWebpackPlugin({
        template: './services.html',
        filename: 'services.html',
        chunks: ['sidebar-centralized'],
        inject: 'body'
      }),
      
      new HtmlWebpackPlugin({
        template: './unauthorized.html',
        filename: 'unauthorized.html',
        inject: false
      }),
      
      // CSS extraction for production
      ...(isProduction ? [new MiniCssExtractPlugin({
        filename: 'css/[name].[contenthash].css'
      })] : []),
      
      // Copy static assets
      new CopyWebpackPlugin({
        patterns: [
          {
            from: 'icons',
            to: 'icons'
          },
          {
            from: 'resources',
            to: 'resources'
          },
          {
            from: 'firebase.json',
            to: 'firebase.json'
          },
          {
            from: 'firestore.rules',
            to: 'firestore.rules'
          },
          {
            from: 'firestore.indexes.json',
            to: 'firestore.indexes.json'
          },
          {
            from: '.firebaserc',
            to: '.firebaserc'
          }
        ]
      }),
      
      // JavaScript obfuscator for production builds
      ...(isProduction ? [new WebpackObfuscator({
        rotateStringArray: true,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        identifierNamesGenerator: 'hexadecimal',
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        debugProtectionInterval: 0,
        disableConsoleOutput: true,
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
      })] : [])
    ],
    
    optimization: {
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all'
          }
        }
      }
    },
    
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist')
      },
      compress: true,
      port: 8080,
      hot: true,
      open: true
    },
    
    resolve: {
      extensions: ['.js', '.json']
    },
    
    devtool: isProduction ? false : 'eval-source-map'
  };
}; 