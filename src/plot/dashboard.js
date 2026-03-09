// src/plot/dashboard.js
// Populates control panel selectors and renders the stats panel.

import { setState } from '../state.js';
import { RANK_MODELS } from '../stats/common.js';

const MODEL_DISPLAY_NAMES = { ols: 'OLS', robust: 'Robust', spearman: 'Spearman', theilsen: 'Theil-Sen' };

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

// Populate all column selectors.
// colMeta: [{ name, isNumeric, colorType }] — full column metadata from classifyColumns()
// Reads current state to set selected values.
export function populateControls(colMeta, state) {
  const numericCols    = colMeta.filter(c => c.isNumeric).map(c => c.name);
  const nonNumericCols = colMeta.filter(c => !c.isNumeric).map(c => c.name);
  const allCols        = colMeta.map(c => c.name);

  populateColumnSelect('x-select', numericCols, nonNumericCols, state.x);
  populateColumnSelect('y-select', numericCols, nonNumericCols, state.y);
  populateColumnSelect('group-select', allCols, [], state.h, true);
  populateNuisanceList(numericCols, nonNumericCols, state);

  const modelSelect = document.getElementById('model-select');
  modelSelect.value = state.m;

  updateNuisanceAvailability(state.m);
}

// activeCols: selectable columns (value = index in activeCols)
// disabledCols: shown but disabled at the bottom (no meaningful value)
function populateColumnSelect(id, activeCols, disabledCols, selectedIndex, allowNone = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  if (allowNone) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'None';
    el.appendChild(opt);
  }
  activeCols.forEach((col, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = col;
    if (i === selectedIndex) opt.selected = true;
    el.appendChild(opt);
  });
  if (disabledCols.length) {
    const sep = document.createElement('option');
    sep.disabled = true;
    sep.textContent = '\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500';
    el.appendChild(sep);
    disabledCols.forEach(col => {
      const opt = document.createElement('option');
      opt.disabled = true;
      opt.textContent = col;
      el.appendChild(opt);
    });
  }
  if (allowNone && selectedIndex == null) el.value = '';
}

function populateNuisanceList(numericCols, nonNumericCols, state) {
  const list = document.getElementById('nuisance-list');
  if (!list) return;
  list.innerHTML = '';
  const selected = new Set(state.n);

  numericCols.forEach((col, i) => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = String(i);
    cb.checked = selected.has(i);
    cb.addEventListener('change', () => {
      const checked = [...list.querySelectorAll('input:not([disabled]):checked')]
        .map(c => parseInt(c.value, 10));
      setState({ n: checked });
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + col));
    list.appendChild(label);
  });

  nonNumericCols.forEach(col => {
    const label = document.createElement('label');
    label.style.opacity = '0.4';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.disabled = true;
    cb.dataset.nonnumeric = 'true';
    label.appendChild(cb);
    label.appendChild(document.createTextNode(' ' + col));
    list.appendChild(label);
  });
}

function updateNuisanceAvailability(modelKey) {
  const list = document.getElementById('nuisance-list');
  const note = document.getElementById('nuisance-note');
  const isRank = RANK_MODELS.has(modelKey);
  if (list) {
    // Only toggle the numeric checkboxes; non-numeric ones stay permanently disabled
    list.querySelectorAll('input:not([data-nonnumeric])').forEach(cb => { cb.disabled = isRank; });
    list.style.opacity = isRank ? '0.4' : '1';
  }
  if (note) note.hidden = !isRank;
}

// Sync select values to state without rebuilding the option lists.
// Call this after any state change that doesn't reload data (e.g. keyboard nav).
export function syncControls(state) {
  const xSel = document.getElementById('x-select');
  const ySel = document.getElementById('y-select');
  const mSel = document.getElementById('model-select');
  const gSel = document.getElementById('group-select');
  if (xSel) xSel.value = String(state.x);
  if (ySel) ySel.value = String(state.y);
  if (mSel) mSel.value = state.m;
  if (gSel) gSel.value = state.h != null ? String(state.h) : '';
}

// Log-scale mapping between slider position (0–100) and window percent.
// pctMin: minimum percent (determined by n, so window always ≥ 7 points).
function sliderPosToPct(pos, pctMin) {
  const logMin = Math.log(Math.max(pctMin, 1));
  const logMax = Math.log(100);
  if (logMax <= logMin) return 100;
  return Math.round(Math.exp(logMin + (pos / 100) * (logMax - logMin)));
}

