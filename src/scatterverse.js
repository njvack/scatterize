// src/scatterverse.js
// Entry point for the scatterverse view (public/scatterverse/index.html):
// data loading, the fork editor, URL state, and wiring the path engine
// (src/verse/) to the curve grid and the "which choices matter" panel.

import { fetchData } from './data.js';
import { storeLocalFile, localFileName } from './localfile.js';
import { createChipPicker } from './plot/chip-picker.js';
import { createRegressionPool } from './stats/pool.js';
import { curveStats, bootstrapPValues } from './verse/summary.js';
import { normalizeSpec, countPaths, specFromScatterState, MAX_PATHS } from './verse/spec.js';
import { prepareDataset } from './verse/dataset.js';
import { createVerseRunner } from './verse/runner.js';
import { selectCurve, selectProgress, selectForkSummaries } from './verse/engine.js';
import { parseVerseHash, serializeVerseHash, DEFAULT_SEED } from './verse/url.js';
import { createForkEditor, newFork, forkId } from './verse-ui/forks.js';
import { createCurveGrid } from './verse-ui/curves.js';
import { createSummaryPanel } from './verse-ui/summary-panel.js';

const WARN_PATHS = 20000;

const $ = id => document.getElementById(id);

const app = {
  src: null,
  rows: null,
  numeric: [],   // columns usable in models
  all: [],       // every column (exclusion flags)
  spec: null,    // raw, editable spec; forks carry ids
  seed: DEFAULT_SEED,
  draws: 0,
  showDiag: false,
  focus: null,   // panel id, or null for the grid
  hover: null,   // { d, o } from the summary panel
  pinned: null,
};

const pool = createRegressionPool({ workerUrl: '../dist/stats/worker.js' });
const engine = createVerseRunner({ pool, diagnostics: true, onChange: () => scheduleRender() });

// ---------------------------------------------------------------------------
// Columns and data
// ---------------------------------------------------------------------------

function classify(rows) {
  const names = Object.keys(rows[0] ?? {});
  const numeric = names.filter(c => {
    let k = 0;
    for (const r of rows) if (typeof r[c] === 'number' && Number.isFinite(r[c]) && ++k >= 3) return true;
    return false;
  });
  return { numeric, all: names };
}

function defaultSpec() {
  const [a, b] = app.numeric;
  return {
    outcomes: [b ?? a],
    predictors: [a],
    always: [],
    forks: [
      { id: forkId(), kind: 'outlier', rule: 'z', thresholds: [2.5, 3], none: true, on: 'xy' },
      { id: forkId(), kind: 'model', estimators: ['ols', 'm'] },
    ],
  };
}

async function loadSource(src) {
  $('load-error').hidden = true;
  $('verse-status').textContent = 'Loading data…';
  try {
    const rows = await fetchData(src);
    app.src = src;
    app.rows = rows;
    Object.assign(app, classify(rows));
    engine.dispatch({ type: 'data', dataset: prepareDataset(rows, { numeric: app.numeric, flags: app.all }) });
    return true;
  } catch (err) {
    app.src = null;
    app.rows = null;
    $('load-error').textContent = err.message;
    $('load-error').hidden = false;
    return false;
  } finally {
    $('verse-status').textContent = '';
  }
}

// ---------------------------------------------------------------------------
// Spec → engine
// ---------------------------------------------------------------------------

// The spec the engine sees: forks that don't validate yet (a covariate block
// with no columns, say) are left out, and their cards say why.
function effectiveSpec() {
  const s = app.spec;
  const forks = s.forks.filter(f => {
    try { normalizeSpec({ outcomes: ['_'], predictors: ['_'], forks: [f] }); return true; }
    catch { return false; }
  });
  return { outcomes: s.outcomes, predictors: s.predictors, always: s.always, forks };
}

