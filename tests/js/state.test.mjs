// tests/js/state.test.mjs
// Unit tests for the pure parse/serialize functions in src/state.js.
// Run: node --test tests/js/state.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseState, serializeState, DEFAULTS } from '../../src/state.js';

// ---------------------------------------------------------------------------
// parseState
// ---------------------------------------------------------------------------

test('parseState: empty string returns defaults', () => {
  const s = parseState('');
  assert.equal(s.src, null);
  assert.equal(s.x, 0);
  assert.equal(s.y, 1);
  assert.equal(s.m, 'ols');
  assert.deepEqual(s.n, []);
  assert.deepEqual(s.c, []);
  assert.equal(s.h, null);
  assert.equal(s.f, null);
  assert.equal(s.xl, null);
  assert.equal(s.yl, null);
});

test('parseState: src and basic integer params', () => {
  const s = parseState('src=https%3A%2F%2Fexample.com%2Fdata.csv&x=2&y=5');
  assert.equal(s.src, 'https://example.com/data.csv');
  assert.equal(s.x, 2);
  assert.equal(s.y, 5);
});

test('parseState: all model keys round-trip', () => {
  for (const m of ['ols', 'robust', 'spearman', 'theilsen']) {
    assert.equal(parseState(`m=${m}`).m, m);
  }
});

test('parseState: nuisance and censor as int lists', () => {
  const s = parseState('n=1%2C3%2C5&c=0%2C7');
  assert.deepEqual(s.n, [1, 3, 5]);
  assert.deepEqual(s.c, [0, 7]);
});

test('parseState: group and filter as ints', () => {
  const s = parseState('h=3&f=2');
  assert.equal(s.h, 3);
  assert.equal(s.f, 2);
});

test('parseState: custom axis tick float lists', () => {
  const s = parseState('xl=0%2C1%2C2.5&yl=-1%2C0%2C1');
  assert.deepEqual(s.xl, [0, 1, 2.5]);
  assert.deepEqual(s.yl, [-1, 0, 1]);
});

test('parseState: non-numeric values filtered from int lists', () => {
  const s = parseState('n=1%2Cfoo%2C3');
  assert.deepEqual(s.n, [1, 3]);
});

test('parseState: empty n/c stay as empty arrays', () => {
  const s = parseState('n=&c=');
  assert.deepEqual(s.n, []);
  assert.deepEqual(s.c, []);
});

test('parseState: h=0 is parsed as 0, not null', () => {
  assert.equal(parseState('h=0').h, 0);
});

// ---------------------------------------------------------------------------
// serializeState
// ---------------------------------------------------------------------------

test('serializeState: no src produces empty string', () => {
  assert.equal(serializeState({ ...DEFAULTS }), '');
});

test('serializeState: with src includes x, y, m', () => {
  const params = new URLSearchParams(
    serializeState({ ...DEFAULTS, src: 'https://example.com/data.csv' })
  );
  assert.equal(params.get('src'), 'https://example.com/data.csv');
  assert.equal(params.get('x'), '0');
  assert.equal(params.get('y'), '1');
  assert.equal(params.get('m'), 'ols');
});

test('serializeState: no src means no x, y, m in output', () => {
  const params = new URLSearchParams(serializeState({ ...DEFAULTS }));
  assert.equal(params.get('x'), null);
  assert.equal(params.get('y'), null);
  assert.equal(params.get('m'), null);
});

test('serializeState: censored rows serialized as comma list', () => {
  const params = new URLSearchParams(
    serializeState({ ...DEFAULTS, src: 'x', c: [1, 3, 5] })
  );
  assert.equal(params.get('c'), '1,3,5');
});

test('serializeState: empty n and c are omitted', () => {
  const params = new URLSearchParams(
    serializeState({ ...DEFAULTS, src: 'x', n: [], c: [] })
  );
  assert.equal(params.get('n'), null);
  assert.equal(params.get('c'), null);
});

test('serializeState: null h and f are omitted', () => {
  const params = new URLSearchParams(
    serializeState({ ...DEFAULTS, src: 'x', h: null, f: null })
  );
  assert.equal(params.get('h'), null);
  assert.equal(params.get('f'), null);
});

test('serializeState: h=0 is included (falsy but valid index)', () => {
  const params = new URLSearchParams(
    serializeState({ ...DEFAULTS, src: 'x', h: 0 })
  );
  assert.equal(params.get('h'), '0');
});

test('serializeState: h and f included when set', () => {
  const params = new URLSearchParams(
    serializeState({ ...DEFAULTS, src: 'x', h: 2, f: 4 })
  );
  assert.equal(params.get('h'), '2');
  assert.equal(params.get('f'), '4');
});

test('serializeState: xl/yl float lists serialized correctly', () => {
  const params = new URLSearchParams(
    serializeState({ ...DEFAULTS, src: 'x', xl: [0, 1, 2.5], yl: [-1, 0, 1] })
  );
  assert.equal(params.get('xl'), '0,1,2.5');
  assert.equal(params.get('yl'), '-1,0,1');
});

// ---------------------------------------------------------------------------
// Round-trip
// ---------------------------------------------------------------------------

test('round-trip: parse → serialize → parse preserves all fields', () => {
  const original = [
    'src=https%3A%2F%2Fexample.com%2Fdata.csv',
    'x=2', 'y=3', 'm=robust',
    'n=1%2C4', 'c=0%2C2',
    'h=5', 'f=6',
    'xl=0%2C1%2C2.5', 'yl=-1%2C0',
  ].join('&');
  const parsed = parseState(original);
  const reparsed = parseState(serializeState(parsed));
  assert.deepEqual(parsed, reparsed);
});
