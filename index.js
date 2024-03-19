'use strict';

const apm = require( 'elastic-apm-node' ).start();

const app = require( './lib' );

app.start( __dirname );
