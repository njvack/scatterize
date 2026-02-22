// Shared statistical utilities

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
// nuisanceMatrix is an array of arrays: [[n1_0, n2_0, ...], [n1_1, n2_1, ...], ...]
// ---------------------------------------------------------------------------
export function residualize(y, nuisanceMatrix) {
  // Build design matrix with intercept
  const n = y.length;
  const X = nuisanceMatrix[0].map((_, col) => nuisanceMatrix.map(row => row[col]));
  // X is array of nuisance vectors; prepend intercept column
  const dm = y.map((_, i) => [1, ...nuisanceMatrix.map(col => col[i])]);

  // OLS: b = (X'X)^-1 X'y — small matrix, direct computation via normal equations
  // Using simple Gram-Schmidt / direct solve for small k
  const k = dm[0].length;

  // X'X (k x k) and X'y (k x 1)
  const XtX = Array.from({ length: k }, () => new Array(k).fill(0));
  const Xty = new Array(k).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) {
      Xty[j] += dm[i][j] * y[i];
      for (let l = 0; l < k; l++) XtX[j][l] += dm[i][j] * dm[i][l];
    }
  }

  const b = solveLinear(XtX, Xty);
  return y.map((yi, i) => yi - dm[i].reduce((s, xij, j) => s + xij * b[j], 0));
}

// Solve Ax = b via Gaussian elimination with partial pivoting
function solveLinear(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);  // augmented matrix

  for (let col = 0; col < n; col++) {
    // Partial pivot
    let maxRow = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(M[row][col]) > Math.abs(M[maxRow][col])) maxRow = row;
    }
    [M[col], M[maxRow]] = [M[maxRow], M[col]];

    const pivot = M[col][col];
    if (Math.abs(pivot) < 1e-14) throw new Error('Singular matrix in residualize()');
    for (let row = col + 1; row < n; row++) {
      const f = M[row][col] / pivot;
      for (let j = col; j <= n; j++) M[row][j] -= f * M[col][j];
    }
  }

  // Back substitution
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    x[i] = M[i][n];
    for (let j = i + 1; j < n; j++) x[i] -= M[i][j] * x[j];
    x[i] /= M[i][i];
  }
  return x;
}