function pctToSliderPos(pct, pctMin) {
  const logMin = Math.log(Math.max(pctMin, 1));
  const logMax = Math.log(100);
  if (logMax <= logMin) return 100;
  return Math.round((Math.log(Math.max(pct, pctMin)) - logMin) / (logMax - logMin) * 100);
}

export function bindSmootherControls() {
  const sel       = document.getElementById('smoother-select');
  const slider    = document.getElementById('smoother-window');
  const pctLabel  = document.getElementById('smoother-window-pct');

  sel?.addEventListener('change', () => {
    setState({ sm: sel.value || null });
  });

  slider?.addEventListener('input', () => {
    const pctMin = +(slider.dataset.pctMin ?? 1);
    const n = +(slider.dataset.n ?? 0);
    const pct = sliderPosToPct(+slider.value, pctMin);
    const windowN = n > 0 ? Math.max(7, Math.round(pct / 100 * n)) : '';
    if (pctLabel) pctLabel.textContent = n > 0 ? `${pct}% (n=${windowN})` : `${pct}%`;
    setState({ sw: pct });
  });
}

// Sync smoother controls to current state. n = number of active points.
export function syncSmootherControls(state, n) {
  const sel         = document.getElementById('smoother-select');
  const windowGroup = document.getElementById('smoother-window-group');
  const slider      = document.getElementById('smoother-window');
  const pctLabel    = document.getElementById('smoother-window-pct');

  if (sel) sel.value = state.sm ?? '';

  const hasSmooth = !!state.sm;
  if (windowGroup) windowGroup.hidden = !hasSmooth;

  if (slider && pctLabel) {
    const pctMin = n > 0 ? Math.max(1, Math.ceil(700 / n)) : 100;
    const sw = Math.max(state.sw ?? 10, pctMin);
    slider.dataset.pctMin = String(pctMin);
    slider.dataset.n = String(n);
    slider.disabled = pctMin >= 100;
    slider.value = String(pctToSliderPos(sw, pctMin));
    const windowN = Math.max(7, Math.round(sw / 100 * n));
    pctLabel.textContent = `${sw}% (n=${windowN})`;

    const windowLabel = document.getElementById('smoother-window-label');
    if (windowLabel) windowLabel.textContent = state.sm === 'lowess' ? 'Bandwidth' : 'Window';
  }
}

// Bind all control change events. Called once after initial render.
export function bindControls() {
  const xSel = document.getElementById('x-select');
  const ySel = document.getElementById('y-select');
  const mSel = document.getElementById('model-select');
  const gSel = document.getElementById('group-select');

  xSel?.addEventListener('change', () => setState({ x: parseInt(xSel.value, 10) }));
  ySel?.addEventListener('change', () => setState({ y: parseInt(ySel.value, 10) }));
  mSel?.addEventListener('change', () => {
    const newM = mSel.value;
    // Clear nuisance when switching to a rank model
    const nuisancePatch = RANK_MODELS.has(newM) ? { n: [] } : {};
    setState({ m: newM, ...nuisancePatch });
    updateNuisanceAvailability(newM);
  });
  gSel?.addEventListener('change', () => {
    setState({ h: gSel.value !== '' ? parseInt(gSel.value, 10) : null });
  });
}

// ---------------------------------------------------------------------------
// Stats panel
// ---------------------------------------------------------------------------

function fmtNum(v, decimals) {
  if (Math.abs(v) >= 10000) return v.toExponential(3);
  return v.toFixed(decimals);
}

const FMT = {
  coef: v => v == null ? '—' : fmtNum(v, 4),
  stat: v => v == null ? '—' : fmtNum(v, 3),
  pval: v => {
    if (v == null) return '—';
    if (v < 0.001) return '<0.001';
    return v.toFixed(3);
  },
  r2: v => v == null ? '—' : v.toFixed(3),
  n: v => v == null ? '—' : String(v),
};

