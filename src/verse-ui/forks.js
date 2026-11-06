// src/verse-ui/forks.js
// The fork editor: an ordered list of fork cards. Each card edits one fork of
// the raw spec in place and calls onChange(); structural edits (add, remove,
// reorder, changing an outlier rule) rebuild the list.

import { createChipPicker } from '../plot/chip-picker.js';
import { normalizeSpec, forkOptions, SpecError } from '../verse/spec.js';

let nextId = 1;
export function forkId() { return `f${Date.now().toString(36)}${nextId++}`; }

export function newFork(kind, { all }) {
  switch (kind) {
    case 'exclude': return { id: forkId(), kind, column: all[0] };
    case 'covariates': return { id: forkId(), kind, mode: 'simplify', columns: [] };
    case 'outlier': return { id: forkId(), kind, rule: 'z', thresholds: [2.5, 3], none: true, on: 'xy' };
    case 'model': return { id: forkId(), kind, estimators: ['ols', 'm'] };
    default: throw new Error(`unknown fork kind ${kind}`);
  }
}

const TITLES = { exclude: 'Exclusion', covariates: 'Covariate block', outlier: 'Outlier rule', model: 'Model' };
const RULES = [['z', 'z-score > t'], ['mad', 'MAD robust z > t'], ['mahalanobis', 'Mahalanobis D² > t'], ['cooks', "Cook's D > t"]];
const MODES = [['simplify', 'none, each alone, all'], ['all', 'every subset'], ['nested', 'nested, in order']];
const DEFAULT_T = { z: [2.5, 3], mad: [2.5, 3.5], mahalanobis: [10.6, 13.8], cooks: [4] };

function el(tag, props = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (k === 'class') e.className = v;
    else if (k in e) e[k] = v;
    else e.setAttribute(k, v);
  }
  e.append(...kids.filter(k => k != null));
  return e;
}

function select(options, value, onChange) {
  const s = el('select');
  for (const [v, label] of options) s.append(el('option', { value: v, textContent: label }));
  s.value = value;
  s.addEventListener('change', () => onChange(s.value));
  return s;
}

function checkbox(label, checked, onChange) {
  const c = el('input', { type: 'checkbox', checked });
  c.addEventListener('change', () => onChange(c.checked));
  return el('label', {}, c, label);
}

// Thresholds as typed: "2.5, 3". Returns numbers, or null if any part isn't one.
function parseThresholds(text) {
  const parts = text.split(/[,\s]+/).filter(Boolean);
  const out = parts.map(Number);
  return out.every(Number.isFinite) ? out : null;
}

