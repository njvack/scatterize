import { solveLinear, diagInverse, zPValue, arrayMedian, mean } from './common.js';
import { sEstimate } from './s-estimate.js';

// Robust regression. The public `robust()` is MM-estimation (Yohai 1987): a
// high-breakdown S-estimate supplies the start coefficients and a fixed scale,
// then a Tukey-bisquare (c=4.685) M-step runs from there. This matches
//   MASS::rlm(y ~ x + nuisance..., method = "MM")
// and, unlike plain M-estimation, resists high-leverage outliers (50% breakdown,
// 95% Gaussian efficiency).
//
// `robustM()` (the older OLS-initialized M-estimation with re-estimated scale,
// = MASS::rlm(psi=psi.bisquare, method="M")) is retained as internal plumbing:
// a component-level test target and a fallback when the S-step degenerates.
//
// x, y: arrays of numbers (equal length, no NaN/Inf)
// nuisance: array of covariate arrays — included in the full design matrix
//           (FWL doesn't hold for M/MM; weights depend on full residuals)

const TUKEY_C = 4.685;  // 95%-efficiency constant for Tukey bisquare (M-step)

function bisquareWeights(r, scale) {
  // w_i = (1 - (r_i/(c*s))^2)^2  for |r_i/(c*s)| < 1, else 0
  // Equals MASS psi.bisquare(u) — the weight w(u) = ψ(u)/u, not ψ(u) itself.
  return r.map(ri => {
    const u = ri / (TUKEY_C * scale);
    return Math.abs(u) >= 1 ? 0 : (1 - u * u) ** 2;
  });
}

function bisquarePsiPrime(r, scale) {
  // ψ'(u) for Tukey bisquare — MASS psi.bisquare(u, deriv=1):
  //   t = (u/c)^2;  (1 - t)(1 - 5t) for t < 1, else 0.
  return r.map(ri => {
    const t = (ri / (TUKEY_C * scale)) ** 2;
    return t < 1 ? (1 - t) * (1 - 5 * t) : 0;
  });
}

function doWls(dm, y, w, n, k) {
  const XtWX = Array.from({ length: k }, () => new Array(k).fill(0));
  const XtWy = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      XtWy[j] += dm[i][j] * w[i] * y[i];
      for (let l = 0; l < k; l++) XtWX[j][l] += dm[i][j] * w[i] * dm[i][l];
    }
  }
  return { b: solveLinear(XtWX, XtWy), XtWX };
}

function residuals(dm, y, b) {
  return y.map((yi, i) => yi - dm[i].reduce((sum, xij, j) => sum + xij * b[j], 0));
}

function madScale(r) {
  const s = arrayMedian(r.map(Math.abs)) / 0.6745;
  return s < 1e-10 ? 1e-10 : s;
}

// Build the design matrix [intercept, x, ...nuisance columns].
function designMatrix(x, nuisance, n) {
  return Array.from({ length: n }, (_, i) => [1, x[i], ...nuisance.map(col => col[i])]);
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
function assembleResult({ dm, y, b, scale, weights, nuisance, n, k }) {
  const rFinal = residuals(dm, y, b);          // MASS wresid: final residuals
  const wSE    = bisquareWeights(rFinal, scale);
  const psip   = bisquarePsiPrime(rFinal, scale);

  const S = rFinal.reduce((acc, ri, i) => acc + (ri * wSE[i]) ** 2, 0) / (n - k);
  const mn = mean(psip);
  const varPsip = psip.reduce((acc, p) => acc + (p - mn) ** 2, 0) / (n - 1);
  const kappa = 1 + k * varPsip / (n * mn * mn);
  const stddev = Math.sqrt(S) * kappa / mn;
  const sd2 = stddev * stddev;

  // Unweighted X'X and the pieces of its inverse we need.
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      for (let l = 0; l < k; l++) XtX[j][l] += dm[i][j] * dm[i][l];
    }
  }
  const diagInv = diagInverse(XtX);

  // Off-diagonal [0][1] of (X'X)⁻¹ scaled by stddev²: covariance of intercept
  // and x-slope (used by the CI band). Reuse the column-1 solve.
  const e1 = new Array(k).fill(0); e1[1] = 1;
  const covIntSlope = solveLinear(XtX, e1)[0] * sd2;

  const slope       = b[1];
  const intercept   = b[0];
  const seSlope     = Math.sqrt(diagInv[1]) * stddev;
  const seIntercept = Math.sqrt(diagInv[0]) * stddev;

  const tSlope     = slope     / seSlope;
  const tIntercept = intercept / seIntercept;

  // Per-nuisance stats — p-values via asymptotic normal (same as slope/intercept)
  const nuisanceStats = nuisance.map((_, pi) => {
    const j    = pi + 2;
    const coef = b[j];
    const se   = Math.sqrt(diagInv[j]) * stddev;
    const t    = coef / se;
    return { coef, se, t, p: zPValue(t) };
  });

  // Y with nuisance effects removed (for plot y-axis)
  const yResidual = nuisance.length
    ? y.map((yi, i) => yi - nuisance.reduce((s, col, pi) => s + b[pi + 2] * col[i], 0))
    : null;

  return {
    slope, intercept,
    seSlope, seIntercept,
    covIntSlope,
    tSlope, tIntercept,
    // p-values via asymptotic normal approximation — t for M/MM-estimators has
    // no closed-form df, but converges to N(0,1) under H₀ as n → ∞.
    pSlope:     zPValue(tSlope),
    pIntercept: zPValue(tIntercept),
    nuisanceStats,
    yResidual,
    scale,
    weights,           // pre-final-WLS bisquare weights (matches MASS rlm$w)
    residuals: rFinal, // final residuals (matches MASS rlm$residuals)
    n,
  };
}