function updatePathCount() {
  const el = $('path-count');
  el.className = '';
  try {
    const spec = normalizeSpec(effectiveSpec());
    const n = countPaths(spec);
    el.textContent = `${n.toLocaleString('en-US')} path${n === 1 ? '' : 's'}`;
    if (n > MAX_PATHS) {
      el.textContent += ` — more than the limit of ${MAX_PATHS.toLocaleString('en-US')}`;
      el.className = 'error';
    } else if (n > WARN_PATHS) {
      el.textContent += ' — this may take a while';
      el.className = 'warn';
    }
  } catch (err) {
    el.textContent = err.message;
    el.className = 'error';
  }
}

let specTimer = null;
function specChanged({ immediate = false } = {}) {
  updatePathCount();
  clearTimeout(specTimer);
  const go = () => {
    engine.dispatch({ type: 'spec', spec: effectiveSpec() });
    writeHash();
  };
  if (immediate) go(); else specTimer = setTimeout(go, 150);
}

// ---------------------------------------------------------------------------
// URL state
// ---------------------------------------------------------------------------

let lastHash = null;

function specForUrl(spec) {
  return { ...spec, forks: spec.forks.map(({ id: _id, ...f }) => f) };
}

async function writeHash() {
  if (!app.src || !app.spec) return;
  let spec;
  try { spec = normalizeSpec(specForUrl(effectiveSpec())); } catch { return; /* keep the old link */ }
  let hash = await serializeVerseHash({ src: app.src, spec, seed: app.seed, draws: app.draws });
  if (app.showDiag) hash += '&diag=1';
  lastHash = hash;
  history.replaceState(null, '', `#${hash}`);
  updateScatterLink();
}

async function readHash() {
  const hashStr = location.hash.slice(1);
  if (hashStr === lastHash) return;
  lastHash = hashStr;
  const raw = new URLSearchParams(hashStr);
  const parsed = await parseVerseHash(hashStr);
  app.seed = parsed.seed;
  app.draws = parsed.draws;
  app.showDiag = raw.get('diag') === '1';
  $('boot-draws').value = String(app.draws);
  $('show-diag').checked = app.showDiag;

  if (!parsed.src) { clearData(); return; }
  if (parsed.src !== app.src && !(await loadSource(parsed.src))) { render(); return; }

  if (parsed.spec) {
    app.spec = { ...parsed.spec, forks: parsed.spec.forks.map(f => ({ ...f, id: forkId() })) };
  } else if (raw.has('x') || raw.has('y')) {
    // A scatterplot link: start from its x, y, covariates and model.
    const st = {
      x: +raw.get('x') || 0, y: +(raw.get('y') ?? 1), m: raw.get('m'),
      n: (raw.get('n') ?? '').split(',').filter(Boolean).map(Number),
      c: (raw.get('c') ?? '').split(',').filter(Boolean).map(Number),
    };
    const { spec, censored } = specFromScatterState(st, app.numeric);
    app.spec = { ...spec, forks: spec.forks.map(f => ({ ...f, id: forkId() })) };
    if (censored.length) app.spec.forks.unshift({ id: forkId(), kind: 'exclude', rows: censored, label: 'Hand-excluded rows' });
  } else {
    app.spec = defaultSpec();
  }
  if (parsed.specError) $('verse-status').textContent = `Couldn't read the analysis in this link (${parsed.specError}); starting fresh.`;

  engine.dispatch({ type: 'bootstrap', seed: app.seed, draws: app.draws });
  syncControls();
  specChanged({ immediate: true });
}

function updateScatterLink() {
  const a = $('scatter-link');
  if (!app.src || !app.spec) { a.href = '../'; return; }
  const p = new URLSearchParams();
  p.set('src', app.src);
  const xi = app.numeric.indexOf(app.spec.predictors[0]);
  const yi = app.numeric.indexOf(app.spec.outcomes[0]);
  p.set('x', String(Math.max(0, xi)));
  p.set('y', String(Math.max(0, yi)));
  p.set('m', 'ols');
  a.href = `../#${p}`;
}

