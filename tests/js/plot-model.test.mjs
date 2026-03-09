// tests/js/plot-model.test.mjs
// Unit tests for plot/plot-model.js pure functions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  fmtNum, fiveNum, scaledPointR, computeKDE, computeBand, buildColorOf,
  POINT_R, POINT_R_MIN, MODEL_DISPLAY_NAMES,
} from '../../src/plot/plot-model.js';

// ---------------------------------------------------------------------------
// fmtNum
// ---------------------------------------------------------------------------

test('fmtNum: null → empty string', () => {
  assert.equal(fmtNum(null), '');
});

test('fmtNum: NaN → empty string', () => {
  assert.equal(fmtNum(NaN), '');
});

test('fmtNum: Infinity → empty string', () => {
  assert.equal(fmtNum(Infinity), '');
});

test('fmtNum: zero → "0"', () => {
  assert.equal(fmtNum(0), '0');
});

test('fmtNum: integer', () => {
  assert.equal(fmtNum(42), '42');
});

test('fmtNum: drops trailing zeros', () => {
  // 1.200 → "1.2"
  assert.equal(fmtNum(1.200), '1.2');
});

test('fmtNum: limits to 4 significant figures', () => {
  assert.equal(fmtNum(3.14159), '3.142');
});

test('fmtNum: large numbers use exponential', () => {
  const result = fmtNum(12345);
  assert.ok(result.includes('e'), `expected exponential, got "${result}"`);
});

test('fmtNum: very small numbers use exponential', () => {
  const result = fmtNum(0.0001);
  assert.ok(result.includes('e'), `expected exponential, got "${result}"`);
});

test('fmtNum: negative number', () => {
  assert.equal(fmtNum(-2.5), '-2.5');
});

// ---------------------------------------------------------------------------
// fiveNum
// ---------------------------------------------------------------------------

