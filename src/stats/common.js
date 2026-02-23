// Shared statistical utilities
import { Matrix, solve, QrDecomposition } from 'ml-matrix';

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
// t-distribution: two-tailed p-value for t-statistic with df degrees of freedom
// ---------------------------------------------------------------------------
export function tPValue(t, df) {
  const x = df / (df + t * t);
  return incompleteBeta(df / 2, 0.5, x);  // equals 2 * P(T > |t|)
}

// ---------------------------------------------------------------------------
// Residualize y against one or more nuisance variables (columns of X matrix).
// Returns the residuals from OLS of y on [1, nuisance...].
// nuisanceMatrix is an array of arrays (one per nuisance variable, length n each).
// Uses QR decomposition on the design matrix directly (avoids squaring the
// condition number that normal equations would incur).
// ---------------------------------------------------------------------------

// Private helper: fit OLS of y on [1, nuisance...], return fit components.
function _olsNuisanceFit(y, nuisanceMatrix) {
  const n = y.length;
  const dm = Array.from({ length: n }, (_, i) => [1, ...nuisanceMatrix.map(col => col[i])]);
  const X = new Matrix(dm);
  const b = new QrDecomposition(X).solve(Matrix.columnVector(y)).getColumn(0);
  const residuals = y.map((yi, i) => yi - dm[i].reduce((s, xij, j) => s + xij * b[j], 0));
  return { X, b, residuals };
}

export function residualize(y, nuisanceMatrix) {
  return _olsNuisanceFit(y, nuisanceMatrix).residuals;
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

// Like residualize(), but also returns partial R² for each nuisance variable.
// Partial R²_k = t²_k / (t²_k + df_residual), where t_k is the t-statistic
// for nuisance k in the OLS fit of y on [1, z1, ..., zp].
export function residualizeWithStats(y, nuisanceMatrix) {
  const { X, b, residuals } = _olsNuisanceFit(y, nuisanceMatrix);
  const n = y.length;
  const p = nuisanceMatrix.length;

  const ssr        = residuals.reduce((s, r) => s + r * r, 0);
  const dfResidual = n - p - 1;
  const s2         = ssr / dfResidual;

  const diagXtX = diagInverse(X.transpose().mmul(X).to2DArray());
  const partialR2 = nuisanceMatrix.map((_, k) => {
    const j  = k + 1;  // skip intercept column
    const t2 = (b[j] ** 2) / (diagXtX[j] * s2);
    return t2 / (t2 + dfResidual);
  });

  return { residuals, partialR2 };
}
