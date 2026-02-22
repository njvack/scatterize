import { tPValue } from './common.js';

// Assign ranks (1-indexed, average ranks for ties)
function rank(arr) {
  const n = arr.length;
  const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => arr[a] - arr[b]);
  const ranks = new Array(n);
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n - 1 && arr[idx[j]] === arr[idx[j + 1]]) j++;
    const avgRank = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[idx[k]] = avgRank;
    i = j + 1;
  }
  return ranks;
}

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

  return { rho, pValue, n };
}
