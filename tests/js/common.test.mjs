// tests/js/common.test.mjs
// Unit tests for stats/common.js pure functions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  arrayMedian, mean, stdev, rank,
  logGamma, incompleteBeta, normalCDF, zPValue, tPValue,
  skewnessKurtosis, residualize, residualizeWithStats,
  Z95,
} from '../../src/stats/common.js';

// ---------------------------------------------------------------------------
// arrayMedian
// ---------------------------------------------------------------------------

test('arrayMedian: odd-length array', () => {
  assert.equal(arrayMedian([3, 1, 2]), 2);
});

test('arrayMedian: even-length array averages middle two', () => {
  assert.equal(arrayMedian([4, 1, 3, 2]), 2.5);
});

test('arrayMedian: single element', () => {
  assert.equal(arrayMedian([42]), 42);
});

test('arrayMedian: does not mutate input', () => {
  const arr = [3, 1, 2];
  arrayMedian(arr);
  assert.deepEqual(arr, [3, 1, 2]);
});

// ---------------------------------------------------------------------------
// mean / stdev
// ---------------------------------------------------------------------------

test('mean: simple average', () => {
  assert.equal(mean([1, 2, 3, 4, 5]), 3);
});

test('mean: single value', () => {
  assert.equal(mean([7]), 7);
});

test('stdev: known standard deviation', () => {
  // [2, 4, 4, 4, 5, 5, 7, 9] → sd = 2 (population), Bessel-corrected ≈ 2.138
  const vals = [2, 4, 4, 4, 5, 5, 7, 9];
  const sd = stdev(vals);
  assert.ok(Math.abs(sd - 2.13809) < 0.001);
});

test('stdev: constant values → 0', () => {
  assert.equal(stdev([5, 5, 5, 5]), 0);
});

// ---------------------------------------------------------------------------
// rank
// ---------------------------------------------------------------------------

test('rank: distinct values', () => {
  // [10, 30, 20] → sorted order [10,20,30] → ranks [1,3,2]
  assert.deepEqual(rank([10, 30, 20]), [1, 3, 2]);
});

test('rank: tied values get average rank', () => {
  // [10, 20, 20, 30] → ranks [1, 2.5, 2.5, 4]
  assert.deepEqual(rank([10, 20, 20, 30]), [1, 2.5, 2.5, 4]);
});

test('rank: all same values', () => {
  assert.deepEqual(rank([5, 5, 5]), [2, 2, 2]);
});

test('rank: single value', () => {
  assert.deepEqual(rank([42]), [1]);
});

// ---------------------------------------------------------------------------
// logGamma
// ---------------------------------------------------------------------------

test('logGamma: Γ(1) = 0! = 1 → log = 0', () => {
  assert.ok(Math.abs(logGamma(1)) < 1e-12);
});

test('logGamma: Γ(5) = 4! = 24 → log ≈ 3.178', () => {
  assert.ok(Math.abs(logGamma(5) - Math.log(24)) < 1e-10);
});

test('logGamma: Γ(0.5) = √π → log ≈ 0.5723649', () => {
  assert.ok(Math.abs(logGamma(0.5) - Math.log(Math.sqrt(Math.PI))) < 1e-10);
});

test('logGamma: Γ(10) = 9! = 362880', () => {
  assert.ok(Math.abs(logGamma(10) - Math.log(362880)) < 1e-8);
});

// ---------------------------------------------------------------------------
// incompleteBeta
// ---------------------------------------------------------------------------

test('incompleteBeta: boundary x=0 → 0', () => {
  assert.equal(incompleteBeta(2, 3, 0), 0);
});

test('incompleteBeta: boundary x=1 → 1', () => {
  assert.equal(incompleteBeta(2, 3, 1), 1);
});

test('incompleteBeta: I(0.5; 1, 1) = 0.5 (uniform)', () => {
  assert.ok(Math.abs(incompleteBeta(1, 1, 0.5) - 0.5) < 1e-6);
});

test('incompleteBeta: I(0.5; 2, 2) = 0.5 (symmetric beta)', () => {
  assert.ok(Math.abs(incompleteBeta(2, 2, 0.5) - 0.5) < 1e-6);
});

test('incompleteBeta: I(0.3; 2, 5) ≈ 0.5798 (R: pbeta(0.3, 2, 5))', () => {
  assert.ok(Math.abs(incompleteBeta(2, 5, 0.3) - 0.57983) < 1e-4);
});

// ---------------------------------------------------------------------------
// normalCDF
// ---------------------------------------------------------------------------

test('normalCDF: Φ(0) ≈ 0.5', () => {
  assert.ok(Math.abs(normalCDF(0) - 0.5) < 1e-7);
});

test('normalCDF: Φ(1.96) ≈ 0.975', () => {
  assert.ok(Math.abs(normalCDF(1.96) - 0.97500) < 1e-4);
});

test('normalCDF: Φ(-1.96) ≈ 0.025', () => {
  assert.ok(Math.abs(normalCDF(-1.96) - 0.02500) < 1e-4);
});

