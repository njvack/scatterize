import { Matrix, QrDecomposition } from 'ml-matrix';
import { tPValue, residualize, diagInverse } from './common.js';

// Ordinary least squares regression.
// x, y: arrays of numbers (equal length, no NaN/Inf)
// nuisance: array of covariate arrays (each length n) — residualized out of y via FWL
// Returns: { slope, intercept, rSquared, adjRSquared, fullModelRSquared,
//            seSlope, seIntercept, tSlope, tIntercept,
//            pSlope, pIntercept, residuals, n, dfResidual }
// rSquared: partial R² for X (variance in residualized Y explained by X).
//   When no nuisance, equals fullModelRSquared.
// fullModelRSquared: variance in original Y explained by X + all nuisance.
export function ols(x, y, nuisance = []) {
  const yFit = nuisance.length ? residualize(y, nuisance) : y;
  const n = x.length;

  const dm = Array.from({ length: n }, (_, i) => [1, x[i]]);
  const X  = new Matrix(dm);
  const Y  = Matrix.columnVector(yFit);

  const b         = new QrDecomposition(X).solve(Y).getColumn(0);
  const intercept = b[0];
  const slope     = b[1];

  const xMean   = x.reduce((s, v) => s + v, 0) / n;
  const sxx     = x.reduce((s, v) => s + (v - xMean) ** 2, 0);
  const yMean   = yFit.reduce((s, v) => s + v, 0) / n;
  const resids  = yFit.map((yi, i) => yi - (intercept + slope * x[i]));
  const ssr     = resids.reduce((s, r) => s + r * r, 0);
  const sst     = yFit.reduce((s, yi) => s + (yi - yMean) ** 2, 0);

  // Partial R² for X: variance in residualized Y explained by X.
  // When no nuisance, yFit === y so this equals the full-model R².
  const rSquared    = 1 - ssr / sst;
  const adjRSquared = 1 - (1 - rSquared) * (n - 1) / (n - 2);

  // Full-model R²: variance in original Y explained by X + all nuisance.
  // By FWL, ssr from the residualized regression equals ssr from the joint model.
  const yMeanOrig       = y.reduce((s, v) => s + v, 0) / n;
  const sstOrig         = y.reduce((s, yi) => s + (yi - yMeanOrig) ** 2, 0);
  const fullModelRSquared = 1 - ssr / sstOrig;

  const s2          = ssr / (n - 2);
  const sigma       = Math.sqrt(s2);
  const dfResidual  = n - 2;

  // SE via diagonal of (X'X)⁻¹ — same approach as robust.js
  const diagInv = diagInverse(X.transpose().mmul(X).to2DArray());

  const seIntercept = Math.sqrt(diagInv[0] * s2);
  const seSlope     = Math.sqrt(diagInv[1] * s2);
  const tSlope      = slope     / seSlope;
  const tIntercept  = intercept / seIntercept;

  return {
    slope, intercept,
    rSquared, adjRSquared, fullModelRSquared,
    seSlope, seIntercept,
    tSlope, tIntercept,
    pSlope:     tPValue(Math.abs(tSlope),     dfResidual),
    pIntercept: tPValue(Math.abs(tIntercept), dfResidual),
    residuals: resids,
    n, dfResidual,
    xMean, sxx, sigma,
  };
}
