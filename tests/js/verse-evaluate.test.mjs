import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';

import { normalizeSpec, enumeratePaths } from '../../src/verse/spec.js';
import { prepareDataset } from '../../src/verse/dataset.js';
import { evaluatePlans, evaluatePlanReference, bootstrapPlans, filliben } from '../../src/verse/evaluate.js';
import { drawCounts } from '../../src/verse/rng.js';
import { ols } from '../../src/stats/ols.js';
import { robustM } from '../../src/stats/robust.js';
import { partialR } from '../../src/stats/common.js';
import { syntheticRows, NUMERIC, FLAGS, BIG_SPEC, SMALL_SPEC } from './verse-fixtures.mjs';

const rows = syntheticRows();
const ds = prepareDataset(rows, { numeric: NUMERIC, flags: FLAGS });

function close(a, b, tol, label) {
  if (a == null || b == null) { assert.equal(a, b, label); return; }
  const d = Math.abs(a - b) / Math.max(1e-12, Math.abs(b));
  assert.ok(d <= tol || Math.abs(a - b) < 1e-12, `${label}: ${a} vs ${b} (rel ${d})`);
}

function assertSameResult(got, ref, tol = 1e-9) {
  assert.equal(got.key, ref.key);
  assert.equal(got.ok, ref.ok, `${ref.key}: ${got.error ?? ''} / ${ref.error ?? ''}`);
  assert.equal(got.n, ref.n, ref.key);
  if (!ref.ok) return;
  assert.equal(got.estimator, ref.estimator);
  assert.equal(got.df, ref.df);
  for (const f of ['estimate', 'se', 't', 'p', 'z', 'partialR']) close(got[f], ref[f], tol, `${ref.key} ${f}`);
  if (ref.ci == null) assert.equal(got.ci, null);
  else { close(got.ci[0], ref.ci[0], tol, 'ci lo'); close(got.ci[1], ref.ci[1], tol, 'ci hi'); }
  if (ref.diagnostics) {
    for (const f of Object.keys(ref.diagnostics)) close(got.diagnostics[f], ref.diagnostics[f], 1e-7, `${ref.key} ${f}`);
  }
}

for (const [name, spec] of [['big', BIG_SPEC], ['small', SMALL_SPEC]]) {
  test(`evaluatePlans matches from-scratch ols()/robustM() on every path (${name} spec)`, () => {
    const { paths } = enumeratePaths(normalizeSpec(spec));
    const plans = paths.map(p => p.plan);
    const got = evaluatePlans(ds, plans, { diagnostics: true });
    assert.equal(got.length, plans.length);
    plans.forEach((plan, i) => assertSameResult(got[i], evaluatePlanReference(rows, plan, { diagnostics: true })));
    if (name === 'big') assert.ok(got.some(r => r.estimator === 'm'));
  });
}

test('results do not depend on how plans are batched', () => {
  const plans = enumeratePaths(normalizeSpec(BIG_SPEC)).paths.map(p => p.plan);
  const all = evaluatePlans(ds, plans);
  fc.assert(fc.property(fc.subarray(plans.map((_, i) => i), { minLength: 1 }), idx => {
    const part = evaluatePlans(ds, idx.map(i => plans[i]));
    idx.forEach((i, j) => assert.deepEqual(part[j], all[i]));
  }), { numRuns: 30, seed: 1 });
});

// Random small specs over the synthetic columns, checked against the oracle.
const forkArb = fc.oneof(
  fc.constantFrom('bot', 'late').map(column => ({ kind: 'exclude', column })),
  fc.record({
    kind: fc.constant('covariates'),
    mode: fc.constantFrom('all', 'simplify', 'nested'),
    columns: fc.subarray(['c1', 'c2', 'c3', 'x', 'y2'], { minLength: 1, maxLength: 3 }),
  }),
  fc.record({
    kind: fc.constant('outlier'),
    rule: fc.constantFrom('z', 'mad', 'mahalanobis'),
    thresholds: fc.subarray([2, 2.5, 3, 6], { minLength: 1, maxLength: 2 }),
    on: fc.constantFrom('xy', 'model'),
  }),
  fc.record({
    kind: fc.constant('outlier'), rule: fc.constant('cooks'),
    thresholds: fc.subarray([0.5, 4], { minLength: 1 }), perN: fc.boolean(),
  }),
  fc.subarray(['ols', 'm'], { minLength: 1 }).map(estimators => ({ kind: 'model', estimators })),
);
export const specArb = fc.record({
  outcomes: fc.subarray(['y', 'y2'], { minLength: 1 }),
  predictors: fc.subarray(['x', 'x2', 'y2'], { minLength: 1 }),
  always: fc.subarray(['c3'], { maxLength: 1 }),
  forks: fc.array(forkArb, { maxLength: 3 }),
});

test('property: random specs match the oracle path by path', () => {
  fc.assert(fc.property(specArb, raw => {
    const { paths } = enumeratePaths(normalizeSpec(raw));
    const plans = paths.map(p => p.plan);
    const got = evaluatePlans(ds, plans);
    plans.forEach((plan, i) => assertSameResult(got[i], evaluatePlanReference(rows, plan)));
  }), { numRuns: 40, seed: 2 });
});

