'use strict';
require( 'elastic-apm-node' ).start();

const app = require( './lib' );

app.start( __dirname );
