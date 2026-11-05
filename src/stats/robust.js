import { zPValue, mean, assertResidualDf, partialR, partialRCI } from './common.js';
import { sEstimate } from './s-estimate.js';
import { designMatrix, qrDecompose, qrXtXInverse, residuals, wlsSolve } from './kernel.js';

// Robust regression. The public `robust()` is MM-estimation (Yohai 1987): a
// high-breakdown S-estimate supplies the start coefficients and a fixed scale,
// then a Tukey-bisquare (c=4.685) M-step runs from there. This matches
//   MASS::rlm(y ~ x + nuisance..., method = "MM")
// and, unlike plain M-estimation, resists high-leverage outliers (50% breakdown,
// 95% Gaussian efficiency).
//
// `robustM()` (OLS-initialized M-estimation with re-estimated scale,
// = MASS::rlm(psi=psi.bisquare, method="M")) is a component-level test target,
// the fallback when the S-step degenerates, and the robust estimator for many-
// path analyses, where the S-step is too slow.
//
// x, y: arrays of numbers (equal length, no NaN/Inf)
// nuisance: array of covariate arrays — included in the full design matrix
//           (FWL doesn't hold for M/MM; weights depend on full residuals)
//
// Linear algebra runs on column-major typed arrays (stats/kernel.js); each
// IRLS step is a weighted QR solve.

const TUKEY_C = 4.685;  // 95%-efficiency constant for Tukey bisquare (M-step)

function bisquareWeights(r, scale) {
  // w_i = (1 - (r_i/(c*s))^2)^2  for |r_i/(c*s)| < 1, else 0
  // Equals MASS psi.bisquare(u) — the weight w(u) = ψ(u)/u, not ψ(u) itself.
  const n = r.length;
  const w = new Float64Array(n);
  const cs = TUKEY_C * scale;
  for (let i = 0; i < n; i++) {
    const u = r[i] / cs;
    w[i] = Math.abs(u) >= 1 ? 0 : (1 - u * u) ** 2;
  }
  return w;
}

function bisquarePsiPrime(r, scale) {
  // ψ'(u) for Tukey bisquare — MASS psi.bisquare(u, deriv=1):
  //   t = (u/c)^2;  (1 - t)(1 - 5t) for t < 1, else 0.
  const n = r.length;
  const out = new Float64Array(n);
  const cs = TUKEY_C * scale;
  for (let i = 0; i < n; i++) {
    const t = (r[i] / cs) ** 2;
    out[i] = t < 1 ? (1 - t) * (1 - 5 * t) : 0;
  }
  return out;
}

// Rearrange a so a[kth] holds the value it would have if sorted, with smaller
// values before it and larger after (Hoare quickselect, expected O(n)).
function selectInPlace(a, kth) {
  let lo = 0, hi = a.length - 1;
  while (hi > lo) {
    const pivot = a[(lo + hi) >> 1];
    let i = lo, j = hi;
    while (i <= j) {
      while (a[i] < pivot) i++;
      while (a[j] > pivot) j--;
      if (i <= j) { const t = a[i]; a[i] = a[j]; a[j] = t; i++; j--; }
    }
    if (kth <= j) hi = j;
    else if (kth >= i) lo = i;
    else return;
  }
}

// Median of a scratch Float64Array (reordered in place).
function medianInPlace(a) {
  const m = a.length;
  const mid = m >> 1;
  selectInPlace(a, mid);
  if (m % 2) return a[mid];
  let lower = -Infinity;
  for (let i = 0; i < mid; i++) if (a[i] > lower) lower = a[i];
  return (lower + a[mid]) / 2;
}

function madScale(r) {
  const abs = new Float64Array(r.length);
  for (let i = 0; i < r.length; i++) abs[i] = Math.abs(r[i]);
  const s = medianInPlace(abs) / 0.6745;
  return s < 1e-10 ? 1e-10 : s;
}

