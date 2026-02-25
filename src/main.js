// src/main.js
// Entry point: data loading, render pipeline, keyboard shortcuts.

import { getState, setState, onStateChange } from './state.js';
import { fetchData }                          from './data.js';
import { storeLocalFile, localFileName }      from './localfile.js';
import { createScatterplot, buildColorOf }     from './plot/scatterplot.js';
import { createDiagnostics }                  from './plot/diagnostics.js';
import { populateControls, bindControls, syncControls, updateStats } from './plot/dashboard.js';
import { ols }      from './stats/ols.js';
import { robust }   from './stats/robust.js';
import { spearman } from './stats/spearman.js';
import { theilSen } from './stats/theilsen.js';
import { residualizeWithStats, RANK_MODELS, rank } from './stats/common.js';

// ---------------------------------------------------------------------------
// App state (in-memory, not in URL)
// ---------------------------------------------------------------------------

let data    = null;  // parsed CSV rows (array of objects)
let columns = [];    // numeric-eligible column names (usable in models)
let colMeta = [];    // all column metadata: [{ name, isNumeric, colorType }]

const MODELS = { ols, robust, spearman, theilsen: theilSen };

let scatter     = null;
let diagnostics = null;
let hoveredIndex = null;       // currently hovered original row index
let currentPointColors = null; // parallel to residuals, one color per active point

// ---------------------------------------------------------------------------
// Column classification
// ---------------------------------------------------------------------------

// Classify each column for model eligibility and color scale selection.
// isNumeric: has ≥3 numeric values → can be used in X/Y/nuisance
// colorType: 'categorical' (few distinct values) | 'continuous' (numeric, many values)
//            | 'string' (high-cardinality non-numeric)
function classifyColumns(data) {
  if (!data.length) return [];
  const n = data.length;
  return Object.keys(data[0]).map(col => {
    const values = data.map(row => row[col]);
    const numericCount = values.filter(v => typeof v === 'number' && !isNaN(v)).length;
    const distinctCount = new Set(values.filter(v => v != null && v !== '').map(String)).size;
    const isNumeric = numericCount >= 3;
    const isCategorical = distinctCount <= Math.max(10, n * 0.05);
    const colorType = isCategorical ? 'categorical' : isNumeric ? 'continuous' : 'string';
    return { name: col, isNumeric, colorType };
  });
}

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------

async function loadData(url) {
  showError(null);
  setLoading(true);
  try {
    data    = await fetchData(url);
    colMeta = classifyColumns(data);
    columns = colMeta.filter(c => c.isNumeric).map(c => c.name);
    window._allColumns = colMeta.map(c => c.name);

    return true;
  } catch (err) {
    showError(err.message);
    data    = null;
    columns = [];
    return false;
  } finally {
    setLoading(false);
  }
}

// ---------------------------------------------------------------------------
// Render pipeline
// ---------------------------------------------------------------------------

