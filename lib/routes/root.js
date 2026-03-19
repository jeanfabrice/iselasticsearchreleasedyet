'use strict';
const debug     = require( 'debug' )( 'iery:root' );
const express   = require( 'express' );
const util      = require( 'util' );
const dayjs          = require( 'dayjs' );
const relativeTime   = require( 'dayjs/plugin/relativeTime' );
const calendar       = require( 'dayjs/plugin/calendar' );
dayjs.extend( relativeTime );
dayjs.extend( calendar );
const Output    = require( '../Output' );
const Mutex     = require( '../Mutex' );
const puppeteer = require( 'puppeteer' );

const DEFAULT_LOOKBACK = 7; // days
const OG_CACHE_TTL    = 65 * 1000; // match GitHub refresh interval

module.exports = ( Version ) => {

  const router = express.Router();
  let ogCache  = { data: null, timestamp: 0 };

  const dateCalc = ( req, res, next ) => {
    res.locals.naturaldate = dayjs( res.locals.version.published_at ).calendar( null, {
      sameDay: '[today]',
      lastDay: '[yesterday]',
      lastWeek: '[last] dddd',
      sameElse: dayjs( res.locals.version.published_at ).fromNow()
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
    const since = Math.min( Math.max( parseInt( req.query.since, 10 ) || DEFAULT_LOOKBACK, 1 ), 365 );
    const iselasticsearchreleased = dayjs().diff( dayjs( res.locals.version.published_at ), 'day' ) < since;
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


  router.get( '/ogimage.png', async( req, res, next ) => {
    const now = Date.now();

    // Serve from cache if fresh
    if ( ogCache.data && ( now - ogCache.timestamp ) < OG_CACHE_TTL ) {
      debug( 'ogimage: serving from cache' );
      res.header( 'Content-Type', 'image/png' );
      res.header( 'Cache-Control', 's-maxage=60' );
      res.status( 200 ).send( ogCache.data );
      return;
    }

    let browser;
    try {
      browser = await puppeteer.launch({
        headless:        'new',
        defaultViewport: { height: 630, width: 1200 }
      });
      const page = await browser.newPage();
      await page.goto( 'http://' + res.app.get( 'address' ) + ':' + res.app.get( 'port' ) + '?nofooter', { timeout: 10000 } );
      const data = await page.screenshot({ 'encoding': 'binary' });

      ogCache = { data, timestamp: now };
      debug( 'ogimage: generated and cached' );

      res.header( 'Content-Type', 'image/png' );
      res.header( 'Cache-Control', 's-maxage=60' );
      res.status( 200 ).send( data );
    }
    catch ( error ) {
      next( error );
    }
    finally {
      if ( browser ) {
        await browser.close();
      }
    }
  });

  return router;

};
