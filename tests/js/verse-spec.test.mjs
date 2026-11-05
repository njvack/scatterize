import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeSpec, dimensions, countPaths, enumeratePaths, forkOptions, planPath, choicesAt,
  specColumns, handExcludedFork, specFromScatterState, SpecError,
} from '../../src/verse/spec.js';
import { encodeSpec, decodeSpec, parseVerseHash, serializeVerseHash } from '../../src/verse/url.js';
import { BIG_SPEC } from './verse-fixtures.mjs';

const labels = fork => forkOptions(normalizeSpec({ outcomes: ['y'], predictors: ['x'], forks: [fork] }).forks[0]).map(o => o.label);

test('covariate modes: all subsets, simplify, nested (specr setup semantics)', () => {
  assert.deepEqual(labels({ kind: 'covariates', mode: 'all', columns: ['a', 'b', 'c'] }),
    ['none', 'a', 'b', 'c', 'a + b', 'a + c', 'b + c', 'a + b + c']);
  assert.deepEqual(labels({ kind: 'covariates', mode: 'simplify', columns: ['a', 'b', 'c'] }),
    ['none', 'a', 'b', 'c', 'a + b + c']);
  assert.deepEqual(labels({ kind: 'covariates', mode: 'simplify', columns: ['a'] }), ['none', 'a']);
  assert.deepEqual(labels({ kind: 'covariates', mode: 'nested', columns: ['a', 'b', 'c'] }),
    ['none', 'a', 'a + b', 'a + b + c']);
});

test('fork options for exclusions, outlier rules and models', () => {
  assert.deepEqual(labels({ kind: 'exclude', column: 'bot' }), ['apply', 'ignore']);
  assert.deepEqual(labels({ kind: 'outlier', rule: 'z', thresholds: [2.5, 3] }), ['none', '|z| > 2.5', '|z| > 3']);
  assert.deepEqual(labels({ kind: 'outlier', rule: 'cooks', thresholds: [4], perN: true, none: false }), ["Cook's D > 4/n"]);
  assert.deepEqual(labels({ kind: 'model', estimators: ['ols', 'm'] }), ['OLS', 'robust (M)']);
});

test('normalizeSpec rejects malformed specs with SpecError', () => {
  const bad = [
    null, {}, { outcomes: ['y'] }, { outcomes: ['y'], predictors: [] },
    { outcomes: ['y'], predictors: ['x'], forks: [{ kind: 'nope' }] },
    { outcomes: ['y'], predictors: ['x'], forks: [{ kind: 'covariates', columns: [] }] },
    { outcomes: ['y'], predictors: ['x'], forks: [{ kind: 'outlier', rule: 'z', thresholds: [], none: false }] },
    { outcomes: ['y'], predictors: ['x'], forks: [{ kind: 'model', estimators: ['mm'] }] },
    { outcomes: ['y'], predictors: ['x'], forks: [{ kind: 'exclude', rows: [-1] }] },
  ];
  for (const s of bad) assert.throws(() => normalizeSpec(s), SpecError, JSON.stringify(s));
});

