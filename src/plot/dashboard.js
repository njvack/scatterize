// src/plot/dashboard.js
// Populates control panel selectors and renders the stats panel.

import { setState } from '../state.js';

const RANK_MODELS = new Set(['spearman', 'theilsen']);

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

// Populate all column selectors with the given column names.
// numericCols: numeric-only columns (for x, y, nuisance)
// allCols: all columns including non-numeric (for group, filter)
// Reads current state to set selected values.
export function populateControls(numericCols, allCols, state) {
  populateColumnSelect('x-select', numericCols, state.x);
  populateColumnSelect('y-select', numericCols, state.y);
  populateColumnSelect('group-select', allCols, state.h, true);
  populateColumnSelect('filter-select', allCols, state.f, true);
  populateNuisanceList(numericCols, state);

  const modelSelect = document.getElementById('model-select');
  modelSelect.value = state.m;

  updateNuisanceAvailability(state.m);
}

function populateColumnSelect(id, columns, selectedIndex, allowNone = false) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = '';
  if (allowNone) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'None';
    el.appendChild(opt);
  }
  columns.forEach((col, i) => {
    const opt = document.createElement('option');
    opt.value = String(i);
    opt.textContent = col;
    if (i === selectedIndex) opt.selected = true;
    el.appendChild(opt);
  });
  if (allowNone && selectedIndex == null) el.value = '';
}

function populateNuisanceList(columns, state) {
  const list = document.getElementById('nuisance-list');
  if (!list) return;
  list.innerHTML = '';
  const selected = new Set(state.n);
  columns.forEach((col, i) => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.value = String(i);
    cb.checked = selected.has(i);
    cb.addEventListener('change', () => {
      const checked = [...list.querySelectorAll('input:checked')].map(c => parseInt(c.value, 10));
      setState({ n: checked });
    });
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
    list.querySelectorAll('input').forEach(cb => { cb.disabled = isRank; });
    list.style.opacity = isRank ? '0.4' : '1';
  }
  if (note) note.hidden = !isRank;
}

// Bind all control change events. Called once after initial render.
export function bindControls(state) {
  const xSel = document.getElementById('x-select');
  const ySel = document.getElementById('y-select');
  const mSel = document.getElementById('model-select');
  const gSel = document.getElementById('group-select');
  const fSel = document.getElementById('filter-select');

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
  fSel?.addEventListener('change', () => {
    setState({ f: fSel.value !== '' ? parseInt(fSel.value, 10) : null });
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
export function updateStats({ modelResult, modelKey, xLabel, yLabel, n, nCensored }) {
  const el = document.getElementById('stats-model');
  if (!el) return;
  el.innerHTML = '';

  if (!modelResult) {
    el.innerHTML = '<p class="stats-label">No results</p>';
    return;
  }

  const rows = buildStatRows(modelResult, modelKey, xLabel, yLabel);
  const title = { ols: 'OLS', robust: 'Robust', spearman: 'Spearman', theilsen: 'Theil-Sen' }[modelKey] ?? modelKey;

  const html = `
    <p class="stats-model-name">${title}</p>
    <table class="stats-table">
      ${rows.map(([label, val]) => `<tr><td>${label}</td><td>${val}</td></tr>`).join('')}
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
