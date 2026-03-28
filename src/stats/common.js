// Shared statistical utilities
import { Matrix, solve } from 'ml-matrix';

// z_{0.975}: standard normal 95% CI critical value
export const Z95 = 1.9599639845400536;

// Model keys that use rank methods and don't support nuisance covariates
export const RANK_MODELS = new Set(['spearman', 'theilsen']);

// ---------------------------------------------------------------------------
// Log gamma (Lanczos approximation, accurate to ~15 significant figures)
// ---------------------------------------------------------------------------
const LANCZOS_G = 7;
const LANCZOS_C = [
  0.99999999999980993,
  676.5203681218851,
  -1259.1392167224028,
  771.32342877765313,
  -176.61502916214059,
  12.507343278686905,
  -0.13857109526572012,
  9.9843695780195716e-6,
  1.5056327351493116e-7,
];

export function logGamma(x) {
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = LANCZOS_C[0];
  const t = x + LANCZOS_G + 0.5;
  for (let i = 1; i < LANCZOS_G + 2; i++) a += LANCZOS_C[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// ---------------------------------------------------------------------------
// Regularized incomplete beta function I(x; a, b)
// Via continued fractions (Numerical Recipes, Lentz method)
// ---------------------------------------------------------------------------
function betaCF(a, b, x) {
  const MAXIT = 100;
  const EPS   = 3e-7;
  const FPMIN = 1e-30;

  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;

    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

export function incompleteBeta(a, b, x) {
  if (x < 0 || x > 1) throw new RangeError(`x=${x} outside [0,1]`);
  if (x === 0) return 0;
  if (x === 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b)
    + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2)
    ? bt * betaCF(a, b, x) / a
    : 1 - bt * betaCF(b, a, 1 - x) / b;
}

// ---------------------------------------------------------------------------
// Standard normal CDF via Abramowitz & Stegun 26.2.17 (max error 7.5e-8)
// ---------------------------------------------------------------------------
export function normalCDF(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const poly = t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  const p = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * x * x) * poly;
  return x >= 0 ? p : 1 - p;
}

// Two-tailed p-value from a z-statistic (asymptotic normal approximation).
export function zPValue(z) {
  return 2 * (1 - normalCDF(Math.abs(z)));
}

// ---------------------------------------------------------------------------
// t-distribution: two-tailed p-value for t-statistic with df degrees of freedom
// ---------------------------------------------------------------------------
export function tPValue(t, df) {
  const x = df / (df + t * t);
  return incompleteBeta(df / 2, 0.5, x);  // equals 2 * P(T > |t|)
}

// ---------------------------------------------------------------------------
// F-distribution: upper-tail p-value P(F > f) with d1, d2 degrees of freedom
// ---------------------------------------------------------------------------
export function fPValue(f, d1, d2) {
  if (f <= 0) return 1;
  const x = d2 / (d1 * f + d2);
  return incompleteBeta(d2 / 2, d1 / 2, x);  // equals P(F > f)
}

// Solve Ax = b via LU decomposition with partial pivoting (ml-matrix).
// A: array-of-arrays (k×k); b: array (length k). Returns array (length k).
export function solveLinear(A, b) {
  return solve(new Matrix(A), Matrix.columnVector(b)).getColumn(0);
}

// Compute diagonal of M^{-1} via column-wise solve: M x = e_j for each j.
// M: array-of-arrays (k×k). Returns array of length k.
export function diagInverse(M) {
  const k = M.length;
  return Array.from({ length: k }, (_, j) => {
    const e = new Array(k).fill(0); e[j] = 1;
    return solveLinear(M, e)[j];
  });
}

// Median of an array (sorts a copy; does not mutate input).
export function arrayMedian(arr) {
  const s = arr.slice().sort((a, b) => a - b);
  const m = s.length;
  return m % 2 === 0 ? (s[m / 2 - 1] + s[m / 2]) / 2 : s[(m - 1) / 2];
}

// Sample mean
export function mean(arr) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

// Sample standard deviation (Bessel-corrected)
export function stdev(arr) {
  const mu = mean(arr);
  return Math.sqrt(arr.reduce((s, v) => s + (v - mu) ** 2, 0) / (arr.length - 1));
}

// Assign ranks (1-indexed, average ranks for ties)
export function rank(arr) {
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

// ---------------------------------------------------------------------------
// Descriptive statistics
// ---------------------------------------------------------------------------

// Sample skewness and excess kurtosis (moment estimators).
// skewness: m3 / m2^1.5
// excess kurtosis: m4 / m2² - 3
export function skewnessKurtosis(arr) {
  const n = arr.length;
  if (n < 3) return { skewness: null, kurtosis: null };
  const mean = arr.reduce((s, v) => s + v, 0) / n;
  let m2 = 0, m3 = 0, m4 = 0;
  for (const v of arr) {
    const d = v - mean;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
  }
  m2 /= n; m3 /= n; m4 /= n;
  return {
    skewness: m2 > 0 ? m3 / Math.pow(m2, 1.5) : null,
    kurtosis: m2 > 0 ? m4 / (m2 * m2) - 3 : null,
  };
}

