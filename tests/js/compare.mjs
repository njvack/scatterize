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
import { ols }      from '../../src/stats/ols.js';
import { robust, robustM } from '../../src/stats/robust.js';
import { sEstimate } from '../../src/stats/s-estimate.js';
import { spearman } from '../../src/stats/spearman.js';
import { theilSen } from '../../src/stats/theilsen.js';

const NOT_IMPLEMENTED = () => { throw new Error('not yet implemented'); };

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
const COEF_TOL      = 1e-6;  // relative tolerance for coefficients
const PVAL_TOL      = 1e-4;  // relative tolerance for p-values (less precisely computed)
const WEIGHT_TOL    = 1e-4;  // absolute tolerance for IRLS weights
const ROBUST_TOL    = 1e-3;  // relative tolerance for M-estimation (iterative, floating-point)
const MM_TOL        = 1e-3;  // MM coef/SE/weights: the M-step is iterative (acc=1e-4)
const MM_EXACT_TOL  = 1e-6;  // deterministic MM pieces: S-step coef/scale and the fixed MM scale

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
      const r = ols(x, col(data, c.y), nuisance);
      const e = c.results;
      check('slope',          r.slope,              e.slope);
      check('intercept',      r.intercept,          e.intercept);
      check('r_squared',      r.rSquared,           e.r_squared);
      check('full_r_squared', r.fullModelRSquared,  e.full_r_squared);
      check('adj_r_squared',  r.adjRSquared,        e.adj_r_squared);
      check('f_stat',         r.fStat,              e.f_stat);
      check('p_f',            r.pF,                 e.p_f,         PVAL_TOL);
      check('se_slope',       r.seSlope,            e.se_slope);
      check('t_slope',        r.tSlope,             e.t_slope);
      check('p_slope',        r.pSlope,             e.p_slope,     PVAL_TOL);
      check('df_residual',    r.dfResidual,         e.df_residual);

      // Nuisance stats (one per covariate)
      const nuis = e.nuisance_stats ?? [];
      for (let i = 0; i < nuis.length; i++) {
        const label = `nuisance[${i}]`;
        check(`${label}.coef`,      r.nuisanceStats[i].coef,      nuis[i].coef);
        check(`${label}.se`,        r.nuisanceStats[i].se,        nuis[i].se);
        check(`${label}.t`,         r.nuisanceStats[i].t,         nuis[i].t);
        check(`${label}.p`,         r.nuisanceStats[i].p,         nuis[i].p,  PVAL_TOL);
        check(`${label}.partialR2`, r.nuisanceStats[i].partialR2, nuis[i].partial_r2);
      }

      // yResidual presence
      const hasNuisance = nuisance.length > 0;
      const yResOk = hasNuisance ? r.yResidual != null : r.yResidual === null;
      console.log(`    ${yResOk ? '✓' : '✗'} yResidual ${hasNuisance ? 'present' : 'null'} (no nuisance)`);
      if (yResOk) passed++; else failed++;
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
section('Robust — internal M-estimation (Tukey biweight)');
try {
  const cases = loadExpected('robust');
  for (const c of cases) {
    console.log(`\n  ${caseLabel(c)}`);
    try {
      const data = loadData(c.dataset);
      const x = col(data, c.x);
      const y = col(data, c.y);
      const nuisance = (c.nuisance ?? []).map(n => col(data, n));
      const r = robustM(x, y, nuisance);
      const e = c.results;
      check('slope',        r.slope,       e.slope,       ROBUST_TOL);
      check('intercept',    r.intercept,   e.intercept,   ROBUST_TOL);
      check('scale',        r.scale,       e.scale,       ROBUST_TOL);
      checkArray('weights', r.weights,     e.weights,     ROBUST_TOL);
      // SEs now use the MASS summary.rlm (XtX) formula exactly, so they track
      // the coefficients at the same tolerance rather than the old ~10% gap.
      check('se_slope',     r.seSlope,     e.se_slope,     ROBUST_TOL);
      check('t_slope',      r.tSlope,      e.t_slope,      ROBUST_TOL);
      check('se_intercept', r.seIntercept, e.se_intercept, ROBUST_TOL);
      check('t_intercept',  r.tIntercept,  e.t_intercept,  ROBUST_TOL);

      const nuis = e.nuisance_stats ?? [];
      for (let i = 0; i < nuis.length; i++) {
        const label = `nuisance[${i}]`;
        check(`${label}.coef`, r.nuisanceStats[i].coef, nuis[i].coef, ROBUST_TOL);
        check(`${label}.se`,   r.nuisanceStats[i].se,   nuis[i].se,   ROBUST_TOL);
        check(`${label}.t`,    r.nuisanceStats[i].t,    nuis[i].t,    ROBUST_TOL);
      }
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
// MM-estimation tests (the public `robust`): S-init + fixed-scale M-step.
// Layered: the S-step (coef + scale) is deterministic and matches lqs exactly;
// the fixed MM scale is deterministic; the M-step coef/SE/weights are iterative.
// ---------------------------------------------------------------------------
section('Robust — MM-estimation (S-init + fixed-scale bisquare M-step)');
try {
  const cases = loadExpected('mm');
  for (const c of cases) {
    console.log(`\n  ${caseLabel(c)}`);
    try {
      const data = loadData(c.dataset);
      const x = col(data, c.x);
      const y = col(data, c.y);
      const nuisance = (c.nuisance ?? []).map(n => col(data, n));
      const r = robust(x, y, nuisance);

      // S-step: reproduce MASS::lqs(method="S", nsamp="exact") deterministically.
      const dm = x.map((xi, i) => [1, xi, ...nuisance.map(cl => cl[i])]);
      const s = sEstimate(dm, y);
      checkArray('s_step.coef', s.coef, c.s_step.coef, MM_EXACT_TOL);
      check('s_step.scale', s.scale, c.s_step.scale, MM_EXACT_TOL);

      const e = c.results;
      check('slope',        r.slope,       e.slope,       MM_TOL);
      check('intercept',    r.intercept,   e.intercept,   MM_TOL);
      check('scale',        r.scale,       e.scale,       MM_EXACT_TOL);  // fixed S-scale
      checkArray('weights', r.weights,     e.weights,     MM_TOL);
      check('se_slope',     r.seSlope,     e.se_slope,     MM_TOL);
      check('t_slope',      r.tSlope,      e.t_slope,      MM_TOL);
      check('se_intercept', r.seIntercept, e.se_intercept, MM_TOL);
      check('t_intercept',  r.tIntercept,  e.t_intercept,  MM_TOL);

      const nuis = e.nuisance_stats ?? [];
      for (let i = 0; i < nuis.length; i++) {
        const label = `nuisance[${i}]`;
        check(`${label}.coef`, r.nuisanceStats[i].coef, nuis[i].coef, MM_TOL);
        check(`${label}.se`,   r.nuisanceStats[i].se,   nuis[i].se,   MM_TOL);
        check(`${label}.t`,    r.nuisanceStats[i].t,    nuis[i].t,    MM_TOL);
      }
    } catch (err) {
      console.log(`    ERROR: ${err.message}`);
      failed++;
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
