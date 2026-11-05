// src/verse/engine.js
// Scheduling for the path engine as a step function:
//
//   step(state, event) → { state, effects }
//
// It does no I/O and nothing asynchronous; worker calls go out as effects
// that a thin runner (runner.js) carries out, and their replies come back as
// events. That makes every interleaving of user edits and worker replies
// reproducible in tests. For speed with tens of thousands of paths it updates
// `state` in place and returns it, so callers must not keep old states.
//
// Events:
//   { type: 'data', dataset }        new dataset (dataset.js): drops everything
//   { type: 'spec', spec }           new spec: computes only paths not yet known
//   { type: 'bootstrap', seed, draws }   draws = 0 turns inference off
//   { type: 'capacity', capacity }   how many jobs may run at once
//   { type: 'done', id, result }     a job finished
//   { type: 'failed', id, error }    a job failed (worker crash, not a fit error)
//
// Effects:
//   { type: 'run', id, op, args }    start a worker job (op: 'verse:eval' | 'verse:boot')
//   { type: 'abort', id }            cancel a running job; its reply must be ignored
//
// Results are cached by path key (spec.js planPath), so editing, adding or
// reordering forks only computes paths whose evaluation actually changed.
// The cache holds results for the current dataset only.
//
// Jobs are queued here, not in the pool, so priorities hold: OLS paths first,
// then M paths, then bootstrap draws. At most `capacity` jobs run at once.

import { normalizeSpec, enumeratePaths } from './spec.js';
import { subsetDataset, planColumns } from './dataset.js';
import { curveStats, bootstrapPValues, forkSummaries } from './summary.js';

const PRIORITY = { eval: 0, evalM: 1, boot: 2, bootM: 3 };

export function createEngineState({ capacity = 1, diagnostics = false } = {}) {
  return {
    capacity: Math.max(1, capacity),
    diagnostics,
    dataset: null,
    spec: null,
    specError: null,
    dims: null,
    paths: [],
    wanted: new Map(),      // key → plan, for the current spec
    results: new Map(),     // key → path result
    pending: new Set(),     // keys in a queued or running eval job
    boot: { seed: 1, draws: 0 },
    bootResults: new Map(), // key → { r, z } (Float32Array, one entry per draw)
    bootPending: new Set(),
    jobs: new Map(),        // id → { id, kind, keys, priority, running }
    nextId: 1,
  };
}

// ---------------------------------------------------------------------------
// Step
// ---------------------------------------------------------------------------

export function step(state, event) {
  const effects = [];
  switch (event.type) {
    case 'data':
      abortAll(state, effects, () => true);
      state.dataset = event.dataset;
      state.results.clear();
      state.bootResults.clear();
      break;

    case 'spec':
      try {
        state.spec = normalizeSpec(event.spec);
        const { dims, paths } = enumeratePaths(state.spec);
        state.dims = dims;
        state.paths = paths;
        state.specError = null;
      } catch (err) {
        state.spec = null;
        state.dims = null;
        state.paths = [];
        state.specError = err.message;
      }
      state.wanted = new Map(state.paths.map(p => [p.plan.key, p.plan]));
      prune(state, effects);
      break;

    case 'bootstrap': {
      const seed = event.seed ?? state.boot.seed;
      const draws = Math.max(0, event.draws ?? state.boot.draws);
      if (seed !== state.boot.seed || draws !== state.boot.draws) {
        abortAll(state, effects, job => job.kind === 'boot');
        state.bootResults.clear();
        state.boot = { seed, draws };
      }
      break;
    }

    case 'capacity':
      state.capacity = Math.max(1, event.capacity);
      break;

    case 'done':
    case 'failed': {
      const job = state.jobs.get(event.id);
      if (!job) break;  // aborted or superseded: never write
      state.jobs.delete(event.id);
      if (job.kind === 'eval') {
        job.keys.forEach(k => state.pending.delete(k));
        job.keys.forEach((k, i) => {
          state.results.set(k, event.type === 'done'
            ? event.result[i]
            : { key: k, ok: false, error: `worker failed: ${event.error}`, n: null });
        });
      } else {
        job.keys.forEach(k => state.bootPending.delete(k));
        const draws = state.boot.draws;
        job.keys.forEach((k, i) => {
          if (event.type === 'done') {
            state.bootResults.set(k, {
              r: event.result.r.slice(i * draws, (i + 1) * draws),
              z: event.result.z.slice(i * draws, (i + 1) * draws),
            });
          } else {
            state.bootResults.set(k, { r: new Float32Array(draws).fill(NaN), z: new Float32Array(draws).fill(NaN) });
          }
        });
      }
      break;
    }

    default:
      throw new Error(`Unknown engine event: ${event.type}`);
  }
  schedule(state);
  pump(state, effects);
  return { state, effects };
}

