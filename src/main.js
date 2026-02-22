// src/main.js
// Entry point: data loading, render pipeline, keyboard shortcuts.

import { getState, setState, onStateChange } from './state.js';
import { fetchData }                          from './data.js';
import { createScatterplot }                  from './plot/scatterplot.js';
import { createDiagnostics }                  from './plot/diagnostics.js';
import { populateControls, bindControls, syncControls, updateStats } from './plot/dashboard.js';
import { ols }      from './stats/ols.js';
import { robust }   from './stats/robust.js';
import { spearman } from './stats/spearman.js';
import { theilSen } from './stats/theilsen.js';
import { residualize, residualizeWithStats } from './stats/common.js';

// ---------------------------------------------------------------------------
// App state (in-memory, not in URL)
// ---------------------------------------------------------------------------

let data    = null;  // parsed CSV rows (array of objects)
let columns = [];    // numeric-eligible column names (usable in models)
let colMeta = [];    // all column metadata: [{ name, isNumeric, colorType }]

const MODELS = { ols, robust, spearman, theilsen: theilSen };
const RANK_MODELS = new Set(['spearman', 'theilsen']);

let scatter     = null;
let diagnostics = null;
let hoveredIndex = null;  // currently hovered original row index

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
// Rank transform for Spearman display
// ---------------------------------------------------------------------------

function rankTransform(arr) {
  const indexed = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(arr.length);
  for (let i = 0; i < indexed.length; ) {
    let j = i;
    while (j < indexed.length - 1 && indexed[j].v === indexed[j + 1].v) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[indexed[k].i] = avg;
    i = j + 1;
  }
  return ranks;
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
  const activeIndices = data
    .map((_, i) => i)
    .filter(i => !censored.has(i)
      && Number.isFinite(data[i][xColName])
      && Number.isFinite(data[i][yColName]));

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

  // Residualize Y against nuisance covariates (OLS/Robust only)
  let isResidualized = false;
  let nuisanceNames  = [];
  let nuisancePartialR2 = [];
  if (state.n.length && !RANK_MODELS.has(state.m)) {
    nuisanceNames = state.n.map(i => columns[i]).filter(Boolean);
    if (nuisanceNames.length) {
      const nuisData = nuisanceNames.map(col => activeIndices.map(i => data[i][col]));
      try {
        const result = residualizeWithStats(yActive, nuisData);
        yActive = result.residuals;
        nuisancePartialR2 = result.partialR2;
        isResidualized = true;
      } catch (e) {
        showError(`Residualization failed: ${e.message}`);
        return;
      }
    }
  }

  // Rank-transform for Spearman display
  let displayX = xActive;
  let displayY = yActive;
  if (state.m === 'spearman') {
    displayX = rankTransform(xActive);
    displayY = rankTransform(yActive);
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

  // Update diagnostic plots (OLS and Robust only)
  updateDiagnostics(modelResult, activeIndices);

  // Show/hide diag plots section
  const diagEl = document.getElementById('diag-plots');
  const hasDiag = (state.m === 'ols' || state.m === 'robust') && modelResult?.residuals?.length;
  if (diagEl) diagEl.classList.toggle('hidden', !hasDiag);

  // Keep form controls in sync (keyboard nav changes state without touching the DOM)
  syncControls(state);
}

function updateDiagnostics(modelResult, activeIndices) {
  const state = getState();
  if ((state.m === 'ols' || state.m === 'robust') && modelResult?.residuals?.length) {
    diagnostics.update({
      residuals:     modelResult.residuals,
      activeIndices,
      hoveredIndex,
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
  scatter = createScatterplot(document.getElementById('scatter-svg'));

  const histSvg = document.getElementById('diag-hist');
  const qqSvg   = document.getElementById('diag-qq');
  if (histSvg && qqSvg) {
    diagnostics = createDiagnostics(histSvg, qqSvg);
  } else {
    diagnostics = { update: () => {}, clear: () => {} };
  }

  // Wire controls and keyboard
  bindControls(getState());
  setupKeyboard();
  setupExport();

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
  if (urlInput && state.src) urlInput.value = state.src;

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
