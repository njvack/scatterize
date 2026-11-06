// Tests for the typed-array regression kernel (src/stats/kernel.js) and the
// OLS / robust fits built on it. The pre-kernel implementations in
// tests/j./oracle/ are the oracle: on randomized inputs the new code must
// agree with them to tight tolerances. (R agreement is covered separately by
// tests/js/compare.mjs.)

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  designMatrix, qrDecompose, qrSolve, qrXtXInverse, residuals, wlsSolve,
  crossProducts, solveCrossProducts, RankDeficientError,
} from '../../src/stats/kernel.js';
import { ols } from '../../src/stats/ols.js';
import { robust, robustM } from '../../src/stats/robust.js';
import { partialR, partialRCI } from '../../src/stats/common.js';
import { ols as olsRef } from './oracle/ols.js';
import { robust as robustRef, robustM as robustMRef } from './oracle/robust.js';

// ── Helpers ─────────────────────────────────────────────────────────────────

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

function gaussian(rand) {
  return Math.sqrt(-2 * Math.log(rand() || 1e-300)) * Math.cos(2 * Math.PI * rand());
}

// Random regression dataset: correlated covariates, a few gross outliers,
// and an offset/scale per column so conditioning isn't trivially nice.
function dataset(seed, n, p, { outliers = 0.05 } = {}) {
  const rand = rng(seed);
  const g = () => gaussian(rand);
  const x = Array.from({ length: n }, () => 50 + 10 * g());
  const nuisance = Array.from({ length: p }, (_, j) =>
    x.map(xi => (j + 1) * 3 + 0.3 * (xi - 50) + 2 * g()));
  const y = x.map((xi, i) => {
    let v = 4 + 0.4 * xi + nuisance.reduce((s, c, j) => s + (j % 2 ? -0.5 : 0.7) * c[i], 0) + 3 * g();
    if (rand() < outliers) v += 40 * (rand() < 0.5 ? -1 : 1);
    return v;
  });
  return { x, y, nuisance };
}

function close(got, want, tol, label) {
  if (want == null) { assert.equal(got, want, label); return; }
  const scale = Math.max(1, Math.abs(want));
  assert.ok(Math.abs(got - want) <= tol * scale,
    `${label}: got ${got}, want ${want} (tol ${tol})`);
}

function closeArray(got, want, tol, label) {
  assert.equal(got.length, want.length, `${label}: length`);
  for (let i = 0; i < want.length; i++) close(got[i], want[i], tol, `${label}[${i}]`);
}

const OLS_FIELDS = ['slope', 'intercept', 'rSquared', 'adjRSquared', 'fullModelRSquared',
  'fStat', 'pF', 'seSlope', 'seIntercept', 'tSlope', 'tIntercept', 'pSlope', 'pIntercept',
  'n', 'dfResidual', 'xMean', 'sxx', 'sigma'];

const ROBUST_FIELDS = ['slope', 'intercept', 'seSlope', 'seIntercept', 'covIntSlope',
  'tSlope', 'tIntercept', 'pSlope', 'pIntercept', 'scale', 'n'];

// ── Kernel primitives ───────────────────────────────────────────────────────

test('designMatrix: column-major [1, x, ...nuisance]', () => {
  const { X, n, k } = designMatrix([10, 20, 30], [[1, 2, 3], [7, 8, 9]]);
  assert.equal(n, 3);
  assert.equal(k, 4);
  assert.deepEqual(Array.from(X), [1, 1, 1, 10, 20, 30, 1, 2, 3, 7, 8, 9]);
});

test('qrSolve: exact fit recovers coefficients', () => {
  const x = [1, 2, 3, 4, 5, 6];
  const z = [2, -1, 4, 0, 3, 1];
  const y = x.map((xi, i) => 3 - 2 * xi + 0.5 * z[i]);
  const { X, n, k } = designMatrix(x, [z]);
  const b = qrSolve(qrDecompose(X, n, k), y);
  closeArray(Array.from(b), [3, -2, 0.5], 1e-12, 'b');
  const r = residuals(X, n, k, y, b);
  for (const ri of r) assert.ok(Math.abs(ri) < 1e-12);
});

test('qrXtXInverse: equals the inverse of XᵀX', () => {
  const { x, nuisance } = dataset(7, 40, 3);
  const { X, n, k } = designMatrix(x, nuisance);
  const inv = qrXtXInverse(qrDecompose(X, n, k));
  const C = crossProducts(X, n, k, new Float64Array(n));
  const m = k + 1;
  for (let a = 0; a < k; a++) {
    for (let c = 0; c < k; c++) {
      let s = 0;
      for (let j = 0; j < k; j++) s += C[a * m + j] * inv[j * k + c];
      close(s, a === c ? 1 : 0, 1e-8, `(XᵀX)(XᵀX)⁻¹[${a}][${c}]`);
    }
  }
});

