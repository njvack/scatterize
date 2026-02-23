import { tPValue, rank } from './common.js';

// Spearman rank correlation.
// x, y: arrays of numbers (equal length, no NaN/Inf)
// Returns: { rho, pValue, n }
// p-value via t-approximation (t = rho * sqrt((n-2)/(1-rho²)), df = n-2),
// matching R's cor.test(method="spearman") for n > ~10.
export function spearman(x, y) {
  const n = x.length;
  const rx = rank(x);
  const ry = rank(y);

  const rxMean = rx.reduce((s, v) => s + v, 0) / n;
  const ryMean = ry.reduce((s, v) => s + v, 0) / n;

  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = rx[i] - rxMean;
    const dy = ry[i] - ryMean;
    num  += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const rho    = num / Math.sqrt(denX * denY);
  const t      = rho * Math.sqrt((n - 2) / (1 - rho * rho));
  const pValue = tPValue(Math.abs(t), n - 2);

  // Best-fit line: Spearman analog of OLS — passes through (mean(x), mean(y))
  // with slope = rho * sd(y) / sd(x).
  const xMean = x.reduce((s, v) => s + v, 0) / n;
  const yMean = y.reduce((s, v) => s + v, 0) / n;
  const sdX = Math.sqrt(x.reduce((s, v) => s + (v - xMean) ** 2, 0) / (n - 1));
  const sdY = Math.sqrt(y.reduce((s, v) => s + (v - yMean) ** 2, 0) / (n - 1));
  const slope     = sdX > 0 ? rho * sdY / sdX : 0;
  const intercept = yMean - slope * xMean;

  return { rho, pValue, n, slope, intercept };
}
