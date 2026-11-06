// src/verse/evaluate.js
// Fit many scatterverse paths at once, sharing work between them.
//
// Sharing:
//   - Row sets. A path's rows depend only on its missing-value columns and its
//     filter steps (plan.rowKeys). Every prefix of that pipeline is cached, so
//     paths that share an exclusion or a Cook's D step compute it once.
//   - Cross-products. All OLS paths on the same row set share one centered
//     cross-product matrix over every column any of them uses (one O(n·m²)
//     pass). Each path is then a small Cholesky solve on its sub-block, whose
//     cost doesn't depend on n. Partial r comes from t.
//   - M paths can't share cross-products (their weights differ per row), so
//     they are fitted one by one, started from the OLS solution.
//
// The result of a path is the same as fitting it from scratch with ols() or
// robustM() (evaluatePlanReference below, the test oracle) to rounding.
//
// No DOM access; this is what regression workers run for scatterverse.

import { flagRows, applyFilters, columnTable, cooksDistances, residualWeights } from '../stats/filters.js';
import { solveCrossProducts } from '../stats/kernel.js';
import { ols } from '../stats/ols.js';
import { robustM } from '../stats/robust.js';
import { tPValue, partialR, partialRCI, signedZ, normalQuantile } from '../stats/common.js';
import { drawCounts } from './rng.js';

// ---------------------------------------------------------------------------
// Row sets
// ---------------------------------------------------------------------------

// Returns rowsFor(plan) → Int32Array of kept row indices (ascending), cached by
// pipeline prefix. Row sets with equal contents are interned to one array, so
// paths whose different pipelines keep the same rows (say, covariate subsets
// on data with no missing values) share cross-products.
export function createRowSets(ds) {
  const table = columnTable(ds);
  const cache = new Map();
  const interned = new Map();  // content hash → [Int32Array]
  const intern = rows => {
    let h = 0x811c9dc5 ^ rows.length;
    for (let i = 0; i < rows.length; i++) h = Math.imul(h ^ rows[i], 0x01000193);
    const bucket = interned.get(h);
    if (!bucket) { interned.set(h, [rows]); return rows; }
    for (const other of bucket) {
      if (other.length !== rows.length) continue;
      let same = true;
      for (let i = 0; i < rows.length; i++) if (other[i] !== rows[i]) { same = false; break; }
      if (same) return other;
    }
    bucket.push(rows);
    return rows;
  };
  return function rowsFor(plan) {
    let key = plan.rowKeys[0];
    let rows = cache.get(key);
    if (!rows) {
      const cols = plan.missing.map(c => ds.cols[c]);
      const out = [];
      for (let i = 0; i < ds.n; i++) {
        let ok = true;
        for (const a of cols) if (!Number.isFinite(a[i])) { ok = false; break; }
        if (ok) out.push(i);
      }
      rows = intern(Int32Array.from(out));
      cache.set(key, rows);
    }
    for (let s = 0; s < plan.steps.length; s++) {
      key += '|' + plan.rowKeys[s + 1];
      let next = cache.get(key);
      if (!next) {
        const step = plan.steps[s];
        const flags = flagRows(table, rows, step, step.model ?? null);
        next = intern(rows.filter((_, i) => !flags[i]));
        cache.set(key, next);
      }
      rows = next;
    }
    return rows;
  };
}

// ---------------------------------------------------------------------------
// Cross-products
// ---------------------------------------------------------------------------

// Centered (weighted) cross-products of `names` over `rows`. Two passes
// (means, then products) keep precision without a global rescale.
// w: optional per-row weights indexed by row number (bootstrap counts).
// Returns { C (row-major m×m), means, index: Map name → j, n: Σw }.
function crossProductsOn(ds, rows, names, w = null) {
  const m = names.length;
  const cols = names.map(c => ds.cols[c]);
  const means = new Float64Array(m);
  let n = 0;
  for (let t = 0; t < rows.length; t++) {
    const i = rows[t];
    const wi = w ? w[i] : 1;
    if (!wi) continue;
    n += wi;
    for (let j = 0; j < m; j++) means[j] += wi * cols[j][i];
  }
  for (let j = 0; j < m; j++) means[j] /= n;
  const C = new Float64Array(m * m);
  const d = new Float64Array(m);
  for (let t = 0; t < rows.length; t++) {
    const i = rows[t];
    const wi = w ? w[i] : 1;
    if (!wi) continue;
    for (let j = 0; j < m; j++) d[j] = cols[j][i] - means[j];
    for (let a = 0; a < m; a++) {
      const da = wi * d[a];
      for (let b = a; b < m; b++) C[a * m + b] += da * d[b];
    }
  }
  for (let a = 0; a < m; a++) for (let b = 0; b < a; b++) C[a * m + b] = C[b * m + a];
  return { C, means, index: new Map(names.map((c, j) => [c, j])), n };
}