function render() {
  const state = getState();

  if (!data || !columns.length) {
    showEmptyState(true);
    scatter?.clear();
    diagnostics?.clear();
    updateStats({ modelResult: null, modelKey: state.m });
    return;
  }

  showEmptyState(false);

  const allCols  = window._allColumns ?? columns;
  const xColName = columns[state.x] ?? columns[0];
  const yColName = columns[state.y] ?? columns[1] ?? columns[0];
  const hColName = state.h != null ? allCols[state.h] : null;
  const groupColorType = hColName
    ? (colMeta.find(c => c.name === hColName)?.colorType ?? 'categorical')
    : 'categorical';

  const censored = new Set(state.c);

  // Compute nuisance names early: needed for active-index filtering and clash check.
  const nuisanceNames = (!RANK_MODELS.has(state.m) && state.n.length)
    ? state.n.map(i => columns[i]).filter(Boolean)
    : [];

  // Warn if a nuisance variable is also the X or Y variable.
  const nuisClash = nuisanceNames.filter(n => n === xColName || n === yColName);
  if (nuisClash.length) {
    showError(`Warning: "${nuisClash.join('", "')}" is selected as both a model variable and a nuisance covariate — results will be misleading.`);
  } else {
    showError(null);
  }

  // Rows where any nuisance value is missing are excluded from the fit (silently,
  // same treatment as missing X or Y).
  const activeIndices = data
    .map((_, i) => i)
    .filter(i => !censored.has(i)
      && Number.isFinite(data[i][xColName])
      && Number.isFinite(data[i][yColName])
      && nuisanceNames.every(col => Number.isFinite(data[i][col])));

  if (!activeIndices.length) {
    showEmptyState(false);
    return;
  }

  // Raw x/y for all rows (for display coords)
  const xAll = data.map(row => row[xColName]);
  const yAll = data.map(row => row[yColName]);

  // Active x/y values
  const xActive = activeIndices.map(i => xAll[i]);
  let   yActive = activeIndices.map(i => yAll[i]);
  const yActiveOrig = yActive.slice();  // original Y before any residualization

  // Residualize Y against nuisance covariates (OLS/Robust only)
  let isResidualized = false;
  let nuisancePartialR2 = [];
  let nNuisance = 0;
  if (nuisanceNames.length) {
    const nuisData = nuisanceNames.map(col => activeIndices.map(i => data[i][col]));
    try {
      const result = residualizeWithStats(yActive, nuisData);
      yActive = result.residuals;
      nuisancePartialR2 = result.partialR2;
      isResidualized = true;
      nNuisance = nuisanceNames.length;
    } catch (e) {
      showError(`Residualization failed: ${e.message}`);
      return;
    }
  }

  // Rank-transform for Spearman display
  let displayX = xActive;
  let displayY = yActive;
  if (state.m === 'spearman') {
    displayX = rank(xActive);
    displayY = rank(yActive);
  }

  // Run model
  const modelFn = MODELS[state.m] ?? ols;
  let modelResult;
  try {
    modelResult = modelFn(displayX, displayY);
  } catch (err) {
    showError(`Model error: ${err.message}`);
    return;
  }

  // Full-model R² when nuisance is present: ols() received pre-residualized Y,
  // so we compute it here where we have both original Y and model residuals.
  // By FWL, residuals from residualized regression equal residuals from joint model.
  if (isResidualized && state.m === 'ols' && modelResult.residuals) {
    const n = yActiveOrig.length;
    const yMeanOrig = yActiveOrig.reduce((s, v) => s + v, 0) / n;
    const sstOrig   = yActiveOrig.reduce((s, yi) => s + (yi - yMeanOrig) ** 2, 0);
    const ssr       = modelResult.residuals.reduce((s, r) => s + r * r, 0);
    const fmR2      = 1 - ssr / sstOrig;
    // Adjusted full-model R²: df accounts for X + all nuisance predictors
    const dfFull    = n - 2 - nNuisance;
    modelResult = {
      ...modelResult,
      fullModelRSquared:    fmR2,
      fullModelAdjRSquared: 1 - (1 - fmR2) * (n - 1) / dfFull,
    };
  }

  // Build display Y map: active index → display Y value
  const activeDisplayY = new Map(activeIndices.map((origIdx, ai) => [origIdx, displayY[ai]]));
  const activeDisplayX = new Map(activeIndices.map((origIdx, ai) => [origIdx, displayX[ai]]));

  // Build robust weight map: active index → weight (null for non-robust models)
  const activeWeights = (state.m === 'robust' && modelResult.weights)
    ? new Map(activeIndices.map((origIdx, ai) => [origIdx, modelResult.weights[ai]]))
    : null;

  // Build point array for scatter plot
  const points = data.map((row, i) => {
    const isCensored = censored.has(i);
    const dispX = activeDisplayX.get(i) ?? row[xColName];
    const dispY = activeDisplayY.get(i) ?? row[yColName];
    return {
      index:    i,
      displayX: dispX,
      displayY: dispY,
      originalX: row[xColName],
      originalY: row[yColName],
      group:    hColName ? row[hColName] : null,
      censored: isCensored,
      weight:   activeWeights ? (activeWeights.get(i) ?? null) : null,
    };
  });

  // Compute group colors for active points (used by diagnostic QQ coloring).
  const active = points.filter(p => !p.censored);
  const colorOf = buildColorOf(active, groupColorType);
  currentPointColors = activeIndices.map(i => colorOf(points[i]));

  // Update scatter plot
  scatter.update({
    points,
    modelResult,
    xLabel: xColName,
    yLabel: isResidualized ? `Residualized ${yColName}` : yColName,
    modelKey: state.m,
    groupColorType,
    customXTicks: state.xl,
    customYTicks: state.yl,
    onPointClick: (index) => toggleCensor(index),
    onPointHover: (index) => {
      hoveredIndex = index;
      updateDiagnostics(modelResult, activeIndices);
    },
  });

  // Update stats panel
  updateStats({
    modelResult,
    modelKey:   state.m,
    xLabel:     xColName,
    yLabel:     yColName,
    n:          activeIndices.length,
    nCensored:  censored.size,
    nuisanceNames,
    nuisancePartialR2,
  });

  // Show/hide diag plots section.
  const diagEl = document.getElementById('diag-plots');
  const hasDiag = (state.m === 'ols' || state.m === 'robust') && modelResult?.residuals?.length;
  if (diagEl) diagEl.classList.toggle('hidden', !hasDiag);

  // Update diagnostic plots (OLS and Robust only)
  updateDiagnostics(modelResult, activeIndices);
  
  // Keep form controls in sync (keyboard nav changes state without touching the DOM)
  syncControls(state);
}

