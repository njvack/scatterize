// src/main.js
// Entry point: data loading, render pipeline, keyboard shortcuts.

import { getState, setState, onStateChange } from './state.js';
import { fetchData }                          from './data.js';
import { storeLocalFile, localFileName }      from './localfile.js';
import { createScatterplot, buildColorOf, readPalette } from './plot/scatterplot.js';
import { createDiagnostics }                  from './plot/diagnostics.js';
import { populateControls, bindControls, syncControls, updateStats,
         bindSmootherControls, syncSmootherControls } from './plot/dashboard.js';
import { runningMedianIQR, lowess } from './plot/smoother.js';
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
let _cachedUpdateArgs = null;  // last args passed to scatter.update(); reused on resize
let _cachedCSVData    = null;  // data snapshot for CSV export
let hoveredIndex = null;         // currently hovered original row index
let currentPointColors = null;   // parallel to residuals, one color per active point
let currentPoints = null;        // full points array from last render (for group hover)
let currentActiveIndices = null; // active row indices from last render (for group hover)

const LOAD_BLANK_DELAY = 250; // ms before showing loading message
let loadingTimer = null;

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
  setLoading(true, url);
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
    _cachedCSVData = null;
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
  const colorOf = buildColorOf(active, groupColorType, readPalette().point);
  currentPointColors = activeIndices.map(i => colorOf(points[i]));

  // Store for group hover callbacks
  currentPoints = points;
  currentActiveIndices = activeIndices;

  // Compute smoother data
  let smootherData = null;
  if (state.sm && activeIndices.length >= 7) {
    const pctMin = Math.max(1, Math.ceil(700 / activeIndices.length));
    const sw = Math.max(state.sw ?? 10, pctMin);
    const activeXY = activeIndices.map((_, ai) => ({ x: displayX[ai], y: displayY[ai] }));
    if (state.sm === 'median') smootherData = runningMedianIQR(activeXY, sw / 100);
    else if (state.sm === 'lowess') smootherData = lowess(activeXY, sw / 100);
  }
  syncSmootherControls(state, activeIndices.length);

  // Cache data for CSV export
  _cachedCSVData = {
    activeIndices,
    censored,
    xColName, yColName, hColName,
    xLabel: state.m === 'spearman' ? `rank(${xColName})` : xColName,
    yLabel: state.m === 'spearman' ? `rank(${yColName})` : isResidualized ? `Residualized ${yColName}` : yColName,
    isResidualized,
    isSpearman: state.m === 'spearman',
    nuisanceNames,
    residuals: modelResult?.residuals ?? null,
    displayX,
    displayY,
    yActiveOrig: isResidualized ? yActiveOrig : null,
    smootherData,
  };

  // Update scatter plot
  _cachedUpdateArgs = {
    points,
    modelResult,
    xLabel: state.m === 'spearman' ? `rank(${xColName})` : xColName,
    yLabel: state.m === 'spearman' ? `rank(${yColName})` : isResidualized ? `Residualized ${yColName}` : yColName,
    modelKey: state.m,
    groupColorType,
    groupLabel: hColName,
    customXTicks: state.xl,
    customYTicks: state.yl,
    smootherData,
    onPointClick: (index) => toggleCensor(index),
    onPointHover: (index) => {
      hoveredIndex = index;
      updateDiagnostics(modelResult, activeIndices);
    },
    onGroupHover: (g) => {
      if (g == null) {
        diagnostics.setGroupHover(null);
      } else {
        const groupStr = String(g);
        const rowIndexSet = new Set(
          currentActiveIndices.filter(i => String(currentPoints[i]?.group) === groupStr)
        );
        diagnostics.setGroupHover(rowIndexSet);
      }
    },
  };
  scatter.update(_cachedUpdateArgs);

  // Update stats panel
  updateStats({
    modelResult,
    modelKey:   state.m,
    xLabel:     state.m === 'spearman' ? `rank(${xColName})` : xColName,
    yLabel:     state.m === 'spearman' ? `rank(${yColName})` : yColName,
    n:          activeIndices.length,
    nCensored:  censored.size,
    nuisanceNames,
    nuisancePartialR2,
  });

  // Show/hide diag plots section.
  const diagEl = document.getElementById('diag-plots');
  const hasDiag = (state.m === 'ols' || state.m === 'robust') && modelResult?.residuals?.length;
  if (diagEl) diagEl.hidden = !hasDiag;

  // Update diagnostic plots (OLS and Robust only)
  updateDiagnostics(modelResult, activeIndices);
  
  // Keep form controls in sync (keyboard nav changes state without touching the DOM)
  syncControls(state);
}