test('normalCDF: Φ(3) ≈ 0.99865', () => {
  assert.ok(Math.abs(normalCDF(3) - 0.99865) < 1e-4);
});

// ---------------------------------------------------------------------------
// zPValue / tPValue
// ---------------------------------------------------------------------------

test('zPValue: z=0 → p≈1', () => {
  assert.ok(Math.abs(zPValue(0) - 1.0) < 1e-7);
});

test('zPValue: z=1.96 → p≈0.05', () => {
  assert.ok(Math.abs(zPValue(1.96) - 0.05) < 1e-3);
});

test('tPValue: t=0, any df → p=1', () => {
  assert.ok(Math.abs(tPValue(0, 10) - 1.0) < 1e-6);
});

test('tPValue: t=2.228, df=10 → p≈0.05 (R: 2*pt(-2.228, 10))', () => {
  assert.ok(Math.abs(tPValue(2.228, 10) - 0.05) < 1e-2);
});

test('tPValue: large df converges to normal', () => {
  // t=1.96, df=10000 should be close to zPValue(1.96)
  const pT = tPValue(1.96, 10000);
  const pZ = zPValue(1.96);
  assert.ok(Math.abs(pT - pZ) < 1e-3);
});

// ---------------------------------------------------------------------------
// Z95 constant
// ---------------------------------------------------------------------------

test('Z95 is consistent with normalCDF', () => {
  assert.ok(Math.abs(normalCDF(Z95) - 0.975) < 1e-6);
});

// ---------------------------------------------------------------------------
// skewnessKurtosis
// ---------------------------------------------------------------------------

test('skewnessKurtosis: symmetric distribution → skewness ≈ 0', () => {
  const vals = [-3, -2, -1, 0, 1, 2, 3];
  const { skewness } = skewnessKurtosis(vals);
  assert.ok(Math.abs(skewness) < 1e-10);
});

test('skewnessKurtosis: right-skewed data → positive skewness', () => {
  const vals = [1, 1, 1, 1, 1, 1, 1, 10];
  const { skewness } = skewnessKurtosis(vals);
  assert.ok(skewness > 0);
});

test('skewnessKurtosis: uniform-ish → negative excess kurtosis', () => {
  // Uniform has excess kurtosis = -1.2; discrete uniform approximation
  const vals = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const { kurtosis } = skewnessKurtosis(vals);
  assert.ok(kurtosis < 0);
});

test('skewnessKurtosis: fewer than 3 values → nulls', () => {
  const { skewness, kurtosis } = skewnessKurtosis([1, 2]);
  assert.equal(skewness, null);
  assert.equal(kurtosis, null);
});

// ---------------------------------------------------------------------------
// residualize
// ---------------------------------------------------------------------------

test('residualize: removes linear trend', () => {
  // y = 2*z + noise; after residualizing out z, residuals should have near-zero correlation with z
  const z = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const y = z.map(zi => 2 * zi + 0.1);
  const residuals = residualize(y, [z]);
  // Residuals should be near zero (perfect linear relationship)
  const maxResid = Math.max(...residuals.map(Math.abs));
  assert.ok(maxResid < 1e-10);
});

test('residualize: preserves residual structure', () => {
  // y = z + x_signal; after removing z, residuals should reflect x_signal
  const n = 20;
  const z = Array.from({ length: n }, (_, i) => i);
  const xSignal = Array.from({ length: n }, (_, i) => Math.sin(i));
  const y = z.map((zi, i) => zi + xSignal[i]);
  const residuals = residualize(y, [z]);
  // Residuals should correlate with xSignal
  const rMean = mean(residuals);
  const xMean = mean(xSignal);
  const cov = residuals.reduce((s, r, i) => s + (r - rMean) * (xSignal[i] - xMean), 0);
  assert.ok(cov > 0); // positive correlation preserved
});

// ---------------------------------------------------------------------------
// residualizeWithStats
// ---------------------------------------------------------------------------

test('residualizeWithStats: returns residuals and partialR2', () => {
  const z = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const y = z.map(zi => 3 * zi + 1);
  const result = residualizeWithStats(y, [z]);
  assert.ok(Array.isArray(result.residuals));
  assert.ok(Array.isArray(result.partialR2));
  assert.equal(result.partialR2.length, 1);
  // Perfect linear → partial R² should be ≈ 1
  assert.ok(result.partialR2[0] > 0.999);
});

test('residualizeWithStats: multiple nuisance variables', () => {
  const n = 30;
  const z1 = Array.from({ length: n }, (_, i) => i);
  const z2 = Array.from({ length: n }, (_, i) => i * i);
  const y = z1.map((v, i) => v + 0.5 * z2[i]);
  const result = residualizeWithStats(y, [z1, z2]);
  assert.equal(result.partialR2.length, 2);
  assert.ok(result.partialR2[0] > 0);
  assert.ok(result.partialR2[1] > 0);
});
