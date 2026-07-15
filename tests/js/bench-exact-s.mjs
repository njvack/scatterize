#!/usr/bin/env node
// Benchmark: exact-enumeration S-estimator cost for bivariate regression (p=2).
// Run: node tests/js/bench-exact-s.mjs  (or: just bench-exact-s)
//
// Context: exploring MM estimation for the robust model. The MM chain is
// S-estimate (high-breakdown init + scale) → M-step with fixed scale. An
// exact S-estimator enumerates all C(n,2) point pairs as candidate lines,
// matching MASS::lqs(method="S", nsamp="exact") — deterministic, so it's
// comparable against R fixtures at tight tolerance. This script measures
// where that enumeration stops being interactive.
//
// For each pair: fit the exact line, then score it with the standard trick —
// one O(n) pass computing sum rho(r/s_best) with early exit once the sum
// proves the candidate can't beat the current best; only improving candidates
// (empirically ~40-80 total, independent of n) get the full iterative M-scale
// solve. Total cost is therefore O(n^2) candidates x O(n) scoring = O(n^3):
// Theil-Sen's pair enumeration multiplied by n. Measured on Node 22 this is
// ~0.1s at n=250, ~2.4s at n=1000, ~19s at n=2000, ~150s at n=4000 — fine for
// fixture-sized data, infeasible past n ≈ 2000. Above a subset-count cap the
// production path should switch to seeded Fast-S sampling (O(n)).

const B = 0.5;            // 50% breakdown
const C50 = 1.5476;       // bisquare tuning constant for 50% breakdown

function rho(u) {         // bisquare rho, normalized so max = 1
  const t = u / C50;
  if (Math.abs(t) >= 1) return 1;
  const t2 = t * t;
  return t2 * (3 - 3 * t2 + t2 * t2);
}

function mscale(r, s0) {  // solve mean(rho(r/s)) = B by fixed-point iteration
  let s = s0;
  for (let it = 0; it < 30; it++) {
    let sum = 0;
    for (let i = 0; i < r.length; i++) sum += rho(r[i] / s);
    const f = sum / r.length;
    const sNew = s * Math.sqrt(f / B);
    if (Math.abs(sNew - s) < 1e-10 * s) return sNew;
    s = sNew;
  }
  return s;
}

function exactS(x, y) {
  const n = x.length;
  let bestScale = Infinity, bestA = 0, bestBeta = 0;
  const bn = B * n;
  const r = new Float64Array(n);
  let fullSolves = 0;

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const dx = x[j] - x[i];
      if (dx === 0) continue;
      const beta = (y[j] - y[i]) / dx;
      const a = y[i] - beta * x[i];

      if (bestScale === Infinity) {
        for (let k = 0; k < n; k++) r[k] = y[k] - a - beta * x[k];
        const med = [...r].map(Math.abs).sort((p, q) => p - q)[n >> 1] || 1e-10;
        bestScale = mscale(r, med); bestA = a; bestBeta = beta;
        continue;
      }

      // O(n) test pass with early exit: does this candidate beat bestScale?
      let sum = 0;
      let k = 0;
      for (; k < n; k++) {
        sum += rho((y[k] - a - beta * x[k]) / bestScale);
        if (sum > bn) break;
      }
      if (k === n && sum < bn) {
        for (let m = 0; m < n; m++) r[m] = y[m] - a - beta * x[m];
        bestScale = mscale(r, bestScale);
        bestA = a; bestBeta = beta;
        fullSolves++;
      }
    }
  }
  return { intercept: bestA, slope: bestBeta, scale: bestScale, fullSolves };
}

// Synthetic data: y = 2 + 3x + noise, 15% gross outliers
function makeData(n, seed) {
  let s = seed;
  const rand = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const x = [], y = [];
  for (let i = 0; i < n; i++) {
    const xi = rand() * 10;
    const noise = (rand() + rand() + rand() + rand() - 2) * 1.2;
    x.push(xi);
    y.push(i < n * 0.15 ? 30 + rand() * 20 : 2 + 3 * xi + noise);
  }
  return { x, y };
}

const sizes = process.argv.slice(2).map(Number).filter(n => n > 0);
for (const n of (sizes.length ? sizes : [250, 500, 1000, 2000, 4000])) {
  const { x, y } = makeData(n, 42);
  const t0 = performance.now();
  const res = exactS(x, y);
  const ms = performance.now() - t0;
  const pairs = n * (n - 1) / 2;
  console.log(
    `n=${String(n).padStart(5)}  pairs=${String(pairs).padStart(9)}  ` +
    `time=${ms.toFixed(0).padStart(7)}ms  slope=${res.slope.toFixed(4)}  ` +
    `scale=${res.scale.toFixed(4)}  fullSolves=${res.fullSolves}`
  );
}