// Assemble the shared result object (SEs, t/p, nuisance stats, y-residual) from
// a converged fit. Used by both M and MM — they differ only in how `b`, `scale`,
// and the reported `weights` were obtained.
//
// Standard errors — MASS::summary.rlm, default method = "XtX" (rlm.R:233-302),
// verified to 1e-9 against R:
//
//   SE_j = sqrt( [(X'X)⁻¹]_jj ) · stddev
//
// using the UNWEIGHTED (X'X)⁻¹ (not X'WX), and a Huber-corrected scale
//   stddev = sqrt( Σ(r·w)² / (n − k) ) · κ / mn
//   mn = mean(ψ'(r/s)),  κ = 1 + k · var(ψ'(r/s)) / (n · mn²)
// where r is wresid (residuals from the final fit), s the reported scale,
// w = ψ(r/s) (bisquare weight), and var() is Bessel-corrected (÷ n−1).
function assembleResult({ X, y, b, scale, weights, nuisance, n, k }) {
  const rFinal = residuals(X, n, k, y, b);     // MASS wresid: final residuals
  const wSE    = bisquareWeights(rFinal, scale);
  const psip   = bisquarePsiPrime(rFinal, scale);

  let S = 0;
  for (let i = 0; i < n; i++) S += (rFinal[i] * wSE[i]) ** 2;
  S /= (n - k);
  const mn = mean(psip);
  let varPsip = 0;
  for (let i = 0; i < n; i++) varPsip += (psip[i] - mn) ** 2;
  varPsip /= (n - 1);
  const kappa = 1 + k * varPsip / (n * mn * mn);
  const stddev = Math.sqrt(S) * kappa / mn;
  const sd2 = stddev * stddev;

  // Unweighted (X'X)⁻¹ via QR of X.
  const inv = qrXtXInverse(qrDecompose(X, n, k));
  const diagInv = j => inv[j * k + j];

  // Covariance of intercept and x-slope (used by the CI band).
  const covIntSlope = inv[1] * sd2;

  const slope       = b[1];
  const intercept   = b[0];
  const seSlope     = Math.sqrt(diagInv(1)) * stddev;
  const seIntercept = Math.sqrt(diagInv(0)) * stddev;

  const tSlope     = slope     / seSlope;
  const tIntercept = intercept / seIntercept;

  // Per-nuisance stats — p-values via asymptotic normal (same as slope/intercept)
  const nuisanceStats = nuisance.map((_, pi) => {
    const j    = pi + 2;
    const coef = b[j];
    const se   = Math.sqrt(diagInv(j)) * stddev;
    const t    = coef / se;
    return { coef, se, t, p: zPValue(t) };
  });

  // Y with nuisance effects removed (for plot y-axis)
  let yResidual = null;
  if (nuisance.length) {
    yResidual = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = y[i];
      for (let pi = 0; pi < nuisance.length; pi++) s -= b[pi + 2] * nuisance[pi][i];
      yResidual[i] = s;
    }
  }

  // Residual df as MASS::summary.rlm reports it; used for partial r.
  const dfResidual = n - k;
  const pr = partialR(tSlope, dfResidual);

  return {
    slope, intercept,
    seSlope, seIntercept,
    covIntSlope,
    tSlope, tIntercept,
    // p-values via asymptotic normal approximation — t for M/MM-estimators has
    // no closed-form df, but converges to N(0,1) under H₀ as n → ∞.
    pSlope:     zPValue(tSlope),
    pIntercept: zPValue(tIntercept),
    partialR:   pr,
    partialRCI: partialRCI(pr, dfResidual),
    nuisanceStats,
    yResidual,
    scale,
    weights: Array.from(weights),  // pre-final-WLS bisquare weights (matches MASS rlm$w)
    residuals: Array.from(rFinal), // final residuals (matches MASS rlm$residuals)
    n, dfResidual,
  };
}

