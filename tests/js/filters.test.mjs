import { test } from 'node:test';
import assert from 'node:assert/strict';

import { applyFilters, flagRows, isTruthyFlag, cooksDistances } from '../../src/stats/filters.js';
import { ols } from '../../src/stats/ols.js';

const rowsOf = data => data.map((_, i) => i);

test('isTruthyFlag: booleans, numbers, and common strings', () => {
  for (const v of [true, 1, 2, -1, 'true', 'TRUE', ' yes ', 'Y', 't', '1']) assert.equal(isTruthyFlag(v), true, String(v));
  for (const v of [false, 0, NaN, null, undefined, '', 'no', 'false', 'F', '0', 'maybe']) assert.equal(isTruthyFlag(v), false, String(v));
});

test('exclude: drops rows whose flag is truthy', () => {
  const data = [{ bot: 0 }, { bot: 1 }, { bot: 'TRUE' }, { bot: null }, { bot: false }];
  const { rows, steps } = applyFilters(data, rowsOf(data), [{ type: 'exclude', column: 'bot' }]);
  assert.deepEqual(rows, [0, 3, 4]);
  assert.deepEqual(steps, [{ type: 'exclude', excluded: [1, 2] }]);
});

test('z: flags |z| > threshold using mean and SD of kept rows', () => {
  const vals = [1, 2, 3, 2, 1, 2, 3, 2, 30];
  const data = vals.map(v => ({ v }));
  const flags = flagRows(data, rowsOf(data), { type: 'z', columns: ['v'], threshold: 2 });
  assert.deepEqual(flags, vals.map(v => v === 30));
});

test('z: a row is flagged if any listed column flags it; missing values skipped', () => {
  const data = [
    { a: 1, b: 5 }, { a: 2, b: 5 }, { a: 1, b: 6 }, { a: 2, b: 5 },
    { a: 1, b: 6 }, { a: 2, b: 99 }, { a: 50, b: 5 }, { a: NaN, b: 5 },
  ];
  const flags = flagRows(data, rowsOf(data), { type: 'z', columns: ['a', 'b'], threshold: 2 });
  assert.deepEqual(flags, [false, false, false, false, false, true, true, false]);
});

test('mad: robust to the outlier it flags', () => {
  const vals = [10, 11, 9, 10, 12, 8, 10, 11, 9, 100];
  const data = vals.map(v => ({ v }));
  const flags = flagRows(data, rowsOf(data), { type: 'mad', columns: ['v'], threshold: 3 });
  assert.deepEqual(flags, vals.map(v => v === 100));
});

test('mad and z: zero spread flags nothing', () => {
  const data = [5, 5, 5, 5].map(v => ({ v }));
  for (const type of ['z', 'mad']) {
    assert.deepEqual(flagRows(data, rowsOf(data), { type, columns: ['v'], threshold: 1 }), [false, false, false, false]);
  }
});

test('mahalanobis: one column reduces to squared z', () => {
  const vals = [3, 1, 4, 1, 5, 9, 2, 6];
  const data = vals.map(v => ({ v }));
  const n = vals.length;
  const mu = vals.reduce((s, v) => s + v, 0) / n;
  const sd2 = vals.reduce((s, v) => s + (v - mu) ** 2, 0) / (n - 1);
  const z2 = vals.map(v => (v - mu) ** 2 / sd2);
  const threshold = 2;
  const flags = flagRows(data, rowsOf(data), { type: 'mahalanobis', columns: ['v'], threshold });
  assert.deepEqual(flags, z2.map(d => d > threshold));
});

test('mahalanobis: catches a point that is unremarkable on each axis alone', () => {
  // x and y strongly correlated; one point breaks the pattern without being
  // extreme on either variable.
  const data = [];
  for (let i = 0; i < 20; i++) data.push({ x: i, y: i + (i % 2 ? 0.5 : -0.5) });
  data.push({ x: 2, y: 17 });
  const zFlags = flagRows(data, rowsOf(data), { type: 'z', columns: ['x', 'y'], threshold: 2.5 });
  const mFlags = flagRows(data, rowsOf(data), { type: 'mahalanobis', columns: ['x', 'y'], threshold: 13.8 });
  assert.equal(zFlags[20], false);
  assert.equal(mFlags[20], true);
  assert.equal(mFlags.filter(Boolean).length, 1);
});

test("cooksDistances: matches the leave-one-out definition", () => {
  const x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 20];
  const z = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3];
  const y = x.map((xi, i) => 2 + 0.5 * xi + 0.3 * z[i] + (i === 9 ? 6 : (i % 3) - 1));
  const D = cooksDistances(x, y, [z]);
  const full = ols(x, y, [z]);
  const k = 3;
  const s2 = full.sigma ** 2;
  const yhat = x.map((xi, i) => full.intercept + full.slope * xi + full.nuisanceStats[0].coef * z[i]);
  for (let i = 0; i < x.length; i++) {
    const drop = a => a.filter((_, j) => j !== i);
    const loo = ols(drop(x), drop(y), [drop(z)]);
    let ss = 0;
    for (let j = 0; j < x.length; j++) {
      const yj = loo.intercept + loo.slope * x[j] + loo.nuisanceStats[0].coef * z[j];
      ss += (yhat[j] - yj) ** 2;
    }
    const want = ss / (k * s2);
    assert.ok(Math.abs(D[i] - want) <= 1e-9 * Math.max(1, want), `D[${i}]: ${D[i]} vs ${want}`);
  }
});

test("cooks: uses the model's columns; perN scales the threshold", () => {
  const data = [];
  for (let i = 0; i < 30; i++) data.push({ x: i, y: 2 * i + ((i * 7) % 5) - 2 });
  data.push({ x: 60, y: 0 });  // high leverage, far off the line
  const model = { x: 'x', y: 'y' };
  const flags = flagRows(data, rowsOf(data), { type: 'cooks', threshold: 4, perN: true }, model);
  assert.equal(flags[30], true);
  assert.ok(flags.filter(Boolean).length <= 3);
  assert.throws(() => flagRows(data, rowsOf(data), { type: 'cooks', threshold: 1 }), /needs a model/);
});

test('applyFilters: each step sees only rows kept by earlier steps', () => {
  // Without the exclusion, the bot's extreme value inflates the SD so the
  // moderate outlier survives; excluding the bot first lets z catch it.
  const vals = [10, 11, 9, 10, 11, 9, 10, 11, 9, 10, 16, 1000];
  const data = vals.map((v, i) => ({ v, bot: i === 11 ? 1 : 0 }));
  const excl = { type: 'exclude', column: 'bot' };
  const z = { type: 'z', columns: ['v'], threshold: 2.5 };

  const exclFirst = applyFilters(data, rowsOf(data), [excl, z]);
  assert.deepEqual(exclFirst.steps.map(s => s.excluded), [[11], [10]]);

  const zFirst = applyFilters(data, rowsOf(data), [z, excl]);
  assert.deepEqual(zFirst.steps.map(s => s.excluded), [[11], []]);
  assert.ok(zFirst.rows.includes(10));
});

test('applyFilters: starts from the candidate rows given', () => {
  const data = [1, 2, 3, 100, 2, 3].map(v => ({ v, flag: v === 2 }));
  const { rows } = applyFilters(data, [0, 2, 3, 4], [{ type: 'exclude', column: 'flag' }]);
  assert.deepEqual(rows, [0, 2, 3]);
});

test('unknown step type throws', () => {
  assert.throws(() => applyFilters([{}], [0], [{ type: 'nope' }]), /Unknown filter step/);
});
