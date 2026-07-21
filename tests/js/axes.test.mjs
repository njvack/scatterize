// tests/js/axes.test.mjs
// Unit tests for the pure tick-label overdraw suppression logic in axes.js.
// Run: node --test tests/js/axes.test.mjs

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tickPriorityOrder, resolveTickOverlap } from '../../src/plot/axes.js';

// ---------------------------------------------------------------------------
// tickPriorityOrder
// ---------------------------------------------------------------------------

test('tickPriorityOrder: 5-number summary → min, max, median, q1, q3', () => {
  assert.deepEqual(tickPriorityOrder([0, 25, 50, 75, 100]), [0, 4, 2, 1, 3]);
});

test('tickPriorityOrder: unsorted input ordered by value, not index', () => {
  // vals sorted: 1(idx 1), 2(idx 3), 3(idx 0), 4(idx 4), 5(idx 2)
  assert.deepEqual(tickPriorityOrder([3, 1, 5, 2, 4]), [1, 2, 0, 3, 4]);
});

test('tickPriorityOrder: one or two labels pass through', () => {
  assert.deepEqual(tickPriorityOrder([7]), [0]);
  assert.deepEqual(tickPriorityOrder([7, 3]), [1, 0]);
});

test('tickPriorityOrder: three labels → extrema before middle', () => {
  assert.deepEqual(tickPriorityOrder([0, 5, 10]), [0, 2, 1]);
});

// ---------------------------------------------------------------------------
// resolveTickOverlap
// ---------------------------------------------------------------------------

const ext = (pos, half = 10) => ({ pos, half });

test('resolveTickOverlap: well-separated labels all visible', () => {
  const vals = [0, 25, 50, 75, 100];
  const extents = vals.map(v => ext(v * 4));
  assert.deepEqual(resolveTickOverlap(vals, extents), [true, true, true, true, true]);
});

test('resolveTickOverlap: quantile clumped on extremum loses', () => {
  // q1 sits 5px from min; labels are 20px wide → q1 suppressed.
  const vals = [0, 1, 50, 75, 100];
  const extents = [ext(0), ext(5), ext(200), ext(300), ext(400)];
  assert.deepEqual(resolveTickOverlap(vals, extents), [true, false, true, true, true]);
});

test('resolveTickOverlap: median beats inner quantiles when all clumped mid-axis', () => {
  const vals = [0, 49, 50, 51, 100];
  const extents = [ext(0), ext(196), ext(200), ext(204), ext(400)];
  assert.deepEqual(resolveTickOverlap(vals, extents), [true, false, true, false, true]);
});

test('resolveTickOverlap: pathological — everything overlaps, only extrema drawn', () => {
  const vals = [0, 1, 2, 3, 100];
  const extents = [ext(0), ext(4), ext(8), ext(12), ext(40)];
  assert.deepEqual(resolveTickOverlap(vals, extents), [true, false, false, false, true]);
});

test('resolveTickOverlap: duplicate values (min = q1) draw once', () => {
  const vals = [0, 0, 50, 75, 100];
  const extents = [ext(0), ext(0), ext(200), ext(300), ext(400)];
  assert.deepEqual(resolveTickOverlap(vals, extents), [true, false, true, true, true]);
});

test('resolveTickOverlap: uses per-label extents, not a fixed width', () => {
  // Narrow labels 22px apart survive; wide ones at the same spacing collide.
  const vals = [0, 50, 100];
  const narrow = [ext(0, 5), ext(22, 5), ext(100, 5)];
  const wide   = [ext(0, 30), ext(22, 30), ext(100, 30)];
  assert.deepEqual(resolveTickOverlap(vals, narrow), [true, true, true]);
  assert.deepEqual(resolveTickOverlap(vals, wide),   [true, false, true]);
});