test('countPaths is the product of option counts; choicesAt is mixed radix', () => {
  const spec = normalizeSpec(BIG_SPEC);
  assert.equal(countPaths(spec), 2 * 2 * 2 * 8 * 3 * 2 * 2);
  const dims = dimensions(spec);
  assert.deepEqual(choicesAt(dims, 0), [0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(choicesAt(dims, 1), [0, 0, 0, 0, 0, 0, 1]);
  assert.deepEqual(choicesAt(dims, countPaths(spec) - 1), dims.map(d => d.options.length - 1));
});

test('X and Y win: a covariate in use as x or y is dropped; collapsed paths are skipped', () => {
  const spec = normalizeSpec(BIG_SPEC);
  const { paths, raw, skipped } = enumeratePaths(spec);
  // The covariate block contains y: for outcome y, subsets with y collapse onto those without.
  // Half of the 8 subsets contain y, and outcome y is half the grid.
  assert.equal(skipped.duplicate, raw / 4);
  assert.equal(paths.length + skipped.duplicate + skipped.sameXY, raw);
  for (const { plan } of paths) {
    assert.ok(!plan.covariates.includes(plan.x) && !plan.covariates.includes(plan.y));
  }
  assert.equal(new Set(paths.map(p => p.plan.key)).size, paths.length);
});

test('x = y paths are skipped', () => {
  const { paths, skipped } = enumeratePaths(normalizeSpec({ outcomes: ['a', 'b'], predictors: ['a', 'b'] }));
  assert.equal(skipped.sameXY, 2);
  assert.deepEqual(paths.map(p => [p.plan.y, p.plan.x]), [['a', 'b'], ['b', 'a']]);
});

test('planPath: steps follow fork order; Cook\'s D sees covariates and estimator above it', () => {
  const spec = normalizeSpec({
    outcomes: ['y'], predictors: ['x'], always: ['age'],
    forks: [
      { kind: 'outlier', rule: 'cooks', thresholds: [1], none: false },
      { kind: 'covariates', columns: ['c1'] },
      { kind: 'model', estimators: ['m'] },
      { kind: 'outlier', rule: 'cooks', thresholds: [4], perN: true, none: false },
      { kind: 'outlier', rule: 'z', thresholds: [3], none: false, on: 'model' },
    ],
  });
  const dims = dimensions(spec);
  const plan = planPath(spec, [0, 0, 0, 1, 0, 0, 0], dims);  // c1 included
  assert.deepEqual(plan.covariates, ['age', 'c1']);
  assert.equal(plan.estimator, 'm');
  assert.deepEqual(plan.steps.map(s => s.type), ['cooks', 'cooks', 'z']);
  assert.deepEqual(plan.steps[0].model, { x: 'x', y: 'y', nuisance: ['age'], estimator: 'ols' });
  assert.deepEqual(plan.steps[1].model, { x: 'x', y: 'y', nuisance: ['age', 'c1'], estimator: 'm' });
  assert.deepEqual(plan.steps[2].columns, ['y', 'x', 'age', 'c1']);
  assert.deepEqual(plan.missing, ['y', 'x', 'age', 'c1']);
});

test('fork order changes the key only when it changes evaluation', () => {
  const a = { kind: 'exclude', column: 'bot' };
  const b = { kind: 'outlier', rule: 'z', thresholds: [3], none: false };
  const c = { kind: 'covariates', columns: ['c1'] };
  const keyOf = forks => enumeratePaths(normalizeSpec({ outcomes: ['y'], predictors: ['x'], forks }))
    .paths.map(p => p.plan.key).sort();
  // Covariates don't affect a raw z rule, so moving them is free.
  assert.deepEqual(keyOf([a, b, c]), keyOf([a, c, b]));
  // An exclusion before vs after the z rule changes which rows z sees.
  assert.notDeepEqual(keyOf([a, b, c]), keyOf([b, a, c]));
});

test('specColumns, hand-excluded fork, and scatterplot bridge', () => {
  const spec = normalizeSpec(BIG_SPEC);
  const cols = specColumns(spec);
  assert.deepEqual(cols.flags, ['bot']);
  assert.deepEqual(new Set(cols.numeric), new Set(['y', 'y2', 'x', 'x2', 'c3', 'c1', 'c2']));

  assert.deepEqual(handExcludedFork([9, 3, 3]), { kind: 'exclude', rows: [3, 9], label: 'hand-excluded' });

  const { spec: s, censored } = specFromScatterState({ x: 2, y: 0, m: 'robust', n: [1, 2], c: [4, 8] }, ['a', 'b', 'c']);
  assert.deepEqual(s, { outcomes: ['a'], predictors: ['c'], always: ['b'], forks: [{ kind: 'model', estimators: ['m'] }] });
  assert.deepEqual(censored, [4, 8]);
});

test('URL: spec round-trips through compressed hash text, order and ids intact', async () => {
  const spec = normalizeSpec({ ...BIG_SPEC, forks: BIG_SPEC.forks.map((f, i) => ({ ...f, id: `f${i}` })) });
  const text = await encodeSpec(spec);
  assert.match(text, /^[A-Za-z0-9_-]+$/);
  assert.deepEqual(await decodeSpec(text), spec);

  const hash = await serializeVerseHash({ src: 'https://example.com/d.csv', spec, seed: 42, draws: 500 });
  const back = await parseVerseHash(hash);
  assert.equal(back.view, 'verse');
  assert.equal(back.src, 'https://example.com/d.csv');
  assert.equal(back.seed, 42);
  assert.equal(back.draws, 500);
  assert.deepEqual(back.spec, spec);

  const broken = await parseVerseHash('view=verse&vs=notdeflate');
  assert.equal(broken.spec, null);
  assert.ok(broken.specError);
});
