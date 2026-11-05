import { tPValue, fPValue, assertResidualDf, partialR, partialRCI } from './common.js';
import { designMatrix, qrDecompose, qrSolve, qrXtXInverse, residuals } from './kernel.js';

// Ordinary least squares regression.
// x, y: arrays of numbers (equal length, no NaN/Inf)
// nuisance: array of covariate arrays (each length n) — included in the full design matrix
// Returns: { slope, intercept, rSquared, adjRSquared, fullModelRSquared, fStat, pF,
//            seSlope, seIntercept, tSlope, tIntercept, pSlope, pIntercept,
//            partialR, partialRCI,
//            nuisanceStats, yResidual, residuals, n, dfResidual, xMean, sxx, sigma }
// rSquared: partial R² for X = tSlope² / (tSlope² + dfResidual)
// partialR / partialRCI: signed partial r for X and its 95% Fisher-z CI [lo, hi]
// fullModelRSquared: variance in original Y explained by X + all nuisance
// nuisanceStats: [{ coef, se, t, p, partialR2 }] one per nuisance variable; [] when none
// yResidual: y with nuisance effects removed, for plot y-axis; null when no nuisance
//
// Fit: Householder QR on a column-major typed-array design (stats/kernel.js).
export function ols(x, y, nuisance = []) {
  const n = x.length;
  const p = nuisance.length;  // number of nuisance covariates
  const k = p + 2;            // total columns: intercept + x + nuisance
  assertResidualDf(n, k);

  const { X } = designMatrix(x, nuisance);
  const qr = qrDecompose(X, n, k);
  const b  = qrSolve(qr, y);
  const intercept = b[0];
  const slope     = b[1];

  const resids = residuals(X, n, k, y, b);
  let ssr = 0;
  for (let i = 0; i < n; i++) ssr += resids[i] * resids[i];
  const dfResidual = n - k;

  let ySum = 0;
  for (let i = 0; i < n; i++) ySum += y[i];
  const yMean = ySum / n;
  let sst = 0;
  for (let i = 0; i < n; i++) sst += (y[i] - yMean) ** 2;

  const fullModelRSquared = 1 - ssr / sst;
  const adjRSquared = 1 - (1 - fullModelRSquared) * (n - 1) / dfResidual;

  const s2    = ssr / dfResidual;
  const sigma = Math.sqrt(s2);

  const inv = qrXtXInverse(qr);
  const diagInv = j => inv[j * k + j];

  const seIntercept = Math.sqrt(diagInv(0) * s2);
  const seSlope     = Math.sqrt(diagInv(1) * s2);
  const tSlope      = slope     / seSlope;
  const tIntercept  = intercept / seIntercept;

  // Partial R² for X: t²/(t² + df)
  const rSquared = (tSlope * tSlope) / (tSlope * tSlope + dfResidual);
  const pr = partialR(tSlope, dfResidual);

  // F-statistic for overall model significance
  const dfModel = k - 1;  // number of predictors excluding intercept
  const fStat   = (fullModelRSquared / dfModel) / ((1 - fullModelRSquared) / dfResidual);
  const pF      = fPValue(fStat, dfModel, dfResidual);

  // Per-nuisance stats
  const nuisanceStats = nuisance.map((_, pi) => {
    const j    = pi + 2;
    const coef = b[j];
    const se   = Math.sqrt(diagInv(j) * s2);
    const t    = coef / se;
    const t2   = t * t;
    return { coef, se, t, p: tPValue(Math.abs(t), dfResidual), partialR2: t2 / (t2 + dfResidual) };
  });

  // Y with nuisance effects removed (for plot y-axis)
  let yResidual = null;
  if (p > 0) {
    yResidual = new Array(n);
    for (let i = 0; i < n; i++) {
      let s = y[i];
      for (let pi = 0; pi < p; pi++) s -= b[pi + 2] * nuisance[pi][i];
      yResidual[i] = s;
    }
  }

  // xMean and sxx for computeBand confidence intervals
  let xSum = 0;
  for (let i = 0; i < n; i++) xSum += x[i];
  const xMean = xSum / n;
  let sxx = 0;
  for (let i = 0; i < n; i++) sxx += (x[i] - xMean) ** 2;

  return {
    slope, intercept,
    rSquared, adjRSquared, fullModelRSquared,
    fStat, pF,
    seSlope, seIntercept,
    tSlope, tIntercept,
    pSlope:     tPValue(Math.abs(tSlope),     dfResidual),
    pIntercept: tPValue(Math.abs(tIntercept), dfResidual),
    partialR:   pr,
    partialRCI: partialRCI(pr, dfResidual),
    nuisanceStats,
    yResidual,
    residuals: Array.from(resids),
    n, dfResidual,
    xMean, sxx, sigma,
  };
}
