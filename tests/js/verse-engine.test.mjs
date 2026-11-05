// Concurrency tests for the scatterverse scheduler (src/verse/engine.js).
//
// Three layers, as planned in #72:
//   1. the step function driven directly with events;
//   2. the runner with a manual fake pool, where the test picks which job
//      finishes when;
//   3. fast-check's fc.scheduler(), which explores seeded random interleavings
//      of user edits and job completions and shrinks failures.
// The invariants are checked against a synchronous model: from-scratch fits
// of the final spec on the final dataset.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fc from 'fast-check';

import { createEngineState, step, selectCurve, selectProgress, selectInference, selectForkSummaries } from '../../src/verse/engine.js';
import { createVerseRunner } from '../../src/verse/runner.js';
import { handleMessage } from '../../src/stats/worker-handler.js';
import { normalizeSpec, enumeratePaths } from '../../src/verse/spec.js';
import { prepareDataset } from '../../src/verse/dataset.js';
import { evaluatePlans, evaluatePlanReference, bootstrapPlans } from '../../src/verse/evaluate.js';
import { curveStats, bootstrapPValues } from '../../src/verse/summary.js';
import { syntheticRows, NUMERIC, FLAGS } from './verse-fixtures.mjs';

const rowsA = syntheticRows(60, 1);
const rowsB = syntheticRows(60, 2);
const dsA = prepareDataset(rowsA, { numeric: NUMERIC, flags: FLAGS });
const dsB = prepareDataset(rowsB, { numeric: NUMERIC, flags: FLAGS });
const ROWS = new Map([[dsA, rowsA], [dsB, rowsB]]);

const SPECS = [
  { outcomes: ['y'], predictors: ['x'], forks: [{ kind: 'covariates', columns: ['c1', 'c2'] }] },
  { outcomes: ['y'], predictors: ['x'], forks: [
    { kind: 'covariates', columns: ['c1', 'c2'] }, { kind: 'model', estimators: ['ols', 'm'] }] },
  { outcomes: ['y', 'y2'], predictors: ['x'], forks: [
    { kind: 'exclude', column: 'bot' }, { kind: 'covariates', mode: 'simplify', columns: ['c1', 'c2', 'c3'] }] },
  { outcomes: ['y', 'y2'], predictors: ['x'], forks: [
    { kind: 'covariates', mode: 'simplify', columns: ['c1', 'c2', 'c3'] }, { kind: 'exclude', column: 'bot' },
    { kind: 'outlier', rule: 'cooks', thresholds: [4], perN: true }] },
  { outcomes: ['y2'], predictors: ['x', 'x2'], forks: [{ kind: 'model', estimators: ['m'] }] },
].map(normalizeSpec);

const abortError = () => Object.assign(new Error('aborted'), { name: 'AbortError' });
const exec = (op, args) => {
  const reply = handleMessage(structuredClone({ id: 0, op, args }));
  if (!reply.ok) throw Object.assign(new Error(reply.error.message), { name: reply.error.name });
  return reply.result;
};

// The synchronous model: what the final curve must look like.
function expectedCurve(ds, spec) {
  const rows = ROWS.get(ds);
  return enumeratePaths(spec).paths.map(p => evaluatePlanReference(rows, p.plan));
}

function expectedInference(ds, spec, { seed, draws }) {
  const plans = enumeratePaths(spec).paths.map(p => p.plan);
  const obs = evaluatePlans(ds, plans);
  const okPlans = plans.filter((_, i) => obs[i].ok);
  const okObs = obs.filter(r => r.ok);
  const boot = bootstrapPlans(ds, okPlans, okObs.map(r => r.estimate), { seed, count: draws });
  const observed = curveStats(okObs.map(r => r.partialR), okObs.map(r => r.z));
  return bootstrapPValues(observed, boot.r, boot.z, okPlans.length, draws);
}

function assertCurveMatches(state, ds, spec) {
  const got = selectCurve(state).paths.map(p => p.result);
  const want = expectedCurve(ds, spec);
  assert.equal(got.length, want.length);
  got.forEach((g, i) => {
    assert.ok(g, `path ${i} has no result`);
    assert.equal(g.key, want[i].key);
    assert.equal(g.ok, want[i].ok);
    assert.equal(g.n, want[i].n);
    if (!g.ok) return;
    const tol = 1e-9 * Math.max(1, Math.abs(want[i].estimate));
    assert.ok(Math.abs(g.estimate - want[i].estimate) <= tol, `${g.key}: ${g.estimate} vs ${want[i].estimate}`);
    assert.ok(Math.abs(g.partialR - want[i].partialR) <= 1e-9);
  });
}

