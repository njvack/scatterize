#!/usr/bin/env node
// Compare JS stat implementations against R-generated expected values.
// Run: node tests/js/compare.mjs
// Or:  make test

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '..', 'fixtures');

// ---------------------------------------------------------------------------
// JS implementations — uncomment as each is built
// ---------------------------------------------------------------------------
import { ols }          from '../../src/stats/ols.js';
import { residualize }  from '../../src/stats/common.js';
// import { robust }   from '../../src/stats/robust.js';
// import { spearman } from '../../src/stats/spearman.js';
// import { theilSen } from '../../src/stats/theilsen.js';

const NOT_IMPLEMENTED = () => { throw new Error('not yet implemented'); };
const robust   = NOT_IMPLEMENTED;
const spearman = NOT_IMPLEMENTED;
const theilSen = NOT_IMPLEMENTED;

// ---------------------------------------------------------------------------
// CSV parser — handles well-formed R write.csv output
// ---------------------------------------------------------------------------
function parseCSVLine(line) {
  const fields = [];
  let i = 0;
  while (i < line.length) {
    if (line[i] === '"') {
      let j = i + 1;
      while (j < line.length && !(line[j] === '"' && line[j + 1] !== '"')) {
        if (line[j] === '"') j++;
        j++;
      }
      fields.push(line.slice(i + 1, j).replace(/""/g, '"'));
      i = j + 2;
    } else {
      let j = line.indexOf(',', i);
      if (j === -1) j = line.length;
      fields.push(line.slice(i, j));
      i = j + 1;
    }
  }
  return fields;
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const vals = parseCSVLine(line);
    return Object.fromEntries(headers.map((h, i) => {
      const v = vals[i] ?? '';
      const n = Number(v);
      return [h, v === '' || isNaN(n) ? v : n];
    }));
  });
}

function loadData(name) {
  return parseCSV(readFileSync(join(fixturesDir, 'data', `${name}.csv`), 'utf8'));
}

function loadExpected(method) {
  return JSON.parse(readFileSync(join(fixturesDir, 'expected', `${method}.json`), 'utf8'));
}

// ---------------------------------------------------------------------------
// Comparison utilities
// ---------------------------------------------------------------------------
const COEF_TOL   = 1e-6;  // relative tolerance for coefficients
const PVAL_TOL   = 1e-4;  // relative tolerance for p-values (less precisely computed)
const WEIGHT_TOL = 1e-4;  // absolute tolerance for IRLS weights

let passed = 0;
let failed = 0;
let skipped = 0;

function relDiff(got, expected) {
  if (expected === 0) return Math.abs(got);
  return Math.abs(got - expected) / Math.abs(expected);
}

function check(label, got, expected, tol = COEF_TOL) {
  const diff = relDiff(got, expected);
  const ok = diff <= tol;
  const mark = ok ? '✓' : '✗';
  const gotStr  = got.toPrecision(7).padStart(14);
  const expStr  = expected.toPrecision(7).padStart(14);
  const diffStr = diff < 1e-3 ? diff.toExponential(1) : diff.toFixed(5);
  console.log(`    ${mark} ${label.padEnd(18)} got ${gotStr}  expected ${expStr}  (rel diff ${diffStr})`);
  if (ok) passed++; else failed++;
}

function checkArray(label, got, expected, tol = WEIGHT_TOL) {
  if (got.length !== expected.length) {
    console.log(`    ✗ ${label}: length mismatch (got ${got.length}, expected ${expected.length})`);
    failed++;
    return;
  }
  const diffs = got.map((g, i) => Math.abs(g - expected[i]));
  const maxDiff = Math.max(...diffs);
  const ok = maxDiff <= tol;
  const mark = ok ? '✓' : '✗';
  console.log(`    ${mark} ${label.padEnd(18)} max abs diff ${maxDiff.toExponential(2)} over ${got.length} values`);
  if (ok) passed++; else failed++;
}

function col(data, name) {
  return data.map(row => row[name]);
}

function section(title) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(title);
  console.log('─'.repeat(60));
}

function caseLabel(c) {
  let s = `${c.dataset}: ${c.y} ~ ${c.x}`;
  const nuis = Array.isArray(c.nuisance) ? c.nuisance : [];
  if (nuis.length) s += ` | nuisance: ${nuis.join(', ')}`;
  return s;
}