function clearData() {
  app.src = null;
  app.rows = null;
  app.spec = null;
  app.focus = null;
  app.pinned = null;
  lastHash = '';
  history.replaceState(null, '', location.pathname);
  updateScatterLink();
  render();
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

function columnPicker(id, key, placeholder) {
  const picker = createChipPicker({
    container: $(`${id}-picker`), inputId: `${id}-input`, placeholder, searchLabel: `Search ${key}`,
    onChange: sel => { app.spec[key] = sel; specChanged(); },
  });
  return picker;
}

const pickers = {
  outcomes: columnPicker('outcome', 'outcomes', 'Add outcome…'),
  predictors: columnPicker('predictor', 'predictors', 'Add predictor…'),
  always: columnPicker('always', 'always', 'Add covariate…'),
};

const forkEditor = createForkEditor({
  list: $('fork-list'),
  getColumns: () => ({ numeric: app.numeric, all: app.all }),
  onChange: () => specChanged(),
});

function syncControls() {
  const options = app.numeric.map(c => ({ value: c, label: c }));
  for (const [key, picker] of Object.entries(pickers)) picker.update({ options, selected: app.spec[key] });
  forkEditor.render(app.spec);
}

$('add-fork').addEventListener('change', e => {
  const kind = e.target.value;
  e.target.value = '';
  if (!kind || !app.spec) return;
  app.spec.forks.push(newFork(kind, { numeric: app.numeric, all: app.all }));
  forkEditor.render(app.spec);
  specChanged();
});

$('show-diag').addEventListener('change', e => {
  app.showDiag = e.target.checked;
  writeHash();
  render();
});

$('boot-draws').addEventListener('change', e => {
  const v = Math.max(0, Math.min(10000, Math.round(+e.target.value || 0)));
  e.target.value = String(v);
  app.draws = v;
  engine.dispatch({ type: 'bootstrap', seed: app.seed, draws: v });
  writeHash();
});

$('load-btn').addEventListener('click', () => {
  const url = $('source-url').value.trim();
  if (url) location.hash = new URLSearchParams({ src: url }).toString();
});
$('source-url').addEventListener('keydown', e => { if (e.key === 'Enter') $('load-btn').click(); });
$('open-file-btn').addEventListener('click', () => $('file-input').click());
$('file-input').addEventListener('change', async e => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const key = await storeLocalFile(file);
    location.hash = new URLSearchParams({ src: key }).toString();
  } catch (err) {
    $('load-error').textContent = err.message;
    $('load-error').hidden = false;
  }
});
$('clear-data-btn').addEventListener('click', clearData);

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

const grid = createCurveGrid({
  container: $('curve-grid'),
  tooltip: $('verse-tooltip'),
  onFocus: id => { app.focus = id; render(); },
});

const summary = createSummaryPanel({
  container: $('verse-summary'),
  onHover: sel => {
    const same = sel && app.hover && sel.d === app.hover.d && sel.o === app.hover.o;
    if (same || (!sel && !app.hover)) return;
    app.hover = sel;
    drawCurves();
  },
  onPin: sel => { app.pinned = sel; render(); },
});

let frame = 0;
function scheduleRender() {
  if (!frame) frame = requestAnimationFrame(() => { frame = 0; render(); });
}

let lastCurve = null;

// Forced-null bootstrap p-values for one curve. Every path is resampled with
// the same row draws (seed, draw index), so a curve's p-values come from
// slicing the shared draws to its own paths; nothing is refitted. Each
// outcome x predictor is its own hypothesis, so each gets its own test.
function curveInference(g) {
  const st = engine.state;
  const draws = st.boot.draws;
  if (!draws || g.pending || !g.paths.length) return null;
  const boots = g.paths.map(p => st.bootResults.get(p.plan.key));
  if (boots.some(b => !b)) return null;
  const drawR = new Float32Array(boots.length * draws);
  const drawZ = new Float32Array(boots.length * draws);
  boots.forEach((b, i) => { drawR.set(b.r, i * draws); drawZ.set(b.z, i * draws); });
  return bootstrapPValues(g.stats, drawR, drawZ, boots.length, draws);
}