// Run every 'run' effect synchronously (an instant worker).
function drain(state, effects) {
  const queue = [...effects];
  while (queue.length) {
    const e = queue.shift();
    if (e.type !== 'run') continue;
    const out = step(state, { type: 'done', id: e.id, result: exec(e.op, e.args) });
    queue.push(...out.effects);
  }
}

// ---------------------------------------------------------------------------
// 1. Step function
// ---------------------------------------------------------------------------

test('step: nothing runs without both data and a spec', () => {
  const s = createEngineState({ capacity: 2 });
  assert.deepEqual(step(s, { type: 'spec', spec: SPECS[0] }).effects, []);
  const s2 = createEngineState({ capacity: 2 });
  assert.deepEqual(step(s2, { type: 'data', dataset: dsA }).effects, []);
});

test('step: runs at most `capacity` jobs, OLS before M, and completes the curve', () => {
  const s = createEngineState({ capacity: 2 });
  step(s, { type: 'data', dataset: dsA });
  const { effects } = step(s, { type: 'spec', spec: SPECS[1] });
  assert.ok(effects.length <= 2 && effects.length > 0);
  assert.ok(effects[0].args.plans.every(p => p.estimator === 'ols'));
  const p = selectProgress(s);
  assert.equal(p.total, 8);
  assert.equal(p.running, effects.length);
  drain(s, effects);
  assert.equal(selectProgress(s).done, 8);
  assertCurveMatches(s, dsA, SPECS[1]);
  assert.equal(s.jobs.size, 0);
});

test('step: changing the spec computes only new paths', () => {
  const s = createEngineState({ capacity: 1 });
  step(s, { type: 'data', dataset: dsA });
  drain(s, step(s, { type: 'spec', spec: SPECS[0] }).effects);
  const before = new Set(s.results.keys());
  const sent = [];
  let { effects } = step(s, { type: 'spec', spec: SPECS[1] });
  while (effects.length) {
    const next = [];
    for (const e of effects) {
      if (e.type !== 'run') continue;
      sent.push(...e.args.plans.map(p => p.key));
      next.push(...step(s, { type: 'done', id: e.id, result: exec(e.op, e.args) }).effects);
    }
    effects = next;
  }
  // SPECS[1] adds a model fork: its OLS half is already known.
  assert.equal(sent.length, 4);
  assert.ok(sent.every(k => !before.has(k)));
  assertCurveMatches(s, dsA, SPECS[1]);
});

test('step: reordering forks that commute recomputes nothing', () => {
  const s = createEngineState({ capacity: 1 });
  step(s, { type: 'data', dataset: dsA });
  drain(s, step(s, { type: 'spec', spec: SPECS[2] }).effects);
  const swapped = { ...SPECS[2], forks: [...SPECS[2].forks].reverse() };
  assert.deepEqual(step(s, { type: 'spec', spec: swapped }).effects, []);
  assertCurveMatches(s, dsA, normalizeSpec(swapped));
});

test('step: a running job whose paths all disappear is aborted, and its late reply is ignored', () => {
  const s = createEngineState({ capacity: 1 });
  step(s, { type: 'data', dataset: dsA });
  const [first] = step(s, { type: 'spec', spec: SPECS[4] }).effects;
  const { effects } = step(s, { type: 'spec', spec: SPECS[0] });
  assert.deepEqual(effects[0], { type: 'abort', id: first.id });
  assert.equal(effects[1].type, 'run');
  // The aborted job replies anyway (e.g. it finished just before the abort landed).
  const out = step(s, { type: 'done', id: first.id, result: exec(first.op, first.args) });
  assert.deepEqual(out.effects, []);
  assert.ok(first.args.plans.every(p => !s.results.has(p.key)));
});

test('step: new data aborts everything and drops all results', () => {
  const s = createEngineState({ capacity: 3 });
  step(s, { type: 'data', dataset: dsA });
  drain(s, step(s, { type: 'spec', spec: SPECS[0] }).effects);
  const run = step(s, { type: 'spec', spec: SPECS[2] }).effects.filter(e => e.type === 'run');
  const { effects } = step(s, { type: 'data', dataset: dsB });
  assert.deepEqual(effects.filter(e => e.type === 'abort').map(e => e.id).sort(), run.map(e => e.id).sort());
  for (const e of run) step(s, { type: 'done', id: e.id, result: exec(e.op, e.args) });  // stale replies
  drain(s, effects);
  assertCurveMatches(s, dsB, SPECS[2]);
});