// OLS slope for x in y ~ x + covariates from a shared cross-product matrix.
// nullSlope forces the null for the bootstrap: y* = y − nullSlope·x, so only
// the y row/column of the sub-block changes.
// Returns { coef: [b_x, ...b_cov], inv, ssr, n, k, df } or throws.
function solvePath(cp, plan, nullSlope = 0) {
  const { C, index } = cp;
  const m = Math.sqrt(C.length);
  const idx = [plan.x, ...plan.covariates].map(c => index.get(c));
  const yi = index.get(plan.y);
  const xi = idx[0];
  const q = idx.length;
  const S = new Float64Array((q + 1) * (q + 1));
  const at = (a, b) => C[a * m + b];
  for (let a = 0; a < q; a++) {
    for (let b = 0; b < q; b++) S[a * (q + 1) + b] = at(idx[a], idx[b]);
    const v = at(idx[a], yi) - nullSlope * at(idx[a], xi);
    S[a * (q + 1) + q] = v;
    S[q * (q + 1) + a] = v;
  }
  S[q * (q + 1) + q] = at(yi, yi) - 2 * nullSlope * at(xi, yi) + nullSlope * nullSlope * at(xi, xi);
  const { b, inv, ssr } = solveCrossProducts(S, q + 1);
  const k = q + 1;  // + intercept
  return { coef: b, inv, ssr: Math.max(0, ssr), n: cp.n, k, df: cp.n - k };
}

function saturatedError(n, k) {
  return `saturated model — ${n} points with ${k} parameters leaves no residual degrees of freedom`;
}

// Summary numbers from an OLS solve.
function olsSummary(sol) {
  const { coef, inv, ssr, df } = sol;
  const s2 = ssr / df;
  const se = Math.sqrt(inv[0] * s2);
  const t = coef[0] / se;
  const p = tPValue(Math.abs(t), df);
  const r = partialR(t, df);
  return { estimate: coef[0], se, t, p, z: signedZ(t, p), partialR: r, ci: partialRCI(r, df) };
}

// ---------------------------------------------------------------------------
// Diagnostics
// ---------------------------------------------------------------------------

// Filliben's probability-plot correlation: the correlation between sorted
// residuals and normal order-statistic medians. 1 = perfectly normal.
export function filliben(resid) {
  const n = resid.length;
  if (n < 3) return null;
  const e = Float64Array.from(resid).sort();
  const last = 0.5 ** (1 / n);
  const m = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    const u = i === 0 ? 1 - last : i === n - 1 ? last : (i + 1 - 0.3175) / (n + 0.365);
    m[i] = normalQuantile(u);
  }
  let se = 0, sm = 0;
  for (let i = 0; i < n; i++) { se += e[i]; sm += m[i]; }
  const me = se / n, mm = sm / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    const a = e[i] - me, b = m[i] - mm;
    sxy += a * b; sxx += a * a; syy += b * b;
  }
  return sxx > 0 ? sxy / Math.sqrt(sxx * syy) : null;
}

