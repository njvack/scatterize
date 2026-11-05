// src/verse/dataset.js
// Column-oriented copy of the parsed CSV for the path engine: numeric columns
// as Float64Arrays (NaN for missing or non-numeric) and exclusion columns as
// 0/1 Uint8Arrays (stats/filters.js isTruthyFlag). Typed arrays clone cheaply
// into workers and keep the inner loops tight.

import { isTruthyFlag } from '../stats/filters.js';

// rows: array of row objects (Papa Parse output). numeric / flags: column
// names to convert. Returns { n, cols, flags }.
export function prepareDataset(rows, { numeric = [], flags = [] } = {}) {
  const n = rows.length;
  const cols = {};
  for (const c of numeric) {
    const a = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      const v = rows[i][c];
      a[i] = typeof v === 'number' && Number.isFinite(v) ? v : NaN;
    }
    cols[c] = a;
  }
  const fl = {};
  for (const c of flags) {
    const a = new Uint8Array(n);
    for (let i = 0; i < n; i++) a[i] = isTruthyFlag(rows[i][c]) ? 1 : 0;
    fl[c] = a;
  }
  return { n, cols, flags: fl };
}

// Only the named columns (sharing the same arrays), so a worker job carries
// what its paths read and nothing else. Throws if a column is missing.
export function subsetDataset(ds, { numeric = [], flags = [] }) {
  const cols = {};
  for (const c of numeric) {
    if (!ds.cols[c]) throw new Error(`Column not in dataset: ${c}`);
    cols[c] = ds.cols[c];
  }
  const fl = {};
  for (const c of flags) {
    if (!ds.flags[c]) throw new Error(`Exclusion column not in dataset: ${c}`);
    fl[c] = ds.flags[c];
  }
  return { n: ds.n, cols, flags: fl };
}

// The columns a list of path plans reads.
export function planColumns(plans) {
  const numeric = new Set();
  const flags = new Set();
  for (const p of plans) {
    p.missing.forEach(c => numeric.add(c));
    for (const s of p.steps) {
      if (s.type === 'exclude') flags.add(s.column);
      if (s.columns) s.columns.forEach(c => numeric.add(c));
    }
  }
  return { numeric: [...numeric], flags: [...flags] };
}