test('step: a failed job records an error result for each of its paths', () => {
  const s = createEngineState({ capacity: 1 });
  step(s, { type: 'data', dataset: dsA });
  const [e] = step(s, { type: 'spec', spec: SPECS[0] }).effects;
  step(s, { type: 'failed', id: e.id, error: 'worker crashed' });
  const results = selectCurve(s).paths.map(p => p.result);
  assert.ok(results.every(r => r && !r.ok && /worker crashed/.test(r.error)));
});

test('step: bootstrap runs after the fits, matches a one-shot computation, and resets on a new seed', () => {
  const s = createEngineState({ capacity: 2 });
  step(s, { type: 'data', dataset: dsA });
  step(s, { type: 'bootstrap', seed: 3, draws: 20 });
  const first = step(s, { type: 'spec', spec: SPECS[2] }).effects;
  assert.ok(first.every(e => e.op === 'verse:eval'));
  drain(s, first);
  const inf = selectInference(s).inference;
  assert.deepEqual(inf, expectedInference(dsA, SPECS[2], { seed: 3, draws: 20 }));
  assert.equal(selectProgress(s).boot.done, selectProgress(s).boot.total);

  const { effects } = step(s, { type: 'bootstrap', seed: 4, draws: 20 });
  assert.equal(selectInference(s).inference, null);
  drain(s, effects);
  assert.deepEqual(selectInference(s).inference, expectedInference(dsA, SPECS[2], { seed: 4, draws: 20 }));
  assert.equal(selectForkSummaries(s).length, 4);
});

test('step: a spec naming a column the data lacks fails those paths without throwing', () => {
  const s = createEngineState();
  step(s, { type: 'data', dataset: dsA });
  const { effects } = step(s, { type: 'spec', spec: { outcomes: ['nope'], predictors: ['x'] } });
  assert.deepEqual(effects, []);
  const [p] = selectCurve(s).paths;
  assert.equal(p.result.ok, false);
  assert.match(p.result.error, /nope/);
});

test('step: an invalid spec clears the curve and reports why', () => {
  const s = createEngineState();
  step(s, { type: 'data', dataset: dsA });
  step(s, { type: 'spec', spec: { outcomes: [], predictors: ['x'] } });
  assert.match(selectCurve(s).error, /outcome/);
  assert.equal(selectCurve(s).paths.length, 0);
});

// ---------------------------------------------------------------------------
// 2. Runner with a manual fake pool
// ---------------------------------------------------------------------------

// A pool whose jobs finish only when the test says so.
function manualPool(size) {
  const jobs = [];
  let maxBusy = 0;
  const pool = {
    size,
    jobs,
    get maxBusy() { return maxBusy; },
    get busy() { return jobs.filter(j => j.state === 'running').length; },
    run(op, args, { signal }) {
      return new Promise((resolve, reject) => {
        const job = { op, args, state: 'running' };
        job.finish = () => {
          if (job.state !== 'running') return;
          job.state = 'done';
          resolve(exec(op, args));
        };
        signal.addEventListener('abort', () => {
          if (job.state !== 'running') return;
          job.state = 'aborted';
          reject(abortError());
        }, { once: true });
        jobs.push(job);
        maxBusy = Math.max(maxBusy, pool.busy);
      });
    },
  };
  return pool;
}

const tick = () => new Promise(r => setImmediate(r));

async function finishAll(pool, order = 'fifo') {
  for (;;) {
    const open = pool.jobs.filter(j => j.state === 'running');
    if (!open.length) return;
    (order === 'lifo' ? open[open.length - 1] : open[0]).finish();
    await tick();
  }
}

test('runner: jobs finishing in reverse order still give the synchronous result', async () => {
  const pool = manualPool(3);
  const engine = createVerseRunner({ pool });
  engine.dispatch({ type: 'data', dataset: dsA });
  engine.dispatch({ type: 'spec', spec: SPECS[3] });
  await finishAll(pool, 'lifo');
  assertCurveMatches(engine.state, dsA, SPECS[3]);
  assert.ok(pool.maxBusy <= 3);
  assert.equal(engine.inFlight, 0);
});

test('runner: edits while jobs are in flight; superseded jobs are aborted and never write', async () => {
  const pool = manualPool(2);
  const events = [];
  const engine = createVerseRunner({ pool, onChange: (_, e) => events.push(e) });
  engine.dispatch({ type: 'data', dataset: dsA });
  engine.dispatch({ type: 'spec', spec: SPECS[4] });   // M paths, in flight
  const inflight = pool.jobs.slice();
  engine.dispatch({ type: 'spec', spec: SPECS[0] });   // drops them all
  assert.ok(inflight.every(j => j.state === 'aborted'));
  engine.dispatch({ type: 'data', dataset: dsB });
  engine.dispatch({ type: 'spec', spec: SPECS[2] });
  await finishAll(pool);
  assertCurveMatches(engine.state, dsB, SPECS[2]);
  const doneIds = events.filter(e => e.type === 'done').map(e => e.id);
  assert.equal(new Set(doneIds).size, doneIds.length);
});