// ---------------------------------------------------------------------------
// OLS tests
// ---------------------------------------------------------------------------
section('OLS');
try {
  const cases = loadExpected('ols');
  for (const c of cases) {
    console.log(`\n  ${caseLabel(c)}`);
    try {
      const data = loadData(c.dataset);
      const x = col(data, c.x);
      const nuisance = (c.nuisance ?? []).map(n => col(data, n));
      const y = nuisance.length ? residualize(col(data, c.y), nuisance) : col(data, c.y);
      const r = ols(x, y);
      const e = c.results;
      check('slope',        r.slope,       e.slope);
      check('intercept',    r.intercept,   e.intercept);
      check('r_squared',    r.rSquared,    e.r_squared);
      check('se_slope',     r.seSlope,     e.se_slope);
      check('t_slope',      r.tSlope,      e.t_slope);
      check('p_slope',      r.pSlope,      e.p_slope,   PVAL_TOL);
    } catch (err) {
      if (err.message === 'not yet implemented') {
        console.log('    (not yet implemented)');
        skipped++;
      } else {
        console.log(`    ERROR: ${err.message}`);
        failed++;
      }
    }
  }
} catch (err) {
  console.log(`  Could not load expected values: ${err.message}`);
  console.log('  Run: make expected');
}

// ---------------------------------------------------------------------------
// Robust tests
// ---------------------------------------------------------------------------
section('Robust (M-estimation, Tukey biweight)');
try {
  const cases = loadExpected('robust');
  for (const c of cases) {
    console.log(`\n  ${caseLabel(c)}`);
    try {
      const data = loadData(c.dataset);
      const x = col(data, c.x);
      const y = col(data, c.y);
      const r = robust(x, y);
      const e = c.results;
      check('slope',       r.slope,     e.slope);
      check('intercept',   r.intercept, e.intercept);
      check('scale',       r.scale,     e.scale);
      checkArray('weights', r.weights,  e.weights);
    } catch (err) {
      if (err.message === 'not yet implemented') {
        console.log('    (not yet implemented)');
        skipped++;
      } else {
        console.log(`    ERROR: ${err.message}`);
        failed++;
      }
    }
  }
} catch (err) {
  console.log(`  Could not load expected values: ${err.message}`);
  console.log('  Run: make expected');
}

// ---------------------------------------------------------------------------
// Spearman tests
// ---------------------------------------------------------------------------
section('Spearman rank correlation');
try {
  const cases = loadExpected('spearman');
  for (const c of cases) {
    console.log(`\n  ${caseLabel(c)}`);
    try {
      const data = loadData(c.dataset);
      const x = col(data, c.x);
      const y = col(data, c.y);
      const r = spearman(x, y);
      const e = c.results;
      check('rho',     r.rho,    e.rho);
      check('p_value', r.pValue, e.p_value, PVAL_TOL);
    } catch (err) {
      if (err.message === 'not yet implemented') {
        console.log('    (not yet implemented)');
        skipped++;
      } else {
        console.log(`    ERROR: ${err.message}`);
        failed++;
      }
    }
  }
} catch (err) {
  console.log(`  Could not load expected values: ${err.message}`);
  console.log('  Run: make expected');
}

// ---------------------------------------------------------------------------
// Theil-Sen tests
// ---------------------------------------------------------------------------
section('Theil-Sen estimator');
try {
  const cases = loadExpected('theilsen');
  for (const c of cases) {
    console.log(`\n  ${caseLabel(c)}`);
    try {
      const data = loadData(c.dataset);
      const x = col(data, c.x);
      const y = col(data, c.y);
      const r = theilSen(x, y);
      const e = c.results;
      check('slope',     r.slope,     e.slope);
      check('intercept', r.intercept, e.intercept);
      check('tau',       r.tau,       e.tau);
      check('p_value',   r.pValue,    e.p_value, PVAL_TOL);
    } catch (err) {
      if (err.message === 'not yet implemented') {
        console.log('    (not yet implemented)');
        skipped++;
      } else {
        console.log(`    ERROR: ${err.message}`);
        failed++;
      }
    }
  }
} catch (err) {
  console.log(`  Could not load expected values: ${err.message}`);
  console.log('  Run: make expected');
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------
console.log(`\n${'═'.repeat(60)}`);
console.log(`  ${passed} passed  ${failed} failed  ${skipped} skipped`);
console.log('═'.repeat(60));
if (failed > 0) process.exit(1);
