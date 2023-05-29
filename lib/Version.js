'use strict';
const debug        = require( 'debug' )( 'iery:Version' );
const refreshDelay = 65*1000; // refresh Github every 65s
const https        =  require('https');

class Singleton {

  constructor( ) {
    this._lastUpdate  = null;
    this._lastVersion = {};
    this._githubRepo  = null;
  }

  set repo( githubRepo ) {
    this._githubRepo = 'https://api.github.com/repos/' + githubRepo + '/releases';
    debug( 'Version._githubRepo:', this._githubRepo );
  }

  get last() {
    return new Promise( ( resolve, reject ) => {

      const now = new Date();

      // We need to ask Github on initialization or when Gihub data are out of date
      if ( this._lastUpdate === null || ( now.getTime() - this._lastUpdate.getTime() > refreshDelay ) )  {

        debug( 'Version._lastUpdate before Github request:', this._lastUpdate );

        https.get( this._githubRepo, { 'headers': { 'User-Agent' : 'IsElasticSearchReleasedYet/1.0' }}, ( res ) => {
          if( res.statusCode !== 200 ) {
            res.resume();
            reject( new Error( 'Internal Server Error.\n' + `Github Request Failed with ${res.statusCode}/${res.statusMessage}` ) );
            return;
          }

          let rawData = '';
          res.on( 'data', ( chunk ) => { rawData += chunk; });
          res.on( 'end' , () => {
            try {
              const parsedData = JSON.parse( rawData );
              debug( 'parsedData:', parsedData );

              this._lastVersion = {
                'created_at'   : parsedData[0].created_at,
                'name'         : parsedData[0].name,
                'published_at' : parsedData[0].published_at,
                'tag_name'     : parsedData[0].tag_name
              };
              debug( 'Version._lastVersion:', this._lastVersion );

              this._lastUpdate = new Date();
              debug( 'Version._lastUpdate:', this._lastUpdate );

              resolve( this._lastVersion );
            }
            catch ( error ) {
              reject( error );
            }
          });
        })
        .on( 'error', ( error ) => {
          reject( error );
        });
      }
      else {
        // We already got fresh data from Github
        resolve( this._lastVersion );
      }

    });
  }

}

module.exports = new Singleton();