function updateDiagnostics(modelResult, activeIndices) {
  const state = getState();
  if ((state.m === 'ols' || state.m === 'robust') && modelResult?.residuals?.length) {
    diagnostics.update({
      residuals:    modelResult.residuals,
      activeIndices,
      hoveredIndex,
      pointColors:  currentPointColors,
    });
  } else {
    diagnostics?.clear();
  }
}

function toggleCensor(index) {
  const state = getState();
  const c = new Set(state.c);
  if (c.has(index)) c.delete(index);
  else c.add(index);
  setState({ c: [...c].sort((a, b) => a - b) });
}

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------

function showEmptyState(show) {
  const el = document.getElementById('empty-state');
  if (el) el.classList.toggle('hidden', !show);
}

function showError(msg) {
  const banner = document.getElementById('error-banner');
  const msgEl  = document.getElementById('error-message');
  if (!banner || !msgEl) return;
  if (msg) {
    msgEl.textContent = msg;
    banner.hidden = false;
  } else {
    banner.hidden = true;
  }
}

function setLoading(on) {
  const btn = document.getElementById('load-btn');
  if (btn) {
    btn.disabled = on;
    btn.textContent = on ? 'Loading…' : 'Load';
  }
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

function toggleHelp() {
  const modal = document.getElementById('help-modal');
  if (!modal) return;
  if (modal.open) modal.close();
  else modal.showModal();
}

function setupKeyboard() {
  document.addEventListener('keydown', e => {
    // Ignore when typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

    if (e.key === '?') { toggleHelp(); return; }

    const state = getState();
    const nCols = columns.length;
    if (!nCols) return;

    const MODEL_KEYS = ['ols', 'robust', 'spearman', 'theilsen'];
    const mIdx = MODEL_KEYS.indexOf(state.m);

    switch (e.key) {
      case 'j': setState({ y: Math.min(state.y + 1, nCols - 1) }); break;
      case 'k': setState({ y: Math.max(state.y - 1, 0) });         break;
      case 'u': setState({ x: Math.max(state.x - 1, 0) });         break;
      case 'i': setState({ x: Math.min(state.x + 1, nCols - 1) }); break;
      case 'o': setState({ m: MODEL_KEYS[Math.max(mIdx - 1, 0)] });                   break;
      case 'p': setState({ m: MODEL_KEYS[Math.min(mIdx + 1, MODEL_KEYS.length - 1)] }); break;
      case 'c': setState({ c: [] }); break; // clear all censored
    }
  });
}

// ---------------------------------------------------------------------------
// File drop
// ---------------------------------------------------------------------------

function setupFileDrop() {
  const overlay  = document.getElementById('drop-overlay');
  const urlInput = document.getElementById('data-url');
  let dragDepth  = 0;

  document.addEventListener('dragenter', e => {
    if (!e.dataTransfer?.types.includes('Files')) return;
    dragDepth++;
    overlay?.classList.add('visible');
  });

  document.addEventListener('dragleave', () => {
    dragDepth = Math.max(0, dragDepth - 1);
    if (dragDepth === 0) overlay?.classList.remove('visible');
  });

  document.addEventListener('dragover', e => e.preventDefault());

  document.addEventListener('drop', async e => {
    e.preventDefault();
    dragDepth = 0;
    overlay?.classList.remove('visible');

    const file = e.dataTransfer?.files[0];
    if (!file) return;

    let key;
    try {
      key = await storeLocalFile(file);
    } catch (err) {
      showError(err.message);
      return;
    }

    if (urlInput) urlInput.value = file.name;
    setState({ src: key, x: 0, y: 1, m: 'ols', n: [], c: [], h: null });
  });
}

// ---------------------------------------------------------------------------
// SVG export
// ---------------------------------------------------------------------------

function setupExport() {
  document.getElementById('export-btn')?.addEventListener('click', () => {
    const svgEl = document.getElementById('scatter-svg');
    if (!svgEl) return;

    // Inline styles for Illustrator compatibility
    const clone = svgEl.cloneNode(true);
    const css = [...document.styleSheets]
      .flatMap(s => { try { return [...s.cssRules]; } catch { return []; } })
      .map(r => r.cssText).join('\n');

    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.textContent = css;
    clone.prepend(style);

    const blob = new Blob(
      ['<?xml version="1.0" encoding="UTF-8"?>\n', new XMLSerializer().serializeToString(clone)],
      { type: 'image/svg+xml' }
    );
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const state = getState();
    a.download = `scatterize-${state.x ?? 'x'}-vs-${state.y ?? 'y'}.svg`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  // Set up plot components
  scatter = createScatterplot(
    document.getElementById('scatter-svg'),
    document.getElementById('overlay-svg')
  );

  const combinedSvg  = document.getElementById('diag-combined');
  const diagOverlay  = document.getElementById('diag-overlay');
  diagnostics = combinedSvg
    ? createDiagnostics(combinedSvg, diagOverlay)
    : { update: () => {}, clear: () => {} };

  // Wire controls and keyboard
  bindControls();
  setupKeyboard();
  setupExport();
  setupFileDrop();

  // React to URL hash changes
  onStateChange(async (state) => {
    // If src changed from what we have loaded, reload data
    const currentSrc = data ? (window._loadedSrc ?? null) : null;
    if (state.src && state.src !== currentSrc) {
      const ok = await loadData(state.src);
      if (ok) {
        window._loadedSrc = state.src;
        populateControls(colMeta, state);
      }
    } else if (!state.src && data) {
      data    = null;
      columns = [];
      window._loadedSrc = null;
    }
    render();
  });

  // Initial load
  const state = getState();
  const urlInput = document.getElementById('data-url');
  if (urlInput && state.src) {
    urlInput.value = state.src.startsWith('local:') ? localFileName(state.src) : state.src;
  }

  if (state.src) {
    const ok = await loadData(state.src);
    if (ok) {
      window._loadedSrc = state.src;
      populateControls(colMeta, state);
    }
  }

  render();

  // Load button
  document.getElementById('load-btn')?.addEventListener('click', () => {
    const url = document.getElementById('data-url')?.value?.trim();
    if (!url) return;
    // Reset variable/model state when loading a new URL
    setState({ src: url, x: 0, y: 1, m: 'ols', n: [], c: [], h: null });
  });

  // Allow Enter key in URL input
  document.getElementById('data-url')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('load-btn')?.click();
  });

  // Error dismiss
  document.getElementById('error-close')?.addEventListener('click', () => showError(null));

  // Help modal
  document.getElementById('help-btn')?.addEventListener('click', toggleHelp);
  document.getElementById('help-modal')?.addEventListener('click', e => {
    // Clicks on the ::backdrop hit the dialog element itself; close if outside content
    if (e.target === e.currentTarget) e.currentTarget.close();
  });
});