test('qrDecompose: collinear columns throw RankDeficientError', () => {
  const x = [1, 2, 3, 4, 5];
  const { X, n, k } = designMatrix(x, [x.map(v => 2 * v + 1)]);
  assert.throws(() => qrDecompose(X, n, k), RankDeficientError);
  const c = designMatrix(x, [[4, 4, 4, 4, 4]]);  // constant = intercept multiple
  assert.throws(() => qrDecompose(c.X, c.n, c.k), RankDeficientError);
});

test('wlsSolve: unit weights equal OLS; zero weights drop rows', () => {
  const { x, y, nuisance } = dataset(11, 30, 1);
  const { X, n, k } = designMatrix(x, nuisance);
  const bOls = qrSolve(qrDecompose(X, n, k), y);
  closeArray(Array.from(wlsSolve(X, n, k, y, new Float64Array(n).fill(1))), Array.from(bOls), 1e-10, 'b');

  const w = new Float64Array(n).fill(1);
  for (let i = 0; i < 5; i++) w[i] = 0;
  const sub = designMatrix(x.slice(5), nuisance.map(c => c.slice(5)));
  const bSub = qrSolve(qrDecompose(sub.X, sub.n, sub.k), y.slice(5));
  closeArray(Array.from(wlsSolve(X, n, k, y, w)), Array.from(bSub), 1e-10, 'b (dropped)');
});

test('crossProducts + solveCrossProducts: match QR on full and subset designs', () => {
  const { x, y, nuisance } = dataset(23, 120, 3);
  const { X, n, k } = designMatrix(x, nuisance);
  const C = crossProducts(X, n, k, y);
  const m = k + 1;

  const full = solveCrossProducts(C, m);
  const qr = qrDecompose(X, n, k);
  const b = qrSolve(qr, y);
  closeArray(Array.from(full.b), Array.from(b), 1e-8, 'b');
  closeArray(Array.from(full.inv), Array.from(qrXtXInverse(qr)), 1e-8, 'inv');
  const r = residuals(X, n, k, y, b);
  close(full.ssr, r.reduce((s, v) => s + v * v, 0), 1e-8, 'ssr');

  // Subset: intercept, x, third nuisance column only
  const cols = [0, 1, 4];
  const sub = solveCrossProducts(C, m, cols);
  const ref = ols(x, y, [nuisance[2]]);
  close(sub.b[1], ref.slope, 1e-8, 'subset slope');
  close(sub.ssr / (n - 3), ref.sigma ** 2, 1e-8, 'subset s²');
});

test('crossProducts: weights scale each row', () => {
  const { x, y } = dataset(5, 20, 0);
  const { X, n, k } = designMatrix(x);
  const w = Float64Array.from({ length: n }, (_, i) => (i % 3) + 0.5);
  const C = crossProducts(X, n, k, y, w);
  const b = solveCrossProducts(C, k + 1).b;
  closeArray(Array.from(b), Array.from(wlsSolve(X, n, k, y, w)), 1e-9, 'b');
});

test('solveCrossProducts: singular sub-block throws RankDeficientError', () => {
  const x = [1, 2, 3, 4, 5, 6];
  const { X, n, k } = designMatrix(x, [x.map(v => 3 * v)]);
  const C = crossProducts(X, n, k, x);
  assert.throws(() => solveCrossProducts(C, k + 1), RankDeficientError);
});

// ── Agreement with the reference implementations ────────────────────────────

test('ols: matches reference implementation on randomized data', () => {
  let cases = 0;
  for (let seed = 1; seed <= 60; seed++) {
    const n = 8 + ((seed * 37) % 300);
    const p = seed % 5;
    if (n <= p + 2) continue;
    const { x, y, nuisance } = dataset(seed, n, p);
    const got = ols(x, y, nuisance);
    const want = olsRef(x, y, nuisance);
    for (const f of OLS_FIELDS) close(got[f], want[f], 1e-9, `seed ${seed} ${f}`);
    closeArray(got.residuals, want.residuals, 1e-9, `seed ${seed} residuals`);
    if (p) closeArray(got.yResidual, want.yResidual, 1e-9, `seed ${seed} yResidual`);
    else assert.equal(got.yResidual, null);
    got.nuisanceStats.forEach((ns, i) => {
      for (const f of ['coef', 'se', 't', 'p', 'partialR2']) {
        close(ns[f], want.nuisanceStats[i][f], 1e-9, `seed ${seed} nuisance[${i}].${f}`);
      }
    });
    cases++;
  }
  assert.ok(cases >= 50);
});