function buildPanels(curve) {
  const { dims, paths } = curve;
  const byPanel = new Map();
  for (const p of paths) {
    const id = `${p.choices[0]}:${p.choices[1]}`;
    let g = byPanel.get(id);
    if (!g) {
      g = { id, title: `${dims[0].options[p.choices[0]].label} ~ ${dims[1].options[p.choices[1]].label}`, paths: [], pending: 0, failed: 0 };
      byPanel.set(id, g);
    }
    if (!p.result) g.pending++;
    else if (!p.result.ok || !Number.isFinite(p.result.partialR)) g.failed++;
    else g.paths.push(p);
  }
  // Outcome-major, in spec order.
  const panels = [...byPanel.values()].sort((a, b) => {
    const [ao, ap] = a.id.split(':').map(Number);
    const [bo, bp] = b.id.split(':').map(Number);
    return ao - bo || ap - bp;
  });
  let lo = 0, hi = 0, dlo = 1;
  for (const g of panels) {
    g.paths.sort((a, b) => a.result.partialR - b.result.partialR);
    g.stats = curveStats(g.paths.map(p => p.result.partialR), g.paths.map(p => p.result.z));
    g.inference = curveInference(g);
    for (const p of g.paths) {
      const [l, h] = p.result.ci ?? [p.result.partialR, p.result.partialR];
      if (l < lo) lo = l;
      if (h > hi) hi = h;
      const f = p.result.diagnostics?.filliben;
      if (f != null && f < dlo) dlo = f;
    }
  }
  const pad = (hi - lo) * 0.05 || 0.05;
  return {
    panels,
    yDomain: [Math.max(-1, lo - pad), Math.min(1, hi + pad)],
    diagDomain: [Math.floor(Math.min(dlo, 0.99) * 100) / 100, 1],
  };
}

function validHighlight(sel, dims) {
  return sel && dims && sel.d < dims.length && sel.o < dims[sel.d].options.length ? sel : null;
}

function drawCurves() {
  if (!lastCurve) return;
  const dims = engine.state.dims;
  app.pinned = validHighlight(app.pinned, dims);
  grid.render({
    ...lastCurve,
    dims: engine.state.dims,
    focus: lastCurve.panels.some(p => p.id === app.focus) ? app.focus : null,
    highlight: validHighlight(app.hover, dims) ?? app.pinned,
    showDiag: app.showDiag,
    columns: engine.state.spec?.predictors.length ?? 1,
  });
}

function render() {
  const hasData = !!app.rows;
  $('empty-state').hidden = hasData;
  $('verse-controls').inert = !hasData;
  document.body.classList.toggle('no-data', !hasData);
  $('data-source').hidden = !app.src;
  $('data-source-name').textContent = app.src ? (app.src.startsWith('local:') ? localFileName(app.src) : app.src) : '';

  const st = engine.state;
  if (!hasData || !st.dims) {
    lastCurve = null;
    $('curve-grid').replaceChildren();
    summary.render({ dims: null });
    if (hasData && st.specError) $('verse-status').textContent = st.specError;
    return;
  }

  const progress = selectProgress(st);
  let status = `${progress.total.toLocaleString('en-US')} paths`;
  if (progress.done < progress.total) status += ` · fitting ${progress.done.toLocaleString('en-US')} of ${progress.total.toLocaleString('en-US')}…`;
  else if (progress.boot && progress.boot.done < progress.boot.total) status += ` · bootstrapping ${progress.boot.done} of ${progress.boot.total}…`;
  if (st.specError) status = st.specError;
  $('verse-status').textContent = status;

  lastCurve = buildPanels(selectCurve(st));
  drawCurves();
  summary.render({
    dims: st.dims,
    summaries: selectForkSummaries(st),
    progress,
    pinned: app.pinned,
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

let resizeFrame = 0;
window.addEventListener('resize', () => {
  if (!resizeFrame) resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; drawCurves(); });
});
window.addEventListener('keydown', e => {
  if (e.key === 'Escape' && app.focus && !e.target.closest?.('input, select, textarea')) { app.focus = null; render(); }
});
window.addEventListener('hashchange', readHash);
readHash().then(render);