test('saturated and collinear paths fail per path, not per batch', () => {
  const tiny = rows.slice(0, 4);
  const tds = prepareDataset(tiny, { numeric: NUMERIC, flags: FLAGS });
  const spec = normalizeSpec({ outcomes: ['y'], predictors: ['x'], forks: [{ kind: 'covariates', columns: ['c1', 'c3'] }] });
  const plans = enumeratePaths(spec).paths.map(p => p.plan);
  const got = evaluatePlans(tds, plans);
  plans.forEach((p, i) => assertSameResult(got[i], evaluatePlanReference(tiny, p)));
  assert.deepEqual(got.map(r => r.ok), [true, true, true, false]);
  assert.match(got[3].error, /saturated/);

  const dup = rows.map(r => ({ ...r, xcopy: 2 * r.x }));
  const dds = prepareDataset(dup, { numeric: [...NUMERIC, 'xcopy'], flags: FLAGS });
  const plan = enumeratePaths(normalizeSpec({ outcomes: ['y'], predictors: ['x'], always: ['xcopy'] })).paths[0].plan;
  const [r] = evaluatePlans(dds, [plan]);
  assert.equal(r.ok, false);
  assert.equal(evaluatePlanReference(dup, plan).ok, false);
});

test('filliben: near 1 for normal residuals, lower for skewed ones', () => {
  const normal = rows.map(r => r.c1);
  const skewed = normal.map(v => Math.exp(2 * v));
  assert.ok(filliben(normal) > 0.98);
  assert.ok(filliben(skewed) < 0.8);
  assert.equal(filliben([1, 2]), null);
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

const bootPlans = enumeratePaths(normalizeSpec(SMALL_SPEC)).paths.map(p => p.plan);
const bootObs = evaluatePlans(ds, bootPlans);
const bootEst = bootObs.map(r => (r.ok ? r.estimate : NaN));

test('drawCounts: n draws, deterministic per (seed, draw), different across draws', () => {
  const a = drawCounts(5, 3, 50);
  assert.equal(a.reduce((s, v) => s + v, 0), 50);
  assert.deepEqual(drawCounts(5, 3, 50), a);
  assert.notDeepEqual(drawCounts(5, 4, 50), a);
  assert.notDeepEqual(drawCounts(6, 3, 50), a);
});

test('bootstrap: same seed, same draws; splitting draws across jobs changes nothing', () => {
  const full = bootstrapPlans(ds, bootPlans, bootEst, { seed: 9, count: 12 });
  const again = bootstrapPlans(ds, bootPlans, bootEst, { seed: 9, count: 12 });
  assert.deepEqual(again, full);
  const a = bootstrapPlans(ds, bootPlans, bootEst, { seed: 9, start: 0, count: 5 });
  const b = bootstrapPlans(ds, bootPlans, bootEst, { seed: 9, start: 5, count: 7 });
  for (let i = 0; i < bootPlans.length; i++) {
    assert.deepEqual([...a.r.slice(i * 5, i * 5 + 5), ...b.r.slice(i * 7, i * 7 + 7)], [...full.r.slice(i * 12, i * 12 + 12)]);
  }
  const other = bootstrapPlans(ds, bootPlans, bootEst, { seed: 10, count: 12 });
  assert.notDeepEqual(other.r, full.r);
});

// Fit one path on an explicit resample (rows repeated by count) with the null
// forced. Only for plans without filter steps (row set = complete cases).
function materializedDraw(plan, estimate, seed, d) {
  assert.equal(plan.steps.length, 0);
  const kept = [];
  for (let i = 0; i < rows.length; i++) {
    if (plan.missing.every(c => Number.isFinite(rows[i][c]))) kept.push(i);
  }
  const w = drawCounts(seed, d, rows.length);
  const idx = [];
  for (const i of kept) for (let c = 0; c < w[i]; c++) idx.push(i);
  const x = idx.map(i => rows[i][plan.x]);
  const y = idx.map(i => rows[i][plan.y] - estimate * rows[i][plan.x]);
  const covs = plan.covariates.map(c => idx.map(i => rows[i][c]));
  return plan.estimator === 'm' ? robustM(x, y, covs) : ols(x, y, covs);
}

test('bootstrap draws equal fitting the resampled, null-forced data from scratch', () => {
  // Use plans without filter steps so the observed row set is just complete cases.
  const spec = normalizeSpec({
    outcomes: ['y'], predictors: ['x', 'x2'],
    forks: [{ kind: 'covariates', columns: ['c1', 'c2'] }, { kind: 'model', estimators: ['ols', 'm'] }],
  });
  const plans = enumeratePaths(spec).paths.map(p => p.plan);
  const est = evaluatePlans(ds, plans).map(r => r.estimate);
  const count = 3;
  const { r, z } = bootstrapPlans(ds, plans, est, { seed: 4, count });
  plans.forEach((plan, i) => {
    for (let d = 0; d < count; d++) {
      const fit = materializedDraw(plan, est[i], 4, d);
      close(r[i * count + d], partialR(fit.tSlope, fit.dfResidual), 1e-5, `${plan.key} draw ${d} r`);
      const zRef = plan.estimator === 'm' ? fit.tSlope : null;
      if (zRef != null) close(z[i * count + d], zRef, 1e-5, 'z');
    }
  });
});

test('forced null: draws centre on zero even when the observed effect is strong', () => {
  const plan = enumeratePaths(normalizeSpec({ outcomes: ['y'], predictors: ['c1'], always: ['c3'] })).paths[0].plan;
  const [obs] = evaluatePlans(ds, [plan]);
  assert.ok(obs.partialR > 0.2);
  const count = 200;
  const { r } = bootstrapPlans(ds, [plan], [obs.estimate], { seed: 3, count });
  const mean = r.reduce((s, v) => s + v, 0) / count;
  assert.ok(Math.abs(mean) < 0.03, `mean r under the null = ${mean}`);
});

test('paths with no observed estimate are skipped (NaN)', () => {
  const est = bootEst.map((v, i) => (i === 0 ? NaN : v));
  const { r } = bootstrapPlans(ds, bootPlans, est, { seed: 1, count: 2 });
  assert.ok(Number.isNaN(r[0]) && Number.isNaN(r[1]));
  assert.ok(Number.isFinite(r[2]));
});
