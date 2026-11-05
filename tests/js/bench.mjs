#!/usr/bin/env node
// Throughput benchmark: typed-array kernel vs the pre-kernel oracle code.
// Run: npm run bench   (or open public/bench.html after npm run build)
// Prints regressions per second (single thread) for OLS, robust M, and MM.

import { runBenchmark, fmtRate, fmtRatio } from './bench-core.mjs';

console.log('model  n      cov     before     after   speedup');
await runBenchmark({
  onRow: ({ model, n, p, before, after }) => console.log(
    `${model.padEnd(6)} ${String(n).padEnd(6)} ${String(p).padEnd(4)} ` +
    `${fmtRate(before).padStart(9)} ${fmtRate(after).padStart(9)} ${fmtRatio(after, before).padStart(7)}`),
});
