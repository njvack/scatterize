// Shared benchmark core: typed-array kernel vs the pre-kernel oracle code.
// Used by the Node runner (bench.mjs) and the in-browser page (bench-browser.mjs,
// served at public/bench.html). No DOM or Node APIs.

import { ols } from '../../src/stats/ols.js';
import { robust, robustM } from '../../src/stats/robust.js';
import { ols as olsRef } from './oracle/ols.js';
import { robust as robustRef, robustM as robustMRef } from './oracle/robust.js';

// Deterministic synthetic regression data: n rows, p covariates, 5% outliers.
export function gen(n, p, seed = 1) {
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const gauss = () => Math.sqrt(-2 * Math.log(rand())) * Math.cos(2 * Math.PI * rand());
  const x = Array.from({ length: n }, gauss);
  const z = Array.from({ length: p }, () => Array.from({ length: n }, gauss));
  const y = x.map((xi, i) => 0.3 * xi + z.reduce((acc, c) => acc + 0.2 * c[i], 0)
    + (rand() < 0.05 ? 8 : 1) * gauss());
  return { x, y, z };
}

const now = () => performance.now();

// Fits per second for fn on dataset d, measured over at least budgetMs.
export function rate(fn, d, budgetMs) {
  fn(d.x, d.y, d.z);  // warm up
  let count = 0;
  const t0 = now();
  let t;
  do { fn(d.x, d.y, d.z); count++; t = now() - t0; } while (t < budgetMs);
  return count / (t / 1000);
}

// [label, new fn, oracle fn, budget ms, sizes]
export const CASES = [
  ['OLS', ols,     olsRef,     400, [200, 1000, 5000]],
  ['M',   robustM, robustMRef, 400, [200, 1000, 5000]],
  ['MM',  robust,  robustRef,  800, [50, 200, 1000]],
];
export const COVARIATES = [0, 5];

export function caseCount() {
  return CASES.reduce((s, c) => s + c[4].length * COVARIATES.length, 0);
}

// Run every case; calls onRow({ model, n, p, before, after }) after each one.
// Awaits `yieldFn` between rows so a page can repaint. budgetScale shortens or
// lengthens every measurement.
export async function runBenchmark({ onRow, yieldFn = async () => {}, budgetScale = 1 } = {}) {
  const rows = [];
  for (const [model, fast, slow, budget, ns] of CASES) {
    for (const n of ns) {
      for (const p of COVARIATES) {
        const d = gen(n, p);
        const before = rate(slow, d, budget * budgetScale);
        const after = rate(fast, d, budget * budgetScale);
        const row = { model, n, p, before, after };
        rows.push(row);
        onRow?.(row);
        await yieldFn();
      }
    }
  }
  return rows;
}

export const fmtRate = v => (v >= 100 ? Math.round(v).toLocaleString('en-US') : v.toFixed(1));
export const fmtRatio = (after, before) => `${(after / before).toFixed(1)}×`;
