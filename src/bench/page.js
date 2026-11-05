// src/bench/page.js
// public/bench.html: run the regression benchmarks in this browser.
//   1. Old vs new code, single thread (in a dedicated worker).
//   2. Speed calibration at a chosen n (via the regression pool).
//   3. Worker-pool scaling: the same batch of robust M fits on 1 worker vs the
//      full pool.
// All heavy work runs in workers; the page only renders results.

import { fmtRate, fmtRatio, gen } from '../../tests/js/bench-core.mjs';
import { createRegressionPool, defaultPoolSize } from '../stats/pool.js';

const $ = id => document.getElementById(id);
const lines = [];  // plain-text copy of all results, for the copy button

function log(text) {
  lines.push(text);
}

function setStatus(text) {
  $('status').textContent = text;
}

function addRow(tbody, cells) {
  const tr = document.createElement('tr');
  cells.forEach((c, i) => {
    const td = document.createElement(i < 3 ? 'th' : 'td');
    if (i < 3) td.scope = 'row';
    td.textContent = c;
    tr.appendChild(td);
  });
  tbody.appendChild(tr);
}

function runOldVsNew(budgetScale) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('dist/bench/worker.js');
    const tbody = $('compare-body');
    let done = 0, total = 0;
    log('Old vs new, single thread (fits/sec)');
    log('model\tn\tcov\tbefore\tafter\tspeedup');
    worker.onmessage = e => {
      const m = e.data;
      if (m.type === 'plan') total = m.total;
      if (m.type === 'row') {
        const { model, n, p, before, after } = m.row;
        const cells = [model, n.toLocaleString('en-US'), String(p), fmtRate(before), fmtRate(after), fmtRatio(after, before)];
        addRow(tbody, cells);
        log(cells.join('\t'));
        setStatus(`Old vs new: ${++done} of ${total}`);
      }
      if (m.type === 'done') { worker.terminate(); resolve(); }
      if (m.type === 'error') { worker.terminate(); reject(new Error(m.message)); }
    };
    worker.onerror = e => { worker.terminate(); reject(new Error(e.message || 'Benchmark worker failed')); };
    worker.postMessage({ type: 'start', budgetScale });
  });
}

async function runCalibration(pool, n) {
  setStatus(`Calibrating at n = ${n.toLocaleString('en-US')}`);
  const { rates } = await pool.run('calibrate', { n, budgetMs: 300 });
  const tbody = $('calib-body');
  log('');
  log(`Calibration at n = ${n} (fits/sec)`);
  for (const [model, byP] of Object.entries(rates)) {
    for (const [p, r] of Object.entries(byP)) {
      const cells = [model, n.toLocaleString('en-US'), p, fmtRate(r)];
      addRow(tbody, cells);
      log(cells.join('\t'));
    }
  }
}

async function timeBatches(pool, jobs) {
  const t0 = performance.now();
  await Promise.all(jobs.map(args => pool.run('robustM', args)));
  return (performance.now() - t0) / 1000;
}

async function runScaling(size) {
  const n = 1000, p = 5, count = 48;
  setStatus(`Worker scaling: ${count} robust M fits, n = ${n}, ${p} covariates`);
  const { x, y, z } = gen(n, p, 7);
  const jobs = Array.from({ length: count }, () => ({ x, y, nuisance: z }));
  const one = createRegressionPool({ size: 1 });
  const many = createRegressionPool({ size });
  try {
    await one.run('robustM', jobs[0]);  // warm up each worker's JIT
    await Promise.all(Array.from({ length: size }, () => many.run('robustM', jobs[0])));
    const t1 = await timeBatches(one, jobs);
    const tn = await timeBatches(many, jobs);
    const tbody = $('scale-body');
    const rows = [['1 worker', t1], [`${size} workers`, tn]];
    log('');
    log(`Worker scaling: ${count} robust M fits, n = ${n}, ${p} covariates`);
    for (const [label, t] of rows) {
      const cells = [label, `${t.toFixed(2)} s`, `${fmtRate(count / t)} fits/sec`, fmtRatio(t1, t)];
      const tr = document.createElement('tr');
      cells.forEach((c, i) => {
        const cell = document.createElement(i ? 'td' : 'th');
        if (!i) cell.scope = 'row';
        cell.textContent = c;
        tr.appendChild(cell);
      });
      tbody.appendChild(tr);
      log(cells.join('\t'));
    }
  } finally {
    one.terminate();
    many.terminate();
  }
}

function environment() {
  const cores = navigator.hardwareConcurrency ?? 'unknown';
  return [`User agent: ${navigator.userAgent}`, `Logical cores: ${cores}`, `Pool size: ${defaultPoolSize()}`];
}

async function run() {
  const btn = $('run');
  btn.disabled = true;
  $('copy').disabled = true;
  for (const id of ['compare-body', 'calib-body', 'scale-body']) $(id).textContent = '';
  lines.length = 0;
  environment().forEach(log);
  log('');
  const quick = $('quick').checked;
  const n = Number($('calib-n').value) || 1000;
  try {
    await runOldVsNew(quick ? 0.25 : 1);
    const pool = createRegressionPool({ size: 1 });
    try { await runCalibration(pool, n); } finally { pool.terminate(); }
    await runScaling(defaultPoolSize());
    setStatus('Done.');
  } catch (err) {
    setStatus(`Failed: ${err.message}`);
    log(`Failed: ${err.message}`);
  } finally {
    btn.disabled = false;
    $('copy').disabled = !lines.length;
  }
}

async function copyResults() {
  const text = lines.join('\n');
  try {
    await navigator.clipboard.writeText(text);
    setStatus('Results copied.');
  } catch {
    setStatus('Copy failed; select the tables instead.');
  }
}

$('env').textContent = environment().join(' · ');
if (location.protocol === 'file:') {
  $('run').disabled = true;
  setStatus('Workers can’t load from file:// pages. Serve this folder over HTTP to run the benchmark.');
}
$('run').addEventListener('click', run);
$('copy').addEventListener('click', copyResults);
