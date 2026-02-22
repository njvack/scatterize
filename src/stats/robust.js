import { solveLinear } from './common.js';

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

function arrayMedian(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const m = s.length;
  return m % 2 === 0 ? (s[m / 2 - 1] + s[m / 2]) / 2 : s[(m - 1) / 2];
}

function bisquareWeights(r, scale) {
  // w_i = (1 - (r_i/(c*s))^2)^2  for |r_i/(c*s)| < 1, else 0
  return r.map(ri => {
    const u = ri / (TUKEY_C * scale);
    return Math.abs(u) >= 1 ? 0 : (1 - u * u) ** 2;
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

function residuals(dm, y, b, n) {
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
  let r = residuals(dm, y, b, n);
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
    r = residuals(dm, y, b, n);
    scale = madScale(r);
    w = bisquareWeights(r, scale);
  }

  // Final reported weights = w (used in the final WLS), scale = used to compute w.
  // SE: s² * diag((X'WX)⁻¹) using the same w and scale.
  const { XtWX } = doWls(dm, y, w, n, k);
  const s2 = scale * scale;
  const diagInv = Array.from({ length: k }, (_, j) => {
    const e = new Array(k).fill(0);
    e[j] = 1;
    return solveLinear(XtWX, e)[j];
  });

  const slope       = b[1];
  const intercept   = b[0];
  const seSlope     = Math.sqrt(diagInv[1] * s2);
  const seIntercept = Math.sqrt(diagInv[0] * s2);

  return {
    slope, intercept,
    seSlope, seIntercept,
    tSlope:     slope     / seSlope,
    tIntercept: intercept / seIntercept,
    scale,
    weights: w,
    n,
  };
}
