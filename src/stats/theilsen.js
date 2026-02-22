// Theil-Sen estimator + Kendall's tau-b.
// x, y: arrays of numbers (equal length, no NaN/Inf)
// Returns: { slope, intercept, tau, pValue, n }
//
// Slope: median of all n(n-1)/2 pairwise slopes — O(n²).
// Intercept: median of (y_i - slope * x_i).
// Tau: Kendall's tau-b (tie-corrected) via O(n²) concordant/discordant count.
// P-value: normal approximation to S with Kendall (1975) tie-corrected variance.
//   Uses Mills ratio asymptotic expansion for accurate tail probability at large z.
//   Matches cor.test(method="kendall") for n >= 50.
//
// TODO: confidence intervals for slope via Sen (1968) order-statistic method.
//   K = z_{α/2} * sqrt(n(n-1)(2n+5)/18); C = floor((N-K)/2)
//   CI = [sorted_slopes[C], sorted_slopes[N-C-1]]  (no-ties variance formula)

function arrayMedian(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const m = s.length;
  return m % 2 === 0 ? (s[m / 2 - 1] + s[m / 2]) / 2 : s[(m - 1) / 2];
}

// Returns sizes of tie groups with > 1 member (singletons omitted; they
// contribute 0 to all variance correction terms anyway).
function tieGroupSizes(arr) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const sizes = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && sorted[j] === sorted[i]) j++;
    if (j - i > 1) sizes.push(j - i);
    i = j;
  }
  return sizes;
}

// P(Z > z) for standard normal. For z < 6 uses the erf polynomial
// (A&S 7.1.26); for larger z uses the Mills ratio asymptotic series to
// avoid precision loss from 1 - erf(x) ≈ 1.
function normalUpperTail(z) {
  if (z <= 0) return 0.5;
  if (z < 6) {
    // A&S 7.1.26: erf approximation, max error 1.5e-7
    const t = 1 / (1 + 0.3275911 * z / Math.SQRT2);
    const erf = 1 - t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429)))) * Math.exp(-z * z / 2);
    return (1 - erf) / 2;
  }
  // Mills ratio: P(Z > z) = φ(z) * M(z)
  // M(z) = Σ_{k=0}^∞ (-1)^k (2k-1)!! / z^{2k+1}  (asymptotic, truncate when terms grow)
  const logPhi = -z * z / 2 - 0.5 * Math.log(2 * Math.PI);
  let sum = 0, term = 1 / z;
  for (let k = 0; k <= 60; k++) {
    sum += term;
    const next = -term * (2 * k + 1) / (z * z);
    if (Math.abs(next) >= Math.abs(term)) break;
    term = next;
  }
  return Math.exp(logPhi) * sum;
}

// Kendall's tau-b and p-value via normal approximation to S.
// Tie-corrected variance from Kendall (1975).
function kendall(x, y) {
  const n = x.length;
  const N = n * (n - 1) / 2;

  let S = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      S += Math.sign(x[j] - x[i]) * Math.sign(y[j] - y[i]);

  const xt = tieGroupSizes(x);
  const yt = tieGroupSizes(y);

  // tau-b denominator correction
  const Tx = xt.reduce((s, t) => s + t * (t - 1) / 2, 0);
  const Ty = yt.reduce((s, u) => s + u * (u - 1) / 2, 0);
  const tau = S / Math.sqrt((N - Tx) * (N - Ty));

  // Variance of S — Kendall (1975) formula with full tie corrections
  const v0 = n * (n - 1) * (2 * n + 5);
  const vt = xt.reduce((s, t) => s + t * (t - 1) * (2 * t + 5), 0);
  const vu = yt.reduce((s, u) => s + u * (u - 1) * (2 * u + 5), 0);
  let varS = (v0 - vt - vu) / 18;

  if (n >= 3) {
    const ct3 = xt.reduce((s, t) => s + t * (t - 1) * (t - 2), 0);
    const cu3 = yt.reduce((s, u) => s + u * (u - 1) * (u - 2), 0);
    varS += ct3 * cu3 / (9 * n * (n - 1) * (n - 2));
  }

  const ct2 = xt.reduce((s, t) => s + t * (t - 1), 0);
  const cu2 = yt.reduce((s, u) => s + u * (u - 1), 0);
  varS += ct2 * cu2 / (2 * n * (n - 1));

  const pValue = 2 * normalUpperTail(Math.abs(S) / Math.sqrt(varS));
  return { tau, pValue };
}

export function theilSen(x, y) {
  const n = x.length;

  const slopes = [];
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (x[j] !== x[i]) slopes.push((y[j] - y[i]) / (x[j] - x[i]));

  // Sort once: reused for both median and Sen CI.
  const sortedSlopes = slopes.slice().sort((a, b) => a - b);
  const N = sortedSlopes.length;
  const slope = N % 2 === 0
    ? (sortedSlopes[N / 2 - 1] + sortedSlopes[N / 2]) / 2
    : sortedSlopes[(N - 1) / 2];
  const intercept = arrayMedian(y.map((yi, i) => yi - slope * x[i]));

  // Sen (1968) distribution-free 95% CI for slope.
  // Uses no-ties variance formula n(n-1)(2n+5)/18 — conservative (wider) when ties present.
  // K = z_{0.025} * sqrt(Var); C = floor((N - K) / 2)
  const K = 1.9599639845400536 * Math.sqrt(n * (n - 1) * (2 * n + 5) / 18);
  const C = Math.floor((N - K) / 2);
  let slopeCILow = null, slopeCIHigh = null, interceptCILow = null, interceptCIHigh = null;
  if (C >= 0 && N - C - 1 < N) {
    slopeCILow      = sortedSlopes[C];
    slopeCIHigh     = sortedSlopes[N - C - 1];
    interceptCILow  = arrayMedian(y.map((yi, i) => yi - slopeCILow  * x[i]));
    interceptCIHigh = arrayMedian(y.map((yi, i) => yi - slopeCIHigh * x[i]));
  }

  const { tau, pValue } = kendall(x, y);
  return { slope, intercept, tau, pValue, n, slopeCILow, slopeCIHigh, interceptCILow, interceptCIHigh };
}
