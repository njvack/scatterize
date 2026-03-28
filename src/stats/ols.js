import { Matrix, QrDecomposition } from 'ml-matrix';
import { tPValue, fPValue, diagInverse } from './common.js';

// Ordinary least squares regression.
// x, y: arrays of numbers (equal length, no NaN/Inf)
// nuisance: array of covariate arrays (each length n) — included in the full design matrix
// Returns: { slope, intercept, rSquared, adjRSquared, fullModelRSquared, fStat, pF,
//            seSlope, seIntercept, tSlope, tIntercept, pSlope, pIntercept,
//            nuisanceStats, yResidual, residuals, n, dfResidual, xMean, sxx, sigma }
// rSquared: partial R² for X = tSlope² / (tSlope² + dfResidual)
// fullModelRSquared: variance in original Y explained by X + all nuisance
// nuisanceStats: [{ coef, se, t, p, partialR2 }] one per nuisance variable; [] when none
// yResidual: y with nuisance effects removed, for plot y-axis; null when no nuisance
export function ols(x, y, nuisance = []) {
  const n = x.length;
  const p = nuisance.length;  // number of nuisance covariates
  const k = p + 2;            // total columns: intercept + x + nuisance

  // Joint design matrix: [1, x, z1, z2, ...]
  const dm = Array.from({ length: n }, (_, i) => [1, x[i], ...nuisance.map(col => col[i])]);
  const X  = new Matrix(dm);
  const Y  = Matrix.columnVector(y);

  const b         = new QrDecomposition(X).solve(Y).getColumn(0);
  const intercept = b[0];
  const slope     = b[1];

  const yHat    = dm.map(row => row.reduce((s, xi, j) => s + xi * b[j], 0));
  const resids  = y.map((yi, i) => yi - yHat[i]);
  const ssr     = resids.reduce((s, r) => s + r * r, 0);
  const dfResidual = n - k;

  const yMean = y.reduce((s, v) => s + v, 0) / n;
  const sst   = y.reduce((s, yi) => s + (yi - yMean) ** 2, 0);

  const fullModelRSquared = 1 - ssr / sst;
  const adjRSquared = 1 - (1 - fullModelRSquared) * (n - 1) / dfResidual;

  const s2    = ssr / dfResidual;
  const sigma = Math.sqrt(s2);

  const diagInv = diagInverse(X.transpose().mmul(X).to2DArray());

  const seIntercept = Math.sqrt(diagInv[0] * s2);
  const seSlope     = Math.sqrt(diagInv[1] * s2);
  const tSlope      = slope     / seSlope;
  const tIntercept  = intercept / seIntercept;

  // Partial R² for X: t²/(t² + df)
  const rSquared = (tSlope * tSlope) / (tSlope * tSlope + dfResidual);

  // F-statistic for overall model significance
  const dfModel = k - 1;  // number of predictors excluding intercept
  const fStat   = (fullModelRSquared / dfModel) / ((1 - fullModelRSquared) / dfResidual);
  const pF      = fPValue(fStat, dfModel, dfResidual);

  // Per-nuisance stats
  const nuisanceStats = nuisance.map((_, pi) => {
    const j   = pi + 2;
    const coef = b[j];
    const se  = Math.sqrt(diagInv[j] * s2);
    const t   = coef / se;
    const t2  = t * t;
    return { coef, se, t, p: tPValue(Math.abs(t), dfResidual), partialR2: t2 / (t2 + dfResidual) };
  });

  // Y with nuisance effects removed (for plot y-axis)
  const yResidual = p > 0
    ? y.map((yi, i) => yi - nuisance.reduce((s, col, pi) => s + b[pi + 2] * col[i], 0))
    : null;

  // xMean and sxx for computeBand confidence intervals
  const xMean = x.reduce((s, v) => s + v, 0) / n;
  const sxx   = x.reduce((s, v) => s + (v - xMean) ** 2, 0);

  return {
    slope, intercept,
    rSquared, adjRSquared, fullModelRSquared,
    fStat, pF,
    seSlope, seIntercept,
    tSlope, tIntercept,
    pSlope:     tPValue(Math.abs(tSlope),     dfResidual),
    pIntercept: tPValue(Math.abs(tIntercept), dfResidual),
    nuisanceStats,
    yResidual,
    residuals: resids,
    n, dfResidual,
    xMean, sxx, sigma,
  };
}
