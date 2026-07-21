// src/state.js
// URL hash-based state management.

export const DEFAULTS = {
  src: null,
  x: 0,
  y: 1,
  m: 'ols',
  n: [],
  c: [],
  h: null,
  xl: null,
  yl: null,
  sm: null,   // smoother type: null | 'median' | 'lowess'
  sw: 10,     // smoother window percent (1–100)
  hide: [],   // hidden plot elements: subset of HIDEABLE
};

// Plot elements that can be hidden via the plot settings menu.
// fit = best-fit line, ci = confidence band, kde = axis density strips,
// fringe = per-point axis tick marks.
export const HIDEABLE = ['fit', 'ci', 'kde', 'fringe'];

function parseIntList(s) {
  if (!s) return [];
  return s.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v));
}

function parseFloatList(s) {
  if (!s) return null;
  const vals = s.split(',').map(Number);
  return vals.length && vals.every(v => !isNaN(v)) ? vals : null;
}

// Unknown tokens dropped; canonical order and de-duplication for stable URLs.
function parseHideList(s) {
  if (!s) return [];
  const tokens = new Set(s.split(','));
  return HIDEABLE.filter(t => tokens.has(t));
}

function parseIntOrNull(s) {
  if (s == null || s === '') return null;
  const v = parseInt(s, 10);
  return isNaN(v) ? null : v;
}

// Pure: parse a URLSearchParams-style string into a typed state object.
export function parseState(hashStr) {
  const raw = new URLSearchParams(hashStr);
  return {
    src: raw.get('src') ?? DEFAULTS.src,
    x:   raw.has('x') ? parseInt(raw.get('x'), 10) : DEFAULTS.x,
    y:   raw.has('y') ? parseInt(raw.get('y'), 10) : DEFAULTS.y,
    m:   raw.get('m') ?? DEFAULTS.m,
    n:   raw.has('n') ? parseIntList(raw.get('n')) : [...DEFAULTS.n],
    c:   raw.has('c') ? parseIntList(raw.get('c')) : [...DEFAULTS.c],
    h:   parseIntOrNull(raw.get('h')),
    xl:  raw.has('xl') ? parseFloatList(raw.get('xl')) : DEFAULTS.xl,
    yl:  raw.has('yl') ? parseFloatList(raw.get('yl')) : DEFAULTS.yl,
    sm:  raw.get('sm') ?? DEFAULTS.sm,
    sw:  raw.has('sw') ? parseInt(raw.get('sw'), 10) : DEFAULTS.sw,
    hide: raw.has('hide') ? parseHideList(raw.get('hide')) : [...DEFAULTS.hide],
  };
}

// Pure: serialize a typed state object to a URLSearchParams string.
// Only includes non-null/non-empty values; x/y/m only included when src is set.
export function serializeState(state) {
  const params = new URLSearchParams();
  if (state.src != null) {
    params.set('src', state.src);
    params.set('x', String(state.x ?? DEFAULTS.x));
    params.set('y', String(state.y ?? DEFAULTS.y));
    params.set('m', state.m ?? DEFAULTS.m);
  }
  if (state.h  != null) params.set('h',  String(state.h));
  if (state.sm != null) params.set('sm', state.sm);
  if (state.sm != null && state.sw !== DEFAULTS.sw) params.set('sw', String(state.sw));
  for (const key of ['n', 'c', 'xl', 'yl', 'hide']) {
    if (state[key]?.length) params.set(key, state[key].join(','));
  }
  return params.toString();
}

// Pure: resolve state.x/state.y to in-range indices over nCols numeric
// columns, using the same fallbacks as the model pipeline (x → 0, y → 1).
export function resolveXY(state, nCols) {
  const inRange = i => Number.isInteger(i) && i >= 0 && i < nCols;
  const x = inRange(state.x) ? state.x : 0;
  const y = inRange(state.y) ? state.y : (nCols > 1 ? 1 : 0);
  return { x, y };
}

// Pure: the nuisance covariate indices actually applied to the model.
// X and Y always win (issue #39): a covariate currently in use as X or Y
// stays selected in state.n but is inert until X/Y move off it.
export function effectiveNuisance(state, nCols) {
  if (!nCols) return [];
  const { x, y } = resolveXY(state, nCols);
  return state.n.filter(i => i >= 0 && i < nCols && i !== x && i !== y);
}

// Browser integration: read current state from URL hash.
export function getState() {
  return parseState(window.location.hash.slice(1));
}

// Browser integration: merge partial state into URL hash (triggers hashchange).
export function setState(partial) {
  const next = { ...getState(), ...partial };
  window.location.hash = serializeState(next);
}

// Browser integration: subscribe to hash changes.
export function onStateChange(callback) {
  window.addEventListener('hashchange', () => callback(getState()));
}
