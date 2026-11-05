// src/stats/filters.js
// Rule-based row exclusion: boolean exclusion columns and outlier rules.
//
// A filter pipeline is an ordered list of plain-data steps (so it can live in a
// URL). Steps run in order over a set of candidate row indices, and each step
// sees only the rows kept by the steps before it — so order matters: a z-score
// rule computes its mean and SD on the rows that survive earlier exclusions.
//
// Step shapes:
//   { type: 'exclude',     column }                   drop rows whose flag is truthy
//   { type: 'z',           columns, threshold }       drop if |z| > threshold in any column
//   { type: 'mad',         columns, threshold }       drop if |x − median| / (1.4826·MAD) > threshold
//   { type: 'mahalanobis', columns, threshold }       drop if squared Mahalanobis distance > threshold
//   { type: 'cooks',       threshold, perN? }         drop if Cook's D > threshold (threshold / n when perN)
//
// Cook's D depends on a model: it fits OLS of model.y on model.x plus
// model.nuisance over the rows still kept, flags, and later fits use the rows
// that remain. Rows whose value is missing (non-finite) in a rule's columns
// are left alone by that rule; dropping rows for missingness is the caller's
// job, before or between steps.
//
// No DOM access; runs unchanged in a Web Worker.

import { designMatrix, qrDecompose, qrSolve, qrXtXInverse, residuals,
         crossProducts, solveCrossProducts } from './kernel.js';

const MAD_CONSISTENCY = 1.4826;  // makes the MAD a consistent SD estimate under normality

// Flag values that mean "exclude this row". Everything else (false, 0, '',
// null, NaN, 'no', ...) keeps the row.
const TRUTHY = new Set(['true', 't', 'yes', 'y', '1']);
export function isTruthyFlag(v) {
  if (v === true) return true;
  if (typeof v === 'number') return v !== 0 && Number.isFinite(v);
  if (typeof v === 'string') return TRUTHY.has(v.trim().toLowerCase());
  return false;
}

// Run a filter pipeline.
// data:  array of row objects (column name → value), as parsed from the CSV
// rows:  candidate row indices (into data) to start from
// steps: ordered filter steps (see above)
// model: { x, y, nuisance = [] } column names; needed only by 'cooks'
// Returns { rows, steps } — the kept row indices, and per step the indices it
// excluded ({ type, excluded }).
export function applyFilters(data, rows, steps, model = null) {
  let kept = Array.from(rows);
  const report = [];
  for (const step of steps) {
    const flag = flagRows(data, kept, step, model);
    const excluded = [];
    const next = [];
    for (let i = 0; i < kept.length; i++) (flag[i] ? excluded : next).push(kept[i]);
    report.push({ type: step.type, excluded });
    kept = next;
  }
  return { rows: kept, steps: report };
}

// Boolean flags (parallel to rows) for one step. Exported for testing.
export function flagRows(data, rows, step, model = null) {
  switch (step.type) {
    case 'exclude':     return rows.map(i => isTruthyFlag(data[i][step.column]));
    case 'z':           return flagAny(data, rows, step.columns, vals => zFlags(vals, step.threshold));
    case 'mad':         return flagAny(data, rows, step.columns, vals => madFlags(vals, step.threshold));
    case 'mahalanobis': return mahalanobisFlags(data, rows, step.columns, step.threshold);
    case 'cooks':       return cooksFlags(data, rows, step, model);
    default: throw new Error(`Unknown filter step type: ${step.type}`);
  }
}

// Apply a per-column rule to each column; a row is flagged if any column flags
// it. Rows with a non-finite value in a column are skipped for that column.
function flagAny(data, rows, columns, rule) {
  const flags = new Array(rows.length).fill(false);
  for (const col of columns) {
    const pos = [];
    const vals = [];
    rows.forEach((r, i) => {
      const v = data[r][col];
      if (Number.isFinite(v)) { pos.push(i); vals.push(v); }
    });
    if (!vals.length) continue;
    const colFlags = rule(Float64Array.from(vals));
    pos.forEach((i, j) => { if (colFlags[j]) flags[i] = true; });
  }
  return flags;
}

