// import React from 'react';
// import { createRoot } from 'react-dom/client';
// const container = document.getElementById( 'root' );
// const root      = createRoot( container );


import { init as initApm } from '@elastic/apm-rum';

initApm({
  serviceName: 'iselasticsearchreleasedyet',
  serverUrl: 'https://apm.bobo-rousselin.com:8200',
  environment: process.env.NODE_ENV,
  // Set service version (required for sourcemap feature)
  serviceVersion: ''
});
