// src/plot/dashboard.js
// Populates control panel selectors and renders the stats panel.

import { setState } from '../state.js';

const RANK_MODELS = new Set(['spearman', 'theilsen']);

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

// Bind all control change events. Called once after initial render.
export function bindControls(state) {
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

const FMT = {
  coef: v => v == null ? '—' : v.toFixed(4),
  stat: v => v == null ? '—' : v.toFixed(3),
  pval: v => {
    if (v == null) return '—';
    if (v < 0.001) return '<0.001';
    return v.toFixed(3);
  },
  r2: v => v == null ? '—' : v.toFixed(3),
  n: v => v == null ? '—' : String(v),
};

// Render the model results section of the stats panel.
export function updateStats({ modelResult, modelKey, xLabel, yLabel, n, nCensored,
                               nuisanceNames = [], nuisancePartialR2 = [] }) {
  const el = document.getElementById('stats-model');
  if (!el) return;
  el.innerHTML = '';

  if (!modelResult) {
    el.innerHTML = '<p class="stats-label">No results</p>';
    return;
  }

  const rows = buildStatRows(modelResult, modelKey, xLabel, yLabel);
  const title = { ols: 'OLS', robust: 'Robust', spearman: 'Spearman', theilsen: 'Theil-Sen' }[modelKey] ?? modelKey;

  const hasNuisanceStats = nuisanceNames.length > 0 && nuisancePartialR2.length > 0
    && (modelKey === 'ols' || modelKey === 'robust');

  const nuisanceRows = hasNuisanceStats
    ? nuisanceNames.map((name, i) =>
        `<tr><td>${name}</td><td>${FMT.r2(nuisancePartialR2[i])}</td></tr>`
      ).join('')
    : '';

  const html = `
    <p class="stats-model-name">${title}</p>
    <table class="stats-table">
      ${rows.map(([label, val]) => `<tr><td>${label}</td><td>${val}</td></tr>`).join('')}
      ${hasNuisanceStats ? `
        <tr><td colspan="2"><hr class="stats-divider"></td></tr>
        <tr><td colspan="2" class="stats-nuisance-header">nuisance partial R²</td></tr>
        ${nuisanceRows}
      ` : ''}
    </table>
  `;
  el.innerHTML = html;

  // Descriptive stats
  const descEl = document.getElementById('stats-desc');
  if (descEl) {
    descEl.innerHTML = `
      <p class="stats-label">Sample</p>
      <table class="stats-table">
        <tr><td>n (active)</td><td>${FMT.n(n)}</td></tr>
        ${nCensored > 0 ? `<tr><td>censored</td><td>${FMT.n(nCensored)}</td></tr>` : ''}
      </table>
    `;
  }
}

function buildStatRows(r, key, xLabel, yLabel) {
  switch (key) {
    case 'ols':
      return [
        ['slope', FMT.coef(r.slope)],
        ['SE', FMT.coef(r.seSlope)],
        ['t', FMT.stat(r.tSlope)],
        ['p', FMT.pval(r.pSlope)],
        ['R²', FMT.r2(r.rSquared)],
        ['adj. R²', FMT.r2(r.adjRSquared)],
        ['intercept', FMT.coef(r.intercept)],
      ];
    case 'robust':
      return [
        ['slope', FMT.coef(r.slope)],
        ['SE', FMT.coef(r.seSlope)],
        ['t', FMT.stat(r.tSlope)],
        ['p', FMT.pval(r.pSlope)],
        ['intercept', FMT.coef(r.intercept)],
      ];
    case 'spearman':
      return [
        ['ρ', FMT.stat(r.rho)],
        ['p', FMT.pval(r.pValue)],
        ['slope', FMT.coef(r.slope)],
        ['intercept', FMT.coef(r.intercept)],
      ];
    case 'theilsen':
      return [
        ['slope', FMT.coef(r.slope)],
        ['intercept', FMT.coef(r.intercept)],
        ['τ', FMT.stat(r.tau)],
        ['p', FMT.pval(r.pValue)],
      ];
    default:
      return Object.entries(r)
        .filter(([, v]) => typeof v === 'number')
        .map(([k, v]) => [k, FMT.coef(v)]);
  }
}
