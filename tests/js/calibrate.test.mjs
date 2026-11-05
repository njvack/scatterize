import { test } from 'node:test';
import assert from 'node:assert/strict';

import { calibrate, secondsPerFit, estimateSeconds, getCalibration,
         clearCalibrationCache, SLOW_SECONDS } from '../../src/stats/calibrate.js';

const fake = { n: 100, rates: { ols: { 0: 1000, 2: 500, 5: 250 }, robustM: { 0: 100 } } };

test('secondsPerFit: exact at measured points', () => {
  assert.equal(secondsPerFit(fake, 'ols', 0), 1 / 1000);
  assert.equal(secondsPerFit(fake, 'ols', 2), 1 / 500);
  assert.equal(secondsPerFit(fake, 'ols', 5), 1 / 250);
});

test('secondsPerFit: interpolates and extrapolates per-fit time linearly', () => {
  assert.ok(Math.abs(secondsPerFit(fake, 'ols', 1) - 0.0015) < 1e-12);
  // beyond 5: slope from (2, 0.002) to (5, 0.004) = 0.002/3 per covariate
  assert.ok(Math.abs(secondsPerFit(fake, 'ols', 8) - (0.004 + 0.002)) < 1e-12);
  // single measured point → constant
  assert.equal(secondsPerFit(fake, 'robustM', 4), 1 / 100);
  assert.throws(() => secondsPerFit(fake, 'mm', 0), /No calibration/);
});

test('estimateSeconds: scales with fits and divides across workers', () => {
  assert.equal(estimateSeconds(fake, { model: 'ols', p: 0, fits: 2000 }), 2);
  assert.equal(estimateSeconds(fake, { model: 'ols', p: 0, fits: 2000, workers: 4 }), 0.5);
  assert.ok(estimateSeconds(fake, { model: 'robustM', fits: 150 }) > SLOW_SECONDS);
});

test('calibrate: measures positive rates for each model and usable covariate count', () => {
  const c = calibrate({ n: 40, covariates: [0, 2, 50], budgetMs: 30 });
  assert.equal(c.n, 40);
  for (const model of ['ols', 'robustM']) {
    assert.deepEqual(Object.keys(c.rates[model]), ['0', '2']);  // 50 covariates > n, skipped
    for (const r of Object.values(c.rates[model])) assert.ok(r > 0 && Number.isFinite(r));
  }
});

test('calibrate: uses the injected clock', () => {
  let t = 0;
  const c = calibrate({ n: 30, covariates: [0], budgetMs: 20, now: () => (t += 1) });
  // each fit advances the clock by 1 ms; budget per measurement is 10 ms
  assert.ok(c.rates.ols[0] > 0);
});

test('getCalibration: memoized per n', () => {
  clearCalibrationCache();
  const a = getCalibration(25, { budgetMs: 10, covariates: [0] });
  const b = getCalibration(25, { budgetMs: 10, covariates: [0] });
  assert.equal(a, b);
  clearCalibrationCache();
  assert.notEqual(getCalibration(25, { budgetMs: 10, covariates: [0] }), a);
});
