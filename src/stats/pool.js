// src/stats/pool.js
// A small pool of regression workers with a job queue and cancellation.
//
//   const pool = createRegressionPool();
//   const fit = await pool.run('robust', { x, y, nuisance }, { signal });
//
// Jobs go to the first idle worker, else wait in a FIFO queue. Aborting a
// queued job just drops it. Aborting a running job terminates that worker
// (a synchronous fit can't be interrupted any other way) and starts a fresh
// one in its place. Ops and message shapes are defined in worker-handler.js.
//
// createWorker is injectable so the pool can be tested without real Workers;
// anything with postMessage(), terminate(), and an onmessage/onerror property
// will do.

export const DEFAULT_WORKER_URL = 'dist/stats/worker.js';

export function defaultPoolSize() {
  const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2;
  return Math.max(1, cores - 1);
}

function abortError() {
  try { return new DOMException('Regression job aborted', 'AbortError'); }
  catch { const e = new Error('Regression job aborted'); e.name = 'AbortError'; return e; }
}

function remoteError({ name, message }) {
  const e = new Error(message);
  e.name = name;
  return e;
}

export function createRegressionPool({
  size = defaultPoolSize(),
  workerUrl = DEFAULT_WORKER_URL,
  createWorker = () => new Worker(workerUrl),
} = {}) {
  const slots = [];       // { worker, job | null }
  const queue = [];       // pending jobs
  let nextId = 1;
  let closed = false;

  function spawn(slot) {
    const worker = createWorker();
    worker.onmessage = e => finish(slot, e.data);
    worker.onerror = e => {
      // An uncaught error inside the worker: fail its job and replace it.
      e?.preventDefault?.();
      const job = slot.job;
      slot.job = null;
      replace(slot);
      job?.reject(new Error(e?.message ?? 'Regression worker failed'));
      pump();
    };
    slot.worker = worker;
  }

  function replace(slot) {
    slot.worker.terminate();
    if (!closed) spawn(slot);
  }

  for (let i = 0; i < Math.max(1, size); i++) {
    const slot = { worker: null, job: null };
    spawn(slot);
    slots.push(slot);
  }

  function finish(slot, msg) {
    const job = slot.job;
    if (!job || msg?.id !== job.id) return;  // stale reply from a cancelled job
    slot.job = null;
    job.cleanup();
    if (msg.ok) job.resolve(msg.result);
    else job.reject(remoteError(msg.error));
    pump();
  }

  function pump() {
    for (const slot of slots) {
      if (!queue.length) return;
      if (slot.job) continue;
      const job = queue.shift();
      slot.job = job;
      job.slot = slot;
      slot.worker.postMessage(job.message, job.transfer);
    }
  }

  function run(op, args, { signal, transfer = [] } = {}) {
    if (closed) return Promise.reject(new Error('Regression pool is closed'));
    if (signal?.aborted) return Promise.reject(abortError());
    return new Promise((resolve, reject) => {
      const id = nextId++;
      const message = op === 'batch' ? { id, op, jobs: args } : { id, op, args };
      const job = { id, message, transfer, resolve, reject, slot: null, cleanup: () => {} };
      if (signal) {
        const onAbort = () => cancel(job);
        signal.addEventListener('abort', onAbort, { once: true });
        job.cleanup = () => signal.removeEventListener('abort', onAbort);
      }
      queue.push(job);
      pump();
    });
  }

  function cancel(job) {
    const qi = queue.indexOf(job);
    if (qi >= 0) {
      queue.splice(qi, 1);
    } else if (job.slot?.job === job) {
      job.slot.job = null;
      replace(job.slot);
    } else {
      return;  // already finished
    }
    job.cleanup();
    job.reject(abortError());
    pump();
  }

  function terminate() {
    closed = true;
    for (const job of queue.splice(0)) { job.cleanup(); job.reject(new Error('Regression pool is closed')); }
    for (const slot of slots) {
      const job = slot.job;
      slot.job = null;
      slot.worker.terminate();
      if (job) { job.cleanup(); job.reject(new Error('Regression pool is closed')); }
    }
  }

  return {
    run,
    terminate,
    get size() { return slots.length; },
    get busy() { return slots.filter(s => s.job).length; },
    get queued() { return queue.length; },
  };
}
