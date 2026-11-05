// src/verse/url.js
// Scatterverse URL state. The spec (fork order included) is JSON, compressed
// with CompressionStream('deflate') and base64url-encoded into one hash
// parameter; the bootstrap seed and draw count sit beside it in plain text so
// people can read and edit them.
//
//   #view=verse&src=<data url>&vs=<compressed spec>&seed=<int>&boot=<draws>
//
// Encoding is async because CompressionStream is. Available in browsers and
// Node 18+; no DOM access, so workers can use it too.

import { normalizeSpec } from './spec.js';

export const DEFAULT_DRAWS = 500;
export const DEFAULT_SEED = 1;

function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes, stream) {
  const out = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

// Spec → compact URL-safe text.
export async function encodeSpec(spec) {
  const json = JSON.stringify(normalizeSpec(spec));
  return toBase64Url(await pipe(new TextEncoder().encode(json), new CompressionStream('deflate')));
}

// URL text → normalized spec. Throws on corrupt input (SpecError for a
// well-formed but invalid spec).
export async function decodeSpec(text) {
  const bytes = await pipe(fromBase64Url(text), new DecompressionStream('deflate'));
  return normalizeSpec(JSON.parse(new TextDecoder().decode(bytes)));
}

function parseNonNegInt(s, fallback) {
  if (s == null || !/^\d+$/.test(s)) return fallback;
  const v = Number(s);
  return Number.isSafeInteger(v) ? v : fallback;
}

// Hash string (without '#') → { view, src, spec, seed, draws }. spec is null
// when the hash has none; a corrupt spec is reported as specError instead of
// throwing, so the view can say so and start fresh.
export async function parseVerseHash(hashStr) {
  const raw = new URLSearchParams(hashStr);
  const out = {
    view: raw.get('view'),
    src: raw.get('src'),
    spec: null,
    seed: parseNonNegInt(raw.get('seed'), DEFAULT_SEED),
    draws: parseNonNegInt(raw.get('boot'), 0),
  };
  const vs = raw.get('vs');
  if (vs) {
    try { out.spec = await decodeSpec(vs); }
    catch (err) { out.specError = err?.message || 'The analysis in this link could not be read.'; }
  }
  return out;
}

// { src, spec, seed, draws } → hash string. draws = 0 means inference off.
export async function serializeVerseHash({ src = null, spec = null, seed = DEFAULT_SEED, draws = 0 }) {
  const params = new URLSearchParams();
  params.set('view', 'verse');
  if (src != null) params.set('src', src);
  if (spec) params.set('vs', await encodeSpec(spec));
  if (seed !== DEFAULT_SEED) params.set('seed', String(seed));
  if (draws > 0) params.set('boot', String(draws));
  return params.toString();
}