function zFlags(v, threshold) {
  const n = v.length;
  const out = new Array(n).fill(false);
  if (n < 2) return out;
  let s = 0;
  for (let i = 0; i < n; i++) s += v[i];
  const mu = s / n;
  let ss = 0;
  for (let i = 0; i < n; i++) ss += (v[i] - mu) ** 2;
  const sd = Math.sqrt(ss / (n - 1));
  if (!(sd > 0)) return out;
  for (let i = 0; i < n; i++) out[i] = Math.abs(v[i] - mu) / sd > threshold;
  return out;
}

function median(v) {
  const s = Float64Array.from(v).sort();
  const m = s.length;
  return m % 2 ? s[(m - 1) / 2] : (s[m / 2 - 1] + s[m / 2]) / 2;
}

function madFlags(v, threshold) {
  const n = v.length;
  const out = new Array(n).fill(false);
  const med = median(v);
  const dev = v.map(x => Math.abs(x - med));
  const mad = median(dev) * MAD_CONSISTENCY;
  if (!(mad > 0)) return out;
  for (let i = 0; i < n; i++) out[i] = dev[i] / mad > threshold;
  return out;
}

// Squared Mahalanobis distance from the column means, using the sample
// covariance (÷ n−1) of the kept rows. Rows with any non-finite value in the
// columns are left alone.
function mahalanobisFlags(data, rows, columns, threshold) {
  const flags = new Array(rows.length).fill(false);
  const q = columns.length;
  const pos = [];
  rows.forEach((r, i) => {
    if (columns.every(c => Number.isFinite(data[r][c]))) pos.push(i);
  });
  const n = pos.length;
  if (n <= q) return flags;

  const Xc = new Float64Array(n * q);
  for (let j = 0; j < q; j++) {
    let s = 0;
    for (let t = 0; t < n; t++) s += data[rows[pos[t]]][columns[j]];
    const mu = s / n;
    for (let t = 0; t < n; t++) Xc[j * n + t] = data[rows[pos[t]]][columns[j]] - mu;
  }
  // (XcᵀXc)⁻¹ · (n−1) = S⁻¹
  const { inv } = solveCrossProducts(crossProducts(Xc, n, q, new Float64Array(n)), q + 1);
  for (let t = 0; t < n; t++) {
    let d2 = 0;
    for (let a = 0; a < q; a++) {
      const da = Xc[a * n + t];
      for (let b = 0; b < q; b++) d2 += da * inv[a * q + b] * Xc[b * n + t];
    }
    d2 *= (n - 1);
    flags[pos[t]] = d2 > threshold;
  }
  return flags;
}

// Cook's distances for an OLS fit: Dᵢ = eᵢ² / (k·s²) · hᵢᵢ / (1 − hᵢᵢ)².
// x, y: arrays; nuisance: array of arrays. Returns a Float64Array.
export function cooksDistances(x, y, nuisance = []) {
  const { X, n, k } = designMatrix(x, nuisance);
  const qr = qrDecompose(X, n, k);
  const b = qrSolve(qr, y);
  const e = residuals(X, n, k, y, b);
  let ssr = 0;
  for (let i = 0; i < n; i++) ssr += e[i] * e[i];
  const s2 = ssr / (n - k);
  const inv = qrXtXInverse(qr);
  const D = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let h = 0;
    for (let a = 0; a < k; a++) {
      const xa = X[a * n + i];
      for (let c = 0; c < k; c++) h += xa * inv[a * k + c] * X[c * n + i];
    }
    D[i] = (e[i] * e[i]) / (k * s2) * h / ((1 - h) ** 2);
  }
  return D;
}

function cooksFlags(data, rows, step, model) {
  if (!model?.x || !model?.y) throw new Error("Cook's D filter needs a model ({ x, y, nuisance })");
  const cols = [model.x, model.y, ...(model.nuisance ?? [])];
  const flags = new Array(rows.length).fill(false);
  const pos = [];
  rows.forEach((r, i) => {
    if (cols.every(c => Number.isFinite(data[r][c]))) pos.push(i);
  });
  const k = 2 + (model.nuisance?.length ?? 0);
  if (pos.length <= k) return flags;
  const get = c => pos.map(i => data[rows[i]][c]);
  const D = cooksDistances(get(model.x), get(model.y), (model.nuisance ?? []).map(get));
  const thr = step.perN ? step.threshold / pos.length : step.threshold;
  pos.forEach((i, t) => { flags[i] = D[t] > thr; });
  return flags;
}
