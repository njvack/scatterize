import { test } from 'node:test';
import assert from 'node:assert/strict';

import { curveStats, orientedStats, bootstrapPValues, forkSummaries } from '../../src/verse/summary.js';
import { normalizeSpec, enumeratePaths } from '../../src/verse/spec.js';

test('curveStats counts significant paths by |z| > 1.96 and skips NaN', () => {
  const s = curveStats([0.1, 0.3, -0.2, 0.5, NaN], [1, 2.5, -2.1, 3, 4]);
  assert.equal(s.k, 4);
  assert.equal(s.medianR, 0.2);
  assert.equal(s.positive, 3);
  assert.equal(s.sigPositive, 2);
  assert.equal(s.sigNegative, 1);
  assert.equal(s.stouffer, (1 + 2.5 - 2.1 + 3) / 2);
});

test('orientedStats: dominant direction from significant paths, ties to the median sign', () => {
  const neg = orientedStats(curveStats([-0.3, -0.2, 0.1], [-3, -2.5, 2.2]));
  assert.equal(neg.dominant, -1);
  assert.equal(neg.shareSig, 2 / 3);
  assert.ok(neg.median > 0 && neg.medianSign === -1);
  const tie = orientedStats(curveStats([0.3, -0.1, 0.2], [2.5, -2.5, 1]));
  assert.equal(tie.dominant, 1);
});

test('bootstrapPValues: share of draws at least as extreme, in the observed direction', () => {
  const observed = curveStats([0.2, 0.3], [2.5, 3]);
  // 4 draws × 2 paths, path-major.
  const r = Float32Array.from([0.25, 0.0, -0.1, 0.4, /* path 2 */ 0.3, 0.0, -0.2, 0.3]);
  const z = Float32Array.from([2.5, 0, -1, 3.5, /* path 2 */ 3, 0, -2.5, 3]);
  const { p, draws } = bootstrapPValues(observed, r, z, 2, 4);
  assert.equal(draws, 4);
  // medians per draw: .275, 0, -.15, .35 vs observed .25 → 2 of 4
  assert.equal(p.median, 0.5);
  // share sig positive per draw: 1, 0, 0, 1 vs observed 1 → 2 of 4
  assert.equal(p.shareSig, 0.5);
  // Stouffer: 5.5/√2, 0, -3.5/√2, 6.5/√2 vs 5.5/√2 → 2 of 4
  assert.equal(p.stouffer, 0.5);
});

test('forkSummaries: option shares, per-option medians, eta squared', () => {
  const spec = normalizeSpec({ outcomes: ['y'], predictors: ['x'], forks: [
    { kind: 'outlier', rule: 'z', thresholds: [2, 2.5, 3] },
    { kind: 'model', estimators: ['ols', 'm'] },
  ] });
  const { dims, paths } = enumeratePaths(spec);
  // r depends only on the model fork: OLS .1, M .3.
  const results = paths.map(p => ({ ok: true, partialR: p.plan.estimator === 'm' ? 0.3 : 0.1, z: p.plan.estimator === 'm' ? 3 : 1 }));
  results[0] = null;  // one still pending
  const s = forkSummaries(dims, paths, results);
  const outlier = s[2];
  assert.deepEqual(outlier.options.map(o => o.share), [0.25, 0.25, 0.25, 0.25]);
  assert.equal(outlier.options[0].done, 1);
  const model = s[3];
  assert.deepEqual(model.options.map(o => o.medianR), [0.1, 0.3]);
  assert.deepEqual(model.options.map(o => o.sigPositive), [0, 4]);
  assert.ok(Math.abs(model.etaSquared - 1) < 1e-12);
  assert.ok(outlier.etaSquared < 0.2);
  assert.equal(s[0].etaSquared, null);  // one outcome: nothing to compare
});
