// src/stats/worker-handler.js
// Message handler for regression workers: pure function from a request
// message to a response message, so it can be tested without a Worker.
//
// Request:  { id, op, args }            or { id, op: 'batch', jobs: [{ op, args }, ...] }
// Response: { id, ok: true, result }    or { id, ok: false, error: { name, message } }
// A batch answers with result = [{ ok, result | error }, ...] in job order, so one
// failing fit doesn't sink the rest.

import { ols } from './ols.js';
import { robust, robustM } from './robust.js';
import { applyFilters } from './filters.js';
import { calibrate } from './calibrate.js';
import { evaluatePlans, bootstrapPlans } from '../verse/evaluate.js';

export const OPS = {
  ols:     ({ x, y, nuisance = [] }) => ols(x, y, nuisance),
  robust:  ({ x, y, nuisance = [], opts = {} }) => robust(x, y, nuisance, opts),
  robustM: ({ x, y, nuisance = [] }) => robustM(x, y, nuisance),
  filters: ({ data, rows, steps, model = null }) => applyFilters(data, rows, steps, model),
  // Speed calibration takes ~200 ms, so callers run it here rather than on the main thread.
  calibrate: ({ n, covariates, budgetMs }) => calibrate({ n, covariates, budgetMs }),
  // Scatterverse (src/verse/engine.js builds these jobs).
  'verse:eval': ({ dataset, plans, diagnostics = false }) => evaluatePlans(dataset, plans, { diagnostics }),
  'verse:boot': ({ dataset, plans, estimates, seed, draws }) =>
    bootstrapPlans(dataset, plans, estimates, { seed, start: 0, count: draws }),
};

function runOne(op, args) {
  const fn = OPS[op];
  if (!fn) throw new Error(`Unknown worker op: ${op}`);
  return fn(args);
}

function errorInfo(err) {
  return { name: err?.name ?? 'Error', message: err?.message ?? String(err) };
}

export function handleMessage(msg) {
  const { id, op } = msg;
  try {
    if (op === 'batch') {
      const result = msg.jobs.map(job => {
        try { return { ok: true, result: runOne(job.op, job.args) }; }
        catch (err) { return { ok: false, error: errorInfo(err) }; }
      });
      return { id, ok: true, result };
    }
    return { id, ok: true, result: runOne(op, msg.args) };
  } catch (err) {
    return { id, ok: false, error: errorInfo(err) };
  }
}