export function createForkEditor({ list, getColumns, onChange }) {
  let spec = null;

  function render(nextSpec) {
    spec = nextSpec;
    const focusedId = document.activeElement?.closest?.('.fork-card')?.dataset.id;
    list.replaceChildren(...spec.forks.map((f, i) => card(f, i)));
    if (focusedId) list.querySelector(`.fork-card[data-id="${focusedId}"] select, .fork-card[data-id="${focusedId}"] input`)?.focus();
  }

  function changed({ rebuild = false } = {}) {
    if (rebuild) render(spec);
    else updateCounts();
    onChange();
  }

  function updateCounts() {
    for (const c of list.children) {
      const f = spec.forks.find(x => x.id === c.dataset.id);
      if (f) setCount(c, f);
    }
  }

  function setCount(cardEl, f) {
    const countEl = cardEl.querySelector('.fork-count');
    const errEl = cardEl.querySelector('.fork-error');
    try {
      const norm = normalizeSpec({ outcomes: ['_'], predictors: ['_'], forks: [f] }).forks[0];
      const n = forkOptions(norm).length;
      countEl.textContent = `${n} option${n === 1 ? '' : 's'}`;
      errEl.hidden = true;
    } catch (err) {
      countEl.textContent = '';
      errEl.textContent = err instanceof SpecError ? err.message.replace(/^fork \d+:?\s*/, '') : String(err);
      errEl.hidden = false;
    }
  }

  function card(f, i) {
    const { numeric, all } = getColumns();
    const move = delta => {
      const j = i + delta;
      [spec.forks[i], spec.forks[j]] = [spec.forks[j], spec.forks[i]];
      changed({ rebuild: true });
    };
    const head = el('div', { class: 'fork-head' },
      el('span', { class: 'fork-title', textContent: f.rows ? 'Hand-excluded rows' : TITLES[f.kind] }),
      el('span', { class: 'fork-count' }),
      el('button', { type: 'button', textContent: '↑', title: 'Move up', ariaLabel: 'Move fork up', disabled: i === 0, onclick: () => move(-1) }),
      el('button', { type: 'button', textContent: '↓', title: 'Move down', ariaLabel: 'Move fork down', disabled: i === spec.forks.length - 1, onclick: () => move(1) }),
      el('button', { type: 'button', textContent: '×', title: 'Remove', ariaLabel: 'Remove fork', onclick: () => { spec.forks.splice(i, 1); changed({ rebuild: true }); } }),
    );
    const body = [];

    switch (f.kind) {
      case 'exclude':
        if (f.rows) {
          body.push(el('div', { class: 'fork-field', textContent: `${f.rows.length} rows censored in the scatterplot view: apply or ignore.` }));
        } else {
          body.push(el('label', { class: 'fork-field' }, 'Drop rows where this column is true (apply / ignore)',
            select(all.map(c => [c, c]), f.column, v => { f.column = v; changed(); })));
        }
        break;

      case 'covariates': {
        const box = el('div');
        const picker = createChipPicker({
          container: box, inputId: `cov-${f.id}`, placeholder: 'Add covariate…', searchLabel: 'Search covariates',
          onChange: sel => { f.columns = sel; picker.update({ selected: sel }); changed(); },
        });
        picker.update({ options: numeric.map(c => ({ value: c, label: c })), selected: f.columns });
        body.push(box, el('label', { class: 'fork-field' }, 'Subsets',
          select(MODES, f.mode, v => { f.mode = v; changed(); })));
        break;
      }

      case 'outlier': {
        body.push(el('label', { class: 'fork-field' }, 'Rule',
          select(RULES, f.rule, v => {
            f.rule = v;
            f.thresholds = DEFAULT_T[v];
            if (v === 'cooks') { f.perN = true; delete f.on; } else { f.on = f.on ?? 'xy'; delete f.perN; }
            changed({ rebuild: true });
          })));
        const t = el('input', { type: 'text', value: f.thresholds.join(', '), inputMode: 'decimal', ariaLabel: 'Thresholds' });
        t.addEventListener('input', () => {
          const v = parseThresholds(t.value);
          t.setCustomValidity(v ? '' : 'Comma-separated numbers');
          if (v) { f.thresholds = v; changed(); }
        });
        body.push(el('label', { class: 'fork-field' }, f.rule === 'cooks' && f.perN ? 'Thresholds t (cutoff t/n)' : 'Thresholds t', t));
        const inline = el('div', { class: 'fork-inline' },
          checkbox('no exclusion', f.none, v => { f.none = v; changed(); }));
        if (f.rule === 'cooks') inline.append(checkbox('divide by n', !!f.perN, v => { f.perN = v; changed({ rebuild: true }); }));
        else inline.append(select([['xy', 'on x and y'], ['model', 'on x, y and covariates']], f.on ?? 'xy', v => { f.on = v; changed(); }));
        body.push(inline);
        break;
      }

      case 'model':
        body.push(el('div', { class: 'fork-inline' },
          checkbox('OLS', f.estimators.includes('ols'), v => { toggle(f.estimators, 'ols', v); changed(); }),
          checkbox('robust (M, bisquare)', f.estimators.includes('m'), v => { toggle(f.estimators, 'm', v); changed(); })));
        break;
    }

    const c = el('li', { class: 'fork-card' }, head, ...body, el('p', { class: 'fork-error', hidden: true }));
    c.dataset.id = f.id;
    setCount(c, f);
    return c;
  }

  return { render };
}

function toggle(arr, v, on) {
  const i = arr.indexOf(v);
  if (on && i < 0) arr.push(v);
  if (!on && i >= 0) arr.splice(i, 1);
}