test('fiveNum: returns [min, q1, median, q3, max]', () => {
  const result = fiveNum([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.equal(result.length, 5);
  assert.equal(result[0], 1);   // min
  assert.equal(result[4], 10);  // max
});

test('fiveNum: median of odd-length array', () => {
  const result = fiveNum([1, 2, 3, 4, 5]);
  assert.equal(result[2], 3);  // median
});

test('fiveNum: single element → all same', () => {
  const result = fiveNum([42]);
  assert.deepEqual(result, [42, 42, 42, 42, 42]);
});

test('fiveNum: two elements', () => {
  const result = fiveNum([1, 10]);
  assert.equal(result[0], 1);
  assert.equal(result[4], 10);
});

test('fiveNum: unsorted input', () => {
  const result = fiveNum([5, 3, 1, 4, 2]);
  assert.equal(result[0], 1);
  assert.equal(result[4], 5);
  assert.equal(result[2], 3);  // median
});

test('fiveNum: does not mutate input', () => {
  const arr = [5, 3, 1, 4, 2];
  fiveNum(arr);
  assert.deepEqual(arr, [5, 3, 1, 4, 2]);
});

// ---------------------------------------------------------------------------
// scaledPointR
// ---------------------------------------------------------------------------

test('scaledPointR: small n returns full POINT_R', () => {
  assert.equal(scaledPointR(10), POINT_R);
  assert.equal(scaledPointR(50), POINT_R);
});

test('scaledPointR: large n returns smaller radius', () => {
  assert.ok(scaledPointR(500) < POINT_R);
  assert.ok(scaledPointR(2000) < scaledPointR(500));
});

test('scaledPointR: never goes below POINT_R_MIN', () => {
  assert.ok(scaledPointR(1000000) >= POINT_R_MIN);
});

test('scaledPointR: monotonically decreasing', () => {
  const sizes = [10, 50, 100, 200, 500, 1000, 5000];
  for (let i = 1; i < sizes.length; i++) {
    assert.ok(scaledPointR(sizes[i]) <= scaledPointR(sizes[i - 1]));
  }
});

// ---------------------------------------------------------------------------
// computeKDE
// ---------------------------------------------------------------------------

test('computeKDE: returns array of {v, density} objects', () => {
  const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const result = computeKDE(vals, 0, 11);
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0);
  assert.ok('v' in result[0]);
  assert.ok('density' in result[0]);
});

test('computeKDE: all densities are non-negative', () => {
  const vals = [1, 2, 3, 4, 5];
  const result = computeKDE(vals, 0, 6);
  assert.ok(result.every(d => d.density >= 0));
});

test('computeKDE: density peaks near the data center', () => {
  const vals = Array.from({ length: 100 }, () => 5 + (Math.random() - 0.5) * 0.01);
  const result = computeKDE(vals, 0, 10);
  const peak = result.reduce((best, d) => d.density > best.density ? d : best, result[0]);
  assert.ok(Math.abs(peak.v - 5) < 2, `peak at ${peak.v}, expected near 5`);
});

test('computeKDE: grid spans the requested domain', () => {
  const vals = [1, 2, 3];
  const result = computeKDE(vals, 0, 10);
  assert.ok(Math.abs(result[0].v - 0) < 0.1);
  assert.ok(Math.abs(result[result.length - 1].v - 10) < 0.1);
});

// ---------------------------------------------------------------------------
// computeBand
// ---------------------------------------------------------------------------

test('computeBand: OLS CI band with valid parameters', () => {
  const r = {
    slope: 2, intercept: 1,
    sigma: 0.5, xMean: 5, sxx: 82.5, n: 20,
  };
  const band = computeBand(r, 'ols', [0, 10], 11);
  assert.ok(Array.isArray(band));
  assert.equal(band.length, 11);
  // At each point: lo < yhat < hi
  for (const { x, lo, hi } of band) {
    const yhat = r.intercept + r.slope * x;
    assert.ok(lo < yhat, `lo=${lo} should be < yhat=${yhat} at x=${x}`);
    assert.ok(hi > yhat, `hi=${hi} should be > yhat=${yhat} at x=${x}`);
  }
});

test('computeBand: OLS band is narrowest at xMean', () => {
  const r = {
    slope: 1, intercept: 0,
    sigma: 1, xMean: 5, sxx: 100, n: 50,
  };
  const band = computeBand(r, 'ols', [0, 10], 101);
  // Find the narrowest band point
  let minWidth = Infinity, minX = null;
  for (const { x, lo, hi } of band) {
    const w = hi - lo;
    if (w < minWidth) { minWidth = w; minX = x; }
  }
  assert.ok(Math.abs(minX - 5) < 0.2, `narrowest at x=${minX}, expected near 5`);
});

test('computeBand: Theil-Sen band with CIs', () => {
  const r = {
    slope: 1.5, intercept: 2,
    slopeCILow: 1.0, slopeCIHigh: 2.0,
  };
  const band = computeBand(r, 'theilsen', [0, 10], 5);
  assert.ok(Array.isArray(band));
  assert.equal(band.length, 5);
  // At x=0: lo = 2 + 1.0*0 = 2, hi = 2 + 2.0*0 = 2
  assert.ok(Math.abs(band[0].lo - 2) < 1e-10);
  assert.ok(Math.abs(band[0].hi - 2) < 1e-10);
});

test('computeBand: returns null for spearman', () => {
  assert.equal(computeBand({ rho: 0.8 }, 'spearman', [0, 10], 10), null);
});

test('computeBand: returns null for null result', () => {
  assert.equal(computeBand(null, 'ols', [0, 10], 10), null);
});

test('computeBand: Robust band with covIntSlope', () => {
  const r = {
    slope: 1, intercept: 0,
    seSlope: 0.1, seIntercept: 0.5, covIntSlope: -0.02, n: 30,
  };
  const band = computeBand(r, 'robust', [0, 10], 5);
  assert.ok(Array.isArray(band));
  for (const { x, lo, hi } of band) {
    const yhat = r.intercept + r.slope * x;
    assert.ok(lo < yhat);
    assert.ok(hi > yhat);
  }
});

// ---------------------------------------------------------------------------
// buildColorOf
// ---------------------------------------------------------------------------

test('buildColorOf: no groups → fallback color', () => {
  const points = [
    { group: null }, { group: null },
  ];
  const colorOf = buildColorOf(points, 'categorical', '#abc');
  assert.equal(colorOf(points[0]), '#abc');
});

test('buildColorOf: categorical groups → distinct colors', () => {
  const points = [
    { group: 'A' }, { group: 'B' }, { group: 'A' },
  ];
  const colorOf = buildColorOf(points, 'categorical', '#abc');
  const colorA = colorOf(points[0]);
  const colorB = colorOf(points[1]);
  assert.notEqual(colorA, colorB);
  assert.equal(colorOf(points[0]), colorOf(points[2]));  // same group → same color
});

test('buildColorOf: continuous groups → sequential scale', () => {
  const points = [
    { group: 1 }, { group: 5 }, { group: 10 },
  ];
  const colorOf = buildColorOf(points, 'continuous', '#abc');
  const c1 = colorOf(points[0]);
  const c2 = colorOf(points[2]);
  assert.notEqual(c1, c2);  // different values → different colors
});

test('buildColorOf: null group → fallback even with groups present', () => {
  const points = [
    { group: 'A' }, { group: null },
  ];
  const colorOf = buildColorOf(points, 'categorical', '#abc');
  assert.equal(colorOf(points[1]), '#abc');
});

// ---------------------------------------------------------------------------
// MODEL_DISPLAY_NAMES
// ---------------------------------------------------------------------------

test('MODEL_DISPLAY_NAMES: has all four model keys', () => {
  assert.equal(MODEL_DISPLAY_NAMES.ols, 'OLS');
  assert.equal(MODEL_DISPLAY_NAMES.robust, 'Robust');
  assert.equal(MODEL_DISPLAY_NAMES.spearman, 'Spearman');
  assert.equal(MODEL_DISPLAY_NAMES.theilsen, 'Theil-Sen');
});
