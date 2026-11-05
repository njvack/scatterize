// src/stats/calibrate.js
// In-browser speed calibration: how many regressions per second this machine
// runs at the loaded n, for OLS and robust M at a few covariate counts.
// Used to estimate what a set of fits will cost (e.g. to note when adding a
// scatterverse fork would take more than SLOW_SECONDS), and to decide whether a
// fit belongs in a worker.
//
// The run takes budgetMs (default 200 ms) of busy CPU, so pages should run it in
// a worker (the 'calibrate' op in worker-handler.js) rather than on the main
// thread: getCalibrationInPool() does that and memoizes per n for the session.
// getCalibration() is the synchronous equivalent, for Node and tests.
// Synthetic data is deterministic, so results vary only with the machine and
// its load.

import { ols } from './ols.js';
import { robustM } from './robust.js';

export const SLOW_SECONDS = 1;
export const CALIBRATION_MODELS = { ols, robustM };
const DEFAULT_COVARIATES = [0, 2, 5];

function syntheticData(n, p) {
  let seed = 12345;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const gauss = () => Math.sqrt(-2 * Math.log(rand())) * Math.cos(2 * Math.PI * rand());
  const x = Array.from({ length: n }, gauss);
  const nuisance = Array.from({ length: p }, () => x.map(xi => 0.3 * xi + gauss()));
  const y = x.map((xi, i) => 0.4 * xi + nuisance.reduce((s, c) => s + 0.2 * c[i], 0)
    + (rand() < 0.05 ? 6 : 1) * gauss());
  return { x, y, nuisance };
}

const defaultNow = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Measure fits/second. Returns { n, rates: { ols: { [p]: perSec }, robustM: {...} } }.
export function calibrate({ n, covariates = DEFAULT_COVARIATES, budgetMs = 200, now = defaultNow } = {}) {
  const models = Object.keys(CALIBRATION_MODELS);
  const usable = covariates.filter(p => n > p + 3);
  const per = budgetMs / Math.max(1, models.length * usable.length);
  const rates = {};
  for (const name of models) {
    const fn = CALIBRATION_MODELS[name];
    rates[name] = {};
    for (const p of usable) {
      const { x, y, nuisance } = syntheticData(n, p);
      fn(x, y, nuisance);  // warm up
      let count = 0;
      const t0 = now();
      let t;
      do { fn(x, y, nuisance); count++; t = now() - t0; } while (t < per);
      rates[name][p] = count / (Math.max(t, 1e-3) / 1000);
    }
  }
  return { n, rates };
}

// Seconds per fit at covariate count p, interpolating linearly in per-fit time
// between measured counts and extrapolating from the last two beyond them.
export function secondsPerFit(calibration, model, p) {
  const table = calibration.rates[model];
  if (!table) throw new Error(`No calibration for model: ${model}`);
  const pts = Object.keys(table).map(Number).sort((a, b) => a - b)
    .map(q => [q, 1 / table[q]]);
  if (!pts.length) return Infinity;
  if (pts.length === 1) return pts[0][1];
  let i = pts.findIndex(([q]) => q >= p);
  if (i === -1) i = pts.length - 1;
  if (i === 0) i = 1;
  const [q0, t0] = pts[i - 1];
  const [q1, t1] = pts[i];
  return Math.max(0, t0 + (t1 - t0) * (p - q0) / (q1 - q0));
}

// Estimated wall time for `fits` fits of `model` with p covariates, spread
// over `workers` parallel workers.
export function estimateSeconds(calibration, { model, p = 0, fits = 1, workers = 1 }) {
  return secondsPerFit(calibration, model, p) * fits / Math.max(1, workers);
}

const memo = new Map();

// Memoized calibration for this session, keyed by n.
export function getCalibration(n, opts = {}) {
  if (!memo.has(n)) memo.set(n, calibrate({ ...opts, n }));
  return memo.get(n);
}

const poolMemo = new Map();

// Memoized calibration run as a 'calibrate' job on a regression pool (see
// pool.js), so the busy loop stays off the main thread. Returns a Promise.
// A failed run is not cached.
export function getCalibrationInPool(pool, n, opts = {}) {
  if (!poolMemo.has(n)) {
    const p = pool.run('calibrate', { ...opts, n });
    p.catch(() => poolMemo.delete(n));
    poolMemo.set(n, p);
  }
  return poolMemo.get(n);
}

export function clearCalibrationCache() {
  memo.clear();
  poolMemo.clear();
}
