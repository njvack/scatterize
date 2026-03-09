// tests/js/smoother.test.mjs
// Unit tests for plot/smoother.js pure functions.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runningMedianIQR, lowess } from '../../src/plot/smoother.js';

// Helper: generate simple linear data [{x, y}]
function linearData(n, slope = 1, intercept = 0) {
  return Array.from({ length: n }, (_, i) => ({
    x: i,
    y: intercept + slope * i,
  }));
}

// Helper: generate noisy data
function noisyLinearData(n, slope = 1, noise = 0.1) {
  // Use a seeded-ish approach (deterministic pattern, not random)
  return Array.from({ length: n }, (_, i) => ({
    x: i,
    y: slope * i + noise * Math.sin(i * 137.5),
  }));
}

// ---------------------------------------------------------------------------
// runningMedianIQR
// ---------------------------------------------------------------------------

test('runningMedianIQR: returns null for fewer than 7 points', () => {
  const data = linearData(5);
  assert.equal(runningMedianIQR(data, 0.5), null);
});

test('runningMedianIQR: returns { line, band } for sufficient data', () => {
  const data = linearData(20);
  const result = runningMedianIQR(data, 0.5);
  assert.ok(result != null);
  assert.ok(Array.isArray(result.line));
  assert.ok(Array.isArray(result.band));
  assert.ok(result.line.length > 0);
  assert.equal(result.line.length, result.band.length);
});

test('runningMedianIQR: line points have {x, y}', () => {
  const result = runningMedianIQR(linearData(20), 0.5);
  for (const p of result.line) {
    assert.ok('x' in p);
    assert.ok('y' in p);
    assert.ok(Number.isFinite(p.x));
    assert.ok(Number.isFinite(p.y));
  }
});

test('runningMedianIQR: band points have {x, y0, y1}', () => {
  const result = runningMedianIQR(linearData(20), 0.5);
  for (const p of result.band) {
    assert.ok('x' in p);
    assert.ok('y0' in p);
    assert.ok('y1' in p);
  }
});

test('runningMedianIQR: line tracks linear trend', () => {
  const data = linearData(50, 2, 1);
  const result = runningMedianIQR(data, 0.3);
  // Mid-range line points should be close to y = 2x + 1
  const midPoints = result.line.filter(p => p.x > 10 && p.x < 40);
  for (const p of midPoints) {
    const expected = 2 * p.x + 1;
    assert.ok(Math.abs(p.y - expected) < 3, `at x=${p.x}: y=${p.y}, expected ~${expected}`);
  }
});

test('runningMedianIQR: band contains line (y0 ≤ y ≤ y1)', () => {
  const data = noisyLinearData(50, 1, 2);
  const result = runningMedianIQR(data, 0.4);
  for (let i = 0; i < result.line.length; i++) {
    assert.ok(result.band[i].y0 <= result.line[i].y + 1e-10,
      `y0=${result.band[i].y0} > y=${result.line[i].y}`);
    assert.ok(result.band[i].y1 >= result.line[i].y - 1e-10,
      `y1=${result.band[i].y1} < y=${result.line[i].y}`);
  }
});

test('runningMedianIQR: respects gridSize parameter', () => {
  const data = linearData(20);
  const r50 = runningMedianIQR(data, 0.5, 50);
  const r100 = runningMedianIQR(data, 0.5, 100);
  assert.equal(r50.line.length, 50);
  assert.equal(r100.line.length, 100);
});

test('runningMedianIQR: constant x → null', () => {
  const data = Array.from({ length: 10 }, () => ({ x: 5, y: 1 }));
  assert.equal(runningMedianIQR(data, 0.5), null);
});

// ---------------------------------------------------------------------------
// lowess
// ---------------------------------------------------------------------------

test('lowess: returns null for fewer than 7 points', () => {
  assert.equal(lowess(linearData(5), 0.5), null);
});

test('lowess: returns { line, band } for sufficient data', () => {
  const result = lowess(linearData(20), 0.5);
  assert.ok(result != null);
  assert.ok(Array.isArray(result.line));
  assert.ok(result.band != null);
});

test('lowess: line tracks linear trend closely', () => {
  const data = linearData(100, 3, 2);
  const result = lowess(data, 0.3, { nBootstrap: 0 });
  // Interior points should be very close to y = 3x + 2
  const midPoints = result.line.filter(p => p.x > 20 && p.x < 80);
  for (const p of midPoints) {
    const expected = 3 * p.x + 2;
    assert.ok(Math.abs(p.y - expected) < 1, `at x=${p.x}: y=${p.y}, expected ~${expected}`);
  }
});

test('lowess: band is null when nBootstrap=0', () => {
  const result = lowess(linearData(20), 0.5, { nBootstrap: 0 });
  assert.equal(result.band, null);
});

test('lowess: band surrounds line when bootstrapping', () => {
  const data = noisyLinearData(50, 1, 0.5);
  const result = lowess(data, 0.5, { nBootstrap: 50 });
  assert.ok(result.band != null);
  for (let i = 0; i < result.line.length; i++) {
    assert.ok(result.band[i].y0 <= result.line[i].y + 1e-10);
    assert.ok(result.band[i].y1 >= result.line[i].y - 1e-10);
  }
});

test('lowess: constant x → null', () => {
  const data = Array.from({ length: 10 }, () => ({ x: 5, y: 1 }));
  assert.equal(lowess(data, 0.5), null);
});

test('lowess: respects gridSize', () => {
  const result = lowess(linearData(30), 0.5, { gridSize: 40, nBootstrap: 0 });
  assert.equal(result.line.length, 40);
});

test('lowess: unsorted input works correctly', () => {
  const data = linearData(30, 1, 0);
  // Shuffle
  const shuffled = [...data].sort(() => Math.sin(data.length) - 0.5);
  const result = lowess(shuffled, 0.5, { nBootstrap: 0 });
  assert.ok(result != null);
  // Line x values should be monotonically increasing
  for (let i = 1; i < result.line.length; i++) {
    assert.ok(result.line[i].x >= result.line[i - 1].x);
  }
});
