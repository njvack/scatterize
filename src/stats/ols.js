import { tPValue } from './common.js';

// Ordinary least squares regression.
// x, y: arrays of numbers (equal length, no NaN/Inf)
// Returns: { slope, intercept, rSquared, adjRSquared,
//            seSlope, seIntercept, tSlope, tIntercept,
//            pSlope, pIntercept, n, dfResidual }
export function ols(x, y) {
  const n = x.length;

  const xMean = x.reduce((s, v) => s + v, 0) / n;
  const yMean = y.reduce((s, v) => s + v, 0) / n;

  let sxx = 0, sxy = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - xMean;
    sxx += dx * dx;
    sxy += dx * (y[i] - yMean);
  }

  const slope     = sxy / sxx;
  const intercept = yMean - slope * xMean;

  let ssr = 0, sst = 0;
  for (let i = 0; i < n; i++) {
    const res = y[i] - (intercept + slope * x[i]);
    ssr += res * res;
    sst += (y[i] - yMean) ** 2;
  }

  const rSquared    = 1 - ssr / sst;
  const adjRSquared = 1 - (1 - rSquared) * (n - 1) / (n - 2);
  const s2          = ssr / (n - 2);  // residual variance

  const seSlope     = Math.sqrt(s2 / sxx);
  const seIntercept = Math.sqrt(s2 * (1 / n + xMean ** 2 / sxx));
  const tSlope      = slope / seSlope;
  const tIntercept  = intercept / seIntercept;
  const dfResidual  = n - 2;

  return {
    slope, intercept,
    rSquared, adjRSquared,
    seSlope, seIntercept,
    tSlope, tIntercept,
    pSlope:     tPValue(Math.abs(tSlope),     dfResidual),
    pIntercept: tPValue(Math.abs(tIntercept), dfResidual),
    n, dfResidual,
  };
}
