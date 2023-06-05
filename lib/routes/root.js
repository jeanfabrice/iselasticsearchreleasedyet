'use strict';
const debug     = require( 'debug' )( 'iery:root' );
const express   = require( 'express' );
const util      = require( 'util' );
const moment    = require( 'moment' );
const Output    = require( '../Output' );
const Mutex     = require( '../Mutex' );
const chromium  = require( 'chrome-aws-lambda' );
const puppeteer = require( 'puppeteer-core' );

const DEFAULT_LOOKBACK = 7; // days

module.exports = ( Version ) => {

  const router = express.Router();

  const dateCalc = ( req, res, next ) => {
    res.locals.naturaldate = moment( res.locals.version.published_at ).calendar({
      sameDay: '[today]',
      lastDay: '[yesterday]',
      lastWeek: '[last] dddd',
      sameElse: function( now ){
        return '[' + this.fromNow() + ']';
      }
    });
    debug( `naturaldate: ${res.locals.naturaldate}` );
    next();
  };

  const getVersion = ( req, res, next ) => {
    Mutex.lock().then( () => {
        return Version.last.then( ( version ) => {
          res.locals.version = version;
          next();
        });
      })
      .catch( ( error ) => {
        console.error( util.inspect( error ) );
        next( error );
      })
      .finally( () => {
        Mutex.unlock();
      });
  };

  router.get( '/', getVersion, dateCalc, function( req, res, next ) {
    const iselasticsearchreleased = moment().diff( moment( res.locals.version.published_at ), 'days' ) < ( parseInt( req.query.since ) || DEFAULT_LOOKBACK );
    debug( `iselasticsearchreleased: ${iselasticsearchreleased}` );

    res.format({
      'text/plain': function() {
        res.send( Output.text( res, iselasticsearchreleased ) );
      },

      'text/html': function() {
        res.render( iselasticsearchreleased ? 'yes' : 'no', { 'nofooter': Object.hasOwn( req.query, 'nofooter' ) });
      },

      'application/json': function() {
        res.header( 'Content-Type','application/json' );
        res.send( JSON.stringify( Output.json( res, iselasticsearchreleased ), null, 2 ) );
      }
    });
  });


  router.get( '/ogimage.png', ( req, res, next ) => {

    ( async() => {
      const browser = await puppeteer.launch({
          args:            chromium.args,
          executablePath:  await chromium.executable,
          headless:        true,
          defaultViewport: { height: 630, width: 1200 }
      });
      let page = await browser.newPage();
      await page.goto( 'http://' + res.app.get( 'address' ) + ':' + res.app.get( 'port' ) + '?nofooter' );
      let data = await page.screenshot();
      res.header( 'Content-Type', 'image/png' );
      res.header( 'Cache-Control', 's-maxage=60' );
      res.status( 200 ).send( data ).toString( 'base64' );
    })();

  });

  return router;

};