// Render the model results section of the stats panel.
export function updateStats({ modelResult, modelKey, xLabel,
                               n, nCensored,
                               nuisanceNames = [], nuisancePartialR2 = [],
                               skewness = null, kurtosis = null }) {
  const el = document.getElementById('stats-model');
  if (!el) return;
  el.innerHTML = '';

  if (!modelResult) {
    el.innerHTML = `<h3>${MODEL_DISPLAY_NAMES[modelKey] ?? modelKey}</h3>`;
    return;
  }

  const r = modelResult;
  const title = MODEL_DISPLAY_NAMES[modelKey] ?? modelKey;
  const hasNuisance = nuisanceNames.length > 0 && (modelKey === 'ols' || modelKey === 'robust');

  const samplePairs = [
    ['n',        FMT.n(n)],
    ...(nCensored > 0 ? [['censored', FMT.n(nCensored)]] : []),
    ['skewness', FMT.stat(skewness)],
    ['kurtosis', FMT.stat(kurtosis)],
  ];

  let tableBody;

  if (modelKey === 'spearman' || modelKey === 'theilsen') {
    tableBody = rows(flatRows(r, modelKey));
  } else if (!hasNuisance) {
    tableBody = rows(flatRows(r, modelKey));
  } else {
    // OLS/Robust with nuisance: one group header per IV.
    // X variable and model-wide stats share a section (slope/SE/t/p/R²/intercept).
    const xRows = modelKey === 'ols'
      ? [
          ['slope',      FMT.coef(r.slope)],
          ['SE',         FMT.coef(r.seSlope)],
          ['t',          FMT.stat(r.tSlope)],
          ['p',          FMT.pval(r.pSlope)],
          ['partial R²', FMT.r2(r.rSquared)],
          ['R² (full)',  FMT.r2(r.fullModelRSquared)],
          ['adj. R²',    FMT.r2(r.fullModelAdjRSquared)],
          ['intercept',  FMT.coef(r.intercept)],
        ]
      : [ // Robust — p via asymptotic normal approximation
          ['slope',     FMT.coef(r.slope)],
          ['SE',        FMT.coef(r.seSlope)],
          ['t',         FMT.stat(r.tSlope)],
          ['p',         FMT.pval(r.pSlope)],
          ['intercept', FMT.coef(r.intercept)],
        ];

    const nuisanceSections = nuisanceNames.map((name, i) => `
      ${groupHeader(name)}
      <tr><th scope="row">partial R²</th><td>${FMT.r2(nuisancePartialR2[i])}</td></tr>
    `).join('');

    tableBody = `${groupHeader(xLabel)}${rows(xRows)}${nuisanceSections}`;
  }

  el.innerHTML = `
    <h3>${title}</h3>
    <table class="stats-table">
      ${tableBody}
      ${rows(samplePairs)}
    </table>
  `;
}

function groupHeader(label) {
  return `<tr><th colspan="2" class="stats-group-header">${label}</th></tr>`;
}

function rows(pairs) {
  return pairs.map(([label, val]) =>
    `<tr><th scope="row">${label}</th><td>${val}</td></tr>`
  ).join('');
}

function flatRows(r, key) {
  switch (key) {
    case 'ols':
      return [
        ['slope',     FMT.coef(r.slope)],
        ['SE',        FMT.coef(r.seSlope)],
        ['t',         FMT.stat(r.tSlope)],
        ['p',         FMT.pval(r.pSlope)],
        ['R²',        FMT.r2(r.rSquared)],
        ['adj. R²',   FMT.r2(r.adjRSquared)],
        ['intercept', FMT.coef(r.intercept)],
      ];
    case 'robust': // p via asymptotic normal approximation
      return [
        ['slope',     FMT.coef(r.slope)],
        ['SE',        FMT.coef(r.seSlope)],
        ['t',         FMT.stat(r.tSlope)],
        ['p',         FMT.pval(r.pSlope)],
        ['intercept', FMT.coef(r.intercept)],
      ];
    case 'spearman':
      return [
        ['ρ',         FMT.stat(r.rho)],
        ['p',         FMT.pval(r.pValue)],
        ['slope',     FMT.coef(r.slope)],
        ['intercept', FMT.coef(r.intercept)],
      ];
    case 'theilsen':
      return [
        ['slope',     FMT.coef(r.slope)],
        ['intercept', FMT.coef(r.intercept)],
        ['τ',         FMT.stat(r.tau)],
        ['p',         FMT.pval(r.pValue)],
      ];
    default:
      return Object.entries(r)
        .filter(([, v]) => typeof v === 'number')
        .map(([k, v]) => [k, FMT.coef(v)]);
  }
}