// ---------------------------------------------------------------------------
// 3. Randomized interleavings with fc.scheduler()
// ---------------------------------------------------------------------------

const actionArb = fc.oneof(
  { weight: 4, arbitrary: fc.nat(SPECS.length - 1).map(i => ({ type: 'spec', spec: SPECS[i] })) },
  { weight: 1, arbitrary: fc.constantFrom(dsA, dsB).map(dataset => ({ type: 'data', dataset })) },
  { weight: 1, arbitrary: fc.record({ type: fc.constant('bootstrap'), seed: fc.nat(3), draws: fc.constantFrom(0, 3, 6) }) },
);

test('fc.scheduler: any interleaving converges to the synchronous model', async () => {
  await fc.assert(fc.asyncProperty(
    fc.scheduler(),
    fc.array(actionArb, { minLength: 1, maxLength: 6 }),
    fc.integer({ min: 1, max: 3 }),
    async (s, actions, capacity) => {
      let busy = 0, maxBusy = 0, started = 0, settled = 0;
      const violations = [];
      let nextId = 0;
      const pool = {
        size: capacity,
        run(op, args, { signal }) {
          const id = ++nextId;
          started++;
          busy++;
          maxBusy = Math.max(maxBusy, busy);
          return new Promise((resolve, reject) => {
            let open = true;
            const close = () => { open = false; busy--; settled++; };
            signal.addEventListener('abort', () => {
              if (!open) return;
              close();
              reject(abortError());
            }, { once: true });
            s.schedule(Promise.resolve(), `job ${id} ${op}`).then(() => {
              if (!open) return;
              close();
              resolve(exec(op, args));
            });
          });
        },
      };

      // Observe every transition: collect aborted job ids from effects, and
      // check that a reply for an aborted job changes no results.
      const aborted = new Set();
      const snapshot = st => [...st.results.entries(), ...st.bootResults.entries()];
      const observedStep = (state, event) => {
        const late = (event.type === 'done' || event.type === 'failed') && aborted.has(event.id);
        const before = late ? snapshot(state) : null;
        const out = step(state, event);
        if (late) {
          const after = snapshot(out.state);
          if (after.length !== before.length || after.some(([k, v], i) => before[i][0] !== k || before[i][1] !== v)) {
            violations.push(`aborted job ${event.id} wrote`);
          }
        }
        for (const e of out.effects) if (e.type === 'abort') aborted.add(e.id);
        return out;
      };
      const engine = createVerseRunner({ pool, step: observedStep });
      const dispatch = engine.dispatch;

      dispatch({ type: 'data', dataset: dsA });
      let finalData = dsA, finalSpec = null, boot = { seed: 1, draws: 0 };
      for (const a of actions) {
        if (a.type === 'data') finalData = a.dataset;
        if (a.type === 'spec') finalSpec = a.spec;
        if (a.type === 'bootstrap') boot = { seed: a.seed, draws: a.draws };
      }
      s.scheduleSequence(actions.map(a => ({ label: a.type, builder: async () => dispatch(a) })));
      // Replies dispatch on a later microtask, so new jobs can appear after
      // waitAll() returns; keep going until nothing is left.
      do { await s.waitAll(); await tick(); } while (s.count() > 0);

      assert.deepEqual(violations, []);
      assert.ok(maxBusy <= capacity, `max busy ${maxBusy} > ${capacity}`);
      assert.equal(started, settled, 'every job settles');
      assert.equal(engine.inFlight, 0);
      assert.equal(engine.state.jobs.size, 0);
      if (!finalSpec) return;
      assertCurveMatches(engine.state, finalData, finalSpec);
      // Every cached result belongs to the final dataset, wanted or not.
      const rows = ROWS.get(finalData);
      const byKey = new Map();
      for (const sp of SPECS) for (const p of enumeratePaths(sp).paths) byKey.set(p.plan.key, p.plan);
      for (const [key, res] of engine.state.results) {
        const ref = evaluatePlanReference(rows, byKey.get(key));
        assert.equal(res.n, ref.n, `stale result for ${key}`);
        if (res.ok) assert.ok(Math.abs(res.estimate - ref.estimate) <= 1e-9 * Math.max(1, Math.abs(ref.estimate)));
      }
      const inf = selectInference(engine.state).inference;
      if (boot.draws) assert.deepEqual(inf, expectedInference(finalData, finalSpec, boot));
      else assert.equal(inf, null);
    },
  ), { numRuns: 150, seed: 42, includeErrorInReport: true });
});