// M-estimation: OLS-initialized IRLS with re-estimated MAD scale.
// Matches MASS::rlm(psi=psi.bisquare, method="M").
export function robustM(x, y, nuisance = []) {
  const n = x.length;
  const dm = designMatrix(x, nuisance, n);
  const k = dm[0].length;

  // Initialize with OLS
  const ones = new Array(n).fill(1);
  let { b } = doWls(dm, y, ones, n, k);
  let r = residuals(dm, y, b);
  let scale = madScale(r);
  let w = bisquareWeights(r, scale);

  // IRLS loop matching MASS::rlm structure:
  //   WLS(w) → convergence check → update r/s/w (only if not converged).
  // This means when we break on convergence, w and scale are the ones that
  // were fed into the final WLS — matching what MASS::rlm reports.
  for (let iter = 0; iter < 20; iter++) {
    const bPrev = b.slice();

    ({ b } = doWls(dm, y, w, n, k));

    // MASS::rlm convergence: all |Δb_j| <= acc * (|b_j| + 1e-3), acc=1e-4
    if (b.every((bj, j) => Math.abs(bj - bPrev[j]) <= 1e-4 * (Math.abs(bPrev[j]) + 1e-3))) break;

    // Only update r/s/w if not yet converged (so on break, w is from last WLS input)
    r = residuals(dm, y, b);
    scale = madScale(r);
    w = bisquareWeights(r, scale);
  }

  return assembleResult({ dm, y, b, scale, weights: w, nuisance, n, k });
}

// MM-estimation: S-estimate start (coef + fixed scale) then a bisquare M-step
// with the scale held fixed. Matches MASS::rlm(method="MM").
export function robustMM(x, y, nuisance = [], opts = {}) {
  const n = x.length;
  const dm = designMatrix(x, nuisance, n);
  const k = dm[0].length;

  // High-breakdown S-estimate: start coefficients + fixed scale.
  const { coef, scale } = sEstimate(dm, y, opts);

  // M-step with the scale FIXED (scale.est == "MM" in rlm.default): iterate
  //   w = ψ(resid/scale) → WLS → new resid, until residuals stop changing.
  // Convergence via MASS irls.delta (resid-based, acc = 1e-4).
  let b = coef;
  let r = residuals(dm, y, b);
  let w = bisquareWeights(r, scale);
  for (let iter = 0; iter < 20; iter++) {
    const rPrev = r;
    w = bisquareWeights(r, scale);
    ({ b } = doWls(dm, y, w, n, k));
    r = residuals(dm, y, b);
    const num = rPrev.reduce((acc, rp, i) => acc + (rp - r[i]) ** 2, 0);
    const den = Math.max(1e-20, rPrev.reduce((acc, rp) => acc + rp * rp, 0));
    if (Math.sqrt(num / den) <= 1e-4) break;
  }

  return assembleResult({ dm, y, b, scale, weights: w, nuisance, n, k });
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