function removeJob(state, job, effects) {
  if (job.running) effects.push({ type: 'abort', id: job.id });
  const pend = job.kind === 'eval' ? state.pending : state.bootPending;
  job.keys.forEach(k => pend.delete(k));
  state.jobs.delete(job.id);
}

function abortAll(state, effects, which) {
  for (const job of [...state.jobs.values()]) if (which(job)) removeJob(state, job, effects);
}

// After a spec change: queued jobs drop paths no longer wanted (and vanish
// when empty); running jobs are aborted only when none of their paths are
// wanted. A running job's leftover results are still valid for this dataset,
// so they're cached when it finishes.
function prune(state, effects) {
  for (const job of [...state.jobs.values()]) {
    const keep = job.keys.filter(k => state.wanted.has(k));
    if (keep.length === job.keys.length) continue;
    if (job.running) {
      if (!keep.length) removeJob(state, job, effects);
      continue;
    }
    const pend = job.kind === 'eval' ? state.pending : state.bootPending;
    job.keys.filter(k => !state.wanted.has(k)).forEach(k => pend.delete(k));
    if (keep.length) job.keys = keep;
    else state.jobs.delete(job.id);
  }
}

// ---------------------------------------------------------------------------
// Job planning
// ---------------------------------------------------------------------------

function addJob(state, kind, keys, priority) {
  const id = state.nextId++;
  state.jobs.set(id, { id, kind, keys, priority, running: false });
  const pend = kind === 'eval' ? state.pending : state.bootPending;
  keys.forEach(k => pend.add(k));
}

// Rough relative cost of one path, for sizing jobs.
function pathCost(plan, n) {
  const k = plan.covariates.length + 2;
  return plan.estimator === 'm' ? 10 * n * k * k : k * k * k + 50;
}

// Split keys (sorted so paths sharing a row set stay together) into jobs of
// at most `budget` cost, and at least enough jobs to keep every worker busy.
function chunk(keys, cost, budget, capacity) {
  const total = keys.reduce((s, k) => s + cost(k), 0);
  const per = Math.max(1, Math.min(budget, total / capacity));
  const out = [];
  let cur = [], c = 0;
  for (const k of keys) {
    cur.push(k);
    c += cost(k);
    if (c >= per) { out.push(cur); cur = []; c = 0; }
  }
  if (cur.length) out.push(cur);
  return out;
}

const EVAL_BUDGET = 2e6;    // ~10–50 ms of work per job
const BOOT_BUDGET = 2e8;

function rowOrder(state) {
  return (a, b) => {
    const ka = state.wanted.get(a).rowKeys.join('|');
    const kb = state.wanted.get(b).rowKeys.join('|');
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  };
}

function schedule(state) {
  if (!state.dataset || !state.paths.length) return;
  const n = state.dataset.n;
  const cost = k => pathCost(state.wanted.get(k), n);
  const byRows = rowOrder(state);

  const missing = [...state.wanted.keys()].filter(k => !state.results.has(k) && !state.pending.has(k));
  const ols = missing.filter(k => state.wanted.get(k).estimator !== 'm').sort(byRows);
  const m = missing.filter(k => state.wanted.get(k).estimator === 'm').sort(byRows);
  for (const keys of chunk(ols, cost, EVAL_BUDGET, state.capacity)) addJob(state, 'eval', keys, PRIORITY.eval);
  for (const keys of chunk(m, cost, EVAL_BUDGET, state.capacity)) addJob(state, 'eval', keys, PRIORITY.evalM);

  const draws = state.boot.draws;
  if (!draws) return;
  const bootMissing = [...state.wanted.keys()].filter(k =>
    state.results.get(k)?.ok && !state.bootResults.has(k) && !state.bootPending.has(k));
  const bootCost = k => draws * (state.wanted.get(k).estimator === 'm' ? cost(k) : n * 4);
  const bOls = bootMissing.filter(k => state.wanted.get(k).estimator !== 'm').sort(byRows);
  const bM = bootMissing.filter(k => state.wanted.get(k).estimator === 'm').sort(byRows);
  for (const keys of chunk(bOls, bootCost, BOOT_BUDGET, state.capacity)) addJob(state, 'boot', keys, PRIORITY.boot);
  for (const keys of chunk(bM, bootCost, BOOT_BUDGET, state.capacity)) addJob(state, 'boot', keys, PRIORITY.bootM);
}