// Resize-only redraw: re-layout with cached data, no model or KDE recomputation.
function redraw() {
  if (!_cachedUpdateArgs) return;
  scatter.update({ ..._cachedUpdateArgs, animate: false });
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
  if (el) el.hidden = !show;
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

function setLoading(on, url) {
  const btn = document.getElementById('load-btn');
  const loadingEl = document.getElementById('loading-state');
  if (btn) {
    btn.disabled = on;
    btn.textContent = on ? 'Loading…' : 'Open link';
  }
  if (on) {
    showEmptyState(false);
    document.body.style.cursor = 'wait';
    loadingTimer = setTimeout(() => {
      const msgEl = document.getElementById('loading-message');
      if (msgEl) msgEl.textContent = `Loading data from ${url}`;
      if (loadingEl) loadingEl.hidden = false;
    }, LOAD_BLANK_DELAY);
  } else {
    clearTimeout(loadingTimer);
    loadingTimer = null;
    document.body.style.cursor = '';
    if (loadingEl) loadingEl.hidden = true;
  }
}

// ---------------------------------------------------------------------------
// Keyboard shortcuts
// ---------------------------------------------------------------------------

function toggleAbout() {
  const modal = document.getElementById('about-modal');
  if (!modal) return;
  if (modal.open) modal.close();
  else modal.showModal();
}

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
  const urlInput = document.getElementById('source-url');
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
// SVG / PNG export helpers
// ---------------------------------------------------------------------------

// All visual styles are inlined on SVG elements at draw time, so cloneNode(true)
// produces a fully self-contained SVG with no external stylesheet dependencies.

function exportFilename(ext) {
  const state = getState();
  const xName = columns[state.x] ?? `col${state.x ?? 'x'}`;
  const yName = columns[state.y] ?? `col${state.y ?? 'y'}`;
  return `scatterize-${xName}-vs-${yName}.${ext}`;
}

let _fontBase64 = null;
async function fetchFontBase64() {
  if (_fontBase64) return _fontBase64;
  const resp = await fetch('fonts/LeagueSpartan-VF.woff2');
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  _fontBase64 = btoa(binary);
  return _fontBase64;
}

// Linear interpolation into a sorted [{x, y}] array.
function interpolateAt(pts, x) {
  if (!pts || !pts.length) return null;
  if (x <= pts[0].x) return pts[0].y;
  if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
  let lo = 0, hi = pts.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].x <= x) lo = mid; else hi = mid;
  }
  const t = (x - pts[lo].x) / (pts[hi].x - pts[lo].x);
  return pts[lo].y + t * (pts[hi].y - pts[lo].y);
}