// M-estimation: OLS-initialized IRLS with re-estimated MAD scale.
// Matches MASS::rlm(psi=psi.bisquare, method="M").
// opts.init: start coefficients [intercept, slope, ...nuisance]. Callers that
// already have the OLS fit (scatterverse) pass it to skip one QR; MASS starts
// from OLS too, so the result is the same.
export function robustM(x, y, nuisance = [], opts = {}) {
  const n = x.length;
  const k = nuisance.length + 2;
  assertResidualDf(n, k);
  const { X } = designMatrix(x, nuisance);

  // Initialize with OLS
  let b = opts.init ? Float64Array.from(opts.init) : wlsSolve(X, n, k, y, new Float64Array(n).fill(1));
  let r = residuals(X, n, k, y, b);
  let scale = madScale(r);
  let w = bisquareWeights(r, scale);

  // IRLS loop matching MASS::rlm structure:
  //   WLS(w) → convergence check → update r/s/w (only if not converged).
  // This means when we break on convergence, w and scale are the ones that
  // were fed into the final WLS — matching what MASS::rlm reports.
  for (let iter = 0; iter < 20; iter++) {
    const bPrev = b;

    b = wlsSolve(X, n, k, y, w);

    // MASS::rlm convergence: all |Δb_j| <= acc * (|b_j| + 1e-3), acc=1e-4
    let converged = true;
    for (let j = 0; j < k; j++) {
      if (Math.abs(b[j] - bPrev[j]) > 1e-4 * (Math.abs(bPrev[j]) + 1e-3)) { converged = false; break; }
    }
    if (converged) break;

    // Only update r/s/w if not yet converged (so on break, w is from last WLS input)
    r = residuals(X, n, k, y, b);
    scale = madScale(r);
    w = bisquareWeights(r, scale);
  }

  return assembleResult({ X, y, b, scale, weights: w, nuisance, n, k });
}

// MM-estimation: S-estimate start (coef + fixed scale) then a bisquare M-step
// with the scale held fixed. Matches MASS::rlm(method="MM").
export function robustMM(x, y, nuisance = [], opts = {}) {
  const n = x.length;
  const k = nuisance.length + 2;
  assertResidualDf(n, k);
  const { X } = designMatrix(x, nuisance);

  // High-breakdown S-estimate: start coefficients + fixed scale.
  // (sEstimate takes a row-major array-of-arrays design.)
  const dm = Array.from({ length: n }, (_, i) => [1, x[i], ...nuisance.map(col => col[i])]);
  const { coef, scale } = sEstimate(dm, y, opts);

  // M-step with the scale FIXED (scale.est == "MM" in rlm.default): iterate
  //   w = ψ(resid/scale) → WLS → new resid, until residuals stop changing.
  // Convergence via MASS irls.delta (resid-based, acc = 1e-4).
  let b = Float64Array.from(coef);
  let r = residuals(X, n, k, y, b);
  let w = bisquareWeights(r, scale);
  for (let iter = 0; iter < 20; iter++) {
    const rPrev = r;
    w = bisquareWeights(r, scale);
    b = wlsSolve(X, n, k, y, w);
    r = residuals(X, n, k, y, b);
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) {
      num += (rPrev[i] - r[i]) ** 2;
      den += rPrev[i] * rPrev[i];
    }
    if (Math.sqrt(num / Math.max(1e-20, den)) <= 1e-4) break;
  }

  return assembleResult({ X, y, b, scale, weights: w, nuisance, n, k });
}

// Public robust regression = MM-estimation, with a fallback to plain M if the
// S-step degenerates (e.g. every candidate subset singular).
export function robust(x, y, nuisance = [], opts = {}) {
  try {
    return robustMM(x, y, nuisance, opts);
  } catch (err) {
    if (/S-estimator/.test(err.message)) return robustM(x, y, nuisance);
    throw err;
  }
}
