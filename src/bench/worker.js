// src/bench/worker.js
// Runs the old-vs-new benchmark (tests/js/bench-core.mjs) off the main thread
// for public/bench.html, posting one message per finished row.

import { runBenchmark, caseCount } from '../../tests/js/bench-core.mjs';

self.onmessage = async e => {
  if (e.data?.type !== 'start') return;
  self.postMessage({ type: 'plan', total: caseCount() });
  try {
    await runBenchmark({
      budgetScale: e.data.budgetScale ?? 1,
      onRow: row => self.postMessage({ type: 'row', row }),
    });
    self.postMessage({ type: 'done' });
  } catch (err) {
    self.postMessage({ type: 'error', message: err?.message ?? String(err) });
  }
};