// Diagnostics for a fitted path: Filliben r, max Cook's D, and for M the
// share of rows downweighted below 0.5 and the share rejected (weight 0).
// Robust residuals are heavy-tailed by design, so Filliben r is only
// comparable between paths with the same estimator.
function pathDiagnostics(x, y, covs, coef, weights) {
  const n = x.length;
  const resid = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let f = coef[0] + coef[1] * x[i];
    for (let j = 0; j < covs.length; j++) f += coef[j + 2] * covs[j][i];
    resid[i] = y[i] - f;
  }
  const D = cooksDistances(x, y, covs, { fit: { coef, weights } });
  let maxCooks = 0;
  for (let i = 0; i < n; i++) if (D[i] > maxCooks) maxCooks = D[i];
  const out = { filliben: filliben(resid), maxCooks };
  if (weights) {
    let low = 0, zero = 0;
    for (let i = 0; i < n; i++) { if (weights[i] < 0.5) low++; if (weights[i] === 0) zero++; }
    out.downweighted = low / n;
    out.rejected = zero / n;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

function gather(ds, rows, name) {
  const a = ds.cols[name];
  const out = new Float64Array(rows.length);
  for (let t = 0; t < rows.length; t++) out[t] = a[rows[t]];
  return out;
}

function errorResult(plan, err, n = null) {
  return { key: plan.key, ok: false, error: err?.message ?? String(err), n };
}

// Group plans by row set (identity of the cached Int32Array) and collect the
// columns each group needs.
function groupByRows(plans, rowsFor) {
  const groups = new Map();
  for (const plan of plans) {
    const rows = rowsFor(plan);
    let g = groups.get(rows);
    if (!g) { g = { rows, plans: [], names: new Set() }; groups.set(rows, g); }
    g.plans.push(plan);
    g.names.add(plan.y);
    g.names.add(plan.x);
    plan.covariates.forEach(c => g.names.add(c));
  }
  return [...groups.values()];
}

// Fit every plan. ds: { n, cols, flags } (dataset.js). Returns results in plan
// order: { key, ok: true, estimator, estimate, se, t, p, z, partialR, ci,
// n, df, k, diagnostics? } or { key, ok: false, error, n }.
// opts.diagnostics adds per-path diagnostics (an O(n·k²) pass per path).
export function evaluatePlans(ds, plans, { diagnostics = false } = {}) {
  const rowsFor = createRowSets(ds);
  const out = new Map();
  for (const g of groupByRows(plans, rowsFor)) {
    const names = [...g.names];
    let cp = null;
    for (const plan of g.plans) {
      const n = g.rows.length;
      const k = plan.covariates.length + 2;
      if (n - k <= 0) { out.set(plan, errorResult(plan, saturatedError(n, k), n)); continue; }
      try {
        cp ??= crossProductsOn(ds, g.rows, names);
        const sol = solvePath(cp, plan);
        const slopes = sol.coef;
        let intercept = cp.means[cp.index.get(plan.y)];
        intercept -= slopes[0] * cp.means[cp.index.get(plan.x)];
        plan.covariates.forEach((c, j) => { intercept -= slopes[j + 1] * cp.means[cp.index.get(c)]; });
        const olsCoef = [intercept, ...slopes];

        if (plan.estimator === 'm') {
          const x = gather(ds, g.rows, plan.x);
          const y = gather(ds, g.rows, plan.y);
          const covs = plan.covariates.map(c => gather(ds, g.rows, c));
          const fit = robustM(x, y, covs, { init: olsCoef });
          const res = mResult(plan, fit);
          if (diagnostics) {
            const coef = [fit.intercept, fit.slope, ...fit.nuisanceStats.map(s => s.coef)];
            res.diagnostics = pathDiagnostics(x, y, covs, coef, residualWeights(fit));
          }
          out.set(plan, res);
        } else {
          const res = { key: plan.key, ok: true, estimator: 'ols', ...olsSummary(sol), n, df: sol.df, k };
          if (diagnostics) {
            const x = gather(ds, g.rows, plan.x);
            const y = gather(ds, g.rows, plan.y);
            const covs = plan.covariates.map(c => gather(ds, g.rows, c));
            res.diagnostics = pathDiagnostics(x, y, covs, olsCoef, null);
          }
          out.set(plan, res);
        }
      } catch (err) {
        out.set(plan, errorResult(plan, err, n));
      }
    }
  }
  return plans.map(p => out.get(p));
}

function mResult(plan, fit) {
  return {
    key: plan.key, ok: true, estimator: 'm',
    estimate: fit.slope, se: fit.seSlope, t: fit.tSlope, p: fit.pSlope,
    // zPValue uses the normal approximation, so the robust t already is z.
    z: Math.sign(fit.tSlope) * Math.min(38, Math.abs(fit.tSlope)),
    partialR: fit.partialR, ci: fit.partialRCI,
    n: fit.n, df: fit.dfResidual, k: plan.covariates.length + 2,
  };
}

// ---------------------------------------------------------------------------
// Reference (test oracle)
// ---------------------------------------------------------------------------

// Fit one plan from scratch on row objects with the general-purpose
// ols()/robustM() and applyFilters(), with no sharing. Slow; used to check
// evaluatePlans and as the synchronous model in concurrency tests.
export function evaluatePlanReference(data, plan, { diagnostics = false } = {}) {
  let rows = [];
  for (let i = 0; i < data.length; i++) {
    if (plan.missing.every(c => typeof data[i][c] === 'number' && Number.isFinite(data[i][c]))) rows.push(i);
  }
  for (const step of plan.steps) rows = applyFilters(data, rows, [step], step.model ?? null).rows;
  const n = rows.length;
  const k = plan.covariates.length + 2;
  if (n - k <= 0) return errorResult(plan, saturatedError(n, k), n);
  const x = rows.map(i => data[i][plan.x]);
  const y = rows.map(i => data[i][plan.y]);
  const covs = plan.covariates.map(c => rows.map(i => data[i][c]));
  try {
    if (plan.estimator === 'm') {
      const fit = robustM(x, y, covs);
      const res = mResult(plan, fit);
      if (diagnostics) {
        const coef = [fit.intercept, fit.slope, ...fit.nuisanceStats.map(s => s.coef)];
        res.diagnostics = pathDiagnostics(x, y, covs, coef, residualWeights(fit));
      }
      return res;
    }
    const fit = ols(x, y, covs);
    const res = {
      key: plan.key, ok: true, estimator: 'ols',
      estimate: fit.slope, se: fit.seSlope, t: fit.tSlope, p: fit.pSlope,
      z: signedZ(fit.tSlope, fit.pSlope),
      partialR: fit.partialR, ci: fit.partialRCI, n, df: fit.dfResidual, k,
    };
    if (diagnostics) {
      const coef = [fit.intercept, fit.slope, ...fit.nuisanceStats.map(s => s.coef)];
      res.diagnostics = pathDiagnostics(x, y, covs, coef, null);
    }
    return res;
  } catch (err) {
    return errorResult(plan, err, n);
  }
}

// ---------------------------------------------------------------------------
// Forced-null bootstrap (Simonsohn, Simmons & Nelson 2020)
// ---------------------------------------------------------------------------

// For each draw d in [start, start + count): resample rows with replacement
// (rng.drawCounts(seed, d, n), shared by every path so the draw is one
// coherent alternative dataset), force the null in each path by replacing y
// with y − b̂·x (b̂ = that path's observed estimate), and refit.
//
// Row sets are held at their observed values: exclusions and outlier rules
// are not re-run on each resample.
//
// OLS paths share weighted cross-products per row set and draw; forcing the
// null only changes the y row of each sub-block. M paths refit by IRLS on the
// resampled rows (slow; the scheduler runs them last).
//
// estimates[i] is plan i's observed estimate (NaN → the path is skipped).
// Returns { r, z }: Float32Arrays of length plans.length × count, laid out
// plan-major (index i·count + (d − start)); NaN where a draw's fit failed.
export function bootstrapPlans(ds, plans, estimates, { seed, start = 0, count }) {
  const rowsFor = createRowSets(ds);
  const P = plans.length;
  const r = new Float32Array(P * count).fill(NaN);
  const z = new Float32Array(P * count).fill(NaN);
  const pos = new Map(plans.map((p, i) => [p, i]));
  const groups = groupByRows(plans.filter((_, i) => Number.isFinite(estimates[i])), rowsFor);

  for (let d = 0; d < count; d++) {
    const w = drawCounts(seed, start + d, ds.n);
    for (const g of groups) {
      const names = [...g.names];
      let cp = null;
      for (const plan of g.plans) {
        const i = pos.get(plan);
        const b0 = estimates[i];
        try {
          let t, df;
          if (plan.estimator === 'm') {
            ({ t, df } = mDraw(ds, g.rows, plan, b0, w));
          } else {
            cp ??= crossProductsOn(ds, g.rows, names, w);
            const sol = solvePath(cp, plan, b0);
            if (!(sol.df > 0)) continue;
            const s = olsSummary(sol);
            t = s.t; df = sol.df;
            z[i * count + d] = s.z;
            r[i * count + d] = s.partialR;
            continue;
          }
          r[i * count + d] = partialR(t, df);
          z[i * count + d] = Math.sign(t) * Math.min(38, Math.abs(t));
        } catch {
          // Leave NaN: this resample can't be fitted for this path.
        }
      }
    }
  }
  return { r, z };
}

// One M fit on a resample: rows repeated by their counts, null forced.
function mDraw(ds, rows, plan, b0, w) {
  let m = 0;
  for (let t = 0; t < rows.length; t++) m += w[rows[t]];
  const xa = ds.cols[plan.x], ya = ds.cols[plan.y];
  const ca = plan.covariates.map(c => ds.cols[c]);
  const x = new Float64Array(m), y = new Float64Array(m);
  const covs = ca.map(() => new Float64Array(m));
  let u = 0;
  for (let t = 0; t < rows.length; t++) {
    const i = rows[t];
    for (let c = 0; c < w[i]; c++, u++) {
      x[u] = xa[i];
      y[u] = ya[i] - b0 * xa[i];
      for (let j = 0; j < ca.length; j++) covs[j][u] = ca[j][i];
    }
  }
  const fit = robustM(x, y, covs);
  return { t: fit.tSlope, df: fit.dfResidual };
}
