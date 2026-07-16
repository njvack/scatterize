// High-breakdown S-estimator of regression (Rousseeuw & Yohai 1984), the
// initial estimate + fixed scale for MM-estimation. Matches
//   MASS::lqs(x, y, method = "S", k0 = 1.548, nsamp = "exact")
// on the deterministic exact path, and falls back to a seeded Fast-S
// (Salibian-Barrera & Yohai 2006) above a subset-count cap.
//
// Design matrix `dm` includes the intercept column: rows are [1, x, ...nuisance].
// Returns { coef, scale } — coef is the S starting point for the MM M-step,
// scale is the fixed S-scale.
//
// References read for exact fidelity: reference/MASS/src/lqs.c (candidate
// scoring: chi objective, target = (n-p)*beta, MAD init, early-exit) and
// reference/MASS/R/lqs.R:143-168 (IWLS scale refinement).

import { solveLinear } from './common.js';

const K0 = 1.548;   // bisquare tuning constant for 50% breakdown (S-estimation)
const BETA = 0.5;   // breakdown point

// Above this many size-p subsets, switch exact -> seeded Fast-S.
export const EXACT_SUBSET_CAP = 100_000;

// Normalized bisquare rho (== lqs.c `chi`): integral of the biweight, scaled so
// max = 1.  u is the standardized residual r/s.
function rhoK0(u) {
  const t = (u / K0) ** 2;
  return t > 1 ? 1 : t * (3 - 3 * t + t * t);
}

// Bisquare weight w(u) = psi(u)/u used by the S IWLS step (lqs.R psi with k0).
function weightK0(u) {
  const a = Math.abs(u / K0);
  return a >= 1 ? 0 : (1 - a * a) ** 2;
}

// Solve the M-scale: find s with sum(rho(r/s)) = target, by re-substitution
// (lqs.c:243-250). target = (n-p)*beta; tol 1e-4; <=30 iters; s0 is the start.
export function mScale(res, target, s0) {
  let s = s0;
  for (let it = 0; it < 30; it++) {
    let sum = 0;
    for (let i = 0; i < res.length; i++) sum += rhoK0(res[i] / s);
    const next = Math.sqrt(sum / target) * s;
    if (Math.abs(sum / target - 1) < 1e-4) return next;
    s = next;
  }
  return s;
}

function residuals(dm, y, b) {
  return y.map((yi, i) => yi - dm[i].reduce((sum, xij, j) => sum + xij * b[j], 0));
}

// Weighted least squares via normal equations. Returns coef, or null if singular.
function wls(dm, y, w, n, p) {
  const XtWX = Array.from({ length: p }, () => new Array(p).fill(0));
  const XtWy = new Array(p).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      XtWy[j] += dm[i][j] * w[i] * y[i];
      for (let l = 0; l < p; l++) XtWX[j][l] += dm[i][j] * w[i] * dm[i][l];
    }
  }
  const b = trySolve(XtWX, XtWy);
  return b && b.every(Number.isFinite) ? b : null;
}

// solveLinear (ml-matrix LU) throws on an exactly singular system; treat that
// as "no fit" rather than an error.
function trySolve(A, rhs) {
  try {
    return solveLinear(A, rhs);
  } catch {
    return null;
  }
}

// Exact fit through a size-p subset of rows: solve dm[subset]·coef = y[subset].
// Returns coef or null if singular / non-finite.
function exactFit(dm, y, subset) {
  const A = subset.map(i => dm[i]);
  const rhs = subset.map(i => y[i]);
  const b = trySolve(A, rhs);
  return b && b.every(Number.isFinite) ? b : null;
}

// Advance `idx` to the next size-k combination of 0..n-1 in lexicographic order,
// in place (matches lqs.c next_set). Returns false when exhausted.
function nextCombination(idx, n) {
  const k = idx.length;
  let j = k - 1;
  idx[j]++;
  while (j > 0 && idx[j] >= n - (k - 1 - j)) {
    idx[--j]++;
  }
  if (idx[0] >= n - (k - 1)) return false;
  let tmp = idx[j];
  for (let i = j + 1; i < k; i++) idx[i] = ++tmp;
  return true;
}

// Number of size-p subsets, or Infinity if it overflows the cap check.
export function subsetCount(n, p) {
  let c = 1;
  for (let i = 0; i < p; i++) {
    c = (c * (n - i)) / (i + 1);
    if (c > Number.MAX_SAFE_INTEGER) return Infinity;
  }
  return Math.round(c);
}

// Exhaustive enumeration matching lqs.c lqs_fitlots with lts==2 (S).
function exactS(dm, y, n, p) {
  const target = (n - p) * BETA;
  let best = Infinity;
  let bestCoef = null;
  let first = true;

  const idx = Array.from({ length: p }, (_, i) => i);
  do {
    const coef = exactFit(dm, y, idx);
    if (coef === null) continue;                 // singular subset
    const res = residuals(dm, y, coef);

    let scale;
    if (first) {
      const absSorted = res.map(Math.abs).sort((a, b) => a - b);
      const s0 = absSorted[Math.floor(n / 2)] / 0.6745 || 1e-10;
      scale = mScale(res, target, s0);
      first = false;
    } else {
      // Early exit: if sum rho(r/best) > target this subset can't beat best.
      let sum = 0;
      for (let i = 0; i < n; i++) sum += rhoK0(res[i] / best);
      if (sum > target) continue;
      scale = mScale(res, target, best);
    }
    if (scale < best) { best = scale; bestCoef = coef; }
  } while (nextCombination(idx, n));

  if (bestCoef === null) throw new Error('S-estimator: all subsets singular');
  return { coef: bestCoef, scale: best };
}

