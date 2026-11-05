// src/stats/worker.js
// Web Worker entry point for regression jobs. Bundled separately to
// dist/stats/worker.js; see pool.js for the main-thread side.

import { handleMessage } from './worker-handler.js';

self.onmessage = e => {
  self.postMessage(handleMessage(e.data));
};