function buildCSVString() {
  if (!_cachedCSVData || !data) return null;
  const {
    activeIndices, censored, xColName, yColName, hColName,
    xLabel, yLabel, isResidualized, isSpearman,
    nuisanceNames, residuals, displayX, displayY, yActiveOrig, smootherData,
  } = _cachedCSVData;

  const activeSet   = new Set(activeIndices);
  const dispXMap    = new Map(activeIndices.map((oi, ai) => [oi, displayX[ai]]));
  const dispYMap    = new Map(activeIndices.map((oi, ai) => [oi, displayY[ai]]));
  const origYMap    = yActiveOrig
    ? new Map(activeIndices.map((oi, ai) => [oi, yActiveOrig[ai]]))
    : null;
  const residualMap = residuals
    ? new Map(activeIndices.map((oi, ai) => [oi, residuals[ai]]))
    : null;

  // Interpolate smoother at each active point's display X.
  let smoothMap = null;
  if (smootherData) {
    const bandLowPts  = smootherData.band?.map(p => ({ x: p.x, y: p.y0 }));
    const bandHighPts = smootherData.band?.map(p => ({ x: p.x, y: p.y1 }));
    smoothMap = new Map();
    for (let ai = 0; ai < activeIndices.length; ai++) {
      const x = displayX[ai];
      smoothMap.set(activeIndices[ai], {
        low:  interpolateAt(bandLowPts, x),
        line: interpolateAt(smootherData.line, x),
        high: interpolateAt(bandHighPts, x),
      });
    }
  }

  // Build column headers.
  const headers = [xLabel, yLabel];
  if (isResidualized)    headers.push(yColName);
  if (isSpearman)        headers.push(xColName, yColName);
  nuisanceNames.forEach(n => headers.push(n));
  if (residualMap)       headers.push('residual');
  if (hColName)          headers.push(hColName);
  if (smoothMap)         headers.push('smooth_low', 'smooth_line', 'smooth_high');

  const escapeCell = v => {
    if (v == null || v === '') return '';
    const s = String(v);
    return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const lines = [headers.map(escapeCell).join(',')];

  for (let i = 0; i < data.length; i++) {
    const row      = data[i];
    const isActive = activeSet.has(i);

    const xVal = isSpearman
      ? (isActive ? dispXMap.get(i) : '')
      : row[xColName];
    const yVal = (isSpearman || isResidualized)
      ? (isActive ? dispYMap.get(i) : '')
      : row[yColName];

    const vals = [xVal, yVal];

    if (isResidualized)
      vals.push(isActive ? (origYMap?.get(i) ?? '') : row[yColName]);
    if (isSpearman)
      vals.push(row[xColName], row[yColName]);

    nuisanceNames.forEach(n => vals.push(row[n]));
    if (residualMap) vals.push(isActive ? (residualMap.get(i) ?? '') : '');
    if (hColName)    vals.push(row[hColName]);
    if (smoothMap) {
      const s = smoothMap.get(i);
      vals.push(s?.low ?? '', s?.line ?? '', s?.high ?? '');
    }

    lines.push(vals.map(escapeCell).join(','));
  }

  return lines.join('\n');
}

function downloadCSV(filename) {
  const csv = buildCSVString();
  if (!csv) return;
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function downloadSVG(svgEl, filename) {
  const clone = svgEl.cloneNode(true);
  const blob = new Blob(
    ['<?xml version="1.0" encoding="UTF-8"?>\n', new XMLSerializer().serializeToString(clone)],
    { type: 'image/svg+xml' }
  );
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function downloadPNG(svgEl, filename) {
  const scale = 2;
  // clientWidth/Height are 0 for detached elements (from getExportSVG); fall back to attributes.
  const width  = svgEl.clientWidth  || +svgEl.getAttribute('width');
  const height = svgEl.clientHeight || +svgEl.getAttribute('height');

  // Embed the font so the canvas rasterizer renders text correctly.
  const fontBase64 = await fetchFontBase64();
  const clone = svgEl.cloneNode(true);
  clone.setAttribute('width', width);
  clone.setAttribute('height', height);
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = `@font-face { font-family: "League Spartan"; src: url("data:font/woff2;base64,${fontBase64}") format("woff2"); font-weight: 100 900; }`;
  clone.insertBefore(style, clone.firstChild);

  const svgStr = new XMLSerializer().serializeToString(clone);
  const svgBlob = new Blob([svgStr], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(svgBlob);

  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
        resolve();
      }, 'image/png');
    };
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// Share / Export modal
// ---------------------------------------------------------------------------

function setupShareModal() {
  const shareBtn = document.getElementById('share-btn');
  const modal    = document.getElementById('share-modal');
  if (!shareBtn || !modal) return;

  shareBtn.addEventListener('click', () => {
    const state = getState();
    const isParametric = state.m === 'ols' || state.m === 'robust';
    const isLocal = state.src?.startsWith('local:');

    // Populate filename inputs
    document.getElementById('csv-filename').value      = exportFilename('csv');
    document.getElementById('svg-filename').value      = exportFilename('svg');
    document.getElementById('svg-diag-filename').value = exportFilename('svg').replace('.svg', '-diagnostics.svg');
    document.getElementById('png-filename').value      = exportFilename('png');
    document.getElementById('png-diag-filename').value = exportFilename('png').replace('.png', '-diagnostics.png');

    // Show diagnostic rows only for OLS / Robust
    document.getElementById('svg-diag-row').hidden = !isParametric;
    document.getElementById('png-diag-row').hidden = !isParametric;

    // Populate share URL
    const urlInput  = document.getElementById('share-url');
    const copyBtn   = document.getElementById('copy-url-btn');
    const localNote = document.getElementById('local-note');
    if (urlInput)  { urlInput.value = window.location.href; urlInput.disabled = isLocal; }
    if (copyBtn)   copyBtn.disabled  = isLocal;
    if (localNote) localNote.hidden  = !isLocal;

    modal.showModal();
  });

  // Close on backdrop click or Escape
  modal.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  });
  modal.addEventListener('cancel', e => e.currentTarget.close());

  // CSV download
  document.getElementById('csv-download-btn')?.addEventListener('click', () => {
    const raw = document.getElementById('csv-filename')?.value || exportFilename('csv');
    downloadCSV(raw.endsWith('.csv') ? raw : `${raw}.csv`);
  });

  // SVG scatter download
  document.getElementById('svg-download-btn')?.addEventListener('click', () => {
    if (!scatter) return;
    const raw = document.getElementById('svg-filename')?.value || exportFilename('svg');
    downloadSVG(scatter.getExportSVG(), raw.endsWith('.svg') ? raw : `${raw}.svg`);
  });

  // SVG diagnostics download
  document.getElementById('svg-diag-download-btn')?.addEventListener('click', () => {
    const svgEl = document.getElementById('diag-combined');
    if (!svgEl) return;
    const raw = document.getElementById('svg-diag-filename')?.value
      || exportFilename('svg').replace('.svg', '-diagnostics.svg');
    downloadSVG(svgEl, raw.endsWith('.svg') ? raw : `${raw}.svg`);
  });

  // PNG scatter download
  document.getElementById('png-download-btn')?.addEventListener('click', async () => {
    if (!scatter) return;
    const raw = document.getElementById('png-filename')?.value || exportFilename('png');
    await downloadPNG(scatter.getExportSVG(), raw.endsWith('.png') ? raw : `${raw}.png`);
  });

  // PNG diagnostics download
  document.getElementById('png-diag-download-btn')?.addEventListener('click', async () => {
    const svgEl = document.getElementById('diag-combined');
    if (!svgEl) return;
    const raw = document.getElementById('png-diag-filename')?.value
      || exportFilename('png').replace('.png', '-diagnostics.png');
    await downloadPNG(svgEl, raw.endsWith('.png') ? raw : `${raw}.png`);
  });

  // Copy URL
  document.getElementById('copy-url-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('copy-url-btn');
    navigator.clipboard.writeText(window.location.href).then(() => {
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  });
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', async () => {
  // Set up plot components
  scatter = createScatterplot(
    document.getElementById('scatter-back'),
    document.getElementById('scatter-front'),
    document.getElementById('overlay-svg'),
    { glCanvas: document.getElementById('gl-canvas') }
  );

  const combinedSvg  = document.getElementById('diag-combined');
  const diagOverlay  = document.getElementById('diag-overlay');
  const diagGlCanvas = document.getElementById('diag-gl-canvas');
  diagnostics = combinedSvg
    ? createDiagnostics(combinedSvg, diagOverlay, {
        glCanvas: diagGlCanvas,
        onQQHover: (index) => {
          scatter.highlightPoint(index);
          diagnostics.setExternalHover(index);
        },
      })
    : { update: () => {}, clear: () => {}, setExternalHover: () => {}, setGroupHover: () => {} };

  // Wire controls and keyboard
  bindControls();
  bindSmootherControls();
  setupKeyboard();
  setupShareModal();
  setupFileDrop();

  // React to URL hash changes
  onStateChange(async (state) => {
    // Update header data source indicator
    const sourceEl   = document.getElementById('data-source');
    const sourceNameEl = document.getElementById('data-source-name');
    if (sourceEl) sourceEl.hidden = !state.src;
    if (sourceNameEl && state.src) {
      sourceNameEl.textContent = state.src.startsWith('local:')
        ? localFileName(state.src)
        : state.src;
    }

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

  // Redraw on window resize (coalescing: renders on most events, never piles up)
  let _resizeBusy = false;
  let _resizePending = false;

  function renderOnResize() {
    if (_resizeBusy) {
      _resizePending = true;
      return;
    }
    _resizeBusy = true;
    redraw();
    _resizeBusy = false;
    if (_resizePending) {
      _resizePending = false;
      setTimeout(renderOnResize, 0);
    }
  }

  window.addEventListener('resize', renderOnResize);

  // Initial load
  const state = getState();

  if (state.src) {
    const sourceEl     = document.getElementById('data-source');
    const sourceNameEl = document.getElementById('data-source-name');
    if (sourceEl) sourceEl.hidden = false;
    if (sourceNameEl) sourceNameEl.textContent = state.src.startsWith('local:')
      ? localFileName(state.src)
      : state.src;

    const ok = await loadData(state.src);
    if (ok) {
      window._loadedSrc = state.src;
      populateControls(colMeta, state);
    }
  }

  render();

  // Load URL button
  document.getElementById('load-btn')?.addEventListener('click', () => {
    const url = document.getElementById('source-url')?.value?.trim();
    if (!url) return;
    setState({ src: url, x: 0, y: 1, m: 'ols', n: [], c: [], h: null });
  });

  // Enter key in URL input
  document.getElementById('source-url')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('load-btn')?.click();
  });

  // Browse files button — trigger a hidden file input
  const openFileBtn = document.getElementById('open-file-btn');
  if (openFileBtn) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.csv,.tsv,.txt';
    fileInput.addEventListener('change', async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      fileInput.value = '';
      let key;
      try {
        key = await storeLocalFile(file);
      } catch (err) {
        showError(err.message);
        return;
      }
      setState({ src: key, x: 0, y: 1, m: 'ols', n: [], c: [], h: null });
    });
    openFileBtn.addEventListener('click', () => fileInput.click());
  }

  // Clear data source
  document.getElementById('clear-data-btn')?.addEventListener('click', () => {
    setState({ src: '', x: 0, y: 1, m: 'ols', n: [], c: [], h: null });
  });

  // Error dismiss
  document.getElementById('error-close')?.addEventListener('click', () => showError(null));

  // About modal
  document.getElementById('about-btn')?.addEventListener('click', toggleAbout);
  document.getElementById('about-modal')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.close();
  });

  // Help modal
  document.getElementById('help-btn')?.addEventListener('click', toggleHelp);
  document.getElementById('help-modal')?.addEventListener('click', e => {
    // Clicks on the ::backdrop hit the dialog element itself; close if outside content
    if (e.target === e.currentTarget) e.currentTarget.close();
  });
});