// IWLS scale refinement from the best subset (lqs.R:152-168). Refines the SCALE
// only; coef stays the raw subset coef (MASS keeps z$coefficients un-refined,
// a quirk we replicate so the MM chain matches R exactly).
function refineScale(dm, y, n, p, coef, scale0) {
  const target = (n - p) * BETA;
  let scale = scale0;
  let resid = residuals(dm, y, coef);
  for (let it = 0; it < 30; it++) {
    const w = resid.map(r => weightK0(r / scale));
    const b = wls(dm, y, w, n, p);
    if (b === null) break;
    resid = residuals(dm, y, b);
    let sum = 0;
    for (let i = 0; i < n; i++) sum += rhoK0(resid[i] / scale);
    const s2 = scale * Math.sqrt(sum / target);
    if (Math.abs(s2 / scale - 1) < 1e-5) break;   // return current scale, not s2
    scale = s2;
  }
  return scale;
}

// --- Seeded Fast-S (JS-vs-JS; R's RNG is not replicated) --------------------

// Small deterministic PRNG (mulberry32) so Fast-S is reproducible in tests.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function sampleSubset(rand, n, p) {
  const pool = Array.from({ length: n }, (_, i) => i);
  const out = new Array(p);
  for (let i = 0; i < p; i++) {
    const j = i + Math.floor(rand() * (n - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
    out[i] = pool[i];
  }
  return out;
}

// One concentration (I-)step: M-scale of current residuals, then a weighted
// re-fit. Updates both coef and scale (a proper S local step; unlike the exact
// path we keep the improved coef here).
function concentrate(dm, y, n, p, coef, steps, scaleGuess) {
  const target = (n - p) * BETA;
  let b = coef;
  let scale = scaleGuess;
  for (let s = 0; s < steps; s++) {
    const resid = residuals(dm, y, b);
    scale = mScale(resid, target, scale);
    const w = resid.map(r => weightK0(r / scale));
    const nb = wls(dm, y, w, n, p);
    if (nb === null) break;
    b = nb;
  }
  // final scale for the (possibly) updated coef
  scale = mScale(residuals(dm, y, b), target, scale);
  return { coef: b, scale };
}

function fastS(dm, y, n, p, seed) {
  const rand = mulberry32(seed);
  const nResample = Math.min(Math.max(500, 20 * p), 3000);
  const nKeep = 5;
  const target = (n - p) * BETA;

  // MAD of the raw y-residuals from the coordinate median gives a scale guess.
  const kept = [];
  for (let t = 0; t < nResample; t++) {
    const coef = exactFit(dm, y, sampleSubset(rand, n, p));
    if (coef === null) continue;
    const res0 = residuals(dm, y, coef);
    const absSorted = res0.map(Math.abs).sort((a, b) => a - b);
    const s0 = absSorted[Math.floor(n / 2)] / 0.6745 || 1e-10;
    const cand = concentrate(dm, y, n, p, coef, 2, s0);
    kept.push(cand);
  }
  if (kept.length === 0) throw new Error('S-estimator: all resamples singular');
  kept.sort((a, b) => a.scale - b.scale);

  let best = null;
  for (const c of kept.slice(0, nKeep)) {
    // full concentration to convergence
    let cur = c;
    for (let it = 0; it < 50; it++) {
      const next = concentrate(dm, y, n, p, cur.coef, 1, cur.scale);
      if (Math.abs(next.scale / cur.scale - 1) < 1e-8) { cur = next; break; }
      cur = next;
    }
    if (best === null || cur.scale < best.scale) best = cur;
  }
  // Refine the winning scale with the same objective the exact path uses.
  best.scale = mScale(residuals(dm, y, best.coef), target, best.scale);
  return { coef: best.coef, scale: best.scale };
}

// Public entry: S-estimate of { coef, scale } for design `dm`, response `y`.
// opts.seed seeds Fast-S (default 42); opts.forceFastS forces the sampled path
// (for tests). Exact below EXACT_SUBSET_CAP subsets, Fast-S above.
export function sEstimate(dm, y, opts = {}) {
  const n = dm.length;
  const p = dm[0].length;
  const seed = opts.seed ?? 42;
  const nSubsets = subsetCount(n, p);
  if (opts.forceFastS || nSubsets > EXACT_SUBSET_CAP) {
    return fastS(dm, y, n, p, seed);
  }
  const { coef, scale: crit } = exactS(dm, y, n, p);
  const scale = refineScale(dm, y, n, p, coef, crit);
  return { coef, scale };
}
