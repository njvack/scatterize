import { solveLinear, diagInverse, zPValue, arrayMedian, mean } from './common.js';

// M-estimation: IRLS with Tukey biweight weights.
// x, y: arrays of numbers (equal length, no NaN/Inf)
// nuisance: array of covariate arrays — included in the full design matrix
//           (FWL doesn't hold for M-estimation; weights depend on full residuals)
// Returns: { slope, intercept, seSlope, seIntercept, tSlope, tIntercept,
//            scale, weights, n }
// Note: no p-values — t-values for M-estimators lack well-defined df.
//
// Algorithm matches MASS::rlm(psi=psi.bisquare, method="M"):
//   init with OLS; loop: WLS(w) → check convergence → update r,s,w.
//   Reported scale and weights are from the iteration used for the final WLS
//   (i.e., the last weights/scale before convergence was declared), matching
//   what MASS::rlm returns.

const TUKEY_C = 4.685;  // 95%-efficiency constant for Tukey bisquare

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

export function robust(x, y, nuisance = []) {
  const n = x.length;

  // Design matrix: [intercept, x, ...nuisance columns]
  const dm = Array.from({ length: n }, (_, i) => [1, x[i], ...nuisance.map(col => col[i])]);
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

  // Standard errors — MASS::summary.rlm, default method = "XtX"
  // (rlm.R:233-302), verified to 1e-9 against R. Two pieces:
  //
  //   SE_j = sqrt( [(X'X)⁻¹]_jj ) · stddev
  //
  // using the UNWEIGHTED (X'X)⁻¹ (not X'WX), and a Huber-corrected scale
  //   stddev = sqrt( Σ(r·w)² / (n − k) ) · κ / mn
  //   mn = mean(ψ'(r/s)),  κ = 1 + k · var(ψ'(r/s)) / (n · mn²)
  // where r is wresid (residuals from the final WLS fit), s is the reported
  // scale, w = ψ(r/s) (bisquare weight), and var() is Bessel-corrected (÷ n−1).
  const rFinal = residuals(dm, y, b);          // MASS wresid: post-final-WLS residuals
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
    // p-values via asymptotic normal approximation — t for M-estimators has
    // no closed-form df, but converges to N(0,1) under H₀ as n → ∞.
    pSlope:     zPValue(tSlope),
    pIntercept: zPValue(tIntercept),
    nuisanceStats,
    yResidual,
    scale,
    weights: w,       // pre-final-WLS bisquare weights (matches MASS rlm$w)
    residuals: rFinal, // post-final-WLS residuals (matches MASS rlm$residuals)
    n,
  };
}
