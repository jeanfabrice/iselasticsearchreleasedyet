'use strict';
const config        = require( 'config' );
const debug         = require( 'debug' )( 'iery:index' );
const errorHandler  = require( 'errorhandler' );
const express       = require( 'express' );
const http          = require( 'http' );
const morgan        = require( 'morgan' );
const path          = require( 'path' );
const p             = require( '../package.json' );
const favicon       = require( 'serve-favicon' );
const helmet        = require( 'helmet' );
const Version       = require( './Version' );
const { ecsFormat } = require( '@elastic/ecs-morgan-format' );
const app           = express();

const start = ( rootDir ) => {

  Version.repo = config.get( 'repo' );

  const publicPath = path.resolve ( rootDir, 'public' );

  app.locals.title = p.description;

  if( app.settings.env === 'development' ) {
    // On dev mode, front static assets are served via webpack
    const webpack              = require( 'webpack' );
    const webpackDevMiddleware = require( 'webpack-dev-middleware' );
    const webpackConfig        = require( path.resolve ( rootDir, 'webpack-config.js' ) )( app.settings.env, {
      'mode': 'development',
      'target': 'web'
    })[ 0 ];
    const compiler = webpack( webpackConfig );
     app.use( webpackDevMiddleware( compiler, {
      'publicPath' : webpackConfig.output.publicPath
    }));
    app.use( errorHandler() );

  }

  app.set( 'port',    config.get( 'port' ) );
  app.set( 'address', config.get( 'address' ) );

  // view engine setup
  app.set( 'views', path.resolve( rootDir,  'views' ) );
  app.set( 'view engine', 'pug' );

  if ( app.get( 'env' ) === 'production' ) {
    app.use( helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          'default-src': ['\'self\''],
          'connect-src': ['\'self\'', 'https://apm.bobo-rousselin.com:8200'],
          'worker-src': ['\'self\'', 'blob:'],
          'img-src': ['\'self\'', 'data:'],
          'font-src': ['\'self\'', 'data:'],
          'script-src': ['\'self\''],
          'style-src': ['\'self\'', '\'unsafe-inline\'']
        }
      }
    }));
  }
  app.use( morgan( ecsFormat() ) );
  app.use( '/static', express.static( publicPath ) );
  app.use( favicon( path.join( publicPath, 'favicon.ico' ) ) );


  // express routes
  app.get(
    '/healthz',
    ( req, res ) => {
      res.status( 200 ).send( 'healthy' );
    }
  );
  app.use( ( req, res, next ) => {
    res.locals.baseurl = config.get( 'baseurl' );
    next();
  });
  app.use( '/', require( './routes/root' )( Version ) );

  // Redirect everything else to '/'
  app.use( ( req, res, next ) => {
    res.redirect( '/' );
  });

  // error handler
  app.use( ( err, req, res, next ) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error   = req.app.get( 'env' ) === 'development' ? err : {};
    // render the error page
    res.status( err.status || 500 );
    res.render( 'error' );
  });

  const server = http.createServer( app ).listen( app.get( 'port' ), app.get( 'address' ), () => {
    debug( 'Starting Expresss server at ' + app.get( 'address' ) + ':' + app.get( 'port' ) + ' in \'' + app.settings.env + '\' mode.' );
  });

  process.on( 'SIGTERM', () => {
    server.close( () => {
      console.log( 'Exiting on SIGTERM.' );
      process.exit( 0 );
    });
  });

};


module.exports = {
  start
};
