'use strict';
const debug     = require( 'debug' )( 'iery:root' );
const express   = require( 'express' );
const util      = require( 'util' );
const moment    = require( 'moment' );
const Output    = require( '../Output' );
const Mutex     = require( '../Mutex' );
const puppeteer = require( 'puppeteer' );

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

  router.get( '/', getVersion, dateCalc, ( req, res, next ) => {
    const iselasticsearchreleased = moment().diff( moment( res.locals.version.published_at ), 'days' ) < ( parseInt( req.query.since ) || DEFAULT_LOOKBACK );
    debug( `iselasticsearchreleased: ${iselasticsearchreleased}` );

    res.format({

      'text/plain': () => {
        if( ! req.get( 'user-agent' ) || /^(curl|wget)/.test( req.get( 'user-agent') ) ) {
          res.send( Output.text( res, iselasticsearchreleased ) );
        }
        else {
          // Special handle for opengraph user-agents that use Accept: */*
          res.render( iselasticsearchreleased ? 'yes' : 'no', { 'nofooter': Object.hasOwn( req.query, 'nofooter' ) });
        }
      },

      'text/html': () => {
        res.render( iselasticsearchreleased ? 'yes' : 'no', { 'nofooter': Object.hasOwn( req.query, 'nofooter' ) });
      },

      'application/json': () => {
        res.header( 'Content-Type','application/json' );
        res.send( JSON.stringify( Output.json( res, iselasticsearchreleased ), null, 2 ) );
      }

    });
  });


  router.get( '/ogimage.png', ( req, res, next ) => {

    ( async() => {
      const browser = await puppeteer.launch({
          headless:        'new',
          defaultViewport: { height: 630, width: 1200 }
      });
      const page = await browser.newPage();
      await page.goto( 'http://' + res.app.get( 'address' ) + ':' + res.app.get( 'port' ) + '?nofooter' );
      const data = await page.screenshot({
        'encoding': 'binary'
      });
      await browser.close();

      res.header( 'Content-Type', 'image/png' );
      res.header( 'Cache-Control', 's-maxage=60' );
      res.status( 200 ).send( data ).toString( 'base64' );
    })();

  });

  return router;

};
