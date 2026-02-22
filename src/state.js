// src/state.js
// URL hash-based state management.
// Schema: CLAUDE.md § URL State Schema

export const DEFAULTS = {
  src: null,
  x: 0,
  y: 1,
  m: 'ols',
  n: [],
  c: [],
  h: null,
  f: null,
  xl: null,
  yl: null,
};

function parseIntList(s) {
  if (!s) return [];
  return s.split(',').map(v => parseInt(v, 10)).filter(v => !isNaN(v));
}

function parseFloatList(s) {
  if (!s) return null;
  const vals = s.split(',').map(Number);
  return vals.length && vals.every(v => !isNaN(v)) ? vals : null;
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
    f:   parseIntOrNull(raw.get('f')),
    xl:  raw.has('xl') ? parseFloatList(raw.get('xl')) : DEFAULTS.xl,
    yl:  raw.has('yl') ? parseFloatList(raw.get('yl')) : DEFAULTS.yl,
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
  if (state.n?.length)  params.set('n', state.n.join(','));
  if (state.c?.length)  params.set('c', state.c.join(','));
  if (state.h != null)  params.set('h', String(state.h));
  if (state.f != null)  params.set('f', String(state.f));
  if (state.xl?.length) params.set('xl', state.xl.join(','));
  if (state.yl?.length) params.set('yl', state.yl.join(','));
  return params.toString();
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
