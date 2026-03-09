// tests/js/diagnostics.test.mjs
// Unit tests for pure math functions exported from plot/diagnostics.js.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalQuantile, normalPDF } from '../../src/plot/diagnostics.js';

// ---------------------------------------------------------------------------
// normalQuantile (inverse CDF)
// ---------------------------------------------------------------------------

test('normalQuantile: p=0.5 → 0 (median)', () => {
  assert.ok(Math.abs(normalQuantile(0.5)) < 1e-6);
});

test('normalQuantile: p=0.975 → ≈1.96', () => {
  assert.ok(Math.abs(normalQuantile(0.975) - 1.96) < 0.001);
});

test('normalQuantile: p=0.025 → ≈-1.96', () => {
  assert.ok(Math.abs(normalQuantile(0.025) - (-1.96)) < 0.001);
});

test('normalQuantile: p=0.8413 → ≈1.0 (z=1)', () => {
  assert.ok(Math.abs(normalQuantile(0.8413) - 1.0) < 0.01);
});

test('normalQuantile: p=0 → -Infinity', () => {
  assert.equal(normalQuantile(0), -Infinity);
});

test('normalQuantile: p=1 → +Infinity', () => {
  assert.equal(normalQuantile(1), Infinity);
});

test('normalQuantile: symmetry — q(p) = -q(1-p)', () => {
  for (const p of [0.01, 0.05, 0.1, 0.25]) {
    const q = normalQuantile(p);
    const qSym = normalQuantile(1 - p);
    assert.ok(Math.abs(q + qSym) < 1e-5, `q(${p})=${q}, q(${1-p})=${qSym}`);
  }
});

test('normalQuantile: tail regions use different code paths', () => {
  // p < 0.02425 exercises the lower tail branch
  const q = normalQuantile(0.001);
  assert.ok(q < -3, `expected q < -3, got ${q}`);
  assert.ok(Math.abs(q - (-3.0902)) < 0.01);
});

// ---------------------------------------------------------------------------
// normalPDF
// ---------------------------------------------------------------------------

test('normalPDF: standard normal at 0 → 1/√(2π)', () => {
  const expected = 1 / Math.sqrt(2 * Math.PI);
  assert.ok(Math.abs(normalPDF(0, 0, 1) - expected) < 1e-10);
});

test('normalPDF: standard normal is symmetric', () => {
  assert.ok(Math.abs(normalPDF(1, 0, 1) - normalPDF(-1, 0, 1)) < 1e-10);
});

test('normalPDF: peak at mu', () => {
  const atMu = normalPDF(5, 5, 2);
  const away = normalPDF(7, 5, 2);
  assert.ok(atMu > away);
});

test('normalPDF: larger sigma → lower peak', () => {
  const narrow = normalPDF(0, 0, 1);
  const wide = normalPDF(0, 0, 2);
  assert.ok(narrow > wide);
});

test('normalPDF: known value — φ(1) ≈ 0.24197', () => {
  assert.ok(Math.abs(normalPDF(1, 0, 1) - 0.24197) < 1e-4);
});