test('robustM: matches reference implementation on randomized data', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const n = 12 + ((seed * 53) % 250);
    const p = seed % 4;
    const { x, y, nuisance } = dataset(seed, n, p, { outliers: 0.1 });
    const got = robustM(x, y, nuisance);
    const want = robustMRef(x, y, nuisance);
    for (const f of ROBUST_FIELDS) close(got[f], want[f], 1e-7, `seed ${seed} ${f}`);
    closeArray(got.weights, want.weights, 1e-7, `seed ${seed} weights`);
    closeArray(got.residuals, want.residuals, 1e-7, `seed ${seed} residuals`);
    got.nuisanceStats.forEach((ns, i) => {
      for (const f of ['coef', 'se', 't', 'p']) {
        close(ns[f], want.nuisanceStats[i][f], 1e-7, `seed ${seed} nuisance[${i}].${f}`);
      }
    });
  }
});

test('robust (MM): matches reference implementation on randomized data', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const n = 15 + ((seed * 7) % 30);
    const p = seed % 3;
    const { x, y, nuisance } = dataset(seed, n, p, { outliers: 0.15 });
    const got = robust(x, y, nuisance);
    const want = robustRef(x, y, nuisance);
    for (const f of ROBUST_FIELDS) close(got[f], want[f], 1e-7, `seed ${seed} ${f}`);
    closeArray(got.weights, want.weights, 1e-7, `seed ${seed} weights`);
  }
});

// ── Partial r ───────────────────────────────────────────────────────────────

test('partialR: sign follows t; magnitude is √(t²/(t²+df))', () => {
  close(partialR(2, 10), Math.sqrt(4 / 14), 1e-15, 'r');
  close(partialR(-2, 10), -Math.sqrt(4 / 14), 1e-15, 'r');
  assert.equal(partialR(0, 10), 0);
  assert.equal(partialR(NaN, 10), null);
  assert.equal(partialR(2, 0), null);
});

test('partialRCI: Fisher z interval, null when df < 2', () => {
  const [lo, hi] = partialRCI(0.3, 51);
  const z = Math.atanh(0.3), h = 1.959963984540054 / Math.sqrt(50);
  close(lo, Math.tanh(z - h), 1e-12, 'lo');
  close(hi, Math.tanh(z + h), 1e-12, 'hi');
  assert.ok(lo < 0.3 && hi > 0.3);
  assert.equal(partialRCI(0.3, 1), null);
  assert.equal(partialRCI(null, 30), null);
});

test('ols partialR equals the correlation of residualized x and y (FWL)', () => {
  const { x, y, nuisance } = dataset(99, 80, 2);
  const r = ols(x, y, nuisance);
  const resid = v => ols(nuisance[0], v, [nuisance[1]]).residuals;
  const ex = resid(x), ey = resid(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < ex.length; i++) { sxy += ex[i] * ey[i]; sxx += ex[i] ** 2; syy += ey[i] ** 2; }
  close(r.partialR, sxy / Math.sqrt(sxx * syy), 1e-9, 'partial r');
  assert.ok(r.partialRCI[0] < r.partialR && r.partialR < r.partialRCI[1]);
});

test('robust results report dfResidual and partial r', () => {
  const { x, y, nuisance } = dataset(3, 60, 1, { outliers: 0.1 });
  const r = robustM(x, y, nuisance);
  assert.equal(r.dfResidual, 57);
  close(r.partialR, partialR(r.tSlope, 57), 1e-15, 'partial r');
  assert.equal(r.partialRCI.length, 2);
});

test('robustM: starting from the OLS fit (opts.init) gives the same result', async () => {
  const { robustM } = await import('../../src/stats/robust.js');
  const { ols } = await import('../../src/stats/ols.js');
  const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const y = [1.2, 2.1, 2.8, 4.3, 5.1, 5.8, 7.2, 30, 9.1, 9.8];
  const c = [0.5, -1, 0.3, 0.9, -0.2, 0.1, -0.7, 0.4, 1.1, -0.6];
  const o = ols(x, y, [c]);
  const a = robustM(x, y, [c]);
  const b = robustM(x, y, [c], { init: [o.intercept, o.slope, o.nuisanceStats[0].coef] });
  assert.ok(Math.abs(a.slope - b.slope) < 1e-10);
  assert.ok(Math.abs(a.seSlope - b.seSlope) < 1e-10);
});
