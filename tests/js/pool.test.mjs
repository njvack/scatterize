import { test } from 'node:test';
import assert from 'node:assert/strict';

import { createRegressionPool } from '../../src/stats/pool.js';
import { handleMessage } from '../../src/stats/worker-handler.js';
import { ols } from '../../src/stats/ols.js';

// In-process stand-in for a Web Worker: replies asynchronously via
// handleMessage, after an optional per-op delay, using structured clones.
class FakeWorker {
  static created = 0;
  constructor({ delayMs = 0 } = {}) {
    FakeWorker.created++;
    this.delayMs = delayMs;
    this.terminated = false;
    this.onmessage = null;
    this.onerror = null;
    this.received = [];
  }
  postMessage(msg) {
    const copy = structuredClone(msg);
    this.received.push(copy);
    setTimeout(() => {
      if (this.terminated) return;
      this.onmessage?.({ data: structuredClone(handleMessage(copy)) });
    }, typeof this.delayMs === 'function' ? this.delayMs(copy) : this.delayMs);
  }
  terminate() { this.terminated = true; }
}

const x = [1, 2, 3, 4, 5, 6, 7, 8];
const y = [2.1, 3.9, 6.2, 8.1, 9.8, 12.2, 13.9, 16.1];

test('worker handler: runs ops, batches, and reports errors', () => {
  const r = handleMessage({ id: 1, op: 'ols', args: { x, y } });
  assert.equal(r.id, 1);
  assert.equal(r.ok, true);
  assert.equal(r.result.slope, ols(x, y).slope);

  const bad = handleMessage({ id: 2, op: 'nope', args: {} });
  assert.equal(bad.ok, false);
  assert.match(bad.error.message, /Unknown worker op/);

  const batch = handleMessage({ id: 3, op: 'batch', jobs: [
    { op: 'ols', args: { x, y } },
    { op: 'ols', args: { x: [1, 2], y: [1, 2] } },  // saturated → error
    { op: 'robustM', args: { x, y } },
  ] });
  assert.equal(batch.ok, true);
  assert.deepEqual(batch.result.map(j => j.ok), [true, false, true]);
  assert.match(batch.result[1].error.message, /saturated/);
});

test('pool: runs jobs and resolves with results', async () => {
  const pool = createRegressionPool({ size: 2, createWorker: () => new FakeWorker() });
  const [a, b] = await Promise.all([
    pool.run('ols', { x, y }),
    pool.run('robustM', { x, y }),
  ]);
  assert.equal(a.slope, ols(x, y).slope);
  assert.ok(Number.isFinite(b.slope));
  pool.terminate();
});

test('pool: never runs more jobs at once than workers; queues the rest', async () => {
  const workers = [];
  const pool = createRegressionPool({
    size: 2,
    createWorker: () => { const w = new FakeWorker({ delayMs: 10 }); workers.push(w); return w; },
  });
  const jobs = Array.from({ length: 5 }, () => pool.run('ols', { x, y }));
  assert.equal(pool.busy, 2);
  assert.equal(pool.queued, 3);
  await Promise.all(jobs);
  assert.equal(pool.busy, 0);
  assert.equal(pool.queued, 0);
  assert.equal(workers.reduce((s, w) => s + w.received.length, 0), 5);
  pool.terminate();
});

test('pool: remote errors reject with the original message', async () => {
  const pool = createRegressionPool({ size: 1, createWorker: () => new FakeWorker() });
  await assert.rejects(pool.run('ols', { x: [1, 2], y: [1, 2] }), /saturated/);
  // pool still works afterwards
  assert.ok(Number.isFinite((await pool.run('ols', { x, y })).slope));
  pool.terminate();
});

test('pool: aborting a queued job drops it without touching workers', async () => {
  FakeWorker.created = 0;
  const pool = createRegressionPool({ size: 1, createWorker: () => new FakeWorker({ delayMs: 10 }) });
  const first = pool.run('ols', { x, y });
  const ctl = new AbortController();
  const second = pool.run('ols', { x, y }, { signal: ctl.signal });
  ctl.abort();
  await assert.rejects(second, { name: 'AbortError' });
  await first;
  assert.equal(FakeWorker.created, 1);
  pool.terminate();
});

test('pool: aborting a running job replaces its worker; later jobs still run', async () => {
  const workers = [];
  const pool = createRegressionPool({
    size: 1,
    createWorker: () => { const w = new FakeWorker({ delayMs: 20 }); workers.push(w); return w; },
  });
  const ctl = new AbortController();
  const running = pool.run('ols', { x, y }, { signal: ctl.signal });
  const next = pool.run('ols', { x, y });
  ctl.abort();
  await assert.rejects(running, { name: 'AbortError' });
  assert.equal(workers.length, 2);
  assert.equal(workers[0].terminated, true);
  assert.equal((await next).slope, ols(x, y).slope);
  pool.terminate();
});

test('pool: already-aborted signal rejects immediately', async () => {
  const pool = createRegressionPool({ size: 1, createWorker: () => new FakeWorker() });
  const ctl = new AbortController();
  ctl.abort();
  await assert.rejects(pool.run('ols', { x, y }, { signal: ctl.signal }), { name: 'AbortError' });
  pool.terminate();
});

test('pool: worker crash fails its job and the pool recovers', async () => {
  let n = 0;
  const pool = createRegressionPool({
    size: 1,
    createWorker: () => {
      const w = new FakeWorker();
      if (n++ === 0) w.postMessage = () => setTimeout(() => w.onerror?.({ message: 'boom' }), 0);
      return w;
    },
  });
  await assert.rejects(pool.run('ols', { x, y }), /boom/);
  assert.ok(Number.isFinite((await pool.run('ols', { x, y })).slope));
  pool.terminate();
});

test('pool: terminate rejects pending and running jobs', async () => {
  const pool = createRegressionPool({ size: 1, createWorker: () => new FakeWorker({ delayMs: 20 }) });
  const a = pool.run('ols', { x, y });
  const b = pool.run('ols', { x, y });
  pool.terminate();
  await assert.rejects(a, /closed/);
  await assert.rejects(b, /closed/);
  await assert.rejects(pool.run('ols', { x, y }), /closed/);
});

test('pool: batch op returns per-job results', async () => {
  const pool = createRegressionPool({ size: 1, createWorker: () => new FakeWorker() });
  const res = await pool.run('batch', [{ op: 'ols', args: { x, y } }, { op: 'robustM', args: { x, y } }]);
  assert.equal(res.length, 2);
  assert.ok(res.every(r => r.ok));
  pool.terminate();
});
