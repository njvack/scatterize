// tests/js/s-estimate.test.mjs
// Unit tests for the S-estimator (stats/s-estimate.js). R-comparison lives in
// compare.mjs (mm.json); these cover pure-JS properties: the M-scale solver,
// exact-enumeration determinism, leverage resistance, and Fast-S self-consistency.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sEstimate, mScale, subsetCount } from '../../src/stats/s-estimate.js';

const K0 = 1.548;
const BETA = 0.5;
// Normalized bisquare rho (== the module's internal rhoK0 / lqs.c chi).
function rho(u) {
  const t = (u / K0) ** 2;
  return t > 1 ? 1 : t * (3 - 3 * t + t * t);
}

// ---------------------------------------------------------------------------
// mScale — solves sum(rho(r/s)) = target
// ---------------------------------------------------------------------------

test('mScale: satisfies its defining equation', () => {
  const res = [-2, -1, -0.5, 0, 0.3, 0.8, 1.2, 5, -4];
  const n = res.length, p = 2;
  const target = (n - p) * BETA;
  const s = mScale(res, target, 1);
  const sum = res.reduce((acc, r) => acc + rho(r / s), 0);
  assert.ok(Math.abs(sum / target - 1) < 1e-3, `sum/target=${sum / target}`);
});

test('mScale: scales linearly with the residuals', () => {
  const res = [-2, -1, 0, 0.5, 1, 3, -2.5];
  const target = (res.length - 2) * BETA;
  const s1 = mScale(res, target, 1);
  const s2 = mScale(res.map(r => 10 * r), target, 10);
  assert.ok(Math.abs(s2 / (10 * s1) - 1) < 1e-6);
});

// ---------------------------------------------------------------------------
// subsetCount
// ---------------------------------------------------------------------------

test('subsetCount: C(n, p)', () => {
  assert.equal(subsetCount(5, 2), 10);
  assert.equal(subsetCount(32, 3), 4960);
  assert.equal(subsetCount(10, 2), 45);
});

// ---------------------------------------------------------------------------
// exact enumeration — determinism & correctness
// ---------------------------------------------------------------------------

// Clean line y = 2 + 3x plus a few gross outliers; the S-estimate should
// recover the clean slope/intercept and not be dragged by the outliers.
function makeContaminated() {
  const x = [], y = [];
  for (let i = 0; i < 20; i++) {
    x.push(i * 0.5);
    y.push(2 + 3 * (i * 0.5));
  }
  // gross vertical outliers
  y[3] = 40; y[11] = -30; y[17] = 55;
  return { dm: x.map(xi => [1, xi]), y };
}

test('exact S: recovers the clean line under contamination', () => {
  const { dm, y } = makeContaminated();
  const r = sEstimate(dm, y);
  assert.ok(Math.abs(r.coef[1] - 3) < 1e-6, `slope=${r.coef[1]}`);
  assert.ok(Math.abs(r.coef[0] - 2) < 1e-6, `intercept=${r.coef[0]}`);
});

test('exact S: deterministic across runs', () => {
  const { dm, y } = makeContaminated();
  const a = sEstimate(dm, y);
  const b = sEstimate(dm, y);
  assert.deepEqual(a.coef, b.coef);
  assert.equal(a.scale, b.scale);
});

test('exact S: resists a high-leverage outlier (where OLS fails)', () => {
  // Clean line y = x, with one far-out leverage point pulling the OLS slope down.
  const x = [], y = [];
  for (let i = 0; i < 15; i++) { x.push(i); y.push(i); }
  x.push(50); y.push(-40);   // high-leverage bad point
  const dm = x.map(xi => [1, xi]);
  const r = sEstimate(dm, y);
  assert.ok(Math.abs(r.coef[1] - 1) < 1e-6, `slope=${r.coef[1]} should be ~1`);
});

// ---------------------------------------------------------------------------
// Fast-S — self-consistency with the exact path (JS-vs-JS; no R here)
// ---------------------------------------------------------------------------

test('Fast-S: matches exact enumeration on mid-sized data', () => {
  // Deterministic synthetic data with 15% outliers.
  let s = 7;
  const rand = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const x = [], y = [];
  const n = 120;
  for (let i = 0; i < n; i++) {
    const xi = rand() * 10;
    x.push(xi);
    y.push(i < n * 0.15 ? 30 + rand() * 20 : 2 + 3 * xi + (rand() - 0.5) * 2);
  }
  const dm = x.map(xi => [1, xi]);
  const exact = sEstimate(dm, y);
  const fast  = sEstimate(dm, y, { forceFastS: true, seed: 42 });
  // Fast-S should find essentially the same S-minimum (slope + scale).
  assert.ok(Math.abs(fast.coef[1] - exact.coef[1]) < 1e-2, `fast=${fast.coef[1]} exact=${exact.coef[1]}`);
  assert.ok(Math.abs(fast.scale / exact.scale - 1) < 5e-2, `fast=${fast.scale} exact=${exact.scale}`);
});

test('Fast-S: deterministic for a fixed seed', () => {
  const x = [], y = [];
  for (let i = 0; i < 60; i++) { x.push(i * 0.2); y.push(1 + 2 * i * 0.2); }
  y[10] = 50; y[40] = -30;
  const dm = x.map(xi => [1, xi]);
  const a = sEstimate(dm, y, { forceFastS: true, seed: 123 });
  const b = sEstimate(dm, y, { forceFastS: true, seed: 123 });
  assert.deepEqual(a.coef, b.coef);
  assert.equal(a.scale, b.scale);
});
