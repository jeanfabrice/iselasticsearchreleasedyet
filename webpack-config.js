'use strict';
const { CleanWebpackPlugin } = require( 'clean-webpack-plugin' );
const CopyPlugin             = require( 'copy-webpack-plugin' );
const TerserPlugin           = require( 'terser-webpack-plugin' );
const ESLintPlugin           = require( 'eslint-webpack-plugin' );
const nodeExternals          = require( 'webpack-node-externals' );
const path                   = require( 'path' );

module.exports = ( env, argv ) => {

  const front = {
    target: 'web',
    context: path.resolve( __dirname, 'public' ),
    entry: { common : './js/common.js' },
    externals: {},
    resolve: {
      'alias': {},
      extensions: [ '*', '.js', '.jsx' ]
    },
    plugins: [
      new CleanWebpackPlugin(),
      new CopyPlugin({
        patterns: [
          { from: 'images', to: 'images' },
          { from: 'css',    to: 'css' },
          { from: 'fonts',  to: 'fonts' },
          { from: 'favicon.ico',  to: 'favicon.ico' }
        ]
      }),
      new ESLintPlugin({
          'cache': false
      })
    ],
    output: {
      path                : __dirname + '/build/front',
      publicPath          : '/static/',
      filename            : 'js/[name].bundle.js',
      assetModuleFilename : 'assets/[hash][ext][query]',
      libraryTarget       : 'var',
      library             : '[name]'
    },
    optimization: {
      'splitChunks' : {
        'cacheGroups': {
          'commons': {
            'name'      : 'commons',
            'chunks'    : 'initial',
            'minChunks' : 2
          }
        }
      }
    },
    module: {
      rules: [
        {
          'test'    : /\.(js|jsx)$/,
          'exclude' : /node_modules/,
          'use'     : [ 'babel-loader' ]
        }
      ]
    }

  };

  const back = {
    target: 'node',
    context: path.resolve( __dirname ),
    entry: {
      app : './index.js'
    },
    externals: [ nodeExternals() ],
    module: { 'rules': [] },
    node: { '__dirname'  : false, '__filename' : false },
    output: {
      path     : path.resolve( __dirname, 'build/back' ),
      filename : 'bundle-back.js'
    },
    plugins: [
      new CleanWebpackPlugin(),
      new CopyPlugin({
        patterns: [
          { from: 'views',  to: 'views' },
          { from: 'config', to: 'config' }
        ]
      }),
      new ESLintPlugin()
    ]
  };

  if( argv.mode == 'production' ) {
    front.mode  = back.mode = 'production';
    front.stats = back.stats = 'minimal';
    front.optimization.providedExports = false;
    front.optimization.minimizer = [
      new TerserPlugin({
        'parallel'      : true,
        'terserOptions' : {
          'ecma': 6
        }
      })
    ];
  }
  else {
    front.mode = back.mode   = 'development';
    front.stats = back.stats = 'verbose';
    front.devtool            = 'inline-source-map';
  }

  return [ front, back ];

};