// Start the highest-priority queued jobs while there's capacity. Job
// arguments are built now, so a queued job never carries stale paths.
function pump(state, effects) {
  let running = 0;
  const queued = [];
  for (const job of state.jobs.values()) {
    if (job.running) running++;
    else queued.push(job);
  }
  queued.sort((a, b) => a.priority - b.priority || a.id - b.id);
  for (const job of queued) {
    if (running >= state.capacity) break;
    const plans = job.keys.map(k => state.wanted.get(k));
    let dataset;
    try {
      dataset = subsetDataset(state.dataset, planColumns(plans));
    } catch (err) {
      // The spec names a column the dataset doesn't have: fail these paths.
      state.jobs.delete(job.id);
      if (job.kind === 'eval') {
        job.keys.forEach(k => { state.pending.delete(k); state.results.set(k, { key: k, ok: false, error: err.message, n: null }); });
      } else {
        job.keys.forEach(k => state.bootPending.delete(k));
      }
      continue;
    }
    job.running = true;
    running++;
    if (job.kind === 'eval') {
      effects.push({ type: 'run', id: job.id, op: 'verse:eval',
        args: { dataset, plans, diagnostics: state.diagnostics } });
    } else {
      effects.push({ type: 'run', id: job.id, op: 'verse:boot',
        args: { dataset, plans, estimates: job.keys.map(k => state.results.get(k).estimate),
                seed: state.boot.seed, draws: state.boot.draws } });
    }
  }
}

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

// The current curve: dims plus, per path in enumeration order, its choices,
// plan and result (null while pending).
export function selectCurve(state) {
  return {
    dims: state.dims,
    error: state.specError,
    paths: state.paths.map(p => ({ ...p, result: state.results.get(p.plan.key) ?? null })),
  };
}

export function selectProgress(state) {
  let done = 0, failed = 0, ok = 0, bootDone = 0;
  for (const key of state.wanted.keys()) {
    const r = state.results.get(key);
    if (!r) continue;
    done++;
    if (r.ok) { ok++; if (state.bootResults.has(key)) bootDone++; } else failed++;
  }
  let running = 0, queued = 0;
  for (const job of state.jobs.values()) job.running ? running++ : queued++;
  return {
    total: state.wanted.size, done, failed,
    boot: state.boot.draws ? { total: ok, done: bootDone } : null,
    running, queued,
  };
}

// Observed curve statistics, plus bootstrap p-values once every successful
// path has its draws. { observed, inference | null }.
export function selectInference(state) {
  const okKeys = [...state.wanted.keys()].filter(k => state.results.get(k)?.ok);
  const r = okKeys.map(k => state.results.get(k).partialR);
  const z = okKeys.map(k => state.results.get(k).z);
  const observed = curveStats(r, z);
  const draws = state.boot.draws;
  if (!draws || okKeys.length < state.wanted.size - countFailed(state) || !okKeys.every(k => state.bootResults.has(k))) {
    return { observed, inference: null };
  }
  const drawR = new Float32Array(okKeys.length * draws);
  const drawZ = new Float32Array(okKeys.length * draws);
  okKeys.forEach((k, i) => {
    const b = state.bootResults.get(k);
    drawR.set(b.r, i * draws);
    drawZ.set(b.z, i * draws);
  });
  return { observed, inference: bootstrapPValues(observed, drawR, drawZ, okKeys.length, draws) };
}

function countFailed(state) {
  let f = 0;
  for (const k of state.wanted.keys()) if (state.results.get(k)?.ok === false) f++;
  return f;
}

export function selectForkSummaries(state) {
  if (!state.dims) return [];
  return forkSummaries(state.dims, state.paths, state.paths.map(p => state.results.get(p.plan.key) ?? null));
}
