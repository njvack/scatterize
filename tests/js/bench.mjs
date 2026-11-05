#!/usr/bin/env node
// Throughput benchmark: typed-array kernel vs the pre-kernel reference code.
// Run: npm run bench
// Prints regressions per second (single thread) for OLS, robust M, and MM.

import { ols } from '../../src/stats/ols.js';
import { robust, robustM } from '../../src/stats/robust.js';
import { ols as olsRef } from './oracle/ols.js';
import { robust as robustRef, robustM as robustMRef } from './oracle/robust.js';

let seed = 1;
const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const gauss = () => Math.sqrt(-2 * Math.log(rand())) * Math.cos(2 * Math.PI * rand());

function gen(n, p) {
  const x = Array.from({ length: n }, gauss);
  const z = Array.from({ length: p }, () => Array.from({ length: n }, gauss));
  const y = x.map((xi, i) => 0.3 * xi + z.reduce((s, c) => s + 0.2 * c[i], 0)
    + (rand() < 0.05 ? 8 : 1) * gauss());
  return { x, y, z };
}

function rate(fn, d, budgetMs) {
  fn(d.x, d.y, d.z);  // warm up
  let count = 0;
  const t0 = performance.now();
  let t;
  do { fn(d.x, d.y, d.z); count++; t = performance.now() - t0; } while (t < budgetMs);
  return count / (t / 1000);
}

const fmt = v => (v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1)).padStart(9);
const ratio = (a, b) => `${(a / b).toFixed(1)}×`.padStart(7);

const pairs = [
  ['OLS',      ols,     olsRef,     400, [200, 1000, 5000]],
  ['M',        robustM, robustMRef, 400, [200, 1000, 5000]],
  ['MM',       robust,  robustRef,  800, [50, 200, 1000]],
];

console.log('model  n      cov     before     after   speedup');
for (const [name, fast, slow, budget, ns] of pairs) {
  for (const n of ns) {
    for (const p of [0, 5]) {
      const d = gen(n, p);
      const a = rate(slow, d, budget);
      const b = rate(fast, d, budget);
      console.log(`${name.padEnd(6)} ${String(n).padEnd(6)} ${String(p).padEnd(4)} ${fmt(a)} ${fmt(b)} ${ratio(b, a)}`);
    }
  }
}
